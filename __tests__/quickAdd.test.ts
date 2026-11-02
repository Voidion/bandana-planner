import { parseQuick } from '../src/lib/quickAdd';
// 2026-10-08 is a Thursday
const T = '2026-10-08';
test('market with a day, hours and a place', () => {
  const e = parseQuick('Market Sat 8am-2pm at Riverside', T)!;
  expect(e).toMatchObject({ kind: 'market', day: '2026-10-10', time: '08:00', dur: 360, loc: 'Riverside', title: 'Market' });
});
test('pickup tomorrow afternoon', () => {
  expect(parseQuick('pickup tomorrow 3pm', T)).toMatchObject({ kind: 'pickup', day: '2026-10-09', time: '15:00', dur: 60 });
});
test('day off has no time', () => {
  const e = parseQuick('day off friday', T)!;
  expect(e).toMatchObject({ kind: 'off', day: '2026-10-09', title: 'Day off' });
  expect(e.time).toBeUndefined();
});
test('two-day fair with a date range', () => {
  expect(parseQuick('Craft fair oct 17-18', T)).toMatchObject({ kind: 'market', day: '2026-10-17', days: 2, title: 'Craft fair' });
});
test('past dates roll to next year', () => {
  expect(parseQuick('Sewing jan 5 7pm', T)).toMatchObject({ kind: 'sew', day: '2027-01-05', time: '19:00' });
});
test('8-2pm reads as morning to afternoon', () => {
  expect(parseQuick('market sat 8-2pm', T)).toMatchObject({ time: '08:00', dur: 360 });
});
