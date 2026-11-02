/* Orders, Sales and Customers. */
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { dayLabel, money, money0, plural, relDue } from '../lib/format';
import { addDays, itemName, itemPrice, rel, todayDay } from '../lib/plan';
import {
  addCustomer,
  addDog,
  addOrder,
  canFill,
  deleteCustomer,
  deleteDog,
  deleteOrder,
  deliverOrder,
  editCustomer,
  editDog,
  editOrder,
  fillFromStock,
  freeStock,
  isLate,
  orderCount,
  orderLabel,
  orderStage,
  orderWorth,
  planOrder,
  recordPayment,
  recordSale,
  restoreCustomer,
  restoreOrder,
  saleOwed,
  saleProfit,
  saleTotal,
  undoSale,
  unfill,
  type OrderStage,
} from '../state/selling';
import { useShop } from '../state/store';
import type { Channel, Customer, CustomerKind, Order, Sale } from '../state/types';
import { CloseIcon, PlusIcon, TrashIcon } from '../ui/icons';
import { Button, Card, Chip, Empty, Field, IconButton, NumField, Row, Section, Segmented, Select, Sheet, showSnack, Stepper, Swatch, T, TwoPane } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';
import { CartIcon, TagIcon, StoreIcon } from '../ui/icons';
import { ShopifyImport } from './ShopifyImport';
import { PhotoStrip } from './PhotosScreen';

const twoPane = (left: React.ReactNode, right: React.ReactNode, _t: any, sel?: string | null) => <TwoPane list={left} detail={right} sel={sel} />;
const Head = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <View style={{ padding: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <T s="title">{title}</T>
    {action}
  </View>
);

/** Everything you sell: sizes with a price, then product styles */
function useSellables() {
  const shop = useShop();
  return [
    ...Object.entries(shop.sizes).filter(([, z]) => z.price != null || z.cw).map(([k, z]) => ({ k, name: z.name, price: z.price })),
    ...shop.products.flatMap(p => p.variants).map(v => ({ k: v.id, name: v.name, price: v.price })),
  ];
}

function QtyRows({ q, setQ, limit }: { q: Record<string, number>; setQ: (q: Record<string, number>) => void; limit?: Record<string, number> }) {
  const t = useTheme();
  const items = useSellables().filter(i => !limit || (limit[i.k] || 0) > 0 || q[i.k]);
  if (!items.length) return <T s="sub">{limit ? 'Nothing in stock to sell yet.' : 'Add your sizes in Settings first.'}</T>;
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
      {items.map((i, n) => (
        <Row key={i.k} first={n === 0}>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontWeight: '600' }}>{i.name}</T>
            <T s="sub">{i.price != null ? money(i.price) : 'Not priced'}{limit ? ` · ${limit[i.k] || 0} in stock` : ''}</T>
          </View>
          <Stepper label={i.name} value={q[i.k] || 0} onChange={v => setQ({ ...q, [i.k]: limit ? Math.min(v, limit[i.k] || 0) : v })} />
        </Row>
      ))}
    </View>
  );
}

export function CustomerSelect({ value, onChange, width = 240 }: { value: string | null | undefined; onChange: (id: string | null) => void; width?: number }) {
  const shop = useShop();
  return (
    <View style={{ gap: 4 }}>
      <T s="label">Customer</T>
      <Select label="Customer" width={width} value={value || ''} options={[['', 'No customer'], ...shop.customers.map(c => [c.id, c.name, c.kind] as [string, string, string]), ['__new', 'New customer…']]}
        onChange={v => {
          if (v === '__new') {
            onChange(addCustomer());
            showSnack('Customer added. Fill them in under Customers');
          } else onChange(v || null);
        }} />
    </View>
  );
}

