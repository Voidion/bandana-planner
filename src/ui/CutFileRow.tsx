/* One cut file slot (a size's bandana, or a strap): upload an SVG, see its traced outline, replace or remove it. */
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';
import { inch } from '../lib/format';
import { cutFileError, parseCutFile, type CutFile } from '../lib/svg';
import { openTextFile } from '../state/storage';
import { CloseIcon } from './icons';
import { Button, IconButton, Row, showSnack, T } from './kit';
import { useTheme } from './theme';

export function OutlineThumb({ file, size = 44, color }: { file: CutFile; size?: number; color?: string }) {
  const t = useTheme();
  const s = Math.max(file.w, file.h) || 1;
  return (
    <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size - 8} height={size - 8} viewBox={`0 0 ${s} ${s}`}>
        <Rect x={0} y={0} width={s} height={s} fill="none" />
        {file.outline.map((p, i) => (
          <Polygon key={i} points={p.map(([x, y]) => `${x + (s - file.w) / 2},${y + (s - file.h) / 2}`).join(' ')} fill={color || t.barA} fillOpacity={0.35} stroke={color || t.barA} strokeWidth={s / 60} />
        ))}
      </Svg>
    </View>
  );
}

export function CutFileRow({ label, file, first, onFile, onRemove, emptyNote }: { label: string; file: CutFile | null | undefined; first?: boolean; onFile: (f: CutFile) => void; onRemove: () => void; emptyNote: string }) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    setBusy(true);
    try {
      const got = await openTextFile(`Cut file for ${label}`, 'SVG cut files', '*.svg');
      if (got) {
        if (!/\.svg$/i.test(got.name)) showSnack('That isn’t an SVG file.');
        else if (got.text.length > 600000) showSnack(cutFileError('big'));
        else {
          const f = parseCutFile(got.text, got.name);
          if ('err' in f) showSnack(cutFileError(f.err));
          else {
            onFile(f);
            showSnack(`${label} now plans at ${inch(f.w)} × ${inch(f.h)}, from the file`);
          }
        }
      }
    } catch (e) {
      showSnack('Couldn’t open that file.');
    }
    setBusy(false);
  };
  return (
    <Row first={first}>
      {file ? <OutlineThumb file={file} /> : <View style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2 }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontWeight: '600' }} numberOfLines={1}>{label}{file ? ' · ' + file.name : ''}</T>
        <T s="sub" numberOfLines={1}>{file ? `${inch(file.w)} × ${inch(file.h)} · ${file.boxOnly ? 'outline couldn’t be traced, planned as a box' : 'outline nested in cut plans'}` : emptyNote}</T>
      </View>
      <Button small kind="secondary" title={busy ? 'Opening…' : file ? 'Replace' : 'Upload SVG'} icon={busy ? c => <ActivityIndicator size="small" color={c} /> : undefined} onPress={pick} disabled={busy} />
      {file ? <IconButton label={`Remove the cut file for ${label}`} onPress={onRemove}>{c => <CloseIcon color={c} size={14} />}</IconButton> : null}
    </Row>
  );
}
