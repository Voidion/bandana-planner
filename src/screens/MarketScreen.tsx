/* Market day: big tiles to tap as things sell, card or cash, a running total against your goal, and one sale when you
   close up. */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { clock, money, plural } from '../lib/format';
import { closeMarket, marketLeft, setMarket, startMarket, tap, undoSale, untap } from '../state/selling';
import { useShop } from '../state/store';
import { Bar, Button, Card, Field, NumField, Segmented, Sheet, showSnack, T } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';
import { useNow } from '../ui/useNow';

export function MarketScreen() {
  const shop = useShop();
  const m = shop.market;
  return m.open ? <OpenMarket /> : <SetUp />;
}

function SetUp() {
  const shop = useShop();
  const t = useTheme();
  const m = shop.market;
  const [name, setName] = useState(m.name || '');
  const [booth, setBooth] = useState<number | null>(m.booth || null);
  const [goal, setGoal] = useState<number | null>(m.goal || 30);
  const left = marketLeft(shop);
  const stock = Object.values(left).reduce((a, b) => a + Math.max(0, b), 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 22, maxWidth: 720 }}>
      <View style={{ gap: 4 }}>
        <T s="title">Market day</T>
        <T s="sub">Tap each sale as it happens. When you close up it becomes one sale in Sales, with card fees and the booth fee counted.</T>
      </View>
      {m.last ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '700' }}>Last market: {m.last.name || 'Market day'}</T>
            <T s="sub">{plural(m.last.n, 'item')} · {money(m.last.total)}</T>
          </View>
        </Card>
      ) : null}
      <Card style={{ gap: 14 }}>
        <Field label="Market" value={name} onChange={setName} placeholder="Riverside farmers market" />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <NumField label="Booth fee" value={booth} onChange={setBooth} prefix="$" width={130} placeholder="0" />
          <NumField label="Goal" value={goal} onChange={setGoal} suffix="sold" width={130} />
        </View>
        <T s="small">{stock ? `${plural(stock, 'item')} in finished stock to bring.` : 'Nothing in finished stock yet. Finish a run first, or add counts in Finished stock.'}</T>
        <Button title="Start market day" disabled={!stock} onPress={() => startMarket({ name: name.trim(), booth: booth || 0, goal: goal || 30 })} style={{ alignSelf: 'flex-start' }} />
      </Card>
    </ScrollView>
  );
}

function OpenMarket() {
  const shop = useShop();
  const t = useTheme();
  const m = shop.market;
  useNow(true, 30000);
  const left = marketLeft(shop);
  const [other, setOther] = useState(false);
  const [closing, setClosing] = useState(false);
  const items = [
    ...Object.entries(shop.sizes).filter(([k, z]) => z.price != null && ((left[k] || 0) > 0 || m.tally.some(x => x.k === k))).map(([k, z]) => ({ k, name: z.name, price: z.price! })),
    ...shop.products.flatMap(p => p.variants).filter(v => v.price != null && ((left[v.id] || 0) > 0 || m.tally.some(x => x.k === v.id))).map(v => ({ k: v.id, name: v.name, price: v.price! })),
  ];
  const total = m.tally.reduce((a, x) => a + x.price, 0);
  const card = m.tally.filter(x => x.pay === 'Card').reduce((a, x) => a + x.price, 0);
  const n = m.tally.length;
  const last = m.tally[m.tally.length - 1];
  const itemName = (k: string) => items.find(i => i.k === k)?.name || shop.sizes[k]?.name || k;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 32, gap: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T s="title">{m.name || 'Market day'}</T>
            <T s="sub">Open {m.openedAt ? clock(Date.now() - m.openedAt) : ''}{m.booth ? ` · ${money(m.booth)} booth` : ''}</T>
          </View>
          <Segmented label="Paid by" value={m.pay} onChange={v => setMarket({ pay: v })} options={[['Card', 'Card'], ['Cash', 'Cash']]} />
          <Button kind="secondary" title="Close up" onPress={() => setClosing(true)} />
        </View>
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <T style={{ fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(total)}</T>
            <T s="sub">{plural(n, 'sold', 'sold')} of {m.goal} · {money(card)} card · {money(total - card)} cash</T>
          </View>
          <Bar value={n / Math.max(1, m.goal)} color={n >= m.goal ? t.success : t.action} />
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {items.map(i => {
            const l = left[i.k] || 0;
            return (
              <Pressable key={i.k} accessibilityRole="button" accessibilityLabel={`Sold one ${i.name}, ${money(i.price)}`} disabled={l <= 0} onPress={() => tap(i.k, i.price)}
                style={({ pressed }) => ({ width: 180, height: 132, borderRadius: R.card + 4, backgroundColor: l <= 0 ? t.sunken : pressed ? t.tint : t.surface, padding: 16, justifyContent: 'space-between', opacity: l <= 0 ? 0.6 : 1, borderWidth: 1, borderColor: t.line })}>
                <View>
                  <T style={{ fontSize: F.f18, fontWeight: '700' }}>{i.name}</T>
                  <T s="sub">{money(i.price)}</T>
                </View>
                <T s="small" color={l <= 2 ? t.warn : t.text3}>{l <= 0 ? 'Sold out' : `${l} left`}</T>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Button kind="secondary" title="Different price" onPress={() => setOther(true)} />
          {last ? <Button kind="ghost" title={`Undo ${itemName(last.k)} · ${money(last.price)}`} onPress={untap} /> : null}
        </View>
        {m.tally.length ? (
          <Card style={{ gap: 6 }}>
            <T s="h2">Sold today</T>
            {[...m.tally].reverse().slice(0, 12).map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T>{itemName(x.k)} <T s="sub">· {x.pay}</T></T>
                <T style={{ fontVariant: ['tabular-nums'] }}>{money(x.price)}</T>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
      {other ? <OtherPrice items={items.filter(i => (left[i.k] || 0) > 0)} onClose={() => setOther(false)} /> : null}
      {closing ? <CloseSheet onClose={() => setClosing(false)} total={total} card={card} /> : null}
    </View>
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

function CloseSheet({ onClose, total, card }: { onClose: () => void; total: number; card: number }) {
  const shop = useShop();
  const m = shop.market;
  return (
    <Sheet title="Close up?" sub={m.name || 'Market day'} onClose={onClose} footer={<><Button kind="ghost" title="Keep selling" onPress={onClose} /><Button title={m.tally.length ? `Record ${money(total)}` : 'Close without sales'} onPress={() => { const id = closeMarket(); onClose(); if (id) showSnack(`Market recorded: ${money(total)}`, () => undoSale(id)); }} /></>}>
      <T>{plural(m.tally.length, 'item')} sold · {money(card)} by card · {money(total - card)} cash.</T>
      <T s="small">Records one Market sale in Sales and takes what sold out of finished stock. Card fees are counted on the card part{m.booth ? `, and the ${money(m.booth)} booth fee as a cost` : ''}.</T>
    </Sheet>
  );
}
