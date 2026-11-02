/* Quotes: build one from sizes and products, pick a deal and deposit, preview what the customer sees, save it as a PDF,
   send it (prices lock), then accept it into an order. */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { dayLabel, money, plural } from '../lib/format';
import { addDays, itemName, quoteTotals, rel, todayDay } from '../lib/plan';
import { quoteDoc, quotePdf } from '../lib/quoteDoc';
import { acceptQuote, addQuote, declineQuote, deleteQuote, editQuote, restoreQuote, sendQuote, unsendQuote } from '../state/quotes';
import { onDevice, openPath, revealFile, saveDocument } from '../state/storage';
import { useShop } from '../state/store';
import type { Quote } from '../state/types';
import { CloseIcon, DownloadIcon, PlusIcon, TrashIcon } from '../ui/icons';
import { Button, Card, Chip, Empty, Field, IconButton, NumField, Row, Section, Segmented, Select, Sheet, showSnack, Stepper, T } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';
import { CustomerSelect } from './SellingScreens';
import { EditIcon } from '../ui/icons';

const stageOf = (q: Quote) => (q.status === 'sent' ? ((rel(q.until) ?? 0) < 0 ? 'expired' : 'sent') : q.status);
const STAGE_LABEL: Record<string, string> = { draft: 'Drafts', sent: 'Waiting to hear', expired: 'Price ended', accepted: 'Accepted', declined: 'Declined' };

export function QuotesScreen({ sel, setSel, openOrder }: { sel: string | null; setSel: (id: string | null) => void; openOrder: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const cur = shop.quotes.find(q => q.id === sel) || shop.quotes[0] || null;
  const add = () => setSel(addQuote());
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: 340, borderRightWidth: 1, borderRightColor: t.line }}>
        <View style={{ padding: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T s="title">Quotes</T>
          <Button small title="New quote" icon={c => <PlusIcon color={c} size={16} />} onPress={add} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 4, gap: 16 }}>
          {!shop.quotes.length ? <Empty icon={<EditIcon color={t.action} size={26} />} title="No quotes yet" body="Price a custom or wholesale order, with deals and a deposit. Save it as a PDF to send, and accept it into an order when they say yes." action={<Button title="New quote" onPress={add} />} /> : null}
          {['draft', 'sent', 'expired', 'accepted', 'declined'].map(st => {
            const L = shop.quotes.filter(q => stageOf(q) === st);
            if (!L.length) return null;
            return (
              <Section key={st} title={`${STAGE_LABEL[st]} · ${L.length}`}>
                <Card pad={false} style={{ overflow: 'hidden' }}>
                  {L.map((q, i) => {
                    const c = shop.customers.find(x => x.id === q.cust);
                    const tt = quoteTotals(shop, q);
                    return (
                      <Row key={q.id} first={i === 0} selected={cur?.id === q.id} onPress={() => setSel(q.id)}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <T style={{ fontWeight: '600' }} numberOfLines={1}>{q.title || (c ? c.name : 'New quote')}</T>
                          <T s="sub" numberOfLines={1}>{q.no} · {plural(tt.n, 'item')}</T>
                        </View>
                        <T style={{ fontWeight: '600' }}>{money(tt.grand)}</T>
                      </Row>
                    );
                  })}
                </Card>
              </Section>
            );
          })}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>{cur ? <QuoteEditor key={cur.id} q={cur} openOrder={openOrder} onDeleted={() => setSel(null)} /> : null}</View>
    </View>
  );
}

