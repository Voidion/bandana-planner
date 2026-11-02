/* Reports, with the tax summary. */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as E from '../engine/engine';
import { dayLabel, money, money0, plural } from '../lib/format';
import { addDays, itemName, sync, todayDay } from '../lib/plan';
import { saleOwed, saleProfit } from '../state/selling';
import { useShop } from '../state/store';
import type { Sale, Shop } from '../state/types';
import { DocIcon, ReceiptIcon } from '../ui/icons';
import { LinkText, Note, PageHead, Sect, Strip, WList } from '../ui/proto';
import { Button, Card, Empty, Row, Segmented, T } from '../ui/kit';
import { F, shadow, useTheme } from '../ui/theme';

const short = (n: string) => (n || 'Untitled run').split(' — ')[0];
const units = (e: Sale) => Object.values(e.items).reduce((a, b) => a + b, 0);



/* ================= Reports (trends, reports, tax) ================= */
type Per = 'year' | '3m' | 'month' | 'lastYear';
function periodSales(shop: Shop, per: Per) {
  const today = todayDay();
  const y = today.slice(0, 4),
    m = today.slice(0, 7);
  const from3 = addDays(today, -91);
  return shop.sales.filter(e => (per === 'year' ? e.day.startsWith(y) : per === 'month' ? e.day.startsWith(m) : per === 'lastYear' ? e.day.startsWith(String(+y - 1)) : e.day >= from3) && e.day <= today);
}
const perMonths = (per: Per) => (per === 'year' ? new Date().getMonth() + 1 : per === '3m' ? 3 : per === 'month' ? 1 : 12);

