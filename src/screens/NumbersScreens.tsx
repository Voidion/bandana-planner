/* Today, Schedule, Reports (trends, reports, tax), Maintenance and Activity. */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as E from '../engine/engine';
import { dayLabel, fmtN, mins, money, money0, pct, plural, relDue } from '../lib/format';
import { addDays, itemName, rel, schedule, sync, todayDay } from '../lib/plan';
import { addEvent, addTool, deleteEvent, deleteTool, editEvent, editTool, resetTool, restoreEvent, setGoals, toolDue, unitOf } from '../state/planning';
import { saleOwed, saleProfit } from '../state/selling';
import { useShop } from '../state/store';
import type { CalEvent, Sale, Shop, Tool } from '../state/types';
import { CloseIcon, PlusIcon, TrashIcon } from '../ui/icons';
import { Bar, Button, Card, Chip, Empty, Field, IconButton, NumField, Row, Section, Segmented, Select, showSnack, T } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';

type Go = (route: string, id?: string) => void;
const short = (n: string) => (n || 'Untitled run').split(' — ')[0];
const units = (e: Sale) => Object.values(e.items).reduce((a, b) => a + b, 0);

/* ---------- small bar charts ---------- */
function Bars({ data, height = 120, color, fmt }: { data: { label: string; v: number; v2?: number; hi?: boolean }[]; height?: number; color: string; fmt?: (v: number) => string }) {
  const t = useTheme();
  const mx = Math.max(1, ...data.map(d => Math.max(d.v, d.v2 || 0)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: height + 34 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          {fmt && d.v ? <T s="small" style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1}>{fmt(d.v)}</T> : <T s="small"> </T>}
          <View style={{ width: '100%', maxWidth: 34, height, justifyContent: 'flex-end' }}>
            {d.v2 != null ? <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: (d.v2 / mx) * height, backgroundColor: t.sunken, borderRadius: 4 }} /> : null}
            <View style={{ height: Math.max(d.v ? 2 : 0, (d.v / mx) * height), backgroundColor: d.hi ? t.barA : color, borderRadius: 4 }} />
          </View>
          <T s="small" numberOfLines={1}>{d.label}</T>
        </View>
      ))}
    </View>
  );
}


