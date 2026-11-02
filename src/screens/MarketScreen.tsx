/* Market day, laid out like the prototype: plan it (packing against your goal, the day, booth and miles), tap sales
   as they happen (card or cash), then close it into one paid sale and see how the day went. */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { dayLabel, money, money0, plural, relDue } from '../lib/format';
import { itemName, rel, runNumbers, todayDay } from '../lib/plan';
import { closeMarket, marketCosts, marketFees, marketLeft, planNextMarket, setMarket, startMarket, tap, undoSale, untap } from '../state/selling';
import { useShop } from '../state/store';
import { PlusIcon } from '../ui/icons';
import { Button, NumField, Segmented, Sheet, showSnack, T } from '../ui/kit';
import { CalendarSheet, LinkText, Note, OStat, Sect, Strip, Sublab, WList } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';
import { useNow } from '../ui/useNow';

/** The market you're planning: its own date, or the next market on your calendar */
function useEvent() {
  const shop = useShop();
  const m = shop.market;
  const next = shop.cal.filter(e => e.kind === 'market' && (rel(e.day) ?? -1) >= 0).sort((a, b) => a.day.localeCompare(b.day))[0];
  return { day: m.day || next?.day || todayDay(), name: m.name || next?.title || '' };
}

export function MarketScreen({ go }: { go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const m = shop.market;
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 820, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>
        <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, color: useTheme().text }}>Market day</Text>
        {m.open ? <OpenMarket /> : m.closed && m.last ? <Closed go={go} /> : <Plan go={go} />}
      </View>
    </ScrollView>
  );
}

function Hero({ day, name, sub, onName }: { day: string; name: string; sub: string; onName?: (v: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <View style={[{ width: 64, height: 68, borderRadius: 18, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.line }, shadow(t.dark)]}>
        <Text style={{ fontSize: F.f13, fontWeight: '700', color: t.danger, letterSpacing: 0.6 }}>{dayLabel(day, { month: 'short' }).toUpperCase()}</Text>
        <Text style={{ fontSize: 28, lineHeight: 30, fontWeight: '700', color: t.text }}>{+day.slice(8)}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {onName ? (
          <TextInput accessibilityLabel="Market name" value={name} onChangeText={onName} placeholder="Market name" placeholderTextColor={t.text3}
            style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: t.text, borderBottomWidth: 1.5, borderBottomColor: t.line2, borderStyle: 'dashed', paddingVertical: 4, minHeight: 44 }} />
        ) : <Text style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: t.text }}>{name || 'Market day'}</Text>}
        <Text style={{ fontSize: F.f14, color: t.text3 }}>{sub}</Text>
      </View>
    </View>
  );
}
const relDay = (day: string) => {
  const d = rel(day) ?? 0;
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : d > 1 ? `in ${d} days` : `${-d} days ago`;
};

function InlineNum({ value, onChange, label, prefix }: { value: number; onChange: (n: number) => void; label: string; prefix?: string }) {
  const t = useTheme();
  const [txt, setTxt] = useState(String(value ?? ''));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {prefix ? <Text style={{ color: t.text3, fontSize: F.f16 }}>{prefix}</Text> : null}
      <TextInput accessibilityLabel={label} value={txt} keyboardType="numeric"
        onChangeText={v => { setTxt(v); const n = parseFloat(v.replace(',', '.')); if (!isNaN(n) && n >= 0) onChange(n); else if (v.trim() === '') onChange(0); }}
        style={{ width: 92, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: t.line2, textAlign: 'right', fontSize: F.f18, fontWeight: '600', color: t.text, backgroundColor: t.surface, fontVariant: ['tabular-nums'] }} />
    </View>
  );
}
function Line({ title, sub, right }: { title: string; sub?: string; right: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: F.f16, color: t.text }}>{title}</Text>
        {sub ? <Text style={{ fontSize: F.f14, color: t.text3 }}>{sub}</Text> : null}
      </View>
      {typeof right === 'string' ? <Text style={{ fontSize: F.f15, color: t.text, fontVariant: ['tabular-nums'] }}>{right}</Text> : right}
    </View>
  );
}

