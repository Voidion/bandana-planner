/* Settings, laid out like the prototype: every setting as a row in a grouped list (with its current value), and the
   one you pick open beside it. */
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { clock, fmtN, inch, mins, money, money0 } from '../lib/format';
import { MATS, pace, timerMs, tplMinsFor, tplPerBandana } from '../lib/plan';
import { setGoals } from '../state/planning';
import { pickLogo } from '../state/storage';
import { addTemplate, change, closeOutTimer, deleteTemplate, editTemplate, restoreTemplate, restoreTimer, setCfg, useShop } from '../state/store';
import type { Template } from '../state/types';
import { BellIcon, CalIcon, ChevIcon, ClockIcon, CoinIcon, DownIcon, FabricIcon, GearIcon, PlusIcon, PriceIcon, RulerIcon, ScissorsIcon, StoreIcon, TagIcon, TimeIcon, TrashIcon, TrendIcon, TruckIcon, UpIcon, WalletIcon, WorkflowIcon, BoxIcon, FolderIcon, ReceiptIcon } from '../ui/icons';
import { Button, Card, Chip, Field, IconButton, NumField, Row, Section, Segmented, showSnack, T } from '../ui/kit';
import { Note, PageHead } from '../ui/proto';
import { F, R, shadow, useTheme } from '../ui/theme';
import { useNow } from '../ui/useNow';
import { SetupScreen } from './SetupScreen';
import { ShopSettings } from './AppWide';
import { ProductsSettings } from './ProductsSettings';
import { PricingSettings } from './PricingSettings';

export type SettingsTab =
  | 'shop' | 'goals' | 'hours' | 'quote'
  | 'prices' | 'pricing' | 'fees' | 'shipping' | 'bundles' | 'bills'
  | 'sizes' | 'cutting' | 'cutfiles' | 'fabric' | 'products' | 'templates'
  | 'reminders' | 'timers' | 'shortcuts' | 'data';
type Ico = (p: { color: string; size: number }) => React.ReactElement;

