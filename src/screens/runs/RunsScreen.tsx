/* Runs: plan a batch (sizes, fabric, template, due date), see it on the mats, cut it, work through its steps with
   timers, finish it into stock, and review how it went. */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { dayLabel, mins, money, money0, plural, relDue, yd } from '../../lib/format';
import { addDays, computePlan, planCount, rel, runNumbers, sizeReady, todayDay } from '../../lib/plan';
import {
  addStep,
  deleteRun,
  editRun,
  planAgain,
  planRun,
  reopenRun,
  restoreRun,
  setUsed,
  startRun,
  undoCut,
  useShop,
} from '../../state/store';
import type { Run } from '../../state/types';
import { CheckIcon, ChevIcon, CloseIcon, DefectIcon, PlusIcon, RunsIcon, ScissorsIcon, TrashIcon, WarnIcon } from '../../ui/icons';
import { RunThumb } from '../../ui/Thumbs';
import { Button, Card, Chip, Empty, Field, IconButton, NumField, Row, Section, Segmented, showSnack, Stepper, Swatch, T, TwoPane, useContextMenu } from '../../ui/kit';
import { F, R, shadow, useTheme } from '../../ui/theme';
import { CutLayout, InThisRun, MoneyCard, otherCount, shortName, StepRow, StepsBox, Tile } from './parts';
import { PhotoStrip } from '../PhotosScreen';
import { ListingSheet } from './ListingSheet';
import { CutSheet, DefectSheet, FabricPicker, FinishSheet, StepSheet } from './sheets';

type SheetState = null | { k: 'listing' } | { k: 'cut' } | { k: 'step'; id: string } | { k: 'finish' } | { k: 'defect' } | { k: 'pick'; role: 'body' | 'ties' };

export function RunsScreen({ sel, setSel, goSetup, openWorkflow }: { sel: string | null; setSel: (id: string | null) => void; goSetup: () => void; openWorkflow?: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [filter, setFilter] = useState<'bench' | 'done'>(() => (shop.runs.find(r => r.id === sel)?.status === 'done' ? 'done' : 'bench'));
  const benchList = shop.runs.filter(r => r.status !== 'done');
  const done = shop.runs.filter(r => r.status === 'done').slice().sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''));
  const list = filter === 'done' ? done : benchList;
  const cur = shop.runs.find(r => r.id === sel) || list[0] || benchList[0] || done[0] || null;
  const start = () => setSel(planRun());
  return (
    <TwoPane sel={sel} list={
      <View style={{ flex: 1 }}>
        <View style={{ paddingTop: 28, paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6, color: t.text }}>Runs</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Plan a run" onPress={start} style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }, shadow(t.dark)]}>
              <PlusIcon color={t.action} size={20} />
            </Pressable>
          </View>
          <Segmented fill label="Show" bare value={filter} onChange={setFilter} options={[['bench', `On the bench · ${benchList.length}`], ['done', `Finished · ${done.length}`]]} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20, gap: 4 }}>
          {!list.length ? (
            filter === 'done' ? (
              <Empty icon={<RunsIcon color={t.action} size={28} />} title="No finished runs yet" body="When you close out a run it moves here with what it made." />
            ) : (
              <Empty icon={<RunsIcon color={t.action} size={28} />} title="Nothing on the bench" body="Plan a run and it shows here with its progress and due date." action={<Button small title="Plan a run" onPress={start} />} />
            )
          ) : null}
          {list.map(r => <RunCell key={r.id} r={r} on={cur?.id === r.id} onPress={() => setSel(r.id)} setSel={setSel} />)}
        </ScrollView>
      </View>
    } detail={cur ? <RunView key={cur.id} r={cur} goSetup={goSetup} setSel={setSel} openWorkflow={openWorkflow} /> : (
        <View style={{ flex: 1, padding: 32, justifyContent: 'center' }}>
          <Empty icon={<RunsIcon color={t.action} size={30} />} title="Your runs show here" body="When you plan a run, its steps, fabric and cut layout show here." />
        </View>
      )} />
  );
}

