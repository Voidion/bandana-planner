/* Today, laid out like the prototype's desktop dashboard: who's timing, the next 7 days, this month, what's on the bench,
   what's coming up, the shelf, quotes out and recent activity. */
import { ExampleBanner, GettingStarted } from '../ui/GettingStarted';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as E from '../engine/engine';
import { ago, clock, dayLabel, mins, money, money0, plural, relDue, yd } from '../lib/format';
import { addDays, quoteTotals, rel, runNumbers, schedule, sync, timerMs, todayDay } from '../lib/plan';
import { alertsNow, leftMins } from '../state/alerts';
import { orderCount } from '../state/selling';
import { pauseTimer, stopTimer, useShop } from '../state/store';
import type { Run, Shop } from '../state/types';
import { ChevIcon, CoinIcon, PauseIcon, PlayIcon, StopIcon, WarnIcon } from '../ui/icons';
import { Button, showSnack, T } from '../ui/kit';
import { F, shadow, useTheme } from '../ui/theme';
import { FabThumb, RunThumb } from '../ui/Thumbs';
import { useNow } from '../ui/useNow';
import { bench, pieces } from './WorkflowScreen';

type Go = (route: string, id?: string) => void;
const rnT = (r: Run) => (r.name || 'Untitled run').split(' — ')[0];
const rnP = (r: Run) => (r.name || '').split(' — ')[1] || '';
const dshort = (day: string) => dayLabel(day, { weekday: 'short', month: 'short', day: 'numeric' });

