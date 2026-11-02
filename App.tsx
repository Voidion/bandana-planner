/* Bandana Planner for Windows: runs, fabric and finished stock, saved on this computer. */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { clock } from './src/lib/format';
import { timerMs } from './src/lib/plan';
import { FabricScreen } from './src/screens/FabricScreen';
import { TimerCard } from './src/screens/runs/parts';
import { RunsScreen } from './src/screens/runs/RunsScreen';
import { FixTimerSheet } from './src/screens/runs/sheets';
import { SettingsScreen, type SettingsTab } from './src/screens/SettingsScreen';
import { StockScreen } from './src/screens/StockScreen';
import { RestockScreen, SuppliersScreen, SuppliesScreen } from './src/screens/ShelfScreens';
import { CustomersScreen, OrdersScreen, SalesScreen } from './src/screens/SellingScreens';
import { QuotesScreen } from './src/screens/QuotesScreen';
import { MarketScreen } from './src/screens/MarketScreen';
import { PhotosScreen } from './src/screens/PhotosScreen';
import { handleKey, NewMenu, SearchSheet } from './src/screens/AppWide';
import { ActivityScreen, MaintenanceScreen, ReportsScreen, ScheduleScreen, TodayScreen } from './src/screens/NumbersScreens';
import { freeStock, isLate, orderStage, saleOwed } from './src/state/selling';
import { restockList } from './src/state/shelf';
import { toolDue } from './src/state/planning';
import { purgeOld } from './src/state/photos';
import { sendReminders } from './src/state/reminders';
import { closeOutTimer, flush, loadShop, planRun, restoreTimer, stockBySize, update, useSaveState, useShop } from './src/state/store';
import { PhotoIcon, PlusIcon, SearchIcon, BatchesIcon, BoxIcon, CalIcon, CartIcon, ChartIcon, ClockIcon, EditIcon, HomeIcon, TruckIcon, WrenchIcon, FabricIcon, GearIcon, PeopleIcon, RestockIcon, ScissorsIcon, SpoolIcon, StoreIcon, TagIcon } from './src/ui/icons';
import { Button, showSnack, SnackBar, T } from './src/ui/kit';
import { F, useTheme } from './src/ui/theme';
import { useNow } from './src/ui/useNow';

type Route = 'photos' | 'today' | 'schedule' | 'reports' | 'maintenance' | 'activity' | 'runs' | 'orders' | 'quotes' | 'market' | 'sales' | 'customers' | 'fabric' | 'supplies' | 'restock' | 'suppliers' | 'stock' | 'settings';

