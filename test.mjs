// 계산 로직 검사: node test.mjs (틀리면 멈춤). 요율·공식을 고친 뒤 꼭 실행.
import assert from 'node:assert/strict';
import * as C from './static/core.js';

const near = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

// 날짜·나이
assert.equal(C.diffDays('2026-01-01', '2026-12-31'), 364);
assert.equal(C.addDays('2026-11-16', 100), '2027-02-24');
assert.equal(C.addMonths('2025-05-31', -3), '2025-02-28');
assert.equal(C.weekday('2026-11-16'), '월');
const a = C.age('1990-05-20', '2026-11-16');
assert.deepEqual([a.man, a.year, a.korean, a.zodiac], [36, 36, 37, '말']);
assert.equal(C.age('1990-12-01', '2026-11-16').man, 35);
assert.equal(C.age('2000-02-29', '2027-02-28').toBirthday, 1); // 윤년생은 평년에 3월 1일

// 퍼센트·평수·부가세
assert.equal(C.pctOf(200, 15), 30);
assert.equal(C.pctChange(100, 120), 20);
near(C.toPyeong(84), 25.41, 0.01);
assert.deepEqual(C.vatFromTotal(11000), {supply: 10000, vat: 1000, total: 11000});
assert.deepEqual(C.vatFromSupply(10000), {supply: 10000, vat: 1000, total: 11000});

// 대출: 1억, 연 5%, 30년 원리금균등 → 월 536,822원
const L = C.loan(1e8, 5, 360, 'equal');
near(L.rows[0].pay, 536822);
near(L.rows.at(-1).bal, 0);
assert.equal(Math.round(C.loan(1.2e7, 6, 12, 'principal').rows[0].pay), 1060000);
assert.equal(C.loan(1e7, 6, 12, 'bullet').rows.at(-1).prin, 1e7);
// DSR: 연소득 5천만, 3억 30년 4% 원리금균등 → 연 약 1,719만 → 34.4%
near(C.dsr({income: 5e7, P: 3e8, ratePct: 4, years: 30, method: 'equal'}).ratio, 34.37, 0.05);
const mx = C.dsrMax({income: 5e7, ratePct: 4, years: 30, method: 'equal'});
near(C.dsr({income: 5e7, P: mx, ratePct: 4, years: 30, method: 'equal'}).ratio, 40, 0.01);

// 예적금
assert.equal(C.deposit(1e7, 3.5, 12, false).interest, 350000);
assert.equal(C.deposit(1e7, 3.5, 12, false).tax, 53900);
near(C.installment(1e6, 3.5, 12, false).interest, 227500);

// 세금
assert.equal(C.baseTax(14e6), 840000);
assert.equal(C.baseTax(5e7), 6240000);
assert.equal(C.wageDeduction(33.6e6), 10290000);
assert.equal(C.wageDeduction(5e8), 2e7);
assert.equal(C.childCredit(3), 950000);

// 4대보험(2026): 과세 월급 280만
assert.deepEqual(C.insurance(2.8e6, 2026), {pension: 133000, health: 100660, ltc: 13220, emp: 25200, sum: 272080});
assert.equal(C.insurance(1e7, 2026).pension, 313020); // 상한 659만 × 4.75%
assert.equal(C.insurance(2.8e6, 2027).pension, 140000);
const s = C.salary(3.6e7, {year: 2026});
assert.ok(s.incomeTax > 50000 && s.incomeTax < 80000, `소득세 ${s.incomeTax}`);
near(s.net, 3e6 - s.deduct);
assert.equal(C.salary(1.2e7, {year: 2026}).incomeTax, 0);

// 퇴직금: 5년(1,827일), 월 300만 → 평균임금 97,826원
const sv = C.severance({start: '2020-01-01', end: '2025-01-01', monthly: 3e6});
assert.equal(sv.days, 1827);
assert.equal(sv.d3, 92);
near(sv.pay, 9e6 / 92 * 30 * 1827 / 365);
assert.equal(C.severance({start: '2026-01-01', end: '2026-12-01', monthly: 3e6}).eligible, false);

// 주휴수당·시급
assert.equal(C.weeklyHoliday(10320, 40), 82560);
assert.equal(C.weeklyHoliday(10320, 20), 41280);
assert.equal(C.weeklyHoliday(10320, 14), 0);
near(C.hourly(10320, 8, 5).month, 2156880, 1000); // 월 209시간 환산 2,156,880원과 비슷

// 실업급여(2026): 월 300만은 하한 66,048원, 3~5년·50세 미만 180일
const u = C.unemployment({monthly: 3e6, span: 2, over50: false, year: 2026});
assert.deepEqual([u.daily, u.days, u.total], [66048, 180, 11888640]);
assert.equal(C.unemployment({monthly: 9e6, span: 4, over50: true, year: 2026}).daily, 68100);
assert.equal(C.unemployment({monthly: 3e6, span: 0, over50: false, year: 2027}).daily, 68480);

// 배란일·글자수·기본 계산
assert.deepEqual(C.cycles('2026-11-01', 28, 1)[0], {start: '2026-11-01', next: '2026-11-29', ovu: '2026-11-15', from: '2026-11-10', to: '2026-11-16'});
assert.deepEqual(C.countText('안녕 하세요\nab'), {withSpace: 8, noSpace: 7, words: 3, lines: 2, utf8: 19, euckr: 14});

// 연말정산(2026 귀속): 총급여 4천, 신용 1,500만·체크 500만 → 25%(1천만)는 신용카드로 채움 → 500만×15% + 500만×30% = 225만
assert.equal(C.cardDeduction(4e7, {credit: 15e6, check: 5e6}), 2250000);
assert.equal(C.cardDeduction(4e7, {check: 4e7, kids: 2}), 4e6); // 자녀 2명 한도 400만
assert.ok(Math.abs(C.yearEnd({g: 4e7}).refund) < 1000); // 공제 없으면 매달 뗀 세금과 거의 같음
assert.ok(C.yearEnd({g: 4e7, pension: 6e6}).refund > C.yearEnd({g: 4e7}).refund);

// 양도세: 15억 1주택 10년 보유·거주 → 과세차익 1.36억, 장특공 80% → 과세표준 2,470만 → 244.5만
assert.equal(C.capitalGains({sell: 15e8, buy: 8e8, cost: 2e7, hold: 10, live: 10, regulated: true}).tax, 2445000);
assert.equal(C.capitalGains({sell: 9e8, buy: 5e8, hold: 3, live: 3}).total, 0); // 12억 이하 비과세
assert.equal(C.capitalGains({sell: 10e8, buy: 6e8, hold: 5, houses: 2, regulated: true}).ltr, 0); // 중과면 장특공 없음
assert.equal(C.stockGains(2e7).total, 3850000);

console.log('계산 검사 통과');
