/* Bandana Planner for Windows: laid out like the prototype's desktop view — sidebar or icon rail, the bell, Split view. */
import React, { useEffect, useRef, useState } from 'react';
import { pruneEmptyDrafts } from './src/state/store';
import { PanResponder, Pressable, StatusBar, Text, useWindowDimensions, View } from 'react-native';
import { clock } from './src/lib/format';
import { timerMs } from './src/lib/plan';
import { FabricScreen } from './src/screens/FabricScreen';
import { RunsScreen } from './src/screens/runs/RunsScreen';
import { DefectSheet, FixTimerSheet } from './src/screens/runs/sheets';
import { SettingsScreen, type SettingsTab } from './src/screens/SettingsScreen';
import { StockScreen } from './src/screens/StockScreen';
import { RestockScreen, SuppliersScreen, SuppliesScreen } from './src/screens/ShelfScreens';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { QuotesScreen } from './src/screens/QuotesScreen';
import { MarketScreen } from './src/screens/MarketScreen';
import { PhotosScreen } from './src/screens/PhotosScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { WorkflowScreen } from './src/screens/WorkflowScreen';
import { TrendsScreen } from './src/screens/TrendsScreen';
import { handleKey, NewMenu, SearchSheet } from './src/screens/AppWide';
import { ReportsScreen } from './src/screens/NumbersScreens';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { MaintenanceScreen } from './src/screens/MaintenanceScreen';
import { SetupWizard } from './src/screens/SetupWizard';
import { TourOverlay, useHelpRequest } from './src/ui/tour';
import { pruneAlerts } from './src/state/alerts';
import { purgeOld } from './src/state/photos';
import { sendReminders } from './src/state/reminders';
import { closeOutTimer, flush, getShop, loadShop, planRun, restoreTimer, update, useShop } from './src/state/store';
import { Inbox } from './src/shell/Inbox';
import { COMPACT, IconBtn, NAV, PeekScrim, Rail, Sidebar, type Route } from './src/shell/Sidebar';
import { BellIcon, SearchIcon, SplitIcon } from './src/ui/icons';
import { Button, closeMenu, ContextMenuHost, menuOpen, openMenuAt, PortalHost, Sheet, showSnack, SnackBar, T } from './src/ui/kit';
import { F, shadow, useTheme } from './src/ui/theme';
import { useNow } from './src/ui/useNow';

type Split = { on: boolean; right: Route; focus: 'L' | 'R'; ratio: number };
const TITLES: Record<Route, string> = Object.fromEntries(NAV.flatMap(g => g[1]).map(([r, l]) => [r, l])) as any;
TITLES.settings = 'Settings';