/** One run in the list: picture, name, due chip, what's happening, progress */
function RunCell({ r, on, onPress, setSel }: { r: Run; on: boolean; onPress: () => void; setSel: (id: string | null) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const ctx = useContextMenu([
    { label: 'Open', onPress },
    r.status === 'draft' ? { label: 'Start this run', onPress: () => startRun(r.id) } : null,
    { label: 'Plan this again', onPress: () => { const id = planAgain(r.id); if (id) setSel(id); } },
    { label: 'Delete run', danger: true, onPress: () => { const i2 = shop.runs.findIndex(x => x.id === r.id); deleteRun(r.id); showSnack(`${shortName(r)} deleted`, () => restoreRun(r, i2)); } },
  ]);
  const done = r.status === 'done';
  const pc = planCount(r) + otherCount(r);
  const dn = r.steps.filter(s => s.done).length;
  const d = rel(r.due);
  const purpose = (r.name || '').split(' — ')[1] || '';
  const m = shop.timer;
  const live = m && m.run === r.id ? (m.paused ? 'Timer paused' : 'You’re timing') : '';
  const nums = done ? runNumbers(shop, r) : null;
  const pay = shop.cfg.payLabor;
  return (
    <Pressable {...ctx} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => !ctx.wasRight() && onPress()} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={[{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 16, backgroundColor: on ? t.surface : hover ? (t.dark ? '#1C1C20' : '#EDEDEF') : 'transparent', borderWidth: 2, borderColor: on ? t.action : 'transparent' }, on ? shadow(t.dark) : null]}>
      <RunThumb r={r} size={44} />
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <Text numberOfLines={2} style={{ flex: 1, fontSize: F.f15, fontWeight: '600', color: t.text, paddingTop: 1 }}>{shortName(r)}</Text>
          {done ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{pay ? money(nums!.perHour) : money0(nums!.profit)}</Text>
              <Text style={{ fontSize: F.f12, color: t.text3 }}>{pay ? 'an hour' : 'profit'}</Text>
            </View>
          ) : (
            <Chip label={r.status === 'draft' ? 'Draft' : d == null ? 'No date' : d < 0 || d <= 7 ? relDue(d) : dayLabel(r.due)} tone={r.status !== 'draft' && d != null && d < 0 ? 'warn' : 'plain'} />
          )}
        </View>
        <Text numberOfLines={1} style={{ fontSize: F.f13, color: t.text3 }}>{[purpose, plural(pc, 'bandana')].filter(Boolean).join(' · ')}</Text>
        {live && !done ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m!.paused ? t.warn : t.success }} />
            <Text style={{ fontSize: F.f13, fontWeight: '600', color: m!.paused ? t.warn : t.success }}>{live}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: F.f13, color: t.text3 }}>{done ? 'Finished ' + dayLabel(r.finishedAt, { month: 'short', day: 'numeric' }) : r.status === 'draft' ? 'Not started' : `${dn} of ${r.steps.length} steps`}</Text>
        )}
        {!done && r.status !== 'draft' ? (
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden', marginTop: 4 }}>
            <View style={{ height: 6, borderRadius: 3, width: `${(dn / Math.max(1, r.steps.length)) * 100}%`, backgroundColor: t.action }} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function RunView({ r, goSetup, setSel, openWorkflow }: { r: Run; goSetup: () => void; setSel: (id: string | null) => void; openWorkflow?: (id: string) => void }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const close = () => setSheet(null);
  const body = r.status === 'draft' ? (
    <DraftView r={r} goSetup={goSetup} setSel={setSel} setSheet={setSheet} />
  ) : r.status === 'active' ? (
    <BenchView r={r} setSheet={setSheet} openWorkflow={openWorkflow} />
  ) : (
    <ReviewView r={r} setSel={setSel} setSheet={setSheet} />
  );
  return (
    <View style={{ flex: 1 }}>
      {body}
      {sheet?.k === 'cut' ? <CutSheet r={r} onClose={close} /> : null}
      {sheet?.k === 'listing' ? <ListingSheet r={r} onClose={close} /> : null}
      {sheet?.k === 'step' ? <StepSheet r={r} stepId={sheet.id} onClose={close} onCut={() => setSheet({ k: 'cut' })} /> : null}
      {sheet?.k === 'finish' ? <FinishSheet r={r} onClose={close} onDone={() => {}} /> : null}
      {sheet?.k === 'defect' ? <DefectSheet r={r} onClose={close} /> : null}
      {sheet?.k === 'pick' ? <PickFabric r={r} role={sheet.role} onClose={close} /> : null}
    </View>
  );
}

function PickFabric({ r, role, onClose }: { r: Run; role: 'body' | 'ties'; onClose: () => void }) {
  const shop = useShop();
  const need = (id: string) => {
    const res = computePlan(shop, role === 'body' ? { qty: r.qty, body: id, ties: r.ties === r.body || !r.ties ? id : r.ties } : { qty: r.qty, body: r.body, ties: id });
    const same = res.needs.length === 1;
    return same ? res.needs[0].yards : (res.needs.find(n => (role === 'body' ? n.role === 'Body' : n.role === 'Straps'))?.yards ?? 0);
  };
  return (
    <FabricPicker
      title={role === 'body' ? 'Fabric for the body' : 'Fabric for the straps'}
      value={role === 'body' ? r.body : r.ties}
      need={need}
      onClose={onClose}
      onPick={id => {
        editRun(r.id, role === 'body' ? { body: id, ...(r.ties === r.body || !r.ties ? { ties: id } : {}) } : { ties: id });
        onClose();
      }}
    />
  );
}

/* ---------- header shared by every state ---------- */
function Hero({ r, right }: { r: Run; right?: React.ReactNode }) {
  const t = useTheme();
  const d = rel(r.due);
  const purpose = (r.name || '').split(' — ')[1] || '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <RunThumb r={r} size={72} radius={18} />
      <View style={{ flex: 1, gap: 8, minWidth: 0 }}>
        <View style={{ gap: 2 }}>
          <Text numberOfLines={2} style={{ fontSize: 28, lineHeight: 31, fontWeight: '700', letterSpacing: -0.4, color: t.text }}>{shortName(r)}</Text>
          {purpose ? <Text style={{ fontSize: F.f15, color: t.text2 }}>{purpose}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Chip label={r.status === 'draft' ? 'Draft' : r.status === 'active' ? 'In progress' : 'Finished ' + dayLabel(r.finishedAt, { month: 'short', day: 'numeric' })} tone={r.status === 'active' ? 'tint' : r.status === 'done' ? 'ok' : 'plain'} />
          {r.status !== 'done' ? <Chip label={d == null ? 'No date' : d < 0 ? relDue(d) : 'Due ' + dayLabel(r.due)} tone={d != null && d < 0 ? 'warn' : 'plain'} /> : null}
          {r.cut && r.status !== 'done' ? <Chip label={'Cut ' + dayLabel(r.cutAt, { month: 'short', day: 'numeric' })} tone="ok" /> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

/* ---------- due date: no calendar control on Windows, so quick picks and a day stepper ---------- */
function DueField({ value, onChange }: { value: string | null; onChange: (d: string | null) => void }) {
  const t = useTheme();
  const d = rel(value);
  const quick: [string, number | null][] = [['No date', null], ['1 week', 7], ['2 weeks', 14], ['3 weeks', 21], ['4 weeks', 28]];
  return (
    <View style={{ gap: 6 }}>
      <T s="label">Due</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.line2, borderRadius: R.control, backgroundColor: t.surface, minHeight: 38 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="A day earlier" onPress={() => onChange(addDays(value || todayDay(), -1))} style={{ width: 34, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}><T style={{ fontSize: 18 }}>‹</T></Pressable>
          <T style={{ minWidth: 150, textAlign: 'center', fontWeight: '600' }}>{value ? dayLabel(value) : 'No date'}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="A day later" onPress={() => onChange(addDays(value || todayDay(), 1))} style={{ width: 34, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}><T style={{ fontSize: 18 }}>›</T></Pressable>
        </View>
        {quick.map(([l, n]) => {
          const on = n == null ? !value : d === n;
          return (
            <Pressable key={l} accessibilityRole="button" onPress={() => onChange(n == null ? null : addDays(todayDay(), n))} style={{ paddingHorizontal: 12, minHeight: 32, justifyContent: 'center', borderRadius: R.chip, backgroundColor: on ? t.tint : t.sunken }}>
              <T style={{ fontSize: F.f13, fontWeight: '600' }} color={on ? t.onTint : t.text2}>{l}</T>
            </Pressable>
          );
        })}
      </View>
      {value ? <T s="small" color={d != null && d < 0 ? t.danger : t.text3}>{relDue(d)}</T> : null}
    </View>
  );
}

/* ---------- draft: the run planner ---------- */
function DraftView({ r, goSetup, setSel, setSheet }: { r: Run; goSetup: () => void; setSel: (id: string | null) => void; setSheet: (s: SheetState) => void }) {
  const shop = useShop();
  const t = useTheme();
  const res = useMemo(() => computePlan(shop, r), [shop, r.qty, r.prod, r.body, r.ties]);
  const sizes = Object.entries(shop.sizes);
  const anyReady = sizes.some(([k]) => sizeReady(shop, k));
  const body = shop.fabrics.find(f => f.id === r.body) || null;
  const ties = shop.fabrics.find(f => f.id === r.ties) || null;
  const n = planCount(r) + otherCount(r);
  const nums = useMemo(() => runNumbers(shop, r), [shop, r]);
  const set = (patch: Partial<Run>) => editRun(r.id, patch);
  const remove = () => {
    const i = shop.runs.findIndex(x => x.id === r.id);
    deleteRun(r.id);
    setSel(null);
    showSnack(`${shortName(r)} deleted`, () => restoreRun(r, i));
  };
  const short = res.needs.filter(x => x.short > 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22 }}>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 300, maxWidth: 520 }}>
          <Field label="Run name" value={r.name} onChange={v => set({ name: v })} placeholder={body ? body.name + ' run' : 'Fall restock'} />
        </View>
        <Chip label="Draft" />
      </View>

      {!anyReady ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.tint2 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontWeight: '700' }}>Add your cut sizes first</T>
            <T s="sub">Each bandana size needs its triangle measurements before it can go on a mat.</T>
          </View>
          <Button small title="Open Sizes & mats" onPress={goSetup} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Section title="Bandanas" style={{ flex: 1, minWidth: 340, maxWidth: 520 }}>
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {sizes.map(([k, z], i) => {
              const ready = sizeReady(shop, k);
              return (
                <Row key={k} first={i === 0}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>{z.name}</T>
                    {ready ? <T s="sub">{z.price != null ? money(z.price) + ' each' : 'Not priced'}</T> : (
                      <Pressable accessibilityRole="link" onPress={goSetup}><T s="sub" color={t.action}>Add its cut size</T></Pressable>
                    )}
                  </View>
                  {ready ? <Stepper label={z.name} value={r.qty[k] || 0} onChange={v => set({ qty: { ...r.qty, [k]: v } })} /> : null}
                </Row>
              );
            })}
          </Card>
          {shop.products.filter(p => p.variants.length).map(p => (
            <View key={p.id} style={{ gap: 8, marginTop: 14 }}>
              <T s="h2">{p.name}</T>
              <Card pad={false} style={{ overflow: 'hidden' }}>
                {p.variants.map((v, i) => (
                  <Row key={v.id} first={i === 0}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T style={{ fontWeight: '600' }}>{v.name}</T>
                      <T s="sub">{v.price != null ? money(v.price) + ' each' : 'Not priced'}{v.file ? ' · cut file' : ''}</T>
                    </View>
                    <Stepper label={v.name} value={(r.prod || {})[v.id] || 0} onChange={x => set({ prod: { ...(r.prod || {}), [v.id]: x } })} />
                  </Row>
                ))}
              </Card>
            </View>
          ))}
        </Section>

        <View style={{ flex: 1, minWidth: 320, maxWidth: 480, gap: 22 }}>
          <Section title="Fabric">
            <Card pad={false} style={{ overflow: 'hidden' }}>
              <FabricRow first label="Body" f={body} need={res.needs.find(x => x.role !== 'Straps')} onPress={() => setSheet({ k: 'pick', role: 'body' })} />
              <FabricRow label="Straps" f={ties} same={!!body && body === ties} need={res.needs.find(x => x.role === 'Straps')} onPress={() => setSheet({ k: 'pick', role: 'ties' })} />
            </Card>
            {short.length ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: t.warnTint, borderRadius: R.card, padding: 12 }}>
                <WarnIcon color={t.dark ? t.onWarn : t.warn} size={18} />
                <T s="sub" color={t.onWarn} style={{ flex: 1 }}>{short.map(x => `${yd(x.short)} short of ${x.f!.name}`).join(' · ')}</T>
              </View>
            ) : null}
            {res.needs[0]?.learned && Math.abs(res.needs[0].learned - 1) >= 0.01 ? (
              <T s="small">Includes {res.needs[0].learned > 1 ? '+' : '−'}{Math.round(Math.abs(res.needs[0].learned - 1) * 100)}% from what your past cuts really used.</T>
            ) : null}
          </Section>
          <Card style={{ gap: 16 }}>
            <DueField value={r.due} onChange={v => set({ due: v })} />
            {shop.templates.length > 1 ? (
              <Segmented label="Steps from" value={r.tpl} options={shop.templates.map(x => [x.id, x.name] as [string, string])} onChange={v => set({ tpl: v })} />
            ) : null}
          </Card>
        </View>
      </View>

      {res.missingSizes.length ? <T s="sub">{res.missingSizes.map(k => shop.sizes[k]?.name).join(', ')} can’t be planned until {res.missingSizes.length === 1 ? 'it has' : 'they have'} a cut size.</T> : null}

      {n ? (
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Tile label={otherCount(r) && !planCount(r) ? 'Items' : 'Bandanas'} value={String(planCount(r) || n)} sub={res.cp ? plural(res.cp.mats.length, 'mat') : undefined} />
          <Tile label="Fabric" value={yd(res.needs.reduce((a, x) => a + x.yards, 0))} sub={res.cp ? `${Math.round(res.cp.waste * 100)}% waste` : undefined} />
          <Tile label="Work" value={mins(nums.workMins)} sub={`${r.steps.length} steps`} />
          <Tile label={shop.cfg.payLabor ? 'Per hour' : 'Profit'} value={Object.keys(r.qty).filter(k => r.qty[k]).every(k => shop.sizes[k]?.price != null) ? (shop.cfg.payLabor ? money(nums.perHour) : money0(nums.profit)) : '–'} sub={`Materials ${money(nums.materials)}`} />
        </View>
      ) : anyReady ? (
        <T s="sub">Add bandanas above to see them laid out on the mats.</T>
      ) : null}

      <CutLayout r={r} editable />

      {n ? <StepsSection r={r} setSheet={setSheet} /> : null}

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button title="Start this run" disabled={!n} onPress={() => { startRun(r.id); showSnack('Run started'); }} />
        {res.cp && body ? <Button kind="secondary" title="Record the cut" icon={c => <ScissorsIcon color={c} size={16} />} onPress={() => setSheet({ k: 'cut' })} /> : null}
        <View style={{ flex: 1 }} />
        <Button kind="danger" small title="Delete run" icon={c => <TrashIcon color={c} size={14} />} onPress={remove} />
      </View>
    </ScrollView>
  );
}

