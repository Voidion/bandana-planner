/* Activity, laid out like the prototype: a strip (today, by you, this week), search, kind chips, and the log grouped
   by day, each row opening what it's about. */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useShop } from '../state/store';
import type { Activity, Shop } from '../state/types';
import { CartIcon, CheckIcon, ChevIcon, CoinIcon, DefectIcon, FabricIcon, GearIcon, PeopleIcon, PriceIcon, PulseIcon, SearchIcon, WrenchIcon } from '../ui/icons';
import { Button, Empty } from '../ui/kit';
import { Note, PageHead, Sect, Strip, WList } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';

type Kind = 'work' | 'money' | 'fabric' | 'orders' | 'quotes' | 'quality' | 'equip' | 'people' | 'other';
type Ico = (p: { color: string; size: number }) => React.ReactElement;
const KINDS: [Kind, string, Ico][] = [
  ['work', 'Work', CheckIcon], ['money', 'Money', CoinIcon], ['fabric', 'Fabric', FabricIcon], ['orders', 'Orders', CartIcon], ['quotes', 'Quotes', PriceIcon],
  ['quality', 'Quality', DefectIcon], ['equip', 'Equipment', WrenchIcon], ['people', 'People', PeopleIcon], ['other', 'Other', GearIcon],
];
type Go = (route: string, id?: string) => void;

/** What an entry is about, and where tapping it goes (the prototype's actMeta) */
export function actMeta(shop: Shop, a: Activity): { k: Kind; go: [string, string?] | null } {
  const s = (a.text + ' ' + (a.sub || '')).toLowerCase();
  const head = (a.sub || '').split(' · ')[0].toLowerCase();
  const r = head ? shop.runs.find(x => (x.name || '').split(' —')[0].toLowerCase() === head) : undefined;
  let k: Kind = 'other';
  if (/defect/.test(s)) k = 'quality';
  else if (/quote/.test(s)) k = 'quotes';
  else if (/\bsale\b|paid|payment|imported|closed |market day/.test(s)) k = 'money';
  else if (/order/.test(s)) k = 'orders';
  else if (/blade|needle|mat |replaced|checked|roller|lint|oil/.test(s)) k = 'equip';
  else if (/cut |yd|bolt|fabric|offcut|restock/.test(s)) k = 'fabric';
  else if (/tick|timing|timed|step|finished|planned|started/.test(s)) k = 'work';
  else if (/customer/.test(s)) k = 'people';
  const go: [string, string?] | null = r ? ['runs', r.id] : k === 'money' ? ['sales'] : k === 'quality' ? ['trends'] : k === 'equip' ? ['maintenance'] : k === 'orders' ? ['orders'] : k === 'quotes' ? ['quotes'] : k === 'fabric' ? ['fabric'] : k === 'people' ? ['customers'] : null;
  return { k, go };
}
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
function actDay(t: number) {
  const d = new Date(t);
  const diff = Math.round((dayStart(new Date()) - dayStart(d)) / 864e5);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? d.toLocaleDateString('en-US', { weekday: 'long' }) : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function actTime(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function ActivityScreen({ go }: { go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [pg, setPg] = useState(1);
  const page = (inner: React.ReactNode) => (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 820, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>{inner}</View>
    </ScrollView>
  );
  const name = shop.shopName || 'Your shop';
  if (!shop.activity.length)
    return page(<><PageHead title="Activity" /><Empty icon={<PulseIcon color={t.action} size={30} />} title="Nothing here yet" body="Every step you tick, sale you record and change you make lands here." /></>);
  const all = shop.activity.map(a => ({ a, ...actMeta(shop, a) }));
  const kinds = KINDS.filter(([k]) => all.some(x => x.k === k));
  const qq = q.trim().toLowerCase();
  const list = all.filter(x => (kind === 'all' || x.k === kind) && (!qq || (x.a.text + ' ' + (x.a.sub || '')).toLowerCase().includes(qq)));
  const shown = list.slice(0, 30 * pg);
  const days: [string, typeof shown][] = [];
  shown.forEach(x => {
    const d = actDay(x.a.t);
    let g = days.find(y => y[0] === d);
    if (!g) days.push((g = [d, []]));
    g[1].push(x);
  });
  const today = all.filter(x => actDay(x.a.t) === 'Today');
  const week = all.filter(x => Date.now() - x.a.t < 7 * 864e5).length;
  const row = (x: (typeof all)[number], i: number) => {
    const K = KINDS.find(y => y[0] === x.k) || KINDS[KINDS.length - 1];
    const Ic = K[2];
    const who = x.a.who === 'You' || !x.a.who ? 'You' : x.a.who;
    const body = (
      <View style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
        <View style={{ width: 32, height: 32 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: F.f14, fontWeight: '700', color: t.onTint }}>{who[0].toUpperCase()}</Text></View>
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Ic color={t.text2} size={11} /></View>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: F.f15, color: t.text }}><Text style={{ fontWeight: '700' }}>{who}</Text> {x.a.text}</Text>
          <Text style={{ fontSize: F.f14, color: t.text3 }}>{x.a.sub ? x.a.sub + ' · ' : ''}{actTime(x.a.t)}</Text>
        </View>
        {x.go ? <ChevIcon color={t.text3} size={14} /> : null}
      </View>
    );
    return x.go ? <Pressable key={i} accessibilityRole="button" onPress={() => go(x.go![0], x.go![1])}>{body}</Pressable> : <View key={i}>{body}</View>;
  };
  return page(
    <>
      <PageHead sup={name} title="Activity" />
      <Strip items={[{ v: String(today.length), l: 'today' }, { v: String(all.filter(x => !x.a.who || x.a.who === 'You').length), l: 'by you' }, { v: String(week), l: 'this week' }]} />
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }, shadow(t.dark)]}>
        <SearchIcon color={t.text3} size={18} />
        <TextInput accessibilityLabel="Search activity" value={q} onChangeText={v => { setQ(v); setPg(1); }} placeholder="Search activity" placeholderTextColor={t.text3} style={{ flex: 1, fontSize: F.f15, color: t.text, paddingVertical: 8 }} />
      </View>
      {kinds.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([['all', 'All'], ...kinds.map(k => [k[0], k[1]])] as [Kind | 'all', string][]).map(([k, l]) => {
            const on = kind === k;
            return (
              <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setKind(k); setPg(1); }}
                style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, backgroundColor: on ? t.tint : t.surface, borderWidth: on ? 1.5 : 1, borderColor: on ? t.action : t.line2 }}>
                <Text style={{ fontSize: F.f15, fontWeight: '600', color: on ? t.onTint : t.text }}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {days.length ? days.map(([d, L]) => <Sect key={d} title={d} right={String(L.length)}><WList>{L.map(row)}</WList></Sect>) : <Note>Nothing matches. Try another filter.</Note>}
      {list.length > shown.length ? <Button kind="ghost" small title="Show older" style={{ alignSelf: 'center' }} onPress={() => setPg(pg + 1)} /> : null}
    </>,
  );
}
