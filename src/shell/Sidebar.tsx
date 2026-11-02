/* The prototype's desktop navigation: a full sidebar (grouped, with badges, the dark timer card, New and your card),
   or an icon rail on Today, Runs and Schedule and on narrow windows. "More" slides the full sidebar over the content. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { clock, mins } from '../lib/format';
import { timerMs } from '../lib/plan';
import { alertsNow, leftMins, unseenCount } from '../state/alerts';
import { taskState, toolState, usedTool } from '../state/equip';
import { isLate, orderCount } from '../state/selling';
import { dataFolderPath, openPath } from '../state/storage';
import { pauseTimer, setCfg, stopTimer, useSaveState, useShop } from '../state/store';
import type { Shop } from '../state/types';
import { AutoThemeIcon, BatchesIcon, BellIcon, BoxIcon, CartIcon, CoinIcon, DocIcon, MoonIcon, MoreIcon, PauseIcon, PeopleIcon, PhotoIcon, PlayIcon, PlusIcon, PriceIcon, PulseIcon, RunsIcon, SearchIcon, ShelfIcon, SlidersIcon, SplitIcon, StopIcon, SunIcon, TimeIcon, TodayIcon, TrendIcon, WalletIcon, WrenchIcon, CalIcon } from '../ui/icons';
import { openMenuAt, showSnack } from '../ui/kit';
import { F, useTheme } from '../ui/theme';
import { useNow } from '../ui/useNow';

export type Route = 'today' | 'runs' | 'workflow' | 'schedule' | 'orders' | 'quotes' | 'customers' | 'sales' | 'stock' | 'market' | 'fabric' | 'supplies' | 'restock' | 'suppliers' | 'photos' | 'trends' | 'reports' | 'maintenance' | 'activity' | 'settings';
type Ic = (p: { color: string; size?: number }) => React.ReactElement;
type NavItem = [Route, string, Ic];
export const NAV: [string | null, NavItem[]][] = [
  [null, [['today', 'Today', TodayIcon], ['runs', 'Runs', RunsIcon], ['workflow', 'Workflow', TimeIcon], ['schedule', 'Schedule', CalIcon]]],
  ['Sell', [['orders', 'Orders', CartIcon], ['quotes', 'Quotes', PriceIcon], ['customers', 'Customers', PeopleIcon], ['sales', 'Payments', WalletIcon], ['stock', 'Finished stock', BoxIcon], ['market', 'Market day', CoinIcon]]],
  ['Shop', [['fabric', 'Fabric', ShelfIcon], ['photos', 'Photos', PhotoIcon], ['trends', 'Trends', TrendIcon], ['reports', 'Reports', DocIcon], ['maintenance', 'Maintenance', WrenchIcon], ['activity', 'Activity', PulseIcon]]],
];
/** Screens reached from inside another section light up that section */
const PARENT: Partial<Record<Route, Route>> = { supplies: 'fabric', restock: 'fabric', suppliers: 'fabric' };
const RAIL_KEEP: Route[] = ['today', 'runs', 'workflow', 'schedule', 'orders', 'fabric'];
/** Sections that use the icon rail so their content gets the room */
export const COMPACT: Route[] = ['today', 'runs', 'schedule'];

type Badge = { tone: 'warn' | 'tint' | 'live'; text: string } | null;
function badges(s: Shop): Partial<Record<Route, Badge>> {
  const late = s.runs.filter(r => r.status !== 'done' && r.due && r.due < todayIso() && leftMins(r) > 0).length;
  const toPlan = s.orders.filter(o => o.status !== 'delivered' && !o.run && !o.fromStock.length && orderCount(o) > 0).length;
  const owed = s.sales.filter(isLate).length;
  const low = s.fabrics.filter(f => !f.offcut && f.low > 0 && f.yards <= f.low && !(f.onOrder > 0)).length;
  const mt = s.equip.tools.filter(t => usedTool(s.equip, t) && toolState(t).tone !== 'ok').length + s.equip.tasks.filter(t => taskState(s.equip, t).due).length;
  return {
    runs: late ? { tone: 'warn', text: `${late} late` } : null,
    orders: toPlan ? { tone: 'tint', text: `${toPlan} to plan` } : null,
    sales: owed ? { tone: 'warn', text: `${owed} late` } : null,
    fabric: low ? { tone: 'warn', text: `${low} low` } : null,
    maintenance: mt ? { tone: 'warn', text: `${mt} due` } : null,
    market: s.market.open ? { tone: 'live', text: '' } : null,
  };
}
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface NavProps {
  route: Route;
  go: (r: Route) => void;
  onSearch: () => void;
  onNew: () => void;
  onInbox: () => void;
  onSplit: () => void;
  split: boolean;
  openTimer: (runId: string) => void;
}

