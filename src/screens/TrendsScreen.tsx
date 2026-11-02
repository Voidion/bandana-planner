/* Trends, laid out like the prototype: this month (goals, money so far), your pace (per bandana, quickest hour and day,
   pace by day), plans against real (step times, fabric per bandana) and quality (defect rate, what went wrong). */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as E from '../engine/engine';
import { dayLabel, mins, money, money0, plural, yd, yd2 } from '../lib/format';
import { computePlan, sync, todayDay } from '../lib/plan';
import { setGoals } from '../state/planning';
import { isLate, saleOwed, saleProfit } from '../state/selling';
import { editTemplate, useShop } from '../state/store';
import { TrendIcon, WalletIcon, ChevIcon } from '../ui/icons';
import { Button, Empty, NumField, Sheet, showSnack } from '../ui/kit';
import { LinkText, Note, PageHead, Sect, Strip, Sublab, WList } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';

const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DNL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);

function CardBox({ children, style }: { children: React.ReactNode; style?: any }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 12 }, shadow(t.dark), style]}>{children}</View>;
}
function GoalBar({ label, have, goal, frac }: { label: string; have: string; goal: string; frac: number }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text }}>{label}</Text>
        <Text style={{ fontSize: F.f14, color: t.text, fontVariant: ['tabular-nums'] }}><Text style={{ fontWeight: '700' }}>{have}</Text> <Text style={{ color: t.text3 }}>of {goal}</Text></Text>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: t.sunken, overflow: 'hidden' }}>
        <View style={{ height: 10, borderRadius: 5, width: `${Math.min(100, frac * 100)}%`, backgroundColor: frac >= 1 ? t.success : t.action }} />
      </View>
    </View>
  );
}
export function MoneyCard({ go }: { go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const y = todayDay().slice(0, 4);
  const list = shop.sales.filter(e => e.day.startsWith(y));
  const sales = list.reduce((a, e) => a + e.sub - (e.refund || 0), 0);
  const profit = list.reduce((a, e) => a + saleProfit(e), 0);
  const bills = shop.bills.reduce((a, b) => a + (b.basis === 'year' ? b.amt / 12 : b.amt), 0) * (new Date().getMonth() + 1);
  const owed = shop.sales.filter(e => saleOwed(e) > 0);
  const od = owed.filter(isLate).length;
  return (
    <CardBox>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>Money · {y} so far</Text>
        <LinkText onPress={() => go?.('reports')}>Reports</LinkText>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {[[money0(sales), 'sales'], [money0(profit), 'profit'], [money0(profit - bills), 'after bills']].map(([v, l], i) => (
          <View key={i} style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{v}</Text>
            <Text style={{ fontSize: F.f13, color: t.text3 }}>{l}</Text>
          </View>
        ))}
      </View>
      {owed.length ? (
        <Pressable accessibilityRole="button" onPress={() => go?.('sales')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: od ? t.warnTint : t.sunken }}>
          <WalletIcon color={od ? t.onWarn : t.text2} size={20} />
          <Text style={{ flex: 1, fontSize: F.f14, fontWeight: '600', color: od ? t.onWarn : t.text }}>{money0(owed.reduce((a, e) => a + saleOwed(e), 0))} still to collect{od ? ` · ${od} late` : ''}</Text>
          <ChevIcon color={od ? t.onWarn : t.text3} size={14} />
        </Pressable>
      ) : null}
    </CardBox>
  );
}

