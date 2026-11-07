/* App-wide: search everything, the New menu, keyboard shortcuts, and Settings › Shop. */
import { REM_KINDS } from '../state/alerts';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { money, plural, yd } from '../lib/format';
import { itemName } from '../lib/plan';
import { addPhotos } from '../state/photos';
import { addEvent } from '../state/planning';
import { addQuote } from '../state/quotes';
import { addCustomer, addOrder, orderLabel } from '../state/selling';
import { addSupply } from '../state/shelf';
import { dataFolderPath, onDevice, openPath } from '../state/storage';
import { addFabric, planRun, update, useShop } from '../state/store';
import { BoxIcon, CalIcon, CartIcon, EditIcon, FabricIcon, PeopleIcon, PhotoIcon, ScissorsIcon, SearchIcon, SpoolIcon, TagIcon } from '../ui/icons';
import { Button, Card, closeTopSheet, Field, Row, Section, Segmented, Sheet, T } from '../ui/kit';
import { F, R, useTheme } from '../ui/theme';

type Go = (route: string, id?: string) => void;

export const SHORTCUTS: [string, string][] = [
  ['Ctrl + K', 'Search'],
  ['Ctrl + N', 'New…'],
  ['Ctrl + 1', 'Today'],
  ['Ctrl + 2', 'Runs'],
  ['Ctrl + 3', 'Workflow'],
  ['Ctrl + 4', 'Schedule'],
  ['Ctrl + 5', 'Orders'],
  ['Ctrl + 6', 'Quotes'],
  ['Ctrl + 7', 'Customers'],
  ['Ctrl + 8', 'Payments'],
  ['Ctrl + 9', 'Fabric'],
  ['Ctrl + \\', 'Split view'],
  ['Ctrl + ,', 'Settings'],
  ['F1', 'Help & tour'],
  ['Esc', 'Close'],
];
const NAV: Record<string, string> = { '1': 'today', '2': 'runs', '3': 'workflow', '4': 'schedule', '5': 'orders', '6': 'quotes', '7': 'customers', '8': 'sales', '9': 'fabric', ',': 'settings' };

/** Handles shortcuts for a key event from the app's root view. Returns true when it used the key. */
export function handleKey(e: any, a: { search: () => void; newMenu: () => void; go: Go; close: () => boolean; split?: () => void }) {
  const k = String(e?.nativeEvent?.key || '').toLowerCase();
  const ctrl = !!(e?.nativeEvent?.ctrlKey || e?.nativeEvent?.metaKey);
  if (k === 'escape') return closeTopSheet() || a.close();
  if (k === 'f1') return a.go('settings', 'help'), true;
  if (!ctrl) return false;
  if (k === 'k' || k === 'f') return a.search(), true;
  if (k === 'n') return a.newMenu(), true;
  if (k === '\\' && a.split) return a.split(), true;
  if (NAV[k]) return a.go(NAV[k]), true;
  return false;
}

