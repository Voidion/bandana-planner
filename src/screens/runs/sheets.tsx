/* Sheets for runs: record the cut, a step, finish, fix a timer, log a defect, pick a fabric. */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { clock, mins, plural, yd } from '../../lib/format';
import { isCutStep, timerMs } from '../../lib/plan';
import {
  closeOutTimer,
  cutRun,
  editStep,
  enterTime,
  finishRun,
  fixTimer,
  logDefect,
  moveStep,
  pauseTimer,
  removeStep,
  restoreStep,
  restoreTimer,
  startTimer,
  stopTimer,
  tickStep,
  undoDefect,
  useShop,
} from '../../state/store';
import type { Run } from '../../state/types';
import { addOffcut } from '../../state/shelf';
import { CheckIcon, DownIcon, PauseIcon, PlayIcon, StopIcon, UpIcon } from '../../ui/icons';
import { Button, Field, IconButton, NumField, Row, Segmented, Sheet, showSnack, Stepper, Swatch, T } from '../../ui/kit';
import { F, R, useTheme } from '../../ui/theme';
import { useNow } from '../../ui/useNow';
import { shortName } from './parts';

/* ---------- record the cut ---------- */
export function CutSheet({ r, onClose }: { r: Run; onClose: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [used, setUsed] = useState<(number | null)[]>(r.fabrics.map(x => x.need));
  const [off, setOff] = useState<number | null>(null);
  const rows = r.fabrics.map((x, i) => {
    const f = shop.fabrics.find(y => y.id === x.f);
    const u = used[i] ?? x.need;
    return { x, f, u, left: (f ? f.yards : 0) - u };
  });
  const short = rows.filter(o => o.left < -0.001);
  const total = rows.reduce((a, o) => a + o.u, 0);
  const cs = r.steps.find(x => isCutStep(x.name));
  const live = !!shop.timer && !!cs && shop.timer.step === cs.id;
  const go = () => {
    cutRun(r.id, used.map((u, i) => u ?? r.fabrics[i].need));
    if (off && off > 0 && r.fabrics[0]) addOffcut(r.fabrics[0].f, off, false);
    onClose();
    showSnack(off && off > 0 ? `Fabric taken off the shelf. Kept ${yd(off)} as an offcut` : 'Fabric taken off the shelf');
  };
  return (
    <Sheet
      title={short.length ? 'Not enough fabric' : 'Record the cut'}
      sub={`${shortName(r)} · ${plural(Object.values(r.qty).reduce((a, b) => a + b, 0), 'bandana')}. ${short.length === 1 ? `${short[0].f?.name} is ${yd(-short[0].left)} short.` : short.length ? `${short.length} bolts are short.` : `Planned ${yd(r.fabrics.reduce((a, x) => a + x.need, 0))} across ${plural(r.fabrics.length, 'bolt')}.`}`}
      onClose={onClose}
      footer={
        short.length ? (
          <>
            <Button kind="ghost" title="Cut anyway" onPress={go} />
            <Button title="Don’t cut yet" onPress={onClose} />
          </>
        ) : (
          <>
            <Button kind="ghost" title="Not yet" onPress={onClose} />
            <Button title={`Cut ${yd(total)}`} onPress={go} />
          </>
        )
      }>
      <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
        {rows.map(({ x, f, u, left }, i) => (
          <Row key={x.f + i} first={i === 0}>
            <Swatch color={f ? f.color : t.sunken} />
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontWeight: '600' }}>{f ? f.name : 'Removed fabric'}</T>
              <T s="sub">{x.role} · planned {yd(x.need)}</T>
              <T s="small" color={left < -0.001 ? t.danger : t.text3}>{f ? `${yd(f.yards)} → ${left < -0.001 ? yd(-left) + ' short' : yd(left) + ' left'}` : ''}</T>
            </View>
            <NumField label={`Used for ${f ? f.name : 'fabric'}`} bare value={u} onChange={n => setUsed(used.map((v, j) => (j === i ? n : v)))} suffix="yd" width={110} />
          </Row>
        ))}
      </View>
      <T s="small">Change an amount if you used more or less than planned. Future plans learn from what you really use.</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <T style={{ flex: 1 }}>Left a usable piece? Keep it as an offcut</T>
        <NumField label="Offcut to keep" bare value={off} onChange={setOff} suffix="yd" width={110} placeholder="0" />
      </View>
      <T s="small">{live ? `Ticks Cut day and keeps the ${mins(timerMs(shop.timer) / 6e4)} on your timer. ` : 'Ticks Cut day. '}{short.length ? 'Cutting anyway leaves that bolt below zero until you restock. ' : ''}You can undo the cut from the run if you change your mind.</T>
    </Sheet>
  );
}