/* ================= sales ================= */
export function RecordSaleSheet({ onClose, cust }: { onClose: () => void; cust?: string }) {
  const shop = useShop();
  const t = useTheme();
  const free = freeStock(shop);
  const [ch, setCh] = useState<Channel>('Market');
  const [q, setQ] = useState<Record<string, number>>({});
  const [c, setC] = useState<string | null>(cust || null);
  const [day, setDay] = useState(0);
  const [pay, setPay] = useState<'now' | 'later'>('now');
  const [dueIn, setDueIn] = useState('14');
  const list = Object.entries(q).reduce((a, [k, n]) => a + n * (itemPrice(shop, k) || 0), 0);
  const [paid, setPaid] = useState<number | null>(null);
  const amount = paid ?? list;
  const n = Object.values(q).reduce((a, b) => a + b, 0);
  const orderSups = shop.supplies.filter(x => x.use === 'order');
  const [sup, setSup] = useState<Record<string, number>>({});
  const supN = (id: string) => sup[id] ?? (ch === 'Market' ? 0 : orderSups.find(x => x.id === id)?.per || 1);
  const go = () => {
    const id = recordSale({ ch, items: q, amount, cust: c, day: addDays(todayDay(), day), later: pay === 'later', dueIn: +dueIn, sup: Object.fromEntries(orderSups.map(x => [x.id, supN(x.id)])) });
    if (!id) return showSnack('Not enough in stock for that.');
    onClose();
    showSnack(`${money(amount)} sale recorded`, () => undoSale(id));
  };
  return (
    <Sheet title="Record a sale" sub="From finished stock" onClose={onClose} width={580} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title={n ? `Record ${money(amount)} sale` : 'Pick what sold'} disabled={!n} onPress={go} /></>}>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 14 }}>
        <Segmented label="Where it sold" value={ch} onChange={setCh} options={[['Market', 'Market'], ['Direct', 'Direct'], ['Wholesale', 'Wholesale'], ['Shopify', 'Shopify']]} />
        <QtyRows q={q} setQ={v => { setQ(v); setPaid(null); }} limit={free} />
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <CustomerSelect value={c} onChange={setC} />
          <Segmented label="When" value={String(day)} onChange={v => setDay(+v)} options={[['0', 'Today'], ['-1', 'Yesterday'], ['-2', dayLabel(addDays(todayDay(), -2), { weekday: 'short' })], ['-3', dayLabel(addDays(todayDay(), -3), { weekday: 'short' })]]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <View style={{ gap: 4 }}><T s="label">At your prices</T><T style={{ fontWeight: '600', paddingVertical: 8 }}>{money(list)}</T></View>
          <NumField label={pay === 'later' ? 'They owe' : 'They paid'} value={amount} onChange={setPaid} prefix="$" width={130} />
          {list - amount > 0.004 && n ? <T s="sub" color={t.success} style={{ paddingBottom: 10 }}>−{money(list - amount)} discount</T> : null}
        </View>
        {orderSups.length && ch !== 'Market' ? (
          <View style={{ gap: 6 }}>
            <T s="h2">Packaging used</T>
            {orderSups.map(x => (
              <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T style={{ flex: 1 }}>{x.name} <T s="sub">· {x.qty} on hand</T></T>
                <Stepper label={x.name} value={supN(x.id)} onChange={v => setSup({ ...sup, [x.id]: v })} />
              </View>
            ))}
          </View>
        ) : null}
        <Segmented label="Payment" value={pay} onChange={setPay} options={[['now', 'Paid now'], ['later', 'Pay later']]} />
        {pay === 'later' ? <Segmented label="Due in" value={dueIn} onChange={setDueIn} options={[['7', '7 days'], ['14', '14 days'], ['30', '30 days']]} /> : null}
        {pay === 'later' && !c ? <T s="small">Pick a customer so you know who owes it.</T> : null}
      </ScrollView>
    </Sheet>
  );
}

function PaySheet({ e, onClose }: { e: Sale; onClose: () => void }) {
  const [amt, setAmt] = useState<number | null>(saleOwed(e));
  return (
    <Sheet title="Record a payment" sub={`${money(saleOwed(e))} still owed`} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title={`Record ${money(amt || 0)}`} disabled={!(amt && amt > 0)} onPress={() => { recordPayment(e.id, amt!); onClose(); showSnack(`${money(amt!)} payment recorded`); }} /></>}>
      <NumField label="Amount" value={amt} onChange={setAmt} prefix="$" width={140} />
      <T s="small">Part payments are fine; the rest stays owed.</T>
    </Sheet>
  );
}

