/* Orders, laid out like the prototype: grouped cards (to plan, being made, ready, delivered) beside the order —
   who it's for, the stats strip, whether it fits before its due date, what they want, fabric and notes. */
import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { dayLabel, mins, money, money0, plural, relDue, yd } from '../lib/format';
import { computePlan, itemName, rel, schedule } from '../lib/plan';
import { leftMins, orderFit } from '../state/alerts';
import { addCustomer, addOrder, canFill, deleteOrder, editOrder, fillFromStock, freeStock, orderCount, orderStage, orderWorth, planOrder, restoreOrder, saleOwed, saleTotal, undoSale, unfill, type OrderStage } from '../state/selling';
import { useShop } from '../state/store';
import type { Order } from '../state/types';
import { BagIcon, CartIcon, PlusIcon } from '../ui/icons';
import { Button, Chip, Empty, NumField, openMenuAt, showSnack } from '../ui/kit';
import { CalendarSheet, CustAv, DateChips, DetailHero, FitCard, HeadBtn, HeroAv, LinkText, ListDetailPage, Note, OCard, OStat, QtyStepper, Sect, Strip, Sublab, WList, WRow } from '../ui/proto';
import { F, useTheme } from '../ui/theme';
import { FabThumb } from '../ui/Thumbs';
import { FabricPicker } from './runs/sheets';
import { ShopifyImport } from './ShopifyImport';
import { DeliverSheet } from './SellingScreens';

const GROUPS: [OrderStage, string][] = [['plan', 'To plan'], ['making', 'In progress'], ['ready', 'Ready to send'], ['delivered', 'Delivered']];
const itemsWord = (o: Order) => {
  const n = orderCount(o);
  return n ? plural(n, 'bandana') : 'Nothing added yet';
};

