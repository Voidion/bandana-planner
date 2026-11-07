/* A small store: the whole shop is one immutable object. Every change makes a new object (so the engine's caches
   reset), re-renders the screens that read it, and saves to disk a moment later. */
import { cutsForRun, runSeam } from './equip';
import { useSyncExternalStore } from 'react';
import { computePlan, isCutStep, stepsForRun, timerMs, todayDay } from '../lib/plan';
import { emptyShop, migrate, SWATCHES } from './defaults';
import { readShop, writeShop } from './storage';
import type { DefectRec, Fabric, Run, Shop, StockLine, Step, Template } from './types';

let shop: Shop = emptyShop();
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSaved = '';
const subs = new Set<() => void>();
export type SaveState = 'saved' | 'saving' | 'error';
let saveState: SaveState = 'saved';

const emit = () => subs.forEach(f => f());

export function getShop() {
  return shop;
}

export function subscribe(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

export function useShop(): Shop {
  return useSyncExternalStore(subscribe, getShop, getShop);
}

export function useSaveState(): SaveState {
  return useSyncExternalStore(subscribe, () => saveState, () => saveState);
}

/** Runs carried over from older versions have no steps yet: give them their template's. */
function hydrate(s: Shop): Shop {
  if (!s.runs.some(r => !r.steps.length)) return s;
  return {
    ...s,
    runs: s.runs.map(r => {
      if (r.steps.length) return r;
      const steps = stepsForRun(s, r.tpl, r.qty, r.prod).map(st => (r.cut && isCutStep(st.name) ? { ...st, done: true } : st));
      return { ...r, steps };
    }),
  };
}

export async function loadShop() {
  try {
    const raw = await readShop();
    shop = raw ? hydrate(migrate(JSON.parse(raw))) : emptyShop();
    lastSaved = raw || '';
  } catch (e) {
    /* A file that can't be read is never treated as an empty shop: keep it untouched and don't overwrite it. */
    loaded = false;
    throw e;
  }
  loaded = true;
  emit();
}

function scheduleSave() {
  if (!loaded) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveState = 'saving';
  saveTimer = setTimeout(flush, 350);
}

export async function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const json = JSON.stringify(shop);
  if (json === lastSaved) {
    saveState = 'saved';
    emit();
    return;
  }
  try {
    await writeShop(json);
    lastSaved = json;
    saveState = 'saved';
  } catch (e) {
    saveState = 'error';
  }
  emit();
}

/** Apply a change. The updater returns the next shop. */
export function update(fn: (s: Shop) => Shop) {
  shop = fn(shop);
  emit();
  scheduleSave();
}

/* ---------- ids, dates, helpers ---------- */
export const newId = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const today = todayDay;
export const round2 = (n: number) => Math.round(n * 100) / 100;
const short = (r: Run) => (r.name || 'Untitled run').split(' — ')[0];
export const withLog = (s: Shop, text: string, sub = ''): Shop => ({ ...s, activity: [{ who: 'You', text, sub, t: Date.now() }, ...s.activity].slice(0, 300) });
const mapRun = (s: Shop, id: string, fn: (r: Run) => Run): Shop => ({ ...s, runs: s.runs.map(r => (r.id === id ? fn(r) : r)) });
const findRun = (s: Shop, id: string) => s.runs.find(r => r.id === id);

/* ---------- fabric ---------- */
export function addFabric(f: Partial<Fabric>): string {
  const id = newId('f');
  update(s =>
    withLog(
      {
        ...s,
        fabrics: [
          ...s.fabrics,
          {
            id,
            name: f.name || 'New fabric',
            yards: f.yards ?? s.cfg.newBolt.yards,
            low: f.low ?? s.cfg.newBolt.low,
            cost: f.cost ?? 0,
            grain: f.grain || 'none',
            top: f.top || 'up',
            way: f.way || 'two',
            supplier: f.supplier || '',
            notes: f.notes || '',
            color: f.color || SWATCHES[s.fabrics.length % SWATCHES.length],
            added: today(),
            onOrder: 0,
          },
        ],
      },
      'added a bolt',
      `${f.name || 'New fabric'} · ${f.yards ?? s.cfg.newBolt.yards} yd`,
    ),
  );
  return id;
}

