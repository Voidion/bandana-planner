import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { fmtDate, inch, pct, plural, yd } from '../lib/format';
import { computePlan, cutFiles, MATS, matWaste, planCount, sizeReady } from '../lib/plan';
import { revealFile, saveCutFile, onDevice } from '../state/storage';
import { addPlan, deletePlan, editPlan, markCut, restorePlan, setUsed, undoCut, useShop } from '../state/store';
import type { CutPlan, Fabric } from '../state/types';
import { ChevIcon, DownloadIcon, FolderIcon, PlusIcon, ScissorsIcon, TrashIcon, WarnIcon } from '../ui/icons';
import { Button, Card, Chip, Empty, Field, NumField, Row, Section, Sheet, showSnack, Stepper, Swatch, T } from '../ui/kit';
import { MatView } from '../ui/MatView';
import { R, useTheme } from '../ui/theme';

export function CutPlansScreen({ sel, setSel, goSetup }: { sel: string | null; setSel: (id: string | null) => void; goSetup: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const planning = shop.plans.filter(p => p.status === 'planning');
  const done = shop.plans.filter(p => p.status === 'cut');
  const cur = shop.plans.find(p => p.id === sel) || planning[0] || done[0] || null;
  const start = () => setSel(addPlan());
  const row = (p: CutPlan, i: number) => {
    const body = shop.fabrics.find(f => f.id === p.body);
    return (
      <Row key={p.id} first={i === 0} selected={cur?.id === p.id} onPress={() => setSel(p.id)}>
        <Swatch color={body ? body.color : t.sunken} />
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontWeight: '600' }} numberOfLines={1}>{p.name || 'Untitled plan'}</T>
          <T s="sub" numberOfLines={1}>{plural(planCount(p), 'bandana')}{body ? ' · ' + body.name : ''}</T>
        </View>
        {p.status === 'cut' ? <T s="small">{fmtDate(p.cutAt)}</T> : null}
      </Row>
    );
  };
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: 340, borderRightWidth: 1, borderRightColor: t.line }}>
        <View style={{ padding: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T s="title">Cut plans</T>
          <Button small title="New plan" icon={c => <PlusIcon color={c} size={16} />} onPress={start} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 4, gap: 18 }}>
          {!shop.plans.length ? (
            <Empty icon={<ScissorsIcon color={t.action} size={26} />} title="Plan your first cut" body="Pick how many of each size and the fabric. The app lays every piece out on Cricut mats, tells you how much fabric it takes, and saves the cut files for Design Space." action={<Button title="New plan" onPress={start} />} />
          ) : null}
          {planning.length ? <Section title="Planning"><Card pad={false} style={{ overflow: 'hidden' }}>{planning.map(row)}</Card></Section> : null}
          {done.length ? <Section title="Cut"><Card pad={false} style={{ overflow: 'hidden' }}>{done.map(row)}</Card></Section> : null}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>{cur ? <PlanEditor key={cur.id} p={cur} goSetup={goSetup} onDeleted={() => setSel(null)} /> : null}</View>
    </View>
  );
}

