/* Settings: sizes and mats, workflow templates, free hours, timers. */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { clock, fmtN, mins } from '../lib/format';
import { pace, timerMs, tplMinsFor, tplPerBandana } from '../lib/plan';
import { addTemplate, closeOutTimer, deleteTemplate, editTemplate, restoreTemplate, restoreTimer, setCfg, useShop } from '../state/store';
import type { Template } from '../state/types';
import { DownIcon, PlusIcon, TrashIcon, UpIcon } from '../ui/icons';
import { Button, Card, Chip, Field, IconButton, NumField, Row, Section, Segmented, showSnack, T } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';
import { useNow } from '../ui/useNow';
import { SetupScreen } from './SetupScreen';

export type SettingsTab = 'sizes' | 'templates' | 'hours' | 'timers';

export function SettingsScreen({ tab, setTab, openRun }: { tab: SettingsTab; setTab: (t: SettingsTab) => void; openRun: (id: string) => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 1040 }}>
      <T s="title">Settings</T>
      <Segmented label="Settings" bare value={tab} onChange={setTab} options={[['sizes', 'Sizes & mats'], ['templates', 'Workflow templates'], ['hours', 'Free hours'], ['timers', 'Timers']]} />
      {tab === 'sizes' ? <SetupScreen /> : tab === 'templates' ? <Templates /> : tab === 'hours' ? <Hours /> : <Timers openRun={openRun} />}
    </ScrollView>
  );
}

/* ---------- templates ---------- */
function Templates() {
  const shop = useShop();
  const t = useTheme();
  const [sel, setSel] = useState(shop.cfg.defTpl);
  const cur = shop.templates.find(x => x.id === sel) || shop.templates[0];
  return (
    <View style={{ flexDirection: 'row', gap: 22, alignItems: 'flex-start' }}>
      <View style={{ width: 300, gap: 12 }}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shop.templates.map((x, i) => (
            <Row key={x.id} first={i === 0} selected={x.id === cur.id} onPress={() => setSel(x.id)}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: '600' }}>{x.name}</T>
                <T s="sub">{x.steps.length} steps · {mins(tplPerBandana(x))} a bandana</T>
              </View>
              {x.id === shop.cfg.defTpl ? <Chip label="Default" tone="tint" /> : null}
            </Row>
          ))}
        </Card>
        <Button kind="secondary" small title="New template" icon={c => <PlusIcon color={c} size={16} />} onPress={() => setSel(addTemplate(cur.id))} />
        <T s="small">A template is the list of steps a run starts with, and how long each takes per bandana.</T>
      </View>
      <View style={{ flex: 1 }}>{cur ? <TemplateEditor key={cur.id} tpl={cur} onDeleted={() => setSel(shop.cfg.defTpl)} /> : null}</View>
    </View>
  );
}

