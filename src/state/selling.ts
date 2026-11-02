/* Selling: customers and their dogs, sales and payments, and orders (filled from stock or made in a run). */
import * as E from '../engine/engine';
import { addDays, itemName, rel, sync, todayDay } from '../lib/plan';
import { getShop, newId, planRun, round2, update, withLog } from './store';
import type { Channel, Customer, Dog, Order, Sale, Shop, StockLine } from './types';

/* ---------- customers ---------- */
export function addCustomer(p: Partial<Customer> = {}): string {
  const id = newId('c');
  update(s => ({
    ...s,
    customers: [...s.customers, { name: 'New customer', kind: 'Person', contact: '', email: '', phone: '', handle: '', dogs: [], notes: '', added: todayDay(), ...p, id } as Customer],
  }));
  return id;
}
export const editCustomer = (id: string, patch: Partial<Customer>) => update(s => ({ ...s, customers: s.customers.map(c => (c.id === id ? { ...c, ...patch } : c)) }));
export function deleteCustomer(id: string) {
  update(s => ({ ...s, customers: s.customers.filter(c => c.id !== id) }));
}
export function restoreCustomer(c: Customer, index: number) {
  update(s => {
    const list = s.customers.slice();
    list.splice(Math.min(index, list.length), 0, c);
    return { ...s, customers: list };
  });
}
export function addDog(cid: string): string {
  const id = newId('d');
  update(s => ({ ...s, customers: s.customers.map(c => (c.id === cid ? { ...c, dogs: [...c.dogs, { id, name: '', breed: '', neck: null, size: null, notes: '' }] } : c)) }));
  return id;
}
export const editDog = (cid: string, id: string, patch: Partial<Dog>) =>
  update(s => ({ ...s, customers: s.customers.map(c => (c.id === cid ? { ...c, dogs: c.dogs.map(d => (d.id === id ? { ...d, ...patch } : d)) } : c)) }));
export const deleteDog = (cid: string, id: string) => update(s => ({ ...s, customers: s.customers.map(c => (c.id === cid ? { ...c, dogs: c.dogs.filter(d => d.id !== id) } : c)) }));

/* ---------- stock that's free to sell ---------- */
/** Runs whose bandanas are promised to an order that hasn't gone out yet */
export const promisedRuns = (s: Shop) => new Set(s.orders.filter(o => o.status !== 'delivered' && o.run).map(o => o.run!));
export function freeStock(s: Shop): Record<string, number> {
  const pr = promisedRuns(s);
  const by: Record<string, number> = {};
  s.stock.forEach(x => {
    if (!pr.has(x.run)) by[x.size] = (by[x.size] || 0) + x.n;
  });
  return by;
}
/** Takes n of a size out of free stock, oldest first (counts added by hand first). Returns what it took, or null. */
function take(s: Shop, items: Record<string, number>): { stock: StockLine[]; took: StockLine[] } | null {
  const pr = promisedRuns(s);
  let stock = s.stock.map(x => ({ ...x }));
  const took: StockLine[] = [];
  for (const [size, n0] of Object.entries(items)) {
    let n = n0;
    const order = [...stock.filter(x => x.run === 'adj'), ...stock.filter(x => x.run !== 'adj')];
    for (const x of order) {
      if (!n) break;
      if (x.size !== size || pr.has(x.run) || x.n <= 0) continue;
      const t = Math.min(x.n, n);
      x.n -= t;
      n -= t;
      took.push({ run: x.run, size, n: t });
    }
    if (n > 0) return null;
  }
  stock = stock.filter(x => x.n > 0);
  return { stock, took };
}
function giveBack(stock: StockLine[], lines: StockLine[]) {
  const out = stock.map(x => ({ ...x }));
  lines.forEach(l => {
    const i = out.findIndex(x => x.run === l.run && x.size === l.size);
    if (i >= 0) out[i].n += l.n;
    else out.push({ ...l });
  });
  return out;
}

/* ---------- sales ---------- */
export interface SaleInput {
  ch: Channel;
  items: Record<string, number>;
  /** What they paid (or owe) for the goods */
  amount: number;
  cust?: string | null;
  day?: string;
  later?: boolean;
  dueIn?: number;
  ship?: number;
  /** Order supplies used (mailers…) */
  sup?: Record<string, number>;
  ref?: string;
  order?: string;
  /** Already taken from stock (an order's set-aside bandanas) */
  from?: StockLine[];
  what?: string;
}

