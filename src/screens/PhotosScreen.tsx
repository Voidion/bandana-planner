/* Photos: the Library, Collections (client albums, pinned sets, albums, runs), the viewer and Recently Deleted. */
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dayLabel, plural } from '../lib/format';
import { addDays, rel } from '../lib/plan';
import { addAlbum, addPhotos, deleteAlbum, editAlbum, editPhoto, editPhotos, live, purgePhotos, recoverPhotos, trashPhotos } from '../state/photos';
import { exportPhotos, onDevice, openPath } from '../state/storage';
import { useShop } from '../state/store';
import type { Photo } from '../state/types';
import { AlbumsIcon, CloseIcon, PhotoIcon, PlusIcon, SlidersIcon, TrashIcon } from '../ui/icons';
import { Note, WList, WRow } from '../ui/proto';
import { Button, Chip, Empty, Field, IconButton, openMenuAt, Row, Section, Select, showSnack, T, useContextMenu } from '../ui/kit';
import { F, shadow, useTheme } from '../ui/theme';
import { CustomerSelect } from './SellingScreens';

export function Thumb({ p, size, onPress, selected, square }: { p: Photo; size: number; onPress?: () => void; selected?: boolean; square?: boolean }) {
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
    <Pressable {...ctx} accessibilityRole="imagebutton" accessibilityLabel={p.name || 'Photo'} onPress={() => !ctx.wasRight() && onPress && onPress()} style={{ width: size, height: size, borderRadius: square ? 0 : 10, overflow: 'hidden', backgroundColor: t.sunken, borderWidth: selected ? 3 : 0, borderColor: t.action }}>
      <Image source={{ uri: p.src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      {p.fav ? <View style={{ position: 'absolute', left: 8, top: 4 }}><T style={{ fontSize: 16 }} color="#fff">♥</T></View> : null}
      {selected ? <View style={{ position: 'absolute', left: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: t.action, alignItems: 'center', justifyContent: 'center' }}><T s="small" color={t.onAction} style={{ fontWeight: '700' }}>✓</T></View> : null}
    </Pressable>
  );
}

/** A row of photos for a run, fabric or customer, with Add photos */
export function PhotoStrip({ link, title = 'Photos' }: { link: { run?: string; fabric?: string; cust?: string }; title?: string }) {
  const shop = useShop();
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


type Coll = null | { k: 'fav' | 'recent' | 'fab' | 'loose' | 'deleted' } | { k: 'album'; id: string } | { k: 'run'; id: string };

/** Photos, laid out like the prototype: an edge-to-edge Library and Collections (client albums, pinned sets, albums,
    runs, Recently Deleted), with Library and Collections switched at the bottom. */
export function PhotosScreen({ go }: { go: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [tab, setTab] = useState<'library' | 'coll'>('library');
  const [coll, setColl] = useState<Coll>(null);
  const [mode, setMode] = useState<'all' | 'month' | 'run'>('all');
  const [view, setView] = useState<string | null>(null);
  const [sel, setSel] = useState<string[] | null>(null);
  const [w, setW] = useState(960);
  const [cols, setCols] = useState(7);
  const alive = live(shop.photos).sort((a, b) => b.added.localeCompare(a.added));
  const al = coll?.k === 'album' ? shop.albums.find(a => a.id === coll.id) : null;
  const runOf = coll?.k === 'run' ? shop.runs.find(r => r.id === coll.id) : null;
  const inColl = (c: Coll) =>
    !c ? alive
    : c.k === 'fav' ? alive.filter(p => p.fav)
    : c.k === 'recent' ? alive.filter(p => (rel(p.added) ?? -99) >= -30)
    : c.k === 'fab' ? alive.filter(p => p.fabric && !p.run)
    : c.k === 'loose' ? alive.filter(p => !p.run)
    : c.k === 'deleted' ? shop.photos.filter(p => p.deleted)
    : c.k === 'album' ? alive.filter(p => p.albums.includes(c.id))
    : alive.filter(p => p.run === (c as { id: string }).id);
  const list = inColl(coll);
  const size = Math.floor((w - (cols - 1) * 2) / cols);
  const toggle = (id: string) => setSel(s0 => (s0 ? (s0.includes(id) ? s0.filter(x => x !== id) : [...s0, id]) : [id]));
  const tap = (id: string) => (sel || coll?.k === 'deleted' ? toggle(id) : setView(id));
  const grid = (ps: Photo[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {ps.map(p => (
        <View key={p.id}>
          <Thumb p={p} size={size} square selected={!!sel && sel.includes(p.id)} onPress={() => tap(p.id)} />
          {coll?.k === 'deleted' && p.deleted ? <Text style={{ position: 'absolute', left: 6, bottom: 4, fontSize: F.f12, fontWeight: '700', color: '#fff' }}>{Math.max(0, rel(addDays(p.deleted, 30)) ?? 0)} days</Text> : null}
        </View>
      ))}
    </View>
  );
  const groups = (ps: Photo[]): [string, Photo[]][] => {
    if (mode === 'all' || coll) return [['', ps]];
    const out: [string, Photo[]][] = [];
    ps.forEach(p => {
      const k = mode === 'month' ? dayLabel(p.added, { month: 'long', year: 'numeric' }) : (shop.runs.find(r => r.id === p.run)?.name || 'Not in a run').split(' — ')[0];
      let g = out.find(x => x[0] === k);
      if (!g) out.push((g = [k, []]));
      g[1].push(p);
    });
    return out;
  };
  const addHere = () => addPhotos(al ? { album: al.id, cust: al.cust || undefined } : runOf ? { run: runOf.id } : {});
  const viewMenu = (e: any) => {
    const n = e?.nativeEvent || {};
    openMenuAt(n.pageX ?? 900, n.pageY ?? 120, [
      { label: (mode === 'all' ? '✓  ' : '     ') + 'All photos', onPress: () => setMode('all') },
      { label: (mode === 'month' ? '✓  ' : '     ') + 'By month', onPress: () => setMode('month') },
      { label: (mode === 'run' ? '✓  ' : '     ') + 'By run', onPress: () => setMode('run') },
      { label: '     Larger photos', onPress: () => setCols(c => Math.max(3, c - 1)) },
      { label: '     Smaller photos', onPress: () => setCols(c => Math.min(12, c + 1)) },
    ]);
  };
  const exportAlbum = async () => {
    if (!al) return;
    const where = await exportPhotos(list.map(p => p.src), 'Albums\\' + al.name);
    if (where) {
      showSnack(`${plural(list.length, 'photo')} saved in Documents › Bandana Planner › Albums`);
      openPath(where);
    } else showSnack('Saving albums to a folder works in the Windows app.');
  };
  const collTitle = !coll ? '' : coll.k === 'fav' ? 'Favorites' : coll.k === 'recent' ? 'Recently added' : coll.k === 'fab' ? 'Fabric' : coll.k === 'loose' ? 'Not in a run' : coll.k === 'deleted' ? 'Recently Deleted' : al ? al.name : runOf ? (runOf.name || 'Run').split(' — ')[0] : '';
  const glassBtn = (label: string, onPress: (e?: any) => void, child: React.ReactNode, wide?: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[{ height: 46, minWidth: 46, paddingHorizontal: wide ? 18 : 0, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface }, shadow(t.dark), t.dark ? null : { borderWidth: 1, borderColor: t.line }]}>{child}</Pressable>
  );
  const head = (title: string, sub: string, right: React.ReactNode, back?: () => void) => (
    <View style={{ paddingHorizontal: 32, paddingTop: back ? 12 : 22, paddingBottom: 12, gap: 4 }}>
      {back ? <Pressable accessibilityRole="button" onPress={back} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, alignSelf: 'flex-start' }}><Text style={{ color: t.action, fontSize: 22, marginTop: -3 }}>‹</Text><Text style={{ color: t.action, fontSize: F.f16, fontWeight: '600' }}>{tab === 'coll' ? 'Collections' : 'Library'}</Text></Pressable> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, color: t.text }}>{title}</Text>
          <Text style={{ fontSize: F.f16, fontWeight: '600', color: t.text2 }}>{sub}</Text>
        </View>
        {right}
      </View>
    </View>
  );
  const selRight = sel ? glassBtn('Done selecting', () => setSel(null), <Text style={{ fontSize: F.f16, fontWeight: '600', color: t.text }}>Done</Text>, true) : null;
  let body: React.ReactNode;
  if (tab === 'coll' && !coll) {
    const runs = shop.runs.filter(r => alive.some(p => p.run === r.id));
    const clients = shop.albums.filter(a => a.cust && shop.customers.some(c => c.id === a.cust));
    const cover = (ps: Photo[]) => ps[0];
    const tileW = 168;
    const tile = (key: string, name: string, ps: Photo[], onPress: () => void, sub?: string, heart?: boolean) => {
      const c = cover(ps);
      return (
        <Pressable key={key} accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={{ width: tileW, gap: 6 }}>
          <View style={{ width: tileW, height: tileW, borderRadius: 16, overflow: 'hidden', backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
            {c ? <Image source={{ uri: c.src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <PhotoIcon color={t.text3} size={26} />}
            {heart ? <Text style={{ position: 'absolute', left: 10, bottom: 6, fontSize: 20, color: '#fff' }}>♥</Text> : null}
          </View>
          <Text numberOfLines={1} style={{ fontSize: F.f15, fontWeight: '600', color: t.text }}>{name}</Text>
          <Text style={{ fontSize: F.f13, color: t.text3 }}>{sub || plural(ps.length, 'photo')}</Text>
        </Pressable>
      );
    };
    const sect = (title: string, extra: React.ReactNode, child: React.ReactNode) => (
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: t.text }}>{title}</Text>
          {extra}
        </View>
        {child}
      </View>
    );
    body = (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {head('Collections', `${plural(alive.length, 'photo')} · ${plural(shop.albums.length, 'album')} · ${plural(runs.length, 'run')}`, glassBtn('New album', () => setColl({ k: 'album', id: addAlbum() }), <PlusIcon color={t.text} size={20} />))}
        <View style={{ paddingHorizontal: 32, gap: 28 }}>
          {sect('For clients', null, (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {clients.map(a => {
                const ps = inColl({ k: 'album', id: a.id });
                const c = ps.find(p => p.id === a.cover) || ps[0];
                return (
                  <Pressable key={a.id} accessibilityRole="button" onPress={() => setColl({ k: 'album', id: a.id })} style={{ width: 300, height: 190, borderRadius: 20, overflow: 'hidden', backgroundColor: t.sunken, justifyContent: 'flex-end' }}>
                    {c ? <Image source={{ uri: c.src }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" /> : null}
                    <View style={{ padding: 14, backgroundColor: 'rgba(0,0,0,0.38)' }}>
                      <Text style={{ fontSize: F.f13, color: '#fff' }}>For {shop.customers.find(x => x.id === a.cust)?.name}</Text>
                      <Text style={{ fontSize: F.f18, fontWeight: '700', color: '#fff' }}>{a.name}</Text>
                      <Text style={{ fontSize: F.f13, color: '#fff' }}>{plural(ps.length, 'photo')}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {!clients.length ? (
                <Pressable accessibilityRole="button" onPress={() => setColl({ k: 'album', id: addAlbum({ name: 'Client album' }) })} style={{ width: 300, height: 190, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, padding: 18, justifyContent: 'flex-end' }}>
                  <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>Make an album for a client</Text>
                  <Text style={{ fontSize: F.f14, color: t.text3 }}>Pick photos, then save them to a folder to send</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          ))}
          {sect('Pinned', null, (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {tile('fav', 'Favorites', inColl({ k: 'fav' }), () => setColl({ k: 'fav' }), undefined, true)}
              {tile('recent', 'Recently added', inColl({ k: 'recent' }), () => setColl({ k: 'recent' }))}
              {inColl({ k: 'fab' }).length ? tile('fab', 'Fabric', inColl({ k: 'fab' }), () => setColl({ k: 'fab' })) : null}
              {inColl({ k: 'loose' }).length ? tile('loose', 'Not in a run', inColl({ k: 'loose' }), () => setColl({ k: 'loose' })) : null}
            </View>
          ))}
          {sect('Albums', <Pressable accessibilityRole="button" onPress={() => setColl({ k: 'album', id: addAlbum() })} style={{ paddingHorizontal: 12, minHeight: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: t.tint }}><Text style={{ fontSize: F.f13, fontWeight: '700', color: t.onTint }}>New</Text></Pressable>,
            shop.albums.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{shop.albums.map(a => tile(a.id, a.name, inColl({ k: 'album', id: a.id }), () => setColl({ k: 'album', id: a.id })))}</View> : <Note style={{ paddingHorizontal: 0 }}>No albums yet. Make one for a client or a Shopify listing.</Note>)}
          {runs.length ? sect('Runs', <Text style={{ fontSize: F.f13, color: t.text3 }}>Filed automatically</Text>, (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{runs.map(r => tile(r.id, (r.name || 'Run').split(' — ')[0], inColl({ k: 'run', id: r.id }), () => setColl({ k: 'run', id: r.id }), `${plural(inColl({ k: 'run', id: r.id }).length, 'photo')} · ${r.status === 'done' ? 'finished' : r.status === 'active' ? 'in progress' : 'draft'}`))}</View>
          )) : null}
          {sect('Utilities', null, (
            <WList>
              <WRow icon={<TrashIcon color={t.text3} size={18} />} title="Recently Deleted" value={String(shop.photos.filter(p => p.deleted).length)} onPress={() => setColl({ k: 'deleted' })} />
            </WList>
          ))}
        </View>
      </ScrollView>
    );
  } else {
    const right = coll?.k === 'deleted' ? selRight : (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {!coll && alive.length ? glassBtn('View options', viewMenu, <SlidersIcon color={t.text} size={20} />) : null}
        {list.length && !sel ? glassBtn('Select', () => setSel([]), <Text style={{ fontSize: F.f16, fontWeight: '600', color: t.text }}>Select</Text>, true) : selRight}
        {glassBtn('Add photos', addHere, <PlusIcon color={t.text} size={20} />)}
      </View>
    );
    body = (
      <ScrollView onLayout={e => setW(e.nativeEvent.layout.width)} contentContainerStyle={{ paddingBottom: 120 }}>
        {coll ? head(collTitle, plural(list.length, 'photo'), right, () => { setColl(null); setSel(null); }) : head('Library', alive.length ? plural(alive.length, 'photo') : '', right)}
        {al ? (
          <View style={{ marginHorizontal: 32, marginBottom: 14, padding: 16, borderRadius: 20, backgroundColor: t.surface, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="Album" value={al.name} onChange={v => editAlbum(al.id, { name: v })} /></View>
              <CustomerSelect value={al.cust} onChange={v => editAlbum(al.id, { cust: v })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Note style={{ flex: 1, paddingHorizontal: 0 }}>{al.cust ? `A client album: save it to a folder to email or upload for ${shop.customers.find(c => c.id === al.cust)?.name}.` : 'Pick a customer to make it a client album.'}</Note>
              {list.length ? <Button small kind="secondary" title="Save to a folder" onPress={exportAlbum} /> : null}
              <Button small kind="danger" title="Delete album" onPress={() => { deleteAlbum(al.id); setColl(null); showSnack('Album deleted. Its photos are still in the Library'); }} />
            </View>
          </View>
        ) : null}
        {coll?.k === 'deleted' && list.length ? <Note style={{ paddingHorizontal: 32, marginBottom: 10 }}>Photos stay here for 30 days, then they’re removed from this computer. Click photos to pick them.</Note> : null}
        {!list.length ? (
          <View style={{ paddingHorizontal: 32 }}>
            <Empty icon={<PhotoIcon color={t.action} size={26} />} title={coll?.k === 'deleted' ? 'Nothing deleted' : coll?.k === 'fav' ? 'No favorites yet' : coll ? 'Nothing here yet' : 'Add your first photos'} body={coll?.k === 'deleted' ? 'Deleted photos wait here for 30 days.' : 'Product shots, finished runs and fabric. Add photos here or from a run, fabric or customer, and they’re kept in the app’s folder on this computer.'} action={coll?.k !== 'deleted' ? <Button title="Add photos" onPress={addHere} /> : undefined} />
          </View>
        ) : groups(list).map(([g, ps]) => (
          <View key={g || 'all'} style={{ gap: 6, marginBottom: 12 }}>
            {g ? <Text style={{ paddingHorizontal: 32, fontSize: F.f18, fontWeight: '700', color: t.text }}>{g}</Text> : null}
            {grid(ps)}
          </View>
        ))}
      </ScrollView>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      {body}
      {sel && sel.length ? (
        <View style={[{ position: 'absolute', left: 32, right: 32, bottom: 96, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderRadius: 20, padding: 12 }, shadow(t.dark), { borderWidth: 1, borderColor: t.line }]}>
          <Text style={{ flex: 1, fontWeight: '600', color: t.text, fontSize: F.f15 }}>{plural(sel.length, 'photo')} selected</Text>
          {coll?.k === 'deleted' ? (
            <>
              <Button small kind="secondary" title="Recover" onPress={() => { recoverPhotos(sel); setSel(null); }} />
              <Button small kind="danger" title="Delete for good" onPress={() => { purgePhotos(sel); setSel(null); showSnack('Deleted from this computer'); }} />
            </>
          ) : (
            <>
              <Button small kind="secondary" title="Favorite" onPress={() => editPhotos(sel, () => ({ fav: true }))} />
              {shop.albums.length ? <Select label="Add to album" width={170} value="" options={[['', 'Add to album…'], ...shop.albums.map(a => [a.id, a.name] as [string, string])]} onChange={v => { if (v) { editPhotos(sel, p => ({ albums: p.albums.includes(v) ? p.albums : [...p.albums, v] })); showSnack('Added to the album'); } }} /> : null}
              {al ? <Button small kind="secondary" title="Remove from album" onPress={() => { editPhotos(sel, p => ({ albums: p.albums.filter(x => x !== al.id) })); setSel(null); }} /> : null}
              <Button small kind="danger" title="Delete" onPress={() => { const ids = sel; trashPhotos(ids); setSel(null); showSnack(`${plural(ids.length, 'photo')} moved to Recently Deleted`, () => recoverPhotos(ids)); }} />
            </>
          )}
        </View>
      ) : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 20, alignItems: 'center' }}>
        <View style={[{ flexDirection: 'row', gap: 2, padding: 4, borderRadius: 32, backgroundColor: t.surface }, shadow(t.dark), { borderWidth: 1, borderColor: t.line }]}>
          {([['library', 'Library'], ['coll', 'Collections']] as const).map(([k, l]) => {
            const on = tab === k;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setTab(k); setColl(null); setSel(null); }} style={{ width: 104, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? t.sunken : 'transparent' }}>
                {k === 'library' ? <PhotoIcon color={on ? t.action : t.text} size={20} /> : <AlbumsIcon color={on ? t.action : t.text} size={20} />}
                <Text style={{ fontSize: F.f13, fontWeight: '600', color: on ? t.action : t.text }}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
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
