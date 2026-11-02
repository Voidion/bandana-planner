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
    ledger: shop.sales.map(e => ({ ...e, d: rel(e.day) ?? 0, pays: e.pays.map(p => ({ ...p, d: rel(p.day) ?? 0 })), due: e.due ? rel(e.due) : undefined })),
    quotes: [],
    events: [],
    cal: shop.cal.map(e => ({ ...e, d: rel(e.day) ?? 0, allDay: true, off: e.kind === 'market' || e.kind === 'off' })),
    cfg: { ...shop.cfg, shopName: shop.shopName },
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

/** Quote totals: lines, deal discount, shipping, fees and what you keep (the prototype's qtotals) */
export function quoteTotals(shop: Shop, q: any) {
  sync(shop);
  return E.qtotals(q);
}

/** Fits the runs on the bench into your free hours, earliest due first (the prototype's schedule). */
export function schedule(shop: Shop, days = 56) {
  sync(shop);
  const sc = E.scheduleWork(days);
  return { ...sc, late: E.lateRuns(sc).map((r: any) => r.id as string) };
}
export function reportRows(shop: Shop, list: any[], key: 'size' | 'ch' | 'fabric') {
  sync(shop);
  return E.repAgg(list, key === 'fabric' ? 'fname' : key);
}

/** The run's Shopify listing: title, description and tags (written from the run unless you've edited them) */
export function listingFor(shop: Shop, r: Run): { title: string; desc: string; tags: string } {
  sync(shop);
  return E.listingOf(engineRun(r));
}
export function listingStockFor(shop: Shop, r: Run): Record<string, number> {
  sync(shop);
  return E.listingStock(engineRun(r));
}
export function listingCsv(shop: Shop, r: Run): { name: string; csv: string } {
  sync(shop);
  const l = E.listingOf(engineRun(r));
  return { name: `shopify-product-${E.slug(l.title)}.csv`, csv: E.shopifyProductCSV(engineRun(r)) };
}
export function listingPlainText(shop: Shop, r: Run): string {
  sync(shop);
  return E.listingText(engineRun(r));
}