export function SalesScreen({ autoRecord }: { autoRecord?: boolean }) {
  const shop = useShop();
  const t = useTheme();
  const [rec, setRec] = useState(!!autoRecord);
  const [payFor, setPayFor] = useState<Sale | null>(null);
  const [f, setF] = useState<'all' | 'owed'>('all');
  const [imp, setImp] = useState(false);
  const list = [...shop.sales].sort((a, b) => b.day.localeCompare(a.day) || b.id.localeCompare(a.id));
  const owed = list.filter(e => saleOwed(e) > 0);
  const shown = f === 'owed' ? owed : list;
  const month = todayDay().slice(0, 7);
  const inMonth = list.filter(e => e.day.startsWith(month));
  const sum = (L: Sale[], fn: (e: Sale) => number) => L.reduce((a, e) => a + fn(e), 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 1040 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T s="title">Sales</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button kind="secondary" title="Import from Shopify" onPress={() => setImp(true)} />
          <Button title="Record a sale" icon={c => <PlusIcon color={c} size={16} />} onPress={() => setRec(true)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {[
          [dayLabel(todayDay(), { month: 'long' }) + ' sales', money0(sum(inMonth, e => e.sub - e.refund))],
          ['Profit this month', money0(sum(inMonth, saleProfit))],
          ['Bandanas sold', String(sum(inMonth, e => Object.values(e.items).reduce((a, b) => a + b, 0)))],
          ['Owed to you', money(sum(owed, saleOwed))],
        ].map(([l, v]) => (
          <Card key={l} style={{ flex: 1, minWidth: 170, gap: 2 }}>
            <T s="label">{l}</T>
            <T style={{ fontSize: F.f22, fontWeight: '700', fontVariant: ['tabular-nums'] }} color={l === 'Owed to you' && owed.some(isLate) ? t.warn : t.text}>{v}</T>
          </Card>
        ))}
      </View>
      <Segmented label="Show" bare value={f} onChange={setF} options={[['all', `All · ${list.length}`], ['owed', `Owed · ${owed.length}`]]} />
      {!shown.length ? (
        <Empty icon={<TagIcon color={t.action} size={26} />} title={f === 'owed' ? 'Nobody owes you anything' : 'No sales yet'} body="Sales come out of finished stock. Record market sales, direct sales and wholesale here; delivering an order records its sale too." action={f === 'all' ? <Button title="Record a sale" onPress={() => setRec(true)} /> : undefined} />
      ) : (
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shown.slice(0, 200).map((e, i) => {
            const c = shop.customers.find(x => x.id === e.cust);
            const ow = saleOwed(e);
            return (
              <Row key={e.id} first={i === 0}
                menu={[
                  ow > 0 ? { label: 'Record a payment', onPress: () => setPayFor(e) } : null,
                  ow > 0 ? { label: `Paid in full (${money(ow)})`, onPress: () => recordPayment(e.id, ow) } : null,
                  { label: 'Delete sale', danger: true, onPress: () => { undoSale(e.id); showSnack('Sale deleted. Its bandanas went back into stock'); } },
                ]}>
                <View style={{ width: 70 }}><T s="sub">{dayLabel(e.day, { month: 'short', day: 'numeric' })}</T></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: '600' }} numberOfLines={1}>{c ? c.name : e.what}{e.refund ? ' (refunded)' : ''}</T>
                  <T s="sub" numberOfLines={1}>{e.ch} · {Object.entries(e.items).map(([k, n]) => `${n} ${itemName(shop, k)}`).join(', ')}</T>
                </View>
                {ow > 0 ? <Chip label={isLate(e) ? `${money(ow)} late` : `${money(ow)} owed${e.due ? ' · ' + relDue(rel(e.due)).replace('Due ', '').toLowerCase() : ''}`} tone={isLate(e) ? 'bad' : 'warn'} /> : null}
                <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                  <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(saleTotal(e))}</T>
                  <T s="small">{money(saleProfit(e))} profit</T>
                </View>
                {ow > 0 ? <Button small kind="secondary" title="Paid" onPress={() => setPayFor(e)} /> : null}
                <IconButton label="Delete sale" onPress={() => { undoSale(e.id); showSnack('Sale deleted. Its bandanas went back into stock'); }}>{cc => <TrashIcon color={cc} size={15} />}</IconButton>
              </Row>
            );
          })}
        </Card>
      )}
      <T s="small">Profit here is the sale less fees and materials. Fees use your card rate from Settings › Pricing.</T>
      {rec ? <RecordSaleSheet onClose={() => setRec(false)} /> : null}
      {payFor ? <PaySheet e={payFor} onClose={() => setPayFor(null)} /> : null}
      {imp ? <ShopifyImport onClose={() => setImp(false)} /> : null}
    </ScrollView>
  );
}