/* ---------- full sidebar ---------- */
export function Sidebar(p: NavProps & { peek?: boolean; onClosePeek?: () => void }) {
  const t = useTheme();
  const shop = useShop();
  const save = useSaveState();
  const b = badges(shop);
  const showTimer = !!shop.timer && p.route !== 'today' && p.route !== 'workflow';
  return (
    <View style={[{ width: 312, backgroundColor: t.surface, borderRightWidth: 1, borderRightColor: t.line, paddingTop: 26, paddingHorizontal: 14, paddingBottom: 18, gap: 4 }, p.peek ? { position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 31, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 32, shadowOffset: { width: 12, height: 0 }, elevation: 12 } : null]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, paddingBottom: 16 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.action, alignItems: 'center', justifyContent: 'center' }}>
          <BatchesIcon color={t.onAction} size={18} />
        </View>
        <Text numberOfLines={1} style={{ flex: 1, fontWeight: '700', fontSize: F.f16, color: t.text }}>{shop.shopName || 'Your shop'}</Text>
        <Bell onPress={p.onInbox} />
        <IconBtn label={p.split ? 'Close split view' : 'Split view'} on={p.split} onPress={p.onSplit}>{c => <SplitIcon color={c} size={24} />}</IconBtn>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Search (Ctrl+K)" onPress={p.onSearch}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingLeft: 12, paddingRight: 10, marginBottom: 10, borderRadius: 14, backgroundColor: t.bg, borderWidth: 1, borderColor: t.line }}>
        <SearchIcon color={t.text3} size={20} />
        <Text style={{ flex: 1, fontSize: F.f15, color: t.text2 }}>Search</Text>
        <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text3, backgroundColor: t.surface, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: t.line2 }}>Ctrl K</Text>
      </Pressable>
      <ScrollView style={{ flex: 1, marginHorizontal: -14 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 28, gap: 4 }}>
        {NAV.map(([g, items]) => (
          <View key={g || 'top'} style={{ gap: 4 }}>
            {g ? <Text style={{ paddingTop: 18, paddingHorizontal: 12, paddingBottom: 6, fontSize: F.f13, fontWeight: '600', color: t.text3, textTransform: 'uppercase', letterSpacing: 0.6 }}>{g}</Text> : null}
            {items.map(([r, label, Icon]) => (
              <NavRow key={r} on={(PARENT[p.route] || p.route) === r} label={label} icon={c => <Icon color={c} size={22} />} badge={b[r] || null} onPress={() => p.go(r)} />
            ))}
          </View>
        ))}
      </ScrollView>
      {showTimer ? <NavTimer open={p.openTimer} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="New (Ctrl+N)" onPress={p.onNew}
        style={{ minHeight: 48, marginTop: showTimer ? 10 : 12, marginBottom: 10, borderRadius: 16, backgroundColor: t.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <PlusIcon color={t.onAction} size={20} />
        <Text style={{ color: t.onAction, fontWeight: '600', fontSize: F.f15 }}>New</Text>
      </Pressable>
      <MeCard settingsOn={p.route === 'settings'} go={p.go} />
      <Text style={{ fontSize: F.f12, color: save === 'error' ? t.danger : t.text3, paddingHorizontal: 10, paddingTop: 6 }}>
        {save === 'error' ? 'Couldn’t save. Retrying with your next change.' : save === 'saving' ? 'Saving…' : 'Saved on this computer'}
      </Text>
    </View>
  );
}

function NavRow({ on, label, icon, badge, onPress }: { on: boolean; label: string; icon: (c: string) => React.ReactNode; badge: Badge; onPress: () => void }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const fg = on ? t.onTint : t.text2;
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 12, borderRadius: 14, backgroundColor: on ? t.tint : hover ? t.bg : 'transparent' }}>
      {icon(fg)}
      <Text style={{ flex: 1, fontSize: F.f15, fontWeight: on ? '600' : '500', color: fg }}>{label}</Text>
      {badge ? badge.tone === 'live' ? (
        <View accessibilityLabel="Live" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.success }} />
      ) : (
        <View style={{ backgroundColor: badge.tone === 'warn' ? t.warnTint : t.tint, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontSize: F.f13, fontWeight: '600', color: badge.tone === 'warn' ? (t.dark ? t.onWarn : t.warn) : t.onTint }}>{badge.text}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function IconBtn({ label, onPress, on, children, size = 48 }: { label: string; onPress: (e?: any) => void; on?: boolean; children: (c: string) => React.ReactNode; size?: number }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={on != null ? { selected: on } : undefined} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={{ width: size, height: size, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.tint : hover ? t.bg : 'transparent' }}>
      {children(on ? t.onTint : t.text2)}
    </Pressable>
  );
}

