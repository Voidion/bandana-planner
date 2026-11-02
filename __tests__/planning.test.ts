import { addFabric, cutRun, editRun, getShop, planRun, update } from '../src/state/store';
import { addEvent } from '../src/state/planning';
import { emptyShop } from '../src/state/defaults';
import { addDays, schedule, todayDay } from '../src/lib/plan';

describe('planning', () => {
  beforeEach(() =>
    update(() => {
      const s = emptyShop();
      s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
      s.cfg.hours = [2, 2, 2, 2, 2, 2, 2];
      return s;
    }),
  );

  it('fits runs into free hours, flags late ones, and a market day takes its hours out', () => {
    const f = addFabric({ name: 'Sage', yards: 9 });
    const id = planRun({ body: f, ties: f, due: addDays(todayDay(), 2) });
    editRun(id, { qty: { ...getShop().runs[0].qty, M: 12 } });
    const left = getShop().runs[0].steps.reduce((a, s) => a + s.est, 0);
    const sc = schedule(getShop(), 28);
    expect(sc.cap[0]).toBe(120);
    expect(sc.used.reduce((a, b) => a + b, 0)).toBe(left);
    expect(sc.late).toContain(id);
    addEvent({ day: addDays(todayDay(), 1), kind: 'market', title: 'Riverside' });
    expect(schedule(getShop(), 28).cap[1]).toBe(0);
  });

  it('counts mats cut on the blade and mat', () => {
    const f = addFabric({ name: 'Sage', yards: 9 });
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...getShop().runs[0].qty, M: 12 } });
    cutRun(id, [getShop().runs[0].fabrics[0].need]);
    expect(getShop().tools.find(t => t.kind === 'blade')!.uses).toBeGreaterThan(0);
  });
});
