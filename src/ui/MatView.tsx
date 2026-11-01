/* One Cricut mat, drawn to scale: the green mat, its 1" grid, the cut area, and every piece. */
import React from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Polygon, Rect } from 'react-native-svg';
import { pieceShapes } from '../lib/plan';
import { useTheme } from './theme';

export function MatView({ mat, cp, matSize, width, bodyColor, strapColor }: { mat: any; cp: any; matSize: { mw: number; ml: number; w: number; l: number }; width: number; bodyColor: string; strapColor: string }) {
  const t = useTheme();
  const { mw, ml, w } = matSize;
  const ins = (mw - w) / 2;
  const scale = width / mw;
  const grid: React.ReactNode[] = [];
  for (let x = 1; x < mw; x++) grid.push(<Line key={'x' + x} x1={x} y1={0} x2={x} y2={ml} stroke={t.matGrid} strokeWidth={0.04} />);
  for (let y = 1; y < ml; y++) grid.push(<Line key={'y' + y} x1={0} y1={y} x2={mw} y2={y} stroke={t.matGrid} strokeWidth={0.04} />);
  return (
    <View style={{ width, height: ml * scale }}>
      <Svg width={width} height={ml * scale} viewBox={`0 0 ${mw} ${ml}`}>
        <Rect x={0} y={0} width={mw} height={ml} rx={0.6} fill={t.mat} stroke={t.matEdge} strokeWidth={0.12} />
        {grid}
        <G transform={`translate(${ins} ${ins})`}>
          <Rect x={0} y={0} width={cp.W} height={cp.L} fill="none" stroke={t.matEdge} strokeWidth={0.06} strokeDasharray="0.3 0.3" />
          {mat.pieces.flatMap((p: any, i: number) =>
            pieceShapes(p).map((sh, j) => (
              <Polygon
                key={i + '-' + j}
                points={sh.pts.map(([x, y]) => `${x},${y}`).join(' ')}
                fill={sh.s === 'strap' ? strapColor : bodyColor}
                fillOpacity={0.88}
                stroke={t.dark ? '#00000066' : '#FFFFFFAA'}
                strokeWidth={0.06}
              />
            )),
          )}
        </G>
      </Svg>
    </View>
  );
}