/* ================= orders ================= */
const STAGES: [OrderStage, string][] = [['plan', 'To plan'], ['making', 'Being made'], ['ready', 'Ready to send'], ['delivered', 'Delivered']];

export function OrdersScreen({ sel, setSel, openRun }: { sel: string | null; setSel: (id: string | null) => void; openRun: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const cur = shop.orders.find(o => o.id === sel) || shop.orders.find(o => o.status !== 'delivered') || shop.orders[0] || null;
  const add = () => setSel(addOrder());
  const left = (
    <>
      <Head title="Orders" action={<Button small title="New order" icon={c => <PlusIcon color={c} size={16} />} onPress={add} />} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 4, gap: 16 }}>
        {!shop.orders.length ? <Empty icon={<CartIcon color={t.action} size={26} />} title="No orders yet" body="Custom requests, shop restocks and Shopify orders. Fill one from stock, or plan a run that makes it, then mark it delivered to record the sale." action={<Button title="New order" onPress={add} />} /> : null}
        {STAGES.map(([st, label]) => {
          const L = shop.orders.filter(o => orderStage(shop, o) === st).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
          if (!L.length) return null;
          return (
            <Section key={st} title={`${label} · ${L.length}`}>
              <Card pad={false} style={{ overflow: 'hidden' }}>
                {(st === 'delivered' ? L.slice(0, 30) : L).map((o, i) => {
                  const c = shop.customers.find(x => x.id === o.cust);
                  const d = rel(o.due);
                  return (
                    <Row key={o.id} first={i === 0} selected={cur?.id === o.id} onPress={() => setSel(o.id)}
                      menu={[
                        { label: 'Open', onPress: () => setSel(o.id) },
                        st === 'plan' && orderCount(o) ? { label: 'Plan a run for it', onPress: () => { const id = planOrder(o.id); if (id) openRun(id); } } : null,
                        st === 'plan' && canFill(shop, o) ? { label: 'Fill from stock', onPress: () => { if (fillFromStock(o.id)) showSnack('Set aside from stock', () => unfill(o.id)); } } : null,
                        st === 'ready' ? { label: 'Mark delivered (paid)', onPress: () => { const id = deliverOrder(o.id); if (id) showSnack('Delivered. Sale recorded', () => undoSale(id)); } } : null,
                        { label: 'Delete order', danger: true, onPress: () => { const i2 = shop.orders.findIndex(x => x.id === o.id); deleteOrder(o.id); showSnack('Order deleted', () => restoreOrder(o, i2)); } },
                      ]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T style={{ fontWeight: '600' }} numberOfLines={1}>{o.title || (c ? c.name : 'New order')}</T>
                        <T s="sub" numberOfLines={1}>{orderLabel(shop, o) || 'Nothing added yet'}</T>
                      </View>
                      {st !== 'delivered' && d != null ? <T s="small" color={d < 0 ? t.danger : t.text3}>{d < 0 ? relDue(d) : dayLabel(o.due, { month: 'short', day: 'numeric' })}</T> : null}
                    </Row>
                  );
                })}
              </Card>
            </Section>
          );
        })}
      </ScrollView>
    </>
  );
  return twoPane(left, cur ? <OrderDetail key={cur.id} o={cur} openRun={openRun} onDeleted={() => setSel(null)} /> : null, t, sel);
}

