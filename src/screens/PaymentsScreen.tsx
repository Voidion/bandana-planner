/* Payments, laid out like the prototype: overdue, waiting on payment, and paid sales by month, beside the sale —
   what's owed and when, what sold, payments received and the money. */
import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { dayLabel, money, money0, plural, relDue } from '../lib/format';
import { itemName, rel, todayDay } from '../lib/plan';
import { addCustomer, editSale, isLate, recordPayment, saleOwed, saleProfit, saleTotal, undoSale } from '../state/selling';
import { useShop } from '../state/store';
import type { Sale, Shop } from '../state/types';
import { BagIcon, CoinIcon, PlusIcon, ReceiptIcon, WalletIcon } from '../ui/icons';
import { Button, Chip, Empty, openMenuAt, showSnack } from '../ui/kit';
import { CalendarSheet, CustAv, DateChips, DetailHero, HeadBtn, LinkText, ListDetailPage, Note, OCard, OStat, Sect, Strip, WList } from '../ui/proto';
import { F, useTheme } from '../ui/theme';
import { PaySheet, RecordSaleSheet } from './SellingScreens';
import { ShopifyImport } from './ShopifyImport';

const units = (e: Sale) => Object.values(e.items || {}).reduce((a, b) => a + (b || 0), 0);
const paidDay = (e: Sale) => (e.pays.length ? e.pays[e.pays.length - 1].day : e.day);
export const saleWho = (s: Shop, e: Sale) => s.customers.find(c => c.id === e.cust)?.name || (e.ch === 'Shopify' && e.ref ? 'Shopify customer' : e.ch === 'Market' ? 'Market sale' : e.what || e.ch);
const dmd = (d: string | null | undefined) => (d ? dayLabel(d, { month: 'short', day: 'numeric' }) : '');

function SaleAv({ e, size }: { e: Sale; size: number }) {
  const shop = useShop();
  const t = useTheme();
  const c = shop.customers.find(x => x.id === e.cust);
  if (c) return <CustAv c={c} size={size} />;
  const s = Math.round(size * 0.45);
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.34), backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
      {e.ch === 'Shopify' ? <BagIcon color={t.text2} size={s} /> : e.ch === 'Market' ? <CoinIcon color={t.text2} size={s} /> : <ReceiptIcon color={t.text2} size={s} />}
    </View>
  );
}

