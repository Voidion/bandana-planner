/* The rest of the shelf: suppliers, supplies, offcuts, ordering and restock, and how fast fabric gets used. */
import { addDays, todayDay } from '../lib/plan';
import { newId, round2, update, withLog } from './store';
import type { Fabric, Shop, Supplier, Supply } from './types';

/* ---------- suppliers ---------- */
export function addSupplier(p: Partial<Supplier> = {}): string {
  const id = newId('sp');
  update(s => ({ ...s, suppliers: [...s.suppliers, { id, name: p.name || 'New supplier', site: p.site || '', lead: p.lead ?? 7, ship: p.ship || '', notes: p.notes || '' }] }));
  return id;
}
export function editSupplier(id: string, patch: Partial<Supplier>) {
  update(s => ({ ...s, suppliers: s.suppliers.map(x => (x.id === id ? { ...x, ...patch } : x)) }));
}
/** Removes the supplier; fabric and supplies bought there keep everything else. */
export function deleteSupplier(id: string) {
  update(s => ({
    ...s,
    suppliers: s.suppliers.filter(x => x.id !== id),
    fabrics: s.fabrics.map(f => (f.sup === id ? { ...f, sup: null } : f)),
    supplies: s.supplies.map(x => (x.sup === id ? { ...x, sup: null } : x)),
  }));
}
export function restoreSupplier(sp: Supplier, index: number, fabricIds: string[], supplyIds: string[]) {
  update(s => {
    const list = s.suppliers.slice();
    list.splice(Math.min(index, list.length), 0, sp);
    return {
      ...s,
      suppliers: list,
      fabrics: s.fabrics.map(f => (fabricIds.includes(f.id) ? { ...f, sup: sp.id } : f)),
      supplies: s.supplies.map(x => (supplyIds.includes(x.id) ? { ...x, sup: sp.id } : x)),
    };
  });
}

/* ---------- supplies ---------- */
export function addSupply(p: Partial<Supply> = {}): string {
  const id = newId('su');
  update(s =>
    withLog(
      {
        ...s,
        supplies: [
          ...s.supplies,
          { id, name: p.name || 'New supply', unit: p.unit || '', qty: p.qty ?? 0, low: p.low ?? 0, cost: p.cost ?? 0, use: p.use || 'none', per: p.per ?? 1, sup: p.sup ?? null, url: p.url || '', onOrder: 0 },
        ],
      },
      'added a supply',
      p.name || 'New supply',
    ),
  );
  return id;
}
export function editSupply(id: string, patch: Partial<Supply>) {
  update(s => ({ ...s, supplies: s.supplies.map(x => (x.id === id ? { ...x, ...patch } : x)) }));
}
export function deleteSupply(id: string) {
  update(s => ({ ...s, supplies: s.supplies.filter(x => x.id !== id) }));
}
export function restoreSupply(x: Supply, index: number) {
  update(s => {
    const list = s.supplies.slice();
    list.splice(Math.min(index, list.length), 0, x);
    return { ...s, supplies: list };
  });
}

/* ---------- offcuts ---------- */
/** Keep a leftover piece as its own fabric. `fromShelf` moves the yards off the bolt (a piece you cut away); otherwise
    it's extra (left over after a cut that already took its yards). */
export function addOffcut(fabricId: string, yards: number, fromShelf: boolean): string | null {
  const id = newId('f');
  let ok = false;
  update(s => {
    const f = s.fabrics.find(x => x.id === fabricId);
    if (!f || !(yards > 0)) return s;
    ok = true;
    const src = f.offcut ? f.from || f.name : f.name;
    const off: Fabric = { ...f, id, name: f.name.replace(/ offcut$/i, '') + ' offcut', yards: round2(yards), low: 0, onOrder: 0, offcut: true, from: src, notes: '', added: todayDay() };
    return withLog(
      { ...s, fabrics: [...s.fabrics.map(x => (fromShelf && x.id === fabricId ? { ...x, yards: round2(x.yards - yards) } : x)), off] },
      'kept an offcut',
      `${round2(yards)} yd of ${f.name}`,
    );
  });
  return ok ? id : null;
}

/* ---------- ordering ---------- */
export type ShelfItem = { kind: 'fabric'; x: Fabric } | { kind: 'supply'; x: Supply };