export function OrdersScreen({ sel, setSel, openRun, openCustomer }: { sel: string | null; setSel: (id: string | null) => void; openRun: (id: string) => void; openCustomer?: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [imp, setImp] = useState(false);
  const sc = useMemo(() => schedule(shop), [shop]);
  const by = (k: OrderStage) => shop.orders.filter(o => orderStage(shop, o) === k).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const groups = GROUPS.map(([k, n]) => [k, n, k === 'delivered' ? by(k).reverse() : by(k)] as const);
  const cur = shop.orders.find(o => o.id === sel) || groups.find(g => g[2].length)?.[2][0] || null;
  const add = () => setSel(addOrder());
  const card = (o: Order) => {
    const st = orderStage(shop, o);
    const c = shop.customers.find(x => x.id === o.cust);
    const r = o.run ? shop.runs.find(x => x.id === o.run) : null;
    const d = rel(o.due);
    const late = d != null && d < 0 && st !== 'delivered';
    const f = st === 'plan' ? orderFit(shop, o, sc) : null;
    return (
      <OCard key={o.id} on={cur?.id === o.id} onPress={() => setSel(o.id)}
        av={<CustAv c={c} name={o.title || '?'} size={42} />}
        title={c ? c.name : o.title || 'New order'}
        value={money0(orderWorth(shop, o))}
        sub={`${(c ? o.title : '') || o.src || (c ? 'Order' : '')}${(c ? o.title : '') || o.src ? ' · ' : ''}${itemsWord(o)}`}
        chips={
          <>
            {st !== 'delivered' ? <Chip label={d == null ? 'No date' : late || d <= 7 ? relDue(d) : 'Due ' + dayLabel(o.due, { month: 'short', day: 'numeric' })} tone={late ? 'warn' : 'plain'} /> : null}
            {st === 'plan' ? (o.due && orderCount(o) ? f!.fits ? <Chip label="Fits your schedule" tone="ok" /> : <Chip label={`${mins(f!.short)} short`} tone="warn" /> : null)
              : st === 'making' && r ? <Chip label={`${r.steps.filter(s => s.done).length} of ${r.steps.length} steps`} />
              : st === 'ready' ? <Chip label={o.fromStock.length ? 'From stock' : 'Run finished'} tone="ok" />
              : <Chip label={`Delivered ${o.deliveredAt ? dayLabel(o.deliveredAt, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}`} />}
          </>
        }
        menu={[
          { label: 'Open', onPress: () => setSel(o.id) },
          st === 'plan' && orderCount(o) ? { label: 'Plan a run for it', onPress: () => { const id = planOrder(o.id); if (id) openRun(id); } } : null,
          st === 'plan' && canFill(shop, o) ? { label: 'Fill from stock', onPress: () => { if (fillFromStock(o.id)) showSnack('Set aside from stock', () => unfill(o.id)); } } : null,
          { label: 'Delete order', danger: true, onPress: () => { const i2 = shop.orders.findIndex(x => x.id === o.id); deleteOrder(o.id); showSnack('Order deleted', () => restoreOrder(o, i2)); } },
        ]}
      />
    );
  };
  const list = shop.orders.length ? (
    groups.map(([k, n, L]) =>
      L.length ? (
        <Sect key={k} big title={n} right={String(L.length)}>
          <View style={{ gap: 8 }}>{L.map(card)}</View>
        </Sect>
      ) : null,
    )
  ) : (
    <Empty icon={<CartIcon color={t.action} size={30} />} title="No orders yet" body="Add orders from Shopify, email or a market. The app tells you if they fit your schedule before you say yes." action={<Button title="New order" onPress={add} />} />
  );
  return (
    <>
      <ListDetailPage
        title="Orders"
        sel={sel}
        right={
          <>
            <HeadBtn label="Import from Shopify" onPress={() => setImp(true)}>{c => <BagIcon color={c} size={22} />}</HeadBtn>
            <HeadBtn label="New order" tint onPress={add}>{c => <PlusIcon color={c} size={24} />}</HeadBtn>
          </>
        }
        list={list}
        detail={cur ? <OrderDetail key={cur.id} o={cur} openRun={openRun} openCustomer={openCustomer} onDeleted={() => setSel(null)} /> : null}
      />
      {imp ? <ShopifyImport onClose={() => setImp(false)} /> : null}
    </>
  );
}

function OrderDetail({ o, openRun, openCustomer, onDeleted }: { o: Order; openRun: (id: string) => void; openCustomer?: (id: string) => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [sheet, setSheet] = useState<null | 'deliver' | 'fabric' | 'date'>(null);
  const st = orderStage(shop, o);
  const c = shop.customers.find(x => x.id === o.cust);
  const r = o.run ? shop.runs.find(x => x.id === o.run) : null;
  const sale = shop.sales.find(e => e.order === o.id);
  const set = (p: Partial<Order>) => editOrder(o.id, p);
  const pcs = orderCount(o);
  const val = orderWorth(shop, o);
  const f = orderFit(shop, o);
  const free = freeStock(shop);
  const inStock = st === 'plan' && pcs > 0 && Object.entries(o.qty).every(([k, n]) => !n || (free[k] || 0) >= n);
  const fab = shop.fabrics.find(x => x.id === o.fab) || null;
  const sizes: Record<string, number> = {};
  const prod: Record<string, number> = {};
  Object.entries(o.qty).forEach(([k, n]) => (shop.sizes[k] ? (sizes[k] = n) : (prod[k] = n)));
  const need = useMemo(() => {
    const res = computePlan(shop, { qty: sizes, prod, body: o.fab || null, ties: o.fab || null });
    return res.needs.reduce((a, n) => a + n.yards, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, o.qty, o.fab]);
  const pickCustomer = (e: any) => {
    const n = e?.nativeEvent || {};
    openMenuAt(n.pageX ?? 300, n.pageY ?? 200, [
      ...shop.customers.map(x => ({ label: x.name, onPress: () => set({ cust: x.id }) })),
      { label: 'New customer…', onPress: () => { const id = addCustomer(); set({ cust: id }); showSnack('Customer added. Fill them in under Customers'); } },
      o.cust ? { label: 'No customer', onPress: () => set({ cust: null }) } : null,
    ]);
  };
  const remove = () => {
    const i = shop.orders.findIndex(x => x.id === o.id);
    deleteOrder(o.id);
    onDeleted();
    showSnack('Order deleted', () => restoreOrder(o, i));
  };
  const items = [
    ...Object.entries(shop.sizes).filter(([, z]) => z.price != null).map(([k, z]) => ({ k, name: z.name, price: z.price as number, grp: 'Bandanas' })),
    ...shop.products.flatMap(p => p.variants.filter(v => v.price).map(v => ({ k: v.id, name: v.name, price: v.price as number, grp: p.name }))),
  ];
  const grps = [...new Set(items.map(i => i.grp))];
  return (
    <>
      <DetailHero
        av={c ? <CustAv c={c} size={52} /> : <HeroAv letter={(o.title.trim()[0] || '?').toUpperCase()} />}
        name={c?.name}
        onOpenName={c && openCustomer ? () => openCustomer(c.id) : undefined}
        onName={c ? undefined : v => set({ title: v })}
        nameValue={o.title}
        namePlaceholder="Name this order"
        sub={c ? o.title : undefined}
        onSub={c ? v => set({ title: v }) : undefined}
        subPlaceholder="Name this order, like Fall restock"
        lines={[...(o.src ? [o.src] : []), <LinkText key="c" onPress={pickCustomer as any}>{c ? 'Change customer' : 'Choose a customer'}</LinkText>]}
      />
      <Strip items={[
        { v: String(pcs), l: Object.keys(prod).length ? 'items' : 'bandanas' },
        { v: money0(val), l: o.price != null ? 'agreed' : 'at list' },
        { v: st === 'plan' ? (f.fits ? 'Fits' : 'Tight') : st === 'making' ? 'Sewing' : st === 'ready' ? 'Ready' : 'Done', l: o.due ? dayLabel(o.due) : 'no date', color: st === 'plan' ? (f.fits ? t.success : t.warn) : undefined },
      ]} />

      {st === 'making' && r ? (
        <OStat title="In progress" sub={`${r.steps.filter(s => s.done).length} of ${r.steps.length} steps done · ${mins(leftMins(r))} left`}>
          <Button small kind="secondary" title="Open run" onPress={() => openRun(r.id)} />
        </OStat>
      ) : st === 'ready' ? (
        <OStat tone="ready" title="Ready to send" sub={o.fromStock.length ? 'Filled from stock. Pack it and mark it delivered.' : 'The run is finished. Pack it and mark it delivered.'}>
          {o.fromStock.length ? <Button small kind="secondary" title="Put back" onPress={() => unfill(o.id)} /> : null}
          <Button small title="Mark delivered" onPress={() => setSheet('deliver')} />
        </OStat>
      ) : st === 'delivered' ? (
        <OStat tone="done" title={`Delivered${o.deliveredAt ? ' ' + dayLabel(o.deliveredAt) : ''}`} sub={`${Object.entries(o.qty).filter(([, n]) => n).map(([k, n]) => `${n} ${itemName(shop, k)}`).join(' · ')} · ${sale ? money(saleTotal(sale)) + (saleOwed(sale) > 0 ? `, ${money(saleOwed(sale))} still owed` : ', paid') : money(val)}`}>
          {sale ? <Button small kind="secondary" title="Not delivered" onPress={() => { undoSale(sale.id); showSnack('Back to ready to send'); }} /> : null}
        </OStat>
      ) : null}

      {st !== 'delivered' ? (
        <Sect title="Due" right={o.due ? relDue(rel(o.due)) : undefined}>
          <DateChips value={o.due} days={[7, 9, 12, 13, 16, 20, 27]} fitDay={st === 'plan' && !f.fits ? f.byDay : null} onPick={d => set({ due: d })} onOther={() => setSheet('date')} />
        </Sect>
      ) : null}
      {inStock ? (
        <OStat tone="ready" title={`All ${pcs} are in stock`} sub="Fill it from finished stock and skip the run.">
          <Button small title="Fill from stock" onPress={() => { if (fillFromStock(o.id)) showSnack('Set aside from stock. Ready to send', () => unfill(o.id)); }} />
        </OStat>
      ) : null}
      {st === 'plan' ? (
        <FitCard
          ok={f.fits}
          title={!o.due ? 'Pick a due date' : f.fits ? 'Fits before ' + dayLabel(o.due) : 'Doesn’t fit before ' + dayLabel(o.due)}
          frac={(f.busy + f.need) / Math.max(1, f.cap)}
          text={`Needs about ${mins(f.need)}. Runs due first take ${mins(f.busy)} of your ${mins(f.cap)} free before then.${f.fits ? '' : f.byDay != null ? ' Or add free hours, or split the order.' : ' Add free hours or split the order.'}`}
          action={!f.fits && f.byDay != null && o.due ? <Button small title={`Move to ${dayLabel(addDaysIso(f.byDay))}`} onPress={() => set({ due: addDaysIso(f.byDay!) })} /> : undefined}
        />
      ) : null}

      <Sect title="What they want" right={`${money(val)} ${o.price != null ? 'agreed' : 'at list'}`}>
        {st === 'plan' ? (
          <>
            {grps.map(g => (
              <View key={g}>
                <Sublab>{g}</Sublab>
                <WList>
                  {items.filter(i => i.grp === g).map(i => (
                    <WRow key={i.k} title={i.name} bold={!!o.qty[i.k]} sub={`${money(i.price)} each`} right={<QtyStepper label={i.name} value={o.qty[i.k] || 0} onChange={n => set({ qty: { ...o.qty, [i.k]: n } })} />} />
                  ))}
                </WList>
              </View>
            ))}
            {!items.length ? <Note>Price your sizes in Settings first.</Note> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
              <Text style={{ flex: 1, fontSize: F.f14, color: t.text3 }}>Agreed a different price for the whole order?</Text>
              <NumField label="Agreed price" bare value={o.price} onChange={n => set({ price: n })} prefix="$" width={130} placeholder={orderWorth(shop, { ...o, price: null }).toFixed(2)} />
            </View>
          </>
        ) : (
          <>
            <WList>{Object.entries(o.qty).filter(([, n]) => n).map(([k, n]) => <WRow key={k} title={itemName(shop, k)} value={`${n} × ${money(shop.sizes[k]?.price ?? 0)}`} />)}</WList>
            <Note style={{ paddingHorizontal: 0 }}>Locked once it’s planned. Change sizes on the run.</Note>
          </>
        )}
        {c && c.dogs.length ? <Note>{c.dogs.map(d => `${d.name || 'Dog'}${d.neck ? ` · neck ${d.neck}″` : ''}${d.size ? ` · ${itemName(shop, d.size)}` : ''}`).join('  ·  ')}</Note> : null}
      </Sect>

      {st === 'plan' ? (
        <Sect title="Fabric">
          <WList>
            <WRow
              icon={fab ? <FabThumb f={fab} size={44} radius={12} /> : <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.sunken }} />}
              title={fab ? fab.name : 'Choose fabric'}
              bold
              sub={`Body · needs ${yd(need)}${fab ? (need > fab.yards ? ` · ${yd(need - fab.yards)} short` : ` · ${yd(fab.yards)} on the shelf`) : ''}`}
              onPress={() => setSheet('fabric')}
            />
          </WList>
        </Sect>
      ) : null}

      <Sect title="Notes">
        <WList>
          <TextInput accessibilityLabel="Notes" value={o.notes} onChangeText={v => set({ notes: v })} multiline placeholder="Shipping address, dog names, packaging" placeholderTextColor={t.text3}
            style={{ minHeight: 64, paddingVertical: 14, fontSize: F.f15, color: t.text, textAlignVertical: 'top' }} />
        </WList>
      </Sect>
      <Button kind="danger" title="Delete order" onPress={remove} />
      {st === 'plan' ? <Button title={pcs ? `Plan ${pcs} ${Object.keys(prod).length ? 'items' : 'bandanas'} as a run` : 'Add sizes to plan it'} disabled={!pcs} onPress={() => { const id = planOrder(o.id); if (id) openRun(id); }} /> : null}

      {sheet === 'deliver' ? <DeliverSheet o={o} onClose={() => setSheet(null)} /> : null}
      {sheet === 'date' ? <CalendarSheet title="Due" value={o.due} allowClear onPick={d => set({ due: d })} onClose={() => setSheet(null)} /> : null}
      {sheet === 'fabric' ? <FabricPicker title="Fabric for this order" value={o.fab} onPick={id => { set({ fab: id }); setSheet(null); }} onClose={() => setSheet(null)} /> : null}
    </>
  );
}
const addDaysIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
