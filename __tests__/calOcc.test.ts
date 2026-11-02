import { calOccurrences } from '../src/state/alerts';
import { emptyShop } from '../src/state/defaults';
import { addDays, todayDay } from '../src/lib/plan';
test('weekly and monthly repeats expand', () => {
  const s: any = emptyShop();
  const d0 = todayDay();
  s.cal = [
    { id: 'a', day: d0, title: 'Sew', kind: 'sew', days: 1, notes: '', rep: 'w' },
    { id: 'b', day: addDays(d0, 3), title: 'Once', kind: 'other', days: 1, notes: '' },
  ];
  const o = calOccurrences(s, 0, 28);
  expect(o.filter(x => x.e.id === 'a').map(x => x.day)).toEqual([0, 7, 14, 21, 28].map(n => addDays(d0, n)));
  expect(o.filter(x => x.e.id === 'b')).toHaveLength(1);
});
