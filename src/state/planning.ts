/* Calendar, goals and maintenance. */
import { todayDay } from '../lib/plan';
import { change, newId, update, withLog } from './store';
import type { CalEvent, Tool } from './types';

export function addEvent(p: Partial<CalEvent> = {}): string {
  const id = newId('ev');
  change(s => ({ ...s, cal: [...s.cal, { day: todayDay(), title: 'Market', kind: 'market', days: 1, notes: '', ...p, id } as CalEvent] }));
  return id;
}
export const editEvent = (id: string, p: Partial<CalEvent>) => change(s => ({ ...s, cal: s.cal.map(e => (e.id === id ? { ...e, ...p } : e)) }));
export const deleteEvent = (id: string) => change(s => ({ ...s, cal: s.cal.filter(e => e.id !== id) }));
export const restoreEvent = (e: CalEvent) => change(s => ({ ...s, cal: [...s.cal, e] }));

export const setGoals = (p: Partial<{ income: number; hours: number }>) => update(s => ({ ...s, goals: { ...s.goals, ...p } }));

export function addTool(): string {
  const id = newId('tl');
  update(s => ({ ...s, tools: [...s.tools, { id, name: 'New tool', kind: 'other', uses: 0, life: 100, since: todayDay(), notes: '', log: [] }] }));
  return id;
}
export const editTool = (id: string, p: Partial<Tool>) => update(s => ({ ...s, tools: s.tools.map(t => (t.id === id ? { ...t, ...p } : t)) }));
export const deleteTool = (id: string) => update(s => ({ ...s, tools: s.tools.filter(t => t.id !== id) }));
/** Replaced or serviced: the count starts again, and it's logged */
export function resetTool(id: string, text: string) {
  update(s => {
    const t = s.tools.find(x => x.id === id);
    if (!t) return s;
    return withLog({ ...s, tools: s.tools.map(x => (x.id === id ? { ...x, uses: 0, since: todayDay(), log: [{ day: todayDay(), text: `${text} after ${Math.round(t.uses)} ${unitOf(t)}` }, ...x.log].slice(0, 50) } : x)) }, `${text.toLowerCase()} the ${t.name.toLowerCase()}`, `${Math.round(t.uses)} ${unitOf(t)}`);
  });
}
export const unitOf = (t: Tool) => (t.kind === 'machine' ? 'hours sewn' : t.kind === 'blade' ? 'mats cut' : t.kind === 'mat' ? 'mats loaded' : 'uses');
export const toolDue = (t: Tool) => t.life > 0 && t.uses >= t.life * 0.9;
