/* Your machines, as the prototype tracks them: the Cricut Venture (which blade is in the machine, cuts on each blade,
   passes on each mat, checks, replacements and what they lasted) and the sewing machine (hours and seam sewn), with
   upkeep tasks counted by mats cut, seam sewn, hours sewn or days. */
import { todayDay } from '../lib/plan';
import type { Run, Shop } from './types';

export type ToolKind = 'blade' | 'mat' | 'tool';
export interface EquipTool {
  id: string;
  kind: ToolKind;
  name: string;
  use: string;
  /** Cuts (blades) or passes (mats) it should last */
  life: number | null;
  /** Look at it every this many cuts */
  check: number | null;
  cuts: number;
  lastCheck: number;
  history: { day: string; cuts: number; why: string }[];
  /** The lifespan is Cricut's estimate, not yet learned from your blades */
  est?: boolean;
}
export type TaskUnit = 'hours' | 'mats' | 'seam' | 'days';
export interface EquipTask {
  id: string;
  machine: 'venture' | 'sewing';
  name: string;
  unit: TaskUnit;
  every: number;
  /** The counter when it was last done (a day for days) */
  last: number | string;
  /** "Time to look" rather than "do it" */
  look?: boolean;
  why: string;
}
export interface Equip {
  venture: { name: string; clamp: string | null; mats: number };
  sewing: { name: string; mins: number; seam: number; bodies: number; straps: number };
  tools: EquipTool[];
  tasks: EquipTask[];
  log: { day: string; text: string }[];
}

const T = (o: Partial<EquipTool> & { id: string; name: string }): EquipTool => ({ kind: 'blade', use: '', life: null, check: null, cuts: 0, lastCheck: 0, history: [], ...o });
export function freshEquip(): Equip {
  return {
    venture: { name: 'Cricut Venture', clamp: 'bonded', mats: 0 },
    sewing: { name: 'Sewing machine', mins: 0, seam: 0, bodies: 0, straps: 0 },
    tools: [
      T({ id: 'bonded', name: 'Bonded-Fabric Blade', use: 'Bonded fabric and fabric with an iron-on backer. An Explore blade, so Cricut says it wears faster in the Venture.', life: 1000, check: 250, est: true }),
      T({ id: 'perf', name: 'Performance Fine-Point Blade', use: 'Comes installed. Made for the Venture’s speed and force. Light to medium materials like vinyl, iron-on and cardstock.' }),
      T({ id: 'pfp', name: 'Premium Fine-Point Blade', use: 'Explore blade. Works in the Venture, but Cricut says it wears out much faster than the Performance blade.' }),
      T({ id: 'deep', name: 'Deep-Point Blade', use: 'Explore blade for thicker materials like chipboard, magnet and stamp material. Wears faster in the Venture.' }),
      T({ id: 'autocut', name: 'Auto Cut-off Blade', use: 'Sits in Clamp A and trims Smart Materials to length. Venture only.' }),
      T({ id: 'score', kind: 'tool', name: 'Scoring Stylus', use: 'Clamp A. Fold lines for cards and boxes.' }),
      T({ id: 'foil', kind: 'tool', name: 'Foil Transfer Tool', use: 'Clamp B. Fine, medium and bold tips.' }),
      T({ id: 'mat', kind: 'mat', name: 'Performance Machine Mat', use: 'The Venture only takes Performance Machine Mats. A pass is one trip through the machine. Replace it when fabric slides while cutting.' }),
    ],
    tasks: [
      { id: 'needle', machine: 'sewing', name: 'Change the needle', unit: 'seam', every: 275, last: 0, look: true, why: 'Counted by seam sewn, estimated from the bandanas and straps you make, not time at the machine. For cotton, a Universal or Quilting 80/12. If a layer is fused or bonded, a Microtex 80/12 goes through cleaner, and the glue dulls needles faster.' },
      { id: 'lint', machine: 'sewing', name: 'Clean lint from the bobbin area', unit: 'seam', every: 165, last: 0, look: true, why: 'Lint builds up around the bobbin case and feed dogs and causes skipped stitches.' },
      { id: 'oil', machine: 'sewing', name: 'Oil the machine', unit: 'seam', every: 220, last: 0, why: 'Only if your manual says to. Many newer machines never need it.' },
      { id: 'service', machine: 'sewing', name: 'Professional service', unit: 'hours', every: 120, last: 0, why: 'A tune-up for timing, tension and a deep clean. Counted in hours sewn, not a fixed yearly date, so a slow month doesn’t bring it forward.' },
      { id: 'rollers', machine: 'venture', name: 'Wipe the rollers and clamps', unit: 'mats', every: 40, last: 0, look: true, why: 'Fabric fibres and dust build up on the rollers and clamps as mats go through, so this counts mats cut instead of days.' },
    ],
    log: [],
  };
}