export function markOrdered(kind: 'fabric' | 'supply', id: string, amount: number) {
  update(s => {
    const name = kind === 'fabric' ? s.fabrics.find(x => x.id === id)?.name : s.supplies.find(x => x.id === id)?.name;
    const next: Shop =
      kind === 'fabric'
        ? { ...s, fabrics: s.fabrics.map(x => (x.id === id ? { ...x, onOrder: round2((x.onOrder || 0) + amount) } : x)) }
        : { ...s, supplies: s.supplies.map(x => (x.id === id ? { ...x, onOrder: round2((x.onOrder || 0) + amount) } : x)) };
    return withLog(next, 'ordered ' + (name || 'an item'), `${round2(amount)} ${kind === 'fabric' ? 'yd' : ''}`.trim());
  });
}
export function cancelOrder(kind: 'fabric' | 'supply', id: string) {
  update(s =>
    kind === 'fabric'
      ? { ...s, fabrics: s.fabrics.map(x => (x.id === id ? { ...x, onOrder: 0 } : x)) }
      : { ...s, supplies: s.supplies.map(x => (x.id === id ? { ...x, onOrder: 0 } : x)) },
  );
}
/** It came: what was on order goes on the shelf. `amount` lets you correct how much really arrived, `cost` the new price. */
export function arrived(kind: 'fabric' | 'supply', id: string, amount?: number, cost?: number) {
  update(s => {
    if (kind === 'fabric') {
      const f = s.fabrics.find(x => x.id === id);
      if (!f) return s;
      const n = amount ?? f.onOrder;
      return withLog(
        { ...s, fabrics: s.fabrics.map(x => (x.id === id ? { ...x, yards: round2(x.yards + n), onOrder: 0, cost: cost ?? x.cost } : x)) },
        'restocked ' + f.name,
        `+${round2(n)} yd`,
      );
    }
    const x0 = s.supplies.find(x => x.id === id);
    if (!x0) return s;
    const n = amount ?? x0.onOrder;
    return withLog(
      { ...s, supplies: s.supplies.map(x => (x.id === id ? { ...x, qty: round2(x.qty + n), onOrder: 0, cost: cost ?? x.cost } : x)) },
      'restocked ' + x0.name,
      `+${round2(n)} ${x0.unit}`.trim(),
    );
  });
}

/* ---------- how fast fabric gets used ---------- */
/** Yards a week over the last 8 weeks (null until it has been cut from) */
export function weeklyUse(s: Shop, fabricId: string): number | null {
  const since = addDays(todayDay(), -56);
  const lines = s.usage.filter(u => u.f === fabricId);
  if (!lines.length) return null;
  const first = lines.reduce((a, u) => (u.day < a ? u.day : a), lines[0].day);
  const from = first > since ? first : since;
  const days = Math.max(7, Math.round((Date.parse(todayDay()) - Date.parse(from)) / 864e5) + 1);
  const yd = lines.filter(u => u.day >= since).reduce((a, u) => a + u.yd, 0);
  return yd > 0 ? yd / (days / 7) : null;
}

export function forecast(s: Shop, f: Fabric): { weeks: number; text: string } | null {
  const wk = weeklyUse(s, f.id);
  if (f.offcut || !wk) return null;
  if (f.yards <= 0) return { weeks: 0, text: 'Out now' };
  const w = f.yards / wk;
  return {
    weeks: w,
    text: w < 1 ? 'Runs out within a week' : w < 1.5 ? 'Runs out in about a week' : w > 52 ? 'Lasts more than a year at this pace' : w > 9 ? `Runs out in about ${Math.round(w / 4.3)} months` : `Runs out in about ${Math.round(w)} weeks`,
  };
}

export const leadOf = (s: Shop, item: { sup?: string | null; lead?: number | null }) => item.lead ?? s.suppliers.find(x => x.id === item.sup)?.lead ?? 7;

/** Everything that's low, out, or will run out before a new order could arrive */
export function restockList(s: Shop): (ShelfItem & { reason: string; suggest: number })[] {
  const out: (ShelfItem & { reason: string; suggest: number })[] = [];
  s.fabrics
    .filter(f => !f.offcut)
    .forEach(f => {
      const fc = forecast(s, f);
      const lead = leadOf(s, f) / 7;
      const low = f.low > 0 && f.yards <= f.low;
      const soon = fc && fc.weeks <= lead + 1;
      if (!low && !soon && f.yards > 0) return;
      const wk = weeklyUse(s, f.id) || 0;
      const suggest = Math.max(s.cfg.newBolt.yards, Math.ceil((wk * 6 + f.low - f.yards - (f.onOrder || 0)) * 2) / 2);
      out.push({ kind: 'fabric', x: f, reason: f.yards <= 0 ? 'Out' : low ? `Below ${f.low} yd` : fc!.text, suggest: round2(suggest) });
    });
  s.supplies.forEach(x => {
    if (!(x.qty <= x.low && (x.low > 0 || x.qty <= 0))) return;
    out.push({ kind: 'supply', x, reason: x.qty <= 0 ? 'Out' : `Below ${x.low}`, suggest: Math.max(1, Math.ceil(x.low * 2 - x.qty - (x.onOrder || 0))) });
  });
  return out;
}
