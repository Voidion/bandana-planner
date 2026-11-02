/* Settings › Pricing: profit target, card fees, shipping and monthly bills, and the price each size needs to hit the
   target (the prototype's own pricing maths). */
import React from 'react';
import { View } from 'react-native';
import { money, pct } from '../lib/format';
import { suggestedPrice, sync, unitMaterials } from '../lib/plan';
import { change, newId, useShop } from '../state/store';
import type { Bill } from '../state/types';
import { CloseIcon, PlusIcon } from '../ui/icons';
import { Button, Card, Chip, Field, IconButton, NumField, Row, Section, Segmented, Select, T } from '../ui/kit';
import { useTheme } from '../ui/theme';
import * as E from '../engine/engine';

export function PricingSettings() {
  const shop = useShop();
  const t = useTheme();
  const c = shop.cfg;
  sync(shop);
  const setCfg = (p: Partial<typeof c>) => change(s => ({ ...s, cfg: { ...s.cfg, ...p } }));
  const setBill = (id: string, p: Partial<Bill>) => change(s => ({ ...s, bills: s.bills.map(b => (b.id === id ? { ...b, ...p } : b)) }));
  const monthly = shop.bills.reduce((a, b) => a + (b.basis === 'year' ? b.amt / 12 : b.amt), 0);
  const sizes = Object.entries(shop.sizes).filter(([, z]) => z.cw && z.cl);
  return (
    <View style={{ gap: 26, maxWidth: 900 }}>
      <Section title="Prices for your target">
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <NumField label="Profit target" value={c.margin} onChange={n => setCfg({ margin: Math.min(90, Math.max(0, n ?? 75)) })} suffix="%" width={120} hint="Of the price, after costs" />
            <View style={{ gap: 4 }}><T s="label">Round up to</T><Select label="Round up to" width={140} value={String(c.round)} options={[['0.01', '1¢'], ['0.25', '25¢'], ['0.5', '50¢'], ['1', '$1']]} onChange={v => setCfg({ round: +v })} /></View>
          </View>
        </Card>
        {sizes.length ? (
          <Card pad={false} style={{ overflow: 'hidden' }}>
            <Row first style={{ minHeight: 34, paddingVertical: 6 }}>
              <T s="label" style={{ flex: 1 }}>Size</T>
              <T s="label" style={{ width: 100 }}>Notions</T>
              <T s="label" style={{ width: 100 }}>Materials</T>
              <T s="label" style={{ width: 100 }}>Suggested</T>
              <T s="label" style={{ width: 130 }}>Your price</T>
              <T s="label" style={{ width: 90 }}>Profit</T>
              <View style={{ width: 70 }} />
            </Row>
            {sizes.map(([k, z]) => {
              const sug = suggestedPrice(shop, k);
              const m = z.price ? E.marginOf(k) : null;
              return (
                <Row key={k}>
                  <T style={{ flex: 1, fontWeight: '600' }}>{z.name}</T>
                  <View style={{ width: 100 }}><NumField bare label={`${z.name} notions`} value={z.notions ?? 0.2} onChange={n => change(s => ({ ...s, sizes: { ...s.sizes, [k]: { ...s.sizes[k], notions: n ?? 0 } } }))} prefix="$" width={86} /></View>
                  <T style={{ width: 100 }}>{money(unitMaterials(shop, k) || 0)}</T>
                  <T style={{ width: 100, fontWeight: '600' }}>{money(sug)}</T>
                  <View style={{ width: 130 }}><NumField bare label={`${z.name} price`} value={z.price} onChange={n => change(s => ({ ...s, sizes: { ...s.sizes, [k]: { ...s.sizes[k], price: n } } }))} prefix="$" width={110} placeholder="–" /></View>
                  <View style={{ width: 90 }}>{m != null ? <Chip label={pct(m)} tone={m * 100 >= c.margin - 0.5 ? 'ok' : 'warn'} /> : null}</View>
                  <View style={{ width: 70 }}>{z.price !== sug ? <Button small kind="ghost" title="Use" onPress={() => change(s => ({ ...s, sizes: { ...s.sizes, [k]: { ...s.sizes[k], price: sug } } }))} /> : null}</View>
                </Row>
              );
            })}
          </Card>
        ) : <T s="sub">Add cut sizes in Sizes & mats to see prices.</T>}
        <T s="small">Notions are thread, tags and other bits for one bandana. Materials are fabric (at your average cost a yard), the strap, notions, and supplies used per bandana and per order. Suggested prices cover those, card fees and your monthly bills, then add your profit target. Time isn’t counted as a cost.</T>
      </Section>

      <Section title="Card fees">
        <Card style={{ gap: 14 }}>
          <Segmented label="Fees" value={c.fees.on ? 'on' : 'off'} onChange={v => setCfg({ fees: { ...c.fees, on: v === 'on' } })} options={[['on', 'Count card fees'], ['off', 'No fees']]} />
          {c.fees.on ? (
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <NumField label="Rate" value={c.fees.rate} onChange={n => setCfg({ fees: { ...c.fees, rate: n ?? 0 } })} suffix="%" width={110} />
              <NumField label="Plus per payment" value={c.fees.flat} onChange={n => setCfg({ fees: { ...c.fees, flat: n ?? 0 } })} prefix="$" width={130} />
              <NumField label="Bandanas per order" value={c.fees.perOrder} onChange={n => setCfg({ fees: { ...c.fees, perOrder: Math.max(1, n ?? 1) } })} width={140} hint="Spreads the per-payment fee" />
            </View>
          ) : null}
          <T s="small">Shopify and direct card sales pay the full rate; market sales assume about two thirds are by card.</T>
        </Card>
      </Section>

      <Section title="Shipping">
        <Card style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
          <NumField label="Free over" value={c.ship.threshold} onChange={n => setCfg({ ship: { ...c.ship, threshold: n ?? 0 } })} prefix="$" width={120} hint="0 = never free" />
          <NumField label="Otherwise charge" value={c.ship.charge} onChange={n => setCfg({ ship: { ...c.ship, charge: n ?? 0 } })} prefix="$" width={140} />
          <NumField label="A label costs you" value={c.ship.cost} onChange={n => setCfg({ ship: { ...c.ship, cost: n ?? 0 } })} prefix="$" width={140} />
        </Card>
      </Section>

      <Section title="Bundles" right={<T s="small">Deals you can put on a quote</T>}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shop.bundles.map((b, i) => (
            <Row key={b.id} first={i === 0}>
              <View style={{ flex: 1 }}><Field bare label="Bundle name" value={b.name} onChange={v => change(s => ({ ...s, bundles: s.bundles.map(x => (x.id === b.id ? { ...x, name: v } : x)) }))} /></View>
              {Object.entries(shop.sizes).filter(([, z]) => z.price != null).map(([k, z]) => (
                <NumField key={k} bare label={`${b.name} ${z.name}`} value={b.items[k] || 0} onChange={n => change(s => ({ ...s, bundles: s.bundles.map(x => (x.id === b.id ? { ...x, items: { ...x.items, [k]: Math.max(0, Math.round(n || 0)) } } : x)) }))} suffix={z.name.slice(0, 1)} width={64} />
              ))}
              <NumField bare label={`${b.name} price`} value={b.price} onChange={n => change(s => ({ ...s, bundles: s.bundles.map(x => (x.id === b.id ? { ...x, price: n ?? 0 } : x)) }))} prefix="$" width={96} />
              <IconButton label={`Remove ${b.name}`} onPress={() => change(s => ({ ...s, bundles: s.bundles.filter(x => x.id !== b.id) }))}>{cc => <CloseIcon color={cc} size={14} />}</IconButton>
            </Row>
          ))}
          <Row first={!shop.bundles.length} onPress={() => change(s => ({ ...s, bundles: [...s.bundles, { id: newId('bn'), name: 'New bundle', items: {}, price: 0, on: true }] }))}>
            <PlusIcon color={t.action} size={18} />
            <T color={t.action} style={{ fontWeight: '600' }}>Add a bundle</T>
          </Row>
        </Card>
      </Section>

      <Section title="On every quote">
        <Card style={{ gap: 12 }}>
          <Field label="Shop name" value={shop.shopName} onChange={v => change(s => ({ ...s, shopName: v }))} />
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 200 }}><Field label="Email" value={c.quote.email} onChange={v => setCfg({ quote: { ...c.quote, email: v } })} /></View>
            <View style={{ flex: 1, minWidth: 160 }}><Field label="Phone" value={c.quote.phone} onChange={v => setCfg({ quote: { ...c.quote, phone: v } })} /></View>
            <View style={{ flex: 1, minWidth: 160 }}><Field label="Instagram" value={c.quote.insta} onChange={v => setCfg({ quote: { ...c.quote, insta: v } })} placeholder="@" /></View>
            <View style={{ flex: 1, minWidth: 200 }}><Field label="Website" value={c.quote.site} onChange={v => setCfg({ quote: { ...c.quote, site: v } })} /></View>
          </View>
          <Field label="How to pay the deposit" value={c.quote.pay} onChange={v => setCfg({ quote: { ...c.quote, pay: v } })} placeholder="We’ll email you a Shopify invoice to pay by card." />
          <Field label="Good to know (one per line)" value={c.quote.notes.join('\n')} onChange={v => setCfg({ quote: { ...c.quote, notes: v.split('\n') } })} multiline />
        </Card>
      </Section>

      <Section title="Monthly bills" right={<T s="sub">{money(monthly)} a month · {money(E.overheadEach())} a bandana</T>}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shop.bills.map((b, i) => (
            <Row key={b.id} first={i === 0}>
              <View style={{ flex: 1 }}><Field bare label="Bill" value={b.name} onChange={v => setBill(b.id, { name: v })} /></View>
              <NumField bare label={`${b.name} amount`} value={b.amt} onChange={n => setBill(b.id, { amt: n ?? 0 })} prefix="$" width={110} />
              <Segmented bare label={`${b.name} basis`} value={b.basis} onChange={v => setBill(b.id, { basis: v })} options={[['month', 'a month'], ['year', 'a year']]} />
              <IconButton label={`Remove ${b.name}`} onPress={() => change(s => ({ ...s, bills: s.bills.filter(x => x.id !== b.id) }))}>{cc => <CloseIcon color={cc} size={14} />}</IconButton>
            </Row>
          ))}
          <Row first={!shop.bills.length} onPress={() => change(s => ({ ...s, bills: [...s.bills, { id: newId('b'), name: 'New bill', amt: 0, basis: 'month' }] }))}>
            <PlusIcon color={t.action} size={18} />
            <T color={t.action} style={{ fontWeight: '600' }}>Add a bill</T>
          </Row>
        </Card>
        <NumField label="Bandanas in a usual month" value={c.piecesPerMonth} onChange={n => setCfg({ piecesPerMonth: Math.max(1, Math.round(n ?? 80)) })} width={160} hint="Bills are spread across these" />
      </Section>
    </View>
  );
}
