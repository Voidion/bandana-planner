import React from 'react';
import { ScrollView, View } from 'react-native';
import { inch } from '../lib/format';
import { MATS } from '../lib/plan';
import { onDevice } from '../state/storage';
import { update, useShop } from '../state/store';
import type { CutSettings, Size, Strap } from '../state/types';
import { Card, Field, NumField, Row, Section, Segmented, T } from '../ui/kit';
import { useTheme } from '../ui/theme';

export function SetupScreen() {
  const shop = useShop();
  const t = useTheme();
  const setSize = (k: string, patch: Partial<Size>) => update(s => ({ ...s, sizes: { ...s.sizes, [k]: { ...s.sizes[k], ...patch } } }));
  const setStrap = (id: string, patch: Partial<Strap>) => update(s => ({ ...s, straps: s.straps.map(x => (x.id === id ? { ...x, ...patch } : x)) }));
  const setCut = (patch: Partial<CutSettings>) => update(s => ({ ...s, cfg: { ...s.cfg, cut: { ...s.cfg.cut, ...patch } } }));
  const c = shop.cfg.cut;
  const vm = MATS.find(m => m.id === c.mat) || MATS[1];
  const across = Math.max(1, Math.floor(c.bolt / c.width + 1e-9));
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 26, maxWidth: 980 }}>
      <View style={{ gap: 4 }}>
        <T s="title">Sizes & mats</T>
        <T s="sub">The measurements every cut plan uses. Changes apply to plans you haven’t cut yet.</T>
      </View>

      <Section title="Bandana sizes" right={<T s="small">Inches · 10 1/2 or 10.5 both work</T>}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <Row first style={{ minHeight: 36, paddingVertical: 6 }}>
            <T s="label" style={{ width: 170 }}>Name</T>
            <T s="label" style={{ width: 130 }}>Wide edge</T>
            <T s="label" style={{ width: 130 }}>Tip length</T>
            <T s="label" style={{ flex: 1 }}>Strap</T>
          </Row>
          {Object.entries(shop.sizes).map(([k, z]) => (
            <Row key={k}>
              <View style={{ width: 170 }}><Field bare label={`${k} name`} value={z.name} onChange={v => setSize(k, { name: v })} width={150} /></View>
              <View style={{ width: 130 }}><NumField bare label={`${z.name} wide edge`} value={z.cw} onChange={n => setSize(k, { cw: n })} suffix="in" width={110} placeholder="–" /></View>
              <View style={{ width: 130 }}><NumField bare label={`${z.name} tip length`} value={z.cl} onChange={n => setSize(k, { cl: n })} suffix="in" width={110} placeholder="–" /></View>
              <View style={{ flex: 1 }}>
                <Segmented bare label={`${z.name} strap`} value={z.strap} options={shop.straps.map(s => [s.id, s.name] as [string, string])} onChange={v => setSize(k, { strap: v })} />
              </View>
            </Row>
          ))}
        </Card>
        <T s="small">The wide edge is the neck side of the triangle; the tip length runs from that edge to the point. Include seam allowance.</T>
      </Section>

      <Section title="Straps">
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shop.straps.map((s, i) => (
            <Row key={s.id} first={i === 0}>
              <View style={{ flex: 1 }}><Field label="Name" value={s.name} onChange={v => setStrap(s.id, { name: v })} /></View>
              <NumField label="Cut width" value={s.w} onChange={n => setStrap(s.id, { w: n ?? 0 })} suffix="in" width={110} />
              <NumField label="Cut length" value={s.l} onChange={n => setStrap(s.id, { l: n ?? 0 })} suffix="in" width={110} />
            </Row>
          ))}
        </Card>
        <T s="small">Straps are always cut on their own mats, never mixed in with the bandanas.</T>
      </Section>

      <Section title="Cricut and bolt">
        <Card style={{ gap: 18 }}>
          <Segmented label="Mat" value={c.mat} options={MATS.map(m => [m.id, m.name] as [string, string])} onChange={v => setCut({ mat: v, matLen: (MATS.find(m => m.id === v) || vm).l })} />
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <NumField label="Bolt width" value={c.bolt} onChange={n => setCut({ bolt: n || 44 })} suffix="in" width={120} hint="Usable, selvage to selvage" />
            <NumField label="Strip per mat" value={c.width} onChange={n => setCut({ width: Math.min(vm.w, n || vm.w) })} suffix="in" width={120} hint={`${across} across the bolt · max ${inch(vm.w)}`} />
            <NumField label="Blade gap" value={c.gap} onChange={n => setCut({ gap: n ?? 0.25 })} suffix="in" width={110} hint="Between pieces" />
            <NumField label="Extra fabric" value={c.buffer} onChange={n => setCut({ buffer: n ?? 0 })} suffix="%" width={100} hint="Added to every plan" />
          </View>
          <T s="small">The Venture cuts {inch(vm.w)} × {inch(vm.l)} on the {vm.name.replace(' mat', '')} mat, so pieces are only placed inside that area.</T>
        </Card>
      </Section>

      <Section title="New fabric starts with">
        <Card style={{ flexDirection: 'row', gap: 16 }}>
          <NumField label="Yards" value={shop.cfg.newBolt.yards} onChange={n => update(s => ({ ...s, cfg: { ...s.cfg, newBolt: { ...s.cfg.newBolt, yards: n ?? 0 } } }))} suffix="yd" width={110} />
          <NumField label="Warn below" value={shop.cfg.newBolt.low} onChange={n => update(s => ({ ...s, cfg: { ...s.cfg, newBolt: { ...s.cfg.newBolt, low: n ?? 0 } } }))} suffix="yd" width={110} />
        </Card>
      </Section>

      <T s="small" color={t.text3}>{onDevice ? 'Everything saves on this computer as you go, in your AppData › Local › BandanaPlanner folder.' : 'Preview: saves in this browser only.'}</T>
    </ScrollView>
  );
}
