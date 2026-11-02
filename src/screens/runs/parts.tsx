/* Pieces shared by the run screens: the cut layout, money summary, sizes in the run, and step rows. */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { clock, inch, mins, money, pct, plural, yd } from '../../lib/format';
import { computePlan, cutFiles, MATS, matWaste, runNumbers, timerMs } from '../../lib/plan';
import { onDevice, revealFile, saveCutFile } from '../../state/storage';
import { moveStep, pauseTimer, removeStep, restoreStep, startTimer, stopTimer, tickStep, useShop } from '../../state/store';
import type { Run, Step } from '../../state/types';
import { CheckIcon, DownloadIcon, FolderIcon, PauseIcon, PlayIcon, StopIcon } from '../../ui/icons';
import { Button, Card, Row, Section, Sheet, showSnack, Swatch, T, useContextMenu } from '../../ui/kit';
import { MatView } from '../../ui/MatView';
import { F, R, useTheme } from '../../ui/theme';
import { useNow } from '../../ui/useNow';

export const shortName = (r: Run) => (r.name || 'Untitled run').split(' — ')[0];
export const otherCount = (r: Run) => Object.values(r.prod || {}).reduce((a, b) => a + (b || 0), 0);

/** Big number tiles: 12 Medium, 6 Large */
export function InThisRun({ r }: { r: Run }) {
  const shop = useShop();
  const t = useTheme();
  const sizes = Object.keys(shop.sizes).filter(k => r.qty[k]);
  const vars = shop.products.flatMap(p => p.variants).filter(v => (r.prod || {})[v.id]);
  if (!sizes.length && !vars.length) return null;
  const straps: Record<string, number> = {};
  sizes.forEach(k => {
    const st = shop.straps.find(x => x.id === shop.sizes[k].strap);
    if (st) straps[st.name] = (straps[st.name] || 0) + r.qty[k];
  });
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {sizes.map(k => {
          const z = shop.sizes[k];
          return (
            <View key={k} style={{ minWidth: 96, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: t.surface, gap: 1 }}>
              <T style={{ fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{r.qty[k]}</T>
              <T style={{ fontSize: F.f14, fontWeight: '600' }}>{z.name}</T>
              {z.cw ? <T s="small">{inch(z.cw)} × {inch(z.cl)}</T> : null}
            </View>
          );
        })}
        {vars.map(v => (
          <View key={v.id} style={{ minWidth: 96, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: t.surface, gap: 1 }}>
            <T style={{ fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{(r.prod || {})[v.id]}</T>
            <T style={{ fontSize: F.f14, fontWeight: '600' }}>{v.name}</T>
            <T s="small">{shop.products.find(p => p.id === v.pid)?.name}</T>
          </View>
        ))}
      </View>
      {Object.keys(straps).length ? <T s="sub">Plus {Object.entries(straps).map(([n, c]) => `${c} ${n.toLowerCase()} strap${c === 1 ? '' : 's'}`).join(' · ')}.</T> : null}
    </View>
  );
}

/** Worth at list price, materials, work time and profit */
export function MoneyCard({ r }: { r: Run }) {
  const shop = useShop();
  const t = useTheme();
  const n = useMemo(() => runNumbers(shop, r), [shop, r]);
  const priced = Object.keys(r.qty).filter(k => r.qty[k]).every(k => shop.sizes[k]?.price != null) && shop.products.flatMap(p => p.variants).filter(v => (r.prod || {})[v.id]).every(v => v.price != null);
  const pay = shop.cfg.payLabor;
  const stat = (v: string, l: string, color?: string) => (
    <View style={{ flex: 1, gap: 2 }}>
      <T style={{ fontSize: F.f18, fontWeight: '600', fontVariant: ['tabular-nums'] }} color={color}>{v}</T>
      <T s="small">{l}</T>
    </View>
  );
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 2 }}>
        <T s="label">Worth at list price</T>
        <T style={{ fontSize: F.f28, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{priced ? money(n.worth) : '–'}</T>
        {!priced ? <T s="small">Add a price to each size in Settings › Sizes to see what this run is worth.</T> : null}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.line, paddingTop: 14, gap: 12 }}>
        {stat(money(n.materials), 'Materials')}
        {stat(mins(n.workMins), 'Work')}
        {pay
          ? stat(priced ? money(n.perHour) : '–', 'Per hour', n.perHour >= shop.laborRate ? t.success : t.warn)
          : stat(priced ? money(n.profit) : '–', 'Profit', n.profit >= 0 ? t.success : t.danger)}
      </View>
    </Card>
  );
}