/* ---------- search ---------- */
const JUMP: [string, string, string?][] = [
  ['Today', 'today'], ['Runs', 'runs'], ['Workflow', 'workflow'], ['Schedule', 'schedule'], ['Orders', 'orders'], ['Quotes', 'quotes'], ['Customers', 'customers'],
  ['Payments', 'sales'], ['Finished stock', 'stock'], ['Market day', 'market'], ['Fabric & supplies', 'fabric'], ['Restock', 'restock'], ['Photos', 'photos'], ['Trends', 'trends'],
  ['Reports', 'reports'], ['Maintenance', 'maintenance'], ['Activity', 'activity'], ['Settings', 'settings'], ['Help & tour', 'settings', 'help'],
];
export function SearchSheet({ onClose, go }: { onClose: () => void; go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const [q, setQ] = useState('');
  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const has = (...xs: (string | undefined | null)[]) => xs.some(x => x && x.toLowerCase().includes(s));
    const out: { kind: string; title: string; sub: string; go: () => void }[] = [];
    JUMP.filter(([l]) => has(l)).forEach(([l, r, id]) => out.push({ kind: 'Go to', title: l, sub: '', go: () => go(r, id) }));
    shop.runs.filter(r => has(r.name)).forEach(r => out.push({ kind: 'Run', title: (r.name || 'Untitled run').split(' — ')[0], sub: r.status === 'done' ? 'Finished' : r.status === 'active' ? 'In progress' : 'Draft', go: () => go('runs', r.id) }));
    shop.fabrics.filter(f => has(f.name, f.notes, f.from)).forEach(f => out.push({ kind: f.offcut ? 'Offcut' : 'Fabric', title: f.name, sub: yd(f.yards) + ' on the shelf', go: () => go('fabric', f.id) }));
    shop.orders.filter(o => has(o.title, o.src, o.notes, shop.customers.find(c => c.id === o.cust)?.name)).forEach(o => out.push({ kind: 'Order', title: o.title || shop.customers.find(c => c.id === o.cust)?.name || 'Order', sub: orderLabel(shop, o), go: () => go('orders', o.id) }));
    shop.quotes.filter(x => has(x.no, x.title, shop.customers.find(c => c.id === x.cust)?.name)).forEach(x => out.push({ kind: 'Quote', title: `${x.no} ${x.title}`.trim(), sub: x.status, go: () => go('quotes', x.id) }));
    shop.customers.filter(c => has(c.name, c.contact, c.email, c.handle, c.notes, ...c.dogs.map(d => d.name + ' ' + d.breed))).forEach(c => out.push({ kind: 'Customer', title: c.name, sub: c.dogs.map(d => d.name).filter(Boolean).join(', ') || c.kind, go: () => go('customers', c.id) }));
    shop.supplies.filter(x => has(x.name)).forEach(x => out.push({ kind: 'Supply', title: x.name, sub: `${x.qty} ${x.unit}`.trim(), go: () => go('supplies', x.id) }));
    shop.suppliers.filter(x => has(x.name, x.notes)).forEach(x => out.push({ kind: 'Supplier', title: x.name, sub: x.site, go: () => go('suppliers', x.id) }));
    shop.sales.filter(e => has(e.what, e.ref, shop.customers.find(c => c.id === e.cust)?.name)).slice(0, 20).forEach(e => out.push({ kind: 'Sale', title: shop.customers.find(c => c.id === e.cust)?.name || e.what, sub: `${e.day} · ${money(e.sub)} · ${Object.entries(e.items).map(([k, n]) => `${n} ${itemName(shop, k)}`).join(', ')}`, go: () => go('sales') }));
    return out.slice(0, 40);
  }, [q, shop]);
  return (
    <Sheet title="Search" onClose={onClose} width={620}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.bg, borderRadius: R.control, borderWidth: 2, borderColor: t.action, paddingHorizontal: 10 }}>
        <SearchIcon color={t.text3} size={18} />
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Runs, fabric, orders, customers, dogs…" placeholderTextColor={t.text3} accessibilityLabel="Search" style={{ flex: 1, minHeight: 42, color: t.text, fontSize: F.f16, outlineStyle: 'none' } as any} onSubmitEditing={() => res[0] && (onClose(), res[0].go())} />
      </View>
      <ScrollView style={{ maxHeight: 440 }}>
        {q.trim() && !res.length ? <T s="sub">Nothing matches “{q.trim()}”.</T> : null}
        {!q.trim() ? (
          <View style={{ gap: 8 }}>
            <T s="label">Jump to</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {JUMP.map(([l, r, id]) => (
                <Pressable key={l} accessibilityRole="button" onPress={() => { onClose(); go(r, id); }} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? t.sunken : t.bg })}>
                  <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text2 }}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
          {res.map((r, i) => (
            <Row key={i} first={i === 0} onPress={() => { onClose(); r.go(); }}>
              <T s="small" style={{ width: 70 }}>{r.kind}</T>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: '600' }} numberOfLines={1}>{r.title}</T>
                {r.sub ? <T s="sub" numberOfLines={1}>{r.sub}</T> : null}
              </View>
            </Row>
          ))}
        </View>
      </ScrollView>
      <T s="small">Enter opens the first result. Ctrl + K opens search from anywhere.</T>
    </Sheet>
  );
}

/* ---------- New… ---------- */
export function NewMenu({ onClose, go }: { onClose: () => void; go: Go }) {
  const t = useTheme();
  const tile = (icon: (c: string) => React.ReactNode, title: string, sub: string, run: () => void) => (
    <Pressable key={title} accessibilityRole="button" onPress={() => { onClose(); run(); }} style={({ pressed }) => ({ width: 176, padding: 14, gap: 6, borderRadius: R.card, backgroundColor: pressed ? t.tint2 : t.bg })}>
      {icon(t.action)}
      <T style={{ fontWeight: '700' }}>{title}</T>
      <T s="small">{sub}</T>
    </Pressable>
  );
  return (
    <Sheet title="New" onClose={onClose} width={600}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tile(c => <ScissorsIcon color={c} />, 'Run', 'Plan a batch', () => go('runs', planRun()))}
        {tile(c => <CartIcon color={c} />, 'Order', 'Something to make', () => go('orders', addOrder()))}
        {tile(c => <EditIcon color={c} />, 'Quote', 'Price an order', () => go('quotes', addQuote()))}
        {tile(c => <TagIcon color={c} />, 'Sale', 'From finished stock', () => go('sales', 'record'))}
        {tile(c => <FabricIcon color={c} />, 'Fabric', 'A bolt for the shelf', () => go('fabric', addFabric({ name: 'New fabric' })))}
        {tile(c => <SpoolIcon color={c} />, 'Supply', 'Tags, mailers…', () => go('supplies', addSupply()))}
        {tile(c => <PeopleIcon color={c} />, 'Customer', 'With their dogs', () => go('customers', addCustomer()))}
        {tile(c => <PhotoIcon color={c} />, 'Photos', 'Add pictures', () => { addPhotos(); go('photos'); })}
        {tile(c => <CalIcon color={c} />, 'Market or day off', 'On the schedule', () => { addEvent(); go('schedule'); })}
      </View>
      <T s="small">Ctrl + N opens this from anywhere.</T>
    </Sheet>
  );
}