export function TodayScreen({ go, onDefect, onInbox, onPlan }: { go: Go; onDefect: () => void; onInbox: () => void; onPlan: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(1100);
  const sc = useMemo(() => schedule(shop), [shop]);
  const wkCap = sc.cap.slice(0, 7).reduce((a: number, c: number) => a + c, 0);
  const wkUsed = sc.used.slice(0, 7).reduce((a: number, c: number) => a + c, 0);
  const free = Math.max(0, wkCap - wkUsed);
  const lateN = sc.late.length;
  const month = todayDay().slice(0, 7);
  const income = shop.sales.filter(e => e.day.startsWith(month)).reduce((a, e) => a + e.sub - (e.refund || 0), 0);
  const profitEach = useMemo(() => (sync(shop), E.profitEach()), [shop]);
  const finished = shop.runs.filter(r => r.status === 'done').length;
  const b = bench(shop.runs);
  const al = alertsNow(shop);
  const wide = w >= 980;
  const gap = 14;
  return (
    <ScrollView onLayout={e => setW(e.nativeEvent.layout.width)} contentContainerStyle={{ paddingHorizontal: 30, paddingTop: 18, paddingBottom: 24, gap }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: wide ? 'nowrap' : 'wrap' }}>
        <View>
          <Text style={{ fontSize: F.f14, color: t.text3 }}>{dayLabel(todayDay(), { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, color: t.text }}>Today</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexShrink: 1, flexWrap: wide ? 'nowrap' : 'wrap', width: wide ? undefined : '100%' }}>
          {al.length ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${plural(al.length, 'reminder')}. ${al[0].t}. Open reminders`} onPress={onInbox}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingLeft: 8, paddingRight: 12, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, flexShrink: 1, minWidth: 150, maxWidth: wide ? 420 : undefined, flexGrow: wide ? 0 : 1 }}>
              <View style={{ minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: al[0].tone === 'bad' ? t.dangerTint : al[0].tone === 'warn' ? t.warnTint : t.sunken }}>
                <Text style={{ fontSize: F.f13, fontWeight: '700', color: al[0].tone === 'bad' ? t.danger : al[0].tone === 'warn' ? t.onWarn : t.text2 }}>{al.length}</Text>
              </View>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: F.f13, color: t.text }}>
                <Text style={{ fontWeight: '600' }}>{al[0].t}</Text>
                {al.length > 1 ? <Text style={{ color: t.text3 }}>{`  and ${al.length - 1} more`}</Text> : null}
              </Text>
              <ChevIcon color={t.text3} size={14} />
            </Pressable>
          ) : null}
          <Button small kind="secondary" title="Record a sale" icon={c => <CoinIcon color={c} size={16} />} onPress={() => go('sales', 'record')} />
          <Button small kind="secondary" title="Log a defect" icon={c => <WarnIcon color={c} size={16} />} onPress={onDefect} />
        </View>
      </View>
      <ExampleBanner />
      <GettingStarted go={go} />

      {/* row 1: activity · next 7 days | this month */}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap }}>
        <DCard style={wide ? { flex: 1 } : null}>
          <CardHead title="Activity" link="See all" onLink={() => go('activity')} />
          <YouRow go={go} />
          {!shop.timer ? <Button small kind="secondary" title="Start a step" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onPress={() => go('workflow')} /> : null}
        </DCard>
        <Joined style={wide ? { flex: 2 } : null} row={w >= 640}>
          <DCard flat onPress={() => go('schedule')} label="Next 7 days, open Schedule">
            <CardHead title="Next 7 days" right={<Text style={{ fontSize: F.f13, fontWeight: '600', color: lateN ? t.warn : t.success }}>{lateN ? `${lateN} running late` : 'all fit'}</Text>} chev />
            <BigNum n={mins(wkUsed)} sub={!wkUsed ? `booked · all ${mins(wkCap)} free` : free ? `booked · ${mins(free)} still free` : 'booked · no free time left'} />
            <WeekBars sc={sc} h={46} />
          </DCard>
          <DCard flat onPress={() => go('trends')} label={`${dayLabel(todayDay(), { month: 'long' })}, open Trends`}>
            <CardHead title={dayLabel(todayDay(), { month: 'long' })} chev />
            <BigNum n={money0(income)} sub={`of ${money0(shop.goals.income)} income goal`} />
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.sunken, overflow: 'hidden' }}>
              <View style={{ height: 8, borderRadius: 4, width: `${Math.min(100, (income / Math.max(1, shop.goals.income)) * 100)}%`, backgroundColor: income >= shop.goals.income ? t.success : t.action }} />
            </View>
            <View style={{ marginTop: 'auto' }}>
              <KV k="Profit a bandana" v={profitEach ? money(profitEach) : 'Not yet'} />
              <KV k="Runs finished" v={String(finished)} />
            </View>
          </DCard>
        </Joined>
      </View>

      {/* row 2: on the bench · coming up */}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap }}>
        <DCard style={[wide ? { flex: 2 } : null, { paddingBottom: 8 }]}>
          <CardHead title={<>On the bench{b.length ? <Text style={{ color: t.text3, fontWeight: '500' }}>{` · ${plural(b.length, 'run')}, ${b.reduce((a, r) => a + pieces(r), 0)} bandanas`}</Text> : null}</>} onTitle={() => go('runs')} link="Plan a run" onLink={onPlan} />
          {b.length ? <BenchTable runs={b} go={go} narrow={w < 760} /> : <Text style={{ fontSize: F.f14, color: t.text3, paddingVertical: 6 }}>Nothing on the bench yet. Plan a run and it shows here with its progress and due date.</Text>}
        </DCard>
        <ComingUp shop={shop} go={go} style={wide ? { flex: 1 } : null} />
      </View>

      {/* row 3: shelf · quotes out · recent activity */}
      <Joined row={w >= 760}>
        <Shelf go={go} />
        <QuotesOut go={go} />
        <DCard flat onPress={() => go('activity')} label="Recent activity, open the full log">
          <CardHead title="Recent activity" chev />
          {shop.activity.length ? null : <Text style={{ fontSize: F.f14, color: t.text3 }}>What you do in the shop shows up here.</Text>}
          {shop.activity.slice(0, 3).map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
              <Av size={30} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: F.f13, lineHeight: 18, color: t.text }}><Text style={{ fontWeight: '700' }}>You</Text> {a.text}</Text>
                <Text style={{ fontSize: F.f13, color: t.text3 }}>{ago(a.t)}</Text>
              </View>
            </View>
          ))}
        </DCard>
      </Joined>
    </ScrollView>
  );
}

/* ---------- pieces ---------- */
function DCard({ children, style, flat, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; flat?: boolean; onPress?: () => void; label?: string }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const base: StyleProp<ViewStyle> = [{ padding: 20, gap: 10, minWidth: 0 }, flat ? { flex: 1 } : [{ backgroundColor: t.surface, borderRadius: 20 }, shadow(t.dark)], style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)} style={[base, hover ? { backgroundColor: t.dark ? '#26262B' : '#FAFAFB' } : null]}>
      {children}
    </Pressable>
  );
}
/** Cards that share one white surface with hairlines between them (the prototype's pair and trio) */
function Joined({ children, style, row }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; row: boolean }) {
  const t = useTheme();
  const kids = React.Children.toArray(children);
  return (
    <View style={[{ flexDirection: row ? 'row' : 'column', backgroundColor: t.surface, borderRadius: 22, overflow: 'hidden' }, shadow(t.dark), style]}>
      {kids.map((k, i) => (
        <View key={i} style={{ flex: 1, flexDirection: 'row', borderLeftWidth: row && i ? 1 : 0, borderTopWidth: !row && i ? 1 : 0, borderColor: t.line }}>{k}</View>
      ))}
    </View>
  );
}
function CardHead({ title, link, onLink, right, chev, onTitle }: { title: React.ReactNode; link?: string; onLink?: () => void; right?: React.ReactNode; chev?: boolean; onTitle?: () => void }) {
  const t = useTheme();
  const head = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, flexShrink: 1 }}>
      <Text numberOfLines={1} style={{ fontSize: F.f15, fontWeight: '700', color: t.text, flexShrink: 1 }}>{title}</Text>
      {onTitle ? <ChevIcon color={t.text3} size={14} /> : null}
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      {onTitle ? <Pressable accessibilityRole="button" onPress={onTitle} style={{ flexShrink: 1 }}>{head}</Pressable> : head}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {right}
        {link ? (
          <Pressable accessibilityRole="button" onPress={onLink} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.action }}>{link}</Text>
          </Pressable>
        ) : null}
        {chev ? <ChevIcon color={t.text3} size={14} /> : null}
      </View>
    </View>
  );
}
function BigNum({ n, sub }: { n: string; sub: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8 }}>
      <Text style={{ fontSize: 34, fontWeight: '600', letterSpacing: -0.6, color: t.text, fontVariant: ['tabular-nums'] }}>{n}</Text>
      <Text style={{ fontSize: F.f14, color: t.text3 }}>{sub}</Text>
    </View>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.line }}>
      <Text style={{ fontSize: F.f14, color: t.text2 }}>{k}</Text>
      <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
}
function Av({ size = 40, dot }: { size?: number; dot?: string }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size > 34 ? F.f15 : F.f13, fontWeight: '700', color: t.onTint }}>Y</Text>
      {dot ? <View style={{ position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: dot, borderWidth: 2.5, borderColor: t.surface }} /> : null}
    </View>
  );
}

/** Next 7 days: free time (grey) and booked work (amber), hours above each day */
export function WeekBars({ sc, h }: { sc: { cap: number[]; used: number[] }; h: number }) {
  const t = useTheme();
  const mx = Math.max(60, ...sc.cap.slice(0, 7), ...sc.used.slice(0, 7));
  return (
    <View accessibilityLabel="Planned work against free time for the next 7 days" style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end' }}>
      {sc.cap.slice(0, 7).map((c, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text2, minHeight: 16, fontVariant: ['tabular-nums'] }}>{sc.used[i] ? Math.round(sc.used[i] / 6) / 10 + 'h' : c ? '' : 'off'}</Text>
          <View style={{ width: '100%', maxWidth: 30, height: h, justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(c / mx) * 100}%`, borderRadius: 6, backgroundColor: t.sunken }} />
            <View style={{ height: `${(sc.used[i] / mx) * 100}%`, borderRadius: 6, backgroundColor: i === 0 ? t.barA : t.barB }} />
          </View>
          <Text style={{ fontSize: F.f13, fontWeight: '500', color: t.text3 }}>{i === 0 ? 'Today' : dayLabel(addDays(todayDay(), i), { weekday: 'short' })}</Text>
        </View>
      ))}
    </View>
  );
}