/** The run on Cricut mats, with Save cut files */
export function CutLayout({ r, editable }: { r: Run; editable?: boolean }) {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(600);
  const [exporting, setExporting] = useState(false);
  const res = useMemo(() => computePlan(shop, r), [shop, r.qty, r.prod, r.body, r.ties]);
  const vm = MATS.find(m => m.id === shop.cfg.cut.mat) || MATS[1];
  const body = shop.fabrics.find(f => f.id === r.body) || null;
  const ties = shop.fabrics.find(f => f.id === r.ties) || null;
  const cols = Math.max(2, Math.min(5, Math.floor((w + 16) / (170 + 16))));
  const matW = Math.floor((w - (cols - 1) * 16) / cols);
  if (!res.cp) return null;
  const what = (m: any) => (m.fab === 'strap' ? plural(m.straps, 'strap') : m.fab === 'bow' ? plural(m.bows || m.pieces.length, 'piece') : plural(m.bandanas, 'bandana'));
  return (
    <Section
      title="On the mats"
      right={<T s="sub">{plural(res.cp.mats.length, 'mat')} · {vm.name} · {pct(res.cp.waste)} waste</T>}>
      <Card style={{ gap: 16 }}>
        {res.tooBig ? <T s="sub" color={t.danger}>{plural(res.tooBig, 'piece')} too big for the mat. Check the cut sizes or the strip width in Settings › Sizes & mats.</T> : null}
        <View onLayout={e => setW(Math.max(300, e.nativeEvent.layout.width))} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {res.cp.mats.map((m: any, i: number) => (
            <View key={i} style={{ gap: 6 }}>
              <MatView mat={m} cp={res.cp} matSize={vm} width={matW} bodyColor={body ? body.color : t.barA} strapColor={ties ? ties.color : t.barG} />
              <T s="small" style={{ fontWeight: '600' }}>Mat {i + 1} · {what(m)}</T>
              <T s="small" color={matWaste(m) > 0.3 ? t.warn : t.text3}>{pct(matWaste(m))} waste</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button kind={editable ? 'secondary' : 'primary'} small title="Export for Design Space" icon={c => <DownloadIcon color={c} size={16} />} onPress={() => setExporting(true)} />
          <T s="small" style={{ flex: 1 }}>One SVG per mat, sized in inches.</T>
        </View>
        {exporting ? <ExportSheet r={r} cp={res.cp} onClose={() => setExporting(false)} what={what} /> : null}
      </Card>
    </Section>
  );
}

/** One step: tick, name and time, and a timer button */
export function StepRow({ r, s, first, onOpen, onCut }: { r: Run; s: Step; first?: boolean; onOpen: () => void; onCut: () => void }) {
  const ctxMenu = useStepMenu(r, s, onOpen, onCut);
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  const live = !!m && m.step === s.id;
  useNow(live);
  const [hover, setHover] = useState(false);
  const isCut = /cut day/i.test(s.name) && !r.cut;
  const tick = () => (!s.done && isCut ? onCut() : tickStep(r.id, s.id));
  const timer = () => {
    if (live) {
      const res = stopTimer();
      if (res) showSnack(`Recorded ${mins(res.mins)} for ${res.step}`);
    } else startTimer(r.id, s.id);
  };
  const sub = live ? `${m!.paused ? 'Paused' : 'You’re timing'} · ${clock(timerMs(m))}` : s.note ? s.note : '';
  return (
    <View
      {...ctxMenu}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderTopWidth: first ? 0 : 1, borderTopColor: t.line, backgroundColor: hover ? t.bg : 'transparent' }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: s.done }}
        accessibilityLabel={`${s.done ? 'Untick' : 'Tick'} ${s.name}`}
        onPress={tick}
        hitSlop={8}
        style={{ width: 26, height: 26, borderRadius: 13, borderWidth: s.done ? 0 : 2, borderColor: live ? t.success : t.line2, backgroundColor: s.done ? t.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {s.done ? <CheckIcon color={t.dark ? t.bg : '#fff'} size={16} sw={2.4} /> : null}
      </Pressable>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${s.name}, ${s.done ? 'done' : 'not done'}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontWeight: '600', textDecorationLine: s.done ? 'line-through' : 'none' }} color={s.done ? t.text3 : t.text}>{s.name}</T>
          {sub ? <T s="small" color={live ? (m!.paused ? t.warn : t.success) : t.text3} numberOfLines={1}>{sub}</T> : null}
        </View>
        <T s="sub" style={{ fontVariant: ['tabular-nums'] }}>{s.done && s.actual ? mins(s.actual) : s.done ? 'Not timed' : '~' + mins(s.est)}</T>
      </Pressable>
      {!s.done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${live ? 'Stop' : 'Start'} timer for ${s.name}`}
          onPress={timer}
          style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: live ? t.action : t.sunken }}>
          {live ? <StopIcon color={t.onAction} size={13} /> : <PlayIcon color={t.text} size={14} />}
        </Pressable>
      ) : (
        <View style={{ width: 34 }} />
      )}
    </View>
  );
}

function useStepMenu(r: Run, s: Step, onOpen: () => void, onCut: () => void) {
  const shop = useShop();
  const live = !!shop.timer && shop.timer.step === s.id;
  const isCut = /cut day/i.test(s.name) && !r.cut;
  return useContextMenu([
    { label: s.done ? 'Untick' : isCut ? 'Record the cut' : 'Mark done', onPress: () => (!s.done && isCut ? onCut() : tickStep(r.id, s.id)) },
    !s.done ? (live ? { label: 'Stop timer', onPress: () => { const res = stopTimer(); if (res) showSnack(`Recorded ${mins(res.mins)} for ${res.step}`); } } : { label: 'Start timer', onPress: () => startTimer(r.id, s.id) }) : null,
    { label: 'Edit step…', onPress: onOpen },
    { label: 'Move up', onPress: () => moveStep(r.id, s.id, -1) },
    { label: 'Move down', onPress: () => moveStep(r.id, s.id, 1) },
    { label: 'Remove step', danger: true, onPress: () => { const i = r.steps.indexOf(s); removeStep(r.id, s.id); showSnack(`“${s.name}” removed`, () => restoreStep(r.id, s, i)); } },
  ]);
}

/** The running timer, for the sidebar: step, run, clock, pause and stop */
export function TimerCard({ onOpen }: { onOpen: (runId: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  useNow(!!m && !m.paused);
  if (!m) return null;
  const r = shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m.step);
  if (!r || !s) return null;
  return (
    <View style={{ backgroundColor: t.tint2, borderRadius: 14, padding: 12, gap: 8, marginBottom: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open the run for ${s.name}`} onPress={() => onOpen(r.id)} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.paused ? t.warn : t.success }} />
          <T s="small" style={{ fontWeight: '600' }} color={m.paused ? t.warn : t.success}>{m.paused ? 'Paused' : 'Timing'}</T>
        </View>
        <T style={{ fontWeight: '700' }} numberOfLines={1}>{s.name}</T>
        <T s="small" numberOfLines={1}>{shortName(r)}</T>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T style={{ flex: 1, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={m.paused ? 'Resume timer' : 'Pause timer'} onPress={pauseTimer} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}>
          {m.paused ? <PlayIcon color={t.text} size={13} /> : <PauseIcon color={t.text} size={13} />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop and record the time"
          onPress={() => {
            const res = stopTimer();
            if (res) showSnack(`Recorded ${mins(res.mins)} for ${res.step}`);
          }}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.action, alignItems: 'center', justifyContent: 'center' }}>
          <StopIcon color={t.onAction} size={12} />
        </Pressable>
      </View>
    </View>
  );
}

