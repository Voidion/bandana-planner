/* Quotes, laid out like the prototype: grouped cards beside the quote — who it's for, the receipt, items, what it
   leaves you, delivery, deal and deposit. Preview what the client sees, save it as a PDF, send it (prices lock). */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { dayLabel, mins, money, money0, plural, relDue, yd } from '../lib/format';
import { addDays, computePlan, itemName, quoteTotals, rel, todayDay } from '../lib/plan';
import { quoteDoc, quotePdf } from '../lib/quoteDoc';
import { acceptQuote, addQuote, declineQuote, deleteQuote, editQuote, restoreQuote, sendQuote, unsendQuote } from '../state/quotes';
import { addCustomer } from '../state/selling';
import { onDevice, openPath, revealFile, saveDocument } from '../state/storage';
import { useShop } from '../state/store';
import type { Quote } from '../state/types';
import { DownloadIcon, PlusIcon, PriceIcon, ShelfIcon } from '../ui/icons';
import { Button, Chip, Empty, openMenuAt, Segmented, Sheet, showSnack, T } from '../ui/kit';
import { CalendarSheet, CustAv, DateChips, DetailHero, HeadBtn, HeroAv, LinkText, ListDetailPage, Note, OCard, OStat, QtyStepper, Sect, Strip, Sublab, WList, WRow } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';

type Stage = 'out' | 'exp' | 'draft' | 'accepted' | 'declined';
const stageOf = (q: Quote): Stage => (q.status === 'sent' ? ((rel(q.until) ?? 0) < 0 ? 'exp' : 'out') : q.status);
const dmd = (day: string | null) => (day ? dayLabel(day, { month: 'short', day: 'numeric' }) : '');

export function QuotesScreen({ sel, setSel, openOrder, openCustomer }: { sel: string | null; setSel: (id: string | null) => void; openOrder: (id: string) => void; openCustomer?: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const by = (k: Stage) => shop.quotes.filter(q => stageOf(q) === k);
  const until = (q: Quote) => rel(q.until) ?? 0;
  const groups: [Stage, string, Quote[]][] = [
    ['out', 'Waiting on them', by('out').sort((a, b) => until(a) - until(b))],
    ['exp', 'Expired', by('exp').sort((a, b) => until(b) - until(a))],
    ['draft', 'Drafts', by('draft')],
    ['accepted', 'Accepted', by('accepted')],
    ['declined', 'Declined', by('declined')],
  ];
  const cur = shop.quotes.find(q => q.id === sel) || groups.find(g => g[2].length)?.[2][0] || null;
  const add = () => setSel(addQuote());
  const total = (q: Quote) => quoteTotals(shop, q).grand || 0;
  const who = (q: Quote) => shop.customers.find(c => c.id === q.cust)?.name || q.title || 'New quote';
  const out = by('out');
  const decided = shop.quotes.filter(q => ['accepted', 'declined', 'exp'].includes(stageOf(q)));
  const won = decided.filter(q => q.status === 'accepted').length;
  const card = (q: Quote) => {
    const st = stageOf(q);
    const u = until(q);
    const c = shop.customers.find(x => x.id === q.cust);
    const n = q.lines.reduce((a, l) => a + l.qty, 0);
    const chip =
      st === 'out' ? (u <= 3 ? <Chip tone="warn" label={u === 0 ? 'Expires today' : u === 1 ? 'Expires tomorrow' : `Expires in ${u} days`} /> : <Chip label={`Holds to ${dmd(q.until)}`} />)
      : st === 'exp' ? <Chip tone="warn" label={`Expired ${dmd(q.until)}`} />
      : st === 'draft' ? <Chip label="Not sent yet" />
      : st === 'accepted' ? (q.order ? <Chip tone="ok" label="Order made" /> : <Chip tone="tint" label="Ready to order" />)
      : <Chip label={`Declined${q.dec ? ' ' + dmd(q.dec) : ''}`} />;
    return (
      <OCard key={q.id} on={cur?.id === q.id} onPress={() => setSel(q.id)}
        av={<CustAv c={c} name={q.title || '?'} size={42} />}
        title={who(q)}
        value={money0(total(q))}
        sub={`${c && q.title ? q.title + ' · ' : ''}${n ? plural(n, 'bandana') : 'Nothing added yet'}`}
        chips={<>{chip}<Text style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: F.f13, color: t.text3, fontVariant: ['tabular-nums'] }}>{q.no}</Text></>}
        menu={[
          { label: 'Open', onPress: () => setSel(q.id) },
          { label: 'Duplicate', onPress: () => setSel(addQuote({ cust: q.cust, title: q.title, lines: q.lines.map(l => ({ ...l, price: null })), deal: q.deal, deposit: q.deposit, pickup: q.pickup })) },
          q.status === 'sent' ? { label: 'They said yes', onPress: () => { if (acceptQuote(q.id)) showSnack('Accepted. It’s now an order'); } } : null,
          { label: 'Delete quote', danger: true, onPress: () => { const i = shop.quotes.findIndex(x => x.id === q.id); deleteQuote(q.id); showSnack(`${q.no} deleted`, () => restoreQuote(q, i)); } },
        ]}
      />
    );
  };
  const list = shop.quotes.length ? (
    <>
      <Strip items={[
        { v: money0(out.reduce((a, q) => a + total(q), 0)), l: 'waiting on' },
        { v: String(out.filter(q => until(q) <= 7).length), l: 'ending soon', color: out.some(q => until(q) <= 7) ? t.warn : undefined },
        { v: decided.length ? Math.round((won / decided.length) * 100) + '%' : '–', l: 'said yes' },
      ]} />
      {groups.map(([k, n, L]) =>
        L.length ? (
          <Sect key={k} big title={n} right={`${L.length}${k === 'out' ? ' · ' + money0(L.reduce((a, q) => a + total(q), 0)) : ''}`}>
            <View style={{ gap: 8 }}>{L.map(card)}</View>
          </Sect>
        ) : null,
      )}
    </>
  ) : (
    <Empty icon={<PriceIcon color={t.action} size={30} />} title="No quotes yet" body="Send a client a price for a batch. The app applies your bundles, shipping and deposit, and you can save it as a PDF." action={<Button title="New quote" onPress={add} />} />
  );
  return (
    <ListDetailPage title="Quotes" sel={sel} right={<HeadBtn label="New quote" tint onPress={add}>{c => <PlusIcon color={c} size={24} />}</HeadBtn>} list={list}
      detail={cur ? <QuoteEditor key={cur.id} q={cur} openOrder={openOrder} openCustomer={openCustomer} onDeleted={() => setSel(null)} /> : null} />
  );
}

