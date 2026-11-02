/* The app's view of the shared engine (cut plans, time, money). The engine is the prototype's own code, so every number
   matches it. It reads one shop object; dates are turned into the prototype's "days from today" here. */
import * as E from '../engine/engine';
import type { Fabric, Run, Shop, Step } from '../state/types';

let lastShop: Shop | null = null;
let lastDay = '';

export const todayDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Days from today: tomorrow is 1, yesterday is -1 */
export function rel(day: string | null | undefined): number | null {
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  const n = new Date();
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((a - b) / 864e5);
}
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** Point the engine at this shop. Cheap to call: it only rebuilds when the shop or the day changes. */
export function sync(shop: Shop) {
  const day = todayDay();
  if (shop === lastShop && day === lastDay) return;
  lastShop = shop;
  lastDay = day;
  E.setToday(new Date());
  E.setEngineState({
    ...shop,
    runs: shop.runs.map(r => ({ ...r, due: rel(r.due), prod: r.prod || {} })),
    sessions: shop.sessions.map(s => ({ ...s, day: rel(s.day) ?? 0 })),
    ledger: [],
  });
}

export const MATS = E.VENTURE_MATS as { id: string; name: string; mw: number; ml: number; w: number; l: number; sub: string }[];

export function sizeReady(shop: Shop, k: string) {
  const z = shop.sizes[k];
  return !!z && !!z.cw && !!z.cl && z.cw > 0 && z.cl > 0;
}

export function planCount(p: { qty: Record<string, number> }) {
  return Object.values(p.qty || {}).reduce((a, b) => a + (b || 0), 0);
}

export interface PlanResult {
  cp: any;
  count: number;
  /** Yards per fabric this run needs (bodies, straps, or both when the same fabric) */
  needs: { f: Fabric | null; role: string; yards: number; short: number; learned?: number }[];
  missingSizes: string[];
  tooBig: number;
}

/** Lays the run out on mats and works out the fabric it needs from the shelf. */
export function computePlan(shop: Shop, run: Pick<Run, 'qty' | 'body' | 'ties'> & { prod?: Record<string, number> }): PlanResult {
  sync(shop);
  const qty: Record<string, number> = {};
  const missing: string[] = [];
  Object.entries(run.qty || {}).forEach(([k, n]) => {
    if (!n) return;
    if (sizeReady(shop, k)) qty[k] = n;
    else missing.push(k);
  });
  const prod: Record<string, number> = {};
  Object.entries(run.prod || {}).forEach(([k, n]) => {
    if (n && shop.products.some(p => p.variants.some(v => v.id === k && v.w > 0 && v.l > 0))) prod[k] = n;
  });
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const others = Object.values(prod).reduce((a, b) => a + b, 0);
  if (!count && !others) return { cp: null, count: 0, needs: [], missingSizes: missing, tooBig: 0 };
  const body = shop.fabrics.find(f => f.id === run.body) || null;
  const ties = shop.fabrics.find(f => f.id === run.ties) || null;
  const cp = E.cutPlan(qty, { body, strap: ties, prod });
  const n = E.planNeeds(qty, run.body, run.ties, prod);

  const needs: PlanResult['needs'] = [];
  const add = (f: Fabric | null, role: string, yards: number) =>
    needs.push({ f, role, yards, short: f ? Math.max(0, Math.round((yards - f.yards) * 100) / 100) : 0, learned: n.learned });
  if (!count) add(body, 'Fabric', n.body);
  else if (n.same) add(body, 'Body and straps', n.body);
  else {
    add(body, 'Body', n.body);
    add(ties, 'Straps', n.ties);
  }
  return { cp, count, needs, missingSizes: missing, tooBig: cp.tooBig || 0 };
}

export function pieceShapes(p: any): { s: string; pts: [number, number][] }[] {
  return E.pieceShapes(p);
}

