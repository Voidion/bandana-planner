/* Fabric & supplies, laid out like the prototype: the shelf as photo tiles or a list (filter, sort, search), a low-stock
   banner, supplies with quick counts, offcuts; and each bolt with its stock, ordering, runs, weekly use, details,
   where to buy and print direction. */
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { money, money0, perYd, plural, yd } from '../lib/format';
import { addDays, todayDay } from '../lib/plan';
import { SWATCHES } from '../state/defaults';
import { addPhotos } from '../state/photos';
import { addFabric, deleteFabric, editFabric, restoreFabric, useShop } from '../state/store';
import { addOffcut, addSupply, arrived, cancelOrder, editSupply, forecast, markOrdered, weeklyUse } from '../state/shelf';
import { SupplierSelect } from './ShelfScreens';
import { PhotoStrip } from './PhotosScreen';
import type { Fabric, PrintTop, Supply } from '../state/types';
import { CartIcon, ChevIcon, GridIcon, ListIcon, PhotoIcon, PlusIcon, RestockIcon, SearchIcon, ShelfIcon, WarnIcon } from '../ui/icons';
import { Bar, Button, Chip, Empty, Field, NumField, openMenuAt, Segmented, Sheet, showSnack, Swatch, T } from '../ui/kit';
import { HeadBtn, LinkText, Note, PageHead, Sect, Strip, WList, WRow } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';
import { FabThumb } from '../ui/Thumbs';

const isLow = (f: Fabric) => f.low > 0 && f.yards <= f.low;
const supLow = (x: Supply) => (+x.qty || 0) <= (+x.low || 0);
const usageText = (x: Supply) => (x.use === 'order' ? `uses ${x.per || 1} per order` : x.use === 'bandana' ? `uses ${x.per || 1} per bandana` : x.use === 'item' ? `uses ${x.per || 1} per item` : 'counted by hand');
type Filter = 'all' | 'low' | 'order' | 'dir';
type Sort = 'name' | 'yards' | 'soon' | 'value';

