/* Reminders as Windows notifications: orders due tomorrow, overdue payments, things to restock, a timer left running,
   tools due, quotes about to lapse. Each is sent once; the daily ones after your chosen hour. */
import { addDays, rel, timerMs, todayDay } from '../lib/plan';
import { toolDue, unitOf } from './planning';
import { isLate, saleOwed } from './selling';
import { restockList } from './shelf';
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
  const r = s.cfg.remind;
  const out: Reminder[] = [];
  const today = todayDay();
  if (r.orders)
    s.orders
      .filter(o => o.status !== 'delivered' && o.due && (rel(o.due) ?? 99) <= 1)
      .forEach(o => {
        const c = s.customers.find(x => x.id === o.cust);
        const d = rel(o.due)!;
        out.push({ key: `order:${o.id}:${today}`, title: d < 0 ? 'An order is late' : d === 0 ? 'An order is due today' : 'An order is due tomorrow', body: o.title || (c ? c.name : 'Order'), daily: true });
      });
  if (r.payments) {
    const late = s.sales.filter(isLate);
    if (late.length) out.push({ key: `pay:${late.length}:${today}`, title: `${late.length} payment${late.length === 1 ? '' : 's'} overdue`, body: `$${late.reduce((a, e) => a + saleOwed(e), 0).toFixed(2)} owed to you`, daily: true });
  }
  if (r.restock) {
    const rs = restockList(s).filter(i => !(i.x.onOrder > 0));
    if (rs.length) out.push({ key: `restock:${rs.map(i => i.x.id).sort().join(',')}`, title: `${rs.length} thing${rs.length === 1 ? '' : 's'} to restock`, body: rs.slice(0, 3).map(i => i.x.name).join(', '), daily: true });
  }
  if (r.tools) s.tools.filter(toolDue).forEach(t => out.push({ key: `tool:${t.id}:${t.since}`, title: `${t.name} is due`, body: `${Math.round(t.uses)} of ${t.life} ${unitOf(t)}`, daily: true }));
  if (r.quotes) s.quotes.filter(q => q.status === 'sent' && rel(q.until) === 1).forEach(q => out.push({ key: `quote:${q.id}:${q.until}`, title: `Quote ${q.no} ends tomorrow`, body: q.title || 'Follow up before the price ends', daily: true }));
  if (r.timer && s.timer && !s.timer.paused && timerMs(s.timer) > s.cfg.staleMins * 6e4) {
    const run = s.runs.find(x => x.id === s.timer!.run);
    const st = run?.steps.find(x => x.id === s.timer!.step);
    out.push({ key: `timer:${s.timer.start}:${s.timer.checked || 0}`, title: 'Is your timer still going?', body: `${st ? st.name : 'A step'} has been timing for over ${Math.round(s.cfg.staleMins / 60)} hours`, daily: false });
  }
  return out;
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
