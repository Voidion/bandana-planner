/* The guided tour: a short walk round the window. Parts of the shell register themselves as targets; the tour dims
   everything else, rings the part it's talking about, and puts a card beside it with Back, Next and Skip. */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Button } from './kit';
import { F, shadow, useTheme } from './theme';

type Rect = { x: number; y: number; w: number; h: number };
const targets: Record<string, any> = {};

/** Gives a part of the window a name the tour can point at: <View ref={useTourTarget('new')} /> */
export function useTourTarget(id: string) {
  return useCallback(
    (r: any) => {
      if (r) targets[id] = r;
      else if (targets[id]) delete targets[id];
    },
    [id],
  );
}
function measure(id: string | undefined): Promise<Rect | null> {
  const r = id ? targets[id] : null;
  if (!r || !r.measureInWindow) return Promise.resolve(null);
  return new Promise(res => {
    try {
      r.measureInWindow((x: number, y: number, w: number, h: number) => res(w && h ? { x, y, w, h } : null));
    } catch {
      res(null);
    }
  });
}

/* Starting setup or the tour from anywhere (Settings, Today) */
type Req = 'setup' | 'tour' | null;
let req: Req = null;
const subs = new Set<(r: Req) => void>();
export function startTour() {
  req = 'tour';
  subs.forEach(f => f(req));
}
export function startSetup() {
  req = 'setup';
  subs.forEach(f => f(req));
}
export function useHelpRequest(): [Req, () => void] {
  const [r, setR] = useState<Req>(req);
  useEffect(() => {
    subs.add(setR);
    return () => {
      subs.delete(setR);
    };
  }, []);
  return [r, () => { req = null; setR(null); }];
}

export interface TourStep {
  /** The registered part to ring (none: a card in the middle) */
  target?: string;
  /** Opens this section behind the card */
  route?: string;
  title: string;
  body: string;
}
export const TOUR: TourStep[] = [
  { title: 'Welcome to Bandana Planner', body: 'A one-minute look round. Everything stays on this computer, and nothing you do here can break: most things have Undo, and you can take this tour again any time with F1.' },
  { target: 'nav-today', route: 'today', title: 'Today', body: 'Start here each day. What’s being timed, what’s due, how the week’s hours fill up, your month against your goal, and anything that needs you.' },
  { target: 'nav-runs', route: 'runs', title: 'Runs', body: 'A run is one batch. Pick the sizes and fabric and the app lays every piece out on Cricut mats, tells you how many yards you need, and saves a file per mat for Design Space. Record the cut, then tick off the steps as you go.' },
  { target: 'nav-workflow', route: 'workflow', title: 'Workflow', body: 'The step you’re working on, with a big timer. Timing steps teaches the app how long things really take you, so due dates and prices get more accurate.' },
  { target: 'nav-schedule', route: 'schedule', title: 'Schedule', body: 'Your runs fitted into your free hours, with markets, pickups and days off. Type things like “Market Sat 8am–2pm” in the quick-add line.' },
  { target: 'nav-orders', route: 'orders', title: 'Sell', body: 'Orders to make, quotes you send (saved as a PDF with your logo), customers and their dogs, payments, finished stock, and a market-day till.' },
  { target: 'nav-fabric', route: 'fabric', title: 'Shop', body: 'Your fabric shelf and supplies, photos, trends, reports for taxes, blade and machine upkeep, and a log of everything you’ve done.' },
  { target: 'new', title: 'New', body: 'Start anything from here: a run, order, quote, sale, fabric, customer or market day. Ctrl + N works from anywhere too.' },
  { target: 'search', title: 'Search', body: 'Find a run, fabric, order, quote, customer or dog by name. Ctrl + K.' },
  { target: 'bell', title: 'Reminders', body: 'Runs due, fabric running low, quotes ending, payments late, blades to check. Snooze or dismiss each one. They can pop up as Windows notifications too.' },
  { target: 'split', title: 'Split view', body: 'Two sections side by side, like Workflow next to your fabric. Ctrl + \\ turns it on and off.' },
  { target: 'me', title: 'Settings', body: 'Your sizes and prices, Cricut mat and bolt, free hours, quote details and reminders. Setup, this tour, example data and a guide to how it all works are under Settings › Help & tour, or press F1.' },
  { route: 'today', title: 'That’s the tour', body: 'Getting started on Today walks you through the first run, step by step, and ticks each thing off as you do it. Right-click almost anything for quick actions.' },
];