function QuoteEditor({ q, openOrder, openCustomer, onDeleted }: { q: Quote; openOrder: (id: string) => void; openCustomer?: (id: string) => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const tt = useMemo(() => quoteTotals(shop, q), [shop, q]);
  const [sheet, setSheet] = useState<null | 'preview' | 'date'>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const st = stageOf(q);
  const u = rel(q.until) ?? 0;
  const edit = st === 'draft' || st === 'out' || st === 'exp';
  const c = shop.customers.find(x => x.id === q.cust);
  const o = q.order ? shop.orders.find(x => x.id === q.order) : null;
  const set = (p: Partial<Quote>) => editQuote(q.id, p);
  const pay = shop.cfg.payLabor;
  const sellables = [
    ...Object.entries(shop.sizes).filter(([, z]) => z.price != null).map(([k, z]) => ({ k, name: z.name, price: z.price!, grp: 'Bandanas' })),
    ...shop.products.flatMap(p => p.variants.filter(v => v.price != null).map(v => ({ k: v.id, name: v.name, price: v.price!, grp: p.name }))),
  ];
  const priceNow = (k: string) => sellables.find(i => i.k === k)?.price ?? 0;
  const qtyOf = (k: string) => q.lines.filter(l => l.size === k).reduce((a, l) => a + l.qty, 0);
  const setQty = (k: string, n: number) => {
    const others = q.lines.filter(l => l.size !== k);
    const was = q.lines.find(l => l.size === k);
    set({ lines: n > 0 ? [...others, { size: k, qty: n, price: was ? was.price : st === 'draft' ? null : priceNow(k) }] : others });
  };
  /* your prices moved since it was sent */
  const drift = edit && q.status === 'sent' ? q.lines.filter(l => l.price != null && Math.abs(l.price - priceNow(l.size)) >= 0.005) : [];
  /* fabric this would take, at your average price */
  const fabNeed = useMemo(() => {
    if (!edit) return null;
    const qty: Record<string, number> = {};
    q.lines.forEach(l => { if (shop.sizes[l.size]) qty[l.size] = (qty[l.size] || 0) + l.qty; });
    const pcs = Object.values(qty).reduce((a, b) => a + b, 0);
    if (!pcs) return null;
    const f0 = shop.fabrics.find(f => !f.offcut);
    const yards = computePlan(shop, { qty, body: f0 ? f0.id : null, ties: f0 ? f0.id : null }).needs.reduce((a, n) => a + n.yards, 0);
    const fabs = shop.fabrics.filter(f => !f.offcut && f.cost > 0);
    const avg = fabs.length ? fabs.reduce((a, f) => a + f.cost, 0) / fabs.length : 8.5;
    return { pcs, yards, cost: yards * avg, shelf: shop.fabrics.filter(f => !f.offcut).reduce((a, f) => a + f.yards, 0) };
  }, [shop, q.lines, edit]);
  const pickCustomer = (e: any) => {
    const n = e?.nativeEvent || {};
    openMenuAt(n.pageX ?? 300, n.pageY ?? 200, [
      ...shop.customers.map(x => ({ label: x.name, onPress: () => set({ cust: x.id }) })),
      { label: 'New customer…', onPress: () => { const id = addCustomer(); set({ cust: id }); showSnack('Customer added. Fill them in under Customers'); } },
      q.cust ? { label: 'No customer', onPress: () => set({ cust: null }) } : null,
    ]);
  };
  const savePdf = async () => {
    try {
      const name = `${q.no}${c ? ' ' + c.name : ''}.pdf`.replace(/[\\/:*?"<>|]+/g, '');
      const path = await saveDocument('Quotes', name, quotePdf(shop, q));
      setSaved(path);
      showSnack('Quote saved as a PDF');
      if (onDevice) openPath(path);
    } catch {
      showSnack('Couldn’t save the PDF.');
    }
  };
  const remove = () => {
    const i = shop.quotes.findIndex(x => x.id === q.id);
    deleteQuote(q.id);
    onDeleted();
    showSnack(`${q.no} deleted`, () => restoreQuote(q, i));
  };
  const holdLeft = u < 0 ? `ended ${dmd(q.until)}` : u === 0 ? 'holds until today' : u === 1 ? 'holds 1 more day' : `holds ${u} more days`;
  const deals: [string, string][] = [['none', 'No deal'], ['b2g1half', 'Buy 2, get 1 half off'], ['spend150', 'Spend $150, $25 off'], ...shop.bundles.filter(b => b.on).map(b => ['bundle:' + b.id, b.name] as [string, string])];
  const grps = [...new Set(sellables.map(i => i.grp))];
  return (
    <>
      <DetailHero
        av={c ? <CustAv c={c} size={52} /> : <HeroAv letter={(q.title.trim()[0] || '?').toUpperCase()} />}
        name={c?.name}
        onOpenName={c && openCustomer ? () => openCustomer(c.id) : undefined}
        onName={c ? undefined : v => set({ title: v })}
        nameValue={q.title}
        namePlaceholder="Name this quote"
        sub={c ? q.title : undefined}
        onSub={c ? v => set({ title: v }) : undefined}
        subPlaceholder="Name this quote, like Holiday restock"
        lines={[`${q.no || 'Quote'} · made ${dmd(q.made)}`, <LinkText key="c" onPress={pickCustomer as any}>{c ? 'Change customer' : 'Choose a customer'}</LinkText>]}
      />
      <Strip items={[
        { v: String(tt.n), l: q.lines.some(l => !shop.sizes[l.size]) ? 'items' : 'bandanas' },
        { v: money0(tt.grand), l: 'total' },
        pay ? { v: money(tt.perHr), l: 'per hour', color: tt.perHr >= shop.laborRate ? t.success : t.warn } : { v: money0(tt.keep), l: 'profit', color: tt.keep >= 0 ? t.success : t.danger },
      ]} />

      {st === 'draft' ? (
        <OStat title="Draft" sub={`Not sent yet. Price holds until ${dmd(q.until)} once it goes out.`} />
      ) : st === 'out' ? (
        <View style={[{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.surface }, shadow(t.dark)]}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>Waiting on {who(q, shop)}</Text>
            <Text style={{ fontSize: F.f13, color: t.text3 }}>Sent {dmd(q.sent || q.made)} · price {holdLeft}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button small title="They said yes" style={{ flex: 1 }} onPress={() => { if (acceptQuote(q.id)) showSnack('Accepted. It’s now an order'); }} />
            <Button small kind="secondary" title="They said no" style={{ flex: 1 }} onPress={() => { declineQuote(q.id); set({ dec: todayDay() }); }} />
          </View>
        </View>
      ) : st === 'exp' ? (
        <View style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.warnTint }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.onWarn }}>Expired {dmd(q.until)}</Text>
            <Text style={{ fontSize: F.f13, color: t.onWarn }}>Extend it and resend, or mark how it went.</Text>
          </View>
          <Button small title="Extend 2 weeks" onPress={() => set({ until: addDays(todayDay(), 14) })} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button small kind="secondary" title="They said yes" style={{ flex: 1 }} onPress={() => { if (acceptQuote(q.id)) showSnack('Accepted. It’s now an order'); }} />
            <Button small kind="secondary" title="They said no" style={{ flex: 1 }} onPress={() => { declineQuote(q.id); set({ dec: todayDay() }); }} />
          </View>
        </View>
      ) : st === 'accepted' ? (
        <OStat tone="ready" title={`Accepted${q.acc ? ' ' + dmd(q.acc) : ''}`} sub={o ? `Order made · ${o.due ? relDue(rel(o.due)).toLowerCase() : 'no due date yet'}` : 'The order was removed.'}>
          {o ? <Button small kind="secondary" title="Open order" onPress={() => openOrder(o.id)} /> : null}
        </OStat>
      ) : (
        <OStat tone="done" title={`Declined${q.dec ? ' ' + dmd(q.dec) : ''}`} sub={`${money(tt.grand)} · ${plural(tt.n, 'bandana')}`}>
          <Button small kind="secondary" title="Reopen" onPress={() => set({ status: 'sent', dec: undefined })} />
        </OStat>
      )}

      {edit ? (
        <Sect title="Price holds until" right={<Text style={{ fontSize: F.f14, fontWeight: '600', color: u < 0 ? t.warn : t.text3 }}>{u < 0 ? 'Ended ' + dmd(q.until) : u === 0 ? 'Ends today' : `${plural(u, 'day')} from today`}</Text>}>
          <DateChips value={q.until} days={[7, 14, 21, 30, 45]} onPick={d => set({ until: d })} onOther={() => setSheet('date')} />
        </Sect>
      ) : null}
      {fabNeed ? (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: t.sunken }}>
          <ShelfIcon color={t.text2} size={20} />
          <Text style={{ flex: 1, fontSize: F.f14, lineHeight: 20, color: t.text }}>
            <Text style={{ fontWeight: '700' }}>About {yd(fabNeed.yards)} of fabric</Text> for {plural(fabNeed.pcs, 'bandana')}, roughly {money(fabNeed.cost)} at your average price.{fabNeed.yards > fabNeed.shelf ? ` That’s more than the ${yd(fabNeed.shelf)} on your shelf.` : ''}
          </Text>
        </View>
      ) : null}

      {/* the receipt */}
      <View style={[{ backgroundColor: t.surface, borderRadius: 24, padding: 20 }, shadow(t.dark), { borderWidth: t.dark ? 0 : 1, borderColor: t.line }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: t.line2 }}>
          <Text style={{ fontWeight: '700', fontSize: F.f15, color: t.text }}>{shop.shopName || 'Your shop'}</Text>
          <Text style={{ fontSize: F.f13, color: t.text3 }}>{q.no || 'Quote'} · {dmd(q.made)}</Text>
        </View>
        {tt.lines.length ? tt.lines.map((l: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line }}>
            <Text style={{ flex: 1, fontSize: F.f15, color: t.text }}><Text style={{ fontWeight: '700' }}>{l.qty} ×</Text> {l.name} <Text style={{ color: t.text3 }}>at {money(l.unit)}</Text></Text>
            <Text style={{ fontSize: F.f15, fontWeight: '500', color: t.text, fontVariant: ['tabular-nums'] }}>{money(l.gross)}</Text>
          </View>
        )) : <Text style={{ paddingVertical: 12, color: t.text3, borderBottomWidth: 1, borderBottomColor: t.line }}>Nothing added yet</Text>}
        {tt.disc ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 6 }}><Text style={{ color: t.text2, fontSize: F.f15 }}>Subtotal</Text><Text style={{ color: t.text2, fontSize: F.f15 }}>{money(tt.gross)}</Text></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: t.line }}><Text style={{ color: t.text2, fontSize: F.f15, flex: 1 }}>{tt.dname}</Text><Text style={{ color: t.success, fontWeight: '600', fontSize: F.f15 }}>−{money(tt.disc)}</Text></View>
          </>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line }}>
          <Text style={{ color: t.text2, fontSize: F.f15 }}>{q.pickup ? 'Pickup' : 'Shipping'}</Text>
          <Text style={{ color: t.text2, fontSize: F.f15 }}>{q.pickup ? 'None' : tt.ship ? money(tt.ship) : 'Free'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14 }}>
          <Text style={{ fontWeight: '700', fontSize: F.f15, color: t.text }}>Total</Text>
          <Text style={{ fontSize: 34, fontWeight: '700', letterSpacing: -0.8, color: t.text, fontVariant: ['tabular-nums'] }}>{money(tt.grand)}</Text>
        </View>
        {q.deposit ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2 }}>
            <Text style={{ fontSize: F.f13, color: t.text3 }}>{q.deposit}% deposit to start</Text>
            <Text style={{ fontSize: F.f13, color: t.text3 }}>{money((tt.grand * q.deposit) / 100)}</Text>
          </View>
        ) : null}
      </View>

      <Sect title="Items" right={q.status === 'draft' ? 'Prices lock when you send it' : q.sent ? `Prices locked ${dmd(q.sent)}` : undefined}>
        {drift.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: t.sunken }}>
            <Text style={{ flexGrow: 1, flexBasis: 220, fontSize: F.f14, lineHeight: 20, color: t.text }}>
              <Text style={{ fontWeight: '700' }}>Your prices changed since you sent this. </Text>
              {drift.map(l => `${itemName(shop, l.size)} ${money(l.price!)} → ${money(priceNow(l.size))}`).join(', ')}. The client still sees the prices you quoted.
            </Text>
            <Button small kind="secondary" title="Use new prices" onPress={() => { const was = q.lines; set({ lines: q.lines.map(l => ({ ...l, price: priceNow(l.size) })) }); showSnack('Prices updated', () => set({ lines: was })); }} />
          </View>
        ) : null}
        {edit ? (
          sellables.length ? grps.map(g => (
            <View key={g}>
              <Sublab>{g}</Sublab>
              <WList>
                {sellables.filter(i => i.grp === g).map(i => {
                  const line = q.lines.find(l => l.size === i.k);
                  return <WRow key={i.k} title={i.name} bold={!!qtyOf(i.k)} sub={`${money(line && line.price != null ? line.price : i.price)} each`} right={<QtyStepper label={i.name} value={qtyOf(i.k)} onChange={n => setQty(i.k, n)} />} />;
                })}
              </WList>
            </View>
          )) : <Note>Give your sizes a price in Settings › Pricing first.</Note>
        ) : (
          <>
            <WList>{tt.lines.map((l: any, i: number) => <WRow key={i} title={l.name} value={`${l.qty} × ${money(l.unit)}`} />)}</WList>
            <Note style={{ paddingHorizontal: 0 }}>{st === 'accepted' ? 'Locked once accepted. Change sizes on the order.' : 'Reopen the quote to change it.'}</Note>
          </>
        )}
      </Sect>

      <Sect title="What it leaves you">
        <View style={[{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 8 }, shadow(t.dark)]}>
          {[
            [money(tt.mat), 'Materials', undefined],
            [mins(tt.hrs * 60), 'Your time', undefined],
            pay ? [money(tt.perHr), 'Per hour', tt.perHr >= shop.laborRate ? t.success : t.warn] : [money(tt.keep), 'Profit', tt.keep >= 0 ? t.success : t.danger],
          ].map(([v, l, col], i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: F.f18, fontWeight: '600', color: (col as string) || t.text, fontVariant: ['tabular-nums'] }}>{v}</Text>
              <Text style={{ fontSize: F.f13, color: t.text3 }}>{l}</Text>
            </View>
          ))}
        </View>
        <Note>After {shop.cfg.fees.on ? money(tt.fees) + ' in card fees, ' : ''}{money(tt.over)} toward bills{tt.label ? ` and a ${money(tt.label)} label${tt.ship ? `, less the ${money(tt.ship)} shipping they pay` : ''}` : ''}.</Note>
      </Sect>
      {tt.dead && edit ? (
        <OStat tone="warn" title="In the free-shipping dead zone." sub={`This order nets less than one just under ${money(shop.cfg.ship.threshold)}, because shipping stops being charged.`} />
      ) : null}
      {edit ? (
        <>
          <Sect title="Delivery">
            <Segmented fill label="Delivery" bare value={q.pickup ? 'pickup' : 'ship'} onChange={v => set({ pickup: v === 'pickup' })} options={[['ship', 'Ship it'], ['pickup', 'Pickup']]} />
          </Sect>
          <Sect title="Deal">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {deals.map(([v, n]) => <ChipBtn key={v} on={(q.deal || 'none') === v} label={n} onPress={() => set({ deal: v })} />)}
            </View>
          </Sect>
          <Sect title="Deposit" right={q.deposit ? `${money((tt.grand * q.deposit) / 100)} to start` : undefined}>
            <Segmented fill label="Deposit" bare value={String(q.deposit || 0)} onChange={v => set({ deposit: +v })} options={[['0', 'None'], ['25', '25%'], ['50', '50%']]} />
          </Sect>
        </>
      ) : null}
      <Sect title="Notes" right="for this client">
        <WList>
          <TextInput accessibilityLabel="Notes" value={q.notes} onChangeText={v => set({ notes: v })} multiline placeholder="Anything just for this quote" placeholderTextColor={t.text3} style={{ minHeight: 64, paddingVertical: 14, fontSize: F.f15, color: t.text, textAlignVertical: 'top' }} />
        </WList>
      </Sect>
      <Button kind="danger" title="Delete quote" onPress={remove} />
      {st === 'draft' ? <Button title="Preview and send" disabled={!tt.n} onPress={() => setSheet('preview')} /> : st === 'out' || st === 'exp' ? <Button kind="secondary" title={st === 'exp' ? 'Preview and resend' : 'Client view'} onPress={() => setSheet('preview')} /> : null}
      {saved && onDevice ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Note style={{ flex: 1 }}>Saved in Documents › Bandana Planner › Quotes</Note>
          <Button small kind="secondary" title="Show in folder" onPress={() => revealFile(saved)} />
        </View>
      ) : null}
      {sheet === 'preview' ? (
        <ClientView q={q} onClose={() => setSheet(null)} footer={
          <>
            <Button kind="secondary" title={onDevice ? 'Save PDF' : 'Download PDF'} icon={cc => <DownloadIcon color={cc} size={16} />} onPress={savePdf} />
            {st === 'draft' ? <Button title="Mark sent" onPress={() => { sendQuote(q.id); setSheet(null); showSnack('Marked sent. Prices are locked', () => unsendQuote(q.id)); }} /> : st === 'exp' ? <Button title="Resend for 2 weeks" onPress={() => { set({ until: addDays(todayDay(), 14), sent: todayDay() }); setSheet(null); showSnack('Price holds 2 more weeks'); }} /> : null}
          </>
        } />
      ) : null}
      {sheet === 'date' ? <CalendarSheet title="Price holds until" value={q.until} onPick={d => d && set({ until: d })} onClose={() => setSheet(null)} /> : null}
    </>
  );
}
const who = (q: Quote, shop: ReturnType<typeof useShop>) => shop.customers.find(c => c.id === q.cust)?.name || q.title || 'them';

function ChipBtn({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? t.tint : t.surface, borderWidth: on ? 0 : 1, borderColor: t.line2 }}>
      <Text style={{ fontSize: F.f14, fontWeight: '600', color: on ? t.onTint : t.text2 }}>{label}</Text>
    </Pressable>
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
function ClientView({ q, onClose, footer }: { q: Quote; onClose: () => void; footer?: React.ReactNode }) {
  const shop = useShop();
  const t = useTheme();
  const d = quoteDoc(shop, q);
  const ink = '#1B1B1E',
    mute = '#5E5E63';
  return (
    <Sheet title="Customer’s view" sub="This is what the PDF shows" onClose={onClose} width={640} footer={footer}>
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

