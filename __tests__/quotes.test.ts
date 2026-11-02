import { getShop, update } from '../src/state/store';
import { addCustomer } from '../src/state/selling';
import { acceptQuote, addQuote, editQuote, sendQuote } from '../src/state/quotes';
import { emptyShop } from '../src/state/defaults';
import { quoteTotals } from '../src/lib/plan';
import { quotePdf } from '../src/lib/quoteDoc';

describe('quotes', () => {
  beforeEach(() =>
    update(() => {
      const s = emptyShop();
      s.shopName = 'Pawsome Bandanas';
      s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
      s.sizes.L = { ...s.sizes.L, cw: 14, cl: 9, price: 22, mins: 41 };
      return s;
    }),
  );

  it('totals with a deal, locks prices when sent, and becomes an order at the quoted total', () => {
    const c = addCustomer({ name: 'Riverside Pet Market', kind: 'Shop' });
    const id = addQuote({ cust: c, title: 'Fall restock' });
    editQuote(id, { lines: [{ size: 'M', qty: 12, price: null }, { size: 'L', qty: 6, price: null }], deal: 'b2g1half', deposit: 25 });
    const q = getShop().quotes[0];
    expect(q.no).toBe('Q-1001');
    const t = quoteTotals(getShop(), q);
    expect(t.gross).toBe(12 * 18 + 6 * 22);
    expect(t.disc).toBe(6 * 18 * 0.5); // 18 items: 6 free halves at the cheapest price
    sendQuote(id);
    update(s => ({ ...s, sizes: { ...s.sizes, M: { ...s.sizes.M, price: 25 } } }));
    expect(quoteTotals(getShop(), getShop().quotes[0]).gross).toBe(12 * 18 + 6 * 22);
    const oid = acceptQuote(id)!;
    const o = getShop().orders.find(x => x.id === oid)!;
    expect(o.qty).toEqual({ M: 12, L: 6 });
    expect(o.price).toBe(t.total);
  });

  it('writes a valid PDF', () => {
    const id = addQuote({ title: 'Birthday set — “Biscuit”' });
    editQuote(id, { lines: [{ size: 'M', qty: 2, price: null }] });
    const pdf = quotePdf(getShop(), getShop().quotes[0]);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trim().endsWith('%%EOF')).toBe(true);
    expect(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(pdf)).toBe(true);
    const xref = +pdf.match(/startxref\n(\d+)/)![1];
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    require('fs').writeFileSync(require('os').tmpdir() + '/quote-test.pdf', pdf);
  });
});
