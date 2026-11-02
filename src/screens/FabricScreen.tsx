import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { money, perYd, plural, yd } from '../lib/format';
import { planCount } from '../lib/plan';
import { SWATCHES } from '../state/defaults';
import { addFabric, deleteFabric, editFabric, restoreFabric, useShop } from '../state/store';
import { addOffcut, arrived, cancelOrder, forecast, markOrdered, weeklyUse } from '../state/shelf';
import { SupplierSelect } from './ShelfScreens';
import { PhotoStrip } from './PhotosScreen';
import type { Fabric, PrintTop } from '../state/types';
import { FabricIcon, PlusIcon, SearchIcon, TrashIcon, WarnIcon } from '../ui/icons';
import { Bar, Button, Card, Chip, Empty, Field, NumField, Row, Section, Segmented, Sheet, showSnack, Swatch, T, TwoPane } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';

const isLow = (f: Fabric) => f.low > 0 && f.yards <= f.low;

export function FabricScreen({ onPlanWith, openRun, sel, setSel }: { onPlanWith: (fabricId: string) => void; openRun: (id: string) => void; sel: string | null; setSel: (id: string | null) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const list = useMemo(
    () => shop.fabrics.filter(f => !q.trim() || (f.name + ' ' + (shop.suppliers.find(x => x.id === f.sup)?.name || '') + ' ' + (f.from || '')).toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)),
    [shop.fabrics, q],
  );
  const cur = shop.fabrics.find(f => f.id === sel) || list[0] || null;
  const total = shop.fabrics.reduce((a, f) => a + Math.max(0, f.yards), 0);
  const value = shop.fabrics.reduce((a, f) => a + Math.max(0, f.yards) * f.cost, 0);
  const low = shop.fabrics.filter(isLow);

  return (
    <View style={{ flex: 1 }}>
      <TwoPane sel={sel} listWidth={380} list={
      <View style={{ flex: 1 }}>
        <View style={{ padding: 24, paddingBottom: 12, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T s="title">Fabric</T>
            <Button small title="Add fabric" icon={c => <PlusIcon color={c} size={16} />} onPress={() => setAdding(true)} />
          </View>
          {shop.fabrics.length ? (
            <View style={{ flexDirection: 'row', backgroundColor: t.sunken, borderRadius: 14, paddingVertical: 10 }}>
              {[
                [String(shop.fabrics.length), shop.fabrics.length === 1 ? 'bolt' : 'bolts'],
                [yd(total), 'on the shelf'],
                [money(value).replace(/\.\d\d$/, ''), 'value'],
              ].map(([a, b], i) => (
                <View key={b} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: t.line2 }}>
                  <T style={{ fontWeight: '700', fontSize: 17 }}>{a}</T>
                  <T s="small">{b}</T>
                </View>
              ))}
            </View>
          ) : null}
          {low.length ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: t.warnTint, borderRadius: R.card, padding: 12 }}>
              <WarnIcon color={t.dark ? t.onWarn : t.warn} size={18} />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '700' }} color={t.dark ? t.onWarn : t.onWarn}>{low.length === 1 ? `${low[0].name} is low` : `${low.length} fabrics are low`}</T>
                <T s="sub" color={t.dark ? t.onWarn : t.text2} numberOfLines={2}>{low.length === 1 ? `${yd(low[0].yards)} left` : low.map(f => f.name).join(' · ')}</T>
              </View>
            </View>
          ) : null}
          {shop.fabrics.length > 5 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surface, borderRadius: R.control, borderWidth: 1, borderColor: t.line2, paddingHorizontal: 10 }}>
              <SearchIcon color={t.text3} size={16} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search fabric" placeholderTextColor={t.text3} accessibilityLabel="Search fabric" style={{ flex: 1, minHeight: 36, color: t.text, fontSize: F.f15 }} />
            </View>
          ) : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 12 }}>
          {shop.fabrics.length === 0 ? (
            <Empty icon={<FabricIcon color={t.action} size={26} />} title="Add your first fabric" body="Track the yards on the shelf and what you paid. Runs take fabric off the shelf when you cut, and warn you when a bolt runs low." action={<Button title="Add fabric" onPress={() => setAdding(true)} />} />
          ) : list.length === 0 ? (
            <T s="sub">No fabric matches “{q}”.</T>
          ) : (
            <>
              {[['Bolts', list.filter(f => !f.offcut)], ['Offcuts', list.filter(f => f.offcut)]].map(([title, items]: any) =>
                items.length ? (
                  <Section key={title} title={`${title} · ${items.length}`}>
                    <Card pad={false} style={{ overflow: 'hidden' }}>
                      {items.map((f: Fabric, i: number) => (
                        <Row key={f.id} first={i === 0} selected={cur?.id === f.id} onPress={() => setSel(f.id)}
                          menu={[
                            { label: 'Open', onPress: () => setSel(f.id) },
                            { label: 'Plan a run with it', onPress: () => onPlanWith(f.id) },
                            !f.offcut && !f.onOrder ? { label: `Mark ${shop.cfg.newBolt.yards} yd ordered`, onPress: () => { markOrdered('fabric', f.id, shop.cfg.newBolt.yards); showSnack(`${shop.cfg.newBolt.yards} yd of ${f.name} on order`); } } : null,
                            f.onOrder ? { label: 'It arrived', onPress: () => arrived('fabric', f.id) } : null,
                            { label: 'Delete fabric', danger: true, onPress: () => { const i2 = shop.fabrics.findIndex(x => x.id === f.id); deleteFabric(f.id); showSnack(`${f.name} deleted`, () => restoreFabric(f, i2)); } },
                          ]}>
                          <Swatch color={f.color} />
                          <View style={{ flex: 1, gap: 2 }}>
                            <T style={{ fontWeight: '600' }} numberOfLines={1}>{f.name}</T>
                            <T s="sub" numberOfLines={1}>{f.offcut ? `From ${f.from || 'an earlier cut'}` : perYd(f.cost)}{f.grain === 'directional' ? ' · directional' : ''}</T>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 3 }}>
                            <T style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }} color={f.yards < 0 ? t.danger : isLow(f) ? t.warn : t.text}>{yd(f.yards)}</T>
                            {isLow(f) ? <Chip label={f.yards < 0 ? 'Below zero' : 'Low'} tone="warn" /> : f.onOrder ? <Chip label="On order" tone="tint" /> : null}
                          </View>
                        </Row>
                      ))}
                    </Card>
                  </Section>
                ) : null,
              )}
            </>
          )}
        </ScrollView>
      </View>
      } detail={cur ? <FabricDetail key={cur.id} f={cur} onPlanWith={onPlanWith} openRun={openRun} /> : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <T s="sub">Fabric you add shows here.</T>
          </View>
        )} />
      {adding ? <NewFabricSheet onClose={() => setAdding(false)} onAdded={id => { setSel(id); setAdding(false); }} /> : null}
    </View>
  );
}

