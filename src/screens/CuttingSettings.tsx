/* Settings › Cutting & mats, laid out like the prototype: bolt width, the Venture mat, the fabric width with a slider,
   a colour strip of how much each width wastes on what's left to cut, Least waste and the exact widths, cut length,
   blade gap, straps turning, keeping corners; and beside it an example layout and every run still to cut. */
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { inch, pct, plural } from '../lib/format';
import { CUT_MIN_W, cutExact, examplePlan, leastWasteWidth, MATS, runPlanNow, wasteHeat, wasteJobs, wasteNow } from '../lib/plan';
import { change, useShop } from '../state/store';
import type { CutSettings } from '../state/types';
import { CheckIcon } from '../ui/icons';
import { Button, Chip, NumField, Segmented, showSnack } from '../ui/kit';
import { MatView } from '../ui/MatView';
import { Note, Sect, WList } from '../ui/proto';
import { F, shadow, useTheme } from '../ui/theme';

const q4 = (w: number) => Math.round(w * 4) / 4;

function WidthSlider({ min, max, value, onChange, marks }: { min: number; max: number; value: number; onChange: (w: number) => void; marks: number[] }) {
  const t = useTheme();
  const [tw, setTw] = useState(300);
  const start = useRef(0);
  const span = Math.max(0.25, max - min);
  const toW = (x: number) => Math.min(max, Math.max(min, q4(min + (x / Math.max(1, tw)) * span)));
  const last = useRef(value);
  const pr = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          start.current = e.nativeEvent.locationX;
          const w = toW(start.current);
          last.current = w;
          onChange(w);
        },
        onPanResponderMove: (_, g) => {
          const w = toW(start.current + g.dx);
          if (Math.abs(w - last.current) > 0.01) {
            last.current = w;
            onChange(w);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tw, min, max],
  );
  const pos = ((value - min) / span) * 100;
  return (
    <View accessibilityRole="adjustable" accessibilityLabel="Fabric width" accessibilityValue={{ text: inch(value) }} onLayout={e => setTw(e.nativeEvent.layout.width)} style={{ flex: 1, height: 36, justifyContent: 'center' }} {...pr.panHandlers}>
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken }}>
        <View style={{ height: 6, borderRadius: 3, width: `${pos}%`, backgroundColor: t.action }} />
      </View>
      {marks.map(m => <View key={m} pointerEvents="none" style={{ position: 'absolute', left: `${((m - min) / span) * 100}%`, top: 10, width: 2, height: 16, marginLeft: -1, borderRadius: 1, backgroundColor: t.line2 }} />)}
      <View pointerEvents="none" style={[{ position: 'absolute', left: `${pos}%`, marginLeft: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: t.surface, borderWidth: 2, borderColor: t.action }, shadow(t.dark)]} />
    </View>
  );
}