export function ReportsScreen({ go }: { go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [per, setPer] = useState<Per>('year');
  const [tax, setTax] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const list = periodSales(shop, per);
  sync(shop);
  const s = E.sums(list.map(e => ({ ...e, d: 0 })));
  const bills = shop.bills.reduce((a, b) => a + (b.basis === 'year' ? b.amt / 12 : b.amt), 0) * perMonths(per);
  const after = s.profit - bills;
  const y = todayDay().slice(0, 4);
  const perName = per === 'year' ? `${y} so far` : per === '3m' ? 'Last 3 months' : dayLabel(todayDay(), { month: 'long' });
  const page = (inner: React.ReactNode) => (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 820, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>{inner}</View>
    </ScrollView>
  );
  if (tax)
    return page(
      <>
        <Pressable accessibilityRole="button" onPress={() => setTax(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' }}><T color={t.action} style={{ fontSize: 22, marginTop: -3 }}>‹</T><T color={t.action} style={{ fontWeight: '600', fontSize: F.f16 }}>Reports</T></Pressable>
        <PageHead title="Tax summary" />
        <Tax />
      </>,
    );
  if (!shop.sales.length)
    return page(
      <>
        <PageHead title="Reports" />
        <Empty icon={<DocIcon color={t.action} size={30} />} title="No sales yet" body="Record a sale or import your Shopify orders, and this shows sales and profit by month, channel, fabric, size and customer." action={<Button title="Go to Payments" onPress={() => go?.('sales')} />} />
      </>,
    );
  const agg = (key: (e: Sale) => string | null, splitItems?: boolean) => {
    const M: Record<string, { label: string; sales: number; profit: number; units: number }> = {};
    list.forEach(e => {
      if (splitItems) {
        const tot = units(e) || 1;
        Object.entries(e.items).forEach(([k, n]) => {
          const lab = itemName(shop, k);
          const m = (M[lab] = M[lab] || { label: lab, sales: 0, profit: 0, units: 0 });
          m.sales += ((e.sub - e.refund) * n) / tot;
          m.profit += (saleProfit(e) * n) / tot;
          m.units += n;
        });
        return;
      }
      const k = key(e);
      if (!k) return;
      const m = (M[k] = M[k] || { label: k, sales: 0, profit: 0, units: 0 });
      m.sales += e.sub - e.refund;
      m.profit += saleProfit(e);
      m.units += units(e);
    });
    return Object.values(M).sort((a, b) => b.sales - a.sales);
  };
  const block = (title: string, rows: ReturnType<typeof agg>, sub?: string) => {
    if (!rows.length) return null;
    const mx = Math.max(1, ...rows.map(r => r.sales));
    const shown = open[title] ? rows : rows.slice(0, 5);
    return (
      <Sect key={title} title={title} right={rows.length > 5 ? <LinkText onPress={() => setOpen(o => ({ ...o, [title]: !o[title] }))}>{open[title] ? 'Show fewer' : `Show all ${rows.length}`}</LinkText> : sub}>
        <WList>
          {shown.map(r => (
            <View key={r.label} style={{ paddingVertical: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T style={{ fontWeight: '700', fontSize: F.f15 }}>{r.label}</T>
                <T style={{ fontSize: F.f15, fontVariant: ['tabular-nums'] }}>{money0(r.sales)}</T>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ height: 8, borderRadius: 4, width: `${(r.sales / mx) * 100}%`, backgroundColor: t.barA }} /></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T s="sub" style={{ fontSize: F.f13 }}>{plural(r.units, 'item')}</T>
                <T s="sub" style={{ fontSize: F.f13 }}>{money0(r.profit)} profit · {r.sales ? Math.round((r.profit / r.sales) * 100) : 0}%</T>
              </View>
            </View>
          ))}
        </WList>
      </Sect>
    );
  };
  const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
  const salesBy = months.map(m => shop.sales.filter(e => e.day.startsWith(m)).reduce((a, e) => a + e.sub - e.refund, 0));
  const profBy = months.map(m => shop.sales.filter(e => e.day.startsWith(m)).reduce((a, e) => a + saleProfit(e), 0));
  const mx = Math.max(1, ...salesBy);
  const cm = new Date().getMonth();
  const line = (l: string, v: string, o: { b?: boolean; c?: string } = {}) => (
    <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center' }}>
      <T style={{ flex: 1, fontSize: F.f15, fontWeight: o.b ? '700' : '400' }} color={o.b ? t.text : t.text3}>{l}</T>
      <T style={{ fontSize: F.f15, fontWeight: o.b ? '700' : '400', fontVariant: ['tabular-nums'] }} color={o.c}>{v}</T>
    </View>
  );
  const custRows = agg(e => shop.customers.find(c => c.id === e.cust)?.name || null);
  return page(
    <>
      <PageHead sup={perName} title="Reports" />
      <Segmented fill label="Period" bare value={per} onChange={setPer} options={[['year', y], ['3m', '3 months'], ['month', dayLabel(todayDay(), { month: 'short' })]]} />
      <Strip items={[{ v: money0(s.sales), l: 'sales' }, { v: money0(s.profit), l: 'profit' }, { v: money0(after), l: 'after bills', color: after >= 0 ? t.success : t.danger }]} />
      <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 12 }, shadow(t.dark)]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T style={{ fontWeight: '700' }}>{y} by month</T>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.barB }} /><T s="sub" style={{ fontSize: F.f13 }}>Sales</T></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.action }} /><T s="sub" style={{ fontSize: F.f13 }}>Profit</T></View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 150 }}>
          {months.map((m, i) => (
            <View key={m} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 128 }}>
                <View style={{ width: 9, height: Math.max(salesBy[i] ? 2 : 0, (salesBy[i] / mx) * 128), borderRadius: 3, backgroundColor: i > cm ? t.sunken : t.barB }} />
                <View style={{ width: 9, height: Math.max(0, (Math.max(0, profBy[i]) / mx) * 128), borderRadius: 3, backgroundColor: t.action }} />
              </View>
              <T s="small" color={i === cm ? t.text : t.text3}>{dayLabel(m + '-01', { month: 'short' })}</T>
            </View>
          ))}
        </View>
      </View>
      <Sect title="Money" right={`${plural(s.n, 'sale')} · ${s.units} items`}>
        <WList>
          {line('Sales', money(s.sales))}
          {line('Payment fees', '−' + money(s.fees))}
          {line('Materials', '−' + money(s.mat))}
          {s.costs ? line('Market booth and miles', '−' + money(s.costs)) : null}
          {line('Profit', money(s.profit), { b: true })}
          {line(`Bills, ${plural(perMonths(per), 'month')}`, '−' + money(bills))}
          {line('Profit after bills', money(after), { b: true, c: after >= 0 ? t.success : t.danger })}
        </WList>
        <Note style={{ paddingHorizontal: 0 }}>Average sale {money(s.n ? s.sales / s.n : 0)}, {money(s.units ? s.profit / s.units : 0)} profit a bandana. Sales leave out shipping and sales tax.</Note>
      </Sect>
      {block('By channel', agg(e => e.ch))}
      {block('Top customers', custRows, custRows.length ? plural(custRows.length, 'customer') : undefined)}
      {block('By run', agg(e => (e.run ? short(shop.runs.find(r => r.id === e.run)?.name || 'Older run') : null)))}
      {block('By size and style', agg(() => null, true))}
      <Button kind="secondary" title="Tax summary" icon={c => <ReceiptIcon color={c} size={18} />} onPress={() => setTax(true)} />
    </>,
  );
}