function OrderDetail({ o, openRun, onDeleted }: { o: Order; openRun: (id: string) => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const st = orderStage(shop, o);
  const c = shop.customers.find(x => x.id === o.cust);
  const r = o.run ? shop.runs.find(x => x.id === o.run) : null;
  const sale = shop.sales.find(e => e.order === o.id);
  const [deliver, setDeliver] = useState(false);
  const set = (p: Partial<Order>) => editOrder(o.id, p);
  const locked = st !== 'plan';
  const remove = () => {
    const i = shop.orders.findIndex(x => x.id === o.id);
    deleteOrder(o.id);
    onDeleted();
    showSnack('Order deleted', () => restoreOrder(o, i));
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 20, maxWidth: 820 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label="Order" value={o.title} onChange={v => set({ title: v })} placeholder={c ? c.name + '’s order' : 'Fall restock'} /></View>
        <Chip label={STAGES.find(s => s[0] === st)![1]} tone={st === 'ready' ? 'ok' : st === 'delivered' ? 'plain' : st === 'making' ? 'tint' : 'warn'} />
      </View>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <CustomerSelect value={o.cust} onChange={v => set({ cust: v })} />
        <View style={{ flex: 1, minWidth: 200 }}><Field label="Where it came from" value={o.src} onChange={v => set({ src: v })} placeholder="Email from Dana, Shopify #1042…" /></View>
      </View>
      <Section title="What they want" right={<T s="sub">{plural(orderCount(o), 'item')} · {money(orderWorth(shop, o))}</T>}>
        {locked ? <Card><T>{orderLabel(shop, o) || 'Nothing'}</T></Card> : <QtyRows q={o.qty} setQ={q => set({ qty: q })} />}
        {c && c.dogs.length ? <T s="small">{c.dogs.map(d => `${d.name || 'Dog'}${d.neck ? ` · neck ${d.neck}″` : ''}${d.size ? ` · ${itemName(shop, d.size)}` : ''}`).join('  ·  ')}</T> : null}
      </Section>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <View style={{ gap: 4 }}>
            <T s="label">Due</T>
            <Select label="Due" width={190} value={o.due ? String(rel(o.due)) : ''} options={[['', 'No date'], ...[3, 7, 10, 14, 21, 28, 42].map(n => [String(n), `${dayLabel(addDays(todayDay(), n))} · ${n}d`] as [string, string]), ...(o.due && ![3, 7, 10, 14, 21, 28, 42].includes(rel(o.due)!) ? [[String(rel(o.due)), dayLabel(o.due)] as [string, string]] : [])]} onChange={v => set({ due: v === '' ? null : addDays(todayDay(), +v) })} />
          </View>
          <View style={{ gap: 4 }}>
            <T s="label">Fabric</T>
            <Select label="Fabric" width={210} value={o.fab || ''} options={[['', 'Not chosen'], ...shop.fabrics.map(f => [f.id, f.name, `${f.yards} yd`] as [string, string, string])]} onChange={v => set({ fab: v || null })} />
          </View>
          <NumField label="Agreed price" value={o.price} onChange={n => set({ price: n })} prefix="$" width={130} placeholder={orderWorth(shop, { ...o, price: null }).toFixed(2)} />
        </View>
        <Field label="Notes" value={o.notes} onChange={v => set({ notes: v })} multiline placeholder="Names to embroider, colours, pickup…" />
      </Card>

      {st === 'plan' ? (
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button title="Plan a run for it" disabled={!orderCount(o)} onPress={() => { const id = planOrder(o.id); if (id) openRun(id); }} />
          {canFill(shop, o) ? <Button kind="secondary" title="Fill from stock" onPress={() => { if (fillFromStock(o.id)) showSnack('Set aside from stock. Ready to send', () => unfill(o.id)); }} /> : orderCount(o) ? <T s="small">Not enough in stock to fill it now.</T> : null}
        </View>
      ) : null}
      {r ? (
        <Row first onPress={() => openRun(r.id)} style={{ backgroundColor: t.surface, borderRadius: R.card }}>
          <Swatch color={shop.fabrics.find(f => f.id === r.body)?.color || t.sunken} size={32} />
          <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }}>{(r.name || 'Run').split(' — ')[0]}</T><T s="sub">{r.status === 'done' ? 'Finished' : r.status === 'active' ? `In progress · ${r.steps.filter(x => x.done).length} of ${r.steps.length} steps` : 'Draft'}</T></View>
        </Row>
      ) : null}
      {o.fromStock.length && st !== 'delivered' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T style={{ flex: 1 }}>Set aside from stock: {o.fromStock.map(l => `${l.n} ${itemName(shop, l.size)}`).join(', ')}</T>
          <Button small kind="ghost" title="Put back in stock" onPress={() => unfill(o.id)} />
        </View>
      ) : null}
      {st === 'ready' ? <Button title="Mark delivered" onPress={() => setDeliver(true)} style={{ alignSelf: 'flex-start' }} /> : null}
      {st === 'delivered' && sale ? (
        <Card style={{ gap: 6 }}>
          <T style={{ fontWeight: '700' }}>Delivered {dayLabel(o.deliveredAt)}</T>
          <T s="sub">{money(saleTotal(sale))} sale · {saleOwed(sale) > 0 ? `${money(saleOwed(sale))} still owed` : 'paid'}</T>
          <Button small kind="ghost" title="Undo delivery" onPress={() => { undoSale(sale.id); showSnack('Back to ready to send'); }} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}
      <Button kind="danger" small title="Delete order" icon={cc => <TrashIcon color={cc} size={14} />} onPress={remove} style={{ alignSelf: 'flex-start' }} />
      {deliver ? <DeliverSheet o={o} onClose={() => setDeliver(false)} /> : null}
    </ScrollView>
  );
}