function FabricRow({ label, f, need, onPress, first, same }: { label: string; f: any; need?: { yards: number; short: number }; onPress?: () => void; first?: boolean; same?: boolean }) {
  const t = useTheme();
  return (
    <Row first={first} onPress={onPress}>
      <Swatch color={f ? f.color : t.sunken} />
      <View style={{ flex: 1, gap: 2 }}>
        <T s="label">{label}</T>
        <T style={{ fontWeight: '600' }} color={f ? t.text : t.action}>{f ? f.name : 'Choose fabric'}</T>
        {f ? <T s="sub">{same && !need ? 'Counted with the body' : `${yd(f.yards)} on the shelf`}</T> : null}
      </View>
      {need ? (
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <T style={{ fontWeight: '600' }}>{yd(need.yards)}</T>
          {need.short > 0 ? <Chip label={`${yd(need.short)} short`} tone="warn" /> : f ? <T s="small">leaves {yd(f.yards - need.yards)}</T> : null}
        </View>
      ) : null}
      {onPress ? <ChevIcon color={t.text3} size={14} /> : null}
    </Row>
  );
}

function StepsSection({ r, setSheet }: { r: Run; setSheet: (s: SheetState) => void }) {
  const t = useTheme();
  const dn = r.steps.filter(s => s.done).length;
  const left = r.steps.filter(s => !s.done).reduce((a, s) => a + s.est, 0);
  return (
    <Section title={`Steps · ${dn} of ${r.steps.length}`} right={dn < r.steps.length ? <T s="sub">~{mins(left)} left</T> : undefined}>
      <StepsBox>
        {r.steps.map((s, i) => (
          <StepRow key={s.id} r={r} s={s} first={i === 0} onOpen={() => setSheet({ k: 'step', id: s.id })} onCut={() => setSheet({ k: 'cut' })} />
        ))}
        <Pressable accessibilityRole="button" onPress={() => setSheet({ k: 'step', id: addStep(r.id) })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderTopWidth: r.steps.length ? 1 : 0, borderTopColor: t.line }}>
          <PlusIcon color={t.action} size={18} />
          <T color={t.action} style={{ fontWeight: '600' }}>Add a step</T>
        </Pressable>
      </StepsBox>
    </Section>
  );
}

