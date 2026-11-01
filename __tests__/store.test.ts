import {
  addFabric,
  adjustStock,
  cutRun,
  editRun,
  finishRun,
  getShop,
  logDefect,
  planRun,
  setUsed,
  startTimer,
  stockBySize,
  stopTimer,
  tickStep,
  undoCut,
  undoDefect,
  update,
} from '../src/state/store';
import { emptyShop, migrate } from '../src/state/defaults';
import { computePlan, runNumbers } from '../src/lib/plan';

const run = (id: string) => getShop().runs.find(r => r.id === id)!;

describe('shop on this computer', () => {
  beforeEach(() =>
    update(() => {
      const s = emptyShop();
      s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
      s.sizes.L = { ...s.sizes.L, cw: 14, cl: 9, price: 22, mins: 41 };
      return s;
    }),
  );

  it('starts empty', () => {
    const s = emptyShop();
    expect(s.fabrics).toHaveLength(0);
    expect(s.runs).toHaveLength(0);
    expect(Object.keys(s.sizes)).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
    expect(s.templates[0].steps.map(x => x.n)).toContain('Cut day');
  });

  it('plans a run: fabric needs and steps follow the sizes', () => {
    const f = addFabric({ name: 'Rust gingham', yards: 5, cost: 7.5 });
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...run(id).qty, M: 12, L: 6 } });
    const r = run(id);
    expect(r.fabrics).toHaveLength(1);
    expect(r.fabrics[0].need).toBeGreaterThan(0);
    expect(r.steps.map(s => s.name)[0]).toBe('Cut day');
    const small = r.steps.reduce((a, s) => a + s.est, 0);
    editRun(id, { qty: { ...run(id).qty, M: 24, L: 12 } });
    expect(run(id).steps.reduce((a, s) => a + s.est, 0)).toBeGreaterThan(small * 1.8);
    const n = runNumbers(getShop(), run(id));
    expect(n.pieces).toBe(36);
    expect(n.worth).toBeCloseTo(24 * 18 + 12 * 22, 2);
  });

  it('records the cut, corrects it, and Undo puts the fabric back', () => {
    const f = addFabric({ name: 'Rust gingham', yards: 5, cost: 7.5 });
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...run(id).qty, M: 12, L: 6 } });
    const need = run(id).fabrics[0].need;
    cutRun(id, [need]);
    expect(getShop().fabrics[0].yards).toBeCloseTo(5 - need, 2);
    expect(run(id).cut).toBe(true);
    expect(run(id).status).toBe('active');
    expect(run(id).steps.find(s => s.name === 'Cut day')!.done).toBe(true);
    setUsed(id, f, need + 0.5);
    expect(getShop().fabrics[0].yards).toBeCloseTo(5 - need - 0.5, 2);
    undoCut(id);
    expect(getShop().fabrics[0].yards).toBeCloseTo(5, 2);
    expect(run(id).cut).toBe(false);
  });

  it('times a step, then finishing moves the bandanas to stock', () => {
    const f = addFabric({ name: 'Sage', yards: 6 });
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...run(id).qty, M: 4 } });
    const press = run(id).steps[1];
    const real = Date.now;
    const t0 = real();
    Date.now = () => t0;
    startTimer(id, press.id);
    Date.now = () => t0 + 25 * 6e4;
    expect(stopTimer()!.mins).toBe(25);
    Date.now = real;
    expect(run(id).steps[1].actual).toBe(25);
    expect(getShop().sessions).toHaveLength(1);
    tickStep(id, press.id);
    finishRun(id);
    expect(run(id).status).toBe('done');
    expect(run(id).steps.every(s => s.done)).toBe(true);
    expect(stockBySize(getShop()).M).toBe(4);
    adjustStock('M', -1);
    expect(stockBySize(getShop()).M).toBe(3);
    const d = logDefect({ run: id, kind: 'Fabric flaw', step: null, n: 2, size: 'M', fate: 'toss' });
    expect(stockBySize(getShop()).M).toBe(1);
    undoDefect(d);
    expect(stockBySize(getShop()).M).toBe(3);
  });

  it('skips sizes without measurements instead of failing', () => {
    const f = addFabric({ name: 'Sage', yards: 3 });
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...run(id).qty, XS: 4, M: 2 } });
    const res = computePlan(getShop(), run(id));
    expect(res.count).toBe(2);
    expect(res.missingSizes).toEqual(['XS']);
  });

  it('turns cut plans from the first version into runs, keeping the fabric taken', () => {
    const s = migrate({
      fabrics: [{ id: 'a', name: 'Old bolt', yards: 2, cost: 8 }],
      cfg: { cut: { gap: 0.3 } },
      plans: [
        { id: 'p1', name: 'Fall', qty: { M: 6 }, body: 'a', ties: 'a', status: 'cut', cutAt: '2026-10-30', fabUse: [{ f: 'a', name: 'Old bolt', plan: 1, used: 1.1 }] },
        { id: 'p2', name: '', qty: { L: 2 }, body: 'a', ties: 'a', status: 'planning', fabUse: [] },
      ],
    });
    expect(s.fabrics[0].name).toBe('Old bolt');
    expect(s.cfg.cut.gap).toBe(0.3);
    expect(s.runs.map(r => r.status)).toEqual(['active', 'draft']);
    expect(s.runs[0].fabUse[0].used).toBe(1.1);
    expect(s.runs[0].fabUse[0].cost).toBe(8);
    expect((s as any).plans).toBeUndefined();
  });
});
