/* Import from Shopify: open the orders CSV, match each product to your sizes and styles, then import. */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { money, plural } from '../lib/format';
import { guessItem, parseShopifyOrders, type ShopifyOrder } from '../lib/shopify';
import { importShopify, shopifySeen } from '../state/selling';
import { openTextFile } from '../state/storage';
import { useShop } from '../state/store';
import { Button, Row, Select, Sheet, showSnack, T } from '../ui/kit';
import { R, useTheme } from '../ui/theme';

export function ShopifyImport({ onClose }: { onClose: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [orders, setOrders] = useState<ShopifyOrder[] | null>(null);
  const [map, setMap] = useState<Record<string, string | null>>({});
  const [err, setErr] = useState('');
  const items = [
    ...Object.entries(shop.sizes).map(([k, z]) => ({ k, name: z.name })),
    ...shop.products.flatMap(p => p.variants).map(v => ({ k: v.id, name: v.name })),
  ];
  const pick = async () => {
    setErr('');
    try {
      const f = await openTextFile('Shopify orders export', 'CSV files', '*.csv');
      if (!f) return;
      const r = parseShopifyOrders(f.text);
      if (r.error) return setErr(r.error);
      const m: Record<string, string | null> = {};
      r.orders.forEach(o => o.lines.forEach(l => (m[l.name] = m[l.name] ?? guessItem(l.name, items))));
      setMap(m);
      setOrders(r.orders);
    } catch (e) {
      setErr('Couldn’t read that file.');
    }
  };
  const fresh = (orders || []).filter(o => !shopifySeen(shop, o.ref));
  const toMake = fresh.filter(o => !o.fulfilled).length;
  const past = fresh.length - toMake;
  const names = Object.keys(map);
  const go = () => {
    const r = importShopify(fresh, map);
    onClose();
    showSnack(`Imported ${plural(r.orders, 'order')} to make and ${plural(r.sales, 'past sale')}${r.skipped ? ` · ${r.skipped} skipped` : ''}`);
  };
  return (
    <Sheet title="Import from Shopify" sub={orders ? `${plural(orders.length, 'order')} in the file` : 'Use the orders export from Shopify'} onClose={onClose} width={620}
      footer={orders ? <><Button kind="ghost" title="Choose another file" onPress={pick} /><Button title={fresh.length ? `Import ${plural(fresh.length, 'order')}` : 'Nothing new'} disabled={!fresh.length} onPress={go} /></> : <><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Open the CSV" onPress={pick} /></>}>
      {!orders ? (
        <>
          <T>In Shopify, go to <T style={{ fontWeight: '700' }}>Orders › Export</T>, pick the orders you want, and export as CSV. Then open that file here.</T>
          <T s="small">Orders that aren’t fulfilled yet become orders to make. Fulfilled ones are recorded as past sales, so Reports and Tax include them; they don’t change your stock. Orders you’ve already imported are skipped.</T>
        </>
      ) : (
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }}>
          <T>{plural(toMake, 'order')} to make · {plural(past, 'past sale')}{orders.length - fresh.length ? ` · ${orders.length - fresh.length} already imported` : ''}</T>
          <T s="h2">Match each product</T>
          <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
            {names.map((n, i) => (
              <Row key={n} first={i === 0}>
                <T style={{ flex: 1 }} numberOfLines={2}>{n}</T>
                <Select label={`What “${n}” is`} width={200} value={map[n] || ''} options={[['', 'Skip it'], ...items.map(x => [x.k, x.name] as [string, string])]} onChange={v => setMap({ ...map, [n]: v || null })} />
              </Row>
            ))}
          </View>
          <T s="small">Matched from the size in each product’s name. Change any that are wrong; skipped products aren’t imported.</T>
          {fresh.slice(0, 6).map(o => (
            <T key={o.ref} s="small">{o.ref} · {o.name || o.email || 'No name'} · {money(o.total)} · {o.fulfilled ? 'fulfilled' : 'to make'}</T>
          ))}
        </ScrollView>
      )}
      {err ? <T s="sub" color={t.danger}>{err}</T> : null}
    </Sheet>
  );
}