export function TourOverlay({ step, setStep, onDone, go }: { step: number; setStep: (n: number) => void; onDone: () => void; go: (route: string) => void }) {
  const t = useTheme();
  const win = useWindowDimensions();
  const [rect, setRect] = useState<Rect | null>(null);
  const s = TOUR[step];
  useEffect(() => {
    let live = true;
    if (s.route) go(s.route);
    setRect(null);
    const id = setTimeout(() => measure(s.target).then(r => live && setRect(r)), 160);
    return () => {
      live = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, win.width, win.height]);
  const last = step === TOUR.length - 1;
  const pad = 6;
  const R = rect ? { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 } : null;
  const CW = 360;
  // Beside the ringed part: to its right when there's room, otherwise above or below; else in the middle
  let pos: { left: number; top: number };
  if (R && R.x + R.w + 16 + CW < win.width) pos = { left: R.x + R.w + 16, top: Math.max(16, Math.min(win.height - 260, R.y - 10)) };
  else if (R && R.y > 280) pos = { left: Math.max(16, Math.min(win.width - CW - 16, R.x)), top: R.y - 250 };
  else if (R) pos = { left: Math.max(16, Math.min(win.width - CW - 16, R.x)), top: Math.min(win.height - 260, R.y + R.h + 16) };
  else pos = { left: (win.width - CW) / 2, top: Math.max(40, win.height / 2 - 140) };
  const dim = 'rgba(12,10,8,0.55)';
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 100 }} accessibilityViewIsModal>
      {R ? (
        <>
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, height: Math.max(0, R.y), backgroundColor: dim }} />
          <View style={{ position: 'absolute', left: 0, top: R.y + R.h, right: 0, bottom: 0, backgroundColor: dim }} />
          <View style={{ position: 'absolute', left: 0, top: R.y, width: Math.max(0, R.x), height: R.h, backgroundColor: dim }} />
          <View style={{ position: 'absolute', left: R.x + R.w, top: R.y, right: 0, height: R.h, backgroundColor: dim }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: R.x, top: R.y, width: R.w, height: R.h, borderRadius: 16, borderWidth: 3, borderColor: t.action }} />
        </>
      ) : <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: dim }} />}
      <View accessibilityRole="alert" style={[{ position: 'absolute', left: pos.left, top: pos.top, width: CW, backgroundColor: t.surface, borderRadius: 20, padding: 22, gap: 10 }, shadow(false)]}>
        <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text3 }}>{step + 1} of {TOUR.length}</Text>
        <Text style={{ fontSize: F.f22, fontWeight: '700', color: t.text }}>{s.title}</Text>
        <Text style={{ fontSize: F.f15, lineHeight: 22, color: t.text2 }}>{s.body}</Text>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
          {TOUR.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? t.action : t.sunken }} />)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          {last ? null : <Pressable accessibilityRole="button" onPress={onDone} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text3 }}>Skip tour</Text></Pressable>}
          <View style={{ flex: 1 }} />
          {step > 0 ? <Button small kind="secondary" title="Back" onPress={() => setStep(step - 1)} /> : null}
          <Button small title={last ? 'Done' : step === 0 ? 'Show me' : 'Next'} onPress={() => (last ? onDone() : setStep(step + 1))} />
        </View>
      </View>
    </View>
  );
}
