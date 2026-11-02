import React from 'react';
import { View } from 'react-native';
import { inch } from '../lib/format';
import { cutExact, leastWasteWidth, MATS } from '../lib/plan';
import { onDevice } from '../state/storage';
import { change as update, useShop } from '../state/store';
import type { CutSettings, Size, Strap } from '../state/types';
import { Button, Card, Field, NumField, Row, Section, Segmented, Select, showSnack, T } from '../ui/kit';
import { CutFileRow } from '../ui/CutFileRow';
import { useTheme } from '../ui/theme';

export type SetupPart = 'sizes' | 'cutfiles' | 'cutting' | 'fabric';
export function SetupScreen({ part }: { part?: SetupPart } = {}) {
  const show = (k: SetupPart) => !part || part === k;
  const shop = useShop();
  const t = useTheme();
  const setSize = (k: string, patch: Partial<Size>) => update(s => ({ ...s, sizes: { ...s.sizes, [k]: { ...s.sizes[k], ...patch } } }));
  const setStrap = (id: string, patch: Partial<Strap>) => update(s => ({ ...s, straps: s.straps.map(x => (x.id === id ? { ...x, ...patch } : x)) }));
  const setCut = (patch: Partial<CutSettings>) => update(s => ({ ...s, cfg: { ...s.cfg, cut: { ...s.cfg.cut, ...patch } } }));
  const c = shop.cfg.cut;
  const vm = MATS.find(m => m.id === c.mat) || MATS[1];
  const across = Math.max(1, Math.floor(c.bolt / c.width + 1e-9));
  return (
    <View style={{ gap: 26 }}>
      {!part ? <T s="sub">The measurements, prices and times every run uses. Changes apply to runs you haven’t cut yet.</T> : null}

      {show('sizes') ? (
      <Section title="Bandana sizes" right={<T s="small">Inches · 10 1/2 or 10.5 both work</T>}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <Row first style={{ minHeight: 36, paddingVertical: 6 }}>
            <T s="label" style={{ width: 120 }}>Name</T>
            <T s="label" style={{ width: 100 }}>Wide edge</T>
            <T s="label" style={{ width: 100 }}>Tip length</T>
            <T s="label" style={{ width: 92 }}>Price</T>
            <T s="label" style={{ width: 96 }}>Time each</T>
            <T s="label" style={{ flex: 1 }}>Strap</T>
          </Row>
          {Object.entries(shop.sizes).map(([k, z]) => (
            <Row key={k}>
              <View style={{ width: 120 }}><Field bare label={`${k} name`} value={z.name} onChange={v => setSize(k, { name: v })} width={108} /></View>
              <View style={{ width: 100 }}>{z.file ? <T s="sub" style={{ paddingLeft: 4 }}>{inch(z.cw)} file</T> : <NumField bare label={`${z.name} wide edge`} value={z.cw} onChange={n => setSize(k, { cw: n })} suffix="in" width={88} placeholder="–" />}</View>
              <View style={{ width: 100 }}>{z.file ? <T s="sub" style={{ paddingLeft: 4 }}>{inch(z.cl)} file</T> : <NumField bare label={`${z.name} tip length`} value={z.cl} onChange={n => setSize(k, { cl: n })} suffix="in" width={88} placeholder="–" />}</View>
              <View style={{ width: 92 }}><NumField bare label={`${z.name} price`} value={z.price} onChange={n => setSize(k, { price: n })} prefix="$" width={80} placeholder="–" /></View>
              <View style={{ width: 96 }}><NumField bare label={`${z.name} minutes each`} value={z.mins} onChange={n => setSize(k, { mins: n })} suffix="min" width={84} placeholder="–" /></View>
              <View style={{ flex: 1 }}>
                <Select label={`${z.name} strap`} value={z.strap} options={shop.straps.map(s => [s.id, s.name, `${inch(s.w)} × ${inch(s.l)}`] as [string, string, string])} onChange={v => setSize(k, { strap: v })} width={128} />
              </View>
            </Row>
          ))}
        </Card>
        <T s="small">The wide edge is the neck side of the triangle; the tip length runs from that edge to the point. Include seam allowance. Time each is start to finish for one bandana; bigger sizes then get more time in a run’s steps.</T>
      </Section>
      ) : null}

      {show('cutfiles') ? (
      <Section title="Cut files" right={<T s="small">SVG from Design Space or your design app</T>}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {Object.entries(shop.sizes).map(([k, z], i) => (
            <CutFileRow
              key={k}
              first={i === 0}
              label={z.name}
              file={z.file}
              emptyNote={z.cw && z.cl ? `Planned as a ${inch(z.cw)} × ${inch(z.cl)} triangle` : 'No file and no cut size yet'}
              onFile={f => setSize(k, { file: f, cw: f.w, cl: f.h })}
              onRemove={() => {
                const was = z.file;
                setSize(k, { file: null });
                showSnack('Cut file removed. Plans use the triangle again', () => setSize(k, { file: was }));
              }}
            />
          ))}
          {shop.straps.map(st => (
            <CutFileRow
              key={st.id}
              label={st.name + ' strap'}
              file={st.file}
              emptyNote={`Planned as a ${inch(st.w)} × ${inch(st.l)} strip`}
              onFile={f => setStrap(st.id, { file: f, w: f.w, l: f.h })}
              onRemove={() => {
                const was = st.file;
                setStrap(st.id, { file: null });
                showSnack('Cut file removed. Plans use the strip again', () => setStrap(st.id, { file: was }));
              }}
            />
          ))}
        </Card>
        <T s="small">With a file, pieces are nested by their real outline (they can turn and interlock as the fabric’s print allows), and the cut files you save draw that outline on each mat. The file’s size sets the cut size; export it at the size you cut.</T>
      </Section>
      ) : null}

      {show('sizes') ? (
      <Section title="Straps">
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shop.straps.map((s, i) => (
            <Row key={s.id} first={i === 0}>
              <View style={{ flex: 1 }}><Field label="Name" value={s.name} onChange={v => setStrap(s.id, { name: v })} /></View>
              {s.file ? <T s="sub" style={{ width: 232 }}>{inch(s.w)} × {inch(s.l)} from the cut file</T> : (
                <>
                  <NumField label="Cut width" value={s.w} onChange={n => setStrap(s.id, { w: n ?? 0 })} suffix="in" width={110} />
                  <NumField label="Cut length" value={s.l} onChange={n => setStrap(s.id, { l: n ?? 0 })} suffix="in" width={110} />
                </>
              )}
              <NumField label="Extra time" value={s.mins ?? 0} onChange={n => setStrap(s.id, { mins: n ?? 0 })} suffix="min" width={110} />
              <NumField label="Notions" value={s.mat ?? 0} onChange={n => setStrap(s.id, { mat: n ?? 0 })} prefix="$" width={100} />
            </Row>
          ))}
        </Card>
        <T s="small">Straps are always cut on their own mats, never mixed in with the bandanas.</T>
      </Section>
      ) : null}

      {show('cutting') ? (
      <Section title="Cricut and bolt">
        <Card style={{ gap: 18 }}>
          <Segmented label="Mat" value={c.mat} options={MATS.map(m => [m.id, m.name] as [string, string])} onChange={v => setCut({ mat: v, matLen: (MATS.find(m => m.id === v) || vm).l })} />
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <NumField label="Bolt width" value={c.bolt} onChange={n => setCut({ bolt: n || 44 })} suffix="in" width={120} hint="Usable, selvage to selvage" />
            <NumField label="Strip per mat" value={c.width} onChange={n => setCut({ width: Math.min(vm.mw, Math.max(6, n || vm.w)) })} suffix="in" width={120} hint={`${across} across the bolt · max ${inch(vm.mw)}`} />
            <NumField label="Blade gap" value={c.gap} onChange={n => setCut({ gap: n ?? 0.25 })} suffix="in" width={110} hint="Between pieces" />
            <NumField label="Extra fabric" value={c.buffer} onChange={n => setCut({ buffer: n ?? 0 })} suffix="%" width={100} hint="Added to every plan" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button small kind="secondary" title="Least waste" onPress={() => {
              const b = leastWasteWidth(shop);
              if (!b) return showSnack('No width fits every piece on this mat');
              const same = Math.abs(b.w - c.width) < 0.01;
              setCut({ width: b.w });
              showSnack(`${inch(b.w)} ${same ? 'already wastes' : 'wastes'} the least: ${Math.round(b.wst * 100)}%`);
            }} />
            {cutExact(shop).map(w => <Button key={w} small kind={Math.abs(w - c.width) < 0.01 ? 'primary' : 'secondary'} title={`${inch(w)} · ${Math.round(c.bolt / w)} strips`} onPress={() => setCut({ width: w })} />)}
          </View>
          <T s="small">Least waste tries every quarter inch for the runs waiting to be cut and picks the strip that uses the least fabric.{cutExact(shop).length ? ` The other widths divide your ${inch(c.bolt)} bolt exactly.` : ''}</T>
          <T s="small">The Venture cuts {inch(vm.w)} × {inch(vm.l)} on the {vm.name.replace(' mat', '')} mat, so pieces are only placed inside that area.</T>
        </Card>
      </Section>
      ) : null}

      {show('fabric') ? (
      <Section title="New fabric starts with">
        <Card style={{ flexDirection: 'row', gap: 16 }}>
          <NumField label="Yards" value={shop.cfg.newBolt.yards} onChange={n => update(s => ({ ...s, cfg: { ...s.cfg, newBolt: { ...s.cfg.newBolt, yards: n ?? 0 } } }))} suffix="yd" width={110} />
          <NumField label="Warn below" value={shop.cfg.newBolt.low} onChange={n => update(s => ({ ...s, cfg: { ...s.cfg, newBolt: { ...s.cfg.newBolt, low: n ?? 0 } } }))} suffix="yd" width={110} />
        </Card>
      </Section>
      ) : null}

      {part ? null : <T s="small" color={t.text3}>{onDevice ? 'Everything saves on this computer as you go, in your AppData › Local › BandanaPlanner folder.' : 'Preview: saves in this browser only.'}</T>}
    </View>
  );
}
