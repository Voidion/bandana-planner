/* Shared components: one of each, used everywhere (same spec as the prototype, a little denser for desktop). */
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { parseNum } from '../lib/format';
import { F, R, shadow, useTheme } from './theme';
import { CloseIcon, UndoIcon } from './icons';

/* ---------- text ---------- */
export function T({ style, s = 'body', color, numberOfLines, children, onPress }: { style?: StyleProp<TextStyle>; s?: 'title' | 'h1' | 'h2' | 'label' | 'body' | 'sub' | 'small' | 'num'; color?: string; numberOfLines?: number; children: React.ReactNode; onPress?: () => void }) {
  const t = useTheme();
  const base: TextStyle =
    s === 'title' ? { fontSize: F.f34, fontWeight: '700', color: t.text, letterSpacing: -0.5 }
    : s === 'h1' ? { fontSize: F.f22, fontWeight: '700', color: t.text, letterSpacing: -0.3 }
    : s === 'h2' ? { fontSize: F.f13, fontWeight: '600', color: t.text2, letterSpacing: 0.6, textTransform: 'uppercase' }
    : s === 'label' ? { fontSize: F.f13, fontWeight: '500', color: t.text3 }
    : s === 'sub' ? { fontSize: F.f14, color: t.text3 }
    : s === 'small' ? { fontSize: F.f12, color: t.text3 }
    : s === 'num' ? { fontSize: F.f22, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] }
    : { fontSize: F.f15, color: t.text };
  return (
    <Text numberOfLines={numberOfLines} onPress={onPress} style={[base, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

/* ---------- buttons ---------- */
type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ title, onPress, kind = 'primary', small, icon, disabled, style, accessibilityLabel }: { title: string; onPress: () => void; kind?: BtnKind; small?: boolean; icon?: (c: string) => React.ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const bg = kind === 'primary' ? t.action : kind === 'danger' ? t.dangerTint : kind === 'secondary' ? t.surface : 'transparent';
  const fg = kind === 'primary' ? t.onAction : kind === 'danger' ? t.danger : kind === 'ghost' ? t.action : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={({ pressed }) => [
        {
          minHeight: small ? 44 : 52,
          paddingHorizontal: small ? 16 : 18,
          borderRadius: small ? 22 : R.control,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: t.line2,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        hover && !disabled ? { backgroundColor: kind === 'ghost' ? t.tint2 : kind === 'secondary' ? t.sunken : bg, opacity: kind === 'primary' || kind === 'danger' ? 0.92 : 1 } : null,
        style,
      ]}>
      {icon ? icon(fg) : null}
      <Text style={{ color: fg, fontSize: small ? F.f15 : F.f16, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ onPress, label, children, active }: { onPress: () => void; label: string; children: (c: string) => React.ReactNode; active?: boolean }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} {...({ tooltip: label } as any)} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: hover || active ? t.sunken : 'transparent' }}>
      {children(t.text2)}
    </Pressable>
  );
}

/* ---------- surfaces ---------- */
export function Card({ children, style, pad = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderRadius: R.card }, shadow(t.dark), pad ? { padding: 18 } : null, style]}>{children}</View>;
}

export function Section({ title, right, children, style }: { title: string; right?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 8 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, minHeight: 24 }}>
        <T s="h2">{title}</T>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ onPress, selected, children, style, first, menu }: { onPress?: () => void; selected?: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle>; first?: boolean; menu?: MenuItem[] }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const ctx = useContextMenu(menu);
  const body = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, minHeight: 52, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: t.line }, style]}>{children}</View>
  );
  if (!onPress) return menu ? <View {...ctx}>{body}</View> : body;
  return (
    <Pressable {...ctx} accessibilityRole="button" onPress={() => !ctx.wasRight() && onPress()} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={{ backgroundColor: selected ? t.tint2 : hover ? (t.dark ? '#2A2A2F' : '#F7F7F8') : 'transparent' }}>
      {body}
    </Pressable>
  );
}

/* ---------- right-click menus ---------- */
export type MenuItem = { label: string; onPress: () => void; danger?: boolean } | null;
type MenuState = { x: number; y: number; items: Exclude<MenuItem, null>[] } | null;
let menuState: MenuState = null;
const menuSubs = new Set<() => void>();
const setMenu = (m: MenuState) => {
  menuState = m;
  menuSubs.forEach(f => f());
};
export const closeMenu = () => setMenu(null);
export const menuOpen = () => !!menuState;
/** Opens a menu at a point, for buttons that show a menu on a normal click */
export const openMenuAt = (x: number, y: number, items: MenuItem[]) => setMenu({ x, y, items: items.filter(Boolean) as Exclude<MenuItem, null>[] });