/* ---------- planning ---------- */
function Plan({ go }: { go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.market;
  const ev = useEvent();
  const [pick, setPick] = useState(false);
  const left = marketLeft(shop);
  const sizes = Object.entries(shop.sizes).filter(([, z]) => z.price != null);
  const vars = shop.products.flatMap(p => p.variants).filter(v => (left[v.id] || 0) > 0);
  const stk = Object.values(left).reduce((a, b) => a + Math.max(0, b), 0);
  const short = Math.max(0, m.goal - stk);
  const pend = shop.runs.filter(r => r.status === 'active');
  const costs = marketCosts(m);
  return (
    <>
      <Hero day={ev.day} name={m.name || ev.name} onName={v => setMarket({ name: v })} sub={`${dayLabel(ev.day, { weekday: 'long' })} · ${relDay(ev.day)}`} />
      <Strip items={[{ v: String(stk), l: 'packed' }, { v: String(m.goal), l: 'goal' }, { v: short ? String(short) : 'Ready', l: short ? 'short' : 'to go', color: short ? t.warn : t.success }]} />
      <Sect title="Packing" right={<LinkText onPress={() => go?.('stock')}>Finished stock</LinkText>}>
        <WList>
          {sizes.map(([k, z]) => (
            <Line key={k} title={z.name} sub={`${money(z.price!)} each`} right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {!left[k] ? <View style={{ backgroundColor: t.warnTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ fontSize: F.f13, fontWeight: '600', color: t.onWarn }}>None packed</Text></View> : null}
                <Text style={{ fontSize: 17, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{Math.max(0, left[k] || 0)}</Text>
              </View>
            } />
          ))}
          {vars.map(v => <Line key={v.id} title={v.name} sub={`${money(v.price || 0)} each`} right={<Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>{left[v.id]}</Text>} />)}
        </WList>
        {short && pend.length ? <Note style={{ paddingHorizontal: 0 }}>{(pend[0].name || 'A run').split(' — ')[0]} adds {runNumbers(shop, pend[0]).pieces} more when it’s finished{pend[0].due ? ((rel(pend[0].due) ?? 0) < 0 ? `, but it’s running ${relDue(rel(pend[0].due))}` : `. It’s ${relDue(rel(pend[0].due)).toLowerCase()}`) : ''}.</Note> : null}
      </Sect>
      <Sect title="The day">
        <WList>
          <Line title="Date" right={<Button small kind="secondary" title={dayLabel(ev.day)} onPress={() => setPick(true)} />} />
          <Line title="Packing goal" sub="bandanas to bring" right={<InlineNum label="Packing goal" value={m.goal} onChange={n => setMarket({ goal: Math.round(n) })} />} />
          <Line title="Hours at the stall" right={<InlineNum label="Hours at the stall" value={m.hours ?? 6} onChange={n => setMarket({ hours: n })} />} />
        </WList>
      </Sect>
      <Sect title="Costs for the day" right={money(costs)}>
        <WList>
          <Line title="Booth fee" right={<InlineNum label="Booth fee" prefix="$" value={m.booth} onChange={n => setMarket({ booth: n })} />} />
          <Line title="Miles there and back" sub={`at ${money(m.perMile ?? 0.67)} a mile`} right={<InlineNum label="Miles there and back" value={m.miles || 0} onChange={n => setMarket({ miles: n })} />} />
        </WList>
        <Note style={{ paddingHorizontal: 0 }}>Taken off what you sell when you close the market.</Note>
      </Sect>
      <Button title={stk ? 'Start market' : 'Pack some stock first'} disabled={!stk} onPress={() => startMarket({ name: (m.name || ev.name).trim(), booth: m.booth || 0, goal: m.goal || 30 })} />
      {pick ? <CalendarSheet title="Market date" value={ev.day} onPick={d => d && setMarket({ day: d })} onClose={() => setPick(false)} /> : null}
    </>
  );
}

/* ---------- selling ---------- */
function OpenMarket() {
  const shop = useShop();
  const t = useTheme();
  const m = shop.market;
  const ev = useEvent();
  useNow(true, 30000);
  const left = marketLeft(shop);
  const [other, setOther] = useState(false);
  const gross = m.tally.reduce((a, x) => a + x.price, 0);
  const fees = marketFees(shop);
  const costs = marketCosts(m);
  const net = gross - fees - costs;
  const name = (k: string) => itemName(shop, k);
  const sizes = Object.entries(shop.sizes).filter(([, z]) => z.price != null).map(([k, z]) => ({ k, name: z.name, price: z.price! }));
  const vars = shop.products.flatMap(p => p.variants).filter(v => v.price && ((left[v.id] || 0) > 0 || m.tally.some(x => x.k === v.id))).map(v => ({ k: v.id, name: v.name, price: v.price! }));
  const last = m.tally[m.tally.length - 1];
  const at = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const btn = (i: { k: string; name: string; price: number }) => {
    const l = left[i.k] || 0;
    return (
      <Pressable key={i.k} accessibilityRole="button" accessibilityLabel={`Sold one ${i.name}, ${money(i.price)}`} disabled={l <= 0} onPress={() => tap(i.k, i.price)}
        style={({ pressed }) => [{ flexBasis: '31%', flexGrow: 1, minHeight: 118, borderRadius: 20, backgroundColor: pressed ? t.tint2 : t.surface, alignItems: 'center', gap: 2, paddingTop: 18, paddingHorizontal: 8, paddingBottom: 16, opacity: l <= 0 ? 0.45 : 1 }, shadow(t.dark)]}>
        <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: t.text, fontVariant: ['tabular-nums'] }}>{money0(i.price)}</Text>
        <Text numberOfLines={2} style={{ fontSize: F.f15, color: t.text, textAlign: 'center' }}>{i.name}</Text>
        <Text style={{ marginTop: 'auto', fontSize: F.f14, color: t.text3, fontVariant: ['tabular-nums'] }}>{l > 0 ? `${l} left` : 'Sold out'}</Text>
      </Pressable>
    );
  };
  const close = () => {
    const id = closeMarket();
    if (id) showSnack(`Market recorded: ${money(gross)}`, () => { undoSale(id); setMarket({ closed: false }); });
  };
  const ca = m.tally.filter(x => x.pay === 'Cash').length;
  const cd = m.tally.length - ca;
  return (
    <>
      <Hero day={ev.day} name={m.name || ev.name} sub={`${dayLabel(ev.day, { weekday: 'long' })} · open now${m.openedAt ? ', since ' + at(m.openedAt) : ''}`} />
      <Strip items={[{ v: String(m.tally.length), l: 'sold' }, { v: money0(gross), l: 'taken' }, { v: money0(net), l: 'after costs', color: net >= 0 ? t.success : undefined }]} />
      <Segmented fill label="Payment" bare value={m.pay} onChange={v => setMarket({ pay: v })} options={[['Card', 'Card'], ['Cash', 'Cash']]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{sizes.map(btn)}</View>
      {vars.length ? (
        <View>
          <Sublab>Other products</Sublab>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{vars.map(btn)}</View>
        </View>
      ) : null}
      <Button small kind="ghost" title="Sale at a different price" icon={c => <PlusIcon color={c} size={18} />} style={{ alignSelf: 'flex-start' }} onPress={() => setOther(true)} />
      {last ? (
        <OStat title={`Last: ${name(last.k)} ${money(last.price)}`} sub={`${last.pay} · ${at(last.t)}`}>
          <Button small kind="secondary" title="Undo" onPress={() => untap()} />
        </OStat>
      ) : null}
      <Sect title="So far">
        <WList>
          <Line title="Taken" sub={m.tally.length ? [cd ? `${cd} card` : '', ca ? `${ca} cash` : ''].filter(Boolean).join(' · ') : 'Nothing sold yet'} right={money(gross)} />
          {fees > 0 ? <Line title="Card fees" right={'−' + money(fees)} /> : null}
          <Line title="Booth and miles" right={'−' + money(costs)} />
          <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: F.f16, fontWeight: '700', color: t.text }}>After costs</Text>
            <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{money(net)}</Text>
          </View>
        </WList>
      </Sect>
      {m.tally.length > 1 ? (
        <Sect title="Earlier sales" right={String(m.tally.length - 1)}>
          <WList>
            {m.tally.slice(0, -1).map((x, i) => ({ x, i })).slice(-8).reverse().map(({ x, i }) => (
              <Line key={i} title={name(x.k)} sub={`${x.pay} · ${at(x.t)}`} right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: F.f15, color: t.text2, fontVariant: ['tabular-nums'] }}>{money(x.price)}</Text>
                  <LinkText onPress={() => untap(i)}>Undo</LinkText>
                </View>
              } />
            ))}
          </WList>
        </Sect>
      ) : null}
      <Button title={m.tally.length ? 'Close market and record' : 'Close market'} disabled={!m.tally.length} onPress={close} />
      {m.tally.length === 0 ? <LinkText onPress={() => closeMarket()}>Close without any sales</LinkText> : null}
      {other ? <OtherPrice items={[...sizes, ...vars].filter(i => (left[i.k] || 0) > 0)} onClose={() => setOther(false)} /> : null}
    </>
  );
}