export function editFabric(id: string, patch: Partial<Fabric>) {
  update(s => refreshDrafts({ ...s, fabrics: s.fabrics.map(f => (f.id === id ? { ...f, ...patch } : f)) }));
}

export function deleteFabric(id: string) {
  update(s =>
    refreshDrafts({
      ...s,
      fabrics: s.fabrics.filter(f => f.id !== id),
      runs: s.runs.map(r => (r.status === 'draft' && !r.cut ? { ...r, body: r.body === id ? null : r.body, ties: r.ties === id ? null : r.ties } : r)),
    }),
  );
}

export function restoreFabric(f: Fabric, index: number) {
  update(s => {
    const list = s.fabrics.slice();
    list.splice(Math.min(index, list.length), 0, f);
    return refreshDrafts({ ...s, fabrics: list });
  });
}

/* ---------- runs ---------- */

/** Recompute what a draft needs from the shelf, and its steps (unless you've edited them). */
function refreshRun(s: Shop, r: Run): Run {
  if (r.cut || r.status === 'done') return r;
  const res = computePlan(s, r);
  const fabrics = res.needs.filter(n => n.f).map(n => ({ f: n.f!.id, role: n.role, need: round2(n.yards), learned: n.learned }));
  const keep = r.status !== 'draft' || r.stepsEdited || r.steps.some(x => x.done || x.actual) || (s.timer && s.timer.run === r.id);
  const steps = keep && r.steps.length ? r.steps : stepsForRun(s, r.tpl, r.qty, r.prod);
  return { ...r, fabrics, steps };
}
function refreshDrafts(s: Shop): Shop {
  if (!s.runs.some(r => !r.cut && r.status !== 'done')) return s;
  return { ...s, runs: s.runs.map(r => refreshRun(s, r)) };
}

/** A run that was opened but never given a name, a quantity, notes or any work (left behind by Plan a run) */
export const isEmptyDraft = (r: Run) => r.status === 'draft' && !r.cut && !(r.name || '').trim() && !(r.notes || '').trim() && !Object.values(r.qty || {}).some(Boolean) && !r.steps.some(x => x.done);
/** Clears empty drafts, except the one being looked at */
export function pruneEmptyDrafts(keep?: string | null) {
  const s = getShop();
  if (!s.runs.some(r => r.id !== keep && isEmptyDraft(r))) return;
  update(x => ({ ...x, runs: x.runs.filter(r => r.id === keep || !isEmptyDraft(r)) }));
}
export function planRun(from?: Partial<Run>): string {
  const id = newId('r');
  update(s => {
    const first = s.fabrics.find(f => !f.offcut)?.id || null;
    const qty: Record<string, number> = {};
    Object.keys(s.sizes).forEach(k => (qty[k] = (from && from.qty && from.qty[k]) || 0));
    const r: Run = {
      id,
      name: from?.name || '',
      status: 'draft',
      qty,
      body: from?.body !== undefined ? from.body : first,
      ties: from?.ties !== undefined ? from.ties : first,
      prod: { ...(from?.prod || {}) },
      fabrics: [],
      tpl: from?.tpl && s.templates.some(t => t.id === from.tpl) ? from.tpl : s.cfg.defTpl,
      steps: [],
      due: from?.due ?? null,
      created: today(),
      cut: false,
      cutAt: null,
      fabUse: [],
      finishedAt: null,
      defects: 0,
      notes: '',
    };
    const drafts = s.runs.filter(x => x.status !== 'done').length;
    const runs = s.runs.slice();
    runs.splice(drafts, 0, refreshRun(s, r));
    return { ...s, runs };
  });
  return id;
}