/** Props for a view that opens a menu on right-click (Windows sends which button was pressed with each pointer event). */
export function useContextMenu(items?: MenuItem[]) {
  const right = React.useRef(0);
  const list = (items || []).filter(Boolean) as Exclude<MenuItem, null>[];
  const open = (e: any) => {
    const n = e?.nativeEvent || {};
    setMenu({ x: n.pageX ?? n.clientX ?? 0, y: n.pageY ?? n.clientY ?? 0, items: list });
  };
  if (!list.length) return { wasRight: () => false } as any;
  return {
    onPointerDown: (e: any) => {
      const n = e?.nativeEvent || {};
      if (n.isRightButton || n.button === 2) {
        right.current = Date.now();
        open(e);
      }
    },
    // the browser preview
    onContextMenu: (e: any) => {
      e?.preventDefault?.();
      right.current = Date.now();
      open(e);
    },
    wasRight: () => Date.now() - right.current < 600,
  } as any;
}

export function ContextMenuHost() {
  const t = useTheme();
  const m = useSyncExternalStore(f => (menuSubs.add(f), () => menuSubs.delete(f)), () => menuState);
  const [size, setSize] = useState({ w: 2000, h: 2000 });
  if (!m) return null;
  const w = 220,
    h = m.items.length * 36 + 12;
  const left = Math.max(8, Math.min(m.x, size.w - w - 8));
  const top = Math.max(8, Math.min(m.y, size.h - h - 8));
  return (
    <View style={StyleSheet.absoluteFill} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Pressable accessibilityLabel="Close menu" onPress={closeMenu} onPointerDown={(e: any) => (e?.nativeEvent?.isRightButton || e?.nativeEvent?.button === 2) && closeMenu()} style={StyleSheet.absoluteFill} />
      <View accessibilityRole="menu" style={{ position: 'absolute', left, top, width: w, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 6, borderWidth: 1, borderColor: t.line2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
        {m.items.map((it, i) => (
          <MenuRow key={i} it={it} />
        ))}
      </View>
    </View>
  );
}
function MenuRow({ it }: { it: Exclude<MenuItem, null> }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable accessibilityRole="menuitem" onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)} onPress={() => { closeMenu(); it.onPress(); }}
      style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, marginHorizontal: 6, borderRadius: 6, backgroundColor: hover ? (it.danger ? t.dangerTint : t.tint2) : 'transparent' }}>
      <Text style={{ fontSize: F.f14, color: it.danger ? t.danger : t.text }}>{it.label}</Text>
    </Pressable>
  );
}

/* ---------- inputs ---------- */
export function Field({ label, value, onChange, placeholder, multiline, autoFocus, width, bare }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; autoFocus?: boolean; width?: number; bare?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ gap: 4, width }}>
      {bare ? null : <T s="label">{label}</T>}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.text3}
        multiline={multiline}
        autoFocus={autoFocus}
        accessibilityLabel={label}
        style={[inputStyle(t), multiline ? { minHeight: 72, textAlignVertical: 'top', paddingTop: 8 } : null]}
      />
    </View>
  );
}

const inputStyle = (t: ReturnType<typeof useTheme>): TextStyle => ({
  minHeight: 38,
  borderRadius: R.control,
  borderWidth: 1,
  borderColor: t.line2,
  backgroundColor: t.surface,
  color: t.text,
  paddingHorizontal: 10,
  fontSize: F.f15,
});