/* ---------- a step ---------- */
export function StepSheet({ r, stepId, onClose, onCut }: { r: Run; stepId: string; onClose: () => void; onCut: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const s = r.steps.find(x => x.id === stepId);
  const m = shop.timer;
  const live = !!m && !!s && m.step === s.id;
  useNow(live && !m!.paused);
  const [entered, setEntered] = useState<number | null>(s && s.entered ? s.actual ?? null : null);
  const [fix, setFix] = useState(false);
  if (!s) return null;
  if (fix) return <FixTimerSheet onClose={() => setFix(false)} />;
  const i = r.steps.indexOf(s);
  const isCut = isCutStep(s.name) && !r.cut;
  const canEnter = !live && (!s.done || s.entered);
  const done = () => {
    if (entered && entered > 0 && !(s.entered && s.actual === entered)) {
      enterTime(r.id, s.id, entered);
      showSnack(s.done ? `Time changed to ${mins(entered)}` : `${s.name} ticked with ${mins(entered)}`);
    }
    onClose();
  };
  const remove = () => {
    removeStep(r.id, s.id);
    onClose();
    showSnack(`“${s.name}” removed`, () => restoreStep(r.id, s, i));
  };
  return (
    <Sheet title={s.name} sub={`${shortName(r)} · step ${i + 1} of ${r.steps.length}`} onClose={onClose} footer={<><Button kind="danger" title="Remove step" onPress={remove} /><View style={{ flex: 1 }} /><Button title="Done" onPress={done} /></>}>
      <View style={{ backgroundColor: t.bg, borderRadius: R.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {live ? (
          <>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontWeight: '600' }} color={m!.paused ? t.warn : t.success}>{m!.paused ? 'Paused' : 'Timing now'}</T>
              <T style={{ fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</T>
            </View>
            <Button kind="secondary" small title={m!.paused ? 'Resume' : 'Pause'} icon={c => (m!.paused ? <PlayIcon color={c} size={13} /> : <PauseIcon color={c} size={13} />)} onPress={pauseTimer} />
            <Button small title="Stop" icon={c => <StopIcon color={c} size={12} />} onPress={() => { const res = stopTimer(); if (res) showSnack(`Recorded ${mins(res.mins)} for ${res.step}`); }} />
          </>
        ) : s.done ? (
          <>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.success, alignItems: 'center', justifyContent: 'center' }}><CheckIcon color={t.dark ? t.bg : '#fff'} size={16} sw={2.4} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontWeight: '600' }}>Done</T>
              <T s="sub">{s.entered ? `Took ${mins(s.actual || 0)}, entered by hand` : s.actual ? `Took ${mins(s.actual)}, timed` : 'Not timed'}</T>
            </View>
            <Button kind="secondary" small title="Untick" onPress={() => tickStep(r.id, s.id)} />
          </>
        ) : (
          <>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontWeight: '600' }}>Not started</T>
              <T s="sub">About {mins(s.est)} planned</T>
            </View>
            <Button kind="secondary" small title={isCut ? 'Record the cut' : 'Mark done'} icon={c => <CheckIcon color={c} size={15} />} onPress={() => (isCut ? onCut() : (tickStep(r.id, s.id), onClose()))} />
            {r.status !== 'done' ? <Button small title="Start timer" icon={c => <PlayIcon color={c} size={13} />} onPress={() => startTimer(r.id, s.id)} /> : null}
          </>
        )}
      </View>
      {live ? <Button kind="ghost" small title="Forgot to stop it? Fix this time" onPress={() => setFix(true)} style={{ alignSelf: 'center' }} /> : null}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label="Name" value={s.name} onChange={v => editStep(r.id, s.id, { name: v })} /></View>
        <NumField label="Planned time" value={s.est} onChange={n => editStep(r.id, s.id, { est: Math.max(1, Math.round(n || 1)) })} suffix="min" width={120} />
        <IconButton label="Move up" onPress={() => moveStep(r.id, s.id, -1)}>{c => <UpIcon color={i ? c : t.line2} size={18} />}</IconButton>
        <IconButton label="Move down" onPress={() => moveStep(r.id, s.id, 1)}>{c => <DownIcon color={i < r.steps.length - 1 ? c : t.line2} size={18} />}</IconButton>
      </View>
      <T s="small">{s.source === 'learned' ? 'Your median from past runs' : s.source === 'actual' ? 'Timed last run' : 'From the template, for the whole run'}</T>
      <Field label="Note while you work" value={s.note || ''} onChange={v => editStep(r.id, s.id, { note: v })} placeholder="Anything to remember at this step" />
      {canEnter ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bg, borderRadius: R.card, padding: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontWeight: '600' }}>{s.done ? 'Time it took' : 'Forgot the timer?'}</T>
            <T s="small">{s.done ? 'Entered by hand, so estimates ignore it' : 'Enter the time and Done ticks the step'}</T>
          </View>
          <NumField label="Minutes it took" bare value={entered} onChange={setEntered} suffix="min" width={110} placeholder="0" />
        </View>
      ) : null}
    </Sheet>
  );
}