function PlanEditor({ p, goSetup, onDeleted }: { p: CutPlan; goSetup: () => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [matsW, setMatsW] = useState(600);
  const [pick, setPick] = useState<null | 'body' | 'ties'>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const res = useMemo(() => computePlan(shop, p), [shop, p]);
  const cut = p.status === 'cut';
  const body = shop.fabrics.find(f => f.id === p.body) || null;
  const ties = shop.fabrics.find(f => f.id === p.ties) || null;
  const vm = MATS.find(m => m.id === shop.cfg.cut.mat) || MATS[1];
  const sizes = Object.entries(shop.sizes);
  const anyReady = sizes.some(([k]) => sizeReady(shop, k));
  const cols = Math.max(2, Math.min(5, Math.floor((matsW + 16) / (170 + 16))));
  const matW = Math.floor((matsW - (cols - 1) * 16) / cols);
  const set = (patch: Partial<CutPlan>) => editPlan(p.id, patch);

  const remove = () => {
    const i = shop.plans.findIndex(x => x.id === p.id);
    deletePlan(p.id);
    onDeleted();
    showSnack(`${p.name || 'Plan'} deleted`, () => restorePlan(p, i));
  };
  const doCut = () => {
    if (!res || !res.cp) return;
    const uses = res.needs.filter(n => n.f).map(n => ({ f: n.f!.id, yards: n.yards }));
    markCut(p.id, uses);
    showSnack(`Marked cut · ${uses.map(u => yd(u.yards)).join(' and ')} taken off the shelf`, () => undoCut(p.id));
  };
  const save = async () => {
    if (!res || !res.cp) return;
    setSaving(true);
    try {
      const files = cutFiles(shop, p, res.cp);
      let last = '';
      for (const f of files) last = await saveCutFile(p.name || 'Cut plan', f.name, f.svg);
      setSaved(last);
      showSnack(`${plural(files.length, 'cut file')} saved`);
    } catch (e) {
      showSnack('Couldn’t save the cut files. Check there’s space on the drive.');
    }
    setSaving(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
        <View style={{ flex: 1, maxWidth: 520 }}>
          <Field label="Plan name" value={p.name} onChange={v => set({ name: v })} placeholder="Fall restock" />
        </View>
        {cut ? <Chip label={'Cut ' + fmtDate(p.cutAt)} tone="ok" /> : null}
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
                    {ready ? <T s="sub">{inch(z.cw)} × {inch(z.cl)}</T> : (
                      <Pressable accessibilityRole="link" onPress={goSetup}><T s="sub" color={t.action}>Add its cut size</T></Pressable>
                    )}
                  </View>
                  {cut ? <T style={{ fontWeight: '600' }}>{p.qty[k] || 0}</T> : ready ? <Stepper label={z.name} value={p.qty[k] || 0} onChange={n => set({ qty: { ...p.qty, [k]: n } })} /> : null}
                </Row>
              );
            })}
          </Card>
        </Section>

        <Section title="Fabric" style={{ flex: 1, minWidth: 300, maxWidth: 460 }}>
          <Card pad={false} style={{ overflow: 'hidden' }}>
            <FabricRow first label="Bandanas" f={body} need={res?.needs.find(n => n.role !== 'Straps')} onPress={cut ? undefined : () => setPick('body')} />
            <FabricRow label="Straps" f={ties} same={!!body && body === ties} need={res?.needs.find(n => n.role === 'Straps')} onPress={cut ? undefined : () => setPick('ties')} />
          </Card>
          {res && res.needs.some(n => n.short > 0) && !cut ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: t.warnTint, borderRadius: R.card, padding: 12 }}>
              <WarnIcon color={t.dark ? t.onWarn : t.warn} size={18} />
              <T s="sub" color={t.dark ? t.onWarn : t.onWarn} style={{ flex: 1 }}>{res.needs.filter(n => n.short > 0).map(n => `${yd(n.short)} short of ${n.f!.name}`).join(' · ')}</T>
            </View>
          ) : null}
          {cut ? (
            <Card style={{ gap: 12 }}>
              <T style={{ fontWeight: '700' }}>Fabric taken off the shelf</T>
              {p.fabUse.map(u => (
                <View key={u.f} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <T>{u.name}</T>
                    <T s="sub">Planned {yd(u.plan)}</T>
                  </View>
                  <NumField label="Really used" value={u.used} onChange={n => setUsed(p.id, u.f, n ?? 0)} suffix="yd" width={120} />
                </View>
              ))}
              <T s="small">Changing what you used corrects the shelf. Over a few cuts the app learns how much you really use.</T>
            </Card>
          ) : null}
        </Section>
      </View>

      {res && res.missingSizes.length ? <T s="sub">{res.missingSizes.map(k => shop.sizes[k]?.name).join(', ')} can’t be planned until {res.missingSizes.length === 1 ? 'it has' : 'they have'} a cut size.</T> : null}

      {res && res.cp ? (
        <Section title="On the mats" right={<T s="sub">{plural(res.cp.mats.length, 'mat')} · {vm.name} · {pct(res.cp.waste)} waste</T>}>
          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', backgroundColor: t.sunken, borderRadius: 14, paddingVertical: 10 }}>
              {[
                [String(res.count), 'bandanas'],
                [String(res.cp.mats.length), res.cp.mats.length === 1 ? 'mat' : 'mats'],
                [yd(res.needs.reduce((a, n) => a + n.yards, 0)), 'of fabric'],
                [pct(res.cp.waste), 'waste'],
              ].map(([a, b], i) => (
                <View key={b} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: t.line2 }}>
                  <T style={{ fontWeight: '700', fontSize: 17 }}>{a}</T>
                  <T s="small">{b}</T>
                </View>
              ))}
            </View>
            {res.tooBig ? <T s="sub" color={t.danger}>{plural(res.tooBig, 'piece')} too big for the mat. Check the cut sizes or the strip width in Sizes & mats.</T> : null}
            <View onLayout={e => setMatsW(Math.max(300, e.nativeEvent.layout.width))} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {res.cp.mats.map((m: any, i: number) => (
                <View key={i} style={{ gap: 6 }}>
                  <MatView mat={m} cp={res.cp} matSize={vm} width={matW} bodyColor={body ? body.color : t.barA} strapColor={ties ? ties.color : t.barG} />
                  <T s="small" style={{ fontWeight: '600' }}>Mat {i + 1} · {m.fab === 'strap' ? plural(m.straps, 'strap') : plural(m.bandanas, 'bandana')}</T>
                  <T s="small" color={matWaste(m) > 0.3 ? t.warn : t.text3}>{pct(matWaste(m))} waste</T>
                </View>
              ))}
            </View>
          </Card>
        </Section>
      ) : res && !res.count && anyReady ? (
        <T s="sub">Add bandanas above to see them laid out on the mats.</T>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {res && res.cp ? <Button kind={cut ? 'primary' : 'secondary'} title={saving ? 'Saving…' : onDevice ? 'Save cut files' : 'Download cut files'} icon={c => saving ? <ActivityIndicator size="small" color={c} /> : <DownloadIcon color={c} size={16} />} onPress={save} disabled={saving} /> : null}
        {res && res.cp && !cut ? <Button title="Mark as cut" icon={c => <ScissorsIcon color={c} size={16} />} onPress={doCut} disabled={!body} /> : null}
        {cut ? <Button kind="secondary" title="Undo cut" onPress={() => { undoCut(p.id); showSnack('Fabric put back on the shelf'); }} /> : null}
        <View style={{ flex: 1 }} />
        <Button kind="danger" small title="Delete plan" icon={c => <TrashIcon color={c} size={14} />} onPress={remove} />
      </View>
      {saved && onDevice ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FolderIcon color={t.text2} size={20} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '600' }}>Saved in Documents › Bandana Planner</T>
            <T s="sub">One file per mat. In Design Space, upload each one and set the size to match the mat.</T>
          </View>
          <Button small kind="secondary" title="Show in folder" onPress={() => revealFile(saved)} />
        </Card>
      ) : null}
      {pick ? <FabricPicker title={pick === 'body' ? 'Fabric for the bandanas' : 'Fabric for the straps'} value={pick === 'body' ? p.body : p.ties} onPick={id => { set(pick === 'body' ? { body: id, ...(p.ties === p.body || !p.ties ? { ties: id } : {}) } : { ties: id }); setPick(null); }} onClose={() => setPick(null)} /> : null}
    </ScrollView>
  );
}