function FabricDetail({ f, onPlanWith, openRun }: { f: Fabric; onPlanWith: (id: string) => void; openRun: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const uses = shop.runs.filter(p => p.fabUse.some(u => u.f === f.id) || (!p.cut && p.status !== 'done' && (p.body === f.id || p.ties === f.id)));
  const scale = Math.max(5, f.yards, f.low * 2.5);
  const [off, setOff] = useState(false);
  const set = (patch: Partial<Fabric>) => editFabric(f.id, patch);
  const remove = () => {
    const i = shop.fabrics.findIndex(x => x.id === f.id);
    deleteFabric(f.id);
    showSnack(`${f.name} deleted`, () => restoreFabric(f, i));
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 820 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Swatch color={f.color} size={56} />
        <View style={{ flex: 1 }}>
          <T s="small">Fabric</T>
          <T s="h1" style={{ fontSize: 28 }}>{f.name}</T>
        </View>
        <Button kind="secondary" small title="Plan a run" onPress={() => onPlanWith(f.id)} />
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <T style={{ fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }} color={f.yards < 0 ? t.danger : t.text}>{(Math.round(f.yards * 100) / 100).toString()}</T>
            <T s="sub">yards on the shelf</T>
          </View>
          {isLow(f) ? <Chip label="Low" tone="warn" /> : null}
        </View>
        <Bar value={f.yards / scale} color={isLow(f) ? t.barA : t.barG} />
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <NumField label="What you measured" value={f.yards} onChange={n => set({ yards: n ?? 0 })} suffix="yd" min={-50} width={150} />
          <NumField label="Warn below" value={f.low} onChange={n => set({ low: n ?? 0 })} suffix="yd" width={130} />
          <NumField label="Cost per yard" value={f.cost} onChange={n => set({ cost: n ?? 0 })} prefix="$" width={130} />
          <View style={{ gap: 4 }}>
            <T s="label">Value on the shelf</T>
            <T style={{ fontWeight: '600', minHeight: 38, paddingTop: 8 }}>{money(Math.max(0, f.yards) * f.cost)}</T>
          </View>
        </View>
      </Card>

      {!f.offcut ? <OrderCard f={f} /> : null}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Button small kind="secondary" title="Keep an offcut" onPress={() => setOff(true)} />
        <T s="small" style={{ flex: 1 }}>A leftover piece becomes its own fabric you can pick for small runs.</T>
      </View>

      <Section title="Details">
        <Card style={{ gap: 16 }}>
          <Field label="Name" value={f.name} onChange={v => set({ name: v })} />
          <Segmented label="Print direction" value={f.grain} options={[['none', 'No direction'], ['directional', 'Has a right way up']]} onChange={v => set({ grain: v })} />
          {f.grain === 'directional' ? (
            <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
              <Segmented<PrintTop> label="Top of the print faces" value={f.top} options={[['up', 'Up'], ['down', 'Down'], ['left', 'Left'], ['right', 'Right']]} onChange={v => set({ top: v })} />
              <Segmented label="Reads" value={f.way} options={[['one', 'One way only'], ['two', 'Either way up']]} onChange={v => set({ way: v })} />
            </View>
          ) : null}
          <T s="small">Directional prints keep every bandana the right way up on the mat, which can use more fabric.</T>
          {!f.offcut ? <SupplierSelect label="Where you buy it" value={f.sup} onChange={v => set({ sup: v })} /> : <T s="sub">Left over from {f.from || 'an earlier cut'}. Offcuts can be picked for any run, and never show in Restock.</T>}
          <Field label="Notes" value={f.notes} onChange={v => set({ notes: v })} multiline placeholder="Fibre, weight, care…" />
          <View style={{ gap: 6 }}>
            <T s="label">Colour in lists</T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {SWATCHES.map(c => (
                <Pressable key={c} accessibilityRole="radio" accessibilityLabel={'Colour ' + c} accessibilityState={{ checked: f.color === c }} onPress={() => set({ color: c })}
                  style={{ padding: 2, borderRadius: 10, borderWidth: 2, borderColor: f.color === c ? t.action : 'transparent' }}>
                  <Swatch color={c} size={24} />
                </Pressable>
              ))}
            </View>
          </View>
        </Card>
      </Section>

      <PhotoStrip link={{ fabric: f.id }} />

      <Section title="Runs">
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {uses.length ? uses.map((p, i) => (
            <Row key={p.id} first={i === 0} onPress={() => openRun(p.id)}>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '600' }}>{(p.name || 'Untitled run').split(' — ')[0]}</T>
                <T s="sub">{plural(planCount(p), 'bandana')} · {p.status === 'done' ? 'finished' : p.cut ? 'cut' : p.status === 'active' ? 'in progress, not cut' : 'draft'}</T>
              </View>
              {p.cut ? <T s="sub">−{yd(p.fabUse.filter(u => u.f === f.id).reduce((a, u) => a + u.used, 0))}</T> : null}
            </Row>
          )) : (
            <Row first><T s="sub">Not in any run yet.</T></Row>
          )}
        </Card>
      </Section>

      <Button kind="danger" title="Delete fabric" icon={c => <TrashIcon color={c} size={16} />} onPress={remove} style={{ alignSelf: 'flex-start' }} />
      {off ? <OffcutSheet f={f} onClose={() => setOff(false)} /> : null}
    </ScrollView>
  );
}

function NewFabricSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const shop = useShop();
  const [name, setName] = useState('');
  const [yards, setYards] = useState<number | null>(shop.cfg.newBolt.yards);
  const [cost, setCost] = useState<number | null>(null);
  const [low, setLow] = useState<number | null>(shop.cfg.newBolt.low);
  const [grain, setGrain] = useState<'none' | 'directional'>('none');
  const [err, setErr] = useState('');
  const add = () => {
    const miss = [!name.trim() && 'a name', !(yards && yards > 0) && 'what you measured'].filter(Boolean) as string[];
    if (miss.length) return setErr('Add ' + miss.join(' and '));
    const id = addFabric({ name: name.trim(), yards: yards || 0, cost: cost || 0, low: low ?? 0, grain });
    showSnack(`${name.trim()} is on the shelf`);
    onAdded(id);
  };
  return (
    <Sheet title="New fabric" sub="A bolt for your shelf" onClose={onClose}
      footer={<>
        {err ? <T s="sub" style={{ flex: 1, alignSelf: 'center' }}>{err}</T> : null}
        <Button kind="secondary" title="Cancel" onPress={onClose} />
        <Button title="Add to shelf" onPress={add} />
      </>}>
      <Field label="Name" value={name} onChange={v => { setName(v); setErr(''); }} placeholder="Rust gingham" autoFocus />
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <NumField label="What you measured" value={yards} onChange={setYards} suffix="yd" width={150} />
        <NumField label="Cost per yard" value={cost} onChange={setCost} prefix="$" width={130} placeholder="0.00" />
        <NumField label="Warn below" value={low} onChange={setLow} suffix="yd" width={120} />
      </View>
      <Segmented label="Print direction" value={grain} options={[['none', 'No direction'], ['directional', 'Has a right way up']]} onChange={setGrain} />
    </Sheet>
  );
}