function TemplateEditor({ tpl, onDeleted }: { tpl: Template; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const med = useMemo(() => pace(shop), [shop]);
  const isDef = tpl.id === shop.cfg.defTpl;
  const setSteps = (steps: Template['steps']) => editTemplate(tpl.id, { steps });
  const paceOf = (n: string) => (med[n] == null ? null : Math.round(med[n]! * 10) / 10);
  const off = (s: { n: string; r: number }) => {
    const m = paceOf(s.n);
    return m != null && Math.abs(m - s.r) >= 0.1 && Math.abs(m / s.r - 1) > 0.05;
  };
  const nOff = tpl.steps.filter(off).length;
  const count = (n: string) => shop.sessions.filter(x => x.step === n && x.pcs > 0 && x.mins > 0).length;
  const remove = () => {
    const i = shop.templates.findIndex(x => x.id === tpl.id);
    deleteTemplate(tpl.id);
    onDeleted();
    showSnack(`${tpl.name} deleted`, () => restoreTemplate(tpl, i, isDef));
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= tpl.steps.length) return;
    const steps = tpl.steps.slice();
    [steps[i], steps[j]] = [steps[j], steps[i]];
    setSteps(steps);
  };
  return (
    <View style={{ gap: 18 }}>
      <Field label="Name" value={tpl.name} onChange={v => editTemplate(tpl.id, { name: v })} />
      <Section title="Steps" right={nOff > 1 ? <Button kind="ghost" small title={`Use my pace for all ${nOff}`} onPress={() => setSteps(tpl.steps.map(s => (off(s) ? { ...s, r: paceOf(s.n)! } : s)))} /> : undefined}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <Row first style={{ minHeight: 34, paddingVertical: 6 }}>
            <T s="label" style={{ flex: 1 }}>Step</T>
            <T s="label" style={{ width: 120 }}>Minutes each</T>
            <View style={{ width: 120 }} />
          </Row>
          {tpl.steps.map((s, i) => (
            <View key={i} style={{ borderTopWidth: 1, borderTopColor: t.line, paddingHorizontal: 14, paddingVertical: 8, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}><Field bare label={`Step ${i + 1} name`} value={s.n} onChange={v => setSteps(tpl.steps.map((x, j) => (j === i ? { ...x, n: v } : x)))} /></View>
                <NumField bare label={`${s.n} minutes per bandana`} value={s.r} onChange={n => setSteps(tpl.steps.map((x, j) => (j === i ? { ...x, r: Math.max(0.1, Math.min(240, n || 0.1)) } : x)))} suffix="min" width={110} />
                <View style={{ width: 120, flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <IconButton label={`Move ${s.n} up`} onPress={() => move(i, -1)}>{c => <UpIcon color={i ? c : t.line2} size={18} />}</IconButton>
                  <IconButton label={`Move ${s.n} down`} onPress={() => move(i, 1)}>{c => <DownIcon color={i < tpl.steps.length - 1 ? c : t.line2} size={18} />}</IconButton>
                  <IconButton label={`Remove ${s.n}`} onPress={() => setSteps(tpl.steps.filter((_, j) => j !== i))}>{c => <TrashIcon color={c} size={16} />}</IconButton>
                </View>
              </View>
              {paceOf(s.n) != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T s="small" color={off(s) ? t.warn : t.success}>{off(s) ? `You average ${fmtN(paceOf(s.n)!)} min` : 'Matches your pace'} · {count(s.n)} timed</T>
                  {off(s) ? <Pressable accessibilityRole="button" onPress={() => setSteps(tpl.steps.map((x, j) => (j === i ? { ...x, r: paceOf(s.n)! } : x)))}><T s="small" color={t.action} style={{ fontWeight: '600' }}>Use it</T></Pressable> : null}
                </View>
              ) : null}
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setSteps([...tpl.steps, { n: 'New step', r: 2 }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: t.line }}>
            <PlusIcon color={t.action} size={18} />
            <T color={t.action} style={{ fontWeight: '600' }}>Add a step</T>
          </Pressable>
        </Card>
      </Section>
      <Card style={{ gap: 4 }}>
        <T style={{ fontWeight: '700' }}>{mins(tplPerBandana(tpl))} a bandana</T>
        <T s="sub">About {mins(tplMinsFor(shop, tpl.id, { M: 12, L: 6 }))} for 12 Medium and 6 Large. Bigger sizes take longer, in proportion to their time each in Sizes.</T>
      </Card>
      {isDef ? (
        <T s="small">New runs start from this template.</T>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button kind="secondary" title="Use for new runs" onPress={() => setCfg({ defTpl: tpl.id })} />
          {shop.templates.length > 1 ? <Button kind="danger" title="Delete template" onPress={remove} /> : null}
        </View>
      )}
    </View>
  );
}

/* ---------- free hours ---------- */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function Hours() {
  const shop = useShop();
  const t = useTheme();
  const h = shop.cfg.hours;
  const tot = h.reduce((a, b) => a + b, 0);
  const mx = Math.max(1, ...h);
  const set = (d: number, v: number) => setCfg({ hours: h.map((x, i) => (i === d ? Math.max(0, Math.min(16, v)) : x)) });
  return (
    <View style={{ gap: 16, maxWidth: 640 }}>
      <Card style={{ gap: 4 }}>
        <T style={{ fontSize: F.f28, fontWeight: '700' }}>{fmtN(tot)}h <T s="sub">a week</T></T>
        <T s="sub">How much time you have for the shop each day. Schedules and due dates are planned into these hours.</T>
      </Card>
      <Card pad={false} style={{ overflow: 'hidden' }}>
        {[1, 2, 3, 4, 5, 6, 0].map((d, i) => (
          <Row key={d} first={i === 0}>
            <View style={{ flex: 1, gap: 6 }}>
              <T style={{ fontWeight: '600' }}>{DAYS[d]}</T>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ width: `${(h[d] / mx) * 100}%`, height: 6, backgroundColor: t.action }} /></View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Less time on ${DAYS[d]}`} onPress={() => set(d, h[d] - 0.5)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 18, fontWeight: '600' }}>−</T></Pressable>
              <T style={{ minWidth: 52, textAlign: 'center', fontWeight: '700' }}>{h[d] ? fmtN(h[d]) + 'h' : 'Off'}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`More time on ${DAYS[d]}`} onPress={() => set(d, h[d] + 0.5)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 18, fontWeight: '600' }}>+</T></Pressable>
            </View>
          </Row>
        ))}
      </Card>
      <T s="small">Half-hour steps. Set a day to Off when you don’t work on the shop.</T>
    </View>
  );
}

/* ---------- timers ---------- */
function Timers({ openRun }: { openRun: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  useNow(!!m && !m.paused);
  const r = m && shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m!.step);
  return (
    <View style={{ gap: 18, maxWidth: 640 }}>
      <View style={{ gap: 8 }}>
        <T s="h2">Check on a timer after</T>
        <Segmented label="Check on a timer after" bare value={String(shop.cfg.staleMins)} options={[['60', '1h'], ['120', '2h'], ['240', '4h'], ['480', '8h']]} onChange={v => setCfg({ staleMins: +v })} />
        <T s="small">If a timer runs longer than this, the app asks if it’s still going, and you can fix the time or close it out.</T>
      </View>
      <View style={{ gap: 8 }}>
        <T s="h2">Running now</T>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {m && r && s ? (
            <Row first onPress={() => openRun(r.id)}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: '600' }}>{s.name}</T>
                <T s="sub">{(r.name || 'Untitled run').split(' — ')[0]} · {m.paused ? 'paused' : 'running'}</T>
              </View>
              <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</T>
              <Button kind="ghost" small title="Close out" onPress={() => { const was = closeOutTimer(); showSnack('Timer stopped. No time recorded', () => restoreTimer(was)); }} />
            </Row>
          ) : (
            <Row first><T s="sub">No timer running.</T></Row>
          )}
        </Card>
      </View>
      <T s="small">Timed steps teach the planner your real pace. Time typed in by hand doesn’t. The timer keeps going if you close the app.</T>
      <View style={{ backgroundColor: t.bg, borderRadius: R.card }} />
    </View>
  );
}
