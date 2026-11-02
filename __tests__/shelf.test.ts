import { addFabric, cutRun, editRun, finishRun, getShop, planRun, update } from '../src/state/store';
import { addOffcut, addSupplier, addSupply, arrived, markOrdered, restockList, weeklyUse } from '../src/state/shelf';
import { emptyShop, migrate } from '../src/state/defaults';

describe('the rest of the shelf', () => {
  beforeEach(() =>
    update(() => {
      const s = emptyShop();
      s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
      return s;
    }),
  );

  it('logs fabric use, forecasts it, and lists low items for restock until they are ordered and arrive', () => {
    const sp = addSupplier({ name: 'Harbor Fabrics', lead: 7 });
    const f = addFabric({ name: 'Rust', yards: 3, low: 1, cost: 7.5 });
    update(s => ({ ...s, fabrics: s.fabrics.map(x => ({ ...x, sup: sp })) }));
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...getShop().runs[0].qty, M: 24 } });
    const need = getShop().runs[0].fabrics[0].need;
    cutRun(id, [need]);
    expect(getShop().usage).toHaveLength(1);
    expect(weeklyUse(getShop(), f)).toBeCloseTo(need, 2);
    expect(restockList(getShop()).map(i => i.x.id)).toContain(f);
    markOrdered('fabric', f, 5);
    expect(getShop().fabrics[0].onOrder).toBe(5);
    arrived('fabric', f, 5.2, 8);
    expect(getShop().fabrics[0].yards).toBeCloseTo(3 - need + 5.2, 2);
    expect(getShop().fabrics[0].cost).toBe(8);
  });

  it('takes per-bandana supplies when a run finishes', () => {
    const tag = addSupply({ name: 'Care tags', unit: 'tags', qty: 50, low: 10, cost: 0.09, use: 'bandana', per: 1 });
    const f = addFabric({ name: 'Sage', yards: 6 });
    const id = planRun({ body: f, ties: f });
    editRun(id, { qty: { ...getShop().runs[0].qty, M: 12 } });
    finishRun(id);
    expect(getShop().supplies.find(x => x.id === tag)!.qty).toBe(38);
    expect(getShop().runs[0].supUse![0].n).toBe(12);
  });

  it('keeps offcuts as their own fabric', () => {
    const f = addFabric({ name: 'Plaid', yards: 4, cost: 9 });
    addOffcut(f, 0.5, true);
    const [bolt, off] = getShop().fabrics;
    expect(bolt.yards).toBeCloseTo(3.5, 2);
    expect(off.offcut).toBe(true);
    expect(off.from).toBe('Plaid');
    expect(off.cost).toBe(9);
    expect(restockList(getShop()).some(i => i.x.id === off.id)).toBe(false);
  });

  it('turns "where you buy it" from the first version into suppliers', () => {
    const s = migrate({ fabrics: [{ id: 'a', name: 'A', yards: 2, supplier: 'Maple & Spool' }, { id: 'b', name: 'B', yards: 2, supplier: 'maple & spool' }] });
    expect(s.suppliers).toHaveLength(1);
    expect(s.fabrics.every(f => f.sup === s.suppliers[0].id)).toBe(true);
  });
});