export function FabricScreen({ onPlanWith, openRun, sel, setSel, go }: { onPlanWith: (fabricId: string) => void; openRun: (id: string) => void; sel: string | null; setSel: (id: string | null) => void; go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [last, setLast] = useState(sel);
  if (sel !== last) {
    setLast(sel);
    if (sel) setOpen(sel);
  }
  const f = open ? shop.fabrics.find(x => x.id === open) : null;
  const pick = (id: string) => { setSel(id); setOpen(id); };
  return (
    <>
      {f ? <FabricDetail key={f.id} f={f} onPlanWith={onPlanWith} openRun={openRun} onBack={() => setOpen(null)} go={go} /> : <Shelf pick={pick} onAdd={() => setAdding(true)} go={go} />}
      {adding ? <NewFabricSheet onClose={() => setAdding(false)} onAdded={id => { pick(id); setAdding(false); }} /> : null}
    </>
  );
}

function Shelf({ pick, onAdd, go }: { pick: (id: string) => void; onAdd: () => void; go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(1100);
  const [q, setQ] = useState('');
  const [flt, setFlt] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const all = shop.fabrics.filter(x => !x.offcut);
  const offcuts = shop.fabrics.filter(x => x.offcut);
  const low = all.filter(isLow);
  const lowSu = shop.supplies.filter(supLow);
  const tests: Record<Filter, (x: Fabric) => boolean> = { all: () => true, low: isLow, order: x => !!x.onOrder, dir: x => x.grain === 'directional' };
  const fcw = (x: Fabric) => forecast(shop, x)?.weeks ?? 999;
  const sorters: Record<Sort, (a: Fabric, b: Fabric) => number> = { name: (a, b) => a.name.localeCompare(b.name), yards: (a, b) => a.yards - b.yards, soon: (a, b) => fcw(a) - fcw(b) || a.yards - b.yards, value: (a, b) => Math.max(0, b.yards) * b.cost - Math.max(0, a.yards) * a.cost };
  const Q = q.trim().toLowerCase();
  const list = all.filter(tests[flt]).filter(x => !Q || (x.name + ' ' + (shop.suppliers.find(s2 => s2.id === x.sup)?.name || '')).toLowerCase().includes(Q)).sort(sorters[sort]);
  const supL = shop.supplies.filter(x => !Q || (x.name + ' ' + x.unit).toLowerCase().includes(Q));
  const cols = w >= 760 ? 4 : w >= 560 ? 3 : 2;
  const yards = all.reduce((a, x) => a + Math.max(0, x.yards), 0);
  const value = all.reduce((a, x) => a + Math.max(0, x.yards) * x.cost, 0);
  const fcLine = (x: Fabric) => { const fc = forecast(shop, x); return fc && fc.weeks < 4 ? <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.warn }}>{fc.text}</Text> : null; };
  const chip = (k: Filter, label: string) => {
    const n = all.filter(tests[k]).length;
    if (k !== 'all' && !n && flt !== k) return null;
    const on = flt === k;
    return (
      <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setFlt(k)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: on ? t.tint : t.surface, borderWidth: on ? 1.5 : 1, borderColor: on ? t.action : t.line2 }}>
        <Text style={{ fontSize: F.f15, fontWeight: '600', color: on ? t.onTint : t.text }}>{label}</Text>
        <Text style={{ fontSize: F.f15, color: on ? t.onTint : t.text3 }}>{n}</Text>
      </Pressable>
    );
  };
  const SORTS: [Sort, string][] = [['name', 'Name A–Z'], ['yards', 'Fewest yards'], ['soon', 'Runs out first'], ['value', 'Most value']];
  const addMenu = (e: any) => { const n = e?.nativeEvent || {}; openMenuAt(n.pageX ?? 900, n.pageY ?? 80, [{ label: 'Add fabric', onPress: onAdd }, { label: 'Add a supply', onPress: () => go?.('supplies', addSupply()) }]); };
  return (
    <ScrollView onLayout={e => setW(e.nativeEvent.layout.width)} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 1100, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>
        <PageHead title="Fabric & supplies" right={<HeadBtn label="Add fabric or a supply" tint onPress={addMenu as any}>{c => <PlusIcon color={c} size={24} />}</HeadBtn>} />
        {all.length ? <Strip items={[{ v: String(all.length), l: all.length === 1 ? 'bolt' : 'bolts' }, { v: yd(yards), l: 'on the shelf' }, { v: money0(value), l: 'value' }]} /> : null}
        {low.length || lowSu.length ? (
          <Pressable accessibilityRole="button" onPress={() => go?.('restock')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: low.some(x => x.yards < 0) ? t.dangerTint : t.warnTint }}>
            <WarnIcon color={t.onWarn} size={20} />
            <View style={{ flex: 1, gap: 6 }}>
              {low.length ? (
                <View>
                  <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.onWarn }}>{low.length === 1 ? `${low[0].name} is ${low[0].yards < 0 ? 'below zero' : 'low'}` : `${low.length} fabrics are low`}</Text>
                  <Text style={{ fontSize: F.f14, color: t.onWarn }}>{low.length === 1 ? `${yd(low[0].yards)} left${low[0].onOrder ? `, ${yd(low[0].onOrder)} on order` : ''}` : low.map(x => x.name).join(' · ')}</Text>
                </View>
              ) : null}
              {lowSu.length ? (
                <View>
                  <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.onWarn }}>{lowSu.length === 1 ? `${lowSu[0].name} is low` : `${lowSu.length} supplies are low`}</Text>
                  <Text style={{ fontSize: F.f14, color: t.onWarn }}>{lowSu.length === 1 ? `${lowSu[0].qty} ${lowSu[0].unit} left` : lowSu.map(x => x.name).join(' · ')}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.onWarn }}>Restock</Text>
          </Pressable>
        ) : null}
        {all.length ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              {all.length > 5 ? (
                <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }, shadow(t.dark)]}>
                  <SearchIcon color={t.text3} size={18} />
                  <TextInput accessibilityLabel="Search fabric and supplies" value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={t.text3} style={{ flex: 1, fontSize: F.f15, color: t.text, paddingVertical: 8 }} />
                </View>
              ) : <View style={{ flex: 1 }} />}
              <View style={{ flexDirection: 'row', gap: 2, padding: 3, borderRadius: 14, backgroundColor: t.sunken }}>
                {(['grid', 'list'] as const).map(v => (
                  <Pressable key={v} accessibilityRole="radio" accessibilityLabel={v === 'grid' ? 'Grid' : 'List'} accessibilityState={{ checked: view === v }} onPress={() => setView(v)}
                    style={{ width: 44, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: view === v ? t.surface : 'transparent' }}>
                    {v === 'grid' ? <GridIcon color={view === v ? t.text : t.text2} size={18} /> : <ListIcon color={view === v ? t.text : t.text2} size={18} />}
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {chip('all', 'All')}{chip('low', 'Low')}{chip('order', 'On order')}{chip('dir', 'Directional')}
              <View style={{ flex: 1 }} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Sort: ${SORTS.find(x => x[0] === sort)![1]}`} onPress={(e: any) => { const n = e?.nativeEvent || {}; openMenuAt(n.pageX ?? 900, n.pageY ?? 300, SORTS.map(([k, l]) => ({ label: (k === sort ? '✓  ' : '     ') + l, onPress: () => setSort(k) }))); }}
                style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, justifyContent: 'center', borderWidth: 1, borderColor: t.line2 }}>
                <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text2 }}>{SORTS.find(x => x[0] === sort)![1]}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Empty icon={<ShelfIcon color={t.action} size={30} />} title="Add your first fabric" body="Track yards on the shelf and cost per yard. The app warns you before a run needs more than you have, and forecasts when each bolt runs out." action={<Button title="Add fabric" onPress={onAdd} />} />
        )}
        {all.length && !list.length ? (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, borderRadius: 20, backgroundColor: t.surface }, shadow(t.dark)]}>
            <Text style={{ flex: 1, color: t.text2, fontSize: F.f15 }}>No fabric matches{Q ? ` “${q}”` : ''}.</Text>
            <Button small kind="secondary" title="Show all" onPress={() => { setQ(''); setFlt('all'); }} />
          </View>
        ) : null}
        {list.length ? (
          view === 'grid' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {list.map(x => <Tile key={x.id} f={x} width={(Math.min(w, 1100) - 64 - 12 * (cols - 1)) / cols} onPress={() => pick(x.id)} fc={fcLine(x)} />)}
            </View>
          ) : (
            <WList>
              {list.map(x => (
                <Pressable key={x.id} accessibilityRole="button" onPress={() => pick(x.id)} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                  <View style={{ borderRadius: 12, borderWidth: isLow(x) ? 2 : 0, borderColor: t.barA }}><FabThumb f={x} size={44} radius={10} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: F.f16, fontWeight: '600', color: t.text }}>{x.name}</Text>
                    <Text style={{ fontSize: F.f14, color: t.text3 }}>{perYd(x.cost)}{x.grain === 'directional' ? ' · directional' : ''}{x.onOrder ? ` · ${yd(x.onOrder)} on order` : ''}</Text>
                    {fcLine(x)}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: F.f15, fontWeight: '600', color: x.yards < 0 ? t.danger : isLow(x) ? t.warn : t.text, fontVariant: ['tabular-nums'] }}>{yd(x.yards)}</Text>
                    {isLow(x) ? <Chip tone="warn" label={x.yards < 0 ? 'Below zero' : 'Low'} /> : null}
                  </View>
                  <ChevIcon color={t.text3} size={14} />
                </Pressable>
              ))}
            </WList>
          )
        ) : null}
        {!Q || supL.length ? (
          <Sect title="Supplies" right={supL.length ? `${plural(supL.length, 'item')} · ${money0(supL.reduce((a, x) => a + Math.max(0, +x.qty || 0) * (+x.cost || 0), 0))}` : undefined}>
            {supL.length ? (
              <WList>
                {supL.map(x => (
                  <View key={x.id} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                    <Pressable accessibilityRole="button" onPress={() => go?.('supplies', x.id)} style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: F.f16, fontWeight: '600', color: t.text }}>{x.name}</Text>
                        {supLow(x) ? <Chip tone="warn" label="Low" /> : null}
                      </View>
                      <Text style={{ fontSize: F.f14, color: t.text3 }}><Text style={{ fontWeight: '600', color: supLow(x) ? t.warn : t.text }}>{x.qty} {x.unit}</Text> · {usageText(x)}</Text>
                    </Pressable>
                    <View style={{ flexDirection: 'row', backgroundColor: t.sunken, borderRadius: 12 }}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`One less ${x.name}`} onPress={() => editSupply(x.id, { qty: Math.max(0, (+x.qty || 0) - 1) })} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, fontWeight: '600', color: t.text }}>−</Text></Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`One more ${x.name}`} onPress={() => editSupply(x.id, { qty: (+x.qty || 0) + 1 })} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, fontWeight: '600', color: t.text }}>+</Text></Pressable>
                    </View>
                  </View>
                ))}
              </WList>
            ) : (
              <View style={[{ padding: 18, borderRadius: 20, backgroundColor: t.surface }, shadow(t.dark)]}>
                <Note style={{ paddingHorizontal: 0 }}>Tags, mailers, stickers and anything else you stock. Track them here and they show up in Restock when they run low.</Note>
              </View>
            )}
            <Button small kind="ghost" title="Add a supply" icon={c => <PlusIcon color={c} size={18} />} style={{ alignSelf: 'flex-start' }} onPress={() => go?.('supplies', addSupply())} />
          </Sect>
        ) : null}
        {offcuts.length ? (
          <Sect title="Offcuts" right={`${plural(offcuts.length, 'piece')} · ${yd(offcuts.reduce((a, x) => a + x.yards, 0))}`}>
            <WList>{offcuts.map(x => <WRow key={x.id} icon={<FabThumb f={x} size={36} radius={9} />} title={x.name} sub={`About ${Math.floor(x.yards / 0.13)} bandana bodies`} value={yd(x.yards)} onPress={() => pick(x.id)} />)}</WList>
          </Sect>
        ) : null}
        <Sect title="Manage">
          <WList>
            <WRow icon={<RestockIcon color={t.action} size={20} />} title="Restock" value={String(low.length + lowSu.length || '')} onPress={() => go?.('restock')} />
            <WRow icon={<CartIcon color={t.action} size={20} />} title="Suppliers" value={String(shop.suppliers.length)} onPress={() => go?.('suppliers')} />
          </WList>
        </Sect>
      </View>
    </ScrollView>
  );
}

function Tile({ f, width, onPress, fc }: { f: Fabric; width: number; onPress: () => void; fc: React.ReactNode }) {
  const shop = useShop();
  const t = useTheme();
  const has = shop.photos.some(p => !p.deleted && p.fabric === f.id);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={f.name} onPress={onPress} style={{ width, gap: 8 }}>
      <View style={{ width, height: width, borderRadius: 18, overflow: 'hidden', borderWidth: isLow(f) ? 3 : 0, borderColor: t.barA }}>
        <FabThumb f={f} size={width - (isLow(f) ? 6 : 0)} radius={0} />
        {!has ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <PhotoIcon color="#2E1500" size={26} />
            <Text style={{ color: '#2E1500', fontSize: F.f13, fontWeight: '700' }}>No photo yet</Text>
          </View>
        ) : null}
        {isLow(f) ? <View style={{ position: 'absolute', left: 8, top: 8 }}><Chip tone="warn" label={f.yards < 0 ? 'Below zero' : 'Low'} /></View> : null}
        {f.onOrder ? <View style={{ position: 'absolute', right: 8, top: 8 }}><Chip tone="ok" label="On order" /></View> : null}
      </View>
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>{f.name}</Text>
        <Text style={{ fontSize: F.f13, color: f.yards < 0 ? t.danger : isLow(f) ? t.warn : t.text3, fontWeight: isLow(f) ? '600' : '400', fontVariant: ['tabular-nums'] }}>{yd(f.yards)} · {perYd(f.cost)}</Text>
        {fc}
      </View>
    </Pressable>
  );
}

function FabricDetail({ f, onPlanWith, openRun, onBack, go }: { f: Fabric; onPlanWith: (id: string) => void; openRun: (id: string) => void; onBack: () => void; go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(1100);
  const [off, setOff] = useState(false);
  const [amt, setAmt] = useState(shop.cfg.newBolt.yards || 3);
  const set = (patch: Partial<Fabric>) => editFabric(f.id, patch);
  const uses = shop.runs.filter(p => p.fabUse.some(u => u.f === f.id) || (!p.cut && p.status !== 'done' && (p.body === f.id || p.ties === f.id)));
  const fc = forecast(shop, f);
  const wk = weeklyUse(shop, f.id);
  const sp = shop.suppliers.find(x => x.id === f.sup);
  const scale = Math.max(5, f.yards, f.low * 2.5);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = addDays(todayDay(), -7 * (8 - i));
    const to = addDays(todayDay(), -7 * (7 - i));
    return shop.usage.filter(u => u.f === f.id && u.day > from && u.day <= to).reduce((a, u) => a + u.yd, 0);
  });
  const wmax = Math.max(0.1, ...weeks);
  const link = (f.url || sp?.site || '').trim();
  const href = link ? (/^https?:\/\//i.test(link) ? link : 'https://' + link) : '';
  const remove = () => {
    const i = shop.fabrics.findIndex(x => x.id === f.id);
    deleteFabric(f.id);
    onBack();
    showSnack(`${f.name} deleted`, () => restoreFabric(f, i));
  };
  const wide = w >= 900;
  const numRow = (label: string, sub: string | undefined, value: number | null | undefined, onChange: (n: number) => void, unit?: string, prefix?: string) => (
    <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: F.f16, color: t.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: F.f14, color: t.text3 }}>{sub}</Text> : null}
      </View>
      {prefix ? <Text style={{ color: t.text3, fontSize: F.f15 }}>{prefix}</Text> : null}
      <NumField bare label={label} value={value} onChange={n => onChange(n ?? 0)} width={96} min={label === 'On the shelf' ? -50 : 0} />
      {unit ? <Text style={{ color: t.text3, fontSize: F.f15, width: 34 }}>{unit}</Text> : null}
    </View>
  );
  const leftCol = (
    <>
      <View style={{ height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: f.color }}>
        <FabThumb f={f} size={Math.max(200, w)} radius={0} />
        <Pressable accessibilityRole="button" onPress={() => addPhotos({ fabric: f.id })} style={{ position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <PhotoIcon color="#1B1B1E" size={16} />
          <Text style={{ fontSize: F.f14, fontWeight: '700', color: '#1B1B1E' }}>Add your photo</Text>
        </Pressable>
      </View>
      <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 10 }, shadow(t.dark)]}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontSize: 40, fontWeight: '700', color: f.yards < 0 ? t.danger : t.text, fontVariant: ['tabular-nums'] }}>{Math.round(f.yards * 100) / 100}</Text>
          <Text style={{ fontSize: F.f15, color: t.text3 }}>yards on the shelf</Text>
          {isLow(f) ? <Chip tone="warn" label="Low" /> : null}
        </View>
        <View>
          <Bar value={f.yards / scale} color={isLow(f) ? t.barA : t.barG} />
          {f.low > 0 ? <View style={{ position: 'absolute', left: `${Math.min(100, (f.low / scale) * 100)}%`, top: -3, width: 2, height: 12, backgroundColor: t.text }} /> : null}
        </View>
        {f.low > 0 ? <Text style={{ fontSize: F.f13, color: t.text3 }}>Warns below {yd(f.low)}</Text> : null}
        <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text }}>{fc ? `${fc.text}${wk ? `, using ${yd(wk)} a week` : ''}` : wk ? `Using ${yd(wk)} a week` : 'Not cut from yet. Each cut logs its yards and the run-out forecast follows.'}</Text>
        {f.offcut ? null : f.onOrder ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ flex: 1, fontSize: F.f15, color: t.text }}><Text style={{ fontWeight: '700' }}>{yd(f.onOrder)}</Text> on order{sp ? ` from ${sp.name}` : ''}</Text>
            <Button small kind="ghost" title="Cancel" onPress={() => cancelOrder('fabric', f.id)} />
            <Button small title="It arrived" onPress={() => { arrived('fabric', f.id); showSnack(`${f.name}: +${yd(f.onOrder)} on the shelf`); }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.sunken, borderRadius: 14 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Half a yard less" onPress={() => setAmt(a => Math.max(0.5, a - 0.5))} style={{ width: 48, height: 52, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, color: t.text }}>−</Text></Pressable>
              <Text style={{ minWidth: 60, textAlign: 'center', fontSize: F.f15, fontWeight: '600', color: t.text }}>{yd(amt)}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Half a yard more" onPress={() => setAmt(a => a + 0.5)} style={{ width: 48, height: 52, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, color: t.text }}>+</Text></Pressable>
            </View>
            <Button title="Mark ordered" style={{ flex: 1 }} onPress={() => { markOrdered('fabric', f.id, amt); showSnack(`${yd(amt)} of ${f.name} on order`); }} />
          </View>
        )}
      </View>
      <Sect title="Planned and cut">
        {uses.length ? (
          <View style={{ gap: 8 }}>
            {uses.map(p => {
              const used = p.fabUse.filter(u => u.f === f.id).reduce((a, u) => a + u.used, 0);
              const need = p.fabrics.filter(x => x.f === f.id).reduce((a, x) => a + x.need, 0);
              const role = p.body === f.id ? 'body' : 'straps';
              return (
                <Pressable key={p.id} accessibilityRole="button" onPress={() => openRun(p.id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: t.surface }, shadow(t.dark)]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: F.f15, color: t.text }}>{(p.name || 'Untitled run').split(' — ')[0]}</Text>
                    <Text style={{ fontSize: F.f13, color: t.text3 }}>{[(p.name || '').split(' — ')[1], role, p.cut ? 'cut' : p.status === 'done' ? 'finished' : 'planned'].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] }}>{p.cut ? '−' + yd(used) : yd(need) + ' needed'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : <Note style={{ paddingHorizontal: 0 }}>Not in any run yet.</Note>}
      </Sect>
      <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 10 }, shadow(t.dark)]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>Used per week</Text>
          <Text style={{ fontSize: F.f14, color: t.text3 }}>{wk ? `${yd(wk)} a week` : 'Nothing cut yet'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 50 }}>
          {weeks.map((v, i) => <View key={i} style={{ flex: 1, height: Math.max(2, (v / wmax) * 48), borderRadius: 3, backgroundColor: i === 7 ? t.barA : t.barB }} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: F.f13, color: t.text3 }}>8 weeks ago</Text>
          <Text style={{ fontSize: F.f13, color: t.text3 }}>This week</Text>
        </View>
      </View>
    </>
  );
  const rightCol = (
    <>
      <Sect title="Details">
        <WList>
          <View style={{ paddingVertical: 12, gap: 4 }}>
            <Text style={{ fontSize: F.f13, color: t.text3 }}>Name</Text>
            <TextInput accessibilityLabel="Name" value={f.name} onChangeText={v => set({ name: v })} style={{ fontSize: F.f16, color: t.text, paddingVertical: 4 }} />
          </View>
          {numRow('On the shelf', 'Type what you measured', f.yards, n => set({ yards: n }), 'yd')}
          {numRow('Cost per yard', undefined, f.cost, n => set({ cost: n }), undefined, '$')}
          {numRow('Warn below', undefined, f.low, n => set({ low: n }), 'yd')}
          {!f.offcut ? numRow('Takes to arrive', sp ? `${sp.name} usually takes ${sp.lead} days` : undefined, f.lead ?? sp?.lead ?? null, n => set({ lead: n }), 'days') : null}
          <WRow title="Value on the shelf" value={money(Math.max(0, f.yards) * f.cost)} />
        </WList>
      </Sect>
      {!f.offcut ? (
        <Sect title="Where to buy" right={<LinkText onPress={() => go?.('suppliers')}>All suppliers</LinkText>}>
          <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 14 }, shadow(t.dark)]}>
            <SupplierSelect label="Supplier" value={f.sup} onChange={v => set({ sup: v })} />
            <Field label="Product link for this fabric" value={f.url || ''} onChange={v => set({ url: v })} placeholder="shop.example.com/fabric" />
            {sp ? <Text style={{ fontSize: F.f14, color: t.text2 }}>{sp.name} ships in {sp.lead} days{sp.ship ? ` · ${sp.ship}` : ''}</Text> : null}
            {href ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button small title="Open shop" style={{ flex: 1 }} onPress={() => Linking.openURL(href).catch(() => showSnack('Couldn’t open that link.'))} />
                <Button small kind="secondary" title="Copy link" style={{ flex: 1 }} onPress={() => { try { (globalThis as any).navigator?.clipboard?.writeText(href); showSnack('Link copied'); } catch { showSnack('Couldn’t copy the link.'); } }} />
              </View>
            ) : null}
          </View>
        </Sect>
      ) : <Note>Left over from {f.from || 'an earlier cut'}. Offcuts can be picked for any run, and never show in Restock.</Note>}
      <Sect title="Print direction" right={f.grain === 'directional' ? 'has a right way up' : 'any direction'}>
        <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 14 }, shadow(t.dark)]}>
          <Segmented fill label="Print direction" bare value={f.grain} options={[['none', 'Any direction'], ['directional', 'Right way up']]} onChange={v => set({ grain: v })} />
          {f.grain === 'directional' ? (
            <>
              <Segmented<PrintTop> label="Top of the print faces" value={f.top} options={[['up', 'Up'], ['down', 'Down'], ['left', 'Left'], ['right', 'Right']]} onChange={v => set({ top: v })} />
              <Segmented label="Reads" value={f.way} options={[['one', 'One way only'], ['two', 'Either way up']]} onChange={v => set({ way: v })} />
            </>
          ) : null}
          <Note style={{ paddingHorizontal: 0 }}>Directional prints keep every bandana the right way up on the mat, which can use more fabric.</Note>
        </View>
      </Sect>
      <Sect title="Notes">
        <WList>
          <TextInput accessibilityLabel="Notes" value={f.notes} onChangeText={v => set({ notes: v })} multiline placeholder="Fibre, weight, care…" placeholderTextColor={t.text3} style={{ minHeight: 64, paddingVertical: 14, fontSize: F.f15, color: t.text, textAlignVertical: 'top' }} />
        </WList>
      </Sect>
      <Sect title="Colour in lists">
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {SWATCHES.map(c => (
            <Pressable key={c} accessibilityRole="radio" accessibilityLabel={'Colour ' + c} accessibilityState={{ checked: f.color === c }} onPress={() => set({ color: c })} style={{ padding: 2, borderRadius: 10, borderWidth: 2, borderColor: f.color === c ? t.action : 'transparent' }}>
              <Swatch color={c} size={24} />
            </Pressable>
          ))}
        </View>
      </Sect>
      <PhotoStrip link={{ fabric: f.id }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button small kind="secondary" title="Plan a run with it" style={{ flex: 1 }} onPress={() => onPlanWith(f.id)} />
        {!f.offcut ? <Button small kind="secondary" title="Keep an offcut" style={{ flex: 1 }} onPress={() => setOff(true)} /> : null}
      </View>
      <Button kind="danger" title="Delete fabric" onPress={remove} />
    </>
  );
  return (
    <ScrollView onLayout={e => setW(e.nativeEvent.layout.width)} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 1100, paddingHorizontal: 32, paddingTop: 20, paddingBottom: 60, gap: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Fabric & supplies" onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' }}>
          <Text style={{ color: t.action, fontSize: 22, marginTop: -3 }}>‹</Text>
          <Text style={{ color: t.action, fontSize: F.f16, fontWeight: '600' }}>Back</Text>
        </Pressable>
        <View>
          <Text style={{ fontSize: F.f14, color: t.text3 }}>{f.offcut ? 'Offcut' : 'Fabric'}</Text>
          <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, color: t.text }}>{f.name}</Text>
        </View>
        {wide ? (
          <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 16, minWidth: 0 }}>{leftCol}</View>
            <View style={{ flex: 1, gap: 16, minWidth: 0 }}>{rightCol}</View>
          </View>
        ) : <View style={{ gap: 16 }}>{leftCol}{rightCol}</View>}
      </View>
      {off ? <OffcutSheet f={f} onClose={() => setOff(false)} /> : null}
    </ScrollView>
  );
}

function NewFabricSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const shop = useShop();
  const [name, setName] = useState('');
  const [yards, setYards] = useState<number | null>(shop.cfg.newBolt.yards);
  const [cost, setCost] = useState<number | null>(null);
  const [low, setLow] = useState<number | null>(shop.cfg.newBolt.low);
  const [grain, setGrain] = useState<'none' | 'directional'>('none');
  const [err, setErr] = useState('');
  const add = () => {
    const miss = [!name.trim() && 'a name', !(yards && yards > 0) && 'what you measured'].filter(Boolean) as string[];
    if (miss.length) return setErr('Add ' + miss.join(' and '));
    const id = addFabric({ name: name.trim(), yards: yards || 0, cost: cost || 0, low: low ?? 0, grain });
    showSnack(`${name.trim()} is on the shelf`);
    onAdded(id);
  };
  return (
    <Sheet title="New fabric" sub="A bolt for your shelf" onClose={onClose}
      footer={<>
        {err ? <T s="sub" style={{ flex: 1, alignSelf: 'center' }}>{err}</T> : null}
        <Button kind="secondary" title="Cancel" onPress={onClose} />
        <Button title="Add to shelf" onPress={add} />
      </>}>
      <Field label="Name" value={name} onChange={v => { setName(v); setErr(''); }} placeholder="Rust gingham" autoFocus />
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <NumField label="What you measured" value={yards} onChange={setYards} suffix="yd" width={150} />
        <NumField label="Cost per yard" value={cost} onChange={setCost} prefix="$" width={130} placeholder="0.00" />
        <NumField label="Warn below" value={low} onChange={setLow} suffix="yd" width={120} />
      </View>
      <Segmented label="Print direction" value={grain} options={[['none', 'No direction'], ['directional', 'Has a right way up']]} onChange={setGrain} />
    </Sheet>
  );
}

function OffcutSheet({ f, onClose }: { f: Fabric; onClose: () => void }) {
  const [n, setN] = useState<number | null>(null);
  const [from, setFrom] = useState<'shelf' | 'extra'>('shelf');
  const go = () => {
    if (!(n && n > 0)) return;
    addOffcut(f.id, n, from === 'shelf');
    showSnack(`Kept ${yd(n)} as an offcut`);
    onClose();
  };
  return (
    <Sheet title="Keep an offcut" sub={f.name} onClose={onClose} footer={<><Button kind="ghost" title="Cancel" onPress={onClose} /><Button title="Keep it" onPress={go} disabled={!(n && n > 0)} /></>}>
      <NumField label="How much" value={n} onChange={setN} suffix="yd" width={140} placeholder="0.5" />
      <Segmented label="Where it comes from" value={from} options={[['shelf', 'Cut from this bolt'], ['extra', 'Left over from a cut']]} onChange={setFrom} />
      <T s="small">{from === 'shelf' ? `Moves the yards from ${f.name} to the offcut.` : 'A cut already took its yards off the shelf, so this adds the leftover piece without changing the bolt.'}</T>
    </Sheet>
  );
}