/** Records a sale. Takes what sold out of finished stock. Returns its id, or null if there isn't enough in stock. */
export function recordSale(x: SaleInput): string | null {
  const id = newId('L');
  let ok = false;
  update(s => {
    const items = Object.fromEntries(Object.entries(x.items).filter(([, n]) => n > 0));
    let stock = s.stock;
    let took = x.from || [];
    if (!x.from) {
      const t = take(s, items);
      if (!t) return s;
      stock = t.stock;
      took = t.took;
    }
    ok = true;
    sync(s);
    const su = Object.entries(x.sup || {})
      .map(([sid, n]) => ({ y: s.supplies.find(q => q.id === sid)!, n }))
      .filter(u => u.y && u.n > 0);
    const suCost = su.reduce((a, u) => a + (u.y.cost || 0) * u.n, 0);
    const day = x.day || todayDay();
    const amount = Math.max(0, round2(x.amount));
    const runId = took.find(l => l.run !== 'adj')?.run;
    const r = runId ? s.runs.find(q => q.id === runId) : undefined;
    const sale: Sale = {
      id,
      day,
      ch: x.ch,
      ref: x.ref || '',
      cust: x.cust || undefined,
      run: runId,
      order: x.order,
      what: x.what || (r ? (r.name || 'Run').split(' — ')[0] : 'Sale'),
      items,
      sub: amount,
      ship: round2(x.ship || 0),
      tax: 0,
      fees: E.feeFor(x.ch, amount + (x.ship || 0)),
      mat: round2(E.matFor(items) + suCost),
      refund: 0,
      paid: x.later ? 0 : round2(amount + (x.ship || 0)),
      pays: x.later ? [] : [{ day, amt: round2(amount + (x.ship || 0)) }],
      due: x.later ? addDays(day, x.dueIn || 14) : undefined,
      from: took,
      sup: su.map(u => ({ id: u.y.id, name: u.y.name, n: u.n })),
    };
    const take2 = Object.fromEntries(su.map(u => [u.y.id, u.n]));
    return withLog(
      { ...s, stock, sales: [...s.sales, sale], supplies: s.supplies.map(q => (take2[q.id] ? { ...q, qty: Math.max(0, round2(q.qty - take2[q.id])) } : q)) },
      `recorded a $${amount.toFixed(2)} sale`,
      x.ch,
    );
  });
  return ok ? id : null;
}

/** Removes a sale and puts its bandanas and supplies back. */
export function undoSale(id: string) {
  update(s => {
    const e = s.sales.find(q => q.id === id);
    if (!e) return s;
    const give = Object.fromEntries((e.sup || []).map(u => [u.id, u.n]));
    const fromOrder = e.order ? s.orders.find(o => o.id === e.order) : undefined;
    return {
      ...s,
      sales: s.sales.filter(q => q.id !== id),
      stock: fromOrder ? s.stock : giveBack(s.stock, e.from),
      supplies: s.supplies.map(q => (give[q.id] ? { ...q, qty: round2(q.qty + give[q.id]) } : q)),
      orders: s.orders.map(o => (o.id === e.order ? { ...o, status: 'new', deliveredAt: null } : o)),
    };
  });
}

export function recordPayment(id: string, amt: number, day = todayDay()) {
  update(s => ({
    ...s,
    sales: s.sales.map(e => (e.id === id ? { ...e, paid: round2(e.paid + amt), pays: [...e.pays, { day, amt: round2(amt) }] } : e)),
  }));
}
export function refundSale(id: string, amt: number) {
  update(s => ({ ...s, sales: s.sales.map(e => (e.id === id ? { ...e, refund: round2(amt) } : e)) }));
}

export const saleTotal = (e: Sale) => round2(e.sub + (e.ship || 0) + (e.tax || 0) - (e.refund || 0));
export const saleOwed = (e: Sale) => Math.max(0, round2(saleTotal(e) - (e.paid || 0)));
export const saleProfit = (e: Sale) => round2(e.sub - (e.refund || 0) - (e.fees || 0) - (e.mat || 0));
export const isLate = (e: Sale) => saleOwed(e) > 0 && !!e.due && (rel(e.due) ?? 0) < 0;

/* ---------- orders ---------- */
export function addOrder(p: Partial<Order> = {}): string {
  const id = newId('o');
  update(s => ({
    ...s,
    orders: [{ cust: null, title: '', src: '', qty: {}, due: null, fab: null, run: null, fromStock: [], status: 'new', deliveredAt: null, price: null, notes: '', ...p, id } as Order, ...s.orders],
  }));
  return id;
}
export const editOrder = (id: string, patch: Partial<Order>) => update(s => ({ ...s, orders: s.orders.map(o => (o.id === id ? { ...o, ...patch } : o)) }));
export function deleteOrder(id: string) {
  update(s => {
    const o = s.orders.find(q => q.id === id);
    return { ...s, orders: s.orders.filter(q => q.id !== id), stock: o && o.status !== 'delivered' ? giveBack(s.stock, o.fromStock) : s.stock };
  });
}
export function restoreOrder(o: Order, index: number) {
  update(s => {
    const list = s.orders.slice();
    list.splice(Math.min(index, list.length), 0, o);
    if (o.status === 'delivered' || !o.fromStock.length) return { ...s, orders: list };
    const stock = s.stock.map(x => ({ ...x }));
    o.fromStock.forEach(l => {
      const x = stock.find(y => y.run === l.run && y.size === l.size);
      if (x) x.n -= l.n;
    });
    return { ...s, orders: list, stock: stock.filter(x => x.n > 0) };
  });
}

