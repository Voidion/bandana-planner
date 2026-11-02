/* Example data to practise on: a few fabrics, three runs at different stages, two customers with an order and a
   sent quote, three sales, some finished stock and a market day. Everything it adds is remembered, so Remove takes
   exactly that back out and leaves anything you made yourself. */
import { addDays, todayDay } from '../lib/plan';
import { addCustomer, addOrder } from './selling';
import { addQuote, sendQuote } from './quotes';
import { addFabric, editRun, getShop, planRun, startRun, tickStep, update } from './store';
import type { Shop, Size } from './types';

type Coll = 'fabrics' | 'runs' | 'customers' | 'orders' | 'quotes' | 'sales' | 'cal';
const COLLS: Coll[] = ['fabrics', 'runs', 'customers', 'orders', 'quotes', 'sales', 'cal'];
export interface ExampleInfo {
  at: number;
  ids: Partial<Record<Coll, string[]>>;
  /** Activity entries from before it was loaded stay; ones after `at` from the example are removed */
  acts: number[];
  /** Sizes it had to fill in so runs could be planned (put back on Remove if still unchanged) */
  sizes: Record<string, { before: Partial<Size>; set: Partial<Size> }>;
}

const USUAL: Record<string, Partial<Size>> = { S: { cw: 10, cl: 7, price: 15, mins: 27 }, M: { cw: 11, cl: 8, price: 18, mins: 33 }, L: { cw: 14, cl: 9, price: 22, mins: 41 } };
const idsOf = (s: Shop, k: Coll) => new Set(((s as any)[k] || []).map((x: any) => x.id));

export const hasExample = (s: Shop) => !!(s as any).example;

export function loadExample() {
  const s0 = getShop();
  if ((s0 as any).example) return;
  const before = Object.fromEntries(COLLS.map(k => [k, idsOf(s0, k)])) as Record<Coll, Set<string>>;
  const at = Date.now();
  // Sizes: fill the usual Small, Medium and Large only where they're blank
  const sizes: ExampleInfo['sizes'] = {};
  update(s => {
    const z = { ...s.sizes };
    Object.entries(USUAL).forEach(([k, v]) => {
      if (!z[k]) return;
      const set = Object.fromEntries(Object.entries(v).filter(([f]) => (z[k] as any)[f] == null)) as Partial<Size>;
      if (Object.keys(set).length) {
        sizes[k] = { before: Object.fromEntries(Object.keys(set).map(f => [f, (z[k] as any)[f]])), set };
        z[k] = { ...z[k], ...set };
      }
    });
    return { ...s, sizes: z };
  });
  const day = todayDay();
  const h = addFabric({ name: 'Example: Harvest plaid flannel', yards: 4.2, cost: 9.5, color: '#B5562B' });
  const p = addFabric({ name: 'Example: Pumpkin spice print', yards: 3.5, cost: 8, color: '#E07B2E' });
  addFabric({ name: 'Example: Mustard corduroy', yards: 0.6, cost: 11, color: '#D9A42B', low: 1 } as any);
  addFabric({ name: 'Example: Holiday tartan', yards: 2, cost: 10, color: '#9E2B25' });
  const r1 = planRun({ name: 'Example: Harvest plaid — Shopify restock', body: h, ties: h, qty: { M: 16, L: 8 } as any });
  const r2 = planRun({ name: 'Example: Pumpkin spice — Market stall', body: p, ties: p, qty: { M: 12, L: 6 } as any });
  planRun({ name: 'Example: Holiday tartan', qty: { S: 4, M: 6 } as any });
  editRun(r1, { due: addDays(day, 9) });
  editRun(r2, { due: addDays(day, 5) });
  startRun(r2);
  const run2 = getShop().runs.find(r => r.id === r2);
  if (run2 && run2.steps[0]) tickStep(r2, run2.steps[0].id);
  const c1 = addCustomer({ name: 'Example: Riverside Pet Market', kind: 'Shop' } as any);
  const c2 = addCustomer({ name: 'Example: Maple’s owner', dogs: [{ id: 'exdog1', name: 'Maple', breed: 'Beagle', neck: 14 }] } as any);
  addOrder({ cust: c2, title: 'Maple’s custom set', src: 'Example', qty: { M: 3 }, due: addDays(day, 8) });
  const q = addQuote({ cust: c1, title: 'Fall restock', lines: [{ size: 'M', qty: 12, price: 18 } as any, { size: 'L', qty: 6, price: 22 } as any] });
  sendQuote(q);
  const base = { ship: 0, tax: 0, fees: 0, refund: 0, from: [], what: '' } as any;
  update(s => ({
    ...s,
    cal: [...s.cal, { id: 'exev1', day: addDays(day, 6), title: 'Example: Riverside farmers market', kind: 'market', days: 1, notes: '', time: '08:00', dur: 360 }],
    sales: [
      ...s.sales,
      { ...base, id: 'exs1', day: addDays(day, -3), ch: 'Market', ref: 'Example', items: { M: 6, L: 4 }, sub: 196, mat: 40, paid: 196, pays: [{ day: addDays(day, -3), amt: 196 }] },
      { ...base, id: 'exs2', day: addDays(day, -20), ch: 'Wholesale', ref: 'Example invoice', cust: c1, items: { M: 12, L: 6 }, sub: 270, mat: 80, paid: 0, pays: [], due: addDays(day, -6) },
      { ...base, id: 'exs3', day: addDays(day, -1), ch: 'Shopify', ref: 'Example #1001', items: { M: 1 }, sub: 20.44, mat: 4, fees: 0.9, paid: 20.44, pays: [{ day: addDays(day, -1), amt: 20.44 }] },
    ],
    stock: [...s.stock, { run: 'example', size: 'S', n: 4 }, { run: 'example', size: 'M', n: 9 }, { run: 'example', size: 'L', n: 5 }],
  }));
  update(s => {
    const ids = Object.fromEntries(COLLS.map(k => [k, ((s as any)[k] || []).map((x: any) => x.id).filter((id: string) => id && !before[k].has(id))])) as ExampleInfo['ids'];
    const acts = s.activity.filter(a => a.t >= at).map(a => a.t);
    return { ...s, example: { at, ids, acts, sizes } } as Shop;
  });
}

export function removeExample() {
  update(s => {
    const ex: ExampleInfo | undefined = (s as any).example;
    if (!ex) return s;
    const drop = (k: Coll) => {
      const set = new Set(ex.ids[k] || []);
      return ((s as any)[k] || []).filter((x: any) => !set.has(x.id));
    };
    const runIds = new Set(ex.ids.runs || []);
    const fabIds = new Set(ex.ids.fabrics || []);
    const actSet = new Set(ex.acts);
    const sizes = { ...s.sizes };
    Object.entries(ex.sizes || {}).forEach(([k, v]) => {
      if (!sizes[k]) return;
      const same = Object.entries(v.set).every(([f, val]) => (sizes[k] as any)[f] === val);
      if (same) sizes[k] = { ...sizes[k], ...v.before };
    });
    const next: any = {
      ...s,
      ...Object.fromEntries(COLLS.map(k => [k, drop(k)])),
      stock: s.stock.filter(x => x.run !== 'example' && !runIds.has(x.run)),
      photos: s.photos.map(ph => ({ ...ph, run: ph.run && runIds.has(ph.run) ? null : ph.run, fabric: ph.fabric && fabIds.has(ph.fabric) ? null : ph.fabric })),
      activity: s.activity.filter(a => !actSet.has(a.t)),
      timer: s.timer && runIds.has(s.timer.run) ? null : s.timer,
      sizes,
      example: null,
    };
    return next as Shop;
  });
}
