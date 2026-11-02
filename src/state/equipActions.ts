/* Changes to your machines: checks, replacements, which blade is in, upkeep done. */
/* ---------- actions ---------- */
import { todayDay } from '../lib/plan';
import { getShop, update, withLog } from './store';
import { toolLearned, unitWord, type Equip, type EquipTask, type EquipTool } from './equip';
const setEquip = (fn: (e: Equip) => Equip, log?: [string, string]) => update(s => (log ? withLog({ ...s, equip: fn(s.equip) }, log[0], log[1]) : { ...s, equip: fn(s.equip) }));
const mapTool = (e: Equip, id: string, fn: (t: EquipTool) => EquipTool) => ({ ...e, tools: e.tools.map(t => (t.id === id ? fn(t) : t)) });
export const editEquipTool = (id: string, p: Partial<EquipTool>) => setEquip(e => mapTool(e, id, t => ({ ...t, ...p })));
export const setClamp = (id: string) => setEquip(e => ({ ...e, venture: { ...e.venture, clamp: id } }), ['put the ' + (getShop().equip.tools.find(t => t.id === id)?.name || 'blade').toLowerCase() + ' in the machine', '']);
/** Looked at it and it's fine: the next check counts from here */
export const checkTool = (id: string) => setEquip(e => mapTool(e, id, t => ({ ...t, lastCheck: t.cuts })), ['checked the ' + (getShop().equip.tools.find(t => t.id === id)?.name || 'blade').toLowerCase(), 'still good']);
/** A new one went in: remember what the old one lasted */
export function replaceTool(id: string, why: string) {
  const t0 = getShop().equip.tools.find(t => t.id === id);
  if (!t0) return;
  setEquip(e => ({ ...mapTool(e, id, t => ({ ...t, cuts: 0, lastCheck: 0, history: [{ day: todayDay(), cuts: t.cuts, why }, ...t.history].slice(0, 20) })), log: [{ day: todayDay(), text: `Replaced the ${t0.name} at ${t0.cuts} ${unitWord(t0)}` }, ...e.log].slice(0, 50) }), [`replaced the ${t0.name.toLowerCase()}`, `${t0.cuts} ${unitWord(t0)} · ${why.toLowerCase()}`]);
}
export function adoptLearned(id: string) {
  const t = getShop().equip.tools.find(x => x.id === id);
  const l = t && toolLearned(t);
  if (l) editEquipTool(id, { life: l, est: false });
}
export function taskDone(id: string) {
  const e0 = getShop().equip;
  const t0 = e0.tasks.find(t => t.id === id);
  if (!t0) return;
  const now = t0.unit === 'hours' ? e0.sewing.mins : t0.unit === 'mats' ? e0.venture.mats : t0.unit === 'seam' ? e0.sewing.seam : todayDay();
  setEquip(e => ({ ...e, tasks: e.tasks.map(t => (t.id === id ? { ...t, last: now } : t)), log: [{ day: todayDay(), text: t0.name }, ...e.log].slice(0, 50) }), [t0.name.toLowerCase(), '']);
}
export const editTask = (id: string, p: Partial<EquipTask>) => setEquip(e => ({ ...e, tasks: e.tasks.map(t => (t.id === id ? { ...t, ...p } : t)) }));
export const addTask = (machine: 'venture' | 'sewing') => {
  const id = 'tk' + Date.now().toString(36);
  setEquip(e => ({ ...e, tasks: [...e.tasks, { id, machine, name: 'New task', unit: machine === 'venture' ? 'mats' : 'hours', every: machine === 'venture' ? 40 : 10, last: machine === 'venture' ? e.venture.mats : e.sewing.mins, why: '' }] }));
  return id;
};
export const deleteTask = (id: string) => setEquip(e => ({ ...e, tasks: e.tasks.filter(t => t.id !== id) }));
export const setMachineName = (m: 'venture' | 'sewing', name: string) => setEquip(e => ({ ...e, [m]: { ...e[m], name } }));
