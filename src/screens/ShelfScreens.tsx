/* Supplies, Suppliers and Restock. */
import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { money, plural, yd } from '../lib/format';
import {
  addSupplier,
  addSupply,
  arrived,
  cancelOrder,
  deleteSupplier,
  deleteSupply,
  editSupplier,
  editSupply,
  leadOf,
  markOrdered,
  restockList,
  restoreSupplier,
  restoreSupply,
  type ShelfItem,
} from '../state/shelf';
import { useShop } from '../state/store';
import type { Supply } from '../state/types';
import { BoxIcon, PlusIcon, TrashIcon, WarnIcon } from '../ui/icons';
import { Bar, Button, Card, Chip, Empty, Field, NumField, Row, Section, Select, Sheet, showSnack, Swatch, T } from '../ui/kit';
import { R, useTheme } from '../ui/theme';

/** Pick a supplier, or add a new one on the spot */
export function SupplierSelect({ value, onChange, label = 'Supplier' }: { value: string | null | undefined; onChange: (id: string | null) => void; label?: string }) {
  const shop = useShop();
  return (
    <View style={{ gap: 4 }}>
      <T s="label">{label}</T>
      <Select
        label={label}
        width={240}
        value={value || ''}
        options={[['', 'None'], ...shop.suppliers.map(s => [s.id, s.name, s.lead ? `${s.lead} days to arrive` : undefined] as [string, string, string?]), ['__new', 'New supplier…']]}
        onChange={v => {
          if (v === '__new') {
            const id = addSupplier();
            onChange(id);
            showSnack('Supplier added. Name it in Suppliers');
          } else onChange(v || null);
        }}
      />
    </View>
  );
}

const openSite = (url: string) => {
  const u = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  Linking.openURL(u).catch(() => showSnack('Couldn’t open that link.'));
};

const twoPane = (left: React.ReactNode, right: React.ReactNode, t: any) => (
  <View style={{ flex: 1, flexDirection: 'row' }}>
    <View style={{ width: 360, borderRightWidth: 1, borderRightColor: t.line }}>{left}</View>
    <View style={{ flex: 1 }}>{right}</View>
  </View>
);

/* ---------- supplies ---------- */
const USE: [Supply['use'], string, string][] = [
  ['bandana', 'Every bandana', 'Taken when a run finishes'],
  ['order', 'Every order', 'Taken when an order is sent'],
  ['none', 'Not automatically', 'You count it yourself'],
];

