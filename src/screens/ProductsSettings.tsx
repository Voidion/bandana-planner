/* Settings › Products: bows and anything else made from fabric. Styles have a cut size (or cut file), pieces, time,
   notions and price; parts are add-on pieces like an elastic loop. Steps split the time when a run includes them. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { money } from '../lib/format';
import { unitMaterials } from '../lib/plan';
import { addPart, addProduct, addVariant, deletePart, deleteProduct, deleteVariant, editPart, editProduct, editVariant, restoreProduct } from '../state/products';
import { useShop } from '../state/store';
import type { Product } from '../state/types';
import { CutFileRow } from '../ui/CutFileRow';
import { CloseIcon, PlusIcon, TrashIcon } from '../ui/icons';
import { Button, Card, Chip, Empty, Field, IconButton, NumField, Row, Section, Select, showSnack, T } from '../ui/kit';
import { useTheme } from '../ui/theme';
import { BoxIcon } from '../ui/icons';

export function ProductsSettings() {
  const shop = useShop();
  const t = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  const cur = shop.products.find(p => p.id === sel) || shop.products[0] || null;
  if (!shop.products.length)
    return (
      <Empty
        icon={<BoxIcon color={t.action} size={26} />}
        title="Make bows too?"
        body="Add bows or anything else you sew from the same fabric. Runs can include them: they’re cut on their own mats, their time is added to the steps, and finished ones go into stock."
        action={<Button title="Add bows" onPress={() => setSel(addProduct())} />}
      />
    );
  return (
    <View style={{ flexDirection: 'row', gap: 22, alignItems: 'flex-start' }}>
      <View style={{ width: 260, gap: 12 }}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shop.products.map((p, i) => (
            <Row key={p.id} first={i === 0} selected={p.id === cur?.id} onPress={() => setSel(p.id)}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: '600' }}>{p.name}</T>
                <T s="sub">{p.variants.length} style{p.variants.length === 1 ? '' : 's'}</T>
              </View>
            </Row>
          ))}
        </Card>
        <Button kind="secondary" small title="New product" icon={c => <PlusIcon color={c} size={16} />} onPress={() => setSel(addProduct())} />
      </View>
      <View style={{ flex: 1 }}>{cur ? <ProductEditor key={cur.id} p={cur} onDeleted={() => setSel(null)} /> : null}</View>
    </View>
  );
}

function ProductEditor({ p, onDeleted }: { p: Product; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const remove = () => {
    const i = shop.products.findIndex(x => x.id === p.id);
    deleteProduct(p.id);
    onDeleted();
    showSnack(`${p.name} deleted`, () => restoreProduct(p, i));
  };
  const setSteps = (steps: Product['steps']) => editProduct(p.id, { steps });
  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Name" value={p.name} onChange={v => editProduct(p.id, { name: v })} /></View>
        <Field label="One of them is a" value={p.one} onChange={v => editProduct(p.id, { one: v })} width={160} placeholder="bow" />
      </View>

      <Section title={p.varLabel === 'Style' ? 'Styles' : p.varLabel + 's'}>
        {p.variants.map(v => (
          <Card key={v.id} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><Field label="Style" value={v.name} onChange={x => editVariant(p.id, v.id, { name: x })} /></View>
              <NumField label="Price" value={v.price} onChange={n => editVariant(p.id, v.id, { price: n })} prefix="$" width={110} placeholder="–" />
              {p.variants.length > 1 ? <IconButton label={`Remove ${v.name}`} onPress={() => deleteVariant(p.id, v.id)}>{c => <CloseIcon color={c} size={14} />}</IconButton> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {v.file ? null : <NumField label="Cut width" value={v.w} onChange={n => editVariant(p.id, v.id, { w: Math.min(23.5, n || 0.25) })} suffix="in" width={110} />}
              {v.file ? null : <NumField label="Cut length" value={v.l} onChange={n => editVariant(p.id, v.id, { l: Math.min(27.5, n || 0.25) })} suffix="in" width={110} />}
              <NumField label="Pieces each" value={v.pieces} onChange={n => editVariant(p.id, v.id, { pieces: Math.max(1, Math.round(n || 1)) })} width={100} />
              <NumField label="Time each" value={v.mins} onChange={n => editVariant(p.id, v.id, { mins: n ?? 0 })} suffix="min" width={110} />
              <NumField label="Notions each" value={v.notions} onChange={n => editVariant(p.id, v.id, { notions: n ?? 0 })} prefix="$" width={110} />
              {p.parts.length ? (
                <View style={{ gap: 4 }}>
                  <T s="label">{p.partLabel}</T>
                  <Select label={p.partLabel} width={170} value={v.part || ''} options={[['', 'None'], ...p.parts.map(x => [x.id, x.name] as [string, string])]} onChange={x => editVariant(p.id, v.id, { part: x || null })} />
                </View>
              ) : null}
            </View>
            <View style={{ backgroundColor: t.bg, borderRadius: 12, overflow: 'hidden' }}>
              <CutFileRow first label={v.name} file={v.file} emptyNote={`Planned as a ${v.w}″ × ${v.l}″ piece`} onFile={f => editVariant(p.id, v.id, { file: f, w: f.w, l: f.h })} onRemove={() => editVariant(p.id, v.id, { file: null })} />
            </View>
            <T s="small">{money(unitMaterials(shop, v.id) || 0)} materials each{v.price ? ` · ${money(v.price - (unitMaterials(shop, v.id) || 0))} before fees` : ''}</T>
          </Card>
        ))}
        <Button kind="secondary" small title="Add a style" icon={c => <PlusIcon color={c} size={16} />} onPress={() => addVariant(p.id)} style={{ alignSelf: 'flex-start' }} />
      </Section>

      <Section title={`${p.partLabel}s`} right={<T s="small">Extra pieces a style can use, like an elastic loop</T>}>
        {p.parts.map(x => (
          <Card key={x.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><Field label="Name" value={x.name} onChange={v => editPart(p.id, x.id, { name: v })} /></View>
              <IconButton label={`Remove ${x.name}`} onPress={() => deletePart(p.id, x.id)}>{c => <CloseIcon color={c} size={14} />}</IconButton>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <NumField label="Cut width" value={x.w} onChange={n => editPart(p.id, x.id, { w: n || 0.25 })} suffix="in" width={110} />
              <NumField label="Cut length" value={x.l} onChange={n => editPart(p.id, x.id, { l: n || 0.25 })} suffix="in" width={110} />
              <NumField label="Pieces" value={x.pieces} onChange={n => editPart(p.id, x.id, { pieces: Math.max(1, Math.round(n || 1)) })} width={90} />
              <NumField label="Time each" value={x.mins} onChange={n => editPart(p.id, x.id, { mins: n ?? 0 })} suffix="min" width={110} />
              <NumField label="Notions each" value={x.notions} onChange={n => editPart(p.id, x.id, { notions: n ?? 0 })} prefix="$" width={110} />
            </View>
            <T s="small">{p.variants.filter(v => v.part === x.id).map(v => v.name).join(', ') || 'No style uses it yet'}</T>
          </Card>
        ))}
        <Button kind="secondary" small title={`Add ${p.partLabel.toLowerCase()}`} icon={c => <PlusIcon color={c} size={16} />} onPress={() => addPart(p.id)} style={{ alignSelf: 'flex-start' }} />
      </Section>

      <Section title="Steps" right={<T s="small">Share of each one’s time</T>}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {p.steps.map((st, i) => (
            <Row key={i} first={i === 0}>
              <View style={{ flex: 1 }}><Field bare label={`Step ${i + 1}`} value={st.n} onChange={v => setSteps(p.steps.map((y, j) => (j === i ? { ...y, n: v } : y)))} /></View>
              <NumField bare label={`${st.n} share`} value={st.r} onChange={n => setSteps(p.steps.map((y, j) => (j === i ? { ...y, r: Math.max(0.1, n || 1) } : y)))} width={90} />
              <Chip label={`${Math.round((st.r / Math.max(0.1, p.steps.reduce((a, y) => a + y.r, 0))) * 100)}%`} />
              <IconButton label={`Remove ${st.n}`} onPress={() => setSteps(p.steps.filter((_, j) => j !== i))}>{c => <TrashIcon color={c} size={15} />}</IconButton>
            </Row>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setSteps([...p.steps, { n: 'New step', r: 1 }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderTopWidth: p.steps.length ? 1 : 0, borderTopColor: t.line }}>
            <PlusIcon color={t.action} size={18} />
            <T color={t.action} style={{ fontWeight: '600' }}>Add a step</T>
          </Pressable>
        </Card>
        <T s="small">When a run includes {p.name.toLowerCase()}, these steps are added after Topstitch, sharing each style’s time each.</T>
      </Section>

      <Button kind="danger" title={`Delete ${p.name}`} icon={c => <TrashIcon color={c} size={16} />} onPress={remove} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}
