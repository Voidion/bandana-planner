/* Schedule, laid out like the prototype: Day / Week / Month / List, a quick-add line, filters for what shows, and
   beside the calendar the chosen day and how the next 7 days fill up. Everything with a date is on it: run due
   dates, market days, orders due, fabric arriving, quotes ending, and your own events (repeating, with reminders).
   Drag a chip to another day in Month, or a timed event to another time in Day. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { dayLabel, fmtN, mins, money, plural, relDue } from '../lib/format';
import { addDays, quoteTotals, rel, schedule, todayDay } from '../lib/plan';
import { addMin, clock12, parseQuick } from '../lib/quickAdd';
import { calOccurrences } from '../state/alerts';
import { addEvent, deleteEvent, editEvent, restoreEvent } from '../state/planning';
import { change, useShop } from '../state/store';
import type { CalEvent, Shop } from '../state/types';
import { ChevIcon, PlusIcon, WarnIcon } from '../ui/icons';
import { Button, Field, NumField, Segmented, Select, Sheet, showSnack, T } from '../ui/kit';
import { CalendarSheet, LinkText, Note, PageHead, Sect, WList } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';
import { WeekBars } from './TodayScreen';

type Go = (route: string, id?: string) => void;
type View_ = 'day' | 'week' | 'month' | 'list';
type Cat = 'run' | 'order' | 'market' | 'fabric' | 'quote' | 'mine';
const FABRIC = '#6b7fb3';
const REP_LAB: Record<string, string> = { w: 'Every week', '2w': 'Every 2 weeks', m: 'Every month' };
const MARKET = '#4E6A4A';
const KIND: Record<CalEvent['kind'], [string, string]> = { market: ['Market day', MARKET], pickup: ['Pickup or drop-off', '#b5643c'], sew: ['Sewing block', ''], off: ['Day off', ''], other: ['Other', ''] };
/** mv: what dragging it changes (a run's or order's due date, a quote's end, an event's day) */
interface Item { key: string; d: number; t: string; s: string; c: string; cat: Cat; go?: [string, string?]; ev?: string; time?: string; dur?: number; mv?: ['run' | 'ord' | 'q' | 'ev', string] }