const PER_OPTS: [Per, string][] = [['month', 'This month'], ['3m', '3 months'], ['year', 'This year'], ['lastYear', 'Last year']];

function Tax() {
  const shop = useShop();
  const t = useTheme();
  const [per, setPer] = useState<Per>('year');
  const list = periodSales(shop, per);
  const gross = list.reduce((a, e) => a + e.sub, 0);
  const refunds = list.reduce((a, e) => a + (e.refund || 0), 0);
  const ship = list.reduce((a, e) => a + (e.ship || 0), 0);
  const tax = list.reduce((a, e) => a + (e.tax || 0), 0);
  const fees = list.reduce((a, e) => a + (e.fees || 0), 0);
  const mat = list.reduce((a, e) => a + (e.mat || 0), 0);
  const costs = list.reduce((a, e) => a + (e.costs || 0), 0);
  const bills = shop.bills.reduce((a, b) => a + (b.basis === 'year' ? b.amt / 12 : b.amt), 0) * perMonths(per);
  const fabricBought = 0;
  const income = gross - refunds + ship;
  const net = income - fees - mat - costs - bills - shop.cfg.ship.cost * list.filter(e => e.ship > 0).length;
  const owed = list.reduce((a, e) => a + saleOwed(e), 0);
  const row = (a: string, b: number, o: { minus?: boolean; bold?: boolean; note?: string } = {}) => (
    <Row first={false}>
      <View style={{ flex: 1 }}><T style={{ fontWeight: o.bold ? '700' : '500' }}>{a}</T>{o.note ? <T s="small">{o.note}</T> : null}</View>
      <T style={{ fontWeight: o.bold ? '700' : '500', fontVariant: ['tabular-nums'] }}>{o.minus ? '−' : ''}{money(b)}</T>
    </Row>
  );
  return (
    <View style={{ gap: 18 }}>
      <Segmented label="Period" bare value={per} onChange={setPer} options={PER_OPTS} />
      <Card pad={false} style={{ overflow: 'hidden', maxWidth: 640 }}>
        <Row first><T s="h2" style={{ flex: 1 }}>Income</T></Row>
        {row('Gross sales', gross)}
        {row('Refunds', refunds, { minus: true })}
        {row('Shipping charged', ship)}
        {row('Total income', income, { bold: true })}
        <Row><T s="h2" style={{ flex: 1 }}>Costs</T></Row>
        {row('Card and platform fees', fees, { minus: true })}
        {row('Materials for what sold', mat, { minus: true, note: 'Fabric, straps, notions and supplies, at what you paid' })}
        {row('Booth and other sale costs', costs, { minus: true })}
        {row('Shipping labels', shop.cfg.ship.cost * list.filter(e => e.ship > 0).length, { minus: true, note: 'At your label cost in Settings › Pricing' })}
        {row('Bills', bills, { minus: true, note: 'Your monthly bills for this period' })}
        {row('Net profit', net, { bold: true })}
        <Row><T s="h2" style={{ flex: 1 }}>Kept separately</T></Row>
        {row('Sales tax collected', tax, { note: 'Not your income: it’s owed to the state' })}
        {row('Still owed to you', owed, { note: 'Counted in sales above' })}
      </Card>
      <T s="small" style={{ maxWidth: 640 }}>A summary to hand to whoever does your taxes, not tax advice. Materials are counted when bandanas sell; fabric still on the shelf isn’t a cost yet.{fabricBought ? '' : ''}</T>
    </View>
  );
}