/** One SVG per mat for Cricut Design Space, sized in inches. */
export function cutFiles(shop: Shop, run: { name: string }, cp: any): { name: string; svg: string }[] {
  sync(shop);
  const base = (run.name || 'cut-plan').replace(/[\\/:*?"<>|]+/g, '').trim() || 'cut-plan';
  return cp.mats.map((m: any, i: number) => ({
    name: `${base} - mat ${i + 1} of ${cp.mats.length} (${m.fab === 'strap' ? 'straps' : 'bandanas'}).svg`,
    svg: E.exportSvg(cp, { name: run.name || 'Cut plan' }, i),
  }));
}

export function matWaste(m: any) {
  return m.area ? Math.max(0, 1 - m.pieceArea / m.area) : 0;
}

/* ---------- runs: time and money, straight from the engine ---------- */
const engineRun = (r: Run) => ({ ...r, due: rel(r.due), prod: r.prod || {} });

export interface RunNumbers {
  pieces: number;
  worth: number;
  materials: number;
  workMins: number;
  leftMins: number;
  profit: number;
  perHour: number;
  fabricCost: number;
  done: number;
}

export function runNumbers(shop: Shop, r: Run): RunNumbers {
  sync(shop);
  const x = engineRun(r);
  return {
    pieces: E.pieces(x),
    worth: E.atList(x),
    materials: E.mats(x),
    workMins: E.runMins(x),
    leftMins: E.leftMins(x),
    profit: E.runProfit(x),
    perHour: E.rate(x),
    fabricCost: E.fabCostOf(x),
    done: E.doneN(x),
  };
}

let stepSeq = 0;
/** Fresh steps for a run from its template, sized to how many bandanas (bigger sizes take longer). */
export function stepsForRun(shop: Shop, tpl: string, qty: Record<string, number>, prod?: Record<string, number>): Step[] {
  sync(shop);
  const any = Object.values(qty).some(n => n > 0) || Object.values(prod || {}).some(n => n > 0);
  const list = any ? E.runSteps(tpl, qty, prod || {}) : E.stepsFor(tpl, { M: 1 });
  return list.map((s: any) => ({ id: 'st' + Date.now().toString(36) + (stepSeq++).toString(36), name: s.name, est: any ? s.est : 0, source: 'template', done: false }));
}

/** Name of a size or product style */
export function itemName(shop: Shop, k: string) {
  if (shop.sizes[k]) return shop.sizes[k].name;
  for (const p of shop.products) {
    const v = p.variants.find(x => x.id === k);
    if (v) return v.name;
  }
  return k;
}
export function itemPrice(shop: Shop, k: string) {
  if (shop.sizes[k]) return shop.sizes[k].price;
  for (const p of shop.products) {
    const v = p.variants.find(x => x.id === k);
    if (v) return v.price;
  }
  return null;
}

export function tplMinsFor(shop: Shop, tpl: string, qty: Record<string, number>) {
  sync(shop);
  return E.tplMins(tpl, qty);
}

export function tplPerBandana(t: { steps: { r: number }[] }) {
  return t.steps.reduce((a, s) => a + (+s.r || 0), 0);
}

/** Your median minutes per bandana for each step name, from timed steps */
export function pace(shop: Shop): Record<string, number | null> {
  sync(shop);
  return E.paceStats().stepMed;
}

export function timerMs(t: { start: number; acc: number; paused: boolean } | null) {
  return t ? (t.acc || 0) + (t.paused ? 0 : Date.now() - t.start) : 0;
}

export const isCutStep = (name: string) => /cut day/i.test(name);
export const isSewStep = (name: string) => E.isSewStep(name);

/** Suggested price per size for your profit target (same maths as the prototype's Pricing) */
export function suggestedPrice(shop: Shop, k: string) {
  sync(shop);
  return E.priceFor(k, shop.cfg.margin);
}
export function unitMinutes(shop: Shop, k: string) {
  sync(shop);
  return E.unitMins(k);
}
export function unitMaterials(shop: Shop, k: string) {
  sync(shop);
  return E.unitMat(k);
}