function Bell({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const shop = useShop();
  useNow(true, 60000);
  const tot = alertsNow(shop).length;
  const n = unseenCount(shop);
  return (
    <View>
      <IconBtn label={`Reminders${tot ? `, ${tot}${n ? `, ${n} new` : ''}` : ', none'}`} onPress={onPress}>{c => <BellIcon color={c} size={24} />}</IconBtn>
      {tot ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: n ? t.danger : t.sunken, borderWidth: 2, borderColor: t.surface }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: n ? (t.dark ? '#1B1B1E' : '#fff') : t.text2 }}>{(n || tot) > 9 ? '9+' : n || tot}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** The dark "you're timing" card above New */
function NavTimer({ open }: { open: (runId: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  useNow(!!m && !m.paused);
  const r = m && shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m!.step);
  if (!m || !r || !s) return null;
  return (
    <View accessibilityRole="summary" style={{ backgroundColor: t.timerBg, borderRadius: 18, paddingTop: 6, paddingHorizontal: 8, paddingBottom: 8, gap: 2, marginTop: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${s.name} in Workflow`} onPress={() => open(r.id)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: m.paused ? '#F0C159' : '#7ED892' }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: '#F2F0F4', fontSize: F.f14, fontWeight: '700' }}>{s.name}</Text>
          <Text numberOfLines={1} style={{ color: '#C7C6CA', fontSize: F.f13 }}>{m.paused ? 'Paused · ' : ''}{(r.name || 'Untitled run').split(' — ')[0]}</Text>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: m.paused ? '#F0C159' : '#fff', fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</Text>
        <TimerButtons size={40} />
      </View>
    </View>
  );
}

function TimerButtons({ size }: { size: number }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  if (!m) return null;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={m.paused ? 'Resume timer' : 'Pause timer'} onPress={pauseTimer} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
        {m.paused ? <PlayIcon color="#fff" size={14} /> : <PauseIcon color="#fff" size={14} />}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Stop and record" onPress={() => { const res = stopTimer(); if (res) showSnack(`Recorded ${mins(res.mins)} for ${res.step}`); }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.amber, alignItems: 'center', justifyContent: 'center' }}>
        <StopIcon color={t.onAmber} size={14} />
      </Pressable>
    </>
  );
}

/** Your card at the bottom: menu, light/dark, settings */
function MeCard({ settingsOn, go }: { settingsOn: boolean; go: (r: Route) => void }) {
  const t = useTheme();
  const shop = useShop();
  const theme = shop.cfg.theme;
  const [hover, setHover] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 18, backgroundColor: t.meCard, borderWidth: 1, borderColor: t.meEdge }}>
      <Pressable accessibilityRole="button" accessibilityLabel="You. Settings and your data folder" onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
        onPress={(e: any) => meMenu(e, go)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, borderRadius: 14, backgroundColor: hover ? t.surface : 'transparent' }}>
        <Avatar />
        <Text numberOfLines={1} style={{ flex: 1, fontSize: F.f15, fontWeight: '600', color: t.text }}>You</Text>
      </Pressable>
      <IconBtn label={`Appearance: ${theme === 'system' ? 'match Windows' : theme}. Click to change`} onPress={() => setCfg({ theme: theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system' })}>
        {c => (theme === 'dark' ? <MoonIcon color={c} size={24} /> : theme === 'light' ? <SunIcon color={c} size={24} /> : <AutoThemeIcon color={c} size={24} />)}
      </IconBtn>
      <IconBtn label={settingsOn ? 'Settings (open)' : 'Settings'} on={settingsOn} onPress={() => go('settings')}>{c => <SlidersIcon color={c} size={24} />}</IconBtn>
    </View>
  );
}
function meMenu(e: any, go: (r: Route) => void) {
  const n = e?.nativeEvent || {};
  openMenuAt(n.pageX ?? 40, Math.max(8, (n.pageY ?? 600) - 130), [
    { label: 'Settings', onPress: () => go('settings') },
    { label: 'Reminder settings', onPress: () => go('settings') },
    { label: 'Open your data folder', onPress: () => dataFolderPath().then(f => { if (f) openPath(f); }) },
  ]);
}
function Avatar({ size = 48 }: { size?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: t.onTint }}>Y</Text>
      <View style={{ position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, backgroundColor: t.success, borderWidth: 3, borderColor: t.meCard }} />
    </View>
  );
}

/* ---------- icon rail ---------- */
export function Rail(p: NavProps & { onMore: () => void }) {
  const t = useTheme();
  const shop = useShop();
  const b = badges(shop);
  const all = NAV.flatMap(g => g[1]);
  const keep = RAIL_KEEP.map(k => all.find(n => n[0] === k)!);
  const rest = all.filter(n => !RAIL_KEEP.includes(n[0]));
  const restOn = rest.some(n => n[0] === p.route);
  const restDots = rest.map(n => b[n[0]]).filter(Boolean) as Exclude<Badge, null>[];
  const m = shop.timer;
  useNow(!!m && !m.paused);
  const tr = m && shop.runs.find(x => x.id === m.run);
  const ts = tr && tr.steps.find(x => x.id === m!.step);
  const dot = (bd: Badge) => (bd ? <View pointerEvents="none" style={{ position: 'absolute', top: 3, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: bd.tone === 'live' ? t.success : bd.tone === 'warn' ? t.barA : t.action, borderWidth: 2, borderColor: t.surface }} /> : null);
  return (
    <View style={{ width: 80, backgroundColor: t.surface, borderRightWidth: 1, borderRightColor: t.line, paddingTop: 16, paddingBottom: 14, alignItems: 'center' }}>
      <Bell onPress={p.onInbox} />
      <IconBtn label="Search (Ctrl+K)" onPress={p.onSearch}>{c => <SearchIcon color={c} size={24} />}</IconBtn>
      <IconBtn label={p.split ? 'Close split view' : 'Split view'} on={p.split} onPress={p.onSplit}>{c => <SplitIcon color={c} size={22} />}</IconBtn>
      <View style={{ width: 40, height: 1, backgroundColor: t.line, marginVertical: 5 }} />
      <ScrollView style={{ flex: 1, alignSelf: 'stretch', overflow: 'hidden' }} contentContainerStyle={{ alignItems: 'center', gap: 4 }}>
        {keep.map(([r, label, Icon]) => (
          <RailBtn key={r} on={(PARENT[p.route] || p.route) === r} label={label} onPress={() => p.go(r)}>
            {c => <Icon color={c} size={24} />}
            {dot(b[r] || null)}
          </RailBtn>
        ))}
        <RailBtn on={restOn} label={`More: ${rest.map(n => n[1]).join(', ')}${restDots.length ? `, ${restDots.length} need${restDots.length === 1 ? 's' : ''} a look` : ''}`} onPress={p.onMore}>
          {c => <MoreIcon color={c} size={22} />}
          {restDots.length ? dot(restDots.find(x => x.tone === 'warn') || restDots.find(x => x.tone === 'live') || restDots[0]) : null}
        </RailBtn>
      </ScrollView>
      {m && tr && ts && p.route !== 'today' && p.route !== 'workflow' ? (
        <View accessibilityLabel={`${m.paused ? 'Paused' : 'Timing'} ${ts.name}`} style={{ width: 64, alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 10, borderRadius: 22, backgroundColor: t.timerBg, marginBottom: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${ts.name} in Workflow`} onPress={() => p.openTimer(tr.id)} style={{ alignItems: 'center', gap: 6, minHeight: 44, justifyContent: 'center', alignSelf: 'stretch' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.paused ? '#F0C159' : '#7ED892' }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: m.paused ? '#F0C159' : '#F2F0F4', fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</Text>
          </Pressable>
          <View style={{ gap: 6 }}><TimerButtons size={40} /></View>
        </View>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="You. Settings and your data folder" onPress={(e: any) => meMenu(e, p.go)} style={{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginTop: m ? 0 : 'auto' }}>
        <Avatar size={44} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="New (Ctrl+N)" onPress={p.onNew} style={{ width: 56, height: 56, borderRadius: 18, marginTop: 6, backgroundColor: t.action, alignItems: 'center', justifyContent: 'center' }}>
        <PlusIcon color={t.onAction} size={26} />
      </Pressable>
    </View>
  );
}

function RailBtn({ on, label, onPress, children }: { on: boolean; label: string; onPress: () => void; children: [(c: string) => React.ReactNode, React.ReactNode] }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const [icon, dot] = children;
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)} style={{ width: 80, height: 56, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 56, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.tint : hover ? t.bg : 'transparent' }}>
        {icon(on ? t.onTint : t.text2)}
        {dot}
      </View>
    </Pressable>
  );
}

/** Scrim behind the slid-in sidebar */
export function PeekScrim({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  return <Pressable accessibilityLabel="Close menu" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim, zIndex: 30 }]} />;
}
