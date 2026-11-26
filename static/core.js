// 계산 로직만 모은 파일(화면 코드 없음). 브라우저(app.js)와 검사(test.mjs)가 함께 씁니다.
// 요율이 바뀌면 RATES만 고치고 `node test.mjs`로 확인합니다.

/** 연도별 요율. 근로자 부담분 기준(국민연금·건강·고용은 근로자=사업주 같은 비율). */
export const RATES = {
  2026: {minWage: 10320, pension: 0.0475, pMin: 410000, pMax: 6590000, health: 0.03595, ltc: 0.1314, emp: 0.009, uiMax: 68100},
  // 2027: 최저임금 10,700원(2026.8.5 고시), 국민연금 10%(근로자 5%), 건강 7.19% 동결, 장기요양 건강보험료의 13.90%(2026.10.30 의결).
  // 실업급여 상한은 개편안(하한의 103%)이 국회 확정 전이라 현행법대로(하한이 상한보다 크면 하한 지급) 둡니다.
  2027: {minWage: 10700, pension: 0.05, pMin: 410000, pMax: 6590000, health: 0.03595, ltc: 0.1390, emp: 0.009, uiMax: 68100},
};
export const thisYear = (d = new Date()) => {const y = new Date(d.getTime() + 9 * 3600e3).getUTCFullYear(); return RATES[y] ? y : y > 2027 ? 2027 : 2026;};

