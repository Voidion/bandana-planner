export const yd = (n: number | null | undefined) => (n == null || isNaN(n) ? '–' : `${(Math.round(n * 10) / 10).toFixed(1)} yd`);
export const yd2 = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)} yd`;
export const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
export const perYd = (n: number) => `${money(n)}/yd`;
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** Inches, trimmed: 10 → 10″, 10.5 → 10.5″ */
export const inch = (n: number | null | undefined) => (n == null ? '–' : `${+(+n).toFixed(3)}″`);

/** Accepts 10, 10.5, 10 1/2, 1/4. Returns null when it isn't a number. */
export function parseNum(s: string): number | null {
  const t = String(s).trim().replace(/["″]|in$|yd$|\$/g, '').trim();
  if (!t) return null;
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return +frac[1] / +frac[2];
  const n = Number(t);
  return isNaN(n) ? null : n;
}

export function fmtDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

/** 95 → "1h 35m", 40 → "40 min" (as the prototype writes time) */
export const mins = (m: number) => {
  m = Math.round(m || 0);
  const h = Math.floor(m / 60),
    r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r} min`;
};
/** A running timer: 4:05, 1:02:09 */
export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000)),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    x = s % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return d >= 100 ? '99d+' : d + 'd ' + (h % 24) + 'h';
  }
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
};
export const money0 = (n: number) => (Math.round(n) < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
export const fmtN = (n: number) => String(Math.round(n * 100) / 100);

/** "Due in 3 days", "2 days late" from days-from-today */
export const relDue = (d: number | null) =>
  d == null ? 'No date' : d < 0 ? `${-d} day${d === -1 ? '' : 's'} late` : d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `Due in ${d} days`;

export function dayLabel(day: string | null, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  if (!day) return '';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}
/** "just now", "18 min ago", "3h ago", "yesterday", "4 days ago", "Oct 3" (the prototype's wording) */
export function ago(ms: number, now = Date.now()) {
  const d = (now - ms) / 6e4;
  if (d < 1) return 'just now';
  if (d < 60) return Math.floor(d) + ' min ago';
  if (d < 1440) return Math.floor(d / 60) + 'h ago';
  const dd = Math.floor(d / 1440);
  return dd === 1 ? 'yesterday' : dd < 7 ? dd + ' days ago' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export const hm = (m: number) => mins(m);
