/* Bandana Planner for Windows: fabric inventory and cut plans, saved on this computer. */
import React, { useEffect, useState } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { CutPlansScreen } from './src/screens/CutPlansScreen';
import { FabricScreen } from './src/screens/FabricScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { addPlan, editPlan, flush, loadShop, useSaveState, useShop } from './src/state/store';
import { BatchesIcon, FabricIcon, RulerIcon, ScissorsIcon } from './src/ui/icons';
import { Button, SnackBar, T } from './src/ui/kit';
import { F, useTheme } from './src/ui/theme';

type Route = 'fabric' | 'plans' | 'setup';

export default function App() {
  const t = useTheme();
  const [ready, setReady] = useState<'loading' | 'ok' | 'error'>('loading');
  const [route, setRoute] = useState<Route>('plans');
  const [planSel, setPlanSel] = useState<string | null>(null);

  const load = () => {
    setReady('loading');
    loadShop().then(() => setReady('ok'), () => setReady('error'));
  };
  useEffect(() => {
    load();
    return () => {
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

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.bg }}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <Sidebar route={route} setRoute={setRoute} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {route === 'fabric' ? (
          <FabricScreen
            onPlanWith={id => {
              const pid = addPlan();
              editPlan(pid, { body: id, ties: id });
              setPlanSel(pid);
              setRoute('plans');
            }}
          />
        ) : route === 'plans' ? (
          <CutPlansScreen sel={planSel} setSel={setPlanSel} goSetup={() => setRoute('setup')} />
        ) : (
          <SetupScreen />
        )}
      </View>
      <SnackBar />
    </View>
  );
}

function Sidebar({ route, setRoute }: { route: Route; setRoute: (r: Route) => void }) {
  const t = useTheme();
  const shop = useShop();
  const save = useSaveState();
  const low = shop.fabrics.filter(f => f.low > 0 && f.yards <= f.low).length;
  const open = shop.plans.filter(p => p.status === 'planning').length;
  const item = (r: Route, label: string, icon: (c: string) => React.ReactNode, badge?: string, warn?: boolean) => {
    const on = route === r;
    return (
      <NavItem key={r} on={on} label={label} icon={icon(on ? t.onTint : t.text2)} badge={badge} warn={warn} onPress={() => setRoute(r)} />
    );
  };
  return (
    <View style={{ width: 240, backgroundColor: t.surface, borderRightWidth: 1, borderRightColor: t.line, paddingHorizontal: 12, paddingTop: 22, paddingBottom: 16, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 18 }}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: t.action, alignItems: 'center', justifyContent: 'center' }}>
          <BatchesIcon color={t.onAction} size={17} />
        </View>
        <T style={{ fontWeight: '700', fontSize: 16 }}>Bandana Planner</T>
      </View>
      {item('plans', 'Cut plans', c => <ScissorsIcon color={c} />, open ? String(open) : undefined)}
      {item('fabric', 'Fabric', c => <FabricIcon color={c} />, low ? `${low} low` : undefined, true)}
      {item('setup', 'Sizes & mats', c => <RulerIcon color={c} />)}
      <View style={{ flex: 1 }} />
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 42, paddingHorizontal: 10, borderRadius: 10, backgroundColor: on ? t.tint : hover ? t.sunken : 'transparent' }}>
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