export function SettingsScreen({ tab, setTab, openRun }: { tab: SettingsTab; setTab: (t: SettingsTab) => void; openRun: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(1200);
  const [showDetail, setShowDetail] = useState(false);
  const cur: SettingsTab = tab === 'pricing' ? 'prices' : tab;
  const c = shop.cfg;
  const vm = MATS.find(m => m.id === c.cut.mat) || MATS[1];
  const monthly = shop.bills.reduce((a, b) => a + (b.basis === 'year' ? b.amt / 12 : b.amt), 0);
  const unset = Object.values(shop.sizes).find(z => !z.cw || !z.cl || z.price == null);
  const contacts = [c.quote.email, c.quote.phone, c.quote.insta, c.quote.site].filter(Boolean).length;
  const GROUPS: [string, [SettingsTab, string, Ico, string][], string?][] = [
    ['Shop', [['shop', 'Shop name', StoreIcon, shop.shopName || 'Your shop'], ['goals', 'Monthly goals', TrendIcon, money0(shop.goals.income)], ['hours', 'Free hours', ClockIcon, `${fmtN(c.hours.reduce((a, b) => a + b, 0))}h a week`]], 'Your shop name goes on every quote you send.'],
    ['Quotes', [['quote', 'What clients see', PriceIcon, shop.logo ? 'Logo' + (contacts ? ` · ${contacts} contacts` : '') : `${contacts} contacts`]]],
    ['Pricing', [['prices', 'Profit target', TagIcon, `${c.margin}%`], ['fees', 'Card fees', WalletIcon, c.fees.on ? `${c.fees.rate}% + ${money(c.fees.flat)}` : 'Off'], ['shipping', 'Shipping', TruckIcon, c.ship.threshold ? `Free over ${money0(c.ship.threshold)}` : money(c.ship.charge)], ['bundles', 'Bundles & deals', ReceiptIcon, String(shop.bundles.length)], ['bills', 'Monthly bills', CoinIcon, `${money0(monthly)} a month`]], 'Time isn’t counted as a cost.'],
    ['Making', [['sizes', 'Sizes & straps', RulerIcon, `${Object.keys(shop.sizes).length} sizes`], ['cutting', 'Cutting & mats', ScissorsIcon, `${inch(c.cut.width)} on ${vm.name.replace(' mat', '')}`], ['cutfiles', 'Cut files', FolderIcon, `${Object.values(shop.sizes).filter(z => z.file).length + shop.straps.filter(x => x.file).length} files`], ['fabric', 'New fabric', FabricIcon, `${fmtN(c.newBolt.yards)} yd · low at ${fmtN(c.newBolt.low)}`], ['products', 'Products', BoxIcon, String(shop.products.length)], ['templates', 'Workflow templates', WorkflowIcon, String(shop.templates.length)]]],
    ['App', [['reminders', 'Reminders', BellIcon, c.remind.on ? 'Notifications on' : 'In the bell'], ['timers', 'Timers', TimeIcon, `Check after ${c.staleMins / 60}h`], ['shortcuts', 'Keyboard shortcuts', GearIcon, ''], ['data', 'Your data', CalIcon, 'On this computer']]],
  ];
  const all = GROUPS.flatMap(g => g[1]);
  const curRow = all.find(r => r[0] === cur) || all[0];
  const twoPane = w >= 900;
  const pick = (k: SettingsTab) => {
    setTab(k);
    setShowDetail(true);
  };
  const list = (
    <View style={{ gap: 18 }}>
      {unset ? (
        <Pressable accessibilityRole="button" onPress={() => pick('sizes')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.warnTint, borderRadius: 16, paddingHorizontal: 16, minHeight: 52 }}>
          <Text style={{ flex: 1, fontSize: F.f15, color: t.onWarn }}><Text style={{ fontWeight: '700' }}>{unset.name} isn’t set up yet,</Text> so it can’t be planned. Add a price and cut size</Text>
          <ChevIcon color={t.onWarn} size={14} />
        </Pressable>
      ) : null}
      {GROUPS.map(([g, rows, note]) => (
        <View key={g} style={{ gap: 8 }}>
          <Text style={{ fontSize: F.f13, fontWeight: '700', color: t.text2, letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4 }}>{g}</Text>
          <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 8 }, shadow(t.dark)]}>
            {rows.map(([k, label, Ic, v]) => {
              const on = twoPane && k === cur;
              return (
                <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => pick(k)}
                  style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, borderRadius: 14, backgroundColor: on ? t.tint : pressed ? t.sunken : 'transparent' })}>
                  <Ic color={on ? t.onTint : t.text2} size={20} />
                  <Text style={{ flex: 1, fontSize: F.f15, color: on ? t.onTint : t.text }}>{label}</Text>
                  {v ? <Text numberOfLines={1} style={{ fontSize: F.f15, color: on ? t.onTint : t.text3, maxWidth: 170 }}>{v}</Text> : null}
                  {twoPane ? null : <ChevIcon color={t.text3} size={14} />}
                </Pressable>
              );
            })}
          </View>
          {note ? <Note>{note}</Note> : null}
        </View>
      ))}
    </View>
  );
  const body =
    cur === 'shop' ? <ShopSettings part="shop" />
    : cur === 'goals' ? <Goals />
    : cur === 'hours' ? <Hours />
    : cur === 'quote' ? <QuoteLook />
    : cur === 'prices' || cur === 'fees' || cur === 'shipping' || cur === 'bundles' || cur === 'bills' ? <PricingSettings part={cur} />
    : cur === 'sizes' || cur === 'cutting' || cur === 'cutfiles' || cur === 'fabric' ? <SetupScreen part={cur} />
    : cur === 'products' ? <ProductsSettings />
    : cur === 'templates' ? <Templates />
    : cur === 'timers' ? <Timers openRun={openRun} />
    : <ShopSettings part={cur as 'reminders' | 'shortcuts' | 'data'} />;
  const detail = (
    <View style={[{ backgroundColor: t.surface, borderRadius: 20, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 28, gap: 18 }, shadow(t.dark)]}>
      <Text style={{ fontSize: F.f28, fontWeight: '700', color: t.text }}>{curRow[1]}</Text>
      {body}
    </View>
  );
  if (twoPane)
    return (
      <View style={{ flex: 1, flexDirection: 'row', gap: 24, paddingLeft: 32 }} onLayout={e => setW(e.nativeEvent.layout.width)}>
        <ScrollView style={{ width: 360, flexGrow: 0 }} contentContainerStyle={{ paddingTop: 32, paddingBottom: 60, gap: 20 }}>
          <PageHead sup={shop.shopName || 'Your shop'} title="Shop settings" />
          {list}
        </ScrollView>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 104, paddingBottom: 60, paddingRight: 32, maxWidth: 1000 }}>{detail}</ScrollView>
      </View>
    );
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center' }} onLayout={e => setW(e.nativeEvent.layout.width)}>
      <View style={{ width: '100%', paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>
        {showDetail ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => setShowDetail(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' }}>
              <T color={t.action} style={{ fontSize: 22, marginTop: -3 }}>‹</T><T color={t.action} style={{ fontWeight: '600', fontSize: F.f16 }}>Settings</T>
            </Pressable>
            {detail}
          </>
        ) : (
          <>
            <PageHead sup={shop.shopName || 'Your shop'} title="Shop settings" />
            {list}
          </>
        )}
      </View>
    </ScrollView>
  );
}

