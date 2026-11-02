/* Reminders behind the bell: "Needs you" and "When you have a minute", each with its action, snooze and dismiss.
   Snoozed ones fold away at the bottom. Opening it marks everything as seen. */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { alertsNow, alertsSnoozed, dismissAlert, markSeen, REM_KINDS, snoozeAlert, snoozeOptions, snoozeUntil, snoozeWhen, undismissAlert, unsnoozeAlert, type Alert, type AlertIcon } from '../state/alerts';
import { useShop } from '../state/store';
import { CartIcon, CheckIcon, ChevIcon, ClockIcon, CloseIcon, CoinIcon, PriceIcon, RunsIcon, ShelfIcon, SlidersIcon, WalletIcon, WrenchIcon, BellIcon } from '../ui/icons';
import { openMenuAt, showSnack, T } from '../ui/kit';
import { F, useTheme } from '../ui/theme';
import { IconBtn } from './Sidebar';

export const ALERT_ICONS: Record<AlertIcon, (p: { color: string; size?: number }) => React.ReactElement> = {
  clock: ClockIcon, runs: RunsIcon, cart: CartIcon, fabric: ShelfIcon, price: PriceIcon, coin: CoinIcon, wrench: WrenchIcon, wallet: WalletIcon,
};

export function Inbox({ onClose, go, openSettings }: { onClose: () => void; go: (route: string, id?: string) => void; openSettings: () => void }) {
  const t = useTheme();
  const shop = useShop();
  const [seenAtOpen] = useState(() => ({ ...(shop.alertSt?.seen || {}) }));
  const [snzOpen, setSnzOpen] = useState(false);
  useEffect(() => {
    markSeen();
  }, []);
  const L = alertsNow(shop);
  const need = L.filter(x => x.tone !== 'info');
  const later = L.filter(x => x.tone === 'info');
  const snz = alertsSnoozed(shop);
  const off = REM_KINDS.filter(([k]) => (shop.cfg.remind as any)[k] === false).length;
  const act = (x: Alert) => {
    onClose();
    go(x.act.route, x.act.id);
  };
  const row = (x: Alert, i: number) => <AlertRow key={x.id} x={x} first={i === 0} unread={!seenAtOpen[x.id]} onAct={() => act(x)} />;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      <Pressable accessibilityLabel="Close reminders" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} />
      <View accessibilityViewIsModal style={{ position: 'absolute', top: 16, bottom: 16, right: 16, width: 460, maxWidth: '92%', backgroundColor: t.bg, borderRadius: 22, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 }}>
          <Text style={{ flex: 1, fontSize: F.f28, fontWeight: '700', color: t.text, letterSpacing: -0.4 }}>Reminders</Text>
          <IconBtn label="Reminder settings" onPress={() => { onClose(); openSettings(); }}>{c => <SlidersIcon color={c} size={22} />}</IconBtn>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ paddingHorizontal: 10, minHeight: 40, justifyContent: 'center' }}>
            <Text style={{ color: t.action, fontWeight: '600', fontSize: F.f15 }}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 18 }}>
          {L.length ? (
            <>
              {need.length ? <Group title="Needs you" n={need.length}>{need.map(row)}</Group> : null}
              {later.length ? <Group title="When you have a minute" n={later.length}>{later.map(row)}</Group> : null}
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.tint2, alignItems: 'center', justifyContent: 'center' }}>
                {off === REM_KINDS.length ? <BellIcon color={t.action} size={30} /> : <CheckIcon color={t.action} size={30} />}
              </View>
              <T s="h1" style={{ fontSize: 18 }}>{off === REM_KINDS.length ? 'Reminders are turned off' : 'You’re all caught up'}</T>
              <T s="sub" style={{ textAlign: 'center' }}>{off === REM_KINDS.length ? 'Turn on the ones you want, like late runs or low fabric, and they’ll show up here.' : 'Late runs, low fabric, ending quotes and timers left running show up here.'}</T>
              {off ? <T onPress={() => { onClose(); openSettings(); }} color={t.action} style={{ fontWeight: '600' }}>{off === REM_KINDS.length ? 'Choose reminders' : `${off} reminder type${off === 1 ? ' is' : 's are'} off`}</T> : null}
            </View>
          )}
          {snz.length ? (
            <View style={{ gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: snzOpen }} onPress={() => setSnzOpen(!snzOpen)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>Snoozed</Text>
                <Text style={{ fontSize: F.f14, color: t.text3 }}>{snz.length}</Text>
                <View style={{ transform: [{ rotate: snzOpen ? '90deg' : '0deg' }] }}><ChevIcon color={t.text3} size={14} /></View>
              </Pressable>
              {snzOpen ? (
                <View style={{ backgroundColor: t.surface, borderRadius: 18, overflow: 'hidden' }}>
                  {snz.map((x, i) => {
                    const Icon = ALERT_ICONS[x.icon];
                    return (
                      <View key={x.id} style={{ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: t.line, opacity: 0.85 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}><Icon color={t.text2} size={20} /></View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontWeight: '600', fontSize: F.f15, color: t.text }}>{x.t}</Text>
                          <Text style={{ fontSize: F.f13, color: t.text3 }}>Back {snoozeWhen(shop.alertSt!.snz[x.id])}</Text>
                          <T onPress={() => unsnoozeAlert(x.id)} color={t.action} style={{ fontWeight: '600', fontSize: F.f14, marginTop: 4 }}>Show now</T>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function Group({ title, n, children }: { title: string; n: number; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Text style={{ fontSize: F.f16, fontWeight: '700', color: t.text }}>{title}</Text>
        <Text style={{ fontSize: F.f14, color: t.text3 }}>{n}</Text>
      </View>
      <View style={{ backgroundColor: t.surface, borderRadius: 18, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export function AlertRow({ x, first, unread, onAct }: { x: Alert; first: boolean; unread: boolean; onAct: () => void }) {
  const t = useTheme();
  const Icon = ALERT_ICONS[x.icon];
  const fg = x.tone === 'bad' ? t.danger : x.tone === 'warn' ? (t.dark ? t.warn : t.warn) : t.action;
  const bg = x.tone === 'bad' ? t.dangerTint : x.tone === 'warn' ? t.warnTint : t.tint2;
  const snooze = (e: any) => {
    const n = e?.nativeEvent || {};
    openMenuAt(n.pageX ?? 0, n.pageY ?? 0, snoozeOptions().map(([v, l, sub]) => ({ label: `${l} · ${sub}`, onPress: () => { snoozeAlert(x.id, snoozeUntil(v)); showSnack(`Snoozed until ${snoozeWhen(snoozeUntil(v))}`, () => unsnoozeAlert(x.id)); } })));
  };
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, paddingLeft: 14, paddingRight: 8, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: t.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon color={fg} size={20} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flexShrink: 1, fontWeight: '600', fontSize: F.f15, color: t.text }}>{x.t}</Text>
          {unread ? <View accessibilityLabel="New" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.action }} /> : null}
        </View>
        <Text style={{ fontSize: F.f13, color: t.text3 }}>{x.s}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Pressable accessibilityRole="button" onPress={onAct} style={{ minHeight: 32, justifyContent: 'center', paddingRight: 8 }}>
            <Text style={{ color: t.action, fontWeight: '600', fontSize: F.f14 }}>{x.act.label}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <IconBtn size={34} label={`Snooze: ${x.t}`} onPress={snooze}>{c => <ClockIcon color={c} size={18} />}</IconBtn>
          <IconBtn size={34} label={`Dismiss: ${x.t}`} onPress={() => { dismissAlert(x.id); showSnack('Dismissed', () => undismissAlert(x.id)); }}>{c => <CloseIcon color={c} size={14} />}</IconBtn>
        </View>
      </View>
    </View>
  );
}