/* ================= Schedule ================= */
export function ScheduleScreen({ go }: { go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const sc = useMemo(() => schedule(shop, 28), [shop]);
  const [sel, setSel] = useState<string | null>(null);
  const ev = shop.cal.find(e => e.id === sel);
  const weeks = [0, 1, 2, 3];
  const bench = shop.runs.filter(r => r.status !== 'done');
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 1100 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T s="title">Schedule</T>
          <T s="sub">Runs fitted into your free hours, earliest due first. Markets and days off take that day’s hours out.</T>
        </View>
        <Button small kind="secondary" title="Free hours" onPress={() => go('settings', 'hours')} />
        <Button small title="Add a market or day off" icon={c => <PlusIcon color={c} size={14} />} onPress={() => setSel(addEvent({ day: addDays(todayDay(), 7) }))} />
      </View>
      <Card style={{ gap: 12 }}>
        {weeks.map(w => (
          <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => {
              const d = w * 7 + i;
              const day = addDays(todayDay(), d);
              const evs = shop.cal.filter(e => rel(e.day)! <= d && d < rel(e.day)! + (e.days || 1));
              const due = bench.filter(r => rel(r.due) === d);
              const done = bench.filter(r => sc.finish[r.id] === d);
              const cap = sc.cap[d],
                used = sc.used[d];
              return (
                <View key={i} style={{ flex: 1, minHeight: 92, borderRadius: 10, backgroundColor: d === 0 ? t.tint2 : t.bg, padding: 8, gap: 3 }}>
                  <T s="small" style={{ fontWeight: '600' }} color={d === 0 ? t.action : t.text2}>{d === 0 ? 'Today' : dayLabel(day, { weekday: 'short', day: 'numeric' })}</T>
                  {cap ? <View style={{ height: 5, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, (used / cap) * 100)}%`, height: 5, backgroundColor: used >= cap ? t.barA : t.barG }} /></View> : null}
                  <T s="small">{cap ? `${fmtN(used / 60)}h of ${fmtN(cap / 60)}h` : 'Off'}</T>
                  {evs.map(e => <Pressable key={e.id} onPress={() => setSel(e.id)}><T s="small" color={t.action} numberOfLines={1}>{e.title}</T></Pressable>)}
                  {due.map(r => <Pressable key={'d' + r.id} onPress={() => go('runs', r.id)}><T s="small" color={sc.late.includes(r.id) ? t.danger : t.text} numberOfLines={1}>Due: {short(r.name)}</T></Pressable>)}
                  {done.map(r => <Pressable key={'f' + r.id} onPress={() => go('runs', r.id)}><T s="small" color={t.success} numberOfLines={1}>✓ {short(r.name)}</T></Pressable>)}
                </View>
              );
            })}
          </View>
        ))}
      </Card>
      <Section title="Runs on the bench">
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {bench.length ? bench.map((r, i) => {
            const fin = sc.finish[r.id];
            const late = sc.late.includes(r.id);
            return (
              <Row key={r.id} first={i === 0} onPress={() => go('runs', r.id)}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: '600' }}>{short(r.name)}</T>
                  <T s="sub">{mins(r.steps.filter(s => !s.done).reduce((a, s) => a + s.est, 0))} left · {r.due ? relDue(rel(r.due)) : 'No date'}</T>
                </View>
                <Chip label={fin == null ? 'Doesn’t fit yet' : `Done ${fin === 0 ? 'today' : dayLabel(addDays(todayDay(), fin), { month: 'short', day: 'numeric' })}`} tone={late ? 'bad' : fin == null ? 'warn' : 'ok'} />
              </Row>
            );
          }) : <Row first><T s="sub">Nothing on the bench.</T></Row>}
        </Card>
      </Section>
      {ev ? <EventEditor e={ev} onClose={() => setSel(null)} /> : null}
    </ScrollView>
  );
}

function EventEditor({ e, onClose }: { e: CalEvent; onClose: () => void }) {
  const set = (p: Partial<CalEvent>) => editEvent(e.id, p);
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 220 }}><Field label="What" value={e.title} onChange={v => set({ title: v })} /></View>
        <Segmented label="Kind" value={e.kind} onChange={v => set({ kind: v })} options={[['market', 'Market'], ['off', 'Day off'], ['other', 'Other']]} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ gap: 4 }}>
          <T s="label">Day</T>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Button small kind="secondary" title="‹" onPress={() => set({ day: addDays(e.day, -1) })} />
            <T style={{ minWidth: 130, textAlign: 'center', fontWeight: '600' }}>{dayLabel(e.day)}</T>
            <Button small kind="secondary" title="›" onPress={() => set({ day: addDays(e.day, 1) })} />
          </View>
        </View>
        <NumField label="Days" value={e.days} onChange={n => set({ days: Math.max(1, Math.round(n || 1)) })} width={90} />
        <View style={{ flex: 1 }} />
        <Button small kind="danger" title="Remove" onPress={() => { deleteEvent(e.id); onClose(); showSnack(`${e.title} removed`, () => restoreEvent(e)); }} />
        <Button small title="Done" onPress={onClose} />
      </View>
      <T s="small">{e.kind === 'other' ? 'Shown on the calendar; your free hours stay the same.' : 'That day’s free hours are taken out of run planning.'}</T>
    </Card>
  );
}

/* ================= Reports (trends, reports, tax) ================= */
type Per = 'year' | '3m' | 'month' | 'lastYear';
function periodSales(shop: Shop, per: Per) {
  const today = todayDay();
  const y = today.slice(0, 4),
    m = today.slice(0, 7);
  const from3 = addDays(today, -91);
  return shop.sales.filter(e => (per === 'year' ? e.day.startsWith(y) : per === 'month' ? e.day.startsWith(m) : per === 'lastYear' ? e.day.startsWith(String(+y - 1)) : e.day >= from3) && e.day <= today);
}
const perMonths = (per: Per) => (per === 'year' ? new Date().getMonth() + 1 : per === '3m' ? 3 : per === 'month' ? 1 : 12);

export function ReportsScreen({ start = 'reports' }: { start?: 'trends' | 'reports' }) {
  const [tab, setTab] = useState<'trends' | 'reports' | 'tax' | 'goals'>(start);
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 1040 }}>
      <T s="title">{tab === 'trends' ? 'Trends' : 'Reports'}</T>
      <Segmented label="Reports" bare value={tab} onChange={setTab} options={[['trends', 'Trends'], ['reports', 'Sales and profit'], ['tax', 'Tax summary'], ['goals', 'Goals']]} />
      {tab === 'trends' ? <Trends /> : tab === 'reports' ? <Reports /> : tab === 'tax' ? <Tax /> : <Goals />}
    </ScrollView>
  );
}

function Trends() {
  const shop = useShop();
  const t = useTheme();
  const y = todayDay().slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
  const cur = new Date().getMonth();
  const by = months.map(m => shop.sales.filter(e => e.day.startsWith(m)));
  const done = shop.runs.filter(r => r.status === 'done');
  const timed = done.filter(r => r.steps.some(s => s.actual));
  const perBandana = timed.length ? timed.reduce((a, r) => a + r.steps.reduce((x, s) => x + (s.actual || s.est), 0) / Math.max(1, Object.values(r.qty).reduce((p, q) => p + q, 0)), 0) / timed.length : null;
  sync(shop);
  if (!shop.sales.length && !done.length) return <Empty icon={<PlusIcon color={t.action} size={26} />} title="Trends fill in as you go" body="Finish runs and record sales, and this shows sales and profit by month, what sells best, and your real pace." />;
  const sizeRows = (() => {
    const M: Record<string, number> = {};
    shop.sales.filter(e => e.day.startsWith(y)).forEach(e => Object.entries(e.items).forEach(([k, n]) => (M[k] = (M[k] || 0) + n)));
    return Object.entries(M).sort((a, b) => b[1] - a[1]);
  })();
  const mxS = Math.max(1, ...sizeRows.map(r => r[1]));
  return (
    <View style={{ gap: 18 }}>
      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '700' }}>Sales by month · {y}</T>
        <Bars color={t.barG} fmt={v => money0(v)} data={months.map((m, i) => ({ label: dayLabel(m + '-01', { month: 'narrow' }), v: by[i].reduce((a, e) => a + e.sub - e.refund, 0), hi: i === cur }))} />
      </Card>
      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '700' }}>Profit by month</T>
        <Bars color={t.action} fmt={v => money0(v)} data={months.map((m, i) => ({ label: dayLabel(m + '-01', { month: 'narrow' }), v: Math.max(0, by[i].reduce((a, e) => a + saleProfit(e), 0)), hi: i === cur }))} />
      </Card>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, minWidth: 220, gap: 2 }}><T s="label">Profit a bandana this year</T><T style={{ fontSize: F.f22, fontWeight: '700' }}>{money(E.profitEach())}</T></Card>
        <Card style={{ flex: 1, minWidth: 220, gap: 2 }}><T s="label">Your real time a bandana</T><T style={{ fontSize: F.f22, fontWeight: '700' }}>{perBandana ? mins(perBandana) : '–'}</T><T s="small">{timed.length ? `From ${plural(timed.length, 'timed run')}` : 'Time steps to see this'}</T></Card>
        <Card style={{ flex: 1, minWidth: 220, gap: 2 }}><T s="label">Runs finished</T><T style={{ fontSize: F.f22, fontWeight: '700' }}>{done.length}</T><T s="small">{done.reduce((a, r) => a + Object.values(r.qty).reduce((p, q) => p + q, 0), 0)} bandanas</T></Card>
      </View>
      {sizeRows.length ? (
        <Card style={{ gap: 10 }}>
          <T style={{ fontWeight: '700' }}>What sells best · {y}</T>
          {sizeRows.map(([k, n]) => (
            <View key={k} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T>{itemName(shop, k)}</T><T s="sub">{n} sold</T></View>
              <Bar value={n / mxS} color={t.barG} />
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const PER_OPTS: [Per, string][] = [['month', 'This month'], ['3m', '3 months'], ['year', 'This year'], ['lastYear', 'Last year']];

function Reports() {
  const shop = useShop();
  const t = useTheme();
  const [per, setPer] = useState<Per>('year');
  const list = periodSales(shop, per);
  sync(shop);
  const s = E.sums(list.map(e => ({ ...e, d: 0 })));
  const bills = shop.bills.reduce((a, b) => a + (b.basis === 'year' ? b.amt / 12 : b.amt), 0) * perMonths(per);
  const group = (key: (e: Sale) => string) => {
    const M: Record<string, { sales: number; profit: number; units: number }> = {};
    list.forEach(e => {
      const k = key(e);
      const m = (M[k] = M[k] || { sales: 0, profit: 0, units: 0 });
      m.sales += e.sub - e.refund;
      m.profit += saleProfit(e);
      m.units += units(e);
    });
    return Object.entries(M).sort((a, b) => b[1].sales - a[1].sales);
  };
  const Table = ({ title, rows }: { title: string; rows: [string, { sales: number; profit: number; units: number }][] }) =>
    rows.length ? (
      <Section title={title}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {rows.map(([k, v], i) => (
            <Row key={k} first={i === 0}>
              <T style={{ flex: 1, fontWeight: '600' }}>{k}</T>
              <T s="sub" style={{ width: 90 }}>{v.units} sold</T>
              <T style={{ width: 100, textAlign: 'right' }}>{money(v.sales)}</T>
              <T style={{ width: 100, textAlign: 'right' }} color={v.profit >= 0 ? t.success : t.danger}>{money(v.profit)}</T>
            </Row>
          ))}
        </Card>
      </Section>
    ) : null;
  const line = (a: string, b: string, bold?: boolean, color?: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontWeight: bold ? '700' : '400' }}>{a}</T><T style={{ fontWeight: bold ? '700' : '500', fontVariant: ['tabular-nums'] }} color={color}>{b}</T></View>
  );
  return (
    <View style={{ gap: 18 }}>
      <Segmented label="Period" bare value={per} onChange={setPer} options={PER_OPTS} />
      {!list.length ? <T s="sub">No sales in this period.</T> : (
        <>
          <Card style={{ gap: 8, maxWidth: 520 }}>
            {line('Sales', money(s.sales), true)}
            {line('Card fees', '−' + money(s.fees))}
            {line('Materials', '−' + money(s.mat))}
            {s.costs ? line('Other costs (booth fees)', '−' + money(s.costs)) : null}
            {line('Profit before bills', money(s.profit), true, s.profit >= 0 ? t.success : t.danger)}
            {line(`Bills (${perMonths(per)} month${perMonths(per) === 1 ? '' : 's'})`, '−' + money(bills))}
            {line('Profit after bills', money(s.profit - bills), true, s.profit - bills >= 0 ? t.success : t.danger)}
            <T s="small">{s.units} items in {plural(s.n, 'sale')} · {money(s.units ? s.profit / s.units : 0)} profit each</T>
          </Card>
          <Table title="By channel" rows={group(e => e.ch)} />
          <Table title="By size or style" rows={(() => { const M: Record<string, any> = {}; list.forEach(e => { const tot = units(e) || 1; Object.entries(e.items).forEach(([k, n]) => { const m = (M[itemName(shop, k)] = M[itemName(shop, k)] || { sales: 0, profit: 0, units: 0 }); m.sales += ((e.sub - e.refund) * n) / tot; m.profit += (saleProfit(e) * n) / tot; m.units += n; }); }); return Object.entries(M).sort((a: any, b: any) => b[1].sales - a[1].sales) as any; })()} />
          <Table title="By customer" rows={group(e => shop.customers.find(c => c.id === e.cust)?.name || 'No customer')} />
          <Table title="By run" rows={group(e => (e.run ? short(shop.runs.find(r => r.id === e.run)?.name || 'Older run') : e.what || 'Other'))} />
        </>
      )}
    </View>
  );
}

function Tax() {
  const shop = useShop();
  const t = useTheme();
  const [per, setPer] = useState<Per>('year');
  const list = periodSales(shop, per);
  const gross = list.reduce((a, e) => a + e.sub, 0);
  const refunds = list.reduce((a, e) => a + (e.refund || 0), 0);
  const ship = list.reduce((a, e) => a + (e.ship || 0), 0);
  const tax = list.reduce((a, e) => a + (e.tax || 0), 0);
  const fees = list.reduce((a, e) => a + (e.fees || 0), 0);
  const mat = list.reduce((a, e) => a + (e.mat || 0), 0);
  const costs = list.reduce((a, e) => a + (e.costs || 0), 0);
  const bills = shop.bills.reduce((a, b) => a + (b.basis === 'year' ? b.amt / 12 : b.amt), 0) * perMonths(per);
  const fabricBought = 0;
  const income = gross - refunds + ship;
  const net = income - fees - mat - costs - bills - shop.cfg.ship.cost * list.filter(e => e.ship > 0).length;
  const owed = list.reduce((a, e) => a + saleOwed(e), 0);
  const row = (a: string, b: number, o: { minus?: boolean; bold?: boolean; note?: string } = {}) => (
    <Row first={false}>
      <View style={{ flex: 1 }}><T style={{ fontWeight: o.bold ? '700' : '500' }}>{a}</T>{o.note ? <T s="small">{o.note}</T> : null}</View>
      <T style={{ fontWeight: o.bold ? '700' : '500', fontVariant: ['tabular-nums'] }}>{o.minus ? '−' : ''}{money(b)}</T>
    </Row>
  );
  return (
    <View style={{ gap: 18 }}>
      <Segmented label="Period" bare value={per} onChange={setPer} options={PER_OPTS} />
      <Card pad={false} style={{ overflow: 'hidden', maxWidth: 640 }}>
        <Row first><T s="h2" style={{ flex: 1 }}>Income</T></Row>
        {row('Gross sales', gross)}
        {row('Refunds', refunds, { minus: true })}
        {row('Shipping charged', ship)}
        {row('Total income', income, { bold: true })}
        <Row><T s="h2" style={{ flex: 1 }}>Costs</T></Row>
        {row('Card and platform fees', fees, { minus: true })}
        {row('Materials for what sold', mat, { minus: true, note: 'Fabric, straps, notions and supplies, at what you paid' })}
        {row('Booth and other sale costs', costs, { minus: true })}
        {row('Shipping labels', shop.cfg.ship.cost * list.filter(e => e.ship > 0).length, { minus: true, note: 'At your label cost in Settings › Pricing' })}
        {row('Bills', bills, { minus: true, note: 'Your monthly bills for this period' })}
        {row('Net profit', net, { bold: true })}
        <Row><T s="h2" style={{ flex: 1 }}>Kept separately</T></Row>
        {row('Sales tax collected', tax, { note: 'Not your income: it’s owed to the state' })}
        {row('Still owed to you', owed, { note: 'Counted in sales above' })}
      </Card>
      <T s="small" style={{ maxWidth: 640 }}>A summary to hand to whoever does your taxes, not tax advice. Materials are counted when bandanas sell; fabric still on the shelf isn’t a cost yet.{fabricBought ? '' : ''}</T>
    </View>
  );
}

function Goals() {
  const shop = useShop();
  const t = useTheme();
  const month = todayDay().slice(0, 7);
  const inc = shop.sales.filter(e => e.day.startsWith(month)).reduce((a, e) => a + e.sub - e.refund, 0);
  const hrs = shop.sessions.filter(s => s.day.startsWith(month)).reduce((a, s) => a + s.mins, 0) / 60 + shop.runs.flatMap(r => r.steps).filter(s => s.entered).length * 0;
  return (
    <View style={{ gap: 16, maxWidth: 640 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View><T s="label">{dayLabel(todayDay(), { month: 'long' })} income</T><T style={{ fontSize: F.f28, fontWeight: '700' }}>{money0(inc)}</T></View>
          <NumField label="Goal a month" value={shop.goals.income} onChange={n => setGoals({ income: n ?? 0 })} prefix="$" width={130} />
        </View>
        <Bar value={inc / Math.max(1, shop.goals.income)} color={inc >= shop.goals.income ? t.success : t.action} />
        <T s="small">{inc >= shop.goals.income ? 'Goal reached this month.' : `${money0(shop.goals.income - inc)} to go.`}</T>
      </Card>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View><T s="label">Hours timed this month</T><T style={{ fontSize: F.f28, fontWeight: '700' }}>{fmtN(Math.round(hrs * 10) / 10)}h</T></View>
          <NumField label="Goal a month" value={shop.goals.hours} onChange={n => setGoals({ hours: n ?? 0 })} suffix="h" width={130} />
        </View>
        <Bar value={hrs / Math.max(1, shop.goals.hours)} color={t.barG} />
        <T s="small">From steps you timed. Typed-in times aren’t counted.</T>
      </Card>
    </View>
  );
}

/* ================= Maintenance ================= */
export function MaintenanceScreen() {
  const shop = useShop();
  const t = useTheme();
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 900 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T s="title">Maintenance</T>
          <T s="sub">Blades and mats count every mat you cut; machines count the hours of sewing steps in finished runs.</T>
        </View>
        <Button small title="Add a tool" icon={c => <PlusIcon color={c} size={14} />} onPress={() => addTool()} />
      </View>
      {shop.tools.map(tl => <ToolCard key={tl.id} tl={tl} />)}
    </ScrollView>
  );
}
function ToolCard({ tl }: { tl: Tool }) {
  const t = useTheme();
  const due = toolDue(tl);
  const set = (p: Partial<Tool>) => editTool(tl.id, p);
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200 }}><Field label="Tool" value={tl.name} onChange={v => set({ name: v })} /></View>
        <View style={{ gap: 4 }}><T s="label">Counts</T><Select label="Counts" width={170} value={tl.kind} options={[['blade', 'Mats cut'], ['mat', 'Mats loaded'], ['machine', 'Hours sewn'], ['other', 'By hand']]} onChange={v => set({ kind: v })} /></View>
        <NumField label="Replace or service after" value={tl.life} onChange={n => set({ life: n ?? 0 })} width={150} />
        <IconButton label={`Remove ${tl.name}`} onPress={() => deleteTool(tl.id)}>{c => <CloseIcon color={c} size={14} />}</IconButton>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T><T style={{ fontWeight: '700' }}>{fmtN(Math.round(tl.uses * 10) / 10)}</T> of {tl.life} {unitOf(tl)} since {dayLabel(tl.since, { month: 'short', day: 'numeric' })}</T>
          {due ? <Chip label={tl.uses >= tl.life ? 'Due now' : 'Due soon'} tone="warn" /> : null}
        </View>
        <Bar value={tl.uses / Math.max(1, tl.life)} color={due ? t.barA : t.barG} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button small kind={due ? 'primary' : 'secondary'} title={tl.kind === 'machine' ? 'Serviced' : 'Replaced'} onPress={() => { resetTool(tl.id, tl.kind === 'machine' ? 'Serviced' : 'Replaced'); showSnack(`${tl.name}: count starts again`); }} />
        {tl.kind === 'other' ? <Button small kind="secondary" title="Add one use" onPress={() => set({ uses: tl.uses + 1 })} /> : null}
        {tl.log[0] ? <T s="small">Last: {tl.log[0].text}, {dayLabel(tl.log[0].day, { month: 'short', day: 'numeric' })}</T> : null}
      </View>
    </Card>
  );
}

/* ================= Activity ================= */
export function ActivityScreen() {
  const shop = useShop();
  const [q, setQ] = useState('');
  const list = shop.activity.filter(a => !q.trim() || (a.text + ' ' + a.sub).toLowerCase().includes(q.trim().toLowerCase()));
  let lastDay = '';
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 18, maxWidth: 820 }}>
      <T s="title">Activity</T>
      <Field label="Find" value={q} onChange={setQ} placeholder="Cut, sale, timed…" />
      {!list.length ? <T s="sub">{shop.activity.length ? 'Nothing matches.' : 'What you do in the app shows here: cuts, timed steps, sales, restocks.'}</T> : null}
      <Card pad={false} style={{ overflow: 'hidden' }}>
        {list.map((a, i) => {
          const day = new Date(a.t).toDateString();
          const head = day !== lastDay;
          lastDay = day;
          return (
            <View key={i}>
              {head ? <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}><T s="h2">{new Date(a.t).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</T></View> : null}
              <Row first>
                <View style={{ flex: 1 }}><T>{a.who === 'You' ? 'You ' : a.who + ' '}{a.text}</T>{a.sub ? <T s="sub">{a.sub}</T> : null}</View>
                <T s="small">{new Date(a.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</T>
              </Row>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

export { TrashIcon, pct, R };