function QuoteEditor({ q, openOrder, onDeleted }: { q: Quote; openOrder: (id: string) => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const tt = useMemo(() => quoteTotals(shop, q), [shop, q]);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const locked = q.status !== 'draft';
  const set = (p: Partial<Quote>) => editQuote(q.id, p);
  const sellables = [
    ...Object.entries(shop.sizes).filter(([, z]) => z.price != null).map(([k, z]) => ({ k, name: z.name, price: z.price! })),
    ...shop.products.flatMap(p => p.variants).filter(v => v.price != null).map(v => ({ k: v.id, name: v.name, price: v.price! })),
  ];
  const qtyOf = (k: string) => q.lines.filter(l => l.size === k).reduce((a, l) => a + l.qty, 0);
  const setQty = (k: string, n: number) => {
    const others = q.lines.filter(l => l.size !== k);
    const was = q.lines.find(l => l.size === k);
    set({ lines: n > 0 ? [...others, { size: k, qty: n, price: was ? was.price : null }] : others });
  };
  const savePdf = async () => {
    try {
      const c = shop.customers.find(x => x.id === q.cust);
      const name = `${q.no}${c ? ' ' + c.name : ''}.pdf`.replace(/[\\/:*?"<>|]+/g, '');
      const path = await saveDocument('Quotes', name, quotePdf(shop, q));
      setSaved(path);
      showSnack('Quote saved as a PDF');
      if (onDevice) openPath(path);
    } catch (e) {
      showSnack('Couldn’t save the PDF.');
    }
  };
  const remove = () => {
    const i = shop.quotes.findIndex(x => x.id === q.id);
    deleteQuote(q.id);
    onDeleted();
    showSnack(`${q.no} deleted`, () => restoreQuote(q, i));
  };
  const deals: [string, string][] = [['none', 'No deal'], ['b2g1half', 'Buy 2, get 1 half off'], ['spend150', 'Spend $150, $25 off'], ...shop.bundles.filter(b => b.on).map(b => ['bundle:' + b.id, `${b.name} · ${money(b.price)}`] as [string, string])];
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 20, maxWidth: 860 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label={`Quote ${q.no}`} value={q.title} onChange={v => set({ title: v })} placeholder="Fall restock" /></View>
        <Chip label={STAGE_LABEL[stageOf(q)].replace(/s$/, '')} tone={q.status === 'accepted' ? 'ok' : stageOf(q) === 'expired' ? 'warn' : q.status === 'sent' ? 'tint' : 'plain'} />
      </View>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <CustomerSelect value={q.cust} onChange={v => set({ cust: v })} />
        <View style={{ gap: 4 }}>
          <T s="label">Price holds until</T>
          <Select label="Price holds until" width={220} value={String(rel(q.until))} options={[...[7, 14, 21, 30, 45, 60].map(n => [String(n), `${dayLabel(addDays(todayDay(), n))} · ${n} days`] as [string, string]), ...(![7, 14, 21, 30, 45, 60].includes(rel(q.until)!) ? [[String(rel(q.until)), dayLabel(q.until)] as [string, string]] : [])]} onChange={v => set({ until: addDays(todayDay(), +v) })} />
        </View>
      </View>

      <Section title="What’s in it" right={locked ? <T s="small">Prices locked when it was sent</T> : undefined}>
        {sellables.length ? (
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {sellables.map((i, n) => {
              const line = q.lines.find(l => l.size === i.k);
              return (
                <Row key={i.k} first={n === 0}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>{i.name}</T>
                    <T s="sub">{line && line.price != null ? `${money(line.price)} agreed` : `${money(i.price)} each`}</T>
                  </View>
                  {qtyOf(i.k) && !locked ? <NumField bare label={`${i.name} price`} value={line?.price ?? null} onChange={pr => set({ lines: q.lines.map(l => (l.size === i.k ? { ...l, price: pr } : l)) })} prefix="$" width={96} placeholder={i.price.toFixed(2)} /> : null}
                  {locked ? <T style={{ fontWeight: '600' }}>{qtyOf(i.k)}</T> : <Stepper label={i.name} value={qtyOf(i.k)} onChange={v => setQty(i.k, v)} />}
                </Row>
              );
            })}
          </Card>
        ) : <T s="sub">Give your sizes a price in Settings › Pricing first.</T>}
      </Section>

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <View style={{ gap: 4 }}><T s="label">Deal</T><Select label="Deal" width={260} value={q.deal} options={deals} onChange={v => set({ deal: v })} /></View>
          <View style={{ gap: 4 }}><T s="label">Deposit</T><Select label="Deposit" width={140} value={String(q.deposit)} options={[['0', 'None'], ['25', '25%'], ['50', '50%'], ['100', 'Pay in full']]} onChange={v => set({ deposit: +v })} /></View>
          <Segmented label="Delivery" value={q.pickup ? 'pickup' : 'ship'} onChange={v => set({ pickup: v === 'pickup' })} options={[['ship', 'Ship it'], ['pickup', 'Pickup']]} />
        </View>
        <Field label="Note for this customer" value={q.notes} onChange={v => set({ notes: v })} multiline placeholder="Anything just for this quote" />
      </Card>

      {tt.n ? (
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: 240, gap: 8 }}>
            <T s="h2">They pay</T>
            {tt.disc ? <Line a="Subtotal" b={money(tt.gross)} /> : null}
            {tt.disc ? <Line a={tt.dname} b={'−' + money(tt.disc)} color={t.success} /> : null}
            <Line a={q.pickup ? 'Pickup' : 'Shipping'} b={q.pickup ? 'No charge' : tt.ship ? money(tt.ship) : 'Free'} />
            <Line a="Total" b={money(tt.grand)} bold />
            {q.deposit ? <Line a={`Deposit (${q.deposit}%)`} b={money((tt.grand * q.deposit) / 100)} /> : null}
          </Card>
          <Card style={{ flex: 1, minWidth: 240, gap: 8 }}>
            <T s="h2">You keep</T>
            <Line a="Materials" b={'−' + money(tt.mat)} />
            <Line a="Card fees" b={'−' + money(tt.fees)} />
            <Line a="Bills share" b={'−' + money(tt.over)} />
            {tt.label ? <Line a="Shipping label" b={'−' + money(tt.label)} /> : null}
            <Line a="Profit" b={money(tt.keep)} bold color={tt.keep >= 0 ? t.success : t.danger} />
            {tt.dead ? <T s="small" color={t.warn}>Just over the free-shipping line: a little less and they’d pay shipping, so you’d keep more.</T> : null}
          </Card>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button kind="secondary" title="Customer’s view" onPress={() => setPreview(true)} disabled={!tt.n} />
        <Button kind="secondary" title={onDevice ? 'Save PDF' : 'Download PDF'} icon={c => <DownloadIcon color={c} size={16} />} onPress={savePdf} disabled={!tt.n} />
        {q.status === 'draft' ? <Button title="Mark sent" disabled={!tt.n} onPress={() => { sendQuote(q.id); showSnack('Marked sent. Prices are locked', () => unsendQuote(q.id)); }} /> : null}
        {q.status === 'sent' ? <Button title="They accepted" onPress={() => { const oid = acceptQuote(q.id); if (oid) showSnack('Accepted. It’s now an order'); }} /> : null}
        {q.status === 'sent' ? <Button kind="ghost" title="Declined" onPress={() => declineQuote(q.id)} /> : null}
        {q.status === 'accepted' && q.order ? <Button title="Open the order" onPress={() => openOrder(q.order!)} /> : null}
        <View style={{ flex: 1 }} />
        <Button kind="danger" small title="Delete" icon={c => <TrashIcon color={c} size={14} />} onPress={remove} />
      </View>
      {saved && onDevice ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <T s="sub" style={{ flex: 1 }}>Saved in Documents › Bandana Planner › Quotes</T>
          <Button small kind="secondary" title="Show in folder" onPress={() => revealFile(saved)} />
        </View>
      ) : null}
      {preview ? <ClientView q={q} onClose={() => setPreview(false)} /> : null}
    </ScrollView>
  );
}

function Line({ a, b, bold, color }: { a: string; b: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
      <T style={{ fontWeight: bold ? '700' : '400' }} color={color}>{a}</T>
      <T style={{ fontWeight: bold ? '700' : '500', fontVariant: ['tabular-nums'] }} color={color}>{b}</T>
    </View>
  );
}

/** What the customer sees: the same content as the PDF */
function ClientView({ q, onClose }: { q: Quote; onClose: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const d = quoteDoc(shop, q);
  const ink = '#1B1B1E',
    mute = '#5E5E63';
  return (
    <Sheet title="Customer’s view" sub="This is what the PDF shows" onClose={onClose} width={640}>
      <ScrollView style={{ maxHeight: 560 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#8A4B0C', alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 20, fontWeight: '700' }} color="#fff">{(d.shop.trim()[0] || 'S').toUpperCase()}</T></View>
            <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }} color={ink}>{d.shop}</T><T s="small" color={mute}>Handmade dog bandanas</T></View>
            <View style={{ alignItems: 'flex-end' }}><T style={{ fontWeight: '700' }} color={ink}>Quote {d.no}</T><T s="small" color={mute}>{d.date}</T></View>
          </View>
          <T style={{ fontSize: 22, fontWeight: '700' }} color={ink}>{d.title}</T>
          {d.forWho ? <T s="sub" color={mute}>For {d.forWho}{d.attn ? ` · Attn: ${d.attn}` : ''}</T> : null}
          <View>
            {d.lines.map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEEEF0' }}>
                <T style={{ flex: 1 }} color={ink}>{l.name}</T>
                <T style={{ width: 40, textAlign: 'right' }} color={ink}>{l.qty}</T>
                <T style={{ width: 80, textAlign: 'right' }} color={mute}>{money(l.each)}</T>
                <T style={{ width: 90, textAlign: 'right', fontWeight: '600' }} color={ink}>{money(l.amount)}</T>
              </View>
            ))}
          </View>
          <View style={{ alignSelf: 'flex-end', width: 260, gap: 6 }}>
            {d.disc ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T color={mute}>Subtotal</T><T color={ink}>{money(d.gross)}</T></View> : null}
            {d.disc ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T color="#146C2E">{d.dname}</T><T color="#146C2E">−{money(d.disc)}</T></View> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T color={mute}>{d.shipLabel}</T><T color={ink}>{d.ship}</T></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEEEF0', paddingTop: 6 }}><T style={{ fontWeight: '700', fontSize: 17 }} color={ink}>Total</T><T style={{ fontWeight: '700', fontSize: 17 }} color={ink}>{money(d.total)}</T></View>
            {d.deposit ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontWeight: '600' }} color={ink}>Deposit ({d.deposit}%)</T><T style={{ fontWeight: '600' }} color={ink}>{money(d.dep)}</T></View> : null}
          </View>
          <View style={{ backgroundColor: '#FFF1E2', borderRadius: 10, padding: 12 }}><T style={{ fontWeight: '600' }} color={ink}>{d.until}</T></View>
          <View style={{ gap: 6 }}>
            <T style={{ fontWeight: '700' }} color={ink}>What happens next</T>
            {d.steps.map((s, i) => <T key={i} color={ink}>{i + 1}. {s}</T>)}
          </View>
          <View style={{ gap: 4 }}>
            <T style={{ fontWeight: '700' }} color={ink}>Good to know</T>
            {d.notes.map((n, i) => <T key={i} s="sub" color={mute}>• {n}</T>)}
          </View>
          {d.contacts.length ? <T s="small" color={mute}>{d.contacts.map(([n, v]) => `${n}: ${v}`).join('   ')}</T> : null}
        </View>
      </ScrollView>
    </Sheet>
  );
}

export { CloseIcon, IconButton, F, R, itemName };