export type OrderStage = 'plan' | 'making' | 'ready' | 'delivered';
export function orderStage(s: Shop, o: Order): OrderStage {
  if (o.status === 'delivered') return 'delivered';
  if (o.fromStock.length) return 'ready';
  const r = o.run ? s.runs.find(x => x.id === o.run) : null;
  if (r) return r.status === 'done' ? 'ready' : 'making';
  return 'plan';
}
export const orderCount = (o: Order) => Object.values(o.qty).reduce((a, b) => a + (b || 0), 0);
export const orderWorth = (s: Shop, o: Order) =>
  o.price ?? round2(Object.entries(o.qty).reduce((a, [k, n]) => a + n * ((s.sizes[k]?.price ?? s.products.flatMap(p => p.variants).find(v => v.id === k)?.price) || 0), 0));
export const orderLabel = (s: Shop, o: Order) =>
  Object.entries(o.qty)
    .filter(([, n]) => n)
    .map(([k, n]) => `${n} ${itemName(s, k)}`)
    .join(' · ');

/** Can it be filled from what's in stock right now? */
export function canFill(s: Shop, o: Order) {
  const free = freeStock(s);
  return orderCount(o) > 0 && Object.entries(o.qty).every(([k, n]) => !n || (free[k] || 0) >= n);
}

/** Set bandanas aside from stock for the order, so they aren't sold at a market. */
export function fillFromStock(id: string): boolean {
  let ok = false;
  update(s => {
    const o = s.orders.find(q => q.id === id);
    if (!o) return s;
    const t = take(s, o.qty);
    if (!t) return s;
    ok = true;
    return withLog({ ...s, stock: t.stock, orders: s.orders.map(q => (q.id === id ? { ...q, fromStock: t.took } : q)) }, 'filled an order from stock', orderLabel(s, o));
  });
  return ok;
}
export function unfill(id: string) {
  update(s => {
    const o = s.orders.find(q => q.id === id);
    if (!o) return s;
    return { ...s, stock: giveBack(s.stock, o.fromStock), orders: s.orders.map(q => (q.id === id ? { ...q, fromStock: [] } : q)) };
  });
}

/** Plan a run that makes this order. */
export function planOrder(id: string): string | null {
  const s0 = getShop();
  const o = s0.orders.find(q => q.id === id);
  if (!o) return null;
  const c = s0.customers.find(x => x.id === o.cust);
  const sizes: Record<string, number> = {};
  const prod: Record<string, number> = {};
  Object.entries(o.qty).forEach(([k, n]) => (s0.sizes[k] ? (sizes[k] = n) : (prod[k] = n)));
  const fab = o.fab || undefined;
  const rid = planRun({ name: `${o.title || (c ? c.name : 'Order')} — order`, qty: sizes, prod, ...(fab ? { body: fab, ties: fab } : {}), due: o.due });
  update(s => ({ ...s, orders: s.orders.map(q => (q.id === id ? { ...q, run: rid } : q)) }));
  return rid;
}

/** It went out: records the sale (paid now, or owed by a date). */
export function deliverOrder(id: string, opts: { later?: boolean; dueIn?: number; amount?: number; ship?: number; ch?: Channel; sup?: Record<string, number> } = {}): string | null {
  const s = getShop();
  const o = s.orders.find(q => q.id === id);
  if (!o) return null;
  let from = o.fromStock;
  if (!from.length && o.run) {
    // take the order's bandanas out of its run's stock
    const lines: StockLine[] = [];
    const stock = s.stock.map(x => ({ ...x }));
    for (const [size, n0] of Object.entries(o.qty)) {
      let n = n0;
      for (const x of stock) {
        if (!n) break;
        if (x.run !== o.run || x.size !== size || x.n <= 0) continue;
        const t = Math.min(x.n, n);
        x.n -= t;
        n -= t;
        lines.push({ run: x.run, size, n: t });
      }
    }
    update(q => ({ ...q, stock: stock.filter(x => x.n > 0) }));
    from = lines;
  }
  const c = s.customers.find(x => x.id === o.cust);
  const sid = recordSale({
    ch: opts.ch || (c && c.kind === 'Shopify' ? 'Shopify' : c && (c.kind === 'Shop' || c.kind === 'Consignment') ? 'Wholesale' : 'Direct'),
    items: o.qty,
    amount: opts.amount ?? orderWorth(s, o),
    cust: o.cust,
    later: opts.later,
    dueIn: opts.dueIn,
    ship: opts.ship,
    sup: opts.sup,
    order: id,
    from,
    ref: o.src,
    what: o.title || 'Order',
  });
  update(q => ({ ...q, orders: q.orders.map(x => (x.id === id ? { ...x, status: 'delivered', deliveredAt: todayDay(), fromStock: from } : x)) }));
  return sid;
}