function OtherPrice({ items, onClose }: { items: { k: string; name: string; price: number }[]; onClose: () => void }) {
  const [k, setK] = useState(items[0]?.k || '');
  const cur = items.find(i => i.k === k);
  const [amt, setAmt] = useState<number | null>(cur ? cur.price : null);
  if (!items.length) return <Sheet title="Sale at a different price" onClose={onClose}><T s="sub">Everything is sold out.</T></Sheet>;
  return (
    <Sheet title="Sale at a different price" onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title={`Sold for ${money(amt || 0)}`} onPress={() => { if (cur) tap(cur.k, amt || 0); onClose(); }} /></>}>
      <Segmented label="What sold" value={k} onChange={v => { setK(v); setAmt(items.find(i => i.k === v)?.price ?? null); }} options={items.map(i => [i.k, i.name] as [string, string])} />
      <NumField label="They paid" value={amt} onChange={setAmt} prefix="$" width={140} />
    </Sheet>
  );
}

/* ---------- closed ---------- */
function Closed({ go }: { go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.market;
  const c = m.last!;
  const net = c.total - (c.fees || 0) - (c.costs || 0);
  const items = Object.entries(c.items || {}).sort((a, b) => b[1] - a[1]);
  const pcs = items.reduce((a, [, n]) => a + n, 0);
  const hours = m.hours || 0;
  return (
    <>
      <Hero day={c.day} name={c.name} sub={`${dayLabel(c.day, { weekday: 'long' })} · closed`} />
      <Strip items={[{ v: String(c.n), l: 'sold' }, { v: money0(c.total), l: 'taken' }, { v: money0(net), l: 'after costs', color: net >= 0 ? t.success : t.danger }]} />
      <OStat tone="ready" title="Market recorded" sub={`Saved as a paid sale.${shop.cfg.payLabor && hours ? ` ${money(net / hours)} an hour at the stall.` : ''}`}>
        {shop.sales.some(e => e.id === c.sale) ? <Button small kind="secondary" title="Open sale" onPress={() => go?.('sales', c.sale)} /> : null}
      </OStat>
      {items.length ? (
        <Sect title="What sold" right={plural(pcs, 'bandana')}>
          <WList>{items.map(([k, n]) => <Line key={k} title={itemName(shop, k)} right={<Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text }}>{n}</Text>} />)}</WList>
        </Sect>
      ) : null}
      <Sect title="Money">
        <WList>
          <Line title="Taken" right={money(c.total)} />
          {(c.fees || 0) > 0 ? <Line title="Card fees" right={'−' + money(c.fees!)} /> : null}
          <Line title="Booth and miles" right={'−' + money(c.costs || 0)} />
          <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: F.f16, fontWeight: '700', color: t.text }}>After costs</Text>
            <Text style={{ fontSize: F.f16, fontWeight: '700', color: net >= 0 ? t.text : t.danger, fontVariant: ['tabular-nums'] }}>{money(net)}</Text>
          </View>
        </WList>
      </Sect>
      <Button title="Plan the next market" onPress={planNextMarket} />
    </>
  );
}