/* ---------- forgot to stop the timer ---------- */
export function FixTimerSheet({ onClose }: { onClose: () => void }) {
  const shop = useShop();
  const m = shop.timer;
  useNow(!!m && !m.paused);
  const [h, setH] = useState<number | null>(null);
  const [mm, setMm] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const t = useTheme();
  const r = m && shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m!.step);
  if (!m || !r || !s) return <Sheet title="Fix this time" onClose={onClose}><T s="sub">No timer is running.</T></Sheet>;
  const ms = timerMs(m);
  const save = () => {
    const v = (h || 0) * 60 + (mm || 0);
    if (!(v > 0)) return setErr('Enter the hours and minutes you really worked.');
    if (v > Math.ceil(ms / 6e4)) return setErr(`That’s longer than the timer ran (${mins(Math.ceil(ms / 6e4))}).`);
    fixTimer(v);
    onClose();
    showSnack(`Saved ${mins(v)} for ${s.name}`);
  };
  const drop = () => {
    const was = closeOutTimer();
    onClose();
    showSnack('Timer stopped. No time recorded', () => restoreTimer(was));
  };
  return (
    <Sheet title="Fix this time" sub={`${s.name} · ${shortName(r)}`} onClose={onClose} footer={<><Button kind="ghost" title="Don’t record any time" onPress={drop} /><View style={{ flex: 1 }} /><Button title="Save time" onPress={save} /></>}>
      <View style={{ backgroundColor: t.bg, borderRadius: R.card, padding: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '600' }}>Your timer shows</T>
          <T s="sub">{m.paused ? 'Paused' : m.acc ? 'Paused and resumed' : 'Started ' + new Date(m.start).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</T>
        </View>
        <T style={{ fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{clock(ms)}</T>
      </View>
      <T style={{ fontWeight: '600' }}>How long did you really work?</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <NumField label="Hours" value={h} onChange={setH} suffix="h" width={110} placeholder={String(Math.floor(ms / 36e5))} />
        <NumField label="Minutes" value={mm} onChange={setMm} suffix="m" width={110} placeholder={String(Math.floor(ms / 6e4) % 60)} />
      </View>
      {err ? <T s="sub" color={t.danger}>{err}</T> : <T s="small">Typed-in time is saved on the step but doesn’t change your estimates.</T>}
    </Sheet>
  );
}

/* ---------- finish ---------- */
export function FinishSheet({ r, onClose, onDone }: { r: Run; onClose: () => void; onDone: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const left = r.steps.filter(x => !x.done);
  const m = shop.timer;
  const mine = !!m && m.run === r.id;
  const n = Object.values(r.qty).reduce((a, b) => a + b, 0);
  const go = () => {
    finishRun(r.id);
    onClose();
    onDone();
    showSnack(`Run finished. ${plural(n, 'bandana')} moved to Finished stock`);
  };
  return (
    <Sheet title="Finish this run?" onClose={onClose} footer={<><Button kind="ghost" title="Keep working" onPress={onClose} /><Button title="Finish run" onPress={go} /></>}>
      {left.length ? (
        <>
          <T s="sub">{left.length} step{left.length === 1 ? ' isn’t' : 's aren’t'} ticked yet. Finishing marks {left.length === 1 ? 'it' : 'them'} done{left.some(x => !x.actual && !(mine && m!.step === x.id)) ? ', and steps that weren’t timed record no time' : ''}.</T>
          <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
            {left.map((x, i) => (
              <Row key={x.id} first={i === 0}>
                <T style={{ flex: 1 }}>{x.name}</T>
                <T s="sub" color={mine && m!.step === x.id ? t.success : x.actual ? t.text2 : t.text3}>{mine && m!.step === x.id ? 'You’re timing' : x.actual ? 'Timed ' + mins(x.actual) : 'Not timed'}</T>
              </Row>
            ))}
          </View>
        </>
      ) : (
        <T s="sub">Every step is ticked.</T>
      )}
      <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
        {mine ? (
          <Row first>
            <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }}>Your timer stops</T><T s="sub">The time so far is kept</T></View>
          </Row>
        ) : null}
        <Row first={!mine}>
          <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }}>{plural(n, 'bandana')}</T><T s="sub">Move to Finished stock</T></View>
        </Row>
      </View>
    </Sheet>
  );
}