/** A number box that lets you type freely (10 1/2, 10.5) and saves when you leave it or press Enter. */
export function NumField({ label, value, onChange, suffix, prefix, width = 120, min = 0, placeholder, hint, bare }: { label?: string; value: number | null | undefined; onChange: (n: number | null) => void; suffix?: string; prefix?: string; width?: number; min?: number; placeholder?: string; hint?: string; bare?: boolean }) {
  const t = useTheme();
  const show = (v: number | null | undefined) => (v == null || isNaN(v as number) ? '' : String(+(+v).toFixed(3)));
  const [draft, setDraft] = useState(show(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setDraft(show(value));
  }, [value, focus]);
  const commit = () => {
    const n = parseNum(draft);
    if (draft.trim() === '') onChange(null);
    else if (n != null) onChange(Math.max(min, n));
    else setDraft(show(value));
  };
  const bad = draft.trim() !== '' && parseNum(draft) == null;
  return (
    <View style={{ gap: 4 }}>
      {label && !bare ? <T s="label">{label}</T> : null}
      <View style={[inputStyle(t), { flexDirection: 'row', alignItems: 'center', width, borderColor: bad ? t.danger : focus ? t.action : t.line2, borderWidth: focus ? 2 : 1, paddingHorizontal: focus ? 9 : 10 }]}>
        {prefix ? <Text style={{ color: t.text3, fontSize: F.f15 }}>{prefix}</Text> : null}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setFocus(true)}
          onBlur={() => {
            setFocus(false);
            commit();
          }}
          onSubmitEditing={commit}
          placeholder={placeholder}
          placeholderTextColor={t.text3}
          accessibilityLabel={label}
          style={{ flex: 1, color: t.text, fontSize: F.f15, paddingVertical: 6, textAlign: 'right', minWidth: 0 }}
        />
        {suffix ? <Text style={{ color: t.text3, fontSize: F.f14, marginLeft: 6 }}>{suffix}</Text> : null}
      </View>
      {hint ? <T s="small">{hint}</T> : null}
    </View>
  );
}

export function Segmented<V extends string>({ value, options, onChange, label, bare, fill }: { value: V; options: [V, string][]; onChange: (v: V) => void; label?: string; bare?: boolean; fill?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ gap: 4, alignSelf: fill ? 'stretch' : undefined }}>
      {label && !bare ? <T s="label">{label}</T> : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 2, backgroundColor: t.sunken, borderRadius: 14, padding: 3, alignSelf: fill ? 'stretch' : 'flex-start' }}>
        {options.map(([v, l]) => (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: v === value }} onPress={() => onChange(v)}
            style={[{ flex: fill ? 1 : undefined, paddingHorizontal: 12, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: v === value ? t.surface : 'transparent' }, v === value && !t.dark ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null]}>
            <Text numberOfLines={1} style={{ color: v === value ? t.text : t.text2, fontSize: F.f15, fontWeight: '600' }}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Chip({ label, tone = 'plain' }: { label: string; tone?: 'plain' | 'warn' | 'ok' | 'tint' | 'bad' }) {
  const t = useTheme();
  const bg = tone === 'warn' ? t.warnTint : tone === 'ok' ? t.successTint : tone === 'tint' ? t.tint : tone === 'bad' ? t.dangerTint : t.sunken;
  const fg = tone === 'warn' ? t.onWarn : tone === 'ok' ? t.onSuccess : tone === 'tint' ? t.onTint : tone === 'bad' ? t.onDanger : t.text2;
  return (
    <View style={{ backgroundColor: bg, borderRadius: R.chip, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' }}>
      <Text numberOfLines={1} style={{ color: fg, fontSize: F.f13, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const t = useTheme();
  const btn = (d: number, sym: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={(d < 0 ? 'Fewer ' : 'More ') + label} disabled={d < 0 && value <= 0} onPress={() => onChange(Math.max(0, value + d))}
      style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.sunken, opacity: d < 0 && value <= 0 ? 0.4 : 1 }}>
      <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>{sym}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {btn(-1, '−')}
      <NumField bare label={label} value={value} onChange={n => onChange(Math.round(n || 0))} width={64} />
      {btn(1, '+')}
    </View>
  );
}

export function Swatch({ color, size = 36 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: color }} />;
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, padding: 36, borderRadius: R.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, backgroundColor: t.surface }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.tint2, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <T s="h1" style={{ fontSize: 18 }}>{title}</T>
      <T s="sub" style={{ textAlign: 'center', maxWidth: 420, lineHeight: 20 }}>{body}</T>
      {action}
    </View>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  const t = useTheme();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: 6, backgroundColor: color }} />
    </View>
  );
}

