/* A small store: the whole shop is one immutable object. Every change makes a new object (so the cut-plan engine's caches
   reset), re-renders the screens that read it, and saves to disk a moment later. */
import { useSyncExternalStore } from 'react';
import { emptyShop, migrate, SWATCHES } from './defaults';
import { readShop, writeShop } from './storage';
import type { CutPlan, Fabric, Shop } from './types';

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

export async function loadShop() {
  try {
    const raw = await readShop();
    shop = raw ? migrate(JSON.parse(raw)) : emptyShop();
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

/** Apply a change. The updater gets a copy-on-write draft of the top level. */
export function update(fn: (s: Shop) => Shop) {
  shop = fn(shop);
  emit();
  scheduleSave();
}

/* ---------- ids and dates ---------- */
export const newId = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const today = () => new Date().toISOString().slice(0, 10);

/* ---------- fabric ---------- */
export function addFabric(f: Partial<Fabric>): string {
  const id = newId('f');
  update(s => ({
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
  }));
  return id;
}

export function editFabric(id: string, patch: Partial<Fabric>) {
  update(s => ({ ...s, fabrics: s.fabrics.map(f => (f.id === id ? { ...f, ...patch } : f)) }));
}

export function deleteFabric(id: string) {
  update(s => ({
    ...s,
    fabrics: s.fabrics.filter(f => f.id !== id),
    plans: s.plans.map(p =>
      p.status === 'planning' ? { ...p, body: p.body === id ? null : p.body, ties: p.ties === id ? null : p.ties } : p,
    ),
  }));
}

export function restoreFabric(f: Fabric, index: number) {
  update(s => {
    const list = s.fabrics.slice();
    list.splice(Math.min(index, list.length), 0, f);
    return { ...s, fabrics: list };
  });
}

/* ---------- cut plans ---------- */
export function addPlan(): string {
  const id = newId('p');
  update(s => {
    const first = s.fabrics[0] ? s.fabrics[0].id : null;
    const qty: Record<string, number> = {};
    Object.keys(s.sizes).forEach(k => (qty[k] = 0));
    const plan: CutPlan = {
      id,
      name: '',
      qty,
      body: first,
      ties: first,
      status: 'planning',
      created: today(),
      cutAt: null,
      fabUse: [],
      notes: '',
    };
    return { ...s, plans: [plan, ...s.plans] };
  });
  return id;
}

export function editPlan(id: string, patch: Partial<CutPlan>) {
  update(s => ({ ...s, plans: s.plans.map(p => (p.id === id ? { ...p, ...patch } : p)) }));
}

export function deletePlan(id: string) {
  update(s => ({ ...s, plans: s.plans.filter(p => p.id !== id) }));
}

export function restorePlan(p: CutPlan, index: number) {
  update(s => {
    const list = s.plans.slice();
    list.splice(Math.min(index, list.length), 0, p);
    return { ...s, plans: list };
  });
}

/** Mark a plan cut: takes the fabric off the shelf and remembers how much, so it can be undone. */
export function markCut(id: string, uses: { f: string; yards: number }[]) {
  update(s => {
    const fabUse = uses
      .filter(u => u.yards > 0)
      .map(u => ({ f: u.f, name: (s.fabrics.find(x => x.id === u.f) || { name: '' }).name, plan: u.yards, used: u.yards }));
    const take: Record<string, number> = {};
    fabUse.forEach(u => (take[u.f] = (take[u.f] || 0) + u.used));
    return {
      ...s,
      fabrics: s.fabrics.map(f => (take[f.id] ? { ...f, yards: round2(f.yards - take[f.id]) } : f)),
      plans: s.plans.map(p => (p.id === id ? { ...p, status: 'cut', cutAt: today(), fabUse } : p)),
    };
  });
}

export function undoCut(id: string) {
  update(s => {
    const p = s.plans.find(x => x.id === id);
    if (!p) return s;
    const give: Record<string, number> = {};
    p.fabUse.forEach(u => (give[u.f] = (give[u.f] || 0) + u.used));
    return {
      ...s,
      fabrics: s.fabrics.map(f => (give[f.id] ? { ...f, yards: round2(f.yards + give[f.id]) } : f)),
      plans: s.plans.map(x => (x.id === id ? { ...x, status: 'planning', cutAt: null, fabUse: [] } : x)),
    };
  });
}

/** After cutting, record what was really used; the difference goes back to (or comes off) the shelf. */
export function setUsed(id: string, f: string, used: number) {
  update(s => {
    const p = s.plans.find(x => x.id === id);
    if (!p) return s;
    const u = p.fabUse.find(x => x.f === f);
    if (!u) return s;
    const diff = round2(used - u.used);
    return {
      ...s,
      fabrics: s.fabrics.map(x => (x.id === f ? { ...x, yards: round2(x.yards - diff) } : x)),
      plans: s.plans.map(x =>
        x.id === id ? { ...x, fabUse: x.fabUse.map(y => (y.f === f ? { ...y, used: round2(used) } : y)) } : x,
      ),
    };
  });
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