export function editRun(id: string, patch: Partial<Run>) {
  update(s => {
    const next = mapRun(s, id, r => ({ ...r, ...patch }));
    const r = findRun(next, id)!;
    const needsRefresh = 'qty' in patch || 'prod' in patch || 'body' in patch || 'ties' in patch || 'tpl' in patch;
    if (!needsRefresh) return next;
    if ('tpl' in patch) return mapRun(next, id, x => refreshRun(next, { ...x, stepsEdited: false }));
    return mapRun(next, id, () => refreshRun(next, r));
  });
}

export function deleteRun(id: string) {
  update(s => {
    const timer = s.timer && s.timer.run === id ? null : s.timer;
    return { ...s, timer, runs: s.runs.filter(r => r.id !== id) };
  });
}

export function restoreRun(r: Run, index: number) {
  update(s => {
    const list = s.runs.slice();
    list.splice(Math.min(index, list.length), 0, r);
    return { ...s, runs: list };
  });
}

export function startRun(id: string) {
  update(s => {
    const r = findRun(s, id);
    if (!r) return s;
    return withLog(mapRun(s, id, x => ({ ...x, status: 'active' })), 'started ' + short(r));
  });
}

/** Record the cut: take what you really used off the shelf and tick Cut day. */
export function cutRun(id: string, used: number[]) {
  update(s => {
    const r0 = findRun(s, id);
    if (!r0) return s;
    const r = r0.status === "draft" ? { ...refreshRun(s, r0), steps: r0.steps } : refreshRun(s, r0);
    const fabUse = r.fabrics.map((x, i) => {
      const f = s.fabrics.find(y => y.id === x.f);
      const u = used[i] != null && isFinite(used[i]) && used[i] >= 0 ? round2(used[i]) : x.need;
      return { f: x.f, name: f ? f.name : 'Removed fabric', role: x.role, plan: x.need, used: u, cost: f ? f.cost : 0 };
    });
    const take: Record<string, number> = {};
    fabUse.forEach(u => (take[u.f] = (take[u.f] || 0) + u.used));
    let next: Shop = {
      ...s,
      fabrics: s.fabrics.map(f => (take[f.id] ? { ...f, yards: round2(f.yards - take[f.id]) } : f)),
      usage: [...s.usage.filter(u => u.run !== id), ...fabUse.map(u => ({ f: u.f, yd: u.used, day: today(), run: id }))],
    };
    const cs = r0.steps.find(x => isCutStep(x.name));
    if (cs && s.timer && s.timer.step === cs.id) next = recordTimer(next);
    next = mapRun(next, id, x => ({
      ...x,
      fabrics: r.fabrics,
      fabUse,
      cut: true,
      cutAt: today(),
      status: x.status === 'draft' ? 'active' : x.status,
      steps: x.steps.map(st => (cs && st.id === cs.id ? { ...st, done: true } : st)),
    }));
    const mats = computePlan(s, r0).cp?.mats.length || 0;
    if (mats) next = { ...next, tools: next.tools.map(t => (t.kind === 'blade' || t.kind === 'mat' ? { ...t, uses: t.uses + mats } : t)) };
    // the blade in the machine takes a cut per piece; the mat a pass per mat
    const cuts = cutsForRun(s, r0);
    const e = next.equip;
    next = { ...next, equip: { ...e, venture: { ...e.venture, mats: e.venture.mats + mats }, tools: e.tools.map(t => (t.id === e.venture.clamp ? { ...t, cuts: t.cuts + cuts } : t.kind === 'mat' && mats ? { ...t, cuts: t.cuts + mats } : t)) } };
    return withLog(next, 'cut ' + short(r), fabUse.map(u => `${u.used} yd ${u.name}`).join(', '));
  });
}

const findStep = (s: Shop, run: string, step: string) => findRun(s, run)?.steps.find(x => x.id === step);