/* ---------- log a defect ---------- */
const KINDS = ['Crooked seam', 'Fabric flaw', 'Cut wrong', 'Strap came loose', 'Stain or mark', 'Other'];
function Chips<V extends string>({ value, options, onChange, label }: { value: V; options: [V, string][]; onChange: (v: V) => void; label: string }) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([v, l]) => (
        <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: v === value }} onPress={() => onChange(v)}
          style={{ paddingHorizontal: 14, minHeight: 34, justifyContent: 'center', borderRadius: R.chip, backgroundColor: v === value ? t.tint : t.bg, borderWidth: 1, borderColor: v === value ? t.tint : t.line2 }}>
          <T style={{ fontSize: F.f14, fontWeight: v === value ? '600' : '500' }} color={v === value ? t.onTint : t.text}>{l}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function DefectSheet({ r, onClose }: { r: Run; onClose: () => void }) {
  const shop = useShop();
  const [kind, setKind] = useState(KINDS[0]);
  const [step, setStep] = useState('');
  const [n, setN] = useState(1);
  const done = r.status === 'done';
  const sizes = Object.keys(r.qty).filter(k => r.qty[k]);
  const [size, setSize] = useState(sizes[0] || '');
  const [fate, setFate] = useState<'fix' | 'toss' | 'keep'>('fix');
  const inStock = done && size ? shop.stock.filter(s => s.run === r.id && s.size === size).reduce((a, s) => a + s.n, 0) : 0;
  const go = () => {
    const id = logDefect({ run: r.id, kind, step: step || null, n, size: done ? size : null, fate });
    onClose();
    showSnack(`${plural(n, 'defect')} logged${fate === 'toss' && done ? ', taken out of stock' : ''}`, () => undoDefect(id));
  };
  return (
    <Sheet title="Log a defect" sub="Spot where problems keep happening" onClose={onClose} width={560} footer={<Button title={`Log ${plural(n, 'defect')}`} onPress={go} />}>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 16 }}>
        <View style={{ gap: 8 }}><T s="h2">What went wrong</T><Chips label="What went wrong" value={kind} options={KINDS.map(k => [k, k] as [string, string])} onChange={setKind} /></View>
        {r.steps.length ? <View style={{ gap: 8 }}><T s="h2">At which step · if you know</T><Chips label="At which step" value={step} options={[['', 'Not sure'], ...r.steps.map(s => [s.id, s.name] as [string, string])]} onChange={setStep} /></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><T style={{ flex: 1, fontWeight: '600' }}>{plural(n, 'bandana')}</T><Stepper label="defects" value={n} onChange={v => setN(Math.max(1, v))} /></View>
        {done && sizes.length > 1 ? <View style={{ gap: 8 }}><T s="h2">Which size</T><Segmented label="Size" value={size} options={sizes.map(k => [k, shop.sizes[k]?.name || k] as [string, string])} onChange={setSize} /></View> : null}
        <View style={{ gap: 8 }}>
          <T s="h2">What happens to it</T>
          <Segmented label="What happens to it" value={fate} options={[['fix', 'Fix it'], ['toss', 'Throw it out'], ['keep', 'Keep as a sample']]} onChange={setFate} />
          <T s="small">{fate === 'fix' ? 'It stays in your count once it’s fixed.' : done ? `Takes ${n} ${shop.sizes[size]?.name || ''} out of finished stock${inStock < n ? `, only ${inStock} left from this run` : ''}.` : 'Counts against the run, so it finishes with fewer.'}</T>
        </View>
      </ScrollView>
    </Sheet>
  );
}

/* ---------- pick a fabric ---------- */
export function FabricPicker({ title, value, need, onPick, onClose }: { title: string; value: string | null; need?: (id: string) => number; onPick: (id: string) => void; onClose: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [q, setQ] = useState('');
  const list = shop.fabrics
    .filter(f => !q.trim() || f.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map(f => ({ f, n: need ? need(f.id) : 0 }))
    .sort((a, b) => Number(a.n > a.f.yards) - Number(b.n > b.f.yards) || b.f.yards - a.f.yards);
  return (
    <Sheet title={title} onClose={onClose}>
      {shop.fabrics.length > 7 ? <Field label="Find a fabric" value={q} onChange={setQ} placeholder="Find a fabric" /> : null}
      {shop.fabrics.length ? (
        <ScrollView style={{ maxHeight: 460 }}>
          <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
            {list.map(({ f, n }, i) => (
              <Row key={f.id} first={i === 0} selected={f.id === value} onPress={() => onPick(f.id)}>
                <Swatch color={f.color} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: '600' }}>{f.name}</T>
                  <T s="sub">{yd(f.yards)} on the shelf{n && n <= f.yards ? ` · leaves ${yd(f.yards - n)}` : ''}{f.grain === 'directional' ? ' · directional' : ''}</T>
                </View>
                {n > f.yards ? <T s="small" color={t.danger}>{yd(n - f.yards)} short</T> : null}
              </Row>
            ))}
          </View>
        </ScrollView>
      ) : (
        <T s="sub">Add fabric in Fabric first.</T>
      )}
    </Sheet>
  );
}
