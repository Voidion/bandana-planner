/* Onboarding on Today: a banner while example data is loaded, and a Getting started checklist that ticks itself
   off as you do each thing for the first time, each with Show me. Hide it whenever you like (Settings › Help brings
   it back). */
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { loadExample, removeExample } from '../state/example';
import { change, useShop } from '../state/store';
import type { Shop } from '../state/types';
import { CheckIcon, ChevIcon } from './icons';
import { Button, showSnack } from './kit';
import { startTour } from './tour';
import { F, shadow, useTheme } from './theme';

type Go = (route: string, id?: string) => void;

export interface Step { id: string; title: string; how: string; done: boolean; route: string; arg?: string }
/** The first things to learn, in the order the work happens */
export function startSteps(s: Shop): Step[] {
  const ex = s.example;
  const mine = <T extends { id: string }>(list: T[], k: keyof NonNullable<Shop['example']>['ids']) => {
    const set = new Set((ex && ex.ids[k]) || []);
    return list.filter(x => !set.has(x.id));
  };
  const runs = mine(s.runs, 'runs').filter(r => Object.values(r.qty || {}).some(Boolean));
  return [
    { id: 'sizes', title: 'Set your sizes and prices', how: 'Each size’s cut size and price, so runs can be planned and priced.', done: Object.values(s.sizes).some(z => z.cw && z.cl && z.price != null), route: 'settings', arg: 'sizes' },
    { id: 'fabric', title: 'Put a fabric on the shelf', how: 'Fabric › Add, with the yards you have and what a yard cost.', done: mine(s.fabrics, 'fabrics').length > 0, route: 'fabric' },
    { id: 'plan', title: 'Plan a run', how: 'Runs › New run: pick sizes and fabric, and see the mats and yards it needs.', done: runs.length > 0, route: 'runs' },
    { id: 'cut', title: 'Record the cut', how: 'Open the run and press Record the cut once it’s cut. That takes the fabric off the shelf.', done: runs.some(r => r.cut), route: 'runs' },
    { id: 'time', title: 'Time a step', how: 'Workflow: start the timer on the step you’re doing. The app learns how long things really take you.', done: s.sessions.length > 0, route: 'workflow' },
    { id: 'finish', title: 'Finish a run', how: 'When the last step is done, Finish run moves the bandanas into finished stock.', done: runs.some(r => r.status === 'done'), route: 'runs' },
    { id: 'sell', title: 'Record a sale', how: 'Payments › Record a sale, or tap sales on Market day. Stock and profit update.', done: mine(s.sales, 'sales').length > 0, route: 'sales' },
  ];
}

export function ExampleBanner() {
  const shop = useShop();
  const t = useTheme();
  if (!shop.example) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.warnTint, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'wrap' }}>
      <Text style={{ flex: 1, minWidth: 240, fontSize: F.f15, color: t.onWarn }}>
        <Text style={{ fontWeight: '700' }}>You’re looking at example data.</Text> Try anything on it: plan, cut, time, sell. Remove it when you’re ready, and only what you made stays.
      </Text>
      <Button small kind="secondary" title="Remove example data" onPress={() => { removeExample(); showSnack('Example data removed'); }} />
    </View>
  );
}

export function GettingStarted({ go }: { go: Go }) {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(0);
  if (shop.startHidden) return null;
  const steps = startSteps(shop);
  const n = steps.filter(x => x.done).length;
  if (n === steps.length) return null;
  const next = steps.find(x => !x.done)!;
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={[{ backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 14 }, shadow(t.dark)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
          <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>Getting started</Text>
          <Text style={{ fontSize: F.f14, color: t.text3 }}>{n} of {steps.length} done. Each one ticks itself off the first time you do it.</Text>
        </View>
        {!shop.example ? <Button small kind="secondary" title="Practise on example data" onPress={() => { loadExample(); showSnack('Example data loaded. Remove it any time'); }} /> : null}
        <Button small kind="secondary" title="Take the tour" onPress={startTour} />
        <Pressable accessibilityRole="button" onPress={() => { change(s => ({ ...s, startHidden: true })); showSnack('Hidden. Settings › Help brings it back', () => change(s => ({ ...s, startHidden: false }))); }} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text3 }}>Hide</Text>
        </Pressable>
      </View>
      {w >= 900 ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {steps.map((x, i) => {
              const isNext = x.id === next.id;
              return (
                <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${x.title}${x.done ? ', done' : ''}`} accessibilityState={{ checked: x.done }} onPress={() => go(x.route, x.arg)}
                  style={({ pressed }) => ({ flex: 1, minWidth: 0, gap: 8, padding: 12, minHeight: 92, borderRadius: 14, backgroundColor: isNext ? t.tint2 : pressed ? t.sunken : t.bg, borderWidth: isNext ? 1.5 : 0, borderColor: t.action })}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: x.done ? t.success : 'transparent', borderWidth: x.done ? 0 : 2, borderColor: isNext ? t.action : t.line2 }}>
                    {x.done ? <CheckIcon color="#fff" size={15} /> : <Text style={{ fontSize: F.f13, fontWeight: '700', color: isNext ? t.action : t.text3 }}>{i + 1}</Text>}
                  </View>
                  <Text numberOfLines={2} style={{ fontSize: F.f14, fontWeight: isNext ? '700' : '500', color: x.done ? t.text3 : t.text }}>{x.title}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable accessibilityRole="button" onPress={() => go(next.route, next.arg)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: pressed ? t.sunken : 'transparent' })}>
            <Text style={{ flex: 1, fontSize: F.f15, color: t.text2 }}><Text style={{ fontWeight: '700', color: t.text }}>Next: {next.title}. </Text>{next.how}</Text>
            <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.action }}>Show me</Text>
            <ChevIcon color={t.action} size={14} />
          </Pressable>
        </>
      ) : (
      <>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}><View style={{ height: 6, width: `${(n / steps.length) * 100}%`, backgroundColor: t.success }} /></View>
      <View style={{ gap: 2 }}>
        {steps.map((x, i) => {
          const isNext = x.id === next.id;
          return (
            <Pressable key={x.id} accessibilityRole="button" accessibilityState={{ checked: x.done }} onPress={() => go(x.route, x.arg)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: isNext ? 64 : 46, paddingHorizontal: 10, borderRadius: 12, backgroundColor: isNext ? t.tint2 : pressed ? t.sunken : 'transparent' })}>
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: x.done ? t.success : 'transparent', borderWidth: x.done ? 0 : 2, borderColor: isNext ? t.action : t.line2 }}>
                {x.done ? <CheckIcon color="#fff" size={15} /> : <Text style={{ fontSize: F.f13, fontWeight: '700', color: isNext ? t.action : t.text3 }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ fontSize: F.f15, fontWeight: isNext ? '700' : '500', color: x.done ? t.text3 : t.text, textDecorationLine: x.done ? 'line-through' : 'none' }}>{x.title}</Text>
                {isNext ? <Text style={{ fontSize: F.f14, color: t.text2 }}>{x.how}</Text> : null}
              </View>
              {isNext ? <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.action }}>Show me</Text> : null}
              <ChevIcon color={t.text3} size={14} />
            </Pressable>
          );
        })}
      </View>
      </>
      )}
    </View>
  );
}
