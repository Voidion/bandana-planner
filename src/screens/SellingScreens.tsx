/* Selling pieces shared by Orders, Payments and Finished stock: record a sale, record a payment, mark an order delivered, pick a customer. */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { dayLabel, money } from '../lib/format';
import { addDays, itemPrice, todayDay } from '../lib/plan';
import { addCustomer, deliverOrder, freeStock, orderLabel, orderWorth, recordPayment, recordSale, saleOwed, undoSale } from '../state/selling';
import { useShop } from '../state/store';
import type { Channel, Order, Sale } from '../state/types';
import { Button, NumField, Row, Segmented, Select, Sheet, showSnack, Stepper, T } from '../ui/kit';
import { R, useTheme } from '../ui/theme';

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

export function PaySheet({ e, onClose }: { e: Sale; onClose: () => void }) {
  const [amt, setAmt] = useState<number | null>(saleOwed(e));
  return (
    <Sheet title="Record a payment" sub={`${money(saleOwed(e))} still owed`} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title={`Record ${money(amt || 0)}`} disabled={!(amt && amt > 0)} onPress={() => { recordPayment(e.id, amt!); onClose(); showSnack(`${money(amt!)} payment recorded`); }} /></>}>
      <NumField label="Amount" value={amt} onChange={setAmt} prefix="$" width={140} />
      <T s="small">Part payments are fine; the rest stays owed.</T>
    </Sheet>
  );
}


export function DeliverSheet({ o, onClose }: { o: Order; onClose: () => void }) {
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