function DeliverSheet({ o, onClose }: { o: Order; onClose: () => void }) {
  const shop = useShop();
  const [amt, setAmt] = useState<number | null>(orderWorth(shop, o));
  const [pay, setPay] = useState<'now' | 'later'>('now');
  const [dueIn, setDueIn] = useState('14');
  const [ship, setShip] = useState<number | null>(null);
  const go = () => {
    const id = deliverOrder(o.id, { amount: amt ?? 0, later: pay === 'later', dueIn: +dueIn, ship: ship ?? 0 });
    onClose();
    if (id) showSnack(`Delivered. ${money(amt ?? 0)} sale recorded`, () => undoSale(id));
  };
  return (
    <Sheet title="Mark delivered" sub={orderLabel(shop, o)} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Delivered" onPress={go} /></>}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <NumField label="For the bandanas" value={amt} onChange={setAmt} prefix="$" width={140} />
        <NumField label="Shipping charged" value={ship} onChange={setShip} prefix="$" width={140} placeholder="0.00" />
      </View>
      <Segmented label="Payment" value={pay} onChange={setPay} options={[['now', 'Paid'], ['later', 'They’ll pay later']]} />
      {pay === 'later' ? <Segmented label="Due in" value={dueIn} onChange={setDueIn} options={[['7', '7 days'], ['14', '14 days'], ['30', '30 days']]} /> : null}
      <T s="small">Records the sale in Sales and takes the order’s bandanas out of stock.</T>
    </Sheet>
  );
}

/* ================= customers ================= */
const KINDS: CustomerKind[] = ['Person', 'Shop', 'Consignment', 'Shopify', 'Custom'];