const short = (n: string) => (n || 'Untitled run').split(' — ')[0];
function calItems(shop: Shop, th: ReturnType<typeof useTheme>, sc: ReturnType<typeof schedule>): Item[] {
  const items: Item[] = [];
  const kc = (k: CalEvent['kind']) => KIND[k][1] || (k === 'sew' ? th.barA : th.text3);
  shop.runs.filter(r => r.status !== 'done' && r.due).forEach(r => {
    const d = rel(r.due)!;
    const left = r.steps.filter(s => !s.done).reduce((a, s) => a + s.est, 0);
    const late = d < 0 || sc.late.includes(r.id);
    items.push({ key: 'run-' + r.id, d, t: `${short(r.name)} due`, s: `${d < 0 ? relDue(d) + ' · ' : ''}~${mins(left)} left`, c: late ? th.danger : th.barA, cat: 'run', go: ['runs', r.id], mv: ['run', r.id] });
  });
  shop.orders.filter(o => o.status !== 'delivered' && o.due && !o.run && !o.fromStock.length).forEach(o => {
    const who = shop.customers.find(c => c.id === o.cust)?.name || o.title || 'Order';
    items.push({ key: 'ord-' + o.id, d: rel(o.due)!, t: `${who} order due`, s: 'Not planned yet', c: th.action, cat: 'order', go: ['orders', o.id], mv: ['ord', o.id] });
  });
  shop.quotes.filter(q => q.status === 'sent' && q.until).forEach(q => {
    const who = shop.customers.find(c => c.id === q.cust)?.name || q.title || 'Quote';
    let tot = '';
    try { tot = money(quoteTotals(shop, q).total); } catch { tot = q.no || ''; }
    items.push({ key: 'q-' + q.id, d: rel(q.until)!, t: `${who} quote ends`, s: tot, c: th.text3, cat: 'quote', go: ['quotes', q.id], mv: ['q', q.id] });
  });
  const mk = shop.market;
  if (mk.day && !shop.cal.some(e => e.kind === 'market' && e.day === mk.day)) items.push({ key: 'mk', d: rel(mk.day)!, t: mk.name || 'Market day', s: `Market day${mk.hours ? ` · ${mk.hours}h at the stall` : ''}`, c: MARKET, cat: 'market', go: ['market'] });
  shop.fabrics.filter(f => f.onOrder > 0 && f.orderedOn).forEach(f => {
    const lead = f.lead ?? shop.suppliers.find(x => x.id === f.sup)?.lead ?? 7;
    const day = addDays(f.orderedOn!, lead);
    items.push({ key: 'fab-' + f.id, d: rel(day)!, t: `${f.name} arrives`, s: `About · ${fmtN(f.onOrder)} yd on order`, c: FABRIC, cat: 'fabric', go: ['fabric', f.id] });
  });
  calOccurrences(shop, -120, 400).forEach(({ e, day }) => {
    const n = Math.max(1, e.days || 1);
    const d0 = rel(day)!;
    for (let j = 0; j < n; j++) {
      const off = e.kind === 'market' || e.kind === 'off';
      items.push({
        key: `cal-${e.id}-${day}-${j}`, d: d0 + j, ev: e.id, cat: e.kind === 'market' ? 'market' : 'mine', c: kc(e.kind), mv: ['ev', e.id],
        t: (e.title || 'Untitled') + (n > 1 ? ` (day ${j + 1} of ${n})` : ''),
        s: [n > 1 ? `${dayLabel(day, { month: 'short', day: 'numeric' })}–${dayLabel(addDays(day, n - 1), { month: 'short', day: 'numeric' })}` : '', KIND[e.kind][0], e.loc || '', e.rep ? REP_LAB[e.rep] : '', off ? 'day off for runs' : '', e.notes || ''].filter(Boolean).join(' · '),
        ...(e.time && !j ? { time: e.time, dur: e.dur || 60 } : {}),
      });
    }
  });
  return items.filter(x => x.d != null && isFinite(x.d)).sort((a, b) => a.d - b.d || (a.time || '').localeCompare(b.time || ''));
}
/** Moves something on the calendar by whole days (and an event to a new start time) */
function moveItem(mv: NonNullable<Item['mv']>, delta: number, time?: string) {
  const [k, id] = mv;
  if (!delta && !time) return;
  change(s => {
    if (k === 'run') return { ...s, runs: s.runs.map(r => (r.id === id && r.due ? { ...r, due: addDays(r.due, delta) } : r)) };
    if (k === 'ord') return { ...s, orders: s.orders.map(o => (o.id === id && o.due ? { ...o, due: addDays(o.due, delta) } : o)) };
    if (k === 'q') return { ...s, quotes: s.quotes.map(q => (q.id === id ? { ...q, until: addDays(q.until, delta) } : q)) };
    return { ...s, cal: s.cal.map(e => (e.id === id ? { ...e, day: addDays(e.day, delta), ...(time ? { time } : {}) } : e)) };
  });
}
/** A chip that can be dragged; a tap still opens it */
function Draggable({ item, onDrop, onTap, children, style }: { item: Item; onDrop: (dx: number, dy: number) => void; onTap: () => void; children: React.ReactNode; style?: any }) {
  const [off, setOff] = useState<{ x: number; y: number } | null>(null);
  const pr = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 5,
        onPanResponderMove: (_, g) => setOff({ x: g.dx, y: g.dy }),
        onPanResponderRelease: (_, g) => {
          setOff(null);
          if (Math.abs(g.dx) + Math.abs(g.dy) <= 5) onTap();
          else onDrop(g.dx, g.dy);
        },
        onPanResponderTerminate: () => setOff(null),
      }),
    [onDrop, onTap],
  );
  return (
    <View {...(item.mv ? pr.panHandlers : {})} accessibilityRole="button" accessibilityLabel={item.t} accessibilityHint={item.mv ? 'Drag to move it' : undefined}
      style={[style, off ? { transform: [{ translateX: off.x }, { translateY: off.y }], zIndex: 50, opacity: 0.9 } : null]}>
      {item.mv ? children : <Pressable onPress={onTap}>{children}</Pressable>}
    </View>
  );
}
const dateOf = (d: number) => new Date(addDays(todayDay(), d) + 'T12:00:00');
const fmtD = (d: number, o: Intl.DateTimeFormatOptions) => dateOf(d).toLocaleDateString('en-US', o);

