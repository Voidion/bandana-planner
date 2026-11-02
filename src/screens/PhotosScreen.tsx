/* Photos: the library, albums (including client albums), the viewer and Recently Deleted. */
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { dayLabel, plural } from '../lib/format';
import { addDays, rel } from '../lib/plan';
import { addAlbum, addPhotos, deleteAlbum, editAlbum, editPhoto, editPhotos, live, purgePhotos, recoverPhotos, trashPhotos } from '../state/photos';
import { exportPhotos, onDevice, openPath } from '../state/storage';
import { useShop } from '../state/store';
import type { Photo } from '../state/types';
import { CloseIcon, PlusIcon, TrashIcon } from '../ui/icons';
import { Button, Card, Chip, Empty, Field, IconButton, Row, Section, Segmented, Select, showSnack, T, useContextMenu } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';
import { CustomerSelect } from './SellingScreens';

export function Thumb({ p, size, onPress, selected }: { p: Photo; size: number; onPress?: () => void; selected?: boolean }) {
  const t = useTheme();
  const ctx = useContextMenu(
    p.deleted
      ? [{ label: 'Recover', onPress: () => recoverPhotos([p.id]) }, { label: 'Delete for good', danger: true, onPress: () => purgePhotos([p.id]) }]
      : [
          onPress ? { label: 'Open', onPress } : null,
          { label: p.fav ? 'Remove from favorites' : 'Favorite', onPress: () => editPhoto(p.id, { fav: !p.fav }) },
          { label: 'Delete', danger: true, onPress: () => { trashPhotos([p.id]); showSnack('Moved to Recently deleted', () => recoverPhotos([p.id])); } },
        ],
  );
  return (
    <Pressable {...ctx} accessibilityRole="imagebutton" accessibilityLabel={p.name || 'Photo'} onPress={() => !ctx.wasRight() && onPress && onPress()} style={{ width: size, height: size, borderRadius: 10, overflow: 'hidden', backgroundColor: t.sunken, borderWidth: selected ? 3 : 0, borderColor: t.action }}>
      <Image source={{ uri: p.src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      {p.fav ? <View style={{ position: 'absolute', right: 6, top: 4 }}><T style={{ fontSize: 16 }} color="#fff">♥</T></View> : null}
      {selected ? <View style={{ position: 'absolute', left: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: t.action, alignItems: 'center', justifyContent: 'center' }}><T s="small" color={t.onAction} style={{ fontWeight: '700' }}>✓</T></View> : null}
    </Pressable>
  );
}

/** A row of photos for a run, fabric or customer, with Add photos */
export function PhotoStrip({ link, title = 'Photos' }: { link: { run?: string; fabric?: string; cust?: string }; title?: string }) {
  const shop = useShop();
  const t = useTheme();
  const [view, setView] = useState<string | null>(null);
  const list = live(shop.photos).filter(p => (link.run && p.run === link.run) || (link.fabric && p.fabric === link.fabric) || (link.cust && p.cust === link.cust));
  return (
    <Section title={list.length ? `${title} · ${list.length}` : title} right={<Button small kind="ghost" title="Add photos" icon={c => <PlusIcon color={c} size={14} />} onPress={() => addPhotos(link)} />}>
      {list.length ? (
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {list.map(p => <Thumb key={p.id} p={p} size={96} onPress={() => setView(p.id)} />)}
        </ScrollView>
      ) : <T s="sub">No photos yet.</T>}
      {view ? <Viewer ids={list.map(p => p.id)} start={view} onClose={() => setView(null)} /> : null}
    </Section>
  );
}

type Tab = 'all' | 'fav' | 'albums' | 'deleted';

export function PhotosScreen({ go }: { go: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [tab, setTab] = useState<Tab>('all');
  const [album, setAlbum] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [sel, setSel] = useState<string[] | null>(null);
  const [w, setW] = useState(900);
  const alive = live(shop.photos);
  const al = shop.albums.find(a => a.id === album);
  const list =
    tab === 'deleted' ? shop.photos.filter(p => p.deleted) : tab === 'fav' ? alive.filter(p => p.fav) : tab === 'albums' ? (al ? alive.filter(p => p.albums.includes(al.id)) : []) : alive;
  const cols = Math.max(3, Math.floor((w + 10) / 170));
  const size = Math.floor((w - (cols - 1) * 10) / cols);
  const toggle = (id: string) => setSel(s => (s ? (s.includes(id) ? s.filter(x => x !== id) : [...s, id]) : [id]));
  const tap = (id: string) => (sel ? toggle(id) : setView(id));
  const exportAlbum = async () => {
    if (!al) return;
    const where = await exportPhotos(list.map(p => p.src), 'Albums\\' + al.name);
    if (where) {
      showSnack(`${plural(list.length, 'photo')} saved in Documents › Bandana Planner › Albums`);
      openPath(where);
    } else showSnack('Saving albums to a folder works in the Windows app.');
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 32, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T s="title">Photos</T>
            <T s="sub">{plural(alive.length, 'photo')}, kept on this computer.</T>
          </View>
          {list.length && tab !== 'deleted' ? <Button small kind="secondary" title={sel ? 'Cancel' : 'Select'} onPress={() => setSel(sel ? null : [])} /> : null}
          {tab !== 'deleted' ? <Button small title="Add photos" icon={c => <PlusIcon color={c} size={14} />} onPress={() => addPhotos(al ? { album: al.id, cust: al.cust || undefined } : {})} /> : null}
        </View>
        <Segmented label="Show" bare value={tab} onChange={v => { setTab(v); setSel(null); setAlbum(null); }} options={[['all', 'All'], ['fav', 'Favorites'], ['albums', `Albums · ${shop.albums.length}`], ['deleted', `Recently deleted${shop.photos.some(p => p.deleted) ? ' · ' + shop.photos.filter(p => p.deleted).length : ''}`]]} />
        {tab === 'albums' && !al ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {shop.albums.map(a => {
              const ps = alive.filter(p => p.albums.includes(a.id));
              const cover = ps.find(p => p.id === a.cover) || ps[0];
              const c = shop.customers.find(x => x.id === a.cust);
              return (
                <Pressable key={a.id} onPress={() => setAlbum(a.id)} style={{ width: 190, gap: 6 }}>
                  <View style={{ width: 190, height: 150, borderRadius: R.card, overflow: 'hidden', backgroundColor: t.sunken }}>{cover ? <Image source={{ uri: cover.src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}</View>
                  <T style={{ fontWeight: '600' }}>{a.name}</T>
                  <T s="sub">{plural(ps.length, 'photo')}{c ? ' · for ' + c.name : ''}</T>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setAlbum(addAlbum())} style={{ width: 190, height: 150, borderRadius: R.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <PlusIcon color={t.action} size={22} />
              <T color={t.action} style={{ fontWeight: '600' }}>New album</T>
            </Pressable>
          </View>
        ) : null}
        {al ? (
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Button small kind="ghost" title="‹ Albums" onPress={() => setAlbum(null)} />
              <View style={{ flex: 1, minWidth: 200 }}><Field label="Album" value={al.name} onChange={v => editAlbum(al.id, { name: v })} /></View>
              <CustomerSelect value={al.cust} onChange={v => editAlbum(al.id, { cust: v })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {al.cust ? <T s="sub" style={{ flex: 1 }}>A client album: save it to a folder to email or upload for {shop.customers.find(c => c.id === al.cust)?.name}.</T> : <T s="sub" style={{ flex: 1 }}>Pick a customer to make it a client album.</T>}
              {list.length ? <Button small kind="secondary" title="Save to a folder" onPress={exportAlbum} /> : null}
              <Button small kind="danger" title="Delete album" onPress={() => { deleteAlbum(al.id); setAlbum(null); showSnack('Album deleted. Its photos are still in All'); }} />
            </View>
          </Card>
        ) : null}
        {tab === 'deleted' && list.length ? <T s="sub">Photos stay here for 30 days, then they’re removed from this computer.</T> : null}
        {(tab !== 'albums' || al) && !list.length ? (
          <Empty icon={<PlusIcon color={t.action} size={26} />} title={tab === 'deleted' ? 'Nothing deleted' : tab === 'fav' ? 'No favorites yet' : al ? 'This album is empty' : 'Add your first photos'} body={tab === 'deleted' ? 'Deleted photos wait here for 30 days.' : 'Product shots, finished runs and fabric. Add photos here or from a run, fabric or customer, and they’re kept in the app’s folder on this computer.'} action={tab === 'all' || al ? <Button title="Add photos" onPress={() => addPhotos(al ? { album: al.id } : {})} /> : undefined} />
        ) : null}
        <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(tab !== 'albums' || al) && list.map(p => (
            <View key={p.id} style={{ gap: 4 }}>
              <Thumb p={p} size={size} selected={!!sel && sel.includes(p.id)} onPress={() => (tab === 'deleted' ? toggle(p.id) : tap(p.id))} />
              {tab === 'deleted' && p.deleted ? <T s="small">{Math.max(0, rel(addDays(p.deleted, 30)) ?? 0)} days left</T> : null}
            </View>
          ))}
        </View>
      </ScrollView>
      {(sel && sel.length) || (tab === 'deleted' && sel && sel.length) ? (
        <View style={{ position: 'absolute', left: 32, right: 32, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderRadius: R.card, padding: 12, borderWidth: 1, borderColor: t.line }}>
          <T style={{ flex: 1, fontWeight: '600' }}>{plural(sel!.length, 'photo')} selected</T>
          {tab === 'deleted' ? (
            <>
              <Button small kind="secondary" title="Recover" onPress={() => { recoverPhotos(sel!); setSel(null); }} />
              <Button small kind="danger" title="Delete for good" onPress={() => { purgePhotos(sel!); setSel(null); showSnack('Deleted from this computer'); }} />
            </>
          ) : (
            <>
              <Button small kind="secondary" title="Favorite" onPress={() => editPhotos(sel!, () => ({ fav: true }))} />
              {shop.albums.length ? <Select label="Add to album" width={170} value="" options={[['', 'Add to album…'], ...shop.albums.map(a => [a.id, a.name] as [string, string])]} onChange={v => { if (v) { editPhotos(sel!, p => ({ albums: p.albums.includes(v) ? p.albums : [...p.albums, v] })); showSnack('Added to the album'); } }} /> : null}
              {al ? <Button small kind="secondary" title="Remove from album" onPress={() => { editPhotos(sel!, p => ({ albums: p.albums.filter(x => x !== al.id) })); setSel(null); }} /> : null}
              <Button small kind="danger" title="Delete" onPress={() => { const ids = sel!; trashPhotos(ids); setSel(null); showSnack(`${plural(ids.length, 'photo')} moved to Recently deleted`, () => recoverPhotos(ids)); }} />
            </>
          )}
        </View>
      ) : null}
      {view ? <Viewer ids={list.map(p => p.id)} start={view} onClose={() => setView(null)} go={go} /> : null}
    </View>
  );
}

/** Full-window photo viewer: previous and next, favorite, album cover, links, delete. */
export function Viewer({ ids, start, onClose, go }: { ids: string[]; start: string; onClose: () => void; go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [cur, setCur] = useState(start);
  const i = Math.max(0, ids.indexOf(cur));
  const p = shop.photos.find(x => x.id === ids[i]);
  if (!p) return null;
  const r = shop.runs.find(x => x.id === p.run);
  const f = shop.fabrics.find(x => x.id === p.fabric);
  const c = shop.customers.find(x => x.id === p.cust);
  const move = (d: number) => setCur(ids[(i + d + ids.length) % ids.length]);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,12,0.94)', flexDirection: 'row' }]}>
      <View style={{ flex: 1, padding: 24, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T style={{ flex: 1, fontWeight: '600' }} color="#F2F0F4" numberOfLines={1}>{p.name} · {i + 1} of {ids.length}</T>
          <IconButton label="Close" onPress={onClose}>{() => <CloseIcon color="#F2F0F4" size={18} />}</IconButton>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {ids.length > 1 ? <Pressable accessibilityLabel="Previous photo" onPress={() => move(-1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 22 }} color="#fff">‹</T></Pressable> : null}
          <Image source={{ uri: p.src }} style={{ flex: 1, height: '100%' }} resizeMode="contain" />
          {ids.length > 1 ? <Pressable accessibilityLabel="Next photo" onPress={() => move(1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 22 }} color="#fff">›</T></Pressable> : null}
        </View>
      </View>
      <View style={{ width: 300, backgroundColor: t.surface, padding: 20, gap: 14 }}>
        <T s="h1">Details</T>
        <T s="sub">Added {dayLabel(p.added, { month: 'long', day: 'numeric', year: 'numeric' })}</T>
        <Button kind={p.fav ? 'primary' : 'secondary'} small title={p.fav ? '♥ Favorite' : '♡ Favorite'} onPress={() => editPhoto(p.id, { fav: !p.fav })} />
        <View style={{ gap: 4 }}><T s="label">Run</T><Select label="Run" width={256} value={p.run || ''} options={[['', 'None'], ...shop.runs.map(x => [x.id, (x.name || 'Untitled run').split(' — ')[0]] as [string, string])]} onChange={v => editPhoto(p.id, { run: v || null })} /></View>
        <View style={{ gap: 4 }}><T s="label">Fabric</T><Select label="Fabric" width={256} value={p.fabric || ''} options={[['', 'None'], ...shop.fabrics.map(x => [x.id, x.name] as [string, string])]} onChange={v => editPhoto(p.id, { fabric: v || null })} /></View>
        <CustomerSelect value={p.cust} onChange={v => editPhoto(p.id, { cust: v })} width={256} />
        {shop.albums.length ? (
          <View style={{ gap: 6 }}>
            <T s="label">Albums</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {shop.albums.map(a => {
                const on = p.albums.includes(a.id);
                return <Pressable key={a.id} onPress={() => editPhoto(p.id, { albums: on ? p.albums.filter(x => x !== a.id) : [...p.albums, a.id] })}><Chip label={(on ? '✓ ' : '') + a.name} tone={on ? 'tint' : 'plain'} /></Pressable>;
              })}
            </View>
            {p.albums.length ? <Button small kind="ghost" title="Use as album cover" onPress={() => { p.albums.forEach(a => editAlbum(a, { cover: p.id })); showSnack('Album cover set'); }} /> : null}
          </View>
        ) : null}
        <Field label="Note" value={p.note} onChange={v => editPhoto(p.id, { note: v })} multiline placeholder="Fabric, size, who it’s for…" />
        {go && (r || f) ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{r ? <Button small kind="secondary" title="Open run" onPress={() => { onClose(); go('runs', r.id); }} /> : null}{f ? <Button small kind="secondary" title="Open fabric" onPress={() => { onClose(); go('fabric', f.id); }} /> : null}</View> : null}
        <View style={{ flex: 1 }} />
        {p.deleted ? (
          <Button kind="secondary" title="Recover" onPress={() => recoverPhotos([p.id])} />
        ) : (
          <Button kind="danger" title="Delete" icon={cc => <TrashIcon color={cc} size={15} />} onPress={() => { trashPhotos([p.id]); showSnack('Moved to Recently deleted', () => recoverPhotos([p.id])); if (ids.length <= 1) onClose(); else move(1); }} />
        )}
        {c ? <T s="small">For {c.name}</T> : null}
      </View>
    </View>
  );
}

export { F, Row, onDevice };