/** Put the fabric back on the shelf and make the run uncut again. */
export function undoCut(id: string) {
  update(s => {
    const r = findRun(s, id);
    if (!r || !r.cut) return s;
    const give: Record<string, number> = {};
    r.fabUse.forEach(u => (give[u.f] = (give[u.f] || 0) + u.used));
    const next: Shop = {
      ...s,
      fabrics: s.fabrics.map(f => (give[f.id] ? { ...f, yards: round2(f.yards + give[f.id]) } : f)),
      usage: s.usage.filter(u => u.run !== id),
      runs: s.runs.map(x =>
        x.id === id ? { ...x, cut: false, cutAt: null, fabUse: [], steps: x.steps.map(st => (isCutStep(st.name) ? { ...st, done: false } : st)) } : x,
      ),
    };
    return withLog(refreshDrafts(next), 'put the fabric back', short(r));
  });
}

/** After cutting, correct what was really used; the difference goes back to (or comes off) the shelf. */
export function setUsed(id: string, f: string, used: number) {
  update(s => {
    const r = findRun(s, id);
    const u = r && r.fabUse.find(x => x.f === f);
    if (!r || !u) return s;
    const diff = round2(used - u.used);
    return {
      ...s,
      fabrics: s.fabrics.map(x => (x.id === f ? { ...x, yards: round2(x.yards - diff) } : x)),
      usage: s.usage.map(x => (x.run === id && x.f === f ? { ...x, yd: round2(used) } : x)),
      runs: s.runs.map(x => (x.id === id ? { ...x, fabUse: x.fabUse.map(y => (y.f === f ? { ...y, used: round2(used) } : y)) } : x)),
    };
  });
}

/* ---------- steps ---------- */
export function tickStep(runId: string, stepId: string) {
  update(s => {
    const r = findRun(s, runId);
    const st = r && r.steps.find(x => x.id === stepId);
    if (!r || !st) return s;
    let next = s;
    const done = !st.done;
    if (done && s.timer && s.timer.step === stepId) next = recordTimer(next);
    next = mapRun(next, runId, x => ({
      ...x,
      status: done && x.status === 'draft' ? 'active' : x.status,
      steps: x.steps.map(y => (y.id === stepId ? { ...y, done, untimed: done ? y.untimed : false } : y)),
    }));
    return done ? withLog(next, 'ticked ' + st.name, short(r)) : next;
  });
}

export function editStep(runId: string, stepId: string, patch: Partial<Step>) {
  update(s => mapRun(s, runId, r => ({ ...r, stepsEdited: true, steps: r.steps.map(x => (x.id === stepId ? { ...x, ...patch } : x)) })));
}

/** Time typed in by hand: ticks the step, and isn't used to learn your pace. */
export function enterTime(runId: string, stepId: string, minutes: number) {
  update(s => {
    const r = findRun(s, runId);
    const st = r && r.steps.find(x => x.id === stepId);
    if (!r || !st || !(minutes > 0)) return s;
    const next = mapRun(s, runId, x => ({
      ...x,
      status: x.status === 'draft' ? 'active' : x.status,
      steps: x.steps.map(y => (y.id === stepId ? { ...y, actual: Math.round(minutes), entered: true, recorded: false, done: true, untimed: false } : y)),
    }));
    return withLog(next, `entered ${Math.round(minutes)} min for ${st.name}`, 'Not used in estimates');
  });
}

export function addStep(runId: string): string {
  const id = newId('st');
  update(s => mapRun(s, runId, r => ({ ...r, stepsEdited: true, steps: [...r.steps, { id, name: 'New step', est: 30, source: 'template', done: false }] })));
  return id;
}

export function removeStep(runId: string, stepId: string) {
  update(s => {
    const timer = s.timer && s.timer.step === stepId ? null : s.timer;
    return mapRun({ ...s, timer }, runId, r => ({ ...r, stepsEdited: true, steps: r.steps.filter(x => x.id !== stepId) }));
  });
}

export function restoreStep(runId: string, st: Step, index: number) {
  update(s =>
    mapRun(s, runId, r => {
      const steps = r.steps.slice();
      steps.splice(Math.min(index, steps.length), 0, st);
      return { ...r, steps };
    }),
  );
}