export function ScheduleScreen({ go }: { go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const sc = useMemo(() => schedule(shop, 56), [shop]);
  const [view, setView] = useState<View_>('month');
  const [sel, setSel] = useState(0);
  const [mo, setMo] = useState(0);
  const [q, setQ] = useState('');
  const [hide, setHide] = useState<Partial<Record<Cat, boolean>>>({});
  const [edit, setEdit] = useState<string | null>(null);
  const [w, setW] = useState(1200);
  const [cell, setCell] = useState({ w: 120, h: 104 });
  const dayScroll = useRef<ScrollView>(null);
  const all = calItems(shop, t, sc);
  const items = all.filter(x => !hide[x.cat]);
  const byDay: Record<number, Item[]> = {};
  items.forEach(x => (byDay[x.d] = byDay[x.d] || []).push(x));
  const preview = parseQuick(q);
  const wide = w >= 980;
  // Day view opens at the first timed thing that day, or an hour before now on today, or 8 AM
  const firstTimed = (byDay[sel] || []).filter(x => x.time).map(x => +x.time!.slice(0, 2) * 60 + +x.time!.slice(3));
  const topM = sel === 0 ? Math.max(8 * 60, new Date().getHours() * 60 - 60) : firstTimed.length ? Math.min(...firstTimed) - 30 : 8 * 60;
  useEffect(() => {
    if (view !== 'day') return;
    const y = Math.max(0, ((topM - 6 * 60) / 60) * 52);
    const id = setTimeout(() => dayScroll.current?.scrollTo({ y, animated: false }), 30);
    return () => clearTimeout(id);
  }, [view, sel, topM]);
  const quickAdd = () => {
    if (!preview) return;
    const id = addEvent(preview);
    setQ('');
    const d = rel(preview.day)!;
    setSel(d);
    setMo((dateOf(d).getFullYear() - dateOf(0).getFullYear()) * 12 + dateOf(d).getMonth() - dateOf(0).getMonth());
    showSnack(`${preview.title} added for ${fmtD(d, { weekday: 'short', month: 'short', day: 'numeric' })}`, () => change(s => ({ ...s, cal: s.cal.filter(e => e.id !== id) })));
  };
  const newOn = (d: number) => setEdit(addEvent({ day: addDays(todayDay(), d), title: '', kind: 'other' }));
  const open = (x: Item) => (x.ev ? setEdit(x.ev) : x.go ? go(x.go[0], x.go[1]) : null);
  const pickDay = (d: number) => {
    setSel(d);
    setMo((dateOf(d).getFullYear() - dateOf(0).getFullYear()) * 12 + dateOf(d).getMonth() - dateOf(0).getMonth());
  };

  const navBtn = (dir: number, label: string, on: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={on} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ rotate: dir < 0 ? '180deg' : '0deg' }] }}><ChevIcon color={t.text2} size={16} /></View>
    </Pressable>
  );
  const navRow = (title: string, prev: () => void, next: () => void, showToday: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 48 }}>
      {navBtn(-1, 'Previous', prev)}
      <Text style={{ flex: 1, textAlign: 'center', fontSize: F.f16, fontWeight: '700', color: t.text }}>{title}</Text>
      {showToday ? <LinkText onPress={() => { pickDay(0); }}>Today</LinkText> : null}
      {navBtn(1, 'Next', next)}
    </View>
  );
  const row = (x: Item) => (
    <Pressable key={x.key} accessibilityRole="button" onPress={() => open(x)} style={{ minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: x.c, marginVertical: 4 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text }}>{x.t}</Text>
        <Text style={{ fontSize: F.f14, color: t.text3 }}>{x.time ? `${clock12(x.time)}${x.dur ? '–' + clock12(addMin(x.time, x.dur)) : ''} · ` : ''}{x.s}</Text>
      </View>
      <ChevIcon color={t.text3} size={14} />
    </Pressable>
  );

  /* ---------- month ---------- */
  const month = () => {
    const first = new Date(dateOf(0).getFullYear(), dateOf(0).getMonth() + mo, 1, 12);
    const off = Math.round((first.getTime() - dateOf(0).getTime()) / 864e5);
    const start = off - first.getDay();
    const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((first.getDay() + dim) / 7);
    return (
      <View style={{ gap: 6 }}>
        {navRow(first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), () => setMo(mo - 1), () => setMo(mo + 1), mo !== 0 || sel !== 0)}
        <View style={[{ backgroundColor: t.surface, borderRadius: 20, overflow: 'hidden' }, shadow(t.dark)]}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.line }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', paddingVertical: 8, fontSize: F.f13, fontWeight: '600', color: t.text3 }}>{x}</Text>)}
          </View>
          {Array.from({ length: weeks }, (_, wk) => (
            <View key={wk} style={{ flexDirection: 'row', borderTopWidth: wk ? 1 : 0, borderTopColor: t.line }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = start + wk * 7 + i;
                const dt = dateOf(d);
                const list = byDay[d] || [];
                const isSel = d === sel;
                const dimmed = dt.getMonth() !== first.getMonth();
                return (
                  <Pressable key={i} accessibilityRole="button" accessibilityState={{ selected: isSel }} accessibilityLabel={`${dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${list.length ? `, ${plural(list.length, 'item')}` : ''}`}
                    onPress={() => setSel(d)} onLongPress={() => newOn(d)}
                    onLayout={wk === 0 && i === 0 ? e => setCell({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }) : undefined}
                    style={{ flex: 1, minHeight: wide ? 104 : 84, padding: 6, gap: 3, borderLeftWidth: i ? 1 : 0, borderLeftColor: t.line, backgroundColor: isSel ? t.tint2 : 'transparent' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: d === 0 ? t.action : 'transparent', marginLeft: 2 }}>
                      <Text style={{ fontSize: F.f15, fontWeight: d === 0 ? '700' : '500', color: d === 0 ? t.onAction : dimmed ? t.text3 : t.text }}>{dt.getDate()}</Text>
                    </View>
                    {list.slice(0, 3).map(x => (
                      <Draggable key={x.key} item={x} onTap={() => open(x)} onDrop={(dx, dy) => {
                        const delta = Math.round(dx / cell.w) + 7 * Math.round(dy / cell.h);
                        if (!delta || !x.mv) return;
                        moveItem(x.mv, delta);
                        showSnack(`${x.t.replace(/ \(day.*$/, '')} moved to ${fmtD(x.d + delta, { weekday: 'short', month: 'short', day: 'numeric' })}`, () => moveItem(x.mv!, -delta));
                      }} style={{ borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: t.sunken, borderLeftWidth: 3, borderLeftColor: x.c }}>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: t.text }}>{x.t}</Text>
                      </Draggable>
                    ))}
                    {list.length > 3 ? <Text style={{ fontSize: 12, color: t.text3 }}>+{list.length - 3} more</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  /* ---------- week ---------- */
  const week = () => {
    const start = sel - dateOf(sel).getDay();
    const end = start + 6;
    const title = `${fmtD(start, { month: 'short', day: 'numeric' })} – ${dateOf(start).getMonth() === dateOf(end).getMonth() ? dateOf(end).getDate() : fmtD(end, { month: 'short', day: 'numeric' })}`;
    return (
      <View style={{ gap: 10 }}>
        {navRow(title, () => setSel(sel - 7), () => setSel(sel + 7), sel !== 0)}
        {Array.from({ length: 7 }, (_, i) => {
          const d = start + i;
          const l = byDay[d] || [];
          return (
            <View key={i} style={[{ backgroundColor: t.surface, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, borderWidth: d === 0 ? 1.5 : 0, borderColor: t.action }, shadow(t.dark)]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                <Pressable accessibilityRole="button" onPress={() => { setSel(d); setView('day'); }} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={{ fontSize: F.f16, fontWeight: '700', color: d === 0 ? t.action : t.text }}>{fmtD(d, { weekday: 'short' })}</Text>
                  <Text style={{ fontSize: F.f16, color: t.text2 }}>{dateOf(d).getDate()}</Text>
                </Pressable>
                <Text style={{ flex: 1, fontSize: F.f14, color: t.text3 }}>{d === 0 ? 'Today' : l.length ? plural(l.length, 'item') : 'Nothing on'}{d >= 0 && d < sc.cap.length && sc.cap[d] ? ` · ${mins(sc.used[d])} of ${mins(sc.cap[d])} run work` : ''}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add on ${fmtD(d, { weekday: 'long' })}`} onPress={() => newOn(d)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><PlusIcon color={t.text2} size={18} /></Pressable>
              </View>
              {l.length ? <WList>{l.map(row)}</WList> : null}
            </View>
          );
        })}
      </View>
    );
  };

  /* ---------- day ---------- */
  const day = () => {
    const list = byDay[sel] || [];
    const timed = list.filter(x => x.time);
    const untimed = list.filter(x => !x.time);
    const H0 = 6, H1 = 22, PH = 52;
    const used = sel >= 0 && sel < sc.used.length ? sc.used[sel] : 0;
    const cap = sel >= 0 && sel < sc.cap.length ? sc.cap[sel] : 0;
    const toM = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3);
    const cols: number[] = [];
    const place = timed.map(x => {
      const a = toM(x.time!), b = a + (x.dur || 60);
      let c = cols.findIndex(e => e <= a);
      if (c < 0) { c = cols.length; cols.push(b); } else cols[c] = b;
      return { x, a, b, c };
    });
    const nc = Math.max(1, cols.length);
    const now = new Date();
    const nowM = now.getHours() * 60 + now.getMinutes();
    const strip0 = sel - dateOf(sel).getDay();
    return (
      <View style={{ gap: 12 }}>
        {navRow(`${sel === 0 ? 'Today · ' : sel === 1 ? 'Tomorrow · ' : ''}${fmtD(sel, { weekday: 'long', month: 'long', day: 'numeric' })}`, () => setSel(sel - 1), () => setSel(sel + 1), sel !== 0)}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = strip0 + i;
            const on = d === sel;
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSel(d)} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, backgroundColor: on ? t.tint : 'transparent' }}>
                <Text style={{ fontSize: F.f13, color: on ? t.onTint : t.text3 }}>{fmtD(d, { weekday: 'narrow' })}</Text>
                <Text style={{ fontSize: F.f16, fontWeight: '700', color: on ? t.onTint : d === 0 ? t.action : t.text }}>{dateOf(d).getDate()}</Text>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: (byDay[d] || []).length ? (on ? t.onTint : t.text3) : 'transparent' }} />
              </Pressable>
            );
          })}
        </View>
        <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 16, gap: 10 }, shadow(t.dark)]}>
          {cap ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: F.f14, color: t.text2 }}><Text style={{ fontWeight: '700', color: t.text }}>Run work</Text> {used ? `${mins(used)} planned of ${mins(cap)} free` : `${mins(cap)} free, nothing planned`}</Text>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ height: 6, width: `${Math.min(100, (used / Math.max(1, cap)) * 100)}%`, backgroundColor: used >= cap ? t.barA : t.barG }} /></View>
            </View>
          ) : (
            <Text style={{ fontSize: F.f14, color: t.text3 }}>{list.some(x => x.ev && ['market', 'off'].includes(shop.cal.find(e => e.id === x.ev)?.kind || '')) ? 'Day off for runs: this event takes the day, so run work moves to other days. ' : 'Not a work day. '}<Text style={{ color: t.action, fontWeight: '600' }} onPress={() => go('settings', 'hours')}>Free hours</Text></Text>
          )}
          {untimed.map(x => (
            <Pressable key={x.key} accessibilityRole="button" onPress={() => open(x)} style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: t.sunken, borderLeftWidth: 4, borderLeftColor: x.c, gap: 1 }}>
              <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>{x.t}</Text>
              <Text style={{ fontSize: F.f13, color: t.text3 }}>{x.s}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[{ backgroundColor: t.surface, borderRadius: 20, overflow: 'hidden', height: 560 }, shadow(t.dark)]}>
          <ScrollView ref={dayScroll}>
          <View style={{ height: (H1 - H0) * PH }}>
            {Array.from({ length: H1 - H0 }, (_, i) => (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Add at ${clock12(`${H0 + i}:00`)}`} onPress={() => setEdit(addEvent({ day: addDays(todayDay(), sel), title: '', kind: 'other', time: `${String(H0 + i).padStart(2, '0')}:00`, dur: 60 }))}
                style={{ position: 'absolute', left: 0, right: 0, top: i * PH, height: PH, borderTopWidth: i ? 1 : 0, borderTopColor: t.line, paddingLeft: 10, paddingTop: 4 }}>
                <Text style={{ fontSize: 12, color: t.text3 }}>{clock12(`${H0 + i}:00`)}</Text>
              </Pressable>
            ))}
            {place.map(({ x, a, b, c }) => {
              const A = Math.max(H0 * 60, a), B = Math.min(H1 * 60, b);
              return (
                <Draggable key={x.key} item={x} onTap={() => open(x)} onDrop={(dx, dy) => {
                  if (!x.mv) return;
                  const dm = Math.round(((dy / PH) * 60) / 15) * 15;
                  const nt = addMin(x.time!, dm);
                  if (!dm) return;
                  const was = x.time!;
                  moveItem(x.mv, 0, nt);
                  showSnack(`${x.t} moved to ${clock12(nt)}`, () => moveItem(x.mv!, 0, was));
                }}
                  style={{ position: 'absolute', top: ((A - H0 * 60) / 60) * PH + 1, height: Math.max(24, ((B - A) / 60) * PH - 2), left: `${12 + (c / nc) * 86}%`, width: `${86 / nc - 1}%`, borderRadius: 10, backgroundColor: t.tint2, borderLeftWidth: 4, borderLeftColor: x.c, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' }}>
                  <Text numberOfLines={1} style={{ fontSize: F.f14, fontWeight: '700', color: t.text }}>{x.t}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: t.text2 }}>{clock12(x.time!)}–{clock12(addMin(x.time!, x.dur || 60))}</Text>
                </Draggable>
              );
            })}
            {sel === 0 && nowM >= H0 * 60 && nowM <= H1 * 60 ? <View pointerEvents="none" style={{ position: 'absolute', left: 56, right: 0, top: ((nowM - H0 * 60) / 60) * PH, height: 2, backgroundColor: t.danger }} /> : null}
          </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  /* ---------- list ---------- */
  const [pg, setPg] = useState(1);
  const listView = () => {
    const upcoming = items.filter(x => x.d >= Math.min(0, sel));
    const shown = upcoming.slice(0, 40 * pg);
    const grp: { d: number; items: Item[] }[] = [];
    shown.forEach(x => {
      let g = grp[grp.length - 1];
      if (!g || g.d !== x.d) grp.push((g = { d: x.d, items: [] }));
      g.items.push(x);
    });
    return (
      <View style={{ gap: 16 }}>
        {grp.length ? grp.map(g => (
          <Sect key={g.d} title={`${g.d === 0 ? 'Today' : g.d === 1 ? 'Tomorrow' : g.d === -1 ? 'Yesterday' : fmtD(g.d, { weekday: 'long' })} · ${fmtD(g.d, { month: 'short', day: 'numeric' })}`}>
            <WList>{g.items.map(row)}</WList>
          </Sect>
        )) : <Note>Nothing coming up. Add a market, pickup or sewing block.</Note>}
        {upcoming.length > shown.length ? <Button kind="ghost" small title="Show more" style={{ alignSelf: 'center' }} onPress={() => setPg(pg + 1)} /> : null}
      </View>
    );
  };

  /* ---------- side ---------- */
  const dayPanel = () => {
    const list = byDay[sel] || [];
    return (
      <Sect title={`${sel === 0 ? 'Today · ' : ''}${fmtD(sel, { weekday: 'long', month: 'short', day: 'numeric' })}`} right={<LinkText onPress={() => newOn(sel)}>+ Add</LinkText>}>
        {list.length ? <WList>{list.map(row)}</WList> : (
          <Pressable accessibilityRole="button" onPress={() => newOn(sel)} style={[{ backgroundColor: t.surface, borderRadius: 20, paddingHorizontal: 20, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 }, shadow(t.dark)]}>
            <Text style={{ flex: 1, fontSize: F.f15, color: t.text3, paddingVertical: 10 }}>Nothing on this day. Add a market, pickup or sewing block</Text>
            <PlusIcon color={t.text3} size={18} />
          </Pressable>
        )}
      </Sect>
    );
  };
  const wkCap = sc.cap.slice(0, 7).reduce((a: number, c: number) => a + c, 0);
  const wkUsed = sc.used.slice(0, 7).reduce((a: number, c: number) => a + c, 0);
  const late = shop.runs.filter(r => sc.late.includes(r.id));
  const capCard = (
    <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 12 }, shadow(t.dark)]}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>Next 7 days</Text>
        <Text style={{ fontSize: F.f14, color: t.text3 }}><Text style={{ fontWeight: '700', color: t.text }}>{mins(wkUsed)}</Text> planned of {mins(wkCap)} free</Text>
      </View>
      <WeekBars sc={sc} h={56} />
      {late.length ? late.map(r => {
        const f = sc.finish[r.id];
        const due = rel(r.due) ?? 0;
        return (
          <View key={r.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: t.warnTint, borderRadius: 12, padding: 10 }}>
            <WarnIcon color={t.onWarn} size={18} />
            <Text style={{ flex: 1, fontSize: F.f14, color: t.onWarn }}><Text style={{ fontWeight: '700' }}>{short(r.name)}</Text> {f == null ? 'doesn’t fit in the next eight weeks' : `finishes about ${fmtD(f, { month: 'short', day: 'numeric' })}, ${plural(Math.max(1, f - due), 'day')} after it’s due`}.</Text>
          </View>
        );
      }) : <Text style={{ fontSize: F.f13, color: t.text2 }}>Everything on the bench finishes by its due date.</Text>}
      <LinkText onPress={() => go('settings', 'hours')}>Free hours · {fmtN(shop.cfg.hours.reduce((a, b) => a + b, 0))}h a week</LinkText>
    </View>
  );

  const CATS: [Cat, string, string][] = [['run', 'Runs', t.barA], ['order', 'Orders', t.action], ['market', 'Markets', MARKET], ['fabric', 'Fabric', FABRIC], ['quote', 'Quotes', t.text3], ['mine', 'Your events', '#b5643c']];
  const ev = edit ? shop.cal.find(e => e.id === edit) : null;
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }} onLayout={e => setW(e.nativeEvent.layout.width)}>
      <View style={{ width: '100%', maxWidth: 1240, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 18 }}>
        <PageHead title="Schedule" />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Segmented fill bare label="View" value={view} onChange={setView} options={[['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['list', 'List']]} /></View>
          <Button title="Add" icon={c => <PlusIcon color={c} size={16} />} onPress={() => newOn(sel)} />
        </View>
        <View style={{ gap: 6 }}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }, shadow(t.dark)]}>
            <PlusIcon color={t.text3} size={18} />
            <TextInput accessibilityLabel="Quick add" value={q} onChangeText={setQ} onSubmitEditing={quickAdd} placeholder="Market Sat 8am–2pm at Riverside" placeholderTextColor={t.text3} style={{ flex: 1, fontSize: F.f15, color: t.text, paddingVertical: 8 }} />
            {preview ? <Button small title="Add" onPress={quickAdd} /> : null}
          </View>
          {preview ? (
            <Text style={{ fontSize: F.f14, color: t.text2, paddingHorizontal: 6 }}>
              <Text style={{ fontWeight: '700', color: t.text }}>{preview.title}</Text> · {KIND[preview.kind][0]} · {dayLabel(preview.day, { weekday: 'short', month: 'short', day: 'numeric' })}{preview.days > 1 ? ` for ${preview.days} days` : ''}{preview.time ? ` · ${clock12(preview.time)}–${clock12(addMin(preview.time, preview.dur || 60))}` : ' · all day'}{preview.loc ? ` · ${preview.loc}` : ''}{preview.rep ? ` · ${REP_LAB[preview.rep].toLowerCase()}` : ''}{preview.kind === 'market' || preview.kind === 'off' ? ' · day off for runs' : ''}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {CATS.map(([k, l, c]) => {
            const on = !hide[k];
            return (
              <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setHide(h => ({ ...h, [k]: on }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line2, opacity: on ? 1 : 0.55 }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: on ? c : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: c }} />
                <Text style={{ fontSize: F.f15, fontWeight: '600', color: on ? t.text : t.text3 }}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
          <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>{view === 'month' ? month() : view === 'week' ? week() : view === 'day' ? day() : listView()}</View>
          <View style={{ width: wide ? 320 : '100%', gap: 18, paddingTop: view === 'list' ? 0 : 4 }}>
            {view === 'month' ? dayPanel() : null}
            {capCard}
          </View>
        </View>
      </View>
      {ev ? <EventSheet e={ev} onClose={() => setEdit(null)} /> : null}
    </ScrollView>
  );
}

function EventSheet({ e, onClose }: { e: CalEvent; onClose: () => void }) {
  const t = useTheme();
  const [cal, setCal] = useState(false);
  const set = (p: Partial<CalEvent>) => editEvent(e.id, p);
  const close = () => {
    if (!e.title.trim()) set({ title: KIND[e.kind][0] });
    onClose();
  };
  const timeStep = (n: number) => set({ time: addMin(e.time || '09:00', n) });
  return (
    <Sheet title={e.title || 'New event'} sub={dayLabel(e.day, { weekday: 'long', month: 'long', day: 'numeric' })} onClose={close} width={560}
      footer={<><Button kind="danger" small title="Delete" onPress={() => { deleteEvent(e.id); onClose(); showSnack(`${e.title || 'Event'} deleted`, () => restoreEvent(e)); }} /><Button title="Done" onPress={close} /></>}>
      <Field label="What" value={e.title} onChange={v => set({ title: v })} placeholder="Riverside farmers market" autoFocus={!e.title} />
      <Segmented label="Kind" value={e.kind} onChange={v => set({ kind: v })} options={[['market', 'Market'], ['pickup', 'Pickup'], ['sew', 'Sewing'], ['off', 'Day off'], ['other', 'Other']]} />
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ gap: 4 }}>
          <T s="label">Day</T>
          <Button kind="secondary" title={dayLabel(e.day, { weekday: 'short', month: 'short', day: 'numeric' })} onPress={() => setCal(true)} />
        </View>
        <NumField label="Days" value={e.days} onChange={n => set({ days: Math.max(1, Math.round(n || 1)) })} width={90} />
        <View style={{ gap: 4 }}>
          <T s="label">Time</T>
          <Segmented bare label="Time" value={e.time ? 'timed' : 'all'} onChange={v => set(v === 'all' ? { time: undefined, dur: undefined } : { time: '09:00', dur: e.kind === 'market' ? 360 : 60 })} options={[['all', 'All day'], ['timed', 'At a time']]} />
        </View>
      </View>
      {e.time ? (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <View style={{ gap: 4 }}>
            <T s="label">Starts</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Button small kind="secondary" title="−" onPress={() => timeStep(-30)} />
              <T style={{ minWidth: 80, textAlign: 'center', fontWeight: '700' }}>{clock12(e.time)}</T>
              <Button small kind="secondary" title="+" onPress={() => timeStep(30)} />
            </View>
          </View>
          <NumField label="Hours" value={Math.round(((e.dur || 60) / 60) * 10) / 10} onChange={n => set({ dur: Math.max(15, Math.round((n || 1) * 60)) })} width={100} suffix="h" />
          <T s="sub">Until {clock12(addMin(e.time, e.dur || 60))}</T>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ gap: 4 }}>
          <T s="label">Repeats</T>
          <Segmented bare label="Repeats" value={e.rep || ''} onChange={v => set({ rep: v })} options={[['', 'Never'], ['w', 'Weekly'], ['2w', 'Every 2 weeks'], ['m', 'Monthly']]} />
        </View>
        <View style={{ gap: 4 }}>
          <T s="label">Remind me</T>
          <Select label="Remind me" width={170} value={String(e.remind || 0)} onChange={v => set({ remind: +v })}
            options={e.time ? [['0', 'No reminder'], ['15', '15 min before'], ['60', '1 hour before'], ['180', '3 hours before'], ['1440', 'The day before']] : [['0', 'No reminder'], ['1440', 'The day before'], ['2880', '2 days before']]} />
        </View>
      </View>
      <Field label="Where" value={e.loc || ''} onChange={v => set({ loc: v })} placeholder="Optional" />
      <Field label="Notes" value={e.notes} onChange={v => set({ notes: v })} multiline />
      <T s="small" color={t.text3}>{e.kind === 'market' || e.kind === 'off' ? 'That day’s free hours are taken out of run planning.' : 'Shown on the calendar; your free hours stay the same.'}{e.remind ? ' The reminder goes to the bell and, if they’re on, a Windows notification.' : ''}{e.rep ? ' Changing the day moves every repeat.' : ''}</T>
      {cal ? <CalendarSheet title="Day" value={e.day} onPick={d => { if (d) set({ day: d }); setCal(false); }} onClose={() => setCal(false)} /> : null}
    </Sheet>
  );
}