export default function App() {
  const t = useTheme();
  const win = useWindowDimensions();
  const [ready, setReady] = useState<'loading' | 'ok' | 'error'>('loading');
  const [route, setRoute] = useState<Route>('today');
  const [split, setSplit] = useState<Split>({ on: false, right: 'fabric', focus: 'L', ratio: 0.5 });
  const [runSel, setRunSel] = useState<string | null>(null);
  const [wfSel, setWfSel] = useState<string | null>(null);
  const [setTab, setSetTab] = useState<SettingsTab>('shop');
  const [fabSel, setFabSel] = useState<string | null>(null);
  const [supSel, setSupSel] = useState<string | null>(null);
  const [ordSel, setOrdSel] = useState<string | null>(null);
  const [custSel, setCustSel] = useState<string | null>(null);
  const [quoteSel, setQuoteSel] = useState<string | null>(null);
  const [saleSel, setSaleSel] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<null | 'search' | 'new' | 'inbox' | 'defect' | 'layout'>(null);
  const [peek, setPeek] = useState(false);
  const [saleKey, setSaleKey] = useState(0);
  const [tour, setTour] = useState<number | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const live = useShop();
  const [helpReq, clearHelp] = useHelpRequest();
  useEffect(() => {
    if (helpReq === 'tour') {
      setSplit(s => ({ ...s, on: false }));
      setPeek(false);
      setOverlay(null);
      setTour(0);
    } else if (helpReq === 'setup') setSetupOpen(true);
    if (helpReq) clearHelp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helpReq]);
  const endTour = () => {
    setTour(null);
    update(s => ({ ...s, tourDone: true }));
  };

  /** Opens a section (and an item in it) in the main area, or in the focused pane in Split view */
  const show = (r: Route) => {
    setPeek(false);
    if (split.on && split.focus === 'R') setSplit(s => ({ ...s, right: r }));
    else setRoute(r);
  };
  const go = (r0: string, id?: string) => {
    const r = r0 as Route;
    if (r === 'runs' && id) setRunSel(id);
    if (r === 'workflow' && id) setWfSel(id);
    if (r === 'orders' && id) setOrdSel(id);
    if (r === 'fabric' && id) setFabSel(id);
    if (r === 'customers' && id) setCustSel(id);
    if (r === 'supplies' && id) setSupSel(id);
    if (r === 'sales' && id === 'record') setSaleKey(k => k + 1);
    else if (r === 'sales' && id) setSaleSel(id);
    if (r === 'quotes' && id) setQuoteSel(id);
    if (r === 'settings' && id) setSetTab(id as SettingsTab);
    show(r);
  };
  // A run opened with Plan a run and left without a name or any bandanas is cleared away
  const runShown = route === 'runs' || (split.on && split.right === 'runs');
  useEffect(() => {
    pruneEmptyDrafts(runShown ? runSel : null);
  }, [runShown, runSel]);
  const openRun = (id: string) => go('runs', id);
  const openOrder = (id: string) => go('orders', id);
  const openFabric = (id: string) => go('fabric', id);
  const openSupply = (id: string) => go('supplies', id);
  const toggleSplit = () => setSplit(s => ({ ...s, on: !s.on, focus: 'L', right: !s.on && s.right === route ? (route === 'workflow' ? 'fabric' : 'workflow') : s.right }));

  const load = () => {
    setReady('loading');
    loadShop().then(
      () => {
        purgeOld();
        pruneAlerts();
        setReady('ok');
        sendReminders();
      },
      () => setReady('error'),
    );
  };
  useEffect(() => {
    load();
    const id = setInterval(() => {
      sendReminders().catch(() => {});
    }, 60000);
    return () => {
      clearInterval(id);
      flush();
    };
  }, []);

  if (ready === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
        <T s="h1">Can’t open your shop file</T>
        <T s="sub" style={{ textAlign: 'center', maxWidth: 460 }}>It’s still there and nothing has been changed. Close other copies of Bandana Planner and try again.</T>
        <Button title="Try again" onPress={load} />
      </View>
    );
  }
  if (ready === 'loading') return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const keys = (e: any) => {
    const used = handleKey(e, {
      search: () => setOverlay('search'),
      newMenu: () => setOverlay('new'),
      go,
      split: toggleSplit,
      close: () => (tour != null ? (endTour(), true) : menuOpen() ? (closeMenu(), true) : overlay ? (setOverlay(null), true) : peek ? (setPeek(false), true) : false),
    });
    if (used && e?.preventDefault) e.preventDefault();
  };
  const defect = () => {
    const s = getShop();
    const r = s.runs.find(x => x.id === s.timer?.run) || s.runs.find(x => x.status === 'active') || s.runs.find(x => x.status === 'done');
    if (!r) return showSnack('Start a run first, then log defects against it');
    setRunSel(r.id);
    setOverlay('defect');
  };

  const screen = (r: Route) =>
    r === 'today' ? <TodayScreen go={go} onDefect={defect} onInbox={() => setOverlay('inbox')} onPlan={() => openRun(planRun())} />
    : r === 'workflow' ? <WorkflowScreen sel={wfSel} setSel={setWfSel} onPlan={() => openRun(planRun())} />
    : r === 'schedule' ? <ScheduleScreen go={go} />
    : r === 'reports' ? <ReportsScreen go={go} />
    : r === 'trends' ? <TrendsScreen go={go} />
    : r === 'photos' ? <PhotosScreen go={go} />
    : r === 'maintenance' ? <MaintenanceScreen />
    : r === 'activity' ? <ActivityScreen go={go} />
    : r === 'fabric' ? <FabricScreen sel={fabSel} setSel={setFabSel} onPlanWith={id => openRun(planRun({ body: id, ties: id }))} openRun={openRun} go={go} />
    : r === 'runs' ? <RunsScreen sel={runSel} setSel={setRunSel} goSetup={() => go('settings', 'sizes')} openWorkflow={id => go('workflow', id)} />
    : r === 'orders' ? <OrdersScreen sel={ordSel} setSel={setOrdSel} openRun={openRun} openCustomer={id => go('customers', id)} />
    : r === 'quotes' ? <QuotesScreen sel={quoteSel} setSel={setQuoteSel} openOrder={openOrder} openCustomer={id => go('customers', id)} />
    : r === 'market' ? <MarketScreen go={go} />
    : r === 'sales' ? <PaymentsScreen key={saleKey} sel={saleSel} setSel={setSaleSel} autoRecord={saleKey > 0} go={go} />
    : r === 'customers' ? <CustomersScreen sel={custSel} setSel={setCustSel} openOrder={openOrder} openQuote={id => go('quotes', id)} go={go} />
    : r === 'supplies' ? <SuppliesScreen sel={supSel} setSel={setSupSel} />
    : r === 'suppliers' ? <SuppliersScreen openFabric={openFabric} openSupply={openSupply} />
    : r === 'restock' ? <RestockScreen openFabric={openFabric} openSupply={openSupply} />
    : r === 'stock' ? <StockScreen openRun={openRun} go={go} />
    : <SettingsScreen tab={setTab} setTab={setSetTab} openRun={openRun} go={go} />;

  const navProps = { route: split.on ? (split.focus === 'R' ? split.right : route) : route, go: (r: Route) => show(r), onSearch: () => setOverlay('search'), onNew: () => setOverlay('new'), onInbox: () => setOverlay('inbox'), onSplit: toggleSplit, split: split.on, openTimer: (id: string) => go('workflow', id) };
  const useRail = tour == null && (COMPACT.includes(route) || win.width < 1200);
  const rootKeys: any = { onKeyDownCapture: keys };
  const shop = getShop();
  return (
    <View {...rootKeys} style={{ flex: 1, flexDirection: 'row', backgroundColor: t.bg }}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      {split.on ? null : useRail ? <Rail {...navProps} onMore={() => setPeek(true)} /> : <Sidebar {...navProps} />}
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StaleTimer openTimer={id => go('workflow', id)} />
        {split.on ? (
          <SplitView
            split={split}
            setSplit={setSplit}
            left={route}
            pick={(id, r) => (id === 'L' ? setRoute(r) : setSplit(s => ({ ...s, right: r })))}
            render={screen}
            onClose={toggleSplit}
            onSearch={() => setOverlay('search')}
            onInbox={() => setOverlay('inbox')}
            onLayout={() => setOverlay('layout')}
            onMore={() => setPeek(true)}
          />
        ) : (
          <View style={{ flex: 1 }}>{screen(route)}</View>
        )}
      </View>
      {peek ? (
        <>
          <PeekScrim onClose={() => setPeek(false)} />
          <Sidebar {...navProps} peek onClosePeek={() => setPeek(false)} />
        </>
      ) : null}
      {overlay === 'search' ? <SearchSheet onClose={() => setOverlay(null)} go={go} /> : null}
      {overlay === 'new' ? <NewMenu onClose={() => setOverlay(null)} go={go} /> : null}
      {overlay === 'inbox' ? <Inbox onClose={() => setOverlay(null)} go={go} openSettings={() => go('settings', 'shop')} /> : null}
      {overlay === 'defect' && runSel && shop.runs.find(x => x.id === runSel) ? <DefectSheet r={shop.runs.find(x => x.id === runSel)!} onClose={() => setOverlay(null)} /> : null}
      {overlay === 'layout' ? <LayoutSheet split={split} setSplit={setSplit} left={route} setLeft={setRoute} onClose={() => setOverlay(null)} /> : null}
      {setupOpen || (ready === 'ok' && !live.setupDone) ? (
        <SetupWizard onDone={() => { setSetupOpen(false); setRoute('today'); }} onTour={() => { setSetupOpen(false); setSplit(s => ({ ...s, on: false })); setTour(0); }} />
      ) : null}
      {tour != null ? <TourOverlay step={tour} setStep={setTour} onDone={endTour} go={r => { setPeek(false); setRoute(r as Route); }} /> : null}
      <PortalHost />
      <ContextMenuHost />
      <SnackBar />
    </View>
  );
}

