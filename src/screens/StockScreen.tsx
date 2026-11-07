/* Finished stock, laid out like the prototype: what's ready to sell, orders you can fill now, what's set aside,
   and stock by run. Click a size to fix its count. */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { dayLabel, money, money0, plural, relDue } from '../lib/format';
import { itemName, itemPrice, rel, runNumbers } from '../lib/plan';
import { adjustStock, useShop } from '../state/store';
import { canFill, fillFromStock, freeStock, orderCount, orderLabel, orderStage, unfill } from '../state/selling';
import { BoxIcon, ChevIcon, WarnIcon } from '../ui/icons';
import { Button, Chip, Sheet, showSnack, Stepper, T } from '../ui/kit';
import { CustAv, FitCard, Note, OCard, PageHead, Sect, Strip, Sublab, WList } from '../ui/proto';
import { F, R, shadow, useTheme } from '../ui/theme';
import { RunThumb } from '../ui/Thumbs';

export function StockScreen({ openRun, go }: { openRun: (id: string) => void; go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [adj, setAdj] = useState<string | null>(null);
  const [w, setW] = useState(1100);
  const by = freeStock(shop);
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const value = Object.entries(by).reduce((a, [k, n]) => a + n * (itemPrice(shop, k) || 0), 0);
  const promisedRun = (rid: string) => shop.orders.some(o => o.status !== 'delivered' && o.run === rid);
  const groups: Record<string, { size: string; n: number }[]> = {};
  shop.stock.filter(s => !promisedRun(s.run)).forEach(s => (groups[s.run] = groups[s.run] || []).push(s));
  const sizes = Object.entries(shop.sizes).filter(([k, z]) => z.price != null || by[k]);
  const prods = shop.products.map(p => [p, p.variants.filter(v => (by[v.id] || 0) > 0)] as const).filter(([, v]) => v.length);
  const runsOf = (k: string) => new Set(shop.stock.filter(s => s.size === k && !promisedRun(s.run) && shop.runs.some(r => r.id === s.run)).map(s => s.run)).size;
  const fromWhere = (k: string) => (runsOf(k) ? `from ${plural(runsOf(k), 'run')}` : 'added by hand');
  const fillable = shop.orders.filter(o => orderStage(shop, o) === 'plan' && canFill(shop, o));
  const aside = shop.orders.filter(o => o.status !== 'delivered' && (o.fromStock.length || (o.run && shop.stock.some(x => x.run === o.run))));
  const asideN = (o: (typeof aside)[number]) => (o.fromStock.length ? o.fromStock.reduce((a, l) => a + l.n, 0) : shop.stock.filter(x => x.run === o.run).reduce((a, x) => a + x.n, 0));
  const ev = shop.cal.filter(e => e.kind === 'market' && (rel(e.day) ?? -1) >= 0).sort((a, b) => a.day.localeCompare(b.day))[0];
  const goal = shop.market.goal || 30;
  const ready = total >= goal;
  const pend = shop.runs.filter(r => r.status === 'active');
  const szRow = (k: string, name: string, price: number | null | undefined, n: number, sub: string) => (
    <Pressable key={k} accessibilityRole="button" onPress={() => setAdj(k)} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: F.f16, fontWeight: '600', color: t.text }}>{name}</Text>
        <Text style={{ fontSize: F.f14, color: t.text3 }}>{sub}</Text>
      </View>
      {n === 0 ? <Chip label="Out" tone="warn" /> : n <= 2 ? <Chip label="Low" /> : null}
      <Text style={{ fontSize: F.f18, fontWeight: '700', minWidth: 28, textAlign: 'right', color: t.text, fontVariant: ['tabular-nums'] }}>{n}</Text>
      <ChevIcon color={t.text3} size={16} />
    </Pressable>
  );
  const left = (
    <>
      <Sect title="Ready to sell" right="click to adjust a count">
        {sizes.length ? <WList>{sizes.map(([k, z]) => szRow(k, z.name, z.price, by[k] || 0, `${z.price != null ? money(z.price) + ' each' : 'Not priced'}${by[k] ? ` · ${fromWhere(k)}` : ''}`))}</WList> : <Note style={{ paddingHorizontal: 0 }}>Add your sizes in Settings first.</Note>}
        {prods.map(([p, vs]) => (
          <View key={p.id}>
            <Sublab>{p.name}</Sublab>
            <WList>{vs.map(v => szRow(v.id, v.name, v.price, by[v.id] || 0, v.price ? money(v.price) + ' each' : 'Not priced'))}</WList>
          </View>
        ))}
      </Sect>
      {fillable.length ? (
        <Sect title="Orders you can fill now" right={String(fillable.length)}>
          <View style={{ gap: 8 }}>
            {fillable.map(o => {
              const c = shop.customers.find(x => x.id === o.cust);
              const pcs = orderCount(o);
              const leaves = ev && total - pcs < goal ? `Leaves ${total - pcs} for market` : '';
              return (
                <View key={o.id} style={[{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.surface }, shadow(t.dark)]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <CustAv c={c} name={o.title || '?'} size={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>{c ? c.name : o.title || 'Order'}</Text>
                      <Text style={{ fontSize: F.f13, color: t.text3 }}>{orderLabel(shop, o)}{o.due ? ' · ' + relDue(rel(o.due)).toLowerCase() : ''}</Text>
                    </View>
                    <Button small title="Fill from stock" onPress={() => { if (fillFromStock(o.id)) showSnack('Set aside from stock. Ready to send', () => unfill(o.id)); }} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, display: leaves ? 'flex' : 'none' }}>
                    {leaves ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><WarnIcon color={t.warn} size={16} /><Text style={{ fontSize: F.f13, fontWeight: '600', color: t.warn }}>{leaves}</Text></View> : <View />}
                  </View>
                </View>
              );
            })}
          </View>
          <Note style={{ paddingHorizontal: 0 }}>Sets these bandanas aside for the order so they aren’t sold at a market. No run needed.</Note>
        </Sect>
      ) : null}
    </>
  );
  const right = (
    <>
      {aside.length ? (
        <Sect title="Set aside for orders" right={String(aside.reduce((a, o) => a + asideN(o), 0))}>
          <View style={{ gap: 8 }}>
            {aside.map(o => {
              const c = shop.customers.find(x => x.id === o.cust);
              const d = rel(o.due);
              return <OCard key={o.id} onPress={() => go?.('orders', o.id)} av={<CustAv c={c} name={o.title || '?'} size={42} />} title={c ? c.name : o.title || 'Order'} value={String(asideN(o))} sub={`${o.title || o.src || 'Order'} · ${orderLabel(shop, o)}`}
                chips={<><Chip tone={orderStage(shop, o) === 'ready' ? 'ok' : 'plain'} label={orderStage(shop, o) === 'ready' ? 'Ready to send' : 'Being made'} />{o.due ? <Chip tone={d != null && d < 0 ? 'warn' : 'plain'} label={d != null && d < 0 ? relDue(d) : 'Due ' + dayLabel(o.due)} /> : null}</>} />;
            })}
          </View>
        </Sect>
      ) : null}
      <Sect title="By run" right={plural(total, 'bandana')}>
        {Object.keys(groups).length ? (
          <View style={{ gap: 8 }}>
            {Object.entries(groups).map(([rid, list]) => {
              const r = shop.runs.find(x => x.id === rid);
              const n = list.reduce((a, x) => a + x.n, 0);
              return <OCard key={rid} onPress={() => (r ? openRun(r.id) : setAdj(list[0].size))} av={r ? <RunThumb r={r} size={42} /> : <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}><BoxIcon color={t.text2} size={20} /></View>} title={rid === 'adj' ? 'Added by hand' : rid === 'example' ? 'Example stock' : r ? (r.name || 'Untitled run').split(' — ')[0] : 'Older run'} value={String(n)} sub={list.map(x => `${x.n} ${itemName(shop, x.size)}`).join(', ')} />;
            })}
          </View>
        ) : <Note style={{ paddingHorizontal: 0 }}>Nothing in stock yet. When you finish a run, its bandanas land here.</Note>}
      </Sect>
    </>
  );
  const wide = w >= 900;
  return (
    <ScrollView onLayout={e => setW(e.nativeEvent.layout.width)} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 1180, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 48, gap: 20 }}>
        <PageHead title="Finished stock" />
        <Strip items={[{ v: String(total), l: 'ready to sell' }, { v: money0(value), l: 'at your prices' }, { v: String(aside.reduce((a, o) => a + asideN(o), 0)), l: 'set aside' }]} />
        {ev ? (
          <FitCard ok={ready} title={`${ev.title}, ${dayLabel(ev.day)}`} frac={total / Math.max(1, goal)}
            text={ready ? `Packed: ${total} ready, you wanted ${goal}.` : `${total} of ${goal} ready, ${goal - total} short.${pend.length ? ` ${(pend[0].name || 'A run').split(' — ')[0]} adds ${runNumbers(shop, pend[0]).pieces} when it’s finished${pend[0].due ? ' (' + relDue(rel(pend[0].due)).toLowerCase() + ')' : ''}.` : ''}`}
            action={<Button small kind={ready ? 'secondary' : 'primary'} title="Market day" onPress={() => go?.('market')} />} />
        ) : null}
        {wide ? (
          <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 20 }}>{left}</View>
            <View style={{ flex: 1, gap: 20 }}>{right}</View>
          </View>
        ) : (
          <View style={{ gap: 20 }}>{left}{right}</View>
        )}
      </View>
      {adj ? <AdjustSheet size={adj} onClose={() => setAdj(null)} /> : null}
    </ScrollView>
  );
}

function AdjustSheet({ size, onClose }: { size: string; onClose: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const now = freeStock(shop)[size] || 0;
  const [n, setN] = useState(now);
  const z = { name: itemName(shop, size) };
  const save = () => {
    if (n !== now) adjustStock(size, n - now);
    onClose();
  };
  return (
    <Sheet title={`${z?.name || size} in stock`} sub="Fix the count after a sale, a gift, or a recount" onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Save" onPress={save} /></>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bg, borderRadius: R.card, padding: 14 }}>
        <T style={{ flex: 1, fontWeight: '600' }}>{plural(n, 'bandana')}</T>
        <Stepper label={z?.name || size} value={n} onChange={setN} />
      </View>
      <T s="small">{n > now ? `Adds ${n - now}, counted as added by hand.` : n < now ? `Takes ${now - n} out, from bandanas added by hand first, then the oldest runs.` : 'No change.'}</T>
    </Sheet>
  );
}