/* ---------- undo bar ---------- */
type Snack = { text: string; undo?: () => void; id: number } | null;
let snack: Snack = null;
let snackTimer: ReturnType<typeof setTimeout> | null = null;
const snackSubs = new Set<() => void>();
export function showSnack(text: string, undo?: () => void) {
  snack = { text, undo, id: Date.now() };
  snackSubs.forEach(f => f());
  if (snackTimer) clearTimeout(snackTimer);
  snackTimer = setTimeout(() => {
    snack = null;
    snackSubs.forEach(f => f());
  }, undo ? 8000 : 3500);
}
export function hideSnack() {
  snack = null;
  snackSubs.forEach(f => f());
}
export function SnackBar() {
  const t = useTheme();
  const s = useSyncExternalStore(f => (snackSubs.add(f), () => snackSubs.delete(f)), () => snack);
  if (!s) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ position: 'absolute', right: 24, bottom: 20, alignItems: 'flex-end' }} pointerEvents="box-none">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.dark ? '#34343A' : '#2F3033', borderRadius: 12, paddingLeft: 16, paddingRight: 6, minHeight: 46, maxWidth: 560 }}>
        <Text style={{ color: '#F2F0F4', fontSize: F.f15, flexShrink: 1 }}>{s.text}</Text>
        {s.undo ? (
          <Pressable accessibilityRole="button" onPress={() => { s.undo && s.undo(); hideSnack(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 34 }}>
            <UndoIcon color="#FFB870" size={16} />
            <Text style={{ color: '#FFB870', fontWeight: '700', fontSize: F.f15 }}>Undo</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={hideSnack} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon color="#C7C6CA" size={14} />
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- sheet (a panel over the app; no native Modal needed) ---------- */
export function Sheet({ title, sub, onClose, children, footer, width = 520 }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  const t = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} />
      <View accessibilityViewIsModal style={{ width, maxWidth: '92%', maxHeight: '90%', backgroundColor: t.surface, borderRadius: 20, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T s="h1">{title}</T>
            {sub ? <T s="sub">{sub}</T> : null}
          </View>
          <IconButton label="Close" onPress={onClose}>{c => <CloseIcon color={c} size={16} />}</IconButton>
        </View>
        <View style={{ paddingHorizontal: 22, paddingBottom: footer ? 8 : 22, gap: 14, flexShrink: 1 }}>{children}</View>
        {footer ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 18, paddingTop: 10 }}>{footer}</View> : null}
      </View>
    </View>
  );
}

/** A compact choice: shows the current value; clicking opens the options in a small sheet. */
export function Select<V extends string>({ value, options, onChange, label, width = 180 }: { value: V; options: [V, string, string?][]; onChange: (v: V) => void; label: string; width?: number }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o[0] === value) || options[0];
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${cur ? cur[1] : ''}`} onPress={() => setOpen(true)}
        style={[inputStyle(t), { width, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: t.line2, paddingHorizontal: 10, minHeight: 38 }]}>
        <Text numberOfLines={1} style={{ color: t.text, fontSize: F.f15, flexShrink: 1 }}>{cur ? cur[1] : ''}</Text>
        <Text style={{ color: t.text3, fontSize: 12, marginLeft: 6 }}>▾</Text>
      </Pressable>
      {open ? (
        <Sheet title={label} onClose={() => setOpen(false)} width={420}>
          <View style={{ backgroundColor: t.bg, borderRadius: R.card, overflow: 'hidden' }}>
            {options.map(([v, l, sub], i) => (
              <Row key={v} first={i === 0} selected={v === value} onPress={() => { onChange(v); setOpen(false); }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: v === value ? '700' : '500' }}>{l}</T>
                  {sub ? <T s="sub">{sub}</T> : null}
                </View>
              </Row>
            ))}
          </View>
        </Sheet>
      ) : null}
    </>
  );
}

/* ---------- list beside detail; one at a time with Back when there isn't room (Split view, small windows) ---------- */
export function TwoPane({ list, detail, sel, listWidth = 360, listBg }: { list: React.ReactNode; detail: React.ReactNode; sel: string | null | undefined; listWidth?: number; listBg?: string }) {
  const t = useTheme();
  const [w, setW] = useState(2000);
  const [showDetail, setShowDetail] = useState(false);
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    setShowDetail(true);
  }, [sel]);
  const narrow = w < listWidth + 440;
  if (!narrow)
    return (
      <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ width: listWidth, borderRightWidth: 1, borderRightColor: t.line, backgroundColor: listBg }}>{list}</View>
        <View style={{ flex: 1 }}>{detail}</View>
      </View>
    );
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flex: 1 }}>
      {showDetail && detail ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to the list" onPress={() => setShowDetail(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingTop: 14, minHeight: 44 }}>
            <Text style={{ color: t.action, fontSize: 22, marginTop: -3 }}>‹</Text>
            <Text style={{ color: t.action, fontSize: F.f15, fontWeight: '600' }}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>{detail}</View>
        </>
      ) : (
        <View style={{ flex: 1, backgroundColor: listBg }}>{list}</View>
      )}
    </View>
  );
}