export function moveStep(runId: string, stepId: string, d: -1 | 1) {
  update(s =>
    mapRun(s, runId, r => {
      const i = r.steps.findIndex(x => x.id === stepId);
      const j = i + d;
      if (i < 0 || j < 0 || j >= r.steps.length) return r;
      const steps = r.steps.slice();
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return { ...r, stepsEdited: true, steps };
    }),
  );
}

/* ---------- timer (one at a time; it keeps running if you close the app) ---------- */

/** Stops the timer and records its time on the step, and as a session the planner learns from. */
function recordTimer(s: Shop): Shop {
  const m = s.timer;
  if (!m) return s;
  const r = findRun(s, m.run);
  const st = r && r.steps.find(x => x.id === m.step);
  const mins = Math.max(1, Math.round(timerMs(m) / 6e4));
  if (!r || !st) return { ...s, timer: null };
  const pcs = Object.values(r.qty).reduce((a, b) => a + (b || 0), 0) + Object.values(r.prod || {}).reduce((a, b) => a + (b || 0), 0);
  return {
    ...mapRun(s, r.id, x => ({ ...x, steps: x.steps.map(y => (y.id === st.id ? { ...y, actual: mins, recorded: true, entered: false } : y)) })),
    timer: null,
    sessions: pcs ? [...s.sessions, { who: 'You', step: st.name, pcs, mins, day: today(), hour: new Date().getHours() }] : s.sessions,
  };
}

export function startTimer(runId: string, stepId: string) {
  update(s => {
    const r = findRun(s, runId);
    const st = r && r.steps.find(x => x.id === stepId);
    if (!r || !st) return s;
    const next = recordTimer(s);
    return withLog(
      mapRun({ ...next, timer: { run: runId, step: stepId, start: Date.now(), acc: 0, paused: false } }, runId, x => ({ ...x, status: x.status === 'draft' ? 'active' : x.status })),
      'started timing ' + st.name,
      short(r),
    );
  });
}

/** Stop and record. Returns the minutes recorded. */
export function stopTimer(): { mins: number; step: string } | null {
  const m = shop.timer;
  if (!m) return null;
  const st = findStep(shop, m.run, m.step);
  const mins = Math.max(1, Math.round(timerMs(m) / 6e4));
  update(s => withLog(recordTimer(s), `timed ${st ? st.name : 'a step'} at ${mins} min`, findRun(s, m.run) ? short(findRun(s, m.run)!) : ''));
  return { mins, step: st ? st.name : 'the step' };
}

export function pauseTimer() {
  update(s => {
    const m = s.timer;
    if (!m) return s;
    return m.paused ? { ...s, timer: { ...m, start: Date.now(), paused: false } } : { ...s, timer: { ...m, acc: timerMs(m), paused: true } };
  });
}

/** Stops the timer without recording any time. Returns it so it can be put back. */
export function closeOutTimer() {
  const m = shop.timer;
  update(s => withLog({ ...s, timer: null }, 'closed out a timer', 'No time recorded'));
  return m;
}

export function restoreTimer(m: Shop['timer']) {
  update(s => ({ ...s, timer: m }));
}

/** Forgot to stop it: save the time you really worked instead. Entered by hand, so estimates ignore it. */
export function fixTimer(minutes: number) {
  update(s => {
    const m = s.timer;
    if (!m) return s;
    const st = findStep(s, m.run, m.step);
    const next = mapRun({ ...s, timer: null }, m.run, r => ({ ...r, steps: r.steps.map(y => (y.id === m.step ? { ...y, actual: Math.round(minutes), entered: true, recorded: false } : y)) }));
    return withLog(next, `fixed the time for ${st ? st.name : 'a step'}`, `${Math.round(minutes)} min entered by hand`);
  });
}

