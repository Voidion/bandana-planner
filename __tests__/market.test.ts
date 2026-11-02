import { adjustStock, getShop, update } from '../src/state/store';
import { closeMarket, freeStock, importShopify, saleProfit, startMarket, tap } from '../src/state/selling';
import { guessItem, parseShopifyOrders } from '../src/lib/shopify';
import { emptyShop } from '../src/state/defaults';

describe('market day and Shopify', () => {
  beforeEach(() =>
    update(() => {
      const s = emptyShop();
      s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
      s.sizes.L = { ...s.sizes.L, cw: 14, cl: 9, price: 22, mins: 41 };
      return s;
    }),
  );

  it('taps sales through the day and closes into one Market sale with card fees and the booth fee', () => {
    adjustStock('M', 10);
    startMarket({ name: 'Riverside', booth: 40, goal: 30 });
    tap('M', 18);
    tap('M', 18);
    update(s => ({ ...s, market: { ...s.market, pay: 'Cash' } }));
    tap('M', 15);
    closeMarket();
    const e = getShop().sales[0];
    expect(e.sub).toBe(51);
    expect(e.fees).toBeCloseTo(36 * 0.029 + 2 * 0.3, 2);
    expect(e.costs).toBe(40);
    expect(saleProfit(e)).toBeLessThan(51 - 40);
    expect(freeStock(getShop()).M).toBe(7);
    expect(getShop().market.open).toBe(false);
  });

  it('imports a Shopify export: unfulfilled become orders, fulfilled become past sales, nothing twice', () => {
    const csv = [
      'Name,Email,Financial Status,Paid at,Fulfillment Status,Fulfilled at,Accepts Marketing,Currency,Subtotal,Shipping,Taxes,Total,Discount Code,Discount Amount,Shipping Method,Created at,Lineitem quantity,Lineitem name,Lineitem price,Billing Name',
      '#1042,kara@example.com,paid,2026-10-30 10:00:00 -0400,unfulfilled,,no,USD,40.00,4.50,0,44.50,,0,,2026-10-30 09:58:00 -0400,1,"Harvest Plaid Bandana - Medium",18.00,Kara Mills',
      '#1042,,,,,,,,,,,,,,,,1,"Harvest Plaid Bandana - Large",22.00,',
      '#1041,dana@example.com,paid,2026-10-20,fulfilled,2026-10-22,no,USD,36.00,0,0,36.00,,0,,2026-10-20 08:00:00 -0400,2,"Sage Gingham Bandana - Medium",18.00,Dana W',
    ].join('\n');
    const r = parseShopifyOrders(csv);
    expect(r.orders).toHaveLength(2);
    expect(r.orders[0].lines).toHaveLength(2);
    const items = [{ k: 'M', name: 'Medium' }, { k: 'L', name: 'Large' }];
    const map: Record<string, string | null> = {};
    r.orders.forEach(o => o.lines.forEach(l => (map[l.name] = guessItem(l.name, items))));
    expect(map['Harvest Plaid Bandana - Large']).toBe('L');
    const res = importShopify(r.orders, map);
    expect(res).toEqual({ orders: 1, sales: 1, skipped: 0 });
    expect(getShop().orders[0].qty).toEqual({ M: 1, L: 1 });
    expect(getShop().sales[0].day).toBe('2026-10-20');
    expect(getShop().customers).toHaveLength(2);
    expect(importShopify(r.orders, map)).toEqual({ orders: 0, sales: 0, skipped: 2 });
  });
});