export default function App() {
  const t = useTheme();
  const [ready, setReady] = useState<'loading' | 'ok' | 'error'>('loading');
  const [route, setRoute] = useState<Route>('today');
  const [runSel, setRunSel] = useState<string | null>(null);
  const [setTab, setSetTab] = useState<SettingsTab>('sizes');
  const [fabSel, setFabSel] = useState<string | null>(null);
  const [supSel, setSupSel] = useState<string | null>(null);
  const [ordSel, setOrdSel] = useState<string | null>(null);
  const [custSel, setCustSel] = useState<string | null>(null);
  const [quoteSel, setQuoteSel] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<null | 'search' | 'new'>(null);
  const [saleKey, setSaleKey] = useState(0);
  const go = (r: string, id?: string) => {
    if (r === 'runs' && id) return openRun(id);
    if (r === 'orders' && id) return openOrder(id);
    if (r === 'fabric' && id) return openFabric(id);
    if (r === 'customers' && id) setCustSel(id);
    if (r === 'supplies' && id) setSupSel(id);
    if (r === 'sales' && id === 'record') setSaleKey(k => k + 1);
    if (r === 'quotes' && id) setQuoteSel(id);
    if (r === 'settings' && id) setSetTab(id as SettingsTab);
    setRoute(r as Route);
  };
  const openOrder = (id: string) => {
    setOrdSel(id);
    setRoute('orders');
  };
  const openFabric = (id: string) => {
    setFabSel(id);
    setRoute('fabric');
  };
  const openSupply = (id: string) => {
    setSupSel(id);
    setRoute('supplies');
  };

  const load = () => {
    setReady('loading');
    loadShop().then(
      () => {
        purgeOld();
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
  const openRun = (id: string) => {
    setRunSel(id);
    setRoute('runs');
  };

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
    const used = handleKey(e, { search: () => setOverlay('search'), newMenu: () => setOverlay('new'), go, close: () => (overlay ? (setOverlay(null), true) : false) });
    if (used && e?.preventDefault) e.preventDefault();
  };
  const rootKeys: any = { onKeyDownCapture: keys };
  return (
    <View {...rootKeys} style={{ flex: 1, flexDirection: 'row', backgroundColor: t.bg }}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <Sidebar route={route} setRoute={setRoute} openRun={openRun} onSearch={() => setOverlay('search')} onNew={() => setOverlay('new')} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StaleTimer openRun={openRun} />
        <View style={{ flex: 1 }}>
          {route === 'today' ? (
            <TodayScreen go={go} />
          ) : route === 'schedule' ? (
            <ScheduleScreen go={go} />
          ) : route === 'reports' ? (
            <ReportsScreen />
          ) : route === 'photos' ? (
            <PhotosScreen go={go} />
          ) : route === 'maintenance' ? (
            <MaintenanceScreen />
          ) : route === 'activity' ? (
            <ActivityScreen />
          ) : route === 'fabric' ? (
            <FabricScreen sel={fabSel} setSel={setFabSel} onPlanWith={id => openRun(planRun({ body: id, ties: id }))} openRun={openRun} />
          ) : route === 'runs' ? (
            <RunsScreen sel={runSel} setSel={setRunSel} goSetup={() => { setSetTab('sizes'); setRoute('settings'); }} />
          ) : route === 'orders' ? (
            <OrdersScreen sel={ordSel} setSel={setOrdSel} openRun={openRun} />
          ) : route === 'quotes' ? (
            <QuotesScreen sel={quoteSel} setSel={setQuoteSel} openOrder={openOrder} />
          ) : route === 'market' ? (
            <MarketScreen />
          ) : route === 'sales' ? (
            <SalesScreen key={saleKey} autoRecord={saleKey > 0} />
          ) : route === 'customers' ? (
            <CustomersScreen sel={custSel} setSel={setCustSel} openOrder={openOrder} />
          ) : route === 'supplies' ? (
            <SuppliesScreen sel={supSel} setSel={setSupSel} />
          ) : route === 'suppliers' ? (
            <SuppliersScreen openFabric={openFabric} openSupply={openSupply} />
          ) : route === 'restock' ? (
            <RestockScreen openFabric={openFabric} openSupply={openSupply} />
          ) : route === 'stock' ? (
            <StockScreen openRun={openRun} />
          ) : (
            <SettingsScreen tab={setTab} setTab={setSetTab} openRun={openRun} />
          )}
        </View>
      </View>
      {overlay === 'search' ? <SearchSheet onClose={() => setOverlay(null)} go={go} /> : null}
      {overlay === 'new' ? <NewMenu onClose={() => setOverlay(null)} go={go} /> : null}
      <SnackBar />
    </View>
  );
}

/** A timer left running past the check-in time: keep it, fix the time, or close it out. */
function StaleTimer({ openRun }: { openRun: (id: string) => void }) {
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
          <Pressable style={{ flex: 1 }} onPress={() => openRun(r.id)}>
            <Text style={{ color: t.dark ? t.onWarn : t.onWarn, fontSize: F.f15 }}>
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

function Sidebar({ route, setRoute, openRun, onSearch, onNew }: { route: Route; setRoute: (r: Route) => void; openRun: (id: string) => void; onSearch: () => void; onNew: () => void }) {
  const t = useTheme();
  const shop = useShop();
  const save = useSaveState();
  const low = shop.fabrics.filter(f => f.low > 0 && f.yards <= f.low).length;
  const active = shop.runs.filter(r => r.status === 'active').length;
  const stock = Object.values(freeStock(shop)).reduce((a, b) => a + b, 0);
  const openOrders = shop.orders.filter(o => o.status !== 'delivered').length;
  const late = shop.sales.filter(isLate).length;
  const need = restockList(shop).filter(i => !(i.x.onOrder > 0)).length;
  const item = (r: Route, label: string, icon: (c: string) => React.ReactNode, badge?: string, warn?: boolean) => {
    const on = route === r;
    return <NavItem key={r} on={on} label={label} icon={icon(on ? t.onTint : t.text2)} badge={badge} warn={warn} onPress={() => setRoute(r)} />;
  };
  return (
    <View style={{ width: 240, backgroundColor: t.surface, borderRightWidth: 1, borderRightColor: t.line, paddingHorizontal: 12, paddingTop: 18, paddingBottom: 14, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 12 }}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: t.action, alignItems: 'center', justifyContent: 'center' }}>
          <BatchesIcon color={t.onAction} size={17} />
        </View>
        <T style={{ fontWeight: '700', fontSize: 16 }}>Bandana Planner</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginBottom: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="New (Ctrl+N)" onPress={onNew} style={{ flex: 1, minHeight: 34, borderRadius: 10, backgroundColor: t.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <PlusIcon color={t.onAction} size={15} />
          <Text style={{ color: t.onAction, fontWeight: '700', fontSize: F.f14 }}>New</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Search (Ctrl+K)" onPress={onSearch} style={{ flex: 1, minHeight: 34, borderRadius: 10, backgroundColor: t.sunken, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <SearchIcon color={t.text2} size={15} />
          <Text style={{ color: t.text2, fontWeight: '600', fontSize: F.f14 }}>Search</Text>
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2 }}>
      {item('today', 'Today', c => <HomeIcon color={c} />)}
      {item('schedule', 'Schedule', c => <CalIcon color={c} />)}
      {item('runs', 'Runs', c => <ScissorsIcon color={c} />, active ? String(active) : undefined)}
      {item('orders', 'Orders', c => <CartIcon color={c} />, openOrders ? String(openOrders) : undefined)}
      {item('quotes', 'Quotes', c => <EditIcon color={c} />, shop.quotes.filter(q => q.status === 'sent').length ? String(shop.quotes.filter(q => q.status === 'sent').length) : undefined)}
      {item('sales', 'Sales', c => <TagIcon color={c} />, late ? `${late} late` : undefined, true)}
      {item('market', 'Market day', c => <StoreIcon color={c} />, shop.market.open ? 'Open' : undefined)}
      {item('customers', 'Customers', c => <PeopleIcon color={c} />)}
      <View style={{ height: 10 }} />
      {item('fabric', 'Fabric', c => <FabricIcon color={c} />, low ? `${low} low` : undefined, true)}
      {item('supplies', 'Supplies', c => <SpoolIcon color={c} />)}
      {item('restock', 'Restock', c => <RestockIcon color={c} />, need ? String(need) : undefined, true)}
      {item('suppliers', 'Suppliers', c => <TruckIcon color={c} />)}
      {item('stock', 'Finished stock', c => <BoxIcon color={c} />, stock ? String(stock) : undefined)}
      <View style={{ height: 10 }} />
      {item('reports', 'Reports', c => <ChartIcon color={c} />)}
      {item('photos', 'Photos', c => <PhotoIcon color={c} />)}
      {item('maintenance', 'Maintenance', c => <WrenchIcon color={c} />, shop.tools.filter(toolDue).length ? 'Due' : undefined, true)}
      {item('activity', 'Activity', c => <ClockIcon color={c} />)}
      {item('settings', 'Settings', c => <GearIcon color={c} />)}
      </ScrollView>
      <TimerCard onOpen={openRun} />
      <Text style={{ fontSize: F.f12, color: save === 'error' ? t.danger : t.text3, paddingHorizontal: 10 }}>
        {save === 'error' ? 'Couldn’t save. Retrying with your next change.' : save === 'saving' ? 'Saving…' : 'Saved on this computer'}
      </Text>
    </View>
  );
}

function NavItem({ on, label, icon, badge, warn, onPress }: { on: boolean; label: string; icon: React.ReactNode; badge?: string; warn?: boolean; onPress: () => void }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: on ? t.tint : hover ? t.sunken : 'transparent' }}>
      {icon}
      <Text style={{ flex: 1, fontSize: F.f15, fontWeight: on ? '700' : '500', color: on ? t.onTint : t.text }}>{label}</Text>
      {badge ? (
        <View style={{ backgroundColor: on ? t.surface : warn ? t.warnTint : t.sunken, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: F.f12, fontWeight: '600', color: on ? t.text : warn ? (t.dark ? t.onWarn : t.warn) : t.text2 }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
