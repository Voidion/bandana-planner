import { addFabric, editRun, finishRun, getShop, planRun, stockBySize, update } from '../src/state/store';
import { addProduct } from '../src/state/products';
import { emptyShop } from '../src/state/defaults';
import { computePlan, runNumbers } from '../src/lib/plan';

describe('bows and other products', () => {
  beforeEach(() =>
    update(() => {
      const s = emptyShop();
      s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
      return s;
    }),
  );

  it('plans bows on their own mats, adds their steps and time, and finishes them into stock', () => {
    const pid = addProduct();
    const v = getShop().products.find(p => p.id === pid)!.variants[0];
    update(s => ({ ...s, products: s.products.map(p => ({ ...p, variants: p.variants.map(x => ({ ...x, price: 8 })) })) }));
    const f = addFabric({ name: 'Sage', yards: 6, cost: 7.5 });
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...getShop().runs[0].qty, M: 6 }, prod: { [v.id]: 10 } });
    const r = getShop().runs[0];
    const res = computePlan(getShop(), r);
    expect(res.cp.mats.some((m: any) => m.fab === 'bow')).toBe(true);
    expect(r.steps.some(s => s.name.startsWith('Bows: '))).toBe(true);
    expect(runNumbers(getShop(), r).worth).toBeCloseTo(6 * 18 + 10 * 8, 2);

    const bowsOnly = planRun({ body: f, ties: f, prod: { [v.id]: 12 } });
    const r2 = getShop().runs.find(x => x.id === bowsOnly)!;
    expect(r2.fabrics[0].role).toBe('Fabric');
    expect(r2.fabrics[0].need).toBeGreaterThan(0);

    finishRun(id);
    expect(stockBySize(getShop())[v.id]).toBe(10);
    expect(stockBySize(getShop()).M).toBe(6);
  });
});