export const floor10 = x => Math.floor(x / 10 + 1e-9) * 10; // 1e-9: 2,800,000×0.009=25199.999… 같은 소수 오차 보정
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ---------- 날짜 (모두 'YYYY-MM-DD', 시간대 영향 없게 UTC 날짜로 계산) ----------
export const toDay = s => {const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5;};
export const fromDay = n => new Date(n * 864e5).toISOString().slice(0, 10);
export const today = (d = new Date()) => fromDay(Math.floor((d.getTime() + 9 * 3600e3) / 864e5));
export const diffDays = (a, b) => toDay(b) - toDay(a);
export const addDays = (s, n) => fromDay(toDay(s) + n);
export function addMonths(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
export const weekday = s => '일월화수목금토'[new Date(toDay(s) * 864e5).getUTCDay()];

const ZODIAC = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양'];
export function age(birth, ref) {
  const [by, bm, bd] = birth.split('-').map(Number), [ry, rm, rd] = ref.split('-').map(Number);
  const man = ry - by - (rm * 100 + rd < bm * 100 + bd ? 1 : 0);
  let next = `${ry}-${String(bm).padStart(2, '0')}-${String(bd).padStart(2, '0')}`;
  if (bm === 2 && bd === 29 && !(ry % 4 === 0 && (ry % 100 || ry % 400 === 0))) next = `${ry}-03-01`;
  if (diffDays(ref, next) < 0) next = addMonths(next, 12);
  return {man, year: ry - by, korean: ry - by + 1, zodiac: ZODIAC[by % 12], lived: diffDays(birth, ref), toBirthday: diffDays(ref, next)};
}

// ---------- 퍼센트·단위 ----------
export const pctOf = (a, p) => a * p / 100;          // a의 p%
export const pctIs = (a, b) => a / b * 100;          // a는 b의 몇 %
export const pctChange = (a, b) => (b - a) / a * 100; // a → b 증감률
export const PYEONG = 3.305785;
export const toPyeong = m2 => m2 / PYEONG;
export const toM2 = p => p * PYEONG;

// ---------- 부가세 ----------
export function vatFromTotal(total) {const supply = Math.round(total / 1.1); return {supply, vat: total - supply, total};}
export function vatFromSupply(supply) {const vat = Math.floor(supply * 0.1); return {supply, vat, total: supply + vat};}

// ---------- 대출 ----------
/** method: 'equal'(원리금균등) | 'principal'(원금균등) | 'bullet'(만기일시). 반환: 월별 표와 합계. */
export function loan(P, ratePct, n, method = 'equal') {
  const r = ratePct / 100 / 12, rows = [];
  let bal = P;
  const pay = r ? P * r / (1 - (1 + r) ** -n) : P / n;
  for (let m = 1; m <= n; m++) {
    const int = bal * r;
    const prin = method === 'equal' ? pay - int : method === 'principal' ? P / n : m === n ? P : 0;
    bal = Math.max(0, bal - prin);
    rows.push({m, pay: prin + int, prin, int, bal});
  }
  const interest = rows.reduce((s, x) => s + x.int, 0);
  return {rows, interest, total: P + interest};
}
/** DSR: 새 대출 첫 1년 원리금 + 기존 대출 연 원리금, 연소득 대비 %. 만기일시는 원금을 대출 기간으로 나눠 반영. */
export function dsr({income, P, ratePct, years, method, stress = 0, other = 0}) {
  const n = years * 12, rows = loan(P, ratePct + stress, n, method).rows.slice(0, 12);
  let annual = rows.reduce((s, x) => s + x.pay, 0);
  if (method === 'bullet') annual = rows.reduce((s, x) => s + x.int, 0) + P / years;
  return {annual, total: annual + other, ratio: (annual + other) / income * 100};
}
/** 목표 DSR(%)까지 빌릴 수 있는 최대 금액(이분 탐색, 만 원 단위). */
export function dsrMax(opts, target = 40) {
  let lo = 0, hi = 5e9;
  for (let i = 0; i < 60; i++) {const mid = (lo + hi) / 2; dsr({...opts, P: mid}).ratio <= target ? lo = mid : hi = mid;}
  return Math.floor(lo / 1e4) * 1e4;
}

// ---------- 예금·적금 ----------
export const TAX = {normal: 0.154, favor: 0.014, free: 0}; // favor: 농·수·신협·새마을금고 조합원 예탁금(농특세만)
/** 예금: P원을 n개월. compound=true면 월복리. */
export function deposit(P, ratePct, n, compound, tax = 'normal') {
  const r = ratePct / 100 / 12;
  const interest = compound ? P * ((1 + r) ** n - 1) : P * r * n;
  const t = floor10(interest * TAX[tax]);
  return {principal: P, interest, tax: t, net: P + interest - t};
}
/** 적금: 매달 M원을 n개월(매달 같은 날 납입). */
export function installment(M, ratePct, n, compound, tax = 'normal') {
  const r = ratePct / 100 / 12;
  let interest = 0;
  for (let k = 1; k <= n; k++) interest += compound ? M * ((1 + r) ** k - 1) : M * r * k;
  const t = floor10(interest * TAX[tax]);
  return {principal: M * n, interest, tax: t, net: M * n + interest - t};
}

// ---------- 근로소득세(연간 추정) ----------
export function wageDeduction(g) {
  const d = g <= 5e6 ? g * 0.7 : g <= 15e6 ? 3.5e6 + (g - 5e6) * 0.4 : g <= 45e6 ? 7.5e6 + (g - 15e6) * 0.15
    : g <= 1e8 ? 12e6 + (g - 45e6) * 0.05 : 14.75e6 + (g - 1e8) * 0.02;
  return Math.min(d, 2e7);
}
const BRACKETS = [[14e6, 0.06], [50e6, 0.15], [88e6, 0.24], [150e6, 0.35], [300e6, 0.38], [500e6, 0.40], [1e9, 0.42], [Infinity, 0.45]];
export function baseTax(t) {
  let tax = 0, prev = 0;
  for (const [cap, rate] of BRACKETS) {if (t <= prev) break; tax += (Math.min(t, cap) - prev) * rate; prev = cap;}
  return tax;
}
export function wageTaxCredit(tax, g) {
  const c = tax <= 1.3e6 ? tax * 0.55 : 715000 + (tax - 1.3e6) * 0.3;
  const lim = g <= 33e6 ? 740000 : g <= 70e6 ? Math.max(660000, 740000 - (g - 33e6) * 0.008)
    : g <= 120e6 ? Math.max(500000, 660000 - (g - 70e6) / 2) : Math.max(200000, 500000 - (g - 120e6) / 2);
  return Math.min(c, lim);
}
export const childCredit = n => n <= 0 ? 0 : n === 1 ? 250000 : 550000 + (n - 2) * 400000;

/** 월 과세 급여 하나로 4대보험 근로자 부담분. */
export function insurance(taxable, year = thisYear()) {
  const R = RATES[year];
  const pension = floor10(clamp(Math.floor(taxable / 1000) * 1000, R.pMin, R.pMax) * R.pension);
  const health = floor10(taxable * R.health);
  const ltc = floor10(health * R.ltc);
  const emp = floor10(taxable * R.emp);
  return {pension, health, ltc, emp, sum: pension + health + ltc + emp};
}
/**
 * 연봉 실수령액. 소득세는 간이세액표 대신 연간 세액을 추정해 12로 나눔
 * (근로소득공제·인적공제·연금·보험료 공제 → 기본세율 → 근로소득·자녀 세액공제). 간이세액표와 몇천 원 다를 수 있음.
 */
export function salary(annual, {nontax = 200000, family = 1, kids = 0, year = thisYear()} = {}) {
  const monthly = annual / 12, taxable = Math.max(0, monthly - nontax), ins = insurance(taxable, year);
  const g = taxable * 12;
  const base = g - wageDeduction(g) - 1.5e6 * Math.max(1, family) - ins.pension * 12;
  // 연말정산처럼 '건강·고용보험료 소득공제'와 '표준세액공제 13만 원' 중 세금이 적은 쪽을 고름
  const taxOf = (b, std) => {const t = baseTax(Math.max(0, b)); return Math.max(0, t - wageTaxCredit(t, g) - childCredit(kids) - std);};
  const tax = Math.min(taxOf(base - (ins.health + ins.ltc + ins.emp) * 12, 0), taxOf(base, 130000));
  const incomeTax = floor10(tax / 12), localTax = floor10(incomeTax * 0.1);
  const deduct = ins.sum + incomeTax + localTax;
  return {monthly, ...ins, incomeTax, localTax, deduct, net: monthly - deduct};
}

// ---------- 퇴직금 ----------
/** end = 퇴직일(마지막 근무일 다음 날). monthly = 최근 3개월 월평균 임금(세전). bonus·leave = 1년간 상여금·연차수당. */
export function severance({start, end, monthly, bonus = 0, leave = 0}) {
  const days = diffDays(start, end), d3 = diffDays(addMonths(end, -3), end);
  const avg = (monthly * 3 + (bonus + leave) * 3 / 12) / d3;
  return {days, d3, avg, eligible: days >= 365, pay: days >= 365 ? avg * 30 * days / 365 : 0};
}

// ---------- 시급·주휴수당 ----------
export function weeklyHoliday(wage, weeklyHours) {
  return weeklyHours < 15 ? 0 : wage * Math.min(weeklyHours, 40) / 40 * 8;
}
export const WEEKS_PER_MONTH = 365 / 7 / 12; // 약 4.345주
export function hourly(wage, hoursPerDay, daysPerWeek) {
  const weeklyHours = hoursPerDay * daysPerWeek, holiday = weeklyHoliday(wage, weeklyHours);
  // 월 시간은 고용노동부 월 환산처럼 (주 근로 + 주휴 시간) × 4.345주를 반올림(주 40시간 → 209시간)
  const monthHours = Math.round((weeklyHours + (holiday ? holiday / wage : 0)) * WEEKS_PER_MONTH);
  const week = wage * weeklyHours + holiday, month = wage * monthHours;
  return {day: wage * hoursPerDay, weeklyHours, holiday, week, monthHours, month, year: month * 12, month33: month - floor10(month * 0.03) - floor10(floor10(month * 0.03) * 0.1)};
}

// ---------- 실업급여 ----------
const UI_DAYS = [[120, 150, 180, 210, 240], [120, 180, 210, 240, 270]]; // [50세 미만, 50세 이상·장애인][가입기간 구간]
/** span: 0=1년 미만, 1=1~3년, 2=3~5년, 3=5~10년, 4=10년 이상. monthly = 퇴사 전 3개월 월평균 임금(세전). */
export function unemployment({monthly, hours = 8, span, over50, year = thisYear()}) {
  const R = RATES[year] || RATES[2026];
  const avgDaily = monthly * 12 / 365;
  const lower = R.minWage * 0.8 * Math.min(8, hours);
  const upper = Math.max(R.uiMax, lower);
  const daily = Math.floor(clamp(avgDaily * 0.6, lower, upper));
  const days = UI_DAYS[over50 ? 1 : 0][span];
  return {avgDaily, daily, lower, upper, days, total: daily * days, month: daily * 30};
}

// ---------- 배란일 ----------
export function cycles(lastStart, len = 28, count = 3) {
  return Array.from({length: count}, (_, i) => {
    const start = addDays(lastStart, len * i), next = addDays(start, len), ovu = addDays(next, -14);
    return {start, next, ovu, from: addDays(ovu, -5), to: addDays(ovu, 1)};
  });
}

// ---------- 글자수 ----------
export function countText(t) {
  const chars = [...t.replace(/\r/g, '')];
  return {
    withSpace: chars.filter(c => c !== '\n').length,
    noSpace: chars.filter(c => !/\s/.test(c)).length,
    words: (t.trim().match(/\S+/g) || []).length,
    lines: t ? t.split('\n').length : 0,
    utf8: new TextEncoder().encode(t.replace(/\r/g, '')).length,
    euckr: chars.reduce((s, c) => s + (c.charCodeAt(0) > 127 ? 2 : 1), 0),
  };
}

// ---------- 연말정산(2026년 귀속, 2027년 1~2월 정산) ----------
// 신용카드 기본 한도는 2026년 사용분부터 기본공제 자녀 수(20세 이하)에 따라 늘어남: 7천 이하 300/350/400만, 초과 250/275/300만.
export function cardDeduction(g, {credit = 0, check = 0, market = 0, kids = 0}) {
  let th = g * 0.25; // 총급여 25%는 공제율 낮은 신용카드부터 채움
  const over = x => {const o = Math.max(0, x - th); th = Math.max(0, th - x); return o;};
  const c = over(credit) * 0.15, k = over(check) * 0.3, m = over(market) * 0.4;
  const low = g <= 7e7, k2 = Math.min(kids, 2);
  const basic = (low ? [300, 350, 400] : [250, 275, 300])[k2] * 1e4;
  const extra = Math.min(Math.max(0, c + k + m - basic), m, low ? 3e6 : 2e6); // 넘친 금액은 전통시장·대중교통 몫만 추가 한도
  return Math.min(c + k + m, basic) + extra;
}
/** g = 총급여(비과세 빼고). paid = 기납부 소득세(0이면 매달 떼는 세금 추정). 반환 refund > 0이면 환급(지방소득세 포함). */
export function yearEnd({g, family = 1, kids = 0, kidsCredit = 0, credit = 0, check = 0, market = 0, medical = 0, edu = 0, insure = 0, pension = 0, rent = 0, give = 0, paid = 0}) {
  const ins = insurance(g / 12, 2026), y = k => ins[k] * 12;
  const income = g - wageDeduction(g), card = cardDeduction(g, {credit, check, market, kids});
  const base = income - 1.5e6 * Math.max(1, family) - y('pension') - card;
  const taxOf = (b, credits) => {const t = baseTax(Math.max(0, b)); return {t, b: Math.max(0, b), tax: Math.max(0, t - wageTaxCredit(t, g) - childCredit(kidsCredit) - credits)};};
  const pen = Math.min(pension, 9e6) * (g <= 5.5e7 ? 0.15 : 0.12);
  const rentC = g <= 8e7 ? Math.min(rent, 1e7) * (g <= 5.5e7 ? 0.17 : 0.15) : 0;
  const special = Math.min(insure, 1e6) * 0.12 + Math.max(0, medical - g * 0.03) * 0.15 + edu * 0.15 + Math.min(give, 1e7) * 0.15 + Math.max(0, give - 1e7) * 0.3;
  const a = taxOf(base - y('health') - y('ltc') - y('emp'), pen + rentC + special), b = taxOf(base, pen + 130000);
  const r = a.tax <= b.tax ? {...a, std: false} : {...b, std: true};
  const tax = floor10(r.tax), before = paid || salary(g, {nontax: 0, family, kids: kidsCredit, year: 2026}).incomeTax * 12;
  return {income, card, taxBase: r.b, calc: r.t, tax, local: floor10(tax * 0.1), paid: before, estimated: !paid, std: r.std,
    refund: before + floor10(before * 0.1) - tax - floor10(tax * 0.1)};
}

// ---------- 양도소득세(주택, 거주자) ----------
// 다주택 중과 유예는 2026.5.9 종료 → 조정대상지역 2주택 +20%p, 3주택 이상 +30%p, 장기보유특별공제 배제.
/** hold·live = 보유·거주 연수(만). houses: 1·2·3(이상). regulated = 양도 시 조정대상지역. */
export function capitalGains({sell, buy, cost = 0, hold, live = 0, houses = 1, regulated = false}) {
  const gain = sell - buy - cost;
  if (gain <= 0) return {gain, tax: 0, local: 0, total: 0, note: '양도차익이 없어 세금이 없습니다.'};
  const one = houses === 1, exempt = one && hold >= 2 && (live >= 2 || !regulated);
  if (exempt && sell <= 12e8) return {gain, tax: 0, local: 0, total: 0, note: '1세대 1주택 비과세(양도가 12억 원 이하)입니다.'};
  const taxable = exempt ? gain * (sell - 12e8) / sell : gain;
  const heavy = !one && regulated && hold >= 2 ? (houses === 2 ? 0.2 : 0.3) : 0;
  const ltr = heavy || hold < 3 ? 0 : exempt && live >= 2 ? Math.min(hold, 10) * 0.04 + Math.min(live, 10) * 0.04 : Math.min(hold, 15) * 0.02;
  const base = Math.floor(Math.max(0, taxable * (1 - ltr) - 2.5e6) + 1e-6); // 1e-6: 소수 오차 보정
  const rate = hold < 1 ? 0.7 : hold < 2 ? 0.6 : 0;
  const tax = floor10(rate ? base * rate : baseTax(base) + base * heavy);
  return {gain, taxable, ltr, ltd: taxable * ltr, base, heavy, rate, tax, local: floor10(tax * 0.1), total: tax + floor10(tax * 0.1)};
}
// 해외주식: 1년 손익 합산 − 기본공제 250만 원 × 22%(지방소득세 포함)
export function stockGains(profit, cost = 0) {
  const base = Math.max(0, profit - cost - 2.5e6), tax = floor10(base * 0.2);
  return {base, tax, local: floor10(tax * 0.1), total: tax + floor10(tax * 0.1)};
}

// ---------- 임신 주수 ----------
/** lmp = 마지막 생리 시작일. 주기가 28일보다 길면 배란이 늦은 만큼 예정일도 늦춤(네겔레 법칙 보정). */
export function pregnancy(lmp, ref, cycle = 28) {
  const adj = cycle - 28, days = diffDays(lmp, ref) - adj;
  return {days, weeks: Math.floor(days / 7), day: ((days % 7) + 7) % 7, due: addDays(lmp, 280 + adj), left: 280 - days,
    month: Math.floor(days / 28) + 1, tri: days < 98 ? 1 : days < 196 ? 2 : 3, at: w => addDays(lmp, w * 7 + adj)};
}

// ---------- 증여세 ----------
// 증여재산공제(10년 합산): 배우자 6억, 부모·조부모 → 자녀·손자녀 5천만(미성년 2천만), 자녀 → 부모 5천만, 기타 친족 1천만.
// 혼인·출산 공제: 부모·조부모에게 받은 것 1억 추가(평생 1번). 세율·공제는 2026년 현재 시행법(정부 개편안은 국회 확정 전).
export const GIFT_DED = {spouse: 6e8, parent: 5e7, grand: 5e7, child: 5e7, relative: 1e7, other: 0};
const GIFT_BR = [[1e8, 0.1], [5e8, 0.2], [1e9, 0.3], [3e9, 0.4], [Infinity, 0.5]];
export function giftRate(b) {let t = 0, prev = 0; for (const [cap, r] of GIFT_BR) {if (b <= prev) break; t += (Math.min(b, cap) - prev) * r; prev = cap;} return t;}
/** amount = 이번 증여, prior = 같은 사람(부모면 부모 양쪽)에게 10년 안에 받은 것. rel = GIFT_DED 키. */
export function giftTax({amount, prior = 0, rel = 'parent', minor = false, marriage = false}) {
  const lineal = rel === 'parent' || rel === 'grand';
  const basic = (lineal && minor ? 2e7 : GIFT_DED[rel]) + (lineal && marriage ? 1e8 : 0);
  const total = amount + prior, ded = Math.min(total, basic);
  const base = Math.floor(total - ded), calc = base < 5e5 ? 0 : giftRate(base);
  const sur = rel === 'grand' ? calc * (minor && amount > 2e9 ? 0.4 : 0.3) : 0; // 세대생략 할증
  const prev = prior ? giftRate(Math.max(0, prior - basic)) * (rel === 'grand' ? 1.3 : 1) : 0; // 예전 증여분 세금(기납부세액 추정)
  const due = Math.max(0, calc + sur - prev), credit = due * 0.03; // 기한 안 신고 시 3% 공제
  return {total, ded, base, calc, sur, prev, credit, tax: floor10(due - credit)};
}