/* ---------- in progress ---------- */
function BenchView({ r, setSheet, openWorkflow }: { r: Run; setSheet: (s: SheetState) => void; openWorkflow?: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const dn = r.steps.filter(s => s.done).length;
  const left = r.steps.length - dn;
  const fabric = (
    <Section
      title="Fabric"
      right={r.cut ? <T s="sub">{money(r.fabUse.reduce((a, u) => a + u.used * (u.cost || 0), 0))} for this run</T> : undefined}>
      <Card pad={false} style={{ overflow: 'hidden' }}>
        {r.cut
          ? r.fabUse.map((u, i) => {
              const f = shop.fabrics.find(x => x.id === u.f);
              return (
                <Row key={u.f + i} first={i === 0}>
                  <Swatch color={f ? f.color : t.sunken} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>{u.name}</T>
                    <T s="sub">{u.role || 'Fabric'} · planned {yd(u.plan)}</T>
                  </View>
                  <NumField label={`Used of ${u.name}`} bare value={u.used} onChange={v => setUsed(r.id, u.f, v ?? 0)} suffix="yd" width={110} />
                </Row>
              );
            })
          : r.fabrics.map((x, i) => {
              const f = shop.fabrics.find(y => y.id === x.f);
              const short = f ? x.need > f.yards : true;
              return (
                <Row key={x.f + i} first={i === 0}>
                  <Swatch color={f ? f.color : t.sunken} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>{f ? f.name : 'Removed'}</T>
                    <T s="sub">{x.role}</T>
                  </View>
                  <T style={{ fontWeight: '600' }} color={short ? t.danger : t.success}>{f && short ? `${yd(x.need - f.yards)} short` : `${yd(x.need)}${f ? ' of ' + yd(f.yards) : ''}`}</T>
                </Row>
              );
            })}
        {!r.fabrics.length && !r.cut ? <Row first><T s="sub">No fabric set</T></Row> : null}
      </Card>
      {r.cut ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T s="small" style={{ flex: 1 }}>Changing what you used corrects the shelf, and future plans learn from it.</T>
          <Button kind="ghost" small title="Undo cut" onPress={() => { undoCut(r.id); showSnack('Fabric put back on the shelf'); }} />
        </View>
      ) : r.fabrics.length ? (
        <Button small kind="secondary" title="Record the cut" icon={c => <ScissorsIcon color={c} size={15} />} onPress={() => setSheet({ k: 'cut' })} style={{ alignSelf: 'flex-start' }} />
      ) : null}
    </Section>
  );
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 820, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>
        <Hero r={r} />
        <Section title="In this run" right={<T s="sub">{plural(planCount(r), 'bandana')}{otherCount(r) ? ` · ${otherCount(r)} other` : ''}</T>}><InThisRun r={r} /></Section>
        <StepsSection r={r} setSheet={setSheet} />
        {openWorkflow ? <T onPress={() => openWorkflow(r.id)} color={t.action} style={{ fontWeight: '600', fontSize: F.f14, alignSelf: 'flex-start', marginTop: -8 }}>Open in Workflow</T> : null}
        <Button kind={left ? 'secondary' : 'primary'} icon={c => <CheckIcon color={c} size={18} />} title={left ? `Finish run · ${plural(left, 'step')} left` : 'Finish run'} onPress={() => setSheet({ k: 'finish' })} />
        <MoneyCard r={r} />
        {fabric}
        <CutLayout r={r} />
        <Field label="Notes" value={r.notes} onChange={v => editRun(r.id, { notes: v })} placeholder="Anything to remember about this run" multiline />
        <PhotoStrip link={{ run: r.id }} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button small kind="secondary" title="Log a defect" icon={c => <DefectIcon color={c} size={16} />} onPress={() => setSheet({ k: 'defect' })} style={{ flex: 1 }} />
          <Button small kind="secondary" title="Shopify listing" onPress={() => setSheet({ k: 'listing' })} style={{ flex: 1 }} />
        </View>
      </View>
    </ScrollView>
  );
}