/* ---------- Split view ---------- */
function SplitView({ split, setSplit, left, pick, render, onClose, onSearch, onInbox, onLayout, onMore }: {
  split: Split; setSplit: React.Dispatch<React.SetStateAction<Split>>; left: Route; pick: (id: 'L' | 'R', r: Route) => void; render: (r: Route) => React.ReactNode;
  onClose: () => void; onSearch: () => void; onInbox: () => void; onLayout: () => void; onMore: () => void;
}) {
  const t = useTheme();
  const [w, setW] = useState(1200);
  const start = useRef(split.ratio);
  const lastTap = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const now = Date.now();
        if (now - lastTap.current < 350) setSplit(s => ({ ...s, ratio: 0.5 }));
        lastTap.current = now;
        setSplit(s => ((start.current = s.ratio), s));
      },
      onPanResponderMove: (_e, g) => setSplit(s => ({ ...s, ratio: Math.max(0.28, Math.min(0.72, start.current + g.dx / Math.max(1, wRef.current))) })),
    }),
  ).current;
  const wRef = useRef(w);
  wRef.current = w;
  const pane = (id: 'L' | 'R', r: Route) => {
    const focus = split.focus === id;
    return (
      <View onTouchStart={() => !focus && setSplit(s => ({ ...s, focus: id }))} onPointerDown={() => !focus && setSplit(s => ({ ...s, focus: id }))} style={{ flex: id === 'L' ? split.ratio : 1 - split.ratio, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.line, backgroundColor: t.surface }}>
          {id === 'L' ? (
            <>
              <IconBtn label="Close split view" on onPress={onClose}>{c => <SplitIcon color={c} size={20} />}</IconBtn>
              <IconBtn label="Search" onPress={onSearch}>{c => <SearchIcon color={c} size={20} />}</IconBtn>
              <IconBtn label="Reminders" onPress={onInbox}>{c => <BellIcon color={c} size={22} />}</IconBtn>
            </>
          ) : null}
          <PanePick id={id} r={r} focus={focus} onPick={x => pick(id, x)} />
          <View style={{ flex: 1 }} />
          {id === 'R' ? (
            <>
              <IconBtn label="Swap panes" onPress={() => { pick('L', split.right); pick('R', left); }}>{c => <Text style={{ color: c, fontSize: 18, fontWeight: '700' }}>⇄</Text>}</IconBtn>
              <IconBtn label="Layout and saved pairs" onPress={onLayout}>{c => <GridGlyph color={c} />}</IconBtn>
            </>
          ) : (
            <IconBtn label="All sections" onPress={onMore}>{c => <Text style={{ color: c, fontSize: 20, fontWeight: '700', marginTop: -8 }}>…</Text>}</IconBtn>
          )}
        </View>
        <View style={{ flex: 1 }}>{render(r)}</View>
      </View>
    );
  };
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flex: 1, flexDirection: 'row' }}>
      {pane('L', left)}
      <View {...pan.panHandlers} accessibilityRole="adjustable" accessibilityLabel={`Resize panes. Left pane ${Math.round(split.ratio * 100)} percent`} style={{ width: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, borderLeftWidth: 1, borderRightWidth: 1, borderColor: t.line }}>
        <View style={{ width: 4, height: 44, borderRadius: 2, backgroundColor: t.line2 }} />
      </View>
      {pane('R', split.right)}
    </View>
  );
}

