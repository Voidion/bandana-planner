import { addFabric, adjustStock, editRun, finishRun, getShop, update } from '../src/state/store';
import { addCustomer, addOrder, canFill, deliverOrder, fillFromStock, freeStock, orderStage, planOrder, recordPayment, recordSale, saleOwed, undoSale } from '../src/state/selling';
import { emptyShop } from '../src/state/defaults';

describe('selling', () => {
  beforeEach(() =>
    update(() => {
      const s = emptyShop();
      s.sizes.S = { ...s.sizes.S, cw: 10, cl: 7, price: 15, mins: 27 };
      s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
      s.sizes.L = { ...s.sizes.L, cw: 14, cl: 9, price: 22, mins: 41 };
      return s;
    }),
  );

  it('records a sale from stock with fees and materials, pay later, then a payment; undo puts stock back', () => {
    adjustStock('M', 5);
    const id = recordSale({ ch: 'Direct', items: { M: 2 }, amount: 34, later: true, dueIn: 14 })!;
    const e = getShop().sales[0];
    expect(freeStock(getShop()).M).toBe(3);
    expect(e.fees).toBeCloseTo(34 * 0.029 + 0.3, 2);
    expect(saleOwed(e)).toBe(34);
    recordPayment(id, 20);
    expect(saleOwed(getShop().sales[0])).toBe(14);
    expect(recordSale({ ch: 'Market', items: { M: 9 }, amount: 1 })).toBeNull();
    undoSale(id);
    expect(freeStock(getShop()).M).toBe(5);
  });

  it('fills an order from stock, or plans a run for it; delivering records the sale', () => {
    adjustStock('S', 3);
    const c = addCustomer({ name: 'Riverside Pet Market', kind: 'Shop' });
    const o1 = addOrder({ cust: c, qty: { S: 2 } });
    expect(canFill(getShop(), getShop().orders[0])).toBe(true);
    fillFromStock(o1);
    expect(orderStage(getShop(), getShop().orders.find(o => o.id === o1)!)).toBe('ready');
    expect(freeStock(getShop()).S).toBe(1);
    deliverOrder(o1);
    expect(getShop().sales[0].ch).toBe('Wholesale');
    expect(getShop().sales[0].sub).toBe(30);

    const f = addFabric({ name: 'Sage', yards: 9 });
    const o2 = addOrder({ cust: c, qty: { M: 6, L: 2 }, fab: f });
    const rid = planOrder(o2)!;
    expect(orderStage(getShop(), getShop().orders.find(o => o.id === o2)!)).toBe('making');
    finishRun(rid);
    expect(freeStock(getShop()).M || 0).toBe(0);
    expect(orderStage(getShop(), getShop().orders.find(o => o.id === o2)!)).toBe('ready');
    deliverOrder(o2, { later: true });
    expect(getShop().stock.filter(x => x.run === rid)).toHaveLength(0);
    expect(saleOwed(getShop().sales[1])).toBe(6 * 18 + 2 * 22);
  });

});
