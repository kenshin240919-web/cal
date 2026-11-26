// 계산기 화면: <form data-calc="이름">의 입력이 바뀔 때마다 아래 R[이름]으로 결과를 그림. 계산은 core.js.
import * as C from './core.js';

const W = n => `${Math.round(n).toLocaleString('ko-KR')}원`;
const N = (n, d = 2) => (Number.isFinite(n) ? n : 0).toLocaleString('ko-KR', {maximumFractionDigits: d});
const D = s => `${s.replaceAll('-', '.')}(${C.weekday(s)})`;
const res = ([label, value], rows = [], extra = '') => `<div class="big"><span>${label}</span><b>${value}</b></div>${rows.length ? `<dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}${extra}`;
const warn = t => `<p class="warn">${t}</p>`;
const tbl = (head, rows) => `<div class="tbl"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const okDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

// ---------- 환율(국제 기준 환율, 하루 1번 갱신, 키 없음) ----------
const CUR = {USD: ['미국 달러', 1], JPY: ['일본 엔', 100], EUR: ['유로', 1], CNY: ['중국 위안', 1], GBP: ['영국 파운드', 1], AUD: ['호주 달러', 1], CAD: ['캐나다 달러', 1], HKD: ['홍콩 달러', 1], TWD: ['대만 달러', 1], THB: ['태국 바트', 1], VND: ['베트남 동', 100], PHP: ['필리핀 페소', 1]};
let fx; // ponytail: 무료 공개 API(open.er-api.com) 직접 호출, 막히면 Worker 중계로 바꾸기
const getFx = () => fx ||= fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()).then(j => {if (j.result !== 'success') throw 0; return j;});