function PanePick({ id, r, focus, onPick }: { id: 'L' | 'R'; r: Route; focus: boolean; onPick: (r: Route) => void }) {
  const t = useTheme();
  const all = [...NAV.flatMap(g => g[1]), ['settings', 'Settings', null] as any];
  const it = all.find(x => x[0] === r);
  const Icon = it?.[2];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${id === 'L' ? 'Left' : 'Right'} pane shows ${TITLES[r]}. Change what it shows`}
      onPress={(e: any) => { const n = e?.nativeEvent || {}; openMenuAt(n.pageX ?? 200, n.pageY ?? 60, all.map(([k, l]: any) => ({ label: (k === r ? '✓  ' : '     ') + l, onPress: () => onPick(k) }))); }}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 14, paddingRight: 12, borderRadius: 22, backgroundColor: focus ? t.tint : t.surface, borderWidth: focus ? 0 : 1, borderColor: t.line, flexShrink: 1 }, focus ? null : shadow(t.dark)]}>
      {Icon ? <Icon color={focus ? t.onTint : t.text2} size={18} /> : null}
      <Text numberOfLines={1} style={{ fontSize: F.f15, fontWeight: '700', color: focus ? t.onTint : t.text, flexShrink: 1 }}>{TITLES[r]}</Text>
      <View style={{ width: 7, height: 7, marginTop: -4, marginLeft: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: focus ? t.onTint : t.text3, transform: [{ rotate: '45deg' }] }} />
    </Pressable>
  );
}
function GridGlyph({ color }: { color: string }) {
  const b = { position: 'absolute' as const, width: 7, height: 7, borderRadius: 2, borderWidth: 1.8, borderColor: color };
  return (
    <View style={{ width: 20, height: 20 }}>
      <View style={[b, { left: 1, top: 1 }]} /><View style={[b, { right: 1, top: 1 }]} /><View style={[b, { left: 1, bottom: 1 }]} /><View style={[b, { right: 1, bottom: 1 }]} />
    </View>
  );
}

/** Pane sizes and saved pairs (two sections you often use together) */
function LayoutSheet({ split, setSplit, left, setLeft, onClose }: { split: Split; setSplit: React.Dispatch<React.SetStateAction<Split>>; left: Route; setLeft: (r: Route) => void; onClose: () => void }) {
  const t = useTheme();
  const shop = useShop();
  const pairs = shop.pairs || [];
  const sizes: [number, string][] = [[0.34, 'Right bigger'], [0.5, 'Half and half'], [0.66, 'Left bigger']];
  const name = `${TITLES[left]} + ${TITLES[split.right]}`;
  return (
    <Sheet title="Layout" sub="How wide each side is, and pairs you use together" onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {sizes.map(([v, l]) => (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: Math.abs(split.ratio - v) < 0.03 }} onPress={() => setSplit(s => ({ ...s, ratio: v }))}
            style={{ flex: 1, gap: 8, padding: 10, borderRadius: 14, borderWidth: Math.abs(split.ratio - v) < 0.03 ? 2 : 1, borderColor: Math.abs(split.ratio - v) < 0.03 ? t.action : t.line2, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 3, width: 70, height: 40 }}>
              <View style={{ flex: v, borderRadius: 4, backgroundColor: t.tint }} />
              <View style={{ flex: 1 - v, borderRadius: 4, backgroundColor: t.sunken }} />
            </View>
            <T s="small" style={{ fontWeight: '600' }}>{l}</T>
          </Pressable>
        ))}
      </View>
      <T style={{ fontWeight: '700' }}>Saved pairs</T>
      {pairs.map(p => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <Pressable accessibilityRole="button" style={{ flex: 1 }} onPress={() => { setLeft(p.left as Route); setSplit(s => ({ ...s, right: p.right as Route, ratio: p.ratio })); onClose(); }}>
            <T style={{ fontWeight: '600' }}>{p.name}</T>
            <T s="small">{TITLES[p.left as Route]} and {TITLES[p.right as Route]}</T>
          </Pressable>
          <Button small kind="ghost" title="Remove" onPress={() => update(s => ({ ...s, pairs: (s.pairs || []).filter(x => x.id !== p.id) }))} />
        </View>
      ))}
      {!pairs.length ? <T s="sub">Save two sections you use together, like Workflow and Fabric, and open them in one click.</T> : null}
      <Button kind="secondary" title={`Save “${name}”`} disabled={pairs.some(p => p.left === left && p.right === split.right)} onPress={() => update(s => ({ ...s, pairs: [...(s.pairs || []), { id: 'pr' + Date.now().toString(36), name, left, right: split.right, ratio: split.ratio }] }))} />
    </Sheet>
  );
}

/** A timer left running past the check-in time: keep it, fix the time, or close it out. */
function StaleTimer({ openTimer }: { openTimer: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  useNow(!!m && !m.paused, 30000);
  const [fix, setFix] = useState(false);
  if (!m) return null;
  const lim = shop.cfg.staleMins * 6e4;
  const checked = m.checked;
  const stale = timerMs(m) > lim && (!checked || Date.now() - checked > lim);
  if (!stale && !fix) return null;
  const r = shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m.step);
  if (!r || !s) return null;
  return (
    <>
      {stale ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.warnTint, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Pressable style={{ flex: 1 }} onPress={() => openTimer(r.id)}>
            <Text style={{ color: t.onWarn, fontSize: F.f15 }}>
              <Text style={{ fontWeight: '700' }}>Still going? </Text>Your timer for {s.name} has run {clock(timerMs(m))}.
            </Text>
          </Pressable>
          <Button small kind="secondary" title="Keep going" onPress={() => update(x => ({ ...x, timer: x.timer ? { ...x.timer, checked: Date.now() } : null }))} />
          <Button small kind="secondary" title="Fix the time" onPress={() => setFix(true)} />
          <Button small kind="ghost" title="Close out" onPress={() => { const was = closeOutTimer(); showSnack('Timer stopped. No time recorded', () => restoreTimer(was)); }} />
        </View>
      ) : null}
      {fix ? <FixTimerSheet onClose={() => setFix(false)} /> : null}
    </>
  );
}
