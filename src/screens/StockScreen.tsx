/* Finished stock: bandanas ready to sell, by size and by run. Finishing a run adds to it; counts can be fixed by hand. */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { money, plural } from '../lib/format';
import { itemName, itemPrice } from '../lib/plan';
import { adjustStock, stockBySize, useShop } from '../state/store';
import { freeStock, orderLabel } from '../state/selling';
import { RecordSaleSheet } from './SellingScreens';
import { BoxIcon } from '../ui/icons';
import { Button, Card, Chip, Empty, Row, Section, Sheet, Stepper, Swatch, T } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';

export function StockScreen({ openRun }: { openRun: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [adj, setAdj] = useState<string | null>(null);
  const by = freeStock(shop);
  const [rec, setRec] = useState(false);
  const aside = shop.orders.filter(o => o.status !== 'delivered' && (o.fromStock.length || (o.run && shop.stock.some(x => x.run === o.run))));
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const value = Object.entries(by).reduce((a, [k, n]) => a + n * (itemPrice(shop, k) || 0), 0);
  const groups: Record<string, { size: string; n: number }[]> = {};
  shop.stock.forEach(s => (groups[s.run] = groups[s.run] || []).push(s));
  const sizes: [string, { name: string; price: number | null }][] = [
    ...Object.entries(shop.sizes).filter(([k, z]) => z.cw || by[k]),
    ...shop.products.flatMap(p => p.variants).filter(v => v.price != null || by[v.id]).map(v => [v.id, { name: v.name, price: v.price }] as [string, { name: string; price: number | null }]),
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 24, maxWidth: 980 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <T s="title">Finished stock</T>
          <T s="sub">Bandanas sewn and ready to sell. Finishing a run adds its bandanas here.</T>
        </View>
        <Button title="Record a sale" onPress={() => setRec(true)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 2 }}>
          <T s="label">Ready to sell</T>
          <T style={{ fontSize: F.f28, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{total}</T>
        </Card>
        <Card style={{ flex: 1, gap: 2 }}>
          <T s="label">Worth at your prices</T>
          <T style={{ fontSize: F.f28, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(value)}</T>
        </Card>
      </View>
      {!sizes.length ? (
        <Empty icon={<BoxIcon color={t.action} size={26} />} title="Nothing in stock yet" body="When you finish a run, its bandanas land here, ready to sell." />
      ) : (
        <Section title="Ready to sell" right={<T s="sub">Click a size to fix its count</T>}>
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {sizes.map(([k, z], i) => {
              const n = by[k] || 0;
              const runs = new Set(shop.stock.filter(s => s.size === k).map(s => s.run)).size;
              return (
                <Row key={k} first={i === 0} onPress={() => setAdj(k)}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>{z.name}</T>
                    <T s="sub">{z.price != null ? money(z.price) + ' each' : 'Not priced'}{n ? ` · from ${plural(runs, 'run')}` : ''}</T>
                  </View>
                  {n === 0 ? <Chip label="Out" tone="warn" /> : n <= 2 ? <Chip label="Low" /> : null}
                  <T style={{ fontSize: F.f18, fontWeight: '700', minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{n}</T>
                </Row>
              );
            })}
          </Card>
        </Section>
      )}
      {Object.keys(groups).length ? (
        <Section title="By run" right={<T s="sub">{plural(total, 'bandana')}</T>}>
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {Object.entries(groups).map(([rid, list], i) => {
              const r = shop.runs.find(x => x.id === rid);
              const f = r && shop.fabrics.find(x => x.id === r.body);
              const n = list.reduce((a, s) => a + s.n, 0);
              return (
                <Row key={rid} first={i === 0} onPress={r ? () => openRun(r.id) : undefined}>
                  <Swatch color={f ? f.color : t.sunken} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: '600' }}>{rid === 'adj' ? 'Added by hand' : r ? (r.name || 'Untitled run').split(' — ')[0] : 'Older run'}</T>
                    <T s="sub">{list.map(s => `${s.n} ${itemName(shop, s.size)}`).join(', ')}</T>
                  </View>
                  <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{n}</T>
                </Row>
              );
            })}
          </Card>
        </Section>
      ) : null}
      {aside.length ? (
        <Section title="Set aside for orders">
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {aside.map((o, i) => (
              <Row key={o.id} first={i === 0}>
                <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }}>{o.title || shop.customers.find(c => c.id === o.cust)?.name || 'Order'}</T><T s="sub">{orderLabel(shop, o)}</T></View>
              </Row>
            ))}
          </Card>
          <T s="small">These aren’t counted as ready to sell.</T>
        </Section>
      ) : null}
      {rec ? <RecordSaleSheet onClose={() => setRec(false)} /> : null}
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