export function CuttingSettings() {
  const shop = useShop();
  const t = useTheme();
  const [w, setW] = useState(900);
  const c = shop.cfg.cut;
  const vm = MATS.find(m => m.id === c.mat) || MATS[1];
  const maxW = Math.min(vm.mw, Math.max(CUT_MIN_W, c.bolt));
  const setCut = (p: Partial<CutSettings>) => change(s => ({ ...s, cfg: { ...s.cfg, cut: { ...s.cfg.cut, ...p } } }));
  const setWidth = (x: number) => setCut({ width: Math.min(maxW, Math.max(CUT_MIN_W, q4(x))) });
  const exact = cutExact(shop);
  const n = Math.floor(c.bolt / c.width + 1e-9);
  const off = Math.round((c.bolt - n * c.width) * 100) / 100;
  const heat = useMemo(() => wasteHeat(shop), [shop]);
  const now = useMemo(() => wasteNow(shop), [shop]);
  const cp = useMemo(() => examplePlan(shop, { M: 12, L: 6 }), [shop]);
  const jobs = useMemo(() => wasteJobs(shop).filter(j => j.run), [shop]);
  const spanH = heat.mx - CUT_MIN_W || 1;
  const col = (p: { waste: number; lost: number }) => (p.lost ? t.line2 : !heat.best ? t.barB : p.waste <= heat.best.waste + 0.03 ? t.barG : p.waste <= heat.best.waste + 0.1 ? t.barB : t.barA);
  const two = w >= 980;
  const bodyCol = t.barA;
  const strapCol = t.barG;
  const toggle = (title: string, sub: string, on: boolean, set: (v: boolean) => void) => (
    <View style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, flexWrap: 'wrap' }}>
      <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
        <Text style={{ fontSize: F.f15, color: t.text }}>{title}</Text>
        <Text style={{ fontSize: F.f14, color: t.text3 }}>{sub}</Text>
      </View>
      <Segmented bare label={title} value={on ? 'on' : 'off'} onChange={v => set(v === 'on')} options={[['on', 'On'], ['off', 'Off']]} />
    </View>
  );

  const left = (
    <View style={{ gap: 18 }}>
      <WList bg>
        <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: F.f15, color: t.text }}>Bolt width</Text><Text style={{ fontSize: F.f14, color: t.text3 }}>What your fabric comes off the roll at</Text></View>
          <NumField bare label="Bolt width" value={c.bolt} onChange={x => setCut({ bolt: Math.min(120, Math.max(10, x || 44)) })} suffix="in" width={110} />
        </View>
      </WList>
      <Sect title="Mat" right={<Text style={{ fontSize: F.f14, color: t.text3 }}>Cricut Venture</Text>}>
        <WList bg>
          {MATS.map(m => {
            const on = m.id === c.mat;
            const sc = 34 / 28;
            return (
              <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setCut({ mat: m.id, matLen: m.l, width: Math.min(c.width, Math.min(m.mw, c.bolt)) })} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <View style={{ width: m.mw * sc, height: m.ml * sc, borderRadius: 3, backgroundColor: on ? t.tint : t.sunken, borderWidth: 1, borderColor: on ? t.action : t.line2 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: F.f15, color: t.text }}>{m.name}</Text>
                  <Text style={{ fontSize: F.f14, color: t.text3 }}>{m.sub} · cuts {inch(m.w)} × {inch(m.l)}</Text>
                </View>
                {on ? <CheckIcon color={t.action} size={20} /> : null}
              </Pressable>
            );
          })}
        </WList>
      </Sect>
      <Sect title="Fabric width" right={<Text style={{ fontSize: F.f14, color: t.text3 }}>blade reaches {inch(vm.w)}</Text>}>
        <View style={{ backgroundColor: t.bg, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{inch(c.width)}</Text>
            <Chip tone={off < 0.01 ? 'ok' : 'warn'} label={off < 0.01 ? `${n} strips · exact` : `${plural(n, 'strip')} · ${inch(off)} offcut`} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Narrower by a quarter inch" onPress={() => setWidth(c.width - 0.25)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, fontWeight: '600', color: t.text }}>−</Text></Pressable>
            <WidthSlider min={CUT_MIN_W} max={maxW} value={c.width} onChange={setWidth} marks={exact} />
            <Pressable accessibilityRole="button" accessibilityLabel="Wider by a quarter inch" onPress={() => setWidth(c.width + 0.25)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, fontWeight: '600', color: t.text }}>+</Text></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ width: 40 }} />
            <View style={{ flex: 1, height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: t.sunken }}>
              {heat.pts.map((p, i) => <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.max(0, ((p.w - 0.25 - CUT_MIN_W) / spanH) * 100)}%`, width: `${(0.5 / spanH) * 100 + 0.2}%`, backgroundColor: col(p) }} />)}
            </View>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 48 }}>
            <Text style={{ fontSize: F.f13, color: t.text3 }}>{inch(CUT_MIN_W)}</Text>
            <Text style={{ fontSize: F.f13, color: t.text3 }}>{inch(maxW)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
            {([[t.barG, 'Least waste'], [t.barB, 'More'], [t.barA, 'Most'], ...(heat.pts.some(p => p.lost) ? [[t.line2, 'Too narrow']] : [])] as [string, string][]).map(([cc, l]) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: cc }} /><Text style={{ fontSize: F.f13, color: t.text2 }}>{l}</Text></View>
            ))}
          </View>
          <Note style={{ paddingHorizontal: 0 }}>
            The {vm.name.replace(' mat', '')} mat takes fabric the full {inch(vm.mw)} wide, but the blade only reaches {inch(vm.w)} × {inch(vm.l)}. Every piece is planned inside that cut area{c.width > vm.w ? `, and the outer ${inch((c.width - vm.w) / 2)} on each side stays uncut` : ''}.{c.width < vm.w - 0.01 ? ` At ${inch(c.width)} the fabric stops short of it, so pieces stay within ${inch(c.width)}.` : ''}
          </Note>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button small kind="secondary" title="Least waste" onPress={() => {
              const b = leastWasteWidth(shop);
              if (!b) return showSnack('No width fits every piece on this mat');
              const same = Math.abs(b.w - c.width) < 0.01;
              setWidth(b.w);
              showSnack(`${inch(b.w)} ${same ? 'already wastes' : 'wastes'} the least: ${pct(b.wst)}`);
            }} />
            {exact.map(x => <Button key={x} small kind={Math.abs(x - c.width) < 0.01 ? 'primary' : 'secondary'} title={`${inch(x)} · ${Math.round(c.bolt / x)} strips`} onPress={() => setWidth(x)} />)}
          </View>
          {exact.length ? <Text style={{ fontSize: F.f13, color: t.text3 }}>The marks on the slider are strip widths that divide your {inch(c.bolt)} bolt exactly.</Text> : null}
        </View>
      </Sect>
      <WList bg>
        <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: F.f15, color: t.text }}>Cut length</Text><Text style={{ fontSize: F.f14, color: t.text3 }}>Down the mat, up to {inch(vm.l)} on this one</Text></View>
          <NumField bare label="Cut length" value={c.matLen} onChange={x => setCut({ matLen: Math.min(vm.l, Math.max(1, x || vm.l)) })} suffix="in" width={110} />
        </View>
        <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: F.f15, color: t.text }}>Space between pieces</Text><Text style={{ fontSize: F.f14, color: t.text3 }}>Room for the blade between outlines</Text></View>
          <NumField bare label="Space between pieces" value={c.gap} onChange={x => setCut({ gap: Math.min(2, Math.max(0, x ?? 0.25)) })} suffix="in" width={110} />
        </View>
        <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: F.f15, color: t.text }}>Extra fabric</Text><Text style={{ fontSize: F.f14, color: t.text3 }}>Added to every plan’s yards</Text></View>
          <NumField bare label="Extra fabric" value={c.buffer} onChange={x => setCut({ buffer: Math.max(0, x ?? 0) })} suffix="%" width={110} />
        </View>
        {toggle('Straps turn to fit', 'Lay straps across, along or mixed on any fabric, directional prints included, whichever wastes least', c.strapTurn !== false, v => setCut({ strapTurn: v }))}
        {toggle('Use the corners', 'Keep row-end corners and big enough scraps for scrap packs, so they don’t count as waste', c.useScraps === true, v => setCut({ useScraps: v }))}
        {c.useScraps ? (
          <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={{ fontSize: F.f15, color: t.text }}>Smallest scrap kept</Text><Text style={{ fontSize: F.f14, color: t.text3 }}>Narrower than this counts as waste</Text></View>
            <NumField bare label="Smallest scrap kept" value={c.minScrap} onChange={x => setCut({ minScrap: Math.max(0.5, x || 2) })} suffix="in" width={110} />
          </View>
        ) : null}
      </WList>
    </View>
  );

  const right = (
    <View style={{ gap: 18 }}>
      {heat.best && now > heat.best.waste + 0.08 && Math.abs(heat.best.w - c.width) > 0.01 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.warnTint, borderRadius: 14, padding: 12, flexWrap: 'wrap' }}>
          <Text style={{ flex: 1, minWidth: 200, fontSize: F.f14, color: t.onWarn }}><Text style={{ fontWeight: '700' }}>{inch(c.width)} wastes {pct(now)}</Text> on what’s left to cut. {inch(heat.best.w)} wastes {pct(heat.best.waste)}.</Text>
          <Button small title={`Use ${inch(heat.best.w)}`} onPress={() => setWidth(heat.best!.w)} />
        </View>
      ) : null}
      {cp ? (
        <Sect title="Example layout" right={<Text style={{ fontSize: F.f14, color: t.text3 }}>12 Medium, 6 Large</Text>}>
          <View style={{ backgroundColor: t.bg, borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: F.f14, color: t.text2, lineHeight: 20 }}>
              {plural(cp.bm.length, 'bandana mat')} of {inch(c.width)} × {inch(c.matLen)} with up to <Text style={{ fontWeight: '700', color: t.text }}>{cp.per}</Text> on a mat, plus {plural(cp.sm.length, 'strap mat')}. About {(cp.yards + cp.strapYards).toFixed(1)} yd of fabric, {pct(cp.waste)} waste.{cp.tooBig ? ` ${plural(cp.tooBig, 'piece')} too big for this mat.` : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {cp.mats.slice(0, 8).map((m: any, i: number) => <MatView key={i} mat={m} cp={cp} matSize={vm} width={two ? 92 : 80} bodyColor={bodyCol} strapColor={strapCol} />)}
            </View>
            {cp.mats.length > 8 ? <Text style={{ fontSize: F.f13, color: t.text3 }}>and {plural(cp.mats.length - 8, 'more mat')}</Text> : null}
          </View>
        </Sect>
      ) : <Note>Add a cut size for Medium and Large to see an example layout.</Note>}
      {jobs.length ? (
        <Sect title="Runs still to cut" right={<Text style={{ fontSize: F.f14, color: t.text3 }}>with their own fabric</Text>}>
          <WList bg>
            {jobs.map(j => {
              const p = runPlanNow(shop, j);
              if (!p || !j.run) return null;
              return (
                <View key={j.run.id} style={{ minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: j.body ? j.body.color : t.sunken }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: F.f15, fontWeight: '600', color: t.text }}>{(j.run.name || 'Untitled run').split(' — ')[0]}</Text>
                    <Text style={{ fontSize: F.f14, color: t.text3 }}>{p.bm.length} + {plural(p.sm.length, 'strap mat')} · up to {p.per} a mat{j.body && j.body.way === 'one' ? ' · directional' : ''}</Text>
                  </View>
                  <Text style={{ fontSize: F.f15, fontWeight: '600', color: p.waste >= 0.25 ? t.warn : t.text2 }}>{pct(p.waste)}</Text>
                </View>
              );
            })}
          </WList>
        </Sect>
      ) : null}
    </View>
  );
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: two ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
      <View style={{ flex: two ? 1 : undefined, width: two ? undefined : '100%', minWidth: 0 }}>{left}</View>
      <View style={{ width: two ? 380 : '100%' }}>{right}</View>
    </View>
  );
}