export function CustomersScreen({ sel, setSel, openOrder }: { sel: string | null; setSel: (id: string | null) => void; openOrder: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [q, setQ] = useState('');
  const list = shop.customers.filter(c => !q.trim() || (c.name + ' ' + c.contact + ' ' + c.dogs.map(d => d.name).join(' ')).toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const cur = shop.customers.find(c => c.id === sel) || list[0] || null;
  const add = () => setSel(addCustomer());
  const left = (
    <>
      <Head title="Customers" action={<Button small title="Add customer" icon={c => <PlusIcon color={c} size={16} />} onPress={add} />} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 4, gap: 12 }}>
        {shop.customers.length > 6 ? <Field label="Find" value={q} onChange={setQ} placeholder="Name, contact or dog" /> : null}
        {!shop.customers.length ? <Empty icon={<StoreIcon color={t.action} size={26} />} title="Add your first customer" body="People, shops and consignment partners, with their dogs’ neck sizes and the size each one wears." action={<Button title="Add customer" onPress={add} />} /> : (
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {list.map((c, i) => (
              <Row key={c.id} first={i === 0} selected={cur?.id === c.id} onPress={() => setSel(c.id)}
                menu={[
                  { label: 'Open', onPress: () => setSel(c.id) },
                  { label: 'New order for them', onPress: () => openOrder(addOrder({ cust: c.id })) },
                  c.email ? { label: 'Email', onPress: () => Linking.openURL('mailto:' + c.email).catch(() => {}) } : null,
                  { label: 'Delete customer', danger: true, onPress: () => { const i2 = shop.customers.findIndex(x => x.id === c.id); deleteCustomer(c.id); showSnack(`${c.name} deleted`, () => restoreCustomer(c, i2)); } },
                ]}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontWeight: '700' }} color={t.onTint}>{(c.name[0] || '?').toUpperCase()}</T></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: '600' }} numberOfLines={1}>{c.name}</T>
                  <T s="sub" numberOfLines={1}>{c.kind}{c.dogs.length ? ' · ' + c.dogs.map(d => d.name).filter(Boolean).join(', ') : ''}</T>
                </View>
              </Row>
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  );
  return twoPane(left, cur ? <CustomerDetail key={cur.id} c={cur} openOrder={openOrder} onDeleted={() => setSel(null)} /> : null, t, sel);
}

function CustomerDetail({ c, openOrder, onDeleted }: { c: Customer; openOrder: (id: string) => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const set = (p: Partial<Customer>) => editCustomer(c.id, p);
  const sales = shop.sales.filter(e => e.cust === c.id).sort((a, b) => b.day.localeCompare(a.day));
  const orders = shop.orders.filter(o => o.cust === c.id);
  const spent = sales.reduce((a, e) => a + saleTotal(e), 0);
  const owed = sales.reduce((a, e) => a + saleOwed(e), 0);
  const [rec, setRec] = useState(false);
  const remove = () => {
    const i = shop.customers.findIndex(x => x.id === c.id);
    deleteCustomer(c.id);
    onDeleted();
    showSnack(`${c.name} deleted`, () => restoreCustomer(c, i));
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 20, maxWidth: 820 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label="Name" value={c.name} onChange={v => set({ name: v })} /></View>
        <View style={{ gap: 4 }}><T s="label">Kind</T><Select label="Kind" width={160} value={c.kind} options={KINDS.map(k => [k, k] as [CustomerKind, string])} onChange={v => set({ kind: v })} /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[['Spent', money0(spent)], ['Orders', String(orders.length)], ['Owes you', money(owed)]].map(([l, v]) => (
          <Card key={l} style={{ flex: 1, gap: 2 }}><T s="label">{l}</T><T style={{ fontSize: F.f22, fontWeight: '700' }} color={l === 'Owes you' && owed > 0 ? t.warn : t.text}>{v}</T></Card>
        ))}
      </View>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {c.kind !== 'Person' ? <View style={{ flex: 1, minWidth: 200 }}><Field label="Contact" value={c.contact} onChange={v => set({ contact: v })} placeholder="Who you talk to" /></View> : null}
          <View style={{ flex: 1, minWidth: 200 }}><Field label="Email" value={c.email} onChange={v => set({ email: v })} /></View>
          <View style={{ flex: 1, minWidth: 160 }}><Field label="Phone" value={c.phone} onChange={v => set({ phone: v })} /></View>
          <View style={{ flex: 1, minWidth: 160 }}><Field label="Instagram" value={c.handle} onChange={v => set({ handle: v })} placeholder="@" /></View>
        </View>
        <Field label="Notes" value={c.notes} onChange={v => set({ notes: v })} multiline placeholder="How they like to pay, what prints they love…" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {c.email ? <Button small kind="secondary" title="Email" onPress={() => Linking.openURL('mailto:' + c.email).catch(() => {})} /> : null}
          {c.handle ? <Button small kind="secondary" title="Instagram" onPress={() => Linking.openURL('https://instagram.com/' + c.handle.replace(/^@/, '')).catch(() => {})} /> : null}
        </View>
      </Card>
      <Section title="Dogs" right={<Button small kind="ghost" title="Add a dog" icon={cc => <PlusIcon color={cc} size={14} />} onPress={() => addDog(c.id)} />}>
        {c.dogs.length ? c.dogs.map(d => {
          return (
            <Card key={d.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Field label="Name" value={d.name} onChange={v => editDog(c.id, d.id, { name: v })} width={150} />
              <Field label="Breed" value={d.breed} onChange={v => editDog(c.id, d.id, { breed: v })} width={150} />
              <NumField label="Neck" value={d.neck} onChange={n => editDog(c.id, d.id, { neck: n })} suffix="in" width={100} />
              <View style={{ gap: 4 }}>
                <T s="label">Size</T>
                <Select label={`${d.name || 'Dog'} size`} width={150} value={d.size || ''} options={[['', 'Not set'], ...Object.entries(shop.sizes).map(([k, z]) => [k, z.name] as [string, string])]} onChange={v => editDog(c.id, d.id, { size: v || null })} />
              </View>
              <IconButton label="Remove dog" onPress={() => deleteDog(c.id, d.id)}>{cc => <CloseIcon color={cc} size={14} />}</IconButton>
            </Card>
          );
        }) : <T s="sub">Add their dogs with neck size and the size they wear; orders for them show it.</T>}
      </Section>
      <PhotoStrip link={{ cust: c.id }} title="Photos of their dogs and orders" />
      <Section title="Orders" right={<Button small kind="ghost" title="New order" onPress={() => openOrder(addOrder({ cust: c.id }))} />}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {orders.length ? orders.map((o, i) => (
            <Row key={o.id} first={i === 0} onPress={() => openOrder(o.id)}>
              <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }}>{o.title || orderLabel(shop, o) || 'Order'}</T><T s="sub">{STAGES.find(s => s[0] === orderStage(shop, o))![1]}</T></View>
              <T s="sub">{money(orderWorth(shop, o))}</T>
            </Row>
          )) : <Row first><T s="sub">No orders yet.</T></Row>}
        </Card>
      </Section>
      <Section title="Sales" right={<Button small kind="ghost" title="Record a sale" onPress={() => setRec(true)} />}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {sales.length ? sales.slice(0, 50).map((e, i) => (
            <Row key={e.id} first={i === 0}>
              <T s="sub" style={{ width: 70 }}>{dayLabel(e.day, { month: 'short', day: 'numeric' })}</T>
              <T style={{ flex: 1 }} numberOfLines={1}>{Object.entries(e.items).map(([k, n]) => `${n} ${itemName(shop, k)}`).join(', ')}</T>
              {saleOwed(e) > 0 ? <Chip label={`${money(saleOwed(e))} owed`} tone="warn" /> : null}
              <T style={{ fontWeight: '600' }}>{money(saleTotal(e))}</T>
            </Row>
          )) : <Row first><T s="sub">No sales yet.</T></Row>}
        </Card>
      </Section>
      <Button kind="danger" small title="Delete customer" icon={cc => <TrashIcon color={cc} size={14} />} onPress={remove} style={{ alignSelf: 'flex-start' }} />
      {rec ? <RecordSaleSheet cust={c.id} onClose={() => setRec(false)} /> : null}
    </ScrollView>
  );
}

export { Pressable, useMemo };