function OrderCard({ f }: { f: Fabric }) {
  const shop = useShop();
  const t = useTheme();
  const [n, setN] = useState<number | null>(null);
  const fc = forecast(shop, f);
  const wk = weeklyUse(shop, f.id);
  const sp = shop.suppliers.find(x => x.id === f.sup);
  return (
    <Section title="Use and ordering">
      <Card style={{ gap: 12 }}>
        <T>{wk ? <><T style={{ fontWeight: '700' }}>{yd(wk)} a week</T> over the last 8 weeks{fc ? ` · ${fc.text.toLowerCase()}` : ''}.</> : 'Not cut from yet. Each cut logs its yards here, and the run-out forecast follows it.'}</T>
        {f.onOrder ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{yd(f.onOrder)}</T> on order{sp ? ` from ${sp.name}` : ''}</T>
            <Button small kind="ghost" title="Cancel order" onPress={() => cancelOrder('fabric', f.id)} />
            <Button small title="It arrived" onPress={() => { arrived('fabric', f.id); showSnack(`${f.name}: +${yd(f.onOrder)} on the shelf`); }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <NumField label="Order" value={n} onChange={setN} suffix="yd" width={130} placeholder={String(shop.cfg.newBolt.yards)} />
            <Button small kind="secondary" title="Mark ordered" onPress={() => { const v = n || shop.cfg.newBolt.yards; markOrdered('fabric', f.id, v); setN(null); showSnack(`${yd(v)} of ${f.name} on order`); }} />
            <T s="small" style={{ flex: 1 }}>{sp ? `${sp.name} usually takes ${f.lead ?? sp.lead} days.` : 'Pick where you buy it to see how long orders take.'}</T>
          </View>
        )}
      </Card>
    </Section>
  );
}

function OffcutSheet({ f, onClose }: { f: Fabric; onClose: () => void }) {
  const [n, setN] = useState<number | null>(null);
  const [from, setFrom] = useState<'shelf' | 'extra'>('shelf');
  const go = () => {
    if (!(n && n > 0)) return;
    addOffcut(f.id, n, from === 'shelf');
    showSnack(`Kept ${yd(n)} as an offcut`);
    onClose();
  };
  return (
    <Sheet title="Keep an offcut" sub={f.name} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Keep it" onPress={go} disabled={!(n && n > 0)} /></>}>
      <NumField label="How much" value={n} onChange={setN} suffix="yd" width={140} placeholder="0.5" />
      <Segmented label="Where it comes from" value={from} options={[['shelf', 'Cut from this bolt'], ['extra', 'Left over from a cut']]} onChange={setFrom} />
      <T s="small">{from === 'shelf' ? `Moves the yards from ${f.name} to the offcut.` : 'A cut already took its yards off the shelf, so this adds the leftover piece without changing the bolt.'}</T>
    </Sheet>
  );
}
