/* Workflow: pick a run on the bench, see the running timer big, and tick and time its steps. */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { clock, mins, plural } from '../lib/format';
import { timerMs } from '../lib/plan';
import { leftMins } from '../state/alerts';
import { addStep, closeOutTimer, pauseTimer, restoreTimer, stopTimer, useShop } from '../state/store';
import type { Run } from '../state/types';
import { PauseIcon, PlayIcon, PlusIcon, StopIcon, TimeIcon } from '../ui/icons';
import { Button, Empty, openMenuAt, showSnack, T } from '../ui/kit';
import { F, shadow, useTheme } from '../ui/theme';
import { useNow } from '../ui/useNow';
import { otherCount, StepRow, StepsBox } from './runs/parts';
import { CutSheet, FixTimerSheet, StepSheet } from './runs/sheets';

export const runLabel = (r: Run) => (r.name || 'Untitled run').replace(' — ', ' · ');
export const pieces = (r: Run) => Object.values(r.qty).reduce((a, b) => a + (b || 0), 0) + otherCount(r);
export const bench = (runs: Run[]) => runs.filter(r => r.status !== 'done');

export function WorkflowScreen({ sel, setSel, onPlan }: { sel: string | null; setSel: (id: string) => void; onPlan: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [sheet, setSheet] = useState<null | { k: 'step'; id: string } | { k: 'cut' } | { k: 'fix' }>(null);
  const b = bench(shop.runs);
  const r = b.find(x => x.id === sel) || b.find(x => x.id === shop.timer?.run) || b.find(x => x.status === 'active') || b[0];
  if (!r)
    return (
      <Page>
        <T s="title">Workflow</T>
        <Empty icon={<TimeIcon color={t.action} size={30} />} title="Nothing to time yet" body="When a run is on the bench, its steps show here. Tick them off and time them to learn your real pace." action={<Button title="Plan a run" onPress={onPlan} />} />
      </Page>
    );
  const dn = r.steps.filter(s => s.done).length;
  const pick = (e: any) => {
    const n = e?.nativeEvent || {};
    openMenuAt(n.pageX ?? 400, n.pageY ?? 160, b.map(x => ({ label: `${runLabel(x)} · ${plural(pieces(x), 'bandana')} · ${x.steps.filter(s => s.done).length} of ${x.steps.length}`, onPress: () => setSel(x.id) })));
  };
  return (
    <Page>
      <T s="title">Workflow</T>
      <Pressable accessibilityRole="button" accessibilityLabel={`Run: ${runLabel(r)}. Change run`} onPress={pick}
        style={[{ alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingLeft: 18, paddingRight: 16, borderRadius: 22, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }, shadow(t.dark)]}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: F.f15, fontWeight: '700', color: t.text }}>{runLabel(r)}</Text>
        <View style={{ width: 7, height: 7, marginTop: -4, borderRightWidth: 2, borderBottomWidth: 2, borderColor: t.text3, transform: [{ rotate: '45deg' }] }} />
      </Pressable>
      <TimerHero onFix={() => setSheet({ k: 'fix' })} />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: t.text }}>Steps</Text>
          <Text style={{ fontSize: F.f14, color: t.text3, fontVariant: ['tabular-nums'] }}>{dn} of {r.steps.length} · ~{mins(leftMins(r))} left</Text>
        </View>
        <StepsBox>
          {r.steps.map((s, i) => (
            <StepRow key={s.id} r={r} s={s} first={i === 0} onOpen={() => setSheet({ k: 'step', id: s.id })} onCut={() => setSheet({ k: 'cut' })} />
          ))}
        </StepsBox>
        <Button small kind="ghost" title="Add step" icon={c => <PlusIcon color={c} size={18} />} style={{ alignSelf: 'flex-start' }} onPress={() => setSheet({ k: 'step', id: addStep(r.id) })} />
      </View>
      {sheet?.k === 'step' ? <StepSheet r={r} stepId={sheet.id} onClose={() => setSheet(null)} onCut={() => setSheet({ k: 'cut' })} /> : null}
      {sheet?.k === 'cut' ? <CutSheet r={r} onClose={() => setSheet(null)} /> : null}
      {sheet?.k === 'fix' ? <FixTimerSheet onClose={() => setSheet(null)} /> : null}
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 820, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>{children}</View>
    </ScrollView>
  );
}

/** The dark card for whatever you're timing right now */
export function TimerHero({ onFix }: { onFix: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  useNow(!!m && !m.paused);
  const r = m && shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m!.step);
  if (!m || !r || !s) return null;
  const stale = timerMs(m) > shop.cfg.staleMins * 6e4;
  const inv = (label: string, onPress: () => void, small?: boolean, icon?: React.ReactNode, solid?: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: small ? 44 : 52, borderRadius: small ? 22 : 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: solid ? t.amber : 'transparent', borderWidth: solid ? 0 : 1, borderColor: 'rgba(255,255,255,0.25)', opacity: pressed ? 0.85 : 1 })}>
      {icon}
      <Text style={{ color: solid ? t.onAmber : t.onInverse, fontWeight: '600', fontSize: small ? F.f15 : F.f16 }}>{label}</Text>
    </Pressable>
  );
  const stop = () => {
    const res = stopTimer();
    if (res) showSnack(`Recorded ${mins(res.mins)} for ${res.step}`);
  };
  return (
    <View accessibilityLabel="Timing now" style={{ backgroundColor: t.inverse, borderRadius: 24, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.paused ? '#F0C159' : t.live }} />
            <Text style={{ fontSize: F.f13, fontWeight: '600', color: m.paused ? '#F0C159' : t.live }}>{m.paused ? 'Paused' : 'You’re timing'}</Text>
          </View>
          <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '600', color: t.onInverse }}>{s.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: F.f13, color: t.inverse2 }}>{runLabel(r)}</Text>
        </View>
        <Text style={{ fontSize: 40, lineHeight: 44, fontWeight: '600', letterSpacing: -1, color: t.onInverse, opacity: m.paused ? 0.6 : 1, fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</Text>
      </View>
      {stale ? <Text style={{ fontSize: F.f13, lineHeight: 18, color: t.amber, fontWeight: '600' }}>Running longer than {mins(shop.cfg.staleMins)}. Fix the time if you forgot to stop it.</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {inv(m.paused ? 'Resume' : 'Pause', pauseTimer, false, m.paused ? <PlayIcon color={t.onAmber} size={16} /> : <PauseIcon color={t.onInverse} size={16} />, m.paused)}
        {inv('Stop', stop, false, <StopIcon color={m.paused ? t.onInverse : t.onAmber} size={14} />, !m.paused)}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: -4 }}>
        {inv('Fix time', onFix, true)}
        {inv('Don’t record', () => { const was = closeOutTimer(); showSnack('Timer stopped. No time recorded', () => restoreTimer(was)); }, true)}
      </View>
    </View>
  );
}