/* ---------- monthly goals ---------- */
function Goals() {
  const shop = useShop();
  const t = useTheme();
  const month = new Date().toISOString().slice(0, 7);
  const income = shop.sales.filter(e => e.day.startsWith(month)).reduce((a, e) => a + e.sub - (e.refund || 0), 0);
  const hours = shop.sessions.filter(s => s.day.startsWith(month)).reduce((a, s) => a + s.mins, 0) / 60;
  const bar = (label: string, have: string, goal: string, frac: number) => (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: F.f14, fontWeight: '700', color: t.text }}>{label}</Text>
        <Text style={{ fontSize: F.f14, color: t.text3 }}><Text style={{ fontWeight: '700', color: t.text }}>{have}</Text> of {goal}</Text>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ height: 10, borderRadius: 5, width: `${Math.min(100, frac * 100)}%`, backgroundColor: t.action }} /></View>
    </View>
  );
  return (
    <View style={{ gap: 16, maxWidth: 560 }}>
      <View style={{ backgroundColor: t.bg, borderRadius: 16, padding: 18, gap: 14 }}>
        {bar('Income this month', money0(income), money0(shop.goals.income), income / Math.max(1, shop.goals.income))}
        {bar('Hours this month', `${Math.round(hours)}h`, `${shop.goals.hours}h`, hours / Math.max(1, shop.goals.hours))}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <NumField label="Income goal" value={shop.goals.income} onChange={n => setGoals({ income: n ?? 0 })} prefix="$" width={150} />
        <NumField label="Hours goal" value={shop.goals.hours} onChange={n => setGoals({ hours: n ?? 0 })} suffix="h" width={130} />
      </View>
      <Note style={{ paddingHorizontal: 0 }}>Both reset on the 1st. Income counts this month’s sales before fees, paid or not; hours count timed work.</Note>
    </View>
  );
}

/* ---------- what clients see on a quote ---------- */
function QuoteLook() {
  const shop = useShop();
  const t = useTheme();
  const lg = shop.logo;
  const choose = async () => {
    try {
      const got = await pickLogo();
      if (!got) return;
      change(s => ({ ...s, logo: got }));
      showSnack('Logo added to your quotes');
    } catch {
      showSnack('That picture couldn’t be read');
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <T s="h2">Logo</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.bg, borderRadius: 16, padding: 14 }}>
          {lg ? <Image source={{ uri: lg.src }} style={{ width: 52, height: 52, borderRadius: 15 }} /> : (
            <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: '#8A4B0C', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{((shop.shopName || 'S').trim()[0] || 'S').toUpperCase()}</Text></View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text }}>{lg ? 'Your logo' : 'Your shop’s initial'}</Text>
            <Text style={{ fontSize: F.f14, color: t.text3 }}>{lg ? 'Shown at the top of every quote and its PDF' : 'Choose a square logo to use instead'}</Text>
          </View>
          <Button small kind="secondary" title={lg ? 'Change' : 'Choose'} onPress={choose} />
          {lg ? <Button small kind="ghost" title="Remove" onPress={() => { const was = lg; change(s => ({ ...s, logo: null })); showSnack('Logo removed', () => change(s => ({ ...s, logo: was }))); }} /> : null}
        </View>
        <Note style={{ paddingHorizontal: 0 }}>Pictures are cropped to the middle square.</Note>
      </View>
      <PricingSettings part="quote" />
    </View>
  );
}

/* ---------- templates ---------- */
function Templates() {
  const shop = useShop();
  const t = useTheme();
  const [sel, setSel] = useState(shop.cfg.defTpl);
  const cur = shop.templates.find(x => x.id === sel) || shop.templates[0];
  return (
    <View style={{ flexDirection: 'row', gap: 22, alignItems: 'flex-start' }}>
      <View style={{ width: 300, gap: 12 }}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {shop.templates.map((x, i) => (
            <Row key={x.id} first={i === 0} selected={x.id === cur.id} onPress={() => setSel(x.id)}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: '600' }}>{x.name}</T>
                <T s="sub">{x.steps.length} steps · {mins(tplPerBandana(x))} a bandana</T>
              </View>
              {x.id === shop.cfg.defTpl ? <Chip label="Default" tone="tint" /> : null}
            </Row>
          ))}
        </Card>
        <Button kind="secondary" small title="New template" icon={c => <PlusIcon color={c} size={16} />} onPress={() => setSel(addTemplate(cur.id))} />
        <T s="small">A template is the list of steps a run starts with, and how long each takes per bandana.</T>
      </View>
      <View style={{ flex: 1 }}>{cur ? <TemplateEditor key={cur.id} tpl={cur} onDeleted={() => setSel(shop.cfg.defTpl)} /> : null}</View>
    </View>
  );
}