/* ---------- Settings › Shop ---------- */
export type ShopPart = 'shop' | 'reminders' | 'shortcuts' | 'data';
export function ShopSettings({ part }: { part?: ShopPart } = {}) {
  const show = (k: ShopPart) => !part || part === k;
  const shop = useShop();
  const t = useTheme();
  const [folder, setFolder] = useState<string | null>(null);
  return (
    <View style={{ gap: 22, maxWidth: 720 }}>
      {show('shop') ? (
      <Card style={{ gap: 14 }}>
        <Field label="Shop name" value={shop.shopName} onChange={v => update(s => ({ ...s, shopName: v }))} />
        <Segmented label="Appearance" value={shop.cfg.theme} onChange={v => update(s => ({ ...s, cfg: { ...s.cfg, theme: v } }))} options={[['system', 'Match Windows'], ['light', 'Light'], ['dark', 'Dark']]} />
      </Card>
      ) : null}
      {show('reminders') ? (
      <Section title="Reminders">
        <Card style={{ gap: 12 }}>
          <T style={{ fontWeight: '600' }}>Remind me about</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REM_KINDS.map(([k, l]) => {
              const on = (shop.cfg.remind as any)[k] !== false;
              return (
                <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => update(s => ({ ...s, cfg: { ...s.cfg, remind: { ...s.cfg.remind, [k]: !on } } }))} style={{ paddingHorizontal: 12, minHeight: 32, justifyContent: 'center', borderRadius: R.chip, backgroundColor: on ? t.tint : t.sunken }}>
                  <T style={{ fontSize: F.f14, fontWeight: '600' }} color={on ? t.onTint : t.text2}>{on ? '✓ ' : ''}{l}</T>
                </Pressable>
              );
            })}
          </View>
          {shop.cfg.remind.due ? <Segmented label="Warn me before a run is due" value={String(shop.cfg.remind.days || 2)} onChange={v => update(s => ({ ...s, cfg: { ...s.cfg, remind: { ...s.cfg.remind, days: +v } } }))} options={[['1', '1 day'], ['2', '2 days'], ['3', '3 days'], ['5', '5 days']]} /> : null}
          <Segmented label="Windows notifications" value={shop.cfg.remind.on ? 'on' : 'off'} onChange={v => update(s => ({ ...s, cfg: { ...s.cfg, remind: { ...s.cfg.remind, on: v === 'on' } } }))} options={[['on', 'On'], ['off', 'Off']]} />
          {shop.cfg.remind.on ? <Segmented label="Daily reminders from" value={String(shop.cfg.remind.hour)} onChange={v => update(s => ({ ...s, cfg: { ...s.cfg, remind: { ...s.cfg.remind, hour: +v } } }))} options={[['7', '7 am'], ['9', '9 am'], ['12', 'Noon'], ['17', '5 pm']]} /> : null}
          <T s="small">Everything collects in the bell. With notifications on, each one also pops up in Windows once while Bandana Planner is open. The timer one comes whenever a timer passes your check-in time.</T>
        </Card>
      </Section>
      ) : null}

      {show('shortcuts') ? (
      <Section title="Keyboard shortcuts">
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {SHORTCUTS.map(([k, v], i) => (
            <Row key={k} first={i === 0}>
              <T style={{ flex: 1 }}>{v}</T>
              <View style={{ backgroundColor: t.sunken, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}><T s="sub" style={{ fontWeight: '600' }}>{k}</T></View>
            </Row>
          ))}
        </Card>
      </Section>
      ) : null}
      {show('data') ? (
      <Section title="Your data">
        <Card style={{ gap: 10 }}>
          <T>Everything is saved on this computer as you go. No account, nothing online.</T>
          <T s="sub">{plural(shop.runs.length, 'run')} · {plural(shop.fabrics.length, 'fabric')} · {plural(shop.sales.length, 'sale')} · {plural(shop.photos.length, 'photo')}</T>
          {onDevice ? <Button small kind="secondary" title="Open the data folder" onPress={async () => { const f = await dataFolderPath(); setFolder(f); if (f) openPath(f); }} style={{ alignSelf: 'flex-start' }} /> : <T s="small">Preview: saved in this browser only.</T>}
          {folder ? <T s="small">{folder}</T> : null}
        </Card>
      </Section>
      ) : null}
    </View>
  );
}

export { BoxIcon };
