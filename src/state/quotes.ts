/* Quotes: draft, send (prices lock), accept (becomes an order) or decline. */
import { addDays, quoteTotals, todayDay } from '../lib/plan';
import { addOrder } from './selling';
import { getShop, newId, update, withLog } from './store';
import type { Quote, Shop } from './types';

export const nextQuoteNo = (s: Shop) => 'Q-' + (Math.max(1000, ...s.quotes.map(q => parseInt(String(q.no || '').slice(2)) || 0)) + 1);

export function addQuote(p: Partial<Quote> = {}): string {
  const id = newId('q');
  update(s => {
    const q: Quote = {
      no: nextQuoteNo(s),
      cust: null,
      title: '',
      status: 'draft',
      made: todayDay(),
      sent: null,
      acc: null,
      until: addDays(todayDay(), s.cfg.quote.holdDays || 30),
      lines: [],
      deal: 'none',
      deposit: 0,
      pickup: false,
      notes: '',
      order: null,
      ...p,
      id,
    };
    return { ...s, quotes: [q, ...s.quotes] };
  });
  return id;
}

export const editQuote = (id: string, patch: Partial<Quote>) => update(s => ({ ...s, quotes: s.quotes.map(q => (q.id === id ? { ...q, ...patch } : q)) }));

export function deleteQuote(id: string) {
  update(s => ({ ...s, quotes: s.quotes.filter(q => q.id !== id) }));
}
export function restoreQuote(q: Quote, index: number) {
  update(s => {
    const list = s.quotes.slice();
    list.splice(Math.min(index, list.length), 0, q);
    return { ...s, quotes: list };
  });
}

const priceOf = (s: Shop, k: string) => s.sizes[k]?.price ?? s.products.flatMap(p => p.variants).find(v => v.id === k)?.price ?? 0;

/** Sending locks each line's price, so a later price change doesn't change the quote. */
export function sendQuote(id: string) {
  update(s => {
    const q = s.quotes.find(x => x.id === id);
    if (!q) return s;
    const lines = q.lines.map(l => ({ ...l, price: l.price ?? priceOf(s, l.size) }));
    return withLog({ ...s, quotes: s.quotes.map(x => (x.id === id ? { ...x, status: 'sent', sent: todayDay(), lines } : x)) }, 'sent a quote', q.no);
  });
}
export function unsendQuote(id: string) {
  editQuote(id, { status: 'draft', sent: null });
}
export function declineQuote(id: string) {
  editQuote(id, { status: 'declined' });
}

/** Accepted: it becomes an order with the quote's lines and total. */
export function acceptQuote(id: string): string | null {
  const s = getShop();
  const q = s.quotes.find(x => x.id === id);
  if (!q) return null;
  const qty: Record<string, number> = {};
  q.lines.forEach(l => (qty[l.size] = (qty[l.size] || 0) + l.qty));
  const lines = q.lines.map(l => ({ ...l, price: l.price ?? priceOf(s, l.size) }));
  const total = quoteTotals(s, { ...q, lines }).total;
  const oid = addOrder({ cust: q.cust, title: q.title, src: 'From quote ' + q.no, qty, quote: q.id, price: Math.round(total * 100) / 100 });
  update(x => withLog({ ...x, quotes: x.quotes.map(y => (y.id === id ? { ...y, status: 'accepted', acc: todayDay(), lines, order: oid } : y)) }, 'quote accepted', q.no));
  return oid;
}
