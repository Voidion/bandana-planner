/* Customers, laid out like the prototype: who owes you, who has something open, everyone else; and each customer with
   quick contact buttons, what's open, their dogs, contact details, notes, albums and history. */
import React, { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { dayLabel, money0, plural, relDue } from '../lib/format';
import { itemName, quoteTotals, rel } from '../lib/plan';
import { addAlbum } from '../state/photos';
import { addCustomer, addDog, addOrder, deleteCustomer, deleteDog, editCustomer, editDog, orderCount, orderStage, orderWorth, restoreCustomer, saleOwed, saleTotal } from '../state/selling';
import { addQuote } from '../state/quotes';
import { useShop } from '../state/store';
import type { Customer, CustomerKind, Dog, Shop } from '../state/types';
import { AtIcon, CartIcon, ChatIcon, DogIcon, MailIcon, PeopleIcon, PhoneIcon, PlusIcon, PriceIcon, SearchIcon, UserIcon, WalletIcon, ChevIcon } from '../ui/icons';
import { Button, Chip, Empty, Field, NumField, openMenuAt, Select, Sheet, showSnack, T } from '../ui/kit';
import { CustAv, DetailHero, HeadBtn, LinkText, ListDetailPage, Note, OCard, Sect, Strip, WList, WRow } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';
import { PhotoStrip } from './PhotosScreen';

const KINDS: CustomerKind[] = ['Person', 'Shop', 'Consignment', 'Shopify', 'Custom'];

export function custStats(s: Shop, c: Customer) {
  const sales = s.sales.filter(e => e.cust === c.id);
  const os = s.orders.filter(o => o.cust === c.id);
  const qs = s.quotes.filter(q => q.cust === c.id);
  const oo = os.filter(o => orderStage(s, o) !== 'delivered');
  const oq = qs.filter(q => q.status === 'draft' || q.status === 'sent' || (q.status === 'accepted' && !q.order));
  const days = sales.map(e => e.day).sort();
  return { n: sales.length, spent: sales.reduce((a, e) => a + saleTotal(e), 0), owed: sales.reduce((a, e) => a + saleOwed(e), 0), repeat: sales.length >= 2, last: days[days.length - 1] || null, oo, oq, sales, os, qs };
}

export function CustomersScreen({ sel, setSel, openOrder, openQuote, go }: { sel: string | null; setSel: (id: string | null) => void; openOrder: (id: string) => void; openQuote?: (id: string) => void; go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [q, setQ] = useState('');
  const add = () => setSel(addCustomer());
  const all = shop.customers.map(c => [c, custStats(shop, c)] as const);
  const s = q.trim().toLowerCase();
  const shown = all.filter(([c]) => !s || [c.name, c.contact, c.email, c.phone, c.handle, c.kind, ...c.dogs.map(d => d.name + ' ' + d.breed)].join(' ').toLowerCase().includes(s));
  const recent = (a: (typeof all)[number], b: (typeof all)[number]) => (b[1].last || '').localeCompare(a[1].last || '') || a[0].name.localeCompare(b[0].name);
  const owes = shown.filter(x => x[1].owed > 0).sort(recent);
  const open = shown.filter(x => !(x[1].owed > 0) && x[1].oo.length + x[1].oq.length).sort(recent);
  const rest = shown.filter(x => !(x[1].owed > 0) && !(x[1].oo.length + x[1].oq.length)).sort((a, b) => a[0].name.localeCompare(b[0].name));
  const groups: [string, typeof shown][] = [['Owes you', owes], ['Open orders and quotes', open], ['Everyone else', rest]];
  const cur = shop.customers.find(c => c.id === sel) || groups.find(g => g[1].length)?.[1][0]?.[0] || null;
  const card = ([c, st]: (typeof all)[number]) => {
    const op = st.oo.length + st.oq.length;
    return (
      <OCard key={c.id} on={cur?.id === c.id} onPress={() => setSel(c.id)} av={<CustAv c={c} size={42} />} title={c.name} value={st.spent ? money0(st.spent) : undefined}
        sub={[c.kind, c.contact].filter(Boolean).join(' · ') + (c.dogs.length ? ' · ' + c.dogs.map(d => d.name).filter(Boolean).join(', ') : '')}
        chips={<>
          {st.owed > 0 ? <Chip tone="warn" label={`${money0(st.owed)} owed`} /> : null}
          {op ? <Chip label={`${op} open`} /> : null}
          {st.repeat ? <Chip tone="ok" label={`${st.n} orders`} /> : st.n === 1 ? <Chip label="1 order" /> : op ? null : <Chip label="No orders yet" />}
        </>}
        menu={[
          { label: 'Open', onPress: () => setSel(c.id) },
          { label: 'New order', onPress: () => openOrder(addOrder({ cust: c.id })) },
          c.email ? { label: 'Email', onPress: () => Linking.openURL('mailto:' + c.email).catch(() => {}) } : null,
          { label: 'Delete customer', danger: true, onPress: () => { const i2 = shop.customers.findIndex(x => x.id === c.id); deleteCustomer(c.id); showSnack(`${c.name} deleted`, () => restoreCustomer(c, i2)); } },
        ]} />
    );
  };
  const life = all.reduce((a, x) => a + x[1].spent, 0);
  const owedT = all.reduce((a, x) => a + x[1].owed, 0);
  const list = all.length ? (
    <>
      <Strip items={[{ v: money0(life), l: 'lifetime sales' }, { v: `${all.filter(x => x[1].repeat).length} of ${all.length}`, l: 'came back' }, { v: money0(owedT), l: 'owed to you', color: owedT ? t.warn : undefined }]} />
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }, shadow(t.dark)]}>
        <SearchIcon color={t.text3} size={18} />
        <TextInput accessibilityLabel="Search customers" value={q} onChangeText={setQ} placeholder="Search by name, contact or dog" placeholderTextColor={t.text3} style={{ flex: 1, fontSize: F.f15, color: t.text, paddingVertical: 8 }} />
      </View>
      {shown.length ? groups.map(([n, L]) => (L.length ? <Sect key={n} big title={n} right={String(L.length)}><View style={{ gap: 8 }}>{L.map(card)}</View></Sect> : null)) : <Note>No one matches “{q}”.</Note>}
    </>
  ) : (
    <Empty icon={<PeopleIcon color={t.action} size={30} />} title="No customers yet" body="Link a customer to an order or quote, or add one here. Their contact details, dogs and order history stay together." action={<Button title="New customer" onPress={add} />} />
  );
  return (
    <ListDetailPage title="Customers" sel={sel} right={<HeadBtn label="New customer" tint onPress={add}>{c => <PlusIcon color={c} size={24} />}</HeadBtn>} list={list}
      detail={cur ? <CustomerDetail key={cur.id} c={cur} openOrder={openOrder} openQuote={openQuote} go={go} onDeleted={() => setSel(null)} /> : null} />
  );
}

