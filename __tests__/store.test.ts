import { addFabric, addPlan, editPlan, getShop, markCut, setUsed, undoCut, update } from '../src/state/store';
import { emptyShop, migrate } from '../src/state/defaults';
import { computePlan } from '../src/lib/plan';

describe('shop on this computer', () => {
  beforeEach(() => update(() => {
    const s = emptyShop();
    s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8 };
    s.sizes.L = { ...s.sizes.L, cw: 14, cl: 9 };
    return s;
  }));

  it('starts empty', () => {
    const s = emptyShop();
    expect(s.fabrics).toHaveLength(0);
    expect(s.plans).toHaveLength(0);
    expect(Object.keys(s.sizes)).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  });

  it('plans a cut and takes the fabric off the shelf, and Undo puts it back', () => {
    const f = addFabric({ name: 'Rust gingham', yards: 5, cost: 7.5 });
    const p = addPlan();
    editPlan(p, { body: f, ties: f, qty: { ...getShop().plans[0].qty, M: 12, L: 6 } });
    const res = computePlan(getShop(), getShop().plans[0])!;
    expect(res.count).toBe(18);
    expect(res.cp.mats.length).toBeGreaterThan(0);
    const need = res.needs[0].yards;
    markCut(p, res.needs.map(n => ({ f: n.f!.id, yards: n.yards })));
    expect(getShop().fabrics[0].yards).toBeCloseTo(5 - need, 2);
    expect(getShop().plans[0].status).toBe('cut');
    setUsed(p, f, need + 0.5);
    expect(getShop().fabrics[0].yards).toBeCloseTo(5 - need - 0.5, 2);
    undoCut(p);
    expect(getShop().fabrics[0].yards).toBeCloseTo(5, 2);
    expect(getShop().plans[0].status).toBe('planning');
  });

  it('skips sizes without measurements instead of failing', () => {
    const f = addFabric({ name: 'Sage', yards: 3 });
    const p = addPlan();
    editPlan(p, { body: f, ties: f, qty: { ...getShop().plans[0].qty, XS: 4, M: 2 } });
    const res = computePlan(getShop(), getShop().plans[0])!;
    expect(res.count).toBe(2);
    expect(res.missingSizes).toEqual(['XS']);
  });

  it('migrates an older saved shop without losing fabric', () => {
    const s = migrate({ fabrics: [{ id: 'a', name: 'Old bolt', yards: 2 }], cfg: { cut: { gap: 0.3 } } });
    expect(s.fabrics[0].name).toBe('Old bolt');
    expect(s.cfg.cut.gap).toBe(0.3);
    expect(s.cfg.cut.width).toBe(22);
  });
});