export function PaymentsScreen({ sel, setSel, autoRecord, go }: { sel: string | null; setSel: (id: string | null) => void; autoRecord?: boolean; go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [rec, setRec] = useState(!!autoRecord);
  const [imp, setImp] = useState(false);
  const [pages, setPages] = useState(1);
  const L = shop.sales;
  const owedL = L.filter(e => saleOwed(e) > 0);
  const od = owedL.filter(isLate).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  const wait = owedL.filter(e => !isLate(e)).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const sum = owedL.reduce((a, e) => a + saleOwed(e), 0);
  const odSum = od.reduce((a, e) => a + saleOwed(e), 0);
  const month = todayDay().slice(0, 7);
  const thisM = L.reduce((a, e) => a + e.pays.filter(x => x.day.startsWith(month)).reduce((s2, x) => s2 + x.amt, 0), 0);
  const paid = L.filter(e => !saleOwed(e)).sort((a, b) => paidDay(b).localeCompare(paidDay(a)));
  const paidShown = paid.slice(0, 12 * pages);
  const months: [string, Sale[]][] = [];
  paidShown.forEach(e => {
    const d = paidDay(e);
    const k = d.startsWith(month) ? 'Paid this month' : dayLabel(d, { month: 'long', year: d.slice(0, 4) === month.slice(0, 4) ? undefined : 'numeric' });
    let g = months.find(x => x[0] === k);
    if (!g) months.push((g = [k, []]));
    g[1].push(e);
  });
  const all = [...od, ...wait, ...paid];
  const cur = L.find(e => e.id === sel) || all[0] || null;
  const card = (e: Sale) => {
    const ow = saleOwed(e);
    const late = isLate(e);
    const d = rel(e.due);
    return (
      <OCard key={e.id} on={cur?.id === e.id} onPress={() => setSel(e.id)} av={<SaleAv e={e} size={42} />} title={saleWho(shop, e)} value={money(ow || saleTotal(e))}
        sub={`${[e.ch, e.ref && e.ref !== saleWho(shop, e) ? e.ref : ''].filter(Boolean).join(' ')} · ${units(e) ? plural(units(e), 'item') : e.what || 'Sale'}${ow ? '' : ' · ' + dmd(paidDay(e))}`}
        chips={ow ? <>{late ? <Chip tone="warn" label={`${plural(-(d || 0), 'day')} late`} /> : e.due ? <Chip label={`Due ${dmd(e.due)}`} /> : <Chip label="No due date" />}{e.paid > 0 ? <Chip label={`Paid ${money0(e.paid)} of ${money0(saleTotal(e))}`} /> : null}</> : undefined}
        menu={[
          ow > 0 ? { label: `Paid in full (${money(ow)})`, onPress: () => recordPayment(e.id, ow) } : null,
          { label: 'Delete sale', danger: true, onPress: () => { undoSale(e.id); showSnack('Sale deleted. Its bandanas went back into stock'); } },
        ]} />
    );
  };
  const sec = (n: string, list: Sale[], sub: string) => (list.length ? <Sect key={n} big title={n} right={sub}><View style={{ gap: 8 }}>{list.map(card)}</View></Sect> : null);
  const list = L.length ? (
    <>
      <Strip items={[{ v: money0(sum), l: 'owed to you' }, { v: money0(odSum), l: 'overdue', color: odSum ? t.warn : undefined }, { v: money0(thisM), l: `paid in ${dayLabel(todayDay(), { month: 'short' })}` }]} />
      {sec('Overdue', od, money0(odSum))}
      {sec('Waiting on payment', wait, money0(wait.reduce((a, e) => a + saleOwed(e), 0)))}
      {!owedL.length ? <OStat tone="ready" title="Everyone’s paid up" sub="Sales recorded as Pay later wait here until they’re paid." /> : null}
      {months.map(([k, l]) => sec(k, l, money0(l.reduce((a, e) => a + saleTotal(e), 0))))}
      {paid.length > paidShown.length ? <Button small kind="ghost" title="Show older sales" style={{ alignSelf: 'center' }} onPress={() => setPages(p => p + 1)} /> : null}
      <Note>Shopify and market sales count as paid when you record them. Wholesale and consignment can wait on an invoice.</Note>
    </>
  ) : (
    <Empty icon={<WalletIcon color={t.action} size={30} />} title="No sales yet" body="Record a sale from a finished run, or import your Shopify orders. Anything not paid yet waits here until it is." action={<Button title="Record a sale" onPress={() => setRec(true)} />} />
  );
  return (
    <>
      <ListDetailPage title="Payments" sel={sel}
        right={<><HeadBtn label="Import from Shopify" onPress={() => setImp(true)}>{c => <BagIcon color={c} size={22} />}</HeadBtn><HeadBtn label="Record a sale" tint onPress={() => setRec(true)}>{c => <PlusIcon color={c} size={24} />}</HeadBtn></>}
        list={list} detail={cur ? <SaleDetail key={cur.id} e={cur} go={go} onDeleted={() => setSel(null)} /> : null} />
      {rec ? <RecordSaleSheet onClose={() => setRec(false)} /> : null}
      {imp ? <ShopifyImport onClose={() => setImp(false)} /> : null}
    </>
  );
}

function SaleDetail({ e, go, onDeleted }: { e: Sale; go?: (r: string, id?: string) => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [sheet, setSheet] = useState<null | 'part' | 'date'>(null);
  const ow = saleOwed(e);
  const tot = saleTotal(e);
  const late = isLate(e);
  const c = shop.customers.find(x => x.id === e.cust);
  const d = rel(e.due);
  const profit = saleProfit(e);
  const r = e.run ? shop.runs.find(x => x.id === e.run) : null;
  const items = Object.entries(e.items || {}).filter(([, n]) => n);
  const remind = () => {
    if (!c) return;
    const who = (c.contact || c.name).split(' ')[0];
    const what = (e.what || 'your order') + (e.ref ? ` (${e.ref})` : '');
    const when = e.due && (d ?? 0) < 0 ? 'was due ' + dayLabel(e.due, { month: 'long', day: 'numeric' }) : e.due ? 'is due ' + dayLabel(e.due, { month: 'long', day: 'numeric' }) : 'is still open';
    const body = `Hi ${who}, a quick reminder that ${money(ow)} for ${what} ${when}. ${shop.cfg.quote.pay || ''} Thank you! ${shop.shopName || 'Your shop'}`.replace(/\s+/g, ' ').trim();
    const url = c.email ? `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Payment for ' + what)}&body=${encodeURIComponent(body)}` : `sms:${String(c.phone).replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => showSnack('Couldn’t open your email app.'));
  };
  const pickCustomer = (ev: any) => {
    const n = ev?.nativeEvent || {};
    openMenuAt(n.pageX ?? 300, n.pageY ?? 200, [
      ...shop.customers.map(x => ({ label: x.name, onPress: () => editSale(e.id, { cust: x.id }) })),
      { label: 'New customer…', onPress: () => { const id = addCustomer(); editSale(e.id, { cust: id }); showSnack('Customer added. Fill them in under Customers'); } },
      e.cust ? { label: 'No customer', onPress: () => editSale(e.id, { cust: undefined }) } : null,
    ]);
  };
  const line = (l: string, v: string, o: { b?: boolean; c?: string } = {}) => (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, fontSize: F.f15, fontWeight: o.b ? '700' : '400', color: o.b ? t.text : t.text3 }}>{l}</Text>
      <Text style={{ fontSize: F.f15, fontWeight: o.b ? '700' : '400', color: o.c || t.text, fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
  return (
    <>
      <DetailHero av={<SaleAv e={e} size={52} />} name={saleWho(shop, e)} onOpenName={c && go ? () => go('customers', c.id) : undefined}
        lines={[`${[e.ch, e.ref && e.ref !== saleWho(shop, e) ? e.ref : ''].filter(Boolean).join(' ')} · ${dayLabel(e.day)}`, <LinkText key="c" onPress={pickCustomer as any}>{c ? 'Change customer' : 'Choose a customer'}</LinkText>]} />
      <Strip items={[{ v: money0(e.sub - (e.refund || 0)), l: 'sale' }, { v: money0(profit), l: 'profit', color: profit >= 0 ? t.success : t.danger }, { v: money0(e.paid || 0), l: 'received' }]} />
      {ow ? (
        <View style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: late ? t.warnTint : t.surface, borderWidth: late ? 0 : 1, borderColor: t.line }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: F.f15, fontWeight: '700', color: late ? t.onWarn : t.text }}>{late ? `${money(ow)} overdue` : `Waiting on ${money(ow)}`}</Text>
            <Text style={{ fontSize: F.f13, color: late ? t.onWarn : t.text3 }}>{late ? `Was due ${dmd(e.due)}, ${plural(-(d || 0), 'day')} ago` : e.due ? `Due ${dayLabel(e.due)}` : 'No due date set'}{e.paid > 0 ? ` · ${money(e.paid)} of ${money(tot)} paid` : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button small title={`Mark ${money0(ow)} paid`} style={{ flex: 1 }} onPress={() => { recordPayment(e.id, ow); showSnack(`${money(ow)} payment recorded`); }} />
            <Button small kind="secondary" title="Part payment" style={{ flex: 1 }} onPress={() => setSheet('part')} />
          </View>
          {c && (c.email || c.phone) ? <Button small kind="ghost" title="Send a reminder" style={{ alignSelf: 'flex-start' }} onPress={remind} /> : null}
        </View>
      ) : (
        <OStat tone="ready" title="Paid in full" sub={`${money(tot)}${e.pays.length ? ' · last payment ' + dmd(e.pays[e.pays.length - 1].day) : ''}`} />
      )}
      {ow ? (
        <Sect title="Due" right={e.due ? <Text style={{ fontSize: F.f14, fontWeight: '600', color: late ? t.warn : t.text3 }}>{relDue(d)}</Text> : undefined}>
          <DateChips value={e.due || null} days={[7, 14, 30]} onPick={day => editSale(e.id, { due: day })} onOther={() => setSheet('date')} />
        </Sect>
      ) : null}
      <Sect title="What sold" right={items.length ? plural(units(e), 'item') : undefined}>
        <WList>
          {items.length ? items.map(([k, n]) => <React.Fragment key={k}>{line(itemName(shop, k), String(n))}</React.Fragment>) : line('Items', 'Not recorded')}
          {r ? (
            <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: F.f15, color: t.text3 }}>From run</Text>
              <LinkText onPress={() => go?.('runs', r.id)}>{(r.name || 'Run').split(' — ')[0]}</LinkText>
            </View>
          ) : null}
        </WList>
      </Sect>
      {e.pays.length ? (
        <Sect title="Payments received" right={money(e.paid || 0)}>
          <WList>
            {[...e.pays].reverse().map((x, i) => (
              <View key={i} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, alignItems: 'center', borderRadius: 12, backgroundColor: t.bg, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: t.text3 }}>{dayLabel(x.day, { month: 'short' }).toUpperCase()}</Text>
                  <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>{+x.day.slice(8)}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: F.f16, color: t.text }}>{x.amt >= tot - 0.005 ? 'Paid in full' : 'Payment'}</Text>
                <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] }}>{money(x.amt)}</Text>
              </View>
            ))}
          </WList>
        </Sect>
      ) : null}
      <Sect title="Money">
        <WList>
          {line('Subtotal', money(e.sub))}
          {e.refund ? line('Refunded', '−' + money(e.refund), { c: t.danger }) : null}
          {e.ship ? line('Shipping charged', money(e.ship)) : null}
          {e.tax ? line('Sales tax collected', money(e.tax)) : null}
          {line('Customer pays in total', money(tot), { b: true })}
          {e.fees ? line('Payment fees', '−' + money(e.fees)) : null}
          {line('Materials', '−' + money(e.mat || 0))}
          {e.costs ? line('Booth and miles', '−' + money(e.costs)) : null}
          {line('Profit', money(profit), { b: true, c: profit >= 0 ? t.success : t.danger })}
        </WList>
        {e.ship || e.tax ? <Note style={{ paddingHorizontal: 0 }}>Shipping and sales tax pass through to the carrier and your state, so they aren’t profit.</Note> : null}
      </Sect>
      <Button kind="danger" title="Delete sale" onPress={() => { undoSale(e.id); onDeleted(); showSnack('Sale deleted. Its bandanas went back into stock'); }} />
      {sheet === 'part' ? <PaySheet e={e} onClose={() => setSheet(null)} /> : null}
      {sheet === 'date' ? <CalendarSheet title="Due" value={e.due || null} onPick={day => editSale(e.id, { due: day || undefined })} onClose={() => setSheet(null)} allowClear /> : null}
    </>
  );
}
