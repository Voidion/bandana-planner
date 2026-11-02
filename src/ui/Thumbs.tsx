/* Small pictures for runs and fabric: the newest photo, or the fabric's colour when there isn't one. */
import React from 'react';
import { Image, View } from 'react-native';
import { useShop } from '../state/store';
import type { Fabric, Run } from '../state/types';
import { useTheme } from './theme';

export function RunThumb({ r, size = 44, radius = 12 }: { r: Run; size?: number; radius?: number }) {
  const shop = useShop();
  const t = useTheme();
  const ph = shop.photos.filter(p => !p.deleted && (p.run === r.id || (r.body && p.fabric === r.body && !p.run))).sort((a, b) => b.added.localeCompare(a.added))[0];
  const color = shop.fabrics.find(f => f.id === r.body)?.color || t.sunken;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: color }}>
      {ph ? <Image source={{ uri: ph.src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
    </View>
  );
}

export function FabThumb({ f, size = 32, radius = 8 }: { f: Fabric; size?: number; radius?: number }) {
  const shop = useShop();
  const ph = shop.photos.filter(p => !p.deleted && p.fabric === f.id).sort((a, b) => b.added.localeCompare(a.added))[0];
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: f.color }}>
      {ph ? <Image source={{ uri: ph.src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
    </View>
  );
}