/** Old shops: build the equipment from the simple tool list (machine hours carry over) */
export function migrateEquip(s: any): Equip {
  if (s.equip && Array.isArray(s.equip.tools)) {
    const base = freshEquip();
    return { ...base, ...s.equip, venture: { ...base.venture, ...s.equip.venture }, sewing: { ...base.sewing, ...s.equip.sewing } };
  }
  const e = freshEquip();
  const machine = (s.tools || []).find((t: any) => t.kind === 'machine');
  if (machine) e.sewing.mins = Math.round((machine.uses || 0) * 60);
  return e;
}

/* ---------- seam: each body sewn round its edge and topstitched, each strap along its length and ends, plus 10% ---------- */
const IN_YD = 1 / 36;
export function seamOf(s: Shop, k: string) {
  const z: any = s.sizes[k] || {};
  const m: any = s.sizes.M || {};
  const cw = z.cw || m.cw || 11,
    cl = z.cl || m.cl || 8;
  const st = s.straps.find(x => x.id === z.strap);
  const body = 2 * 2 * (cw + cl) * 1.1 * IN_YD;
  const strap = !st || st.id === 'none' ? 0 : (st.l * 1.2 + 2 * st.w) * 1.1 * IN_YD;
  return { body, strap, total: body + strap, hasStrap: !!st && st.id !== 'none' };
}
export function runSeam(s: Shop, r: Run) {
  let m = 0,
    b = 0,
    st = 0;
  Object.entries(r.qty || {}).forEach(([k, q]) => {
    if (!q) return;
    const x = seamOf(s, k);
    m += q * x.total;
    b += q;
    if (x.hasStrap) st += q;
  });
  return { m, b, s: st };
}
/** Cuts a run makes on the blade: one per body, and one per strap */
export function cutsForRun(s: Shop, r: Run) {
  return Object.entries(r.qty || {}).reduce((a, [k, q]) => a + (q || 0) * (seamOf(s, k).hasStrap ? 2 : 1), 0);
}
export const seamYd = (y: number) => `${Math.round(y)} yd`;
export const seamBand = (s: Shop, y: number) => Math.max(1, Math.round(y / seamOf(s, 'M').total));

/* ---------- states ---------- */
export function toolState(t: EquipTool) {
  const life = t.life,
    used = t.cuts || 0,
    since = used - (t.lastCheck || 0);
  const pct = life ? Math.max(0, 1 - used / life) : null;
  const checkIn = t.check ? t.check - since : null;
  let tone: 'ok' | 'warn' | 'bad' = 'ok',
    label = life ? `${Math.round(pct! * 100)}% left` : 'No lifespan';
  if (life && used >= life) {
    tone = 'bad';
    label = 'Past its lifespan';
  } else if (checkIn != null && checkIn <= 0) {
    tone = 'warn';
    label = 'Check due';
  } else if (life && pct! <= 0.15) {
    tone = 'warn';
    label = 'Nearly worn';
  }
  return { life, used, since, pct, checkIn, tone, label };
}
export function taskState(e: Equip, t: EquipTask) {
  let done: number;
  if (t.unit === 'hours') done = ((e.sewing.mins || 0) - (+t.last || 0)) / 60;
  else if (t.unit === 'mats') done = (e.venture.mats || 0) - (+t.last || 0);
  else if (t.unit === 'seam') done = (e.sewing.seam || 0) - (+t.last || 0);
  else done = typeof t.last === 'string' && t.last ? Math.round((Date.parse(todayDay()) - Date.parse(t.last)) / 864e5) : 0;
  const p = t.every ? done / t.every : 0;
  return { done, p, due: p >= 1, soon: p >= 0.85 && p < 1, left: Math.max(0, t.every - done) };
}
export function taskLeft(s: Shop, t: EquipTask, st: ReturnType<typeof taskState>) {
  if (t.unit === 'hours') return st.due ? `${(st.done - t.every).toFixed(1)}h over` : `in ${st.left.toFixed(1)}h of sewing`;
  if (t.unit === 'mats') return st.due ? `${Math.round(st.done - t.every)} mats over` : `in ${Math.round(st.left)} mats`;
  if (t.unit === 'seam') return st.due ? `${seamYd(st.done - t.every)} over` : `in ~${seamBand(s, st.left)} bandanas`;
  return st.due ? `${Math.round(st.done - t.every)} days over` : `in ${Math.round(st.left)} days`;
}
export const TASK_U: Record<TaskUnit, string> = { hours: 'hours of sewing', days: 'days', mats: 'mats cut', seam: 'yd of seam' };
const med = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
/** What your past blades really lasted (two or more, leaving out ones that broke) */
export function toolLearned(t: EquipTool) {
  const h = t.history.filter(x => x.why !== 'Chipped or broke').map(x => x.cuts).filter(x => x > 0);
  return h.length >= 2 ? Math.round(med(h) / 10) * 10 : null;
}
export const unitWord = (t: EquipTool) => (t.kind === 'mat' ? 'passes' : 'cuts');
export const inMachine = (e: Equip) => e.tools.find(t => t.id === e.venture.clamp) || null;
/** Tools you've actually used (the rest fold away) */
export const usedTool = (e: Equip, t: EquipTool) => t.cuts > 0 || e.venture.clamp === t.id || t.history.length > 0;