const R = {
  async exchange(v) {
    let j;
    try {j = await getFx();} catch {fx = null; return warn('환율을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.');}
    const krw = c => j.rates.KRW / j.rates[c] * CUR[c][1]; // 표시 단위(1 또는 100)당 원
    const [name, unit] = CUR[v.cur], rate = krw(v.cur), amt = v.amount;
    const big = v.dir === 'to' ? [`${N(amt)} ${name}`, W(amt * rate / unit)] : [`${W(amt)}은`, `${N(amt / rate * unit, 2)} ${name}`];
    const when = new Date(j.time_last_update_unix * 1000).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short'});
    return res(big, [[`${unit > 1 ? unit : 1} ${name}`, W(rate)], ['기준 시각', when]],
      tbl(['통화', '원화'], Object.keys(CUR).map(c => [`${CUR[c][1] > 1 ? CUR[c][1] : 1} ${CUR[c][0]}`, `${N(krw(c), 2)}원`]))
      + '<p class="small">환율 자료: <a href="https://www.exchangerate-api.com" rel="nofollow noopener" target="_blank">Rates By Exchange Rate API</a> · 참고용</p>');
  },
  dday(v) {
    if (!okDate(v.target)) return '';
    const n = C.diffDays(C.today(), v.target);
    return res([D(v.target), n === 0 ? 'D-Day' : n > 0 ? `D-${N(n)}` : `D+${N(-n)}`], [['오늘', D(C.today())], [n >= 0 ? '남은 날' : '지난 날', `${N(Math.abs(n))}일`], ['주로 환산', `${N(Math.abs(n) / 7, 1)}주`]]);
  },
  between(v) {
    if (!okDate(v.d1) || !okDate(v.d2)) return '';
    const n = Math.abs(C.diffDays(v.d1, v.d2)) + (v.inc === '1' ? 1 : 0);
    return res(['기간', `${N(n)}일`], [['주', `${Math.floor(n / 7)}주 ${n % 7}일`], ['개월(30일 기준)', `약 ${N(n / 30, 1)}개월`], ['년', `약 ${N(n / 365, 2)}년`]]);
  },
  adddays(v) {
    if (!okDate(v.base)) return '';
    const off = v.inc === '1' ? -1 : 0, target = C.addDays(v.base, v.n + off);
    const marks = [100, 200, 300, 365, 500, 1000, 2000, 3000].map(d => [`${d}일`, D(C.addDays(v.base, d + off))]);
    return res([`${N(v.n)}일${v.inc === '1' ? '째' : ' 뒤'}`, D(target)], [], tbl(['기념일', '날짜'], marks));
  },
  loan(v) {
    if (!(v.amount > 0 && v.years > 0)) return '';
    const n = Math.round(v.years * 12), L = C.loan(v.amount, v.rate, n, v.method), r = L.rows;
    const first = v.method === 'equal' ? ['매달 상환액', W(r[0].pay)] : v.method === 'principal' ? ['첫 달 상환액', W(r[0].pay)] : ['매달 이자', W(r[0].int)];
    const rows = [['총이자', W(L.interest)], ['총 상환액', W(L.total)]];
    if (v.method === 'principal') rows.unshift(['마지막 달 상환액', W(r.at(-1).pay)]);
    if (v.method === 'bullet') rows.unshift(['만기에 갚을 원금', W(v.amount)]);
    const row = x => [`${x.m}회`, W(x.pay), W(x.prin), W(x.int), W(x.bal)];
    const head = ['회차', '상환액', '원금', '이자', '남은 원금'];
    return res(first, rows, `<h3>상환표</h3>${tbl(head, r.slice(0, 12).map(row))}${n > 12 ? `<details><summary>전체 ${n}회 보기</summary>${tbl(head, r.slice(12).map(row))}</details>` : ''}`);
  },
  pctof: v => res([`${N(v.a)}의 ${N(v.p)}%`, N(C.pctOf(v.a, v.p))]),
  pctis: v => v.b ? res([`${N(v.a)} ÷ ${N(v.b)}`, `${N(C.pctIs(v.a, v.b))}%`]) : '',
  pctchange(v) {
    if (!v.a) return '';
    const p = C.pctChange(v.a, v.b);
    return res([`${N(v.a)} → ${N(v.b)}`, `${N(Math.abs(p))}% ${p >= 0 ? '증가' : '감소'}`], [['차이', N(v.b - v.a)]]);
  },
  pctapply(v) {
    const d = C.pctOf(v.a, v.p), up = v.dir === 'up';
    return res([up ? `${N(v.p)}% 인상` : `${N(v.p)}% 할인`, N(up ? v.a + d : v.a - d)], [[up ? '오른 금액' : '할인 금액', N(d)]]);
  },
  salary(v) {
    if (!(v.annual > 0)) return '';
    const s = C.salary(v.annual, {nontax: v.nontax, family: v.family || 1, kids: v.kids, year: v.year});
    return res(['월 실수령액', W(s.net)], [['월 급여(세전)', W(s.monthly)], ['국민연금', W(s.pension)], ['건강보험', W(s.health)], ['장기요양보험', W(s.ltc)], ['고용보험', W(s.emp)], ['소득세(추정)', W(s.incomeTax)], ['지방소득세', W(s.localTax)], ['공제 합계', W(s.deduct)], ['연 실수령액', W(s.net * 12)]]);
  },
  interest(v) {
    if (!(v.amount > 0 && v.months > 0)) return '';
    const f = v.kind === 'inst' ? C.installment : C.deposit, x = f(v.amount, v.rate, v.months, v.comp === '1', v.tax);
    return res(['만기 수령액(세후)', W(x.net)], [['원금 합계', W(x.principal)], ['세전 이자', W(x.interest)], ['이자 세금', W(x.tax)], ['세후 이자', W(x.interest - x.tax)]]);
  },
  age(v) {
    if (!okDate(v.birth) || !okDate(v.ref)) return '';
    if (C.diffDays(v.birth, v.ref) < 0) return warn('기준 날짜가 생년월일보다 빠릅니다.');
    const a = C.age(v.birth, v.ref);
    return res(['만 나이', `${a.man}세`], [['연 나이', `${a.year}세`], ['세는 나이', `${a.korean}세`], ['띠', `${a.zodiac}띠`], ['다음 생일까지', a.toBirthday === 0 ? '오늘이 생일입니다' : `${N(a.toBirthday)}일`], ['태어난 지', `${N(a.lived + 1)}일째`]]);
  },
  severance(v) {
    if (!okDate(v.start) || !okDate(v.end) || !(v.monthly > 0)) return '';
    const s = C.severance(v);
    if (s.days <= 0) return warn('퇴직일이 입사일보다 늦어야 합니다.');
    const rows = [['재직 일수', `${N(s.days)}일(약 ${N(s.days / 365, 1)}년)`], ['3개월 일수', `${s.d3}일`], ['1일 평균임금', W(s.avg)]];
    return s.eligible ? res(['예상 퇴직금(세전)', W(s.pay)], rows) : res(['퇴직금', '대상 아님'], rows, warn('재직 기간이 1년(365일) 미만이면 퇴직금이 없습니다.'));
  },
  hourly(v) {
    if (!(v.wage > 0 && v.hours > 0 && v.days > 0)) return '';
    const h = C.hourly(v.wage, v.hours, v.days), min = C.RATES[v.year].minWage;
    return res(['월급(주휴 포함)', W(h.month)], [['일급', W(h.day)], ['주휴수당(1주)', h.holiday ? W(h.holiday) : '없음(주 15시간 미만)'], ['주급', W(h.week)], ['월 환산 시간', `${h.monthHours}시간`], ['3.3% 뗀 월급', W(h.month33)], ['연봉 환산', W(h.year)]],
      v.wage < min ? warn(`${v.year}년 최저시급 ${W(min)}보다 낮습니다.`) : '');
  },
  m2py: v => res([`${N(v.v)}㎡`, `${N(C.toPyeong(v.v))}평`]),
  py2m: v => res([`${N(v.v)}평`, `${N(C.toM2(v.v))}㎡`]),
  dsr(v) {
    if (!(v.income > 0 && v.years > 0)) return '';
    const o = {income: v.income, P: v.amount, ratePct: v.rate, years: v.years, method: v.method, stress: v.stress, other: v.other};
    const d = C.dsr(o), max = C.dsrMax(o, 40), max50 = C.dsrMax(o, 50);
    return res(['DSR', `${N(d.ratio, 1)}%`], [['새 대출 연 원리금', W(d.annual)], ['전체 연 원리금', W(d.total)], ['DSR 40%(은행) 최대 대출', W(max)], ['DSR 50%(2금융) 최대 대출', W(max50)]],
      d.ratio > 40 ? warn('은행 DSR 한도 40%를 넘습니다.') : '');
  },
  unemployment(v) {
    if (!(v.monthly > 0)) return '';
    const u = C.unemployment({monthly: v.monthly, hours: v.hours || 8, span: +v.span, over50: v.over50 === '1', year: v.year});
    return res(['예상 총액', W(u.total)], [['1일 구직급여', W(u.daily)], ['받는 기간', `${u.days}일`], ['한 달(30일) 기준', W(u.month)], ['1일 평균임금', W(u.avgDaily)], ['적용 하한·상한', `${W(u.lower)} ~ ${W(u.upper)}`]],
      v.year === 2027 ? warn('2027년 상한액 개편안(하한액의 103%)은 국회 확정 전이라 현행법으로 계산했습니다.') : '');
  },
  ovulation(v) {
    if (!okDate(v.last) || !(v.len >= 20 && v.len <= 45)) return v.len ? warn('주기는 20~45일 사이로 넣어 주세요.') : '';
    const cs = C.cycles(v.last, v.len, 3);
    return res(['다음 배란 예정일', D(cs[0].ovu)], [['가임기', `${D(cs[0].from)} ~ ${D(cs[0].to)}`], ['다음 생리 예정일', D(cs[0].next)]],
      tbl(['생리 시작', '가임기', '배란 예정일'], cs.map(c => [c.start.slice(5).replace('-', '.'), `${c.from.slice(5).replace('-', '.')}~${c.to.slice(5).replace('-', '.')}`, c.ovu.slice(5).replace('-', '.')])) + '<p class="small">참고용입니다. 피임 방법으로 쓰지 마세요.</p>');
  },
  insurance(v) {
    if (!(v.pay > 0)) return '';
    const i = C.insurance(v.pay, v.year), empB = C.floor10(v.pay * (C.RATES[v.year].emp + +v.size)), sanjae = C.floor10(v.pay * v.sanjae / 100);
    const boss = i.pension + i.health + i.ltc + empB + sanjae;
    return res(['근로자 부담 합계', W(i.sum)], [], tbl(['보험', '근로자', '사업주'], [['국민연금', W(i.pension), W(i.pension)], ['건강보험', W(i.health), W(i.health)], ['장기요양', W(i.ltc), W(i.ltc)], ['고용보험', W(i.emp), W(empB)], ['산재보험', '-', sanjae ? W(sanjae) : '요율 입력 시'], ['합계', W(i.sum), W(boss)]]));
  },
  chars(v) {
    const c = C.countText(v.t);
    return res(['공백 포함', `${N(c.withSpace)}자`], [['공백 제외', `${N(c.noSpace)}자`], ['단어', `${N(c.words)}개`], ['줄', `${N(c.lines)}줄`], ['바이트(한글 2)', `${N(c.euckr)}B`], ['바이트(UTF-8)', `${N(c.utf8)}B`], ['원고지(200자)', `약 ${N(c.withSpace / 200, 1)}매`]]);
  },
  vattotal(v) {const x = C.vatFromTotal(Math.round(v.v)); return res(['공급가액', W(x.supply)], [['부가세', W(x.vat)], ['합계', W(x.total)]]);},
  vatsupply(v) {const x = C.vatFromSupply(Math.round(v.v)); return res(['합계금액', W(x.total)], [['공급가액', W(x.supply)], ['부가세', W(x.vat)]]);},
  holiday(v) {
    if (!(v.wage > 0)) return '';
    const pay = C.weeklyHoliday(v.wage, v.hours), week = v.wage * v.hours + pay;
    return res(['주휴수당(1주)', pay ? W(pay) : '0원'], [['주휴시간', `${N(pay / v.wage || 0, 1)}시간`], ['주급(주휴 포함)', W(week)], ['월 환산', W(v.wage * Math.round((v.hours + pay / v.wage) * C.WEEKS_PER_MONTH))]],
      v.hours < 15 ? warn('1주 15시간 미만이면 주휴수당이 없습니다.') : '');
  },
  yearend(v) {
    if (!(v.g > 0)) return '';
    const x = C.yearEnd({g: v.g, family: v.family || 1, kids: v.kids, kidsCredit: v.kidsc, credit: v.credit, check: v.check, market: v.market, medical: v.medical, edu: v.edu, insure: v.insure, pension: v.pension, rent: v.rent, give: v.give, paid: v.paid});
    const big = Math.abs(x.refund) < 1000 ? ['예상 결과', '환급·추가 납부 거의 없음'] : x.refund > 0 ? ['예상 환급액', W(x.refund)] : ['예상 추가 납부액', W(-x.refund)];
    return res(big, [['근로소득금액', W(x.income)], ['신용카드 등 소득공제', W(x.card)], ['과세표준', W(x.taxBase)], ['산출세액', W(x.calc)], ['결정세액(소득세)', W(x.tax)], ['지방소득세', W(x.local)], [x.estimated ? '기납부세액(추정)' : '기납부세액', W(x.paid)]],
      (x.std ? warn('특별공제보다 표준세액공제 13만 원이 유리해 그쪽으로 계산했습니다.') : '') + (x.estimated ? '<p class="small">기납부세액을 비워 두면 매달 간이세액표로 뗐을 금액을 추정해 넣습니다. 원천징수영수증의 기납부세액(소득세)을 넣으면 더 정확합니다.</p>' : ''));
  },
  cgt(v) {
    if (!(v.sell > 0) || !okDate(v.bdate) || !okDate(v.sdate)) return '';
    if (C.diffDays(v.bdate, v.sdate) < 0) return warn('양도일이 취득일보다 늦어야 합니다.');
    const hold = C.age(v.bdate, v.sdate).man, x = C.capitalGains({sell: v.sell, buy: v.buy, cost: v.cost, hold, live: v.live, houses: v.houses, regulated: v.reg === '1'});
    if (!x.total) return res(['예상 양도소득세', '0원'], [['양도차익', W(x.gain)], ['보유 기간', `${hold}년`]], `<p class="small">${x.note}</p>`);
    const rate = x.rate ? `단기 ${x.rate * 100}%` : `기본세율${x.heavy ? ` + 중과 ${x.heavy * 100}%p` : ''}`;
    return res(['예상 양도소득세(지방세 포함)', W(x.total)], [['양도차익', W(x.gain)], ...(x.taxable < x.gain ? [['과세 양도차익(12억 초과분)', W(x.taxable)]] : []), ['보유 기간', `${hold}년`], [`장기보유특별공제(${Math.round(x.ltr * 100)}%)`, W(x.ltd)], ['기본공제', W(2.5e6)], ['과세표준', W(x.base)], ['적용 세율', rate], ['양도소득세', W(x.tax)], ['지방소득세', W(x.local)]],
      x.heavy ? warn('조정대상지역 다주택 중과(2026년 5월 10일 양도분부터)로 장기보유특별공제가 빠졌습니다.') : '');
  },
  preg(v) {
    if (!okDate(v.d) || !okDate(v.ref)) return '';
    const due = v.by === 'due', lmp = due ? C.addDays(v.d, -280) : v.d, p = C.pregnancy(lmp, v.ref, due ? 28 : v.len || 28);
    if (p.days < 0) return warn('기준 날짜가 마지막 생리 시작일보다 빠릅니다.');
    const S = s => `${s.slice(2).replaceAll('-', '.')}(${C.weekday(s)})`;
    const marks = [[11, 14, '목덜미 투명대 초음파·1차 기형아 검사'], [15, 21, '2차 기형아 검사(쿼드)'], [20, 25, '정밀 초음파'], [24, 29, '임신성 당뇨 검사'], [32, 33, '근로시간 단축 신청 가능(32주부터)'], [37, 38, '만삭(이때부터 정상 출산 시기)'], [40, 41, '출산 예정일']];
    return res(['오늘 임신 주수', `${p.weeks}주 ${p.day}일`], [['출산 예정일', D(p.due)], [p.left >= 0 ? '예정일까지' : '예정일 지남', `${N(Math.abs(p.left))}일`], ['임신 개월', `${Math.min(p.month, 10)}개월`], ['시기', `${p.tri}삼분기(${['초기', '중기', '후기'][p.tri - 1]})`]],
      tbl(['시기', '날짜', '할 일'], marks.map(([a, b, t]) => [`${a}${b - a > 1 ? `~${b - 1}` : ''}주`, `${S(p.at(a))}${b - a > 1 ? ` ~ ${S(C.addDays(p.at(b), -1))}` : ''}`, t])) + (p.weeks > 42 ? warn('42주가 지났습니다. 날짜를 다시 확인해 주세요.') : ''));
  },
  gift(v) {
    if (!(v.gamount > 0)) return '';
    const lineal = v.rel === 'parent' || v.rel === 'grand', x = C.giftTax({amount: v.gamount, prior: v.prior, rel: v.rel, minor: v.minor === '1', marriage: lineal && v.wed === '1'});
    if (!x.tax) return res(['증여세', '0원'], [['증여재산 합계(10년)', W(x.total)], ['증여재산공제', W(x.ded)]], '<p class="small">공제 안이라 낼 세금이 없습니다. 0원이어도 신고해 두면 나중에 집을 살 때 자금 출처로 쓸 수 있습니다.</p>');
    return res(['납부할 증여세', W(x.tax)], [['증여재산 합계(10년)', W(x.total)], ['증여재산공제', W(x.ded)], ['과세표준', W(x.base)], ['산출세액', W(x.calc)], ...(x.sur ? [['세대생략 할증', W(x.sur)]] : []), ...(x.prev ? [['예전 증여분 세금(추정)', `−${W(x.prev)}`]] : []), ['신고세액공제 3%', `−${W(x.credit)}`]],
      '<p class="small">증여받은 달의 말일부터 3개월 안에 신고해야 3% 공제를 받습니다.</p>');
  },
  stock(v) {
    if (!(v.profit > 0)) return '';
    const x = C.stockGains(v.profit, v.scost);
    return res(['해외주식 양도소득세', W(x.total)], [['과세표준(250만 원 공제 후)', W(x.base)], ['양도소득세 20%', W(x.tax)], ['지방소득세 2%', W(x.local)]]);
  },
};