export function TrendsScreen({ go }: { go?: (r: string, id?: string) => void }) {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(1000);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const P: any = useMemo(() => (sync(shop), E.paceStats()), [shop]);
  const finished = shop.runs.filter(r => r.status === 'done');
  const pcs = (r: (typeof finished)[number]) => Object.values(r.qty).reduce((a, b) => a + (b || 0), 0);
  const made = finished.reduce((a, r) => a + pcs(r), 0);
  const month = todayDay().slice(0, 7);
  const income = shop.sales.filter(e => e.day.startsWith(month)).reduce((a, e) => a + e.sub - (e.refund || 0), 0);
  const hours = shop.sessions.filter(s => s.day.startsWith(month)).reduce((a, s) => a + s.mins, 0) / 60;
  const goals = (
    <CardBox style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>{dayLabel(todayDay(), { month: 'long' })} goals</Text>
        <LinkText onPress={() => setGoalsOpen(true)}>Edit</LinkText>
      </View>
      <GoalBar label="Income" have={money0(income)} goal={money0(shop.goals.income)} frac={income / Math.max(1, shop.goals.income)} />
      <GoalBar label="Hours" have={mins(hours * 60)} goal={`${shop.goals.hours}h`} frac={hours / Math.max(1, shop.goals.hours)} />
    </CardBox>
  );
  const sheet = goalsOpen ? (
    <Sheet title="Monthly goals" sub="Both reset on the 1st" onClose={() => setGoalsOpen(false)} footer={<Button title="Done" onPress={() => setGoalsOpen(false)} />}>
      <NumField label="Income goal" value={shop.goals.income} onChange={n => setGoals({ income: n ?? 0 })} prefix="$" width={150} />
      <NumField label="Hours goal" value={shop.goals.hours} onChange={n => setGoals({ hours: n ?? 0 })} suffix="h" width={150} />
      <Note style={{ paddingHorizontal: 0 }}>Income counts this month’s sales before fees, paid or not; hours count time you timed on steps.</Note>
    </Sheet>
  ) : null;
  const page = (inner: React.ReactNode) => (
    <ScrollView onLayout={e => setW(e.nativeEvent.layout.width)} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 1100, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 60, gap: 20 }}>{inner}</View>
      {sheet}
    </ScrollView>
  );
  if (!finished.length && !shop.sessions.length)
    return page(
      <>
        <PageHead title="Trends" />
        {goals}
        {shop.sales.length ? <MoneyCard go={go} /> : null}
        <Empty icon={<TrendIcon color={t.action} size={30} />} title="Trends fill in as you work" body="After your first timed steps and finished run, this shows your pace per bandana, fastest hours, where plans drift and what goes wrong." />
      </>,
    );

  /* pace by day of the week */
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sp = order.filter(d => P.days[d] != null).map(d => ({ d, v: 1 / P.days[d] }));
  const spMx = Math.max(1, ...sp.map(x => x.v));
  const spMn = Math.min(1, ...sp.map(x => x.v));
  const best = sp.slice().sort((a, b) => b.v - a.v)[0];
  /* step times against the template, on a 20-piece run */
  const N = 20;
  const tpl = P.tpl || { steps: [], name: 'your template', id: '' };
  const rows = tpl.steps.filter((s: any) => P.stepMed[s.n] != null).map((s: any) => ({ n: s.n, a: P.stepMed[s.n] * N, pl: s.r * N })).sort((x: any, y: any) => Math.abs(y.a / y.pl - 1) - Math.abs(x.a / x.pl - 1)).slice(0, 5);
  const mx = Math.max(1, ...rows.map((r: any) => Math.max(r.a, r.pl)));
  const worst = rows[0];
  const drift = rows.some((r: any) => Math.abs(r.a / r.pl - 1) > 0.05);
  const learn = () => {
    const was = shop.templates.find(x => x.id === tpl.id);
    if (!was) return;
    editTemplate(was.id, { steps: was.steps.map(s => (P.stepMed[s.n] != null ? { ...s, r: Math.round(P.stepMed[s.n] * 100) / 100 } : s)) });
    showSnack(`${was.name} now uses your real pace`, () => editTemplate(was.id, { steps: was.steps }));
  };
  /* fabric */
  const recs = shop.runs.flatMap(r => r.fabUse.filter(u => u.plan > 0 && u.used > 0).map(u => ({ run: r.id, plan: u.plan, used: u.used })));
  const ratios = recs.map(x => x.used / x.plan).sort((a, b) => a - b);
  const k = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1;
  const fabs = shop.fabrics.filter(f => !f.offcut && f.cost > 0);
  const avgCost = fabs.length ? fabs.reduce((a, f) => a + f.cost, 0) / fabs.length : 8.5;
  const perPiece = Object.entries(shop.sizes).filter(([, z]) => z.price != null && z.cw).map(([key, z]) => {
    const res = computePlan(shop, { qty: { [key]: 12 }, body: fabs[0]?.id || null, ties: fabs[0]?.id || null });
    return { name: z.name, y: res.needs.reduce((a, n) => a + n.yards, 0) / 12 };
  });
  /* quality */
  const defects = shop.defectLog.reduce((a, x) => a + x.n, 0);
  const rate = made ? (defects / made) * 100 : 0;
  const byK: Record<string, number> = {};
  const byS: Record<string, number> = {};
  shop.defectLog.forEach(x => {
    byK[x.kind] = (byK[x.kind] || 0) + x.n;
    if (x.step) byS[x.step] = (byS[x.step] || 0) + x.n;
  });
  const topK = Object.entries(byK).sort((a, b) => b[1] - a[1]);
  const topS = Object.entries(byS).sort((a, b) => b[1] - a[1]);
  const qrows = (list: [string, number][]) => (
    <WList>
      {list.map(([n, c]) => (
        <View key={n} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontSize: F.f16, color: t.text }}>{n}</Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ height: 6, width: `${(c / list[0][1]) * 100}%`, backgroundColor: t.barB }} /></View>
          </View>
          <Text style={{ minWidth: 36, textAlign: 'right', fontSize: F.f16, fontWeight: '700', color: t.text }}>{c}</Text>
        </View>
      ))}
    </WList>
  );

  const monthSect = (
    <Sect title="This month">
      <View style={{ gap: 12 }}>{goals}<MoneyCard go={go} /></View>
    </Sect>
  );
  const paceSect = (
    <Sect title="Your pace" right={`from ${plural(P.n, 'timed session')}`}>
      <Strip items={[{ v: P.n ? mins(P.perShop) : '—', l: 'per bandana' }, { v: P.fast ? hourLabel(P.fast.h) : '—', l: 'quickest hour' }, { v: best ? DN[best.d] : '—', l: 'quickest day' }]} />
      <WList>
        <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: F.f16, color: t.text }}>You</Text>
            <Text style={{ fontSize: F.f14, color: t.text3 }}>{P.qYou ? `Quickest at ${P.qYou.k}` : 'Nothing timed yet'}</Text>
          </View>
          <Text style={{ minWidth: 64, textAlign: 'right', fontSize: 17, fontWeight: '700', color: t.text }}>{P.n ? mins(P.you) : '—'}</Text>
        </View>
      </WList>
      {sp.length ? (
        <CardBox>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>Pace by day</Text>
            {best ? <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text3 }}>{DNL[best.d]}s are quickest</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            {sp.map(x => {
              const pct = Math.round((x.v - 1) * 100);
              return (
                <View key={x.d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: F.f13, color: t.text2, fontVariant: ['tabular-nums'] }}>{pct > 0 ? '+' : pct < 0 ? '−' : ''}{Math.abs(pct)}%</Text>
                  <View style={{ width: '70%', height: 18 + ((x.v - spMn) / Math.max(0.01, spMx - spMn)) * 52, borderRadius: 6, backgroundColor: x === best ? t.action : t.barB }} />
                  <Text style={{ fontSize: F.f13, color: t.text3 }}>{DN[x.d]}</Text>
                </View>
              );
            })}
          </View>
          <Note style={{ paddingHorizontal: 0 }}>Compared with your average pace. Taller is quicker.</Note>
        </CardBox>
      ) : <Note style={{ paddingHorizontal: 0 }}>Time steps on a few different days and this shows when you sew fastest.</Note>}
    </Sect>
  );
  const plansSect = (
    <Sect title="Plans vs real">
      <CardBox style={{ gap: 14 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>Step times</Text>
          <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text3 }}>On a {N}-piece run, against {tpl.name}</Text>
        </View>
        {worst ? <Text style={{ fontSize: F.f13, color: t.text2 }}>{worst.n} runs {worst.a > worst.pl ? 'long' : 'short'}: {mins(worst.a)} against {mins(worst.pl)} planned.</Text> : null}
        {rows.length ? rows.map((r: any) => {
          const over = r.a > r.pl * 1.1;
          const pct = Math.round((Math.abs(r.a - r.pl) / r.pl) * 100);
          return (
            <View key={r.n} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: F.f14, fontWeight: '500', color: t.text }}>{r.n}</Text>
                <Text style={{ fontSize: F.f14, color: t.text2, fontVariant: ['tabular-nums'] }}>{mins(r.a)} of {mins(r.pl)} <Text style={{ fontWeight: '700', color: over ? t.warn : t.text }}>{pct === 0 ? '0' : (r.a > r.pl ? '+' : '−') + pct}%</Text></Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.sunken }}>
                <View style={{ height: 8, borderRadius: 4, width: `${(r.a / mx) * 100}%`, backgroundColor: over ? t.barA : t.barB }} />
                <View style={{ position: 'absolute', left: `${(r.pl / mx) * 100}%`, top: -3, width: 2, height: 14, backgroundColor: t.text }} />
              </View>
            </View>
          );
        }) : <Note style={{ paddingHorizontal: 0 }}>Time a step and it shows here.</Note>}
        <Note style={{ paddingHorizontal: 0 }}>The tick is the planned time.</Note>
        {drift ? <Button small kind="secondary" title={`Update ${tpl.name} to match`} style={{ alignSelf: 'flex-start' }} onPress={learn} /> : rows.length ? <Note style={{ paddingHorizontal: 0 }}>Your template matches how long the work really takes.</Note> : null}
      </CardBox>
      <CardBox>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text }}>Fabric per bandana</Text>
          <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text3 }}>{recs.length ? `learned from ${plural(new Set(recs.map(x => x.run)).size, 'run')}` : 'from your cut sizes'}</Text>
        </View>
        {perPiece.map(p => (
          <View key={p.name} style={{ flexDirection: 'row', gap: 10 }}>
            <Text style={{ flex: 1, fontSize: F.f14, fontWeight: '700', color: t.text }}>{p.name}</Text>
            <Text style={{ width: 70, fontSize: F.f14, color: t.text2, fontVariant: ['tabular-nums'] }}>{yd2(p.y)}</Text>
            <Text style={{ width: 60, fontSize: F.f14, color: t.text2, fontVariant: ['tabular-nums'] }}>{money(p.y * avgCost)}</Text>
            <Text style={{ width: 100, textAlign: 'right', fontSize: F.f14, color: t.text3, fontVariant: ['tabular-nums'] }}>{yd(p.y * 100)} per 100</Text>
          </View>
        ))}
        <Note style={{ paddingHorizontal: 0 }}>{recs.length ? `You use ${k >= 1 ? Math.round((k - 1) * 100) + '% more' : Math.round((1 - k) * 100) + '% less'} than the cut plan says.` : 'Once you cut a run and enter what you used, these get sharper.'} Costs use your average fabric price.</Note>
      </CardBox>
    </Sect>
  );
  const qualitySect = (
    <Sect title="Quality">
      <Strip items={[{ v: rate.toFixed(1) + '%', l: 'defect rate', color: rate > 5 ? t.warn : t.success }, { v: String(defects), l: `of ${made} made` }]} />
      {topK.length ? <View><Sublab>What went wrong</Sublab>{qrows(topK)}</View> : null}
      {topS.length ? <View><Sublab>At which step</Sublab>{qrows(topS)}</View> : null}
      {!shop.defectLog.length ? <Note style={{ paddingHorizontal: 0 }}>Log a defect from a run and this shows what goes wrong and at which step.</Note> : null}
    </Sect>
  );
  const wide = w >= 900;
  return page(
    <>
      <PageHead sup={`${plural(finished.length, 'finished run')} · ${made} bandanas`} title="Trends" />
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 20 }}>{monthSect}{qualitySect}</View>
          <View style={{ flex: 1, gap: 20 }}>{paceSect}{plansSect}</View>
        </View>
      ) : <View style={{ gap: 20 }}>{monthSect}{paceSect}{plansSect}{qualitySect}</View>}
    </>,
  );
}
