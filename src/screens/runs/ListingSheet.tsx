/* Shopify listing for a run: title, description and tags written from the run (edit any of them), each size's price
   and stock, a checklist, and a Shopify product CSV that makes a draft product with every size. */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { inch, money } from '../../lib/format';
import { listingCsv, listingFor, listingPlainText, listingStockFor } from '../../lib/plan';
import { live } from '../../state/photos';
import { onDevice, openPath, revealFile, saveDocument } from '../../state/storage';
import { editRun, useShop } from '../../state/store';
import type { Run } from '../../state/types';
import { Button, Field, Row, Sheet, showSnack, T } from '../../ui/kit';
import { R, useTheme } from '../../ui/theme';
import { PhotoStrip } from '../PhotosScreen';

export function ListingSheet({ r, onClose }: { r: Run; onClose: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const l = listingFor(shop, r);
  const st = listingStockFor(shop, r);
  const pics = live(shop.photos).filter(p => p.run === r.id).length;
  const sizes = Object.entries(shop.sizes).filter(([, z]) => z.price != null);
  const tags = l.tags.split(',').map(x => x.trim()).filter(Boolean);
  const stockN = Object.values(st).reduce((a, b) => a + b, 0);
  const noM = sizes.filter(([, z]) => !z.cw).map(([, z]) => z.name);
  const checks: [boolean, string][] = [
    [pics >= 3, pics ? `Add ${3 - pics} more photo${3 - pics === 1 ? '' : 's'}. Listings with 3 or more sell better.` : 'Add photos. Listings with 3 or more sell better.'],
    [l.title.trim().length >= 10, 'Write a title of at least 10 characters.'],
    [l.desc.trim().length >= 60, 'Write a longer description.'],
    [!noM.length, `Add measurements for ${noM.join(' and ')}.`],
    [stockN > 0, r.status === 'done' ? 'Nothing left in stock to list.' : 'Nothing planned to list.'],
  ];
  const bad = checks.filter(c => !c[0]);
  const set = (k: 'title' | 'desc' | 'tags', v: string) => editRun(r.id, { listing: { ...(r.listing || {}), [k]: v } });
  const save = async (kind: 'csv' | 'txt') => {
    try {
      const f = kind === 'csv' ? listingCsv(shop, r) : { name: listingCsv(shop, r).name.replace(/\.csv$/, '.txt'), csv: listingPlainText(shop, r) };
      const path = await saveDocument('Listings', f.name, f.csv, kind === 'csv' ? 'text/csv' : 'text/plain');
      showSnack(kind === 'csv' ? 'Shopify CSV saved' : 'Listing text saved');
      if (onDevice) (kind === 'txt' ? openPath(path) : revealFile(path));
    } catch (e) {
      showSnack('Couldn’t save it.');
    }
  };
  return (
    <Sheet title="Shopify listing" sub={(r.name || 'Run').split(' — ')[0]} onClose={onClose} width={680}
      footer={<><Button kind="secondary" title="Save as text" onPress={() => save('txt')} /><Button title="Save Shopify CSV" onPress={() => save('csv')} /></>}>
      <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: 14 }}>
        <PhotoStrip link={{ run: r.id }} />
        <View style={{ backgroundColor: bad.length ? t.warnTint : t.successTint, borderRadius: R.card, padding: 12, gap: 4 }}>
          <T style={{ fontWeight: '700' }} color={bad.length ? t.onWarn : t.success}>{bad.length ? `${bad.length} thing${bad.length === 1 ? '' : 's'} to finish` : 'Ready to list'}</T>
          {bad.length ? bad.map(([, txt]) => <T key={txt} s="sub" color={t.onWarn}>• {txt}</T>) : <T s="sub">{pics} photos, a title, description, every size measured and {stockN} {r.status === 'done' ? 'in stock' : 'planned'}.</T>}
        </View>
        <View style={{ gap: 4 }}>
          <Field label="Title" value={l.title} onChange={v => set('title', v)} />
          <T s="small" color={l.title.length > 70 ? t.warn : t.text3}>{l.title.length} of 70 shown in search</T>
        </View>
        <Field label="Description" value={l.desc} onChange={v => set('desc', v)} multiline />
        <View style={{ gap: 4 }}>
          <Field label="Tags" value={l.tags} onChange={v => set('tags', v)} placeholder="dog bandana, handmade" />
          <T s="small">{tags.length} tag{tags.length === 1 ? '' : 's'}. Separate them with commas.</T>
        </View>
        {r.listing ? <Button small kind="ghost" title="Start over from the run" onPress={() => editRun(r.id, { listing: undefined })} style={{ alignSelf: 'flex-start' }} /> : null}
        <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
          {sizes.map(([k, z], i) => (
            <Row key={k} first={i === 0}>
              <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }}>{z.name}</T><T s="sub" color={z.cw ? t.text3 : t.warn}>{z.cw ? `${inch(z.cw)} × ${inch(z.cl)}` : 'Add measurements'}</T></View>
              <View style={{ alignItems: 'flex-end' }}><T style={{ fontWeight: '700' }}>{money(z.price!)}</T><T s="small">{st[k] || 0} {r.status === 'done' ? 'in stock' : 'planned'}</T></View>
            </Row>
          ))}
        </View>
        <T s="small">The Shopify CSV makes a draft product with each size, price and stock count. In Shopify, open Products › Import and choose the file, then add the photos. Files are saved in Documents › Bandana Planner › Listings.</T>
      </ScrollView>
    </Sheet>
  );
}
