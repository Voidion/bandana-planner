/* Reminders as Windows notifications: the same list as the bell, each sent once.
   Everything except a timer left running and your own event reminders waits for your chosen hour. Dismissed or snoozed ones aren't sent. */
import { addDays, todayDay } from '../lib/plan';
import { alertsNow } from './alerts';
import { notify } from './storage';
import { getShop, update } from './store';
import type { Shop } from './types';

export interface Reminder {
  key: string;
  title: string;
  body: string;
  /** Daily ones wait for your reminder hour */
  daily: boolean;
}

export function reminders(s: Shop): Reminder[] {
  return alertsNow(s).map(a => ({ key: a.id, title: a.t, body: a.s, daily: a.kind !== 'timer' && a.kind !== 'events' }));
}

/** Sends any reminders that are due and haven't been sent. Call it every minute or so. */
export async function sendReminders(now = new Date()) {
  const s = getShop();
  if (!s.cfg.remind.on) return;
  const due = reminders(s).filter(x => !s.notified[x.key] && (!x.daily || now.getHours() >= s.cfg.remind.hour));
  if (!due.length) return;
  for (const x of due.slice(0, 3)) await notify(x.title, x.body);
  const cutoff = addDays(todayDay(), -45);
  update(q => ({
    ...q,
    notified: { ...Object.fromEntries(Object.entries(q.notified).filter(([, d]) => d >= cutoff)), ...Object.fromEntries(due.map(x => [x.key, todayDay()])) },
  }));
}
