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
