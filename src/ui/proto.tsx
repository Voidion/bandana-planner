/* Pieces the prototype's Sell and Shop screens share: the page with a list beside a detail card, list cards with
   initials, the detail header, the stats strip, status banners, date chips, white lists and steppers. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { dayLabel } from '../lib/format';
import { addDays, rel, todayDay } from '../lib/plan';
import type { Customer } from '../state/types';
import { CalIcon, ChevIcon } from './icons';
import { useContextMenu, type MenuItem } from './kit';
import { F, shadow, useTheme } from './theme';

/* ---------- customer initials, coloured by kind ---------- */
const KINDS = ['Shop', 'Shopify', 'Market', 'Custom', 'Consignment', 'Event'];
const AV_L = [['#E3ECF7', '#1F4A7A'], ['#FBE5D8', '#8A3A12'], ['#E2F0E4', '#22562E'], ['#EEE6F6', '#553185'], ['#F6EFD6', '#6B5310'], ['#F7E1E6', '#8A2440']];
const AV_D = [['#22344A', '#BFD6F2'], ['#45291A', '#F6C7A8'], ['#1E3824', '#B9E0C1'], ['#33264A', '#D8C6F0'], ['#3E3416', '#EBD9A0'], ['#46202B', '#F2BCCA']];
export const initials = (n: string) => {
  const w = String(n || '?').replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  return (((w[0] || '?')[0] || '?') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
};
export function Initials({ name, kind, size = 42 }: { name: string; kind?: string; size?: number }) {
  const t = useTheme();
  const k = KINDS.indexOf(kind || '');
  const [bg, fg] = (t.dark ? AV_D : AV_L)[k < 0 ? 3 : k];
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.34), backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontSize: Math.round(size * 0.38), fontWeight: '700', letterSpacing: 0.2 }}>{initials(name)}</Text>
    </View>
  );
}
export const CustAv = ({ c, name, size }: { c?: Customer | null; name?: string; size?: number }) => <Initials name={c ? c.name : name || '?'} kind={c ? c.kind : undefined} size={size} />;

/* ---------- page: big title, icons on the right, list beside a white detail card ---------- */
export function PageHead({ title, right, sup }: { title: string; right?: React.ReactNode; sup?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexShrink: 1 }}>
        {sup ? <Text style={{ fontSize: F.f14, color: t.text3 }}>{sup}</Text> : null}
        <Text numberOfLines={2} style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, color: t.text }}>{title}</Text>
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{right}</View> : null}
    </View>
  );
}
export function HeadBtn({ label, onPress, children, tint }: { label: string; onPress: () => void; children: (c: string) => React.ReactNode; tint?: boolean }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: hover ? t.sunken : 'transparent' }}>
      {children(tint ? t.action : t.text2)}
    </Pressable>
  );
}

/**
 * The prototype's list-and-detail page. Wide: one scrolling page with the list on the left and the detail in a white card.
 * Narrow (Split view, small window): the list, and the detail on its own with Back after you pick something.
 */