function CustomerDetail({ c, openOrder, openQuote, go, onDeleted }: { c: Customer; openOrder: (id: string) => void; openQuote?: (id: string) => void; go?: (r: string, id?: string) => void; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const [dog, setDog] = useState<string | null>(null);
  const st = custStats(shop, c);
  const set = (p: Partial<Customer>) => editCustomer(c.id, p);
  const tel = String(c.phone || '').replace(/[^\d+]/g, '');
  const h = String(c.handle || '').trim().replace(/^@/, '');
  const remove = () => {
    const i = shop.customers.findIndex(x => x.id === c.id);
    deleteCustomer(c.id);
    onDeleted();
    showSnack(`${c.name} deleted`, () => restoreCustomer(c, i));
  };
  const pickKind = (e: any) => {
    const n = e?.nativeEvent || {};
    openMenuAt(n.pageX ?? 300, n.pageY ?? 200, KINDS.map(k => ({ label: (k === c.kind ? '✓  ' : '     ') + k, onPress: () => set({ kind: k }) })));
  };
  const albums = shop.albums.filter(a => a.cust === c.id);
  const openO = st.oo;
  const openQ = st.oq;
  return (
    <>
      <DetailHero av={<CustAv c={c} size={52} />} onName={v => set({ name: v })} nameValue={c.name} namePlaceholder="Customer name"
        lines={[
          <View key="k" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Customer type: ${c.kind}`} onPress={pickKind} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: t.sunken }}>
              <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text2 }}>{c.kind}</Text>
              <View style={{ width: 6, height: 6, marginTop: -3, borderRightWidth: 1.8, borderBottomWidth: 1.8, borderColor: t.text3, transform: [{ rotate: '45deg' }] }} />
            </Pressable>
            <Text style={{ fontSize: F.f14, color: t.text3 }}>{st.n ? `${plural(st.n, 'order')}${st.last ? ', last ' + dayLabel(st.last, { month: 'short', day: 'numeric' }) : ''}` : 'No orders yet'}</Text>
          </View>,
        ]} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <QAct label="Email" off={!c.email} onPress={() => Linking.openURL('mailto:' + c.email).catch(() => {})}>{col => <MailIcon color={col} size={20} />}</QAct>
        <QAct label="Call" off={!tel} onPress={() => Linking.openURL('tel:' + tel).catch(() => {})}>{col => <PhoneIcon color={col} size={20} />}</QAct>
        <QAct label="Text" off={!tel} onPress={() => Linking.openURL('sms:' + tel).catch(() => {})}>{col => <ChatIcon color={col} size={20} />}</QAct>
        <QAct label="Social" off={!h} onPress={() => Linking.openURL('https://instagram.com/' + encodeURIComponent(h)).catch(() => {})}>{col => <AtIcon color={col} size={20} />}</QAct>
      </View>
      <Strip items={[{ v: String(st.n), l: st.n === 1 ? 'order' : 'orders' }, { v: money0(st.spent), l: 'spent' }, { v: money0(st.owed), l: 'owed', color: st.owed ? t.warn : undefined }]} />
      {st.owed ? (
        <Pressable accessibilityRole="button" onPress={() => go?.('sales')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: t.warnTint }}>
          <WalletIcon color={t.onWarn} size={20} />
          <Text style={{ flex: 1, fontSize: F.f14, color: t.onWarn }}><Text style={{ fontWeight: '700' }}>{money0(st.owed)} still to collect.</Text> Record it in Payments when they pay.</Text>
          <ChevIcon color={t.onWarn} size={14} />
        </Pressable>
      ) : null}

      <Sect title="Open now" right={openO.length + openQ.length ? String(openO.length + openQ.length) : undefined}>
        {openO.length + openQ.length ? (
          <View style={{ gap: 8 }}>
            {openO.map(o => {
              const s2 = orderStage(shop, o);
              const d = rel(o.due);
              return (
                <OCard key={o.id} onPress={() => openOrder(o.id)} av={<IconTile><CartIcon color={t.text2} size={20} /></IconTile>} title={o.title || o.src || 'Order'} value={money0(orderWorth(shop, o))} sub={`Order · ${plural(orderCount(o), 'bandana')}`}
                  chips={<><Chip tone={d != null && d < 0 ? 'warn' : 'plain'} label={d == null ? 'No date' : d < 0 ? relDue(d) : 'Due ' + dayLabel(o.due)} /><Chip tone={s2 === 'ready' ? 'ok' : 'plain'} label={s2 === 'plan' ? 'To plan' : s2 === 'making' ? 'In progress' : 'Ready to send'} /></>} />
              );
            })}
            {openQ.map(qq => (
              <OCard key={qq.id} onPress={() => openQuote?.(qq.id)} av={<IconTile><PriceIcon color={t.text2} size={20} /></IconTile>} title={qq.title || 'Quote'} value={money0(quoteTotals(shop, qq).grand || 0)} sub={`${qq.no} · ${plural(qq.lines.reduce((a, l) => a + l.qty, 0), 'bandana')}`}
                chips={<><Chip tone={qq.status === 'sent' ? 'tint' : qq.status === 'accepted' ? 'ok' : 'plain'} label={qq.status === 'draft' ? 'Draft' : qq.status === 'sent' ? ((rel(qq.until) ?? 0) < 0 ? 'Expired' : 'Waiting') : 'Accepted'} />{qq.status === 'sent' && (rel(qq.until) ?? 0) >= 0 ? <Chip label={`Holds to ${dayLabel(qq.until, { month: 'short', day: 'numeric' })}`} /> : null}</>} />
            ))}
          </View>
        ) : <Note style={{ paddingHorizontal: 0 }}>Nothing open. Start an order or quote below.</Note>}
      </Sect>

      <Sect title="Dogs" right="for fits and matching sets">
        <WList>
          {c.dogs.map(d => (
            <WRow key={d.id} icon={<DogIcon color={t.text2} size={22} />} title={d.name || 'Unnamed dog'} sub={[d.breed, d.neck ? `${d.neck} in neck` : ''].filter(Boolean).join(', ') || 'Add breed and neck size'}
              right={d.size && shop.sizes[d.size] ? <Chip tone="tint" label={shop.sizes[d.size].name} /> : undefined} onPress={() => setDog(d.id)} />
          ))}
          <Pressable accessibilityRole="button" onPress={() => setDog(addDog(c.id))} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PlusIcon color={t.action} size={20} />
            <Text style={{ fontSize: F.f16, color: t.action }}>Add a dog</Text>
          </Pressable>
        </WList>
      </Sect>

      <Sect title="Contact">
        <WList>
          {c.kind !== 'Person' ? <CField icon={<UserIcon color={t.text2} size={22} />} label="Name" value={c.contact} placeholder="Who you talk to" onChange={v => set({ contact: v })} /> : null}
          <CField icon={<MailIcon color={t.text2} size={22} />} label="Email" value={c.email} placeholder="name@example.com" onChange={v => set({ email: v })} />
          <CField icon={<PhoneIcon color={t.text2} size={22} />} label="Phone" value={c.phone} placeholder="Add a number" onChange={v => set({ phone: v })} />
          <CField icon={<AtIcon color={t.text2} size={22} />} label="Social" value={c.handle} placeholder="@username" onChange={v => set({ handle: v })} />
        </WList>
      </Sect>
      <Sect title="Notes">
        <WList>
          <TextInput accessibilityLabel="Notes" value={c.notes} onChangeText={v => set({ notes: v })} multiline placeholder="How they like to pay, what they’ve asked for" placeholderTextColor={t.text3} style={{ minHeight: 76, paddingVertical: 14, fontSize: F.f15, color: t.text, textAlignVertical: 'top' }} />
        </WList>
      </Sect>
      <Sect title="Albums" right={<LinkText onPress={() => { addAlbum({ name: `${c.name} order`, cust: c.id }); go?.('photos'); }}>New album</LinkText>}>
        {albums.length ? (
          <WList>{albums.map(a => <WRow key={a.id} title={a.name} sub={plural(shop.photos.filter(p => !p.deleted && p.albums.includes(a.id)).length, 'photo')} onPress={() => go?.('photos')} />)}</WList>
        ) : <Note style={{ paddingHorizontal: 0 }}>Make an album of photos for {c.name} to show them in person or save to send.</Note>}
        <PhotoStrip link={{ cust: c.id }} title="Photos" />
      </Sect>
      <Sect title="History" right={st.sales.length ? `${money0(st.spent)} total` : undefined}>
        {st.sales.length ? (
          <WList>
            {[...st.sales].sort((a, b) => b.day.localeCompare(a.day)).map(e => {
              const n = Object.values(e.items).reduce((a, b) => a + b, 0);
              return (
                <View key={e.id} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                  <View style={{ width: 44, alignItems: 'center', borderRadius: 12, backgroundColor: t.bg, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: t.text3 }}>{dayLabel(e.day, { month: 'short' }).toUpperCase()}</Text>
                    <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>{+e.day.slice(8)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: F.f16, color: t.text }}>{e.what || Object.entries(e.items).map(([k, x]) => `${x} ${itemName(shop, k)}`).join(', ') || e.ch}</Text>
                    <Text style={{ fontSize: F.f14, color: t.text3 }}>{plural(n, 'bandana')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] }}>{money0(saleTotal(e))}</Text>
                    {saleOwed(e) > 0 ? <Chip tone="warn" label={`${money0(saleOwed(e))} owed`} /> : null}
                  </View>
                </View>
              );
            })}
          </WList>
        ) : <Note style={{ paddingHorizontal: 0 }}>Sales you record for this customer show up here.</Note>}
      </Sect>
      <Button kind="danger" title="Delete customer" onPress={remove} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="New order" style={{ flex: 1 }} onPress={() => openOrder(addOrder({ cust: c.id }))} />
        <Button kind="secondary" title="New quote" style={{ flex: 1 }} onPress={() => { const id = addQuote({ cust: c.id }); openQuote?.(id); }} />
      </View>
      {dog && c.dogs.find(d => d.id === dog) ? <DogSheet c={c} d={c.dogs.find(d => d.id === dog)!} onClose={() => setDog(null)} /> : null}
    </>
  );
}

function IconTile({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}
function QAct({ label, off, onPress, children }: { label: string; off: boolean; onPress: () => void; children: (c: string) => React.ReactNode }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off }} disabled={off} onPress={onPress}
      style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 64, borderRadius: 16, backgroundColor: t.surface, opacity: off ? 0.45 : 1 }, shadow(t.dark), t.dark ? null : { borderWidth: 1, borderColor: t.line }]}>
      {children(off ? t.text3 : t.action)}
      <Text style={{ fontSize: F.f13, fontWeight: '600', color: off ? t.text3 : t.text }}>{label}</Text>
    </Pressable>
  );
}
function CField({ icon, label, value, placeholder, onChange }: { icon: React.ReactNode; label: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {icon}
      <Text style={{ width: 70, fontSize: F.f15, color: t.text2 }}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.text3} style={{ flex: 1, fontSize: F.f16, color: t.text, paddingVertical: 10 }} />
    </View>
  );
}

function DogSheet({ c, d, onClose }: { c: Customer; d: Dog; onClose: () => void }) {
  const shop = useShop();
  return (
    <Sheet title={d.name || 'New dog'} sub={`${c.name}’s dog`} onClose={onClose}
      footer={<><Button kind="danger" small title="Remove dog" onPress={() => { deleteDog(c.id, d.id); onClose(); }} /><Button title="Done" onPress={onClose} /></>}>
      <Field label="Name" value={d.name} onChange={v => editDog(c.id, d.id, { name: v })} autoFocus={!d.name} />
      <Field label="Breed" value={d.breed} onChange={v => editDog(c.id, d.id, { breed: v })} />
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end' }}>
        <NumField label="Neck" value={d.neck} onChange={n => editDog(c.id, d.id, { neck: n })} suffix="in" width={120} />
        <View style={{ gap: 4 }}>
          <T s="label">Size they wear</T>
          <Select label="Size they wear" width={180} value={d.size || ''} options={[['', 'Not set'], ...Object.entries(shop.sizes).map(([k, z]) => [k, z.name] as [string, string])]} onChange={v => editDog(c.id, d.id, { size: v || null })} />
        </View>
      </View>
      <Field label="Notes" value={d.notes} onChange={v => editDog(c.id, d.id, { notes: v })} multiline placeholder="Likes, fit notes" />
    </Sheet>
  );
}
