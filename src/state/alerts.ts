/* Reminders: one list behind the bell, on Today and in Windows notifications, ranked like the prototype.
   Each can be dismissed (gone until it changes) or snoozed (back later). */
import { mins, money, plural, relDue, yd } from '../lib/format';
import { addDays, rel, schedule, timerMs, todayDay, unitMinutes } from '../lib/plan';
import { toolDue, unitOf } from './planning';
import { freeStock, isLate, orderCount, saleOwed, saleTotal } from './selling';
import { restockList } from './shelf';
import { getShop, update } from './store';
import type { Shop } from './types';

export type AlertTone = 'bad' | 'warn' | 'info';
export type AlertIcon = 'clock' | 'runs' | 'cart' | 'fabric' | 'price' | 'coin' | 'wrench' | 'wallet';
export type AlertKind = 'timer' | 'due' | 'orders' | 'restock' | 'quotes' | 'market' | 'tools' | 'payments';
export interface Alert {
  id: string;
  kind: AlertKind;
  tone: AlertTone;
  icon: AlertIcon;
  t: string;
  s: string;
  act: { label: string; route: string; id?: string };
  rank: number;
}

/** Reminder types, in the order Settings lists them */
export const REM_KINDS: [AlertKind, string, string, AlertIcon][] = [
  ['timer', 'Timers left running', 'Past your check-in time', 'clock'],
  ['due', 'Runs due soon', 'Late, or due in the next few days', 'runs'],
  ['orders', 'Orders to plan', 'Due within a week and not planned, or won’t fit', 'cart'],
  ['restock', 'Running low', 'Fabric and supplies at or under their low mark', 'fabric'],
  ['quotes', 'Quotes ending', 'Ending soon or already ended', 'price'],
  ['market', 'Market prep', 'A market day in the next few days', 'coin'],
  ['tools', 'Maintenance', 'Blades, mats, needles and machines due', 'wrench'],
  ['payments', 'Payments overdue', 'Money owed past its due date', 'wallet'],
];

const short = (n: string) => (n || 'Untitled run').split(' — ')[0];
const dshort = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export const leftMins = (r: Shop['runs'][number]) => r.steps.filter(s => !s.done).reduce((a, s) => a + (s.est || 0), 0);
const custName = (s: Shop, id: string | null | undefined, fallback = '') => s.customers.find(c => c.id === id)?.name || fallback;

/** Free working minutes from today up to and including the given day, after planned runs */
function freeUntil(sc: { cap: number[]; used: number[] }, d: number) {
  let f = 0;
  for (let i = 0; i <= Math.min(d, sc.cap.length - 1); i++) f += Math.max(0, sc.cap[i] - sc.used[i]);
  return f;
}

/** Does an order fit your free hours before its due date? (the prototype's fitOf) */
export function orderFit(s: Shop, o: Shop['orders'][number], sc?: { cap: number[]; used: number[] }) {
  const sched = sc || schedule(s);
  const need = Math.round(Object.entries(o.qty).reduce((a, [k, n]) => a + (n || 0) * (unitMinutes(s, k) || 0), 0));
  const d = rel(o.due);
  let cap = 0,
    busy = 0;
  if (d != null && d >= 0)
    for (let i = 0; i <= Math.min(d, sched.cap.length - 1); i++) {
      cap += sched.cap[i];
      busy += Math.min(sched.used[i], sched.cap[i]);
    }
  const fits = d != null && d >= 0 && busy + need <= cap;
  let byDay: number | null = null,
    acc = 0;
  for (let i = 0; i < sched.cap.length; i++) {
    acc += Math.max(0, sched.cap[i] - sched.used[i]);
    if (acc >= need) {
      byDay = i;
      break;
    }
  }
  return { need, cap, busy, fits, short: Math.max(0, busy + need - cap), byDay };
}