/* ---------- finished: review ---------- */
function ReviewView({ r, setSel, setSheet }: { r: Run; setSel: (id: string | null) => void; setSheet: (s: SheetState) => void }) {
  const shop = useShop();
  const t = useTheme();
  const nums = useMemo(() => runNumbers(shop, r), [shop, r]);
  const plan = r.steps.reduce((a, s) => a + s.est, 0);
  const untimed = r.steps.filter(s => !s.actual);
  const cmp = r.steps.filter(s => s.actual).map(s => [s.name, s.actual!, s.est] as [string, number, number]);
  const mx = Math.max(1, ...cmp.map(c => Math.max(c[1], c[2])));
  const fab = r.fabUse.length ? r.fabUse.reduce((a, u) => a + u.used, 0) : r.fabrics.reduce((a, x) => a + x.need, 0);
  const fabPlan = r.fabUse.length ? r.fabUse.reduce((a, u) => a + u.plan, 0) : fab;
  const pay = shop.cfg.payLabor;
  const priced = Object.keys(r.qty).filter(k => r.qty[k]).every(k => shop.sizes[k]?.price != null);
  const worst = cmp
    .map(([n, a, p]) => ({ n, a, p, d: a - p }))
    .filter(x => x.a > x.p * 1.1 || x.a < x.p * 0.75)
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
  const tip = worst
    ? worst.d > 0
      ? `${worst.n} ran ${mins(worst.d)} long. If that keeps happening, set it closer to your real pace in Settings › Workflow templates.`
      : `${worst.n} took ${mins(-worst.d)} less than planned. Once you’ve timed it a few times, Settings › Workflow templates can use your real pace.`
    : cmp.length
      ? 'Every timed step landed close to its plan.'
      : 'Time more steps on the next run and this review gets sharper.';
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 1100 }}>
      <Hero r={r} />
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {pay ? (
          <Tile label="Earned per hour" value={priced ? money(nums.perHour) : '–'} color={nums.perHour >= shop.laborRate ? t.success : t.warn} sub={untimed.length ? `${plural(untimed.length, 'step')} not timed, uses plan` : nums.perHour >= shop.laborRate ? 'at or over ' + money0(shop.laborRate) : money(shop.laborRate - nums.perHour) + ' under ' + money0(shop.laborRate)} />
        ) : (
          <Tile label="Profit" value={priced ? money0(nums.profit) : '–'} sub={priced ? `${money(nums.profit / Math.max(1, nums.pieces))} a bandana` : 'Price your sizes to see profit'} />
        )}
        <Tile label="Hours" value={mins(nums.workMins)} sub={untimed.length ? `${plural(untimed.length, 'step')} not timed` : nums.workMins > plan ? mins(nums.workMins - plan) + ' over plan' : nums.workMins < plan ? mins(plan - nums.workMins) + ' under plan' : 'on plan'} />
        <Tile label="Fabric" value={yd(fab)} sub={`planned ${yd(fabPlan)}`} />
        <Tile label="Defects" value={String(r.defects || 0)} sub={`of ${plural(nums.pieces, 'bandana')}`} />
      </View>
      <Card style={{ gap: 14 }}>
        <T style={{ fontWeight: '700' }}>Each step against its plan</T>
        {cmp.length ? cmp.map(([n, a, p]) => (
          <View key={n} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T style={{ fontSize: F.f14, fontWeight: '500' }}>{n}</T>
              <T style={{ fontSize: F.f14, fontVariant: ['tabular-nums'], fontWeight: a > p * 1.1 ? '600' : '400' }} color={a > p * 1.1 ? t.warn : t.text2}>{mins(a)} / {mins(p)}</T>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: t.sunken }}>
              <View style={{ width: `${(a / mx) * 100}%`, height: 10, borderRadius: 5, backgroundColor: a > p * 1.1 ? t.barA : t.barG }} />
              <View style={{ position: 'absolute', left: `${(p / mx) * 100}%`, top: -3, width: 2, height: 16, backgroundColor: t.text }} />
            </View>
          </View>
        )) : <T s="sub">No steps were timed.</T>}
        {untimed.length && cmp.length ? <T s="small">Not timed: {untimed.map(x => x.name).join(', ')}</T> : null}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 12, height: 8, borderRadius: 2, backgroundColor: t.barG }} /><T s="small">Actual</T></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 2, height: 12, backgroundColor: t.text }} /><T s="small">Planned</T></View>
        </View>
      </Card>
      <View style={{ backgroundColor: t.tint2, borderRadius: R.card, padding: 16 }}>
        <T><T style={{ fontWeight: '700' }}>Next time. </T>{tip}</T>
      </View>
      {r.notes ? <Section title="Notes"><Card><T>{r.notes}</T></Card></Section> : null}
      <PhotoStrip link={{ run: r.id }} />
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Button title="Plan this again" onPress={() => { const id = planAgain(r.id); if (id) setSel(id); }} />
        <Button kind="secondary" title="Log a defect" icon={c => <DefectIcon color={c} size={16} />} onPress={() => setSheet({ k: 'defect' })} />
        <Button kind="secondary" title="Shopify listing" onPress={() => setSheet({ k: 'listing' })} />
        <View style={{ flex: 1 }} />
        <Button kind="ghost" small title="Move back to in progress" onPress={() => { reopenRun(r.id); showSnack('Back in progress. Its bandanas came out of stock'); }} />
      </View>
    </ScrollView>
  );
}
