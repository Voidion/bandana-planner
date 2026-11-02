/* Free hours follow the calendar, including across the clock change (the first Sunday of November). */
import { emptyShop } from '../src/state/defaults';
import { schedule } from '../src/lib/plan';
it('free hours line up with each weekday for the next two weeks', () => {
  const s = emptyShop();
  s.cfg.hours = [10, 1, 2, 3, 4, 5, 6];
  const sc = schedule(s, 14);
  const now = new Date();
  sc.cap.forEach((c, d) => expect(c / 60).toBe(s.cfg.hours[new Date(now.getFullYear(), now.getMonth(), now.getDate() + d).getDay()]));
});