/* ---------- finishing, stock, defects ---------- */
export function finishRun(id: string) {
  update(s => {
    let next = s.timer && s.timer.run === id ? recordTimer(s) : s;
    const r = findRun(next, id);
    if (!r) return s;
    next = mapRun(next, id, x => ({
      ...x,
      status: 'done',
      finishedAt: today(),
      steps: x.steps.map(st => (st.done ? st : { ...st, done: true, untimed: !st.actual })),
    }));
    const add: StockLine[] = [...Object.entries(r.qty), ...Object.entries(r.prod || {})]
      .filter(([, n]) => n > 0)
      .map(([size, n]) => ({ run: id, size, n }));
    const n = Object.values(r.qty).reduce((a, b) => a + (b || 0), 0);
    const nItems = add.reduce((a, x) => a + x.n, 0);
    const supUse = next.supplies
      .filter(x => (x.use === 'bandana' && n > 0) || (x.use === 'item' && nItems > 0))
      .map(x => ({ id: x.id, name: x.name, unit: x.unit, n: round2((+x.per || 1) * (x.use === 'item' ? nItems : n)) }));
    const take = Object.fromEntries(supUse.map(u => [u.id, u.n]));
    next = mapRun(next, id, x => ({ ...x, supUse }));
    const sewHours = r.steps.filter(st => /sew|stitch|hem|serg|bind/i.test(st.name)).reduce((a, st) => a + (st.actual || st.est || 0), 0) / 60;
    if (sewHours > 0) next = { ...next, tools: next.tools.map(t => (t.kind === 'machine' ? { ...t, uses: round2(t.uses + sewHours) } : t)) };
    const seam = runSeam(next, r);
    const W = next.equip.sewing;
    next = { ...next, equip: { ...next.equip, sewing: { ...W, mins: Math.round(W.mins + sewHours * 60), seam: round2(W.seam + seam.m), bodies: W.bodies + seam.b, straps: W.straps + seam.s } } };
    return withLog(
      { ...next, stock: [...next.stock, ...add], supplies: next.supplies.map(x => (take[x.id] ? { ...x, qty: Math.max(0, round2(x.qty - take[x.id])) } : x)) },
      'finished ' + short(r),
      `${nItems} item${nItems === 1 ? '' : 's'}${supUse.length ? ' · used ' + supUse.map(u => `${u.n} ${u.name.toLowerCase()}`).join(', ') : ''}`,
    );
  });
}

/** Back to in progress, and its bandanas come out of finished stock again. */
export function reopenRun(id: string) {
  update(s => {
    const r = findRun(s, id);
    const give = Object.fromEntries((r?.supUse || []).map(u => [u.id, u.n]));
    return {
      ...mapRun(s, id, x => ({ ...x, status: 'active', finishedAt: null, supUse: [] })),
      stock: s.stock.filter(x => x.run !== id),
      supplies: s.supplies.map(x => (give[x.id] ? { ...x, qty: round2(x.qty + give[x.id]) } : x)),
    };
  });
}

/** Plan the same bandanas again */
export function planAgain(id: string): string | null {
  const r = findRun(shop, id);
  if (!r) return null;
  return planRun({ name: short(r) + ' again', qty: r.qty, prod: r.prod, body: r.body, ties: r.ties, tpl: r.tpl });
}

export function stockBySize(s: Shop) {
  const by: Record<string, number> = {};
  s.stock.forEach(x => (by[x.size] = (by[x.size] || 0) + x.n));
  return by;
}

/** Change a size's count by hand. Taking away comes out of counts added by hand first, then the oldest runs. */
export function adjustStock(size: string, delta: number) {
  update(s => {
    if (delta > 0) {
      const i = s.stock.findIndex(x => x.run === 'adj' && x.size === size);
      const stock = s.stock.slice();
      if (i >= 0) stock[i] = { ...stock[i], n: stock[i].n + delta };
      else stock.push({ run: 'adj', size, n: delta });
      return withLog({ ...s, stock }, `added ${delta} to stock`, s.sizes[size]?.name || size);
    }
    let left = -delta;
    const order = [...s.stock.filter(x => x.run === 'adj'), ...s.stock.filter(x => x.run !== 'adj')];
    const take = new Map<StockLine, number>();
    for (const x of order) {
      if (x.size !== size || !left) continue;
      const t = Math.min(x.n, left);
      take.set(x, t);
      left -= t;
    }
    const stock = s.stock.map(x => (take.has(x) ? { ...x, n: x.n - take.get(x)! } : x)).filter(x => x.n > 0);
    return withLog({ ...s, stock }, `took ${-delta - left} out of stock`, s.sizes[size]?.name || size);
  });
}

