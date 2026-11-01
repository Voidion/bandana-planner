/* Colours and sizes, matching the prototype's light and dark themes. */
import { useColorScheme } from 'react-native';

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
  mat: '#E7F1EA',
  matGrid: '#C5DCCB',
  matEdge: '#8FC9A3',
  scrim: 'rgba(0,0,0,0.32)',
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
  mat: '#2C3430',
  matGrid: '#3B4741',
  matEdge: '#5E9A73',
  scrim: 'rgba(0,0,0,0.6)',
  dark: true,
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const F = { f12: 12, f13: 13, f14: 14, f15: 15, f16: 16, f18: 18, f22: 22, f28: 28, f34: 34 };
export const R = { card: 16, control: 10, chip: 999 };
/** The app's smallest supported window (matches the native minimum in BandanaPlanner.cpp). */
export const MIN_WINDOW = { width: 1024, height: 700 };