export function alertsAll(s: Shop, now = Date.now()): Alert[] {
  const R = s.cfg.remind;
  const L: Alert[] = [];
  const add = (a: Alert) => {
    if ((R as any)[a.kind] !== false) L.push(a);
  };
  const m = s.timer;
  if (m && timerMs(m) > s.cfg.staleMins * 6e4 && (!m.checked || now - m.checked > s.cfg.staleMins * 6e4)) {
    const r = s.runs.find(x => x.id === m.run);
    const st = r?.steps.find(x => x.id === m.step);
    add({ id: `stale:${m.start}`, kind: 'timer', tone: 'bad', icon: 'clock', t: 'Your timer is still running', s: `${st ? st.name + ' · ' : ''}${mins(Math.round(timerMs(m) / 6e4))} so far, past your ${mins(s.cfg.staleMins)} limit`, act: { label: 'Open timer', route: 'workflow', id: m.run }, rank: 0 });
  }
  const days = R.days || 2;
  s.runs
    .filter(r => r.status !== 'done' && r.due && leftMins(r) > 0)
    .forEach(r => {
      const d = rel(r.due)!;
      const left = `~${mins(leftMins(r))} of work left`;
      if (d < 0) add({ id: `late:${r.id}:${d}`, kind: 'due', tone: 'bad', icon: 'runs', t: `${short(r.name)} is ${relDue(d).toLowerCase()}`, s: left, act: { label: 'Open run', route: 'runs', id: r.id }, rank: 1 + d / 100 });
      else if (d <= days) add({ id: `due:${r.id}:${d}`, kind: 'due', tone: 'warn', icon: 'runs', t: `${short(r.name)} is ${relDue(d).toLowerCase()}`, s: left, act: { label: 'Open run', route: 'runs', id: r.id }, rank: 2 + d / 10 });
    });
  const toPlan = s.orders.filter(o => o.status !== 'delivered' && !o.run && !o.fromStock.length && o.due && (rel(o.due) ?? 99) <= 21);
  if (toPlan.length) {
    const sc = schedule(s);
    toPlan.forEach(o => {
      const pcs = orderCount(o);
      if (!pcs) return;
      const d = rel(o.due)!;
      const need = Object.entries(o.qty).reduce((a, [k, n]) => a + (n || 0) * (unitMinutes(s, k) || 0), 0);
      const free = d < 0 ? 0 : freeUntil(sc, d);
      const who = custName(s, o.cust, o.title || 'a customer');
      if (need > free) add({ id: `fit:${o.id}:${o.due}`, kind: 'orders', tone: 'warn', icon: 'cart', t: `Order for ${who} won’t fit by ${dshort(o.due!)}`, s: `${mins(Math.round(need - free))} short. Move the date or split the order`, act: { label: 'Open order', route: 'orders', id: o.id }, rank: 2.5 });
      else if (d <= 7) add({ id: `plan:${o.id}:${o.due}`, kind: 'orders', tone: 'info', icon: 'cart', t: `Plan the order for ${who}`, s: `${plural(pcs, 'bandana')} due ${dshort(o.due!)}, not planned yet`, act: { label: 'Plan it', route: 'orders', id: o.id }, rank: 4 + d / 10 });
    });
  }
  s.orders
    .filter(o => o.status !== 'delivered' && o.due && (o.run || o.fromStock.length) && (rel(o.due) ?? 99) <= 1)
    .forEach(o => {
      const d = rel(o.due)!;
      const who = custName(s, o.cust, o.title || 'a customer');
      add({ id: `odue:${o.id}:${o.due}`, kind: 'orders', tone: d < 0 ? 'bad' : 'warn', icon: 'cart', t: `Order for ${who} is ${relDue(d).toLowerCase()}`, s: o.title || `${plural(orderCount(o), 'bandana')}`, act: { label: 'Open order', route: 'orders', id: o.id }, rank: d < 0 ? 1.2 : 2.4 });
    });
  restockList(s)
    .filter(i => !(i.x.onOrder > 0))
    .forEach(i => {
      const fab = i.kind === 'fabric';
      const x: any = i.x;
      add({
        id: `low:${x.id}:${Math.round((fab ? x.yards : x.qty) * 10)}`,
        kind: 'restock',
        tone: 'warn',
        icon: 'fabric',
        t: fab && x.yards > 0 ? `${x.name} is low` : fab ? `${x.name} is out` : `${x.name} is running low`,
        s: fab ? `${yd(x.yards)} left · ${i.reason}` : `${x.qty} ${x.unit || ''} left · ${i.reason}`.replace(/\s+/g, ' '),
        act: { label: 'Reorder', route: fab ? 'fabric' : 'supplies', id: x.id },
        rank: 3,
      });
    });
  s.quotes
    .filter(q => q.status === 'sent')
    .forEach(q => {
      const d = rel(q.until);
      const who = custName(s, q.cust, q.title || 'a customer');
      if (d == null) return;
      if (d < 0) add({ id: `qexp:${q.id}`, kind: 'quotes', tone: 'info', icon: 'price', t: `Quote for ${who} has ended`, s: 'Follow up or send it again', act: { label: 'Open quote', route: 'quotes', id: q.id }, rank: 5 });
      else if (d <= 3) add({ id: `qsoon:${q.id}:${d}`, kind: 'quotes', tone: 'warn', icon: 'price', t: `Quote for ${who} ends ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'}`, s: q.title || q.no, act: { label: 'Open quote', route: 'quotes', id: q.id }, rank: 3.5 });
    });
  if (!s.market.open) {
    const ev = s.cal.filter(e => e.kind === 'market' && (rel(e.day) ?? -1) >= 0 && (rel(e.day) ?? 9) <= 3).sort((a, b) => a.day.localeCompare(b.day))[0];
    if (ev) {
      const d = rel(ev.day)!;
      const ready = Object.values(freeStock(s)).reduce((a, b) => a + b, 0);
      add({ id: `mkt:${ev.id}:${d}`, kind: 'market', tone: 'warn', icon: 'coin', t: `${ev.title} ${d === 0 ? 'is today' : d === 1 ? 'is tomorrow' : 'is ' + dshort(ev.day).split(',')[0]}`, s: `${plural(ready, 'bandana')} ready to sell`, act: { label: 'Open market day', route: 'market' }, rank: 2.2 });
    }
  }
  s.tools.filter(toolDue).forEach(t => {
    const past = t.uses >= t.life;
    add({ id: `tl:${t.id}:${t.since}:${past ? 1 : 0}`, kind: 'tools', tone: past ? 'bad' : 'warn', icon: 'wrench', t: past ? `${t.name} is past its lifespan` : `${t.name} is due soon`, s: `${Math.round(t.uses)} of ${t.life} ${unitOf(t)}${past ? '. Replace it before the next use' : ''}`, act: { label: 'Open maintenance', route: 'maintenance' }, rank: past ? 1.5 : 3.2 });
  });
  s.sales.filter(isLate).forEach(e => {
    const who = custName(s, e.cust, e.ch || 'Someone');
    add({ id: `pay:${e.id}:${saleOwed(e)}`, kind: 'payments', tone: 'warn', icon: 'wallet', t: `${who} owes ${money(saleOwed(e))}`, s: `${e.ref || money(saleTotal(e))} · was due ${dshort(e.due!)}`, act: { label: 'Open payment', route: 'sales', id: e.id }, rank: 2.8 });
  });
  return L.sort((a, b) => a.rank - b.rank);
}