// ---------- 폼 연결 ----------
const NUMS = /^(amount|rate|years|a|b|p|n|annual|nontax|family|kids|months|monthly|bonus|leave|wage|hours|days|v|income|stress|other|len|pay|sanjae|year|g|kidsc|credit|check|market|medical|edu|insure|pension|rent|give|paid|sell|buy|cost|live|houses|profit|scost|gamount|prior)$/;
function read(f) {
  const v = {};
  for (const el of f.elements) if (el.name) v[el.name] = NUMS.test(el.name) ? parseFloat(el.value.replace(/,/g, '')) || 0 : el.value;
  return v;
}
async function run(f) {
  const out = f.querySelector('.out');
  try {out.innerHTML = await R[f.dataset.calc](read(f));} catch (e) {out.innerHTML = warn('입력값을 확인해 주세요.'); console.error(e);}
}
const comma = el => {const raw = el.value.replace(/[^\d.]/g, ''); if (!raw) return; const [i, d] = raw.split('.'); el.value = Number(i).toLocaleString('ko-KR') + (d !== undefined ? '.' + d : '');};

const now = C.today(), y = String(C.thisYear());
document.querySelectorAll('input[data-today]').forEach(el => {if (!el.value) el.value = C.addDays(now, +el.dataset.today || 0);});
document.querySelectorAll('select[name=year]').forEach(el => {if ([...el.options].some(o => o.value === y)) el.value = y;});
document.querySelectorAll('form.calc').forEach(f => {
  if (!R[f.dataset.calc]) return;
  f.addEventListener('input', e => {if (e.target.classList.contains('money')) comma(e.target); run(f);});
  run(f);
});