function FabricRow({ label, f, need, onPress, first, same }: { label: string; f: Fabric | null; need?: { yards: number; short: number }; onPress?: () => void; first?: boolean; same?: boolean }) {
  const t = useTheme();
  return (
    <Row first={first} onPress={onPress}>
      <Swatch color={f ? f.color : t.sunken} />
      <View style={{ flex: 1, gap: 2 }}>
        <T s="label">{label}</T>
        <T style={{ fontWeight: '600' }} color={f ? t.text : t.action}>{f ? f.name : 'Choose fabric'}</T>
        {f ? <T s="sub">{same && !need ? 'Counted with the bandanas' : `${yd(f.yards)} on the shelf`}</T> : null}
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

function FabricPicker({ title, value, onPick, onClose }: { title: string; value: string | null; onPick: (id: string) => void; onClose: () => void }) {
  const shop = useShop();
  const t = useTheme();
  return (
    <Sheet title={title} onClose={onClose}>
      {shop.fabrics.length ? (
        <ScrollView style={{ maxHeight: 460 }}>
          <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
            {[...shop.fabrics].sort((a, b) => a.name.localeCompare(b.name)).map((f, i) => (
              <Row key={f.id} first={i === 0} selected={f.id === value} onPress={() => onPick(f.id)}>
                <Swatch color={f.color} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '600' }}>{f.name}</T>
                  <T s="sub">{yd(f.yards)} on the shelf{f.grain === 'directional' ? ' · directional' : ''}</T>
                </View>
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
