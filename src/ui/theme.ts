/* Colours and sizes, matching the prototype's light and dark themes. */
import { useColorScheme } from 'react-native';
import { useSyncExternalStore } from 'react';
import { getShop, subscribe } from '../state/store';

const light = {
  bg: '#F4F4F5',
  surface: '#FFFFFF',
  sunken: '#E9E9EB',
  line: '#EEEEF0',
  line2: '#C9C9CC',
  text: '#1B1B1E',
  text2: '#46464A',
  text3: '#5E5E63',
  action: '#8A4B0C',
  onAction: '#FFFFFF',
  tint: '#FFDDB8',
  tint2: '#FFF1E2',
  onTint: '#2E1500',
  success: '#146C2E',
  successTint: '#D7F0DA',
  warn: '#7A5800',
  warnTint: '#FBE7B8',
  onWarn: '#261A00',
  danger: '#B3261E',
  dangerTint: '#F9DEDC',
  barA: '#C27A1A',
  barG: '#3F8F55',
  barB: '#E8B66A',
  mat: '#E7F1EA',
  matGrid: '#C5DCCB',
  matEdge: '#8FC9A3',
  scrim: 'rgba(0,0,0,0.32)',
  meCard: '#E4E4E9',
  meEdge: 'rgba(0,0,0,0.07)',
  amber: '#FFB870',
  onAmber: '#4A2400',
  timerBg: '#141416',
  inverse: '#2F3033',
  inverse2: '#C7C6CA',
  onInverse: '#F2F0F4',
  live: '#7ED892',
  onSuccess: '#06210F',
  onDanger: '#410E0B',
  onSuccessSolid: '#FFFFFF',
  dark: false,
};

const dark: typeof light = {
  bg: '#131316',
  surface: '#222226',
  sunken: '#2D2D31',
  line: '#36363B',
  line2: '#4A4A4F',
  text: '#E5E2E6',
  text2: '#C7C6CA',
  text3: '#A9A8AD',
  action: '#FFB870',
  onAction: '#4A2400',
  tint: '#4E2F14',
  tint2: '#33230F',
  onTint: '#FFDDB8',
  success: '#7ED892',
  successTint: '#163D22',
  warn: '#F0C159',
  warnTint: '#3E2F14',
  onWarn: '#FBE7B8',
  danger: '#F2B8B5',
  dangerTint: '#6E2420',
  barA: '#C27A1A',
  barG: '#4FA066',
  barB: '#E8B66A',
  mat: '#2C3430',
  matGrid: '#3B4741',
  matEdge: '#5E9A73',
  scrim: 'rgba(0,0,0,0.6)',
  meCard: '#2D2D31',
  meEdge: 'rgba(255,255,255,0.04)',
  amber: '#FFB870',
  onAmber: '#4A2400',
  timerBg: '#2C2C31',
  inverse: '#34343A',
  inverse2: '#C7C6CA',
  onInverse: '#F2F0F4',
  live: '#7ED892',
  onSuccess: '#C3EFCB',
  onDanger: '#F9DEDC',
  onSuccessSolid: '#00391A',
  dark: true,
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const sys = useColorScheme();
  const pref = useSyncExternalStore(subscribe, () => getShop().cfg.theme || 'system', () => 'system');
  return (pref === 'system' ? sys === 'dark' : pref === 'dark') ? dark : light;
}

export const F = { f12: 12, f13: 13, f14: 14, f15: 15, f16: 16, f18: 18, f22: 22, f28: 28, f34: 34 };
export const R = { card: 20, control: 14, chip: 999 };
/** The prototype's soft card shadow (light theme only) */
export const shadow = (dark: boolean) => (dark ? {} : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 });
/** The app's smallest supported window (matches the native minimum in BandanaPlanner.cpp). */
export const MIN_WINDOW = { width: 1024, height: 700 };