export function logDefect(d: Omit<DefectRec, 'id' | 'day' | 'removed'>): string {
  const id = newId('df');
  update(s => {
    const r = d.run ? findRun(s, d.run) : null;
    const removed: StockLine[] = [];
    let stock = s.stock;
    if (d.fate === 'toss' && r && r.status === 'done' && d.size) {
      let left = d.n;
      stock = s.stock
        .map(x => {
          if (x.run === r.id && x.size === d.size && x.n > 0 && left) {
            const t = Math.min(x.n, left);
            left -= t;
            removed.push({ run: x.run, size: x.size, n: t });
            return { ...x, n: x.n - t };
          }
          return x;
        })
        .filter(x => x.n > 0);
    }
    const rec: DefectRec = { ...d, id, day: today(), removed };
    const next: Shop = { ...s, stock, defectLog: [...s.defectLog, rec] };
    return withLog(
      r ? mapRun(next, r.id, x => ({ ...x, defects: (x.defects || 0) + d.n })) : next,
      `logged ${d.n} defect${d.n === 1 ? '' : 's'}: ${d.kind.toLowerCase()}`,
      r ? short(r) : '',
    );
  });
  return id;
}

export function undoDefect(id: string) {
  update(s => {
    const rec = s.defectLog.find(x => x.id === id);
    if (!rec) return s;
    const stock = s.stock.slice();
    rec.removed.forEach(x => {
      const i = stock.findIndex(y => y.run === x.run && y.size === x.size);
      if (i >= 0) stock[i] = { ...stock[i], n: stock[i].n + x.n };
      else stock.push({ ...x });
    });
    const next: Shop = { ...s, stock, defectLog: s.defectLog.filter(x => x.id !== id) };
    return rec.run ? mapRun(next, rec.run, r => ({ ...r, defects: Math.max(0, (r.defects || 0) - rec.n) })) : next;
  });
}

/* ---------- templates and settings ---------- */
export function setCfg(patch: Partial<Shop['cfg']>) {
  update(s => refreshDrafts({ ...s, cfg: { ...s.cfg, ...patch } }));
}

export function editTemplate(id: string, patch: Partial<Template>) {
  update(s => refreshDrafts({ ...s, templates: s.templates.map(t => (t.id === id ? { ...t, ...patch } : t)) }));
}

export function addTemplate(from?: string): string {
  const id = newId('t');
  update(s => {
    const src = s.templates.find(t => t.id === from) || s.templates.find(t => t.id === s.cfg.defTpl) || s.templates[0];
    return { ...s, templates: [...s.templates, { id, name: src ? src.name + ' copy' : 'New template', steps: src ? src.steps.map(x => ({ ...x })) : [] }] };
  });
  return id;
}

export function deleteTemplate(id: string) {
  update(s => {
    if (s.templates.length < 2) return s;
    const templates = s.templates.filter(t => t.id !== id);
    const defTpl = s.cfg.defTpl === id ? templates[0].id : s.cfg.defTpl;
    return refreshDrafts({ ...s, templates, cfg: { ...s.cfg, defTpl }, runs: s.runs.map(r => (r.tpl === id && r.status === 'draft' ? { ...r, tpl: defTpl, stepsEdited: false } : r)) });
  });
}

export function restoreTemplate(t: Template, index: number, wasDefault: boolean) {
  update(s => {
    const templates = s.templates.slice();
    templates.splice(Math.min(index, templates.length), 0, t);
    return refreshDrafts({ ...s, templates, cfg: wasDefault ? { ...s.cfg, defTpl: t.id } : s.cfg });
  });
}

/** A change to sizes, straps or cut settings: drafts are recomputed so they stay current */
export function change(fn: (s: Shop) => Shop) {
  update(s => refreshDrafts(fn(s)));
}