export function SuppliesScreen({ sel, setSel }: { sel: string | null; setSel: (id: string | null) => void }) {
  const shop = useShop();
  const t = useTheme();
  const cur = shop.supplies.find(x => x.id === sel) || shop.supplies[0] || null;
  const add = () => setSel(addSupply());
  const left = (
    <>
      <View style={{ padding: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T s="title">Supplies</T>
        <Button small title="Add supply" icon={c => <PlusIcon color={c} size={16} />} onPress={add} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 4, gap: 12 }}>
        {!shop.supplies.length ? (
          <Empty icon={<BoxIcon color={t.action} size={26} />} title="Add your first supply" body="Care tags, mailers, elastic, snaps: anything you keep a count of. Set it to come off automatically for every bandana or order, and Restock warns you before it runs out." action={<Button title="Add supply" onPress={add} />} />
        ) : (
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {[...shop.supplies].sort((a, b) => a.name.localeCompare(b.name)).map((x, i) => {
              const low = x.qty <= x.low && (x.low > 0 || x.qty <= 0);
              return (
                <Row key={x.id} first={i === 0} selected={cur?.id === x.id} onPress={() => setSel(x.id)}
                  menu={[
                    { label: 'Open', onPress: () => setSel(x.id) },
                    x.onOrder ? { label: 'It arrived', onPress: () => arrived('supply', x.id) } : { label: 'Mark ordered', onPress: () => markOrdered('supply', x.id, Math.max(1, Math.ceil(x.low * 2 - x.qty))) },
                    { label: 'Delete supply', danger: true, onPress: () => { const i2 = shop.supplies.findIndex(y => y.id === x.id); deleteSupply(x.id); showSnack(`${x.name} deleted`, () => restoreSupply(x, i2)); } },
                  ]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }} numberOfLines={1}>{x.name}</T>
                    <T s="sub" numberOfLines={1}>{USE.find(u => u[0] === x.use)?.[1] || 'Not automatically'}{x.cost ? ` · ${money(x.cost)} each` : ''}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <T style={{ fontWeight: '600' }} color={low ? t.warn : t.text}>{x.qty} {x.unit}</T>
                    {low ? <Chip label={x.qty <= 0 ? 'Out' : 'Low'} tone="warn" /> : x.onOrder ? <Chip label="On order" tone="tint" /> : null}
                  </View>
                </Row>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </>
  );
  return twoPane(left, cur ? <SupplyDetail key={cur.id} x={cur} onDeleted={() => setSel(null)} /> : null, t);
}

function SupplyDetail({ x, onDeleted }: { x: Supply; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const set = (p: Partial<Supply>) => editSupply(x.id, p);
  const [order, setOrder] = useState<number | null>(null);
  const remove = () => {
    const i = shop.supplies.findIndex(y => y.id === x.id);
    deleteSupply(x.id);
    onDeleted();
    showSnack(`${x.name} deleted`, () => restoreSupply(x, i));
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 760 }}>
      <Field label="Name" value={x.name} onChange={v => set({ name: v })} />
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <NumField label="On hand" value={x.qty} onChange={n => set({ qty: n ?? 0 })} width={120} />
          <Field label="Counted in" value={x.unit} onChange={v => set({ unit: v })} placeholder="tags" width={140} />
          <NumField label="Warn below" value={x.low} onChange={n => set({ low: n ?? 0 })} width={120} />
          <NumField label="Cost each" value={x.cost} onChange={n => set({ cost: n ?? 0 })} prefix="$" width={120} />
        </View>
        <Bar value={x.low ? x.qty / (x.low * 3) : 1} color={x.qty <= x.low ? t.barA : t.barG} />
      </Card>
      <Section title="Taken automatically">
        <Card style={{ gap: 12 }}>
          <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
            {USE.map(([v, l, sub], i) => (
              <Row key={v} first={i === 0} selected={x.use === v} onPress={() => set({ use: v })}>
                <View style={{ flex: 1 }}><T style={{ fontWeight: x.use === v ? '700' : '500' }}>{l}</T><T s="sub">{sub}</T></View>
              </Row>
            ))}
          </View>
          {x.use !== 'none' ? <NumField label={`How many each ${x.use === 'order' ? 'order' : 'bandana'}`} value={x.per} onChange={n => set({ per: n || 1 })} width={120} /> : null}
          {x.use === 'bandana' && x.cost ? <T s="small">Adds {money(x.cost * (x.per || 1))} to every bandana’s materials.</T> : null}
        </Card>
      </Section>
      <Section title="Buying it">
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <SupplierSelect value={x.sup} onChange={v => set({ sup: v })} />
            <View style={{ flex: 1, minWidth: 220 }}><Field label="Link to reorder" value={x.url} onChange={v => set({ url: v })} placeholder="https://…" /></View>
            {x.url ? <Button small kind="secondary" title="Open" onPress={() => openSite(x.url)} /> : null}
          </View>
          {x.onOrder ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{x.onOrder} {x.unit}</T> on order</T>
              <Button small kind="ghost" title="Cancel order" onPress={() => cancelOrder('supply', x.id)} />
              <Button small title="It arrived" onPress={() => { arrived('supply', x.id); showSnack(`${x.name}: +${x.onOrder} on hand`); }} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <NumField label="Order" value={order} onChange={setOrder} width={120} placeholder={String(Math.max(1, Math.ceil(x.low * 2 - x.qty)))} />
              <Button small kind="secondary" title="Mark ordered" onPress={() => { const n = order || Math.max(1, Math.ceil(x.low * 2 - x.qty)); markOrdered('supply', x.id, n); setOrder(null); showSnack(`${n} ${x.unit} on order`.replace('  ', ' ')); }} />
            </View>
          )}
        </Card>
      </Section>
      <Button kind="danger" title="Delete supply" icon={c => <TrashIcon color={c} size={16} />} onPress={remove} style={{ alignSelf: 'flex-start' }} />
    </ScrollView>
  );
}

/* ---------- suppliers ---------- */
export function SuppliersScreen({ openFabric, openSupply }: { openFabric: (id: string) => void; openSupply: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  const cur = shop.suppliers.find(x => x.id === sel) || shop.suppliers[0] || null;
  const add = () => setSel(addSupplier());
  const left = (
    <>
      <View style={{ padding: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T s="title">Suppliers</T>
        <Button small title="Add supplier" icon={c => <PlusIcon color={c} size={16} />} onPress={add} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 4, gap: 12 }}>
        {!shop.suppliers.length ? (
          <Empty icon={<BoxIcon color={t.action} size={26} />} title="Add where you buy" body="Keep each shop’s site, how long orders take and shipping. Restock groups what you need by supplier." action={<Button title="Add supplier" onPress={add} />} />
        ) : (
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {[...shop.suppliers].sort((a, b) => a.name.localeCompare(b.name)).map((x, i) => {
              const n = shop.fabrics.filter(f => f.sup === x.id).length + shop.supplies.filter(y => y.sup === x.id).length;
              return (
                <Row key={x.id} first={i === 0} selected={cur?.id === x.id} onPress={() => setSel(x.id)}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>{x.name}</T>
                    <T s="sub">{plural(n, 'item')} · {x.lead} days to arrive</T>
                  </View>
                </Row>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </>
  );
  const right = cur ? (() => {
    const fabs = shop.fabrics.filter(f => f.sup === cur.id);
    const sups = shop.supplies.filter(y => y.sup === cur.id);
    const remove = () => {
      const i = shop.suppliers.findIndex(y => y.id === cur.id);
      deleteSupplier(cur.id);
      setSel(null);
      showSnack(`${cur.name} deleted`, () => restoreSupplier(cur, i, fabs.map(f => f.id), sups.map(y => y.id)));
    };
    return (
      <ScrollView key={cur.id} contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 760 }}>
        <Field label="Name" value={cur.name} onChange={v => editSupplier(cur.id, { name: v })} />
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}><Field label="Website" value={cur.site} onChange={v => editSupplier(cur.id, { site: v })} placeholder="https://…" /></View>
            {cur.site ? <Button small kind="secondary" title="Open site" onPress={() => openSite(cur.site)} /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <NumField label="Days to arrive" value={cur.lead} onChange={n => editSupplier(cur.id, { lead: Math.round(n ?? 7) })} suffix="days" width={130} />
            <View style={{ flex: 1, minWidth: 220 }}><Field label="Shipping" value={cur.ship} onChange={v => editSupplier(cur.id, { ship: v })} placeholder="Free over $75" /></View>
          </View>
          <Field label="Notes" value={cur.notes} onChange={v => editSupplier(cur.id, { notes: v })} multiline placeholder="Account, discount codes, who to ask…" />
        </Card>
        <Section title="What you buy here">
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {fabs.map((f, i) => (
              <Row key={f.id} first={i === 0} onPress={() => openFabric(f.id)}>
                <Swatch color={f.color} size={28} />
                <T style={{ flex: 1, fontWeight: '600' }}>{f.name}</T>
                <T s="sub">{yd(f.yards)}</T>
              </Row>
            ))}
            {sups.map((y, i) => (
              <Row key={y.id} first={!fabs.length && i === 0} onPress={() => openSupply(y.id)}>
                <View style={{ width: 28, alignItems: 'center' }}><BoxIcon color={t.text3} size={18} /></View>
                <T style={{ flex: 1, fontWeight: '600' }}>{y.name}</T>
                <T s="sub">{y.qty} {y.unit}</T>
              </Row>
            ))}
            {!fabs.length && !sups.length ? <Row first><T s="sub">Pick this supplier on a fabric or supply to see it here.</T></Row> : null}
          </Card>
        </Section>
        <Button kind="danger" title="Delete supplier" icon={c => <TrashIcon color={c} size={16} />} onPress={remove} style={{ alignSelf: 'flex-start' }} />
      </ScrollView>
    );
  })() : null;
  return twoPane(left, right, t);
}

/* ---------- restock ---------- */
export function RestockScreen({ openFabric, openSupply }: { openFabric: (id: string) => void; openSupply: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const list = useMemo(() => restockList(shop), [shop]);
  const onOrder: ShelfItem[] = [
    ...shop.fabrics.filter(f => f.onOrder > 0).map(x => ({ kind: 'fabric' as const, x })),
    ...shop.supplies.filter(x => x.onOrder > 0).map(x => ({ kind: 'supply' as const, x })),
  ];
  const need = list.filter(i => !(i.x.onOrder > 0));
  const groups: Record<string, typeof need> = {};
  need.forEach(i => (groups[i.x.sup || ''] = groups[i.x.sup || ''] || []).push(i));
  const [ordering, setOrdering] = useState<null | { kind: 'fabric' | 'supply'; id: string; suggest: number }>(null);
  const [arriving, setArriving] = useState<null | ShelfItem>(null);
  const label = (i: ShelfItem) => (i.kind === 'fabric' ? yd(i.x.yards) : `${i.x.qty} ${i.x.unit}`.trim());
  const open = (i: ShelfItem) => (i.kind === 'fabric' ? openFabric(i.x.id) : openSupply(i.x.id));
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 24, maxWidth: 980 }}>
      <View style={{ gap: 4 }}>
        <T s="title">Restock</T>
        <T s="sub">Fabric and supplies that are low, out, or will run out before a new order could arrive.</T>
      </View>
      {!need.length && !onOrder.length ? (
        <Empty icon={<BoxIcon color={t.action} size={26} />} title="Nothing to order" body="Everything’s above its warning level. Fabric also shows here when it’ll run out at your pace before an order could arrive." />
      ) : null}
      {Object.entries(groups).map(([sid, items]) => {
        const sp = shop.suppliers.find(x => x.id === sid);
        return (
          <Section key={sid || 'none'} title={sp ? sp.name : 'No supplier set'} right={sp ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T s="sub">{sp.lead} days to arrive{sp.ship ? ' · ' + sp.ship : ''}</T>{sp.site ? <Button small kind="ghost" title="Open site" onPress={() => openSite(sp.site)} /> : null}</View> : undefined}>
            <Card pad={false} style={{ overflow: 'hidden' }}>
              {items.map((i, k) => (
                <Row key={i.x.id} first={k === 0}>
                  {i.kind === 'fabric' ? <Swatch color={i.x.color} size={32} /> : <View style={{ width: 32, alignItems: 'center' }}><BoxIcon color={t.text3} size={20} /></View>}
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }} onPress={() => open(i)}>{i.x.name}</T>
                    <T s="sub">{label(i)} left · {i.reason}</T>
                  </View>
                  <Chip label={i.reason === 'Out' ? 'Out' : 'Low'} tone="warn" />
                  <Button small kind="secondary" title={`Order ${i.kind === 'fabric' ? yd(i.suggest) : i.suggest}`} onPress={() => setOrdering({ kind: i.kind, id: i.x.id, suggest: i.suggest })} />
                </Row>
              ))}
            </Card>
          </Section>
        );
      })}
      {onOrder.length ? (
        <Section title={`On order · ${onOrder.length}`}>
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {onOrder.map((i, k) => (
              <Row key={i.x.id} first={k === 0}>
                {i.kind === 'fabric' ? <Swatch color={i.x.color} size={32} /> : <View style={{ width: 32, alignItems: 'center' }}><BoxIcon color={t.text3} size={20} /></View>}
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: '600' }} onPress={() => open(i)}>{i.x.name}</T>
                  <T s="sub">{i.kind === 'fabric' ? yd(i.x.onOrder) : `${i.x.onOrder} ${i.x.unit}`} coming · usually {leadOf(shop, i.x)} days</T>
                </View>
                <Button small kind="ghost" title="Cancel" onPress={() => cancelOrder(i.kind, i.x.id)} />
                <Button small title="It arrived" onPress={() => setArriving(i)} />
              </Row>
            ))}
          </Card>
        </Section>
      ) : null}
      {ordering ? <OrderSheet {...ordering} onClose={() => setOrdering(null)} /> : null}
      {arriving ? <ArrivedSheet item={arriving} onClose={() => setArriving(null)} /> : null}
    </ScrollView>
  );
}

function OrderSheet({ kind, id, suggest, onClose }: { kind: 'fabric' | 'supply'; id: string; suggest: number; onClose: () => void }) {
  const shop = useShop();
  const x: any = kind === 'fabric' ? shop.fabrics.find(f => f.id === id) : shop.supplies.find(s => s.id === id);
  const [n, setN] = useState<number | null>(suggest);
  if (!x) return null;
  const unit = kind === 'fabric' ? 'yd' : x.unit;
  const sp = shop.suppliers.find(s => s.id === x.sup);
  return (
    <Sheet title={`Order ${x.name}`} sub={sp ? `${sp.name} · usually ${sp.lead} days` : undefined} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Mark ordered" onPress={() => { if (n && n > 0) { markOrdered(kind, id, n); showSnack(`${n} ${unit} of ${x.name} on order`); } onClose(); }} /></>}>
      <NumField label="How much" value={n} onChange={setN} suffix={unit} width={150} />
      <T s="small">{kind === 'fabric' ? 'Suggested from about six weeks at your pace, plus your warning level.' : 'Suggested to bring it to twice its warning level.'} Marking it ordered keeps it out of the list until it arrives.</T>
      {sp?.site || x.url ? <Button kind="secondary" small title="Open the site to order" onPress={() => openSite(x.url || sp!.site)} style={{ alignSelf: 'flex-start' }} /> : null}
    </Sheet>
  );
}

function ArrivedSheet({ item, onClose }: { item: ShelfItem; onClose: () => void }) {
  const [n, setN] = useState<number | null>(item.x.onOrder);
  const [cost, setCost] = useState<number | null>(item.x.cost);
  const unit = item.kind === 'fabric' ? 'yd' : (item.x as Supply).unit;
  return (
    <Sheet title={`${item.x.name} arrived`} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Put on the shelf" onPress={() => { arrived(item.kind, item.x.id, n ?? undefined, cost ?? undefined); showSnack(`${item.x.name}: +${n} ${unit}`); onClose(); }} /></>}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <NumField label={item.kind === 'fabric' ? 'What you measured' : 'How many came'} value={n} onChange={setN} suffix={unit} width={160} />
        <NumField label={item.kind === 'fabric' ? 'Cost per yard' : 'Cost each'} value={cost} onChange={setCost} prefix="$" width={130} />
      </View>
      <T s="small">Measure it as it comes: bolts are often a little more or less than ordered.</T>
    </Sheet>
  );
}

export { WarnIcon };
