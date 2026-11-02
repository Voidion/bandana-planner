/* Setup on first open: a few steps that give the planner what it needs (shop name, sizes and prices, the Cricut mat
   and bolt, free hours, a first fabric). Every step can be skipped and everything changes later in Settings. */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { inch } from '../lib/format';
import { MATS } from '../lib/plan';
import { addFabric, change, useShop } from '../state/store';
import { loadExample, removeExample } from '../state/example';
import type { Size } from '../state/types';
import { CheckIcon } from '../ui/icons';
import { Button, NumField } from '../ui/kit';
import { Note } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';
import { Hours } from './SettingsScreen';

const USUAL: Record<string, Partial<Size>> = { S: { cw: 10, cl: 7, price: 15, mins: 27 }, M: { cw: 11, cl: 8, price: 18, mins: 33 }, L: { cw: 14, cl: 9, price: 22, mins: 41 } };
const SWATCH = ['#C0643A', '#D98A3D', '#E6C35C', '#6E8B4E', '#3F7A8C', '#5B5EA6', '#9C4F7A', '#3A3A3A', '#B9A48A', '#E8E2D6'];
const STEPS = ['Welcome', 'Sizes and prices', 'Cricut and fabric', 'Free hours', 'First fabric', 'Done'];

export function SetupWizard({ onDone, onTour }: { onDone: () => void; onTour: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [i, setI] = useState(0);
  const [fab, setFab] = useState({ name: '', yards: 3 as number | null, cost: 8 as number | null, color: SWATCH[0] });
  const [added, setAdded] = useState<string | null>(null);
  const setSize = (k: string, p: Partial<Size>) => change(s => ({ ...s, sizes: { ...s.sizes, [k]: { ...s.sizes[k], ...p } } }));
  const c = shop.cfg.cut;
  const finish = (tour: boolean) => {
    change(s => ({ ...s, setupDone: true }));
    (tour ? onTour : onDone)();
  };
  const ready = Object.values(shop.sizes).filter(z => z.cw && z.cl && z.price != null).length;
  const label = (s: string) => <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text2 }}>{s}</Text>;

  const body = [
    /* 0 welcome */
    <View key="w" style={{ gap: 16 }}>
      <Text style={{ fontSize: F.f16, lineHeight: 24, color: t.text2 }}>Bandana Planner plans your batches, lays the pieces out on Cricut mats, keeps track of fabric, orders, quotes and sales, and learns how long things really take you. A few questions first, so its numbers are yours. About three minutes; you can change any of it later in Settings.</Text>
      <View style={{ gap: 6 }}>
        {label('What’s your shop called?')}
        <TextInput accessibilityLabel="Shop name" value={shop.shopName === 'My shop' ? '' : shop.shopName} onChangeText={v => change(s => ({ ...s, shopName: v || 'My shop' }))} placeholder="My shop" placeholderTextColor={t.text3} autoFocus
          style={{ fontSize: F.f18, color: t.text, borderWidth: 1, borderColor: t.line2, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, backgroundColor: t.surface }} />
        <Note style={{ paddingHorizontal: 0 }}>It goes at the top of every quote you send.</Note>
      </View>
    </View>,
    /* 1 sizes */
    <View key="s" style={{ gap: 14 }}>
      <Text style={{ fontSize: F.f15, lineHeight: 22, color: t.text2 }}>The planner needs each size’s cut size to lay pieces out, and a price to work out profit. The wide edge is the neck side of the triangle; the tip length runs from that edge to the point. Include seam allowance. Leave a size blank if you don’t make it.</Text>
      <View style={{ backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: t.bg }}>
          <Text style={{ flex: 1, fontSize: F.f13, fontWeight: '600', color: t.text3 }}>Size</Text>
          {['Wide edge', 'Tip length', 'Price'].map(h => <Text key={h} style={{ width: 110, fontSize: F.f13, fontWeight: '600', color: t.text3 }}>{h}</Text>)}
        </View>
        {Object.entries(shop.sizes).map(([k, z]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 6, borderTopWidth: 1, borderTopColor: t.line }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text }}>{z.name}</Text>
              {z.cw && z.cl && z.price != null ? <CheckIcon color={t.success} size={16} /> : null}
            </View>
            <NumField bare label={`${z.name} wide edge`} value={z.cw} onChange={n => setSize(k, { cw: n })} suffix="in" width={110} placeholder={USUAL[k] ? String(USUAL[k].cw) : '–'} />
            <NumField bare label={`${z.name} tip length`} value={z.cl} onChange={n => setSize(k, { cl: n })} suffix="in" width={110} placeholder={USUAL[k] ? String(USUAL[k].cl) : '–'} />
            <NumField bare label={`${z.name} price`} value={z.price} onChange={n => setSize(k, { price: n })} prefix="$" width={110} placeholder={USUAL[k] ? String(USUAL[k].price) : '–'} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button small kind="secondary" title="Fill in the usual Small, Medium and Large" onPress={() => Object.entries(USUAL).forEach(([k, v]) => shop.sizes[k] && setSize(k, Object.fromEntries(Object.entries(v).filter(([f]) => (shop.sizes[k] as any)[f] == null))))} />
        <Text style={{ fontSize: F.f14, color: ready ? t.success : t.text3 }}>{ready ? `${ready} size${ready === 1 ? '' : 's'} ready to plan` : 'No sizes ready yet'}</Text>
      </View>
      <Note style={{ paddingHorizontal: 0 }}>Straps, time each size takes and your own cut files are in Settings › Sizes & straps when you want them. Times also learn from the timer.</Note>
    </View>,
    /* 2 cricut */
    <View key="c" style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        {label('Which mat do you cut fabric on?')}
        {MATS.map(m => {
          const on = c.mat === m.id;
          return (
            <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => change(s => ({ ...s, cfg: { ...s.cfg, cut: { ...s.cfg.cut, mat: m.id, matLen: m.l, width: Math.min(s.cfg.cut.width, m.mw) } } }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 14, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? t.action : t.line2, backgroundColor: on ? t.tint2 : t.surface }}>
              <View style={{ width: 40, alignItems: 'center' }}><View style={{ width: m.mw * 1.2, height: m.ml * 1.2, borderRadius: 3, backgroundColor: on ? t.tint : t.sunken, borderWidth: 1, borderColor: on ? t.action : t.line2 }} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text }}>{m.name}</Text>
                <Text style={{ fontSize: F.f14, color: t.text3 }}>{m.sub} · cuts {inch(m.w)} × {inch(m.l)}</Text>
              </View>
              {on ? <CheckIcon color={t.action} size={20} /> : null}
            </Pressable>
          );
        })}
        <Note style={{ paddingHorizontal: 0 }}>The app plans for the Cricut Venture.</Note>
      </View>
      <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
        <NumField label="Your fabric is usually" value={c.bolt} onChange={n => change(s => ({ ...s, cfg: { ...s.cfg, cut: { ...s.cfg.cut, bolt: Math.min(120, Math.max(10, n || 44)) } } }))} suffix="in wide" width={170} hint="Selvage to selvage, off the bolt" />
        <NumField label="New fabric starts with" value={shop.cfg.newBolt.yards} onChange={n => change(s => ({ ...s, cfg: { ...s.cfg, newBolt: { ...s.cfg.newBolt, yards: n ?? 0 } } }))} suffix="yd" width={150} hint="What you usually buy" />
        <NumField label="Warn me below" value={shop.cfg.newBolt.low} onChange={n => change(s => ({ ...s, cfg: { ...s.cfg, newBolt: { ...s.cfg.newBolt, low: n ?? 0 } } }))} suffix="yd" width={150} hint="Low-fabric reminder" />
      </View>
      <Note style={{ paddingHorizontal: 0 }}>How wide a strip goes on each mat (and the one that wastes least) is in Settings › Cutting & mats.</Note>
    </View>,
    /* 3 hours */
    <View key="h" style={{ gap: 12 }}>
      <Text style={{ fontSize: F.f15, lineHeight: 22, color: t.text2 }}>How much time do you usually have for the shop each day? Runs are fitted into these hours, so the app can tell you when a batch will be done and whether an order fits before its due date.</Text>
      <Hours />
    </View>,
    /* 4 fabric */
    <View key="f" style={{ gap: 14 }}>
      <Text style={{ fontSize: F.f15, lineHeight: 22, color: t.text2 }}>Add one fabric you have on the shelf so you can plan a run straight away. Add the rest whenever you like from Fabric or New.</Text>
      {added ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.successTint, borderRadius: 14, padding: 14 }}>
          <CheckIcon color={t.onSuccess} size={20} />
          <Text style={{ flex: 1, fontSize: F.f15, color: t.onSuccess }}><Text style={{ fontWeight: '700' }}>{added}</Text> is on your shelf.</Text>
          <Button small kind="secondary" title="Add another" onPress={() => { setAdded(null); setFab({ name: '', yards: shop.cfg.newBolt.yards, cost: fab.cost, color: SWATCH[(SWATCH.indexOf(fab.color) + 1) % SWATCH.length] }); }} />
        </View>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            {label('Fabric name')}
            <TextInput accessibilityLabel="Fabric name" value={fab.name} onChangeText={v => setFab({ ...fab, name: v })} placeholder="Rust gingham" placeholderTextColor={t.text3}
              style={{ fontSize: F.f16, color: t.text, borderWidth: 1, borderColor: t.line2, borderRadius: 14, paddingHorizontal: 14, minHeight: 48, backgroundColor: t.surface }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
            <NumField label="Yards on the shelf" value={fab.yards} onChange={n => setFab({ ...fab, yards: n })} suffix="yd" width={150} />
            <NumField label="Cost a yard" value={fab.cost} onChange={n => setFab({ ...fab, cost: n })} prefix="$" width={140} />
          </View>
          <View style={{ gap: 6 }}>
            {label('Colour in lists')}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {SWATCH.map(col => (
                <Pressable key={col} accessibilityRole="radio" accessibilityLabel={col} accessibilityState={{ checked: fab.color === col }} onPress={() => setFab({ ...fab, color: col })}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: col, borderWidth: fab.color === col ? 3 : 1, borderColor: fab.color === col ? t.action : t.line2 }} />
              ))}
            </View>
          </View>
          <Button title="Put it on the shelf" style={{ alignSelf: 'flex-start' }} onPress={() => {
            const name = fab.name.trim() || 'My first fabric';
            addFabric({ name, yards: fab.yards ?? 0, cost: fab.cost ?? 0, color: fab.color, low: shop.cfg.newBolt.low });
            setAdded(name);
          }} />
        </>
      )}
    </View>,
    /* 5 done */
    <View key="d" style={{ gap: 16 }}>
      <Text style={{ fontSize: F.f16, lineHeight: 24, color: t.text2 }}>You’re set up{ready ? '' : ' (add sizes in Settings before planning a run)'}. Want a one-minute tour of where everything is? You can take it any time from Settings › Help & tour, or with F1.</Text>
      <View style={{ gap: 8 }}>
        {[
          ['Plan a batch', 'Runs › New run: pick sizes and fabric, see the mats and yards'],
          ['Time your work', 'Workflow: start the timer on a step, and the app learns your pace'],
          ['Sell', 'Orders, quotes as PDFs, payments, a market-day till'],
        ].map(([a, b]) => (
          <View key={a} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.line }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.action }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>{a}</Text>
              <Text style={{ fontSize: F.f14, color: t.text3 }}>{b}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: shop.example ? t.successTint : t.tint2, borderRadius: 16, padding: 16, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 240, gap: 2 }}>
          <Text style={{ fontSize: F.f15, fontWeight: '700', color: shop.example ? t.onSuccess : t.text }}>{shop.example ? 'Example data is loaded' : 'Want to practise first?'}</Text>
          <Text style={{ fontSize: F.f14, color: shop.example ? t.onSuccess : t.text2 }}>{shop.example ? 'Fabrics, runs, customers, an order, a quote and sales, all marked Example. Remove them from Today or Settings › Help & tour when you’re ready.' : 'Load a few example fabrics, runs, customers and sales to try things on. One button removes them later, and anything you add yourself stays.'}</Text>
        </View>
        {shop.example ? <Button small kind="secondary" title="Remove it" onPress={removeExample} /> : <Button small title="Load example data" onPress={loadExample} />}
      </View>
    </View>,
  ][i];

  const last = i === STEPS.length - 1;
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 90, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
        <View style={[{ width: '100%', maxWidth: 760, backgroundColor: t.surface, borderRadius: 24, padding: 32, gap: 22 }, shadow(t.dark)]}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STEPS.map((s, k) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: k <= i ? t.action : t.sunken }} />)}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text3 }}>Step {i + 1} of {STEPS.length}</Text>
            <Text style={{ fontSize: F.f28, fontWeight: '700', color: t.text }}>{i === 0 ? 'Welcome' : last ? 'All set' : STEPS[i]}</Text>
          </View>
          {body}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            {last ? null : <Pressable accessibilityRole="button" onPress={() => finish(false)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text3 }}>Skip setup</Text></Pressable>}
            <View style={{ flex: 1 }} />
            {i > 0 && !last ? <Button kind="secondary" title="Back" onPress={() => setI(i - 1)} /> : null}
            {last ? (
              <>
                <Button kind="secondary" title="Start on my own" onPress={() => finish(false)} />
                <Button title="Take the tour" onPress={() => finish(true)} />
              </>
            ) : <Button title={i === 0 ? 'Let’s go' : i === 4 && !added ? (fab.name.trim() ? 'Add it and continue' : 'Skip for now') : 'Next'} onPress={() => {
              if (i === 4 && !added && fab.name.trim()) addFabric({ name: fab.name.trim(), yards: fab.yards ?? 0, cost: fab.cost ?? 0, color: fab.color, low: shop.cfg.newBolt.low });
              setI(i + 1);
            }} />}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