/* ---------- strip width ---------- */
export const CUT_MIN_W = 6;
/** Strip widths that divide the bolt exactly (quarter inches, within the mat) */
export function cutExact(shop: Shop) {
  const c = shop.cfg.cut;
  const vm = MATS.find(m => m.id === c.mat) || MATS[1];
  const mx = Math.min(vm.mw, c.bolt);
  const out: number[] = [];
  for (let n = 1; n <= 12; n++) {
    const w = c.bolt / n;
    if (w >= CUT_MIN_W && w <= mx + 1e-9 && Math.abs(w * 4 - Math.round(w * 4)) < 1e-6) out.push(Math.round(w * 100) / 100);
  }
  return out.sort((a, b) => a - b);
}
/** What's left to cut (or a usual 12 Medium + 6 Large run when nothing is), with each run's own fabric */
export function wasteJobs(shop: Shop) {
  const jobs = shop.runs.filter(r => r.status !== 'done' && !r.cut && Object.values(r.qty || {}).some(Boolean));
  const ready = (q: Record<string, number>) => {
    const o: Record<string, number> = {};
    Object.entries(q || {}).forEach(([k, n]) => { if (n && sizeReady(shop, k)) o[k] = n; });
    return o;
  };
  return jobs.length
    ? jobs.map(r => ({ run: r, qty: ready(r.qty), body: shop.fabrics.find(f => f.id === r.body) || null, strap: shop.fabrics.find(f => f.id === r.ties) || null, prod: r.prod || {} }))
    : [{ run: null, qty: ready({ M: 12, L: 6 }), body: null, strap: null, prod: {} }];
}
/** Runs a function with the engine set to another strip width, then puts the shop back */
function atWidth<T>(shop: Shop, w: number, fn: () => T): T {
  const was = lastShop;
  try {
    sync({ ...shop, cfg: { ...shop.cfg, cut: { ...shop.cfg.cut, width: w } } });
    return fn();
  } finally {
    lastShop = null;
    sync(was || shop);
  }
}
function wasteAt(shop: Shop, list: ReturnType<typeof wasteJobs>, fast: boolean) {
  let fabA = 0, pc = 0, mats = 0, lost = 0, re = 0;
  for (const j of list) {
    if (!Object.keys(j.qty).length) continue;
    const p = E.cutPlan(j.qty, { body: j.body, strap: j.strap, prod: j.prod, fast });
    fabA += (p.cutArea || 0) + (p.sideArea || 0);
    pc += p.pieceArea || 0;
    re += p.reuse || 0;
    mats += (p.mats || []).length;
    lost += p.tooBig || 0;
  }
  return { fabA, pc, re, mats, lost };
}
/** Waste at every half inch the mat allows, for what's left to cut (the prototype's colour strip under the slider) */
let heatMemo: { key: string; v: { pts: { w: number; waste: number; lost: number }[]; best: { w: number; waste: number } | null; mx: number } } | null = null;
export function wasteHeat(shop: Shop) {
  const c = shop.cfg.cut;
  const vm = MATS.find(m => m.id === c.mat) || MATS[1];
  const mx = Math.min(vm.mw, c.bolt);
  const list = wasteJobs(shop);
  const key = JSON.stringify([c.bolt, c.matLen, c.mat, c.gap, c.strapTurn, c.useScraps, c.minScrap, mx, shop.sizes, shop.straps.map(x => [x.id, x.w, x.l, x.file && x.file.name]), list.map(j => [j.qty, j.prod, j.body && [j.body.id, j.body.way], j.strap && j.strap.id])]);
  if (heatMemo && heatMemo.key === key) return heatMemo.v;
  const pts: { w: number; waste: number; lost: number }[] = [];
  for (let w = CUT_MIN_W; w <= mx + 1e-9; w += 0.5) {
    const r = atWidth(shop, w, () => wasteAt(shop, list, true));
    pts.push({ w, waste: r.fabA ? 1 - (r.pc + r.re) / r.fabA : 1, lost: r.lost });
  }
  const ok = pts.filter(p => !p.lost);
  const best = ok.length ? ok.reduce((a, b) => (b.waste < a.waste - 1e-9 ? b : a)) : null;
  const v = { pts, best: best ? { w: best.w, waste: best.waste } : null, mx };
  heatMemo = { key, v };
  return v;
}
/** Waste at the current strip width for what's left to cut */
export function wasteNow(shop: Shop) {
  sync(shop);
  const r = wasteAt(shop, wasteJobs(shop), true);
  return r.fabA ? 1 - (r.pc + r.re) / r.fabA : 0;
}
/** The strip width that uses the least fabric for the runs waiting to be cut (or a usual 12 M + 6 L run), fewest mats on a tie */
export function leastWasteWidth(shop: Shop): { w: number; wst: number; mats: number } | null {
  const c = shop.cfg.cut;
  const vm = MATS.find(m => m.id === c.mat) || MATS[1];
  const list = wasteJobs(shop);
  const mx = Math.min(vm.mw, c.bolt);
  let best: { w: number; fabA: number; wst: number; mats: number } | null = null;
  for (let w = CUT_MIN_W; w <= mx + 1e-9; w += 0.25) {
    const { fabA: fa, pc, re, mats, lost } = atWidth(shop, w, () => wasteAt(shop, list, false));
    if (lost) continue;
    const fabA = fa - re;
    const wst = fabA + re ? 1 - (pc + re) / (fabA + re) : 1;
    if (!best || fabA < best.fabA - 1e-6 || (Math.abs(fabA - best.fabA) < 1e-6 && mats < best.mats)) best = { w, fabA, wst, mats };
  }
  return best ? { w: best.w, wst: best.wst, mats: best.mats } : null;
}
/** A plan for any quantities at the current settings (the example layout in Settings) */
export function examplePlan(shop: Shop, qty: Record<string, number>) {
  sync(shop);
  const q: Record<string, number> = {};
  Object.entries(qty).forEach(([k, n]) => { if (n && sizeReady(shop, k)) q[k] = n; });
  return Object.keys(q).length ? E.cutPlan(q, {}) : null;
}
/** One run's plan with its own fabric (the runs-still-to-cut list in Settings) */
export function runPlanNow(shop: Shop, j: ReturnType<typeof wasteJobs>[number]) {
  sync(shop);
  return Object.keys(j.qty).length ? E.cutPlan(j.qty, { body: j.body, strap: j.strap, prod: j.prod }) : null;
}