/** You: what you're timing (with pause and stop) or what you did last */
function YouRow({ go }: { go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  useNow(!!m && !m.paused);
  const r = m && shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m!.step);
  const last = shop.activity[0];
  const desc = s ? (m!.paused ? `Paused · ${s.name}` : `${s.name} · ${rnT(r!)}`) : last ? `${last.text.charAt(0).toUpperCase() + last.text.slice(1)} · ${ago(last.t)}` : 'Not working on anything';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64 }}>
      <Pressable accessibilityRole="button" onPress={() => (s ? go('workflow', r!.id) : go('activity'))} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Av dot={t.success} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: F.f15, fontWeight: '500', color: t.text }}>You</Text>
          <Text numberOfLines={2} style={{ fontSize: F.f14, color: s && !m!.paused ? t.success : t.text3, fontWeight: s && !m!.paused ? '500' : '400' }}>{desc}</Text>
        </View>
        {s ? <Text style={{ fontSize: F.f15, fontWeight: '600', color: m!.paused ? t.warn : t.text, fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</Text> : null}
      </Pressable>
      {s ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={m!.paused ? 'Resume timer' : 'Pause timer'} onPress={pauseTimer} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
            {m!.paused ? <PlayIcon color={t.text} size={16} /> : <PauseIcon color={t.text} size={16} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Stop and record" onPress={() => { const res = stopTimer(); if (res) showSnack(`Recorded ${mins(res.mins)} for ${res.step}`); }}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.dark ? t.text : '#1B1B1E', alignItems: 'center', justifyContent: 'center' }}>
            <StopIcon color={t.dark ? t.bg : '#fff'} size={15} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function BenchTable({ runs, go, narrow }: { runs: Run[]; go: Go; narrow: boolean }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  const hd = (s: string, style?: any) => <Text style={[{ fontSize: F.f13, fontWeight: '600', color: t.text3 }, style]}>{s}</Text>;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: t.line }}>
        <View style={{ width: 58 }} />
        <View style={{ flex: 2, paddingRight: 14 }}>{hd('Run')}</View>
        {!narrow ? <View style={{ flex: 1.3, paddingRight: 14 }}>{hd('Progress')}</View> : null}
        <View style={{ width: 112, paddingRight: 14 }}>{hd('Due')}</View>
        {!narrow ? <View style={{ width: 84 }}>{hd('List value', { textAlign: 'right' })}</View> : null}
      </View>
      {runs.map((r, i) => {
        const dn = r.steps.filter(s => s.done).length;
        const due = rel(r.due);
        const live = m && m.run === r.id;
        const worth = runNumbers(shop, r).worth;
        return (
          <BenchRow key={r.id} last={i === runs.length - 1} onPress={() => go('runs', r.id)}>
            <View style={{ width: 58 }}><RunThumb r={r} /></View>
            <View style={{ flex: 2, paddingRight: 14, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>{rnT(r)}</Text>
              <Text numberOfLines={1} style={{ fontSize: F.f13, color: t.text3 }}>{rnP(r) ? rnP(r) + ' · ' : ''}{pieces(r)} bandanas</Text>
            </View>
            {!narrow ? (
              <View style={{ flex: 1.3, paddingRight: 14, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${(dn / Math.max(1, r.steps.length)) * 100}%`, backgroundColor: t.action }} />
                  </View>
                  <Text style={{ fontSize: F.f13, color: t.text2, fontVariant: ['tabular-nums'] }}>{dn} of {r.steps.length}</Text>
                </View>
                {live ? <Text style={{ fontSize: F.f13, fontWeight: '700', color: m!.paused ? t.warn : t.success }}>{m!.paused ? 'Paused' : 'You’re timing'}</Text> : null}
              </View>
            ) : null}
            <View style={{ width: 112, paddingRight: 14 }}>
              <Text style={{ fontSize: F.f13, fontWeight: '600', color: due != null && due < 0 ? t.warn : t.text3 }}>{due == null ? 'No date' : due < 0 ? relDue(due) : dshort(r.due!)}</Text>
            </View>
            {!narrow ? <Text style={{ width: 84, textAlign: 'right', fontSize: F.f15, fontWeight: '500', color: t.text, fontVariant: ['tabular-nums'] }}>{money0(worth)}</Text> : null}
          </BenchRow>
        );
      })}
    </View>
  );
}
function BenchRow({ children, last, onPress }: { children: React.ReactNode; last: boolean; onPress: () => void }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 62, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line, backgroundColor: hover ? t.bg : 'transparent', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 }}>
      {children}
    </Pressable>
  );
}

function ComingUp({ shop, go, style }: { shop: Shop; go: Go; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const ev: { d: number; t: string; s: string; go?: () => void }[] = [];
  bench(shop.runs).forEach(r => {
    const d = rel(r.due);
    if (d != null && d >= 0) ev.push({ d, t: rnT(r) + ' due', s: `~${mins(leftMins(r))} left`, go: () => go('runs', r.id) });
  });
  shop.cal.forEach(e => {
    const d = rel(e.day);
    if (d != null && d >= 0 && d <= 30) ev.push({ d, t: e.title || (e.kind === 'market' ? 'Market' : e.kind === 'off' ? 'Day off' : 'Event'), s: e.kind === 'market' ? 'Market day' : e.kind === 'off' ? 'Not working' : e.notes || 'On your calendar', go: () => go('schedule') });
  });
  shop.orders
    .filter(o => o.status !== 'delivered' && !o.run && !o.fromStock.length && o.due && orderCount(o) > 0)
    .forEach(o => {
      const d = rel(o.due)!;
      if (d >= 0) ev.push({ d, t: `${shop.customers.find(c => c.id === o.cust)?.name || o.title || 'An'} order due`, s: 'Not planned yet', go: () => go('orders', o.id) });
    });
  ev.sort((a, b) => a.d - b.d);
  return (
    <DCard style={style}>
      <CardHead title="Coming up" onTitle={() => go('schedule')} link={ev.length > 3 ? `${ev.length - 3} more` : 'Schedule'} onLink={() => go('schedule')} />
      {ev.length ? null : <Text style={{ fontSize: F.f14, color: t.text3, paddingVertical: 6 }}>Nothing coming up this week.</Text>}
      {ev.slice(0, 3).map((e, i) => {
        const day = addDays(todayDay(), e.d);
        return (
          <Pressable key={i} accessibilityRole="button" onPress={e.go} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 52, paddingVertical: 4 }}>
            <View style={{ width: 48, alignItems: 'center', borderRadius: 12, backgroundColor: t.bg, paddingVertical: 6 }}>
              <Text style={{ fontSize: F.f13, fontWeight: '700', color: t.text3 }}>{dayLabel(day, { weekday: 'short' }).toUpperCase()}</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>{+day.slice(8)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: F.f14, fontWeight: '700', color: t.text }}>{e.t}</Text>
              <Text numberOfLines={1} style={{ fontSize: F.f13, color: t.text3 }}>{e.s}</Text>
            </View>
          </Pressable>
        );
      })}
    </DCard>
  );
}

function Shelf({ go }: { go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const fabs = shop.fabrics.filter(f => !f.offcut);
  const isLow = (f: (typeof fabs)[number]) => f.low > 0 && f.yards <= f.low;
  const low = fabs.filter(f => isLow(f) && !(f.onOrder > 0));
  const top = [...fabs].sort((x, y) => +isLow(y) - +isLow(x) || y.yards - x.yards).slice(0, 3);
  return (
    <DCard flat onPress={() => go('fabric')} label="Shelf, open Fabric">
      <CardHead title="Shelf" right={fabs.length ? <Text style={{ fontSize: F.f13, color: t.text3, fontVariant: ['tabular-nums'] }}>{plural(fabs.length, 'bolt')} · {yd(fabs.reduce((a, f) => a + f.yards, 0))}</Text> : null} chev />
      {fabs.length ? null : <Text style={{ fontSize: F.f14, color: t.text3 }}>No fabric yet.</Text>}
      <View>
        {top.map((f, i) => (
          <Pressable key={f.id} accessibilityRole="button" onPress={() => go('fabric', f.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderBottomWidth: i < top.length - 1 ? 1 : 0, borderBottomColor: t.line }}>
            <FabThumb f={f} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: F.f14, fontWeight: '500', color: t.text }}>{f.name}</Text>
            <Text style={{ fontSize: F.f14, color: isLow(f) ? t.warn : t.text3, fontWeight: isLow(f) ? '600' : '400', fontVariant: ['tabular-nums'] }}>{yd(f.yards)}</Text>
          </Pressable>
        ))}
      </View>
      {low.length ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 10, borderTopWidth: 1, borderTopColor: t.line }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: F.f13, color: t.warn, fontWeight: '600' }}>{low.length === 1 ? `${low[0].name} is low` : `${low.length} fabrics are low`}</Text>
          <Pressable accessibilityRole="button" onPress={() => go('restock')} style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.action }}>Restock</Text>
          </Pressable>
        </View>
      ) : null}
    </DCard>
  );
}

function QuotesOut({ go }: { go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const sent = shop.quotes.filter(q => q.status === 'sent');
  const exp = (q: (typeof sent)[number]) => (rel(q.until) ?? 0) < 0;
  const out = sent.filter(q => !exp(q));
  const ex = sent.filter(exp);
  const total = (q: (typeof sent)[number]) => quoteTotals(shop, q).grand || 0;
  const who = (q: (typeof sent)[number]) => shop.customers.find(c => c.id === q.cust)?.name || q.title || q.no;
  return (
    <DCard flat onPress={() => go('quotes')} label="Quotes out, open Quotes">
      <CardHead title="Quotes out" chev />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] }}>{money0(out.reduce((a, q) => a + total(q), 0))}</Text>
        <Text style={{ fontSize: F.f13, color: t.text3 }}>
          {out.length ? `waiting on ${plural(out.length, 'client')}` : 'nothing waiting'}
          {ex.length ? <Text style={{ color: t.warn, fontWeight: '600' }}>{` · ${ex.length} ended`}</Text> : null}
        </Text>
      </View>
      {sent.length ? null : <Text style={{ fontSize: F.f14, color: t.text3 }}>Quotes you send show here until the client answers.</Text>}
      {[...out, ...ex].slice(0, 2).map(q => (
        <Pressable key={q.id} accessibilityRole="button" onPress={() => go('quotes', q.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: F.f14, fontWeight: '700', color: t.text }}>{who(q)}</Text>
            <Text numberOfLines={1} style={{ fontSize: F.f13, color: exp(q) ? t.warn : t.text3, fontWeight: exp(q) ? '600' : '400' }}>{exp(q) ? 'Ended · follow up' : `Sent · holds to ${dayLabel(q.until, { month: 'short', day: 'numeric' })}`}</Text>
          </View>
          <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] }}>{money0(total(q))}</Text>
        </Pressable>
      ))}
    </DCard>
  );
}