const st = (s: Shop) => s.alertSt || { dis: {}, snz: {}, seen: {} };
/** What's showing now: not dismissed and not snoozed */
export const alertsNow = (s: Shop, now = Date.now()) => {
  const a = st(s);
  return alertsAll(s, now).filter(x => !a.dis[x.id] && !((a.snz[x.id] || 0) > now));
};
export const alertsSnoozed = (s: Shop, now = Date.now()) => {
  const a = st(s);
  return alertsAll(s, now).filter(x => !a.dis[x.id] && (a.snz[x.id] || 0) > now);
};
export const unseenCount = (s: Shop) => alertsNow(s).filter(x => !st(s).seen[x.id]).length;

const setSt = (fn: (a: NonNullable<Shop['alertSt']>) => NonNullable<Shop['alertSt']>) => update(s => ({ ...s, alertSt: fn(st(s)) }));
export const dismissAlert = (id: string) => setSt(a => ({ ...a, dis: { ...a.dis, [id]: todayDay() } }));
export const undismissAlert = (id: string) => setSt(a => { const { [id]: _, ...dis } = a.dis; return { ...a, dis }; });
export const snoozeAlert = (id: string, until: number) => setSt(a => ({ ...a, snz: { ...a.snz, [id]: until } }));
export const unsnoozeAlert = (id: string) => setSt(a => { const { [id]: _, ...snz } = a.snz; return { ...a, snz }; });
export const markSeen = () => {
  const ids = alertsNow(getShop()).map(x => x.id);
  if (ids.every(id => st(getShop()).seen[id])) return;
  setSt(a => ({ ...a, seen: { ...a.seen, ...Object.fromEntries(ids.map(id => [id, todayDay()])) } }));
};
/** Forget dismissals, snoozes and seen marks older than six weeks so the file stays small */
export function pruneAlerts() {
  const cutoff = addDays(todayDay(), -45);
  const now = Date.now();
  setSt(a => ({
    dis: Object.fromEntries(Object.entries(a.dis).filter(([, d]) => d >= cutoff)),
    seen: Object.fromEntries(Object.entries(a.seen).filter(([, d]) => d >= cutoff)),
    snz: Object.fromEntries(Object.entries(a.snz).filter(([, t]) => t > now)),
  }));
}

/** Snooze choices: later today (before 5pm), tomorrow 8am, next Monday 8am */
export function snoozeOptions(now = new Date()): [string, string, string][] {
  return [...(now.getHours() < 17 ? [['3h', 'Later today', 'In 3 hours'] as [string, string, string]] : []), ['tom', 'Tomorrow', '8 AM'], ['wk', 'Next week', 'Monday, 8 AM']];
}
export function snoozeUntil(v: string, now = new Date()) {
  const t = new Date(now);
  if (v === '3h') return now.getTime() + 3 * 36e5;
  if (v === 'wk') {
    const d = (8 - t.getDay()) % 7 || 7;
    t.setDate(t.getDate() + d);
    t.setHours(8, 0, 0, 0);
    return t.getTime();
  }
  t.setDate(t.getDate() + 1);
  t.setHours(8, 0, 0, 0);
  return t.getTime();
}
export function snoozeWhen(ms: number, now = new Date()) {
  const d = new Date(ms);
  const day = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5);
  const tm = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined });
  return day <= 0 ? 'later today, ' + tm : day === 1 ? 'tomorrow, ' + tm : d.toLocaleDateString('en-US', { weekday: 'long' }) + ', ' + tm;
}