export function ListDetailPage({ title, right, list, detail, sel, top }: { title: string; right?: React.ReactNode; list: React.ReactNode; detail: React.ReactNode | null; sel: string | null | undefined; top?: React.ReactNode }) {
  const t = useTheme();
  const [w, setW] = useState(1200);
  const [showDetail, setShowDetail] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    setShowDetail(true);
  }, [sel]);
  const wide = w >= 900;
  const pad = { paddingHorizontal: 32, paddingTop: 32, paddingBottom: 48, gap: 20 };
  if (!wide && showDetail && detail)
    return (
      <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ ...pad, paddingTop: 14 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${title}`} onPress={() => setShowDetail(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' }}>
            <Text style={{ color: t.action, fontSize: 22, marginTop: -3 }}>‹</Text>
            <Text style={{ color: t.action, fontSize: F.f15, fontWeight: '600' }}>{title}</Text>
          </Pressable>
          <DetailCard>{detail}</DetailCard>
        </ScrollView>
      </View>
    );
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 1180, ...pad }}>
          <PageHead title={title} right={right} />
          {top}
          {wide ? (
            <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
              <View style={{ width: 360, gap: 16 }}>{list}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{detail ? <DetailCard>{detail}</DetailCard> : null}</View>
            </View>
          ) : (
            <View style={{ gap: 16 }}>{list}</View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
export function DetailCard({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderRadius: 20, paddingTop: 22, paddingHorizontal: 24, paddingBottom: 28, gap: 20 }, shadow(t.dark)]}>{children}</View>;
}

/* ---------- section heading ---------- */
export function Sect({ title, big, right, children, style }: { title: string; big?: boolean; right?: React.ReactNode; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ gap: 10 }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
        <Text style={big ? { fontSize: 20, fontWeight: '600', color: t.text } : { fontSize: F.f13, fontWeight: '600', color: t.text2, textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</Text>
        {typeof right === 'string' ? <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text3, fontVariant: ['tabular-nums'] }}>{right}</Text> : right}
      </View>
      {children}
    </View>
  );
}
export function Sub({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: F.f14, fontWeight: '600', color: t.text3 }}>{children}</Text>;
}
export function Note({ children, style }: { children: React.ReactNode; style?: any }) {
  const t = useTheme();
  return <Text style={[{ fontSize: F.f14, lineHeight: 20, color: t.text3, paddingHorizontal: 4 }, style]}>{children}</Text>;
}
export function LinkText({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={{ minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={[{ fontSize: F.f14, fontWeight: '600', color: t.action }, style]}>{children}</Text>
    </Pressable>
  );
}

/* ---------- list card with initials, value and chips ---------- */
export function OCard({ av, title, value, sub, chips, on, onPress, menu }: { av: React.ReactNode; title: string; value?: string; sub?: string; chips?: React.ReactNode; on?: boolean; onPress: () => void; menu?: MenuItem[] }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const ctx = useContextMenu(menu);
  return (
    <Pressable {...ctx} accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => !ctx.wasRight() && onPress()} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 20, backgroundColor: hover && !on ? (t.dark ? '#26262B' : '#FAFAFB') : t.surface, borderWidth: 2, borderColor: on ? t.action : 'transparent' }, shadow(t.dark)]}>
      {av}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={2} style={{ flex: 1, fontSize: F.f15, fontWeight: '700', color: t.text }}>{title}</Text>
          {value ? <Text style={{ fontSize: F.f15, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>{value}</Text> : null}
        </View>
        {sub ? <Text numberOfLines={2} style={{ fontSize: F.f13, color: t.text3 }}>{sub}</Text> : null}
        {chips ? <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{chips}</View> : null}
      </View>
    </Pressable>
  );
}

/* ---------- detail header ---------- */
export function DetailHero({ av, name, onName, nameValue, namePlaceholder, sub, onSub, subPlaceholder, lines, onOpenName }: {
  av: React.ReactNode; name?: string; onName?: (v: string) => void; nameValue?: string; namePlaceholder?: string;
  sub?: string; onSub?: (v: string) => void; subPlaceholder?: string; lines?: React.ReactNode[]; onOpenName?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      {av}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {onName ? (
          <TextInput accessibilityLabel={namePlaceholder || 'Name'} value={nameValue} onChangeText={onName} placeholder={namePlaceholder} placeholderTextColor={t.text3}
            style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: t.text, borderBottomWidth: 1.5, borderBottomColor: t.line2, borderStyle: 'dashed', paddingVertical: 4, minHeight: 44 }} />
        ) : (
          <Pressable accessibilityRole={onOpenName ? 'link' : undefined} disabled={!onOpenName} onPress={onOpenName} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', maxWidth: '100%' }}>
            <Text numberOfLines={2} style={{ flexShrink: 1, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, color: t.text }}>{name}</Text>
            {onOpenName ? <ChevIcon color={t.text3} size={14} /> : null}
          </Pressable>
        )}
        {onSub ? (
          <TextInput accessibilityLabel={subPlaceholder || 'Details'} value={sub} onChangeText={onSub} placeholder={subPlaceholder} placeholderTextColor={t.text3} style={{ fontSize: F.f15, color: t.text2, paddingVertical: 2 }} />
        ) : sub ? <Text style={{ fontSize: F.f15, color: t.text2 }}>{sub}</Text> : null}
        {lines?.map((l, i) => (typeof l === 'string' ? <Text key={i} style={{ fontSize: F.f14, color: t.text3 }}>{l}</Text> : <View key={i}>{l}</View>))}
      </View>
    </View>
  );
}
export function HeroAv({ letter, size = 60 }: { letter: string; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: 20, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: t.onTint }}>{letter}</Text>
    </View>
  );
}

/* ---------- stats strip ---------- */
export function Strip({ items }: { items: { v: string; l: string; color?: string }[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderRadius: 20, backgroundColor: t.sunken, paddingVertical: 12, paddingHorizontal: 4 }}>
      {items.map((x, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: items.length > 3 ? 3 : 6, borderLeftWidth: i ? 1 : 0, borderLeftColor: t.line2 }}>
          <Text numberOfLines={1} style={{ fontSize: items.length > 3 ? F.f16 : F.f18, fontWeight: '700', color: x.color || t.text, fontVariant: ['tabular-nums'] }}>{x.v}</Text>
          <Text numberOfLines={1} style={{ fontSize: F.f13, color: t.text3 }}>{x.l}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------- status banners ---------- */
export function OStat({ tone, title, sub, children }: { tone?: 'ready' | 'done' | 'warn' | 'plain'; title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  const t = useTheme();
  const bg = tone === 'ready' ? t.successTint : tone === 'warn' ? t.warnTint : tone === 'done' ? t.bg : t.surface;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: bg }, tone === 'done' ? { borderWidth: 1, borderColor: t.line } : !tone || tone === 'plain' ? shadow(t.dark) : null]}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={3} style={{ fontSize: F.f15, fontWeight: '700', color: tone === 'warn' ? t.onWarn : t.text }}>{title}</Text>
        {sub ? typeof sub === 'string' ? <Text style={{ fontSize: F.f13, color: tone === 'warn' ? t.onWarn : t.text3 }}>{sub}</Text> : sub : null}
      </View>
      {children}
    </View>
  );
}
export function FitCard({ ok, title, frac, text, action }: { ok: boolean; title: string; frac: number; text: string; action?: React.ReactNode }) {
  const t = useTheme();
  const fg = ok ? t.onSuccess : t.onWarn;
  return (
    <View style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: ok ? t.successTint : t.warnTint }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ flex: 1, fontSize: F.f15, fontWeight: '700', color: fg }}>{title}</Text>
        {action}
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <View style={{ height: 10, borderRadius: 5, width: `${Math.min(100, frac * 100)}%`, backgroundColor: ok ? t.success : t.barA }} />
      </View>
      <Text style={{ fontSize: F.f13, color: fg, fontVariant: ['tabular-nums'] }}>{text}</Text>
    </View>
  );
}

/* ---------- date chips: a few likely days and Other ---------- */
export function DateChips({ value, days, onPick, fitDay, onOther }: { value: string | null; days: number[]; onPick: (day: string) => void; fitDay?: number | null; onOther?: () => void }) {
  const t = useTheme();
  const cur = rel(value);
  const list = [...new Set([...days, ...(cur != null && !days.includes(cur) ? [cur] : []), ...(fitDay != null ? [fitDay] : [])])].sort((a, b) => a - b);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 2 }}>
      {list.map(d => {
        const day = addDays(todayDay(), d);
        const on = cur === d;
        const fit = d === fitDay;
        return (
          <Pressable key={d} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(day)}
            style={[{ minHeight: 56, minWidth: 64, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? t.tint : t.surface, borderWidth: on || fit ? 1.5 : 0, borderColor: on ? t.action : t.success }, on ? null : shadow(t.dark)]}>
            <Text style={{ fontSize: F.f13, fontWeight: '600', color: fit && !on ? t.success : on ? t.onTint : t.text3 }}>{fit && !on ? 'FITS' : dayLabel(day, { weekday: 'short' }).toUpperCase()}</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: on ? t.onTint : t.text }}>{dayLabel(day, { month: 'short', day: 'numeric' })}</Text>
          </Pressable>
        );
      })}
      {onOther ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Pick another date" onPress={onOther}
          style={[{ minHeight: 56, minWidth: 64, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line2 }, shadow(t.dark)]}>
          <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text3 }}>OTHER</Text>
          <CalIcon color={t.action} size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- white list with rows ---------- */
export function WList({ children, style, bg }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; bg?: boolean }) {
  const t = useTheme();
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: bg ? t.bg : t.surface, borderRadius: 20, paddingHorizontal: 20 }, bg ? null : shadow(t.dark), style]}>
      {kids.map((k, i) => (
        <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>{k}</View>
      ))}
    </View>
  );
}
export function WRow({ title, sub, value, right, onPress, icon, bold, valueColor }: { title: string; sub?: string; value?: string; right?: React.ReactNode; onPress?: () => void; icon?: React.ReactNode; bold?: boolean; valueColor?: string }) {
  const t = useTheme();
  const body = (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      {icon}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontSize: F.f16, fontWeight: bold ? '600' : '400', color: t.text }}>{title}</Text>
        {sub ? <Text style={{ fontSize: F.f14, color: t.text3 }}>{sub}</Text> : null}
      </View>
      {value != null ? <Text style={{ fontSize: F.f15, color: valueColor || t.text2, fontVariant: ['tabular-nums'] }}>{value}</Text> : null}
      {right}
      {onPress ? <ChevIcon color={t.text3} size={16} /> : null}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body;
}
export function Sublab({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: F.f13, fontWeight: '600', color: t.text2, marginTop: 10, marginHorizontal: 4, marginBottom: 6 }}>{children}</Text>;
}

/* ---------- − n + stepper ---------- */
export function QtyStepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const t = useTheme();
  const b = (d: number, s: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={(d < 0 ? 'Fewer ' : 'More ') + label} disabled={d < 0 && value <= 0} onPress={() => onChange(Math.max(0, value + d))}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: d < 0 && value <= 0 ? 0.4 : 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: t.text }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.sunken, borderRadius: 12 }}>
      {b(-1, '−')}
      <Text style={{ minWidth: 28, textAlign: 'center', fontSize: F.f16, fontWeight: '700', color: value ? t.text : t.text3, fontVariant: ['tabular-nums'] }}>{value || 0}</Text>
      {b(1, '+')}
    </View>
  );
}

/* ---------- a month to pick a day from ---------- */
export function CalendarSheet({ title, value, onPick, onClose, allowClear }: { title: string; value: string | null; onPick: (day: string | null) => void; onClose: () => void; allowClear?: boolean }) {
  const t = useTheme();
  const base = value || todayDay();
  const [month, setMonth] = useState(base.slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const iso = (d: number) => `${month}-${String(d).padStart(2, '0')}`;
  const shift = (n: number) => {
    const dt = new Date(y, m - 1 + n, 1);
    setMonth(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  };
  return (
    <SheetLite title={title} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22, color: t.text2 }}>‹</Text></Pressable>
        <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22, color: t.text2 }}>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: F.f13, fontWeight: '600', color: t.text3 }}>{d}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          const on = d != null && iso(d) === value;
          const today = d != null && iso(d) === todayDay();
          return (
            <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 }}>
              {d ? (
                <Pressable accessibilityRole="button" accessibilityLabel={dayLabel(iso(d), { weekday: 'long', month: 'long', day: 'numeric' })} onPress={() => { onPick(iso(d)); onClose(); }}
                  style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.action : 'transparent', borderWidth: today && !on ? 1.5 : 0, borderColor: t.action }}>
                  <Text style={{ fontSize: F.f15, fontWeight: on || today ? '700' : '400', color: on ? t.onAction : t.text }}>{d}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      {allowClear ? <LinkText onPress={() => { onPick(null); onClose(); }}>No date</LinkText> : null}
    </SheetLite>
  );
}
function SheetLite({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: t.scrim }} />
      <View accessibilityViewIsModal style={{ width: 380, maxWidth: '92%', backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: F.f18, fontWeight: '700', color: t.text }}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: t.action, fontWeight: '600', fontSize: F.f15 }}>Done</Text></Pressable>
        </View>
        {children}
      </View>
    </View>
  );
}