export function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 150, backgroundColor: t.surface, borderRadius: R.card, padding: 14, gap: 4 }}>
      <T s="label">{label}</T>
      <T style={{ fontSize: F.f22, fontWeight: '700', fontVariant: ['tabular-nums'] }} color={color}>{value}</T>
      {sub ? <T s="small" color={color && color !== t.text ? undefined : undefined}>{sub}</T> : null}
    </View>
  );
}

export { yd };

/** Export for Design Space: mats grouped by fabric, save one or all. */
function ExportSheet({ r, cp, onClose, what }: { r: Run; cp: any; onClose: () => void; what: (m: any) => string }) {
  const shop = useShop();
  const t = useTheme();
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const vm = MATS.find(m => m.id === shop.cfg.cut.mat) || MATS[1];
  const body = shop.fabrics.find(f => f.id === r.body) || null;
  const ties = shop.fabrics.find(f => f.id === r.ties) || null;
  const fabOf = (m: any) => (m.fab === 'strap' ? ties || body : body);
  const groups: { f: any; name: string; mats: number[] }[] = [];
  cp.mats.forEach((m: any, i: number) => {
    const f = fabOf(m);
    const name = f ? f.name : m.fab === 'strap' ? 'Strap fabric' : 'Body fabric';
    let g = groups.find(x => x.name === name);
    if (!g) groups.push((g = { f, name, mats: [] }));
    g.mats.push(i);
  });
  const files = cutFiles(shop, r, cp);
  const save = async (which: number | 'all') => {
    setBusy(which);
    try {
      let last = '';
      for (const [i, f] of files.entries()) if (which === 'all' || which === i) last = await saveCutFile(shortName(r), f.name, f.svg);
      setSaved(last);
      showSnack(which === 'all' ? `${plural(files.length, 'cut file')} saved` : `Mat ${(which as number) + 1} saved`);
    } catch (e) {
      showSnack('Couldn’t save the cut files. Check there’s space on the drive.');
    }
    setBusy(null);
  };
  return (
    <Sheet title="Export for Design Space" sub={`${shortName(r)} · ${plural(cp.mats.length, 'mat')} · ${vm.name}`} onClose={onClose} width={600}
      footer={<><Button kind="ghost" title="Close" onPress={onClose} /><Button title={busy === 'all' ? 'Saving…' : onDevice ? `Save all ${cp.mats.length}` : `Download all ${cp.mats.length}`} icon={c => <DownloadIcon color={c} size={16} />} onPress={() => save('all')} disabled={busy != null} /></>}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 16 }}>
        {groups.map(g => (
          <View key={g.name} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Swatch color={g.f ? g.f.color : t.sunken} size={28} />
              <T style={{ fontWeight: '700', flex: 1 }}>{g.name}</T>
              <T s="sub">{plural(g.mats.length, 'mat')}</T>
            </View>
            <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
              {g.mats.map((i, k) => (
                <Row key={i} first={k === 0}>
                  <MatView mat={cp.mats[i]} cp={cp} matSize={vm} width={44} bodyColor={body ? body.color : t.barA} strapColor={ties ? ties.color : t.barG} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>Mat {i + 1}</T>
                    <T s="sub">{what(cp.mats[i])} · {pct(matWaste(cp.mats[i]))} waste</T>
                  </View>
                  <Button small kind="secondary" title={busy === i ? 'Saving…' : 'Save'} onPress={() => save(i)} disabled={busy != null} />
                </Row>
              ))}
            </View>
          </View>
        ))}
        <T s="small">Load each mat with the fabric it names. In Design Space, upload a file and check its size matches the mat ({vm.mw} × {vm.ml}″). Every piece is drawn at its real size.</T>
      </ScrollView>
      {saved && onDevice ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FolderIcon color={t.text2} size={20} />
          <T s="sub" style={{ flex: 1 }}>Saved in Documents › Bandana Planner › {shortName(r)}</T>
          <Button small kind="secondary" title="Show in folder" onPress={() => revealFile(saved)} />
        </View>
      ) : null}
    </Sheet>
  );
}