function TemplateEditor({ tpl, onDeleted }: { tpl: Template; onDeleted: () => void }) {
  const shop = useShop();
  const t = useTheme();
  const med = useMemo(() => pace(shop), [shop]);
  const isDef = tpl.id === shop.cfg.defTpl;
  const setSteps = (steps: Template['steps']) => editTemplate(tpl.id, { steps });
  const paceOf = (n: string) => (med[n] == null ? null : Math.round(med[n]! * 10) / 10);
  const off = (s: { n: string; r: number }) => {
    const m = paceOf(s.n);
    return m != null && Math.abs(m - s.r) >= 0.1 && Math.abs(m / s.r - 1) > 0.05;
  };
  const nOff = tpl.steps.filter(off).length;
  const count = (n: string) => shop.sessions.filter(x => x.step === n && x.pcs > 0 && x.mins > 0).length;
  const remove = () => {
    const i = shop.templates.findIndex(x => x.id === tpl.id);
    deleteTemplate(tpl.id);
    onDeleted();
    showSnack(`${tpl.name} deleted`, () => restoreTemplate(tpl, i, isDef));
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= tpl.steps.length) return;
    const steps = tpl.steps.slice();
    [steps[i], steps[j]] = [steps[j], steps[i]];
    setSteps(steps);
  };
  return (
    <View style={{ gap: 18 }}>
      <Field label="Name" value={tpl.name} onChange={v => editTemplate(tpl.id, { name: v })} />
      <Section title="Steps" right={nOff > 1 ? <Button kind="ghost" small title={`Use my pace for all ${nOff}`} onPress={() => setSteps(tpl.steps.map(s => (off(s) ? { ...s, r: paceOf(s.n)! } : s)))} /> : undefined}>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <Row first style={{ minHeight: 34, paddingVertical: 6 }}>
            <T s="label" style={{ flex: 1 }}>Step</T>
            <T s="label" style={{ width: 120 }}>Minutes each</T>
            <View style={{ width: 120 }} />
          </Row>
          {tpl.steps.map((s, i) => (
            <View key={i} style={{ borderTopWidth: 1, borderTopColor: t.line, paddingHorizontal: 14, paddingVertical: 8, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}><Field bare label={`Step ${i + 1} name`} value={s.n} onChange={v => setSteps(tpl.steps.map((x, j) => (j === i ? { ...x, n: v } : x)))} /></View>
                <NumField bare label={`${s.n} minutes per bandana`} value={s.r} onChange={n => setSteps(tpl.steps.map((x, j) => (j === i ? { ...x, r: Math.max(0.1, Math.min(240, n || 0.1)) } : x)))} suffix="min" width={110} />
                <View style={{ width: 120, flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <IconButton label={`Move ${s.n} up`} onPress={() => move(i, -1)}>{c => <UpIcon color={i ? c : t.line2} size={18} />}</IconButton>
                  <IconButton label={`Move ${s.n} down`} onPress={() => move(i, 1)}>{c => <DownIcon color={i < tpl.steps.length - 1 ? c : t.line2} size={18} />}</IconButton>
                  <IconButton label={`Remove ${s.n}`} onPress={() => setSteps(tpl.steps.filter((_, j) => j !== i))}>{c => <TrashIcon color={c} size={16} />}</IconButton>
                </View>
              </View>
              {paceOf(s.n) != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T s="small" color={off(s) ? t.warn : t.success}>{off(s) ? `You average ${fmtN(paceOf(s.n)!)} min` : 'Matches your pace'} · {count(s.n)} timed</T>
                  {off(s) ? <Pressable accessibilityRole="button" onPress={() => setSteps(tpl.steps.map((x, j) => (j === i ? { ...x, r: paceOf(s.n)! } : x)))}><T s="small" color={t.action} style={{ fontWeight: '600' }}>Use it</T></Pressable> : null}
                </View>
              ) : null}
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setSteps([...tpl.steps, { n: 'New step', r: 2 }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: t.line }}>
            <PlusIcon color={t.action} size={18} />
            <T color={t.action} style={{ fontWeight: '600' }}>Add a step</T>
          </Pressable>
        </Card>
      </Section>
      <Card style={{ gap: 4 }}>
        <T style={{ fontWeight: '700' }}>{mins(tplPerBandana(tpl))} a bandana</T>
        <T s="sub">About {mins(tplMinsFor(shop, tpl.id, { M: 12, L: 6 }))} for 12 Medium and 6 Large. Bigger sizes take longer, in proportion to their time each in Sizes.</T>
      </Card>
      {isDef ? (
        <T s="small">New runs start from this template.</T>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button kind="secondary" title="Use for new runs" onPress={() => setCfg({ defTpl: tpl.id })} />
          {shop.templates.length > 1 ? <Button kind="danger" title="Delete template" onPress={remove} /> : null}
        </View>
      )}
    </View>
  );
}

/* ---------- free hours ---------- */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function Hours() {
  const shop = useShop();
  const t = useTheme();
  const h = shop.cfg.hours;
  const tot = h.reduce((a, b) => a + b, 0);
  const mx = Math.max(1, ...h);
  const set = (d: number, v: number) => setCfg({ hours: h.map((x, i) => (i === d ? Math.max(0, Math.min(16, v)) : x)) });
  return (
    <View style={{ gap: 16, maxWidth: 640 }}>
      <Card style={{ gap: 4 }}>
        <T style={{ fontSize: F.f28, fontWeight: '700' }}>{fmtN(tot)}h <T s="sub">a week</T></T>
        <T s="sub">How much time you have for the shop each day. Schedules and due dates are planned into these hours.</T>
      </Card>
      <Card pad={false} style={{ overflow: 'hidden' }}>
        {[1, 2, 3, 4, 5, 6, 0].map((d, i) => (
          <Row key={d} first={i === 0}>
            <View style={{ flex: 1, gap: 6 }}>
              <T style={{ fontWeight: '600' }}>{DAYS[d]}</T>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ width: `${(h[d] / mx) * 100}%`, height: 6, backgroundColor: t.action }} /></View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Less time on ${DAYS[d]}`} onPress={() => set(d, h[d] - 0.5)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 18, fontWeight: '600' }}>−</T></Pressable>
              <T style={{ minWidth: 52, textAlign: 'center', fontWeight: '700' }}>{h[d] ? fmtN(h[d]) + 'h' : 'Off'}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`More time on ${DAYS[d]}`} onPress={() => set(d, h[d] + 0.5)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 18, fontWeight: '600' }}>+</T></Pressable>
            </View>
          </Row>
        ))}
      </Card>
      <T s="small">Half-hour steps. Set a day to Off when you don’t work on the shop.</T>
    </View>
  );
}

/* ---------- timers ---------- */
function Timers({ openRun }: { openRun: (id: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const m = shop.timer;
  useNow(!!m && !m.paused);
  const r = m && shop.runs.find(x => x.id === m.run);
  const s = r && r.steps.find(x => x.id === m!.step);
  return (
    <View style={{ gap: 18, maxWidth: 640 }}>
      <View style={{ gap: 8 }}>
        <T s="h2">Check on a timer after</T>
        <Segmented label="Check on a timer after" bare value={String(shop.cfg.staleMins)} options={[['60', '1h'], ['120', '2h'], ['240', '4h'], ['480', '8h']]} onChange={v => setCfg({ staleMins: +v })} />
        <T s="small">If a timer runs longer than this, the app asks if it’s still going, and you can fix the time or close it out.</T>
      </View>
      <View style={{ gap: 8 }}>
        <T s="h2">Running now</T>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          {m && r && s ? (
            <Row first onPress={() => openRun(r.id)}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: '600' }}>{s.name}</T>
                <T s="sub">{(r.name || 'Untitled run').split(' — ')[0]} · {m.paused ? 'paused' : 'running'}</T>
              </View>
              <T style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{clock(timerMs(m))}</T>
              <Button kind="ghost" small title="Close out" onPress={() => { const was = closeOutTimer(); showSnack('Timer stopped. No time recorded', () => restoreTimer(was)); }} />
            </Row>
          ) : (
            <Row first><T s="sub">No timer running.</T></Row>
          )}
        </Card>
      </View>
      <T s="small">Timed steps teach the planner your real pace. Time typed in by hand doesn’t. The timer keeps going if you close the app.</T>
      <View style={{ backgroundColor: t.bg, borderRadius: R.card }} />
    </View>
  );
}
