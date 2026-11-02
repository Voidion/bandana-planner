/* Cut files (SVG) from Design Space or a design app, read without a browser.
   Sized the way Design Space reads them (real units when given, otherwise 72 px per inch, as the prototype does), then
   every shape is traced to its outline in inches. The cut planner nests pieces by that real outline, and the cut files it
   saves draw those outlines on the mat. Nothing from the file is ever run or shown as markup. */

export interface CutFile {
  name: string;
  /** Width and height of the document, inches */
  w: number;
  h: number;
  shapes: number;
  /** Traced outlines in inches, origin top-left of the document */
  outline: [number, number][][];
  /** Area of the outlines, square inches */
  area: number;
  /** The outline couldn't be traced, so it's planned as a box */
  boxOnly?: boolean;
}

export type CutFileError = 'read' | 'size' | 'empty' | 'big';

type M = [number, number, number, number, number, number]; // a b c d e f
const I: M = [1, 0, 0, 1, 0, 0];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const ap = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseTransform(t: string | undefined): M {
  let m: M = I;
  if (!t) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(t))) {
    const a = (x[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
    let n: M = I;
    switch (x[1]) {
      case 'matrix':
        if (a.length === 6) n = a as M;
        break;
      case 'translate':
        n = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
        break;
      case 'scale':
        n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case 'rotate': {
        const r = ((a[0] || 0) * Math.PI) / 180,
          c = Math.cos(r),
          s = Math.sin(r);
        n = [c, s, -s, c, 0, 0];
        if (a.length >= 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      }
      case 'skewX':
        n = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case 'skewY':
        n = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
    }
    m = mul(m, n);
  }
  return m;
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function attrs(src: string): Record<string, string> {
  const o: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(src))) o[x[1]] = decode(x[2] ?? x[3] ?? '');
  // style="transform: …" is rare in cut files; display:none hides a shape
  if (o.style && /display\s*:\s*none/i.test(o.style)) o.display = 'none';
  return o;
}

/* ---------- path data, flattened to points in user units ---------- */
function pathPolys(d: string, step: number): [number, number][][] {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
  const out: [number, number][][] = [];
  let cur: [number, number][] = [];
  let i = 0,
    cmd = '',
    x = 0,
    y = 0,
    sx = 0,
    sy = 0,
    cx = 0,
    cy = 0,
    prev = '';
  const num = () => Number(toks[i++]);
  const close = () => {
    if (cur.length > 2) out.push(cur);
    cur = [];
  };
  const lineTo = (nx: number, ny: number) => {
    if (!cur.length) cur.push([x, y]);
    cur.push([nx, ny]);
    x = nx;
    y = ny;
  };
  const segs = (len: number) => Math.max(4, Math.min(200, Math.ceil(len / step)));
  const cubic = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => {
    if (!cur.length) cur.push([x, y]);
    const n = segs(Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(ex - x2, ey - y2));
    const x0 = x,
      y0 = y;
    for (let k = 1; k <= n; k++) {
      const t = k / n,
        u = 1 - t;
      cur.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey]);
    }
    x = ex;
    y = ey;
  };
  const quad = (x1: number, y1: number, ex: number, ey: number) => {
    if (!cur.length) cur.push([x, y]);
    const n = segs(Math.hypot(x1 - x, y1 - y) + Math.hypot(ex - x1, ey - y1));
    const x0 = x,
      y0 = y;
    for (let k = 1; k <= n; k++) {
      const t = k / n,
        u = 1 - t;
      cur.push([u * u * x0 + 2 * u * t * x1 + t * t * ex, u * u * y0 + 2 * u * t * y1 + t * t * ey]);
    }
    x = ex;
    y = ey;
  };
  const arc = (rx: number, ry: number, rotDeg: number, large: number, sweep: number, ex: number, ey: number) => {
    if (!cur.length) cur.push([x, y]);
    if (!rx || !ry || (x === ex && y === ey)) return lineTo(ex, ey);
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const phi = (rotDeg * Math.PI) / 180,
      cp = Math.cos(phi),
      sp = Math.sin(phi);
    const dx = (x - ex) / 2,
      dy = (y - ey) / 2;
    const x1 = cp * dx + sp * dy,
      y1 = -sp * dx + cp * dy;
    const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lam > 1) {
      rx *= Math.sqrt(lam);
      ry *= Math.sqrt(lam);
    }
    const num2 = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
    let co = Math.sqrt(Math.max(0, num2 / den));
    if (large === sweep) co = -co;
    const cxp = (co * rx * y1) / ry,
      cyp = (-co * ry * x1) / rx;
    const ccx = cp * cxp - sp * cyp + (x + ex) / 2,
      ccy = sp * cxp + cp * cyp + (y + ey) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number) => {
      const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      return a;
    };
    const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
    let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    else if (sweep && dt < 0) dt += 2 * Math.PI;
    const n = segs(Math.abs(dt) * Math.max(rx, ry));
    for (let k = 1; k <= n; k++) {
      const t = t1 + (dt * k) / n;
      cur.push([ccx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, ccy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]);
    }
    x = ex;
    y = ey;
  };
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    else if (!cmd) {
      i++;
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0,
      oy = rel ? y : 0;
    switch (C) {
      case 'M': {
        close();
        x = num() + ox;
        y = num() + oy;
        sx = x;
        sy = y;
        cur = [[x, y]];
        cmd = rel ? 'l' : 'L';
        prev = 'M';
        continue;
      }
      case 'L':
        lineTo(num() + ox, num() + oy);
        break;
      case 'H':
        lineTo(num() + ox, y);
        break;
      case 'V':
        lineTo(x, num() + oy);
        break;
      case 'C': {
        const x1 = num() + ox,
          y1 = num() + oy,
          x2 = num() + ox,
          y2 = num() + oy,
          ex = num() + ox,
          ey = num() + oy;
        cubic(x1, y1, x2, y2, ex, ey);
        cx = x2;
        cy = y2;
        break;
      }
      case 'S': {
        const x1 = prev === 'C' || prev === 'S' ? 2 * x - cx : x,
          y1 = prev === 'C' || prev === 'S' ? 2 * y - cy : y;
        const x2 = num() + ox,
          y2 = num() + oy,
          ex = num() + ox,
          ey = num() + oy;
        cubic(x1, y1, x2, y2, ex, ey);
        cx = x2;
        cy = y2;
        break;
      }
      case 'Q': {
        const x1 = num() + ox,
          y1 = num() + oy,
          ex = num() + ox,
          ey = num() + oy;
        quad(x1, y1, ex, ey);
        cx = x1;
        cy = y1;
        break;
      }
      case 'T': {
        const x1 = prev === 'Q' || prev === 'T' ? 2 * x - cx : x,
          y1 = prev === 'Q' || prev === 'T' ? 2 * y - cy : y;
        const ex = num() + ox,
          ey = num() + oy;
        quad(x1, y1, ex, ey);
        cx = x1;
        cy = y1;
        break;
      }
      case 'A': {
        const rx = num(),
          ry = num(),
          rot = num();
        // flags may be written run together ("a5 5 0 011 1")
        const flag = () => {
          const t = toks[i];
          if (t && t.length > 1 && /^[01]/.test(t)) {
            toks[i] = t.slice(1);
            return Number(t[0]);
          }
          return num();
        };
        const la = flag(),
          sw = flag();
        arc(rx, ry, rot, la, sw, num() + ox, num() + oy);
        break;
      }
      case 'Z':
        if (cur.length) cur.push([sx, sy]);
        close();
        x = sx;
        y = sy;
        cmd = '';
        prev = 'Z';
        continue;
      default:
        i++;
    }
    prev = C;
  }
  close();
  return out;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, step: number): [number, number][] {
  const n = Math.max(16, Math.min(240, Math.ceil((2 * Math.PI * Math.max(rx, ry)) / step)));
  const p: [number, number][] = [];
  for (let k = 0; k < n; k++) p.push([cx + rx * Math.cos((2 * Math.PI * k) / n), cy + ry * Math.sin((2 * Math.PI * k) / n)]);
  return p;
}

export function polyArea(p: [number, number][]) {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
  return a / 2;
}

/** Reads an SVG cut file. Returns the outline in inches, or an error the screen can explain. */
export function parseCutFile(text: string, name: string): CutFile | { err: CutFileError } {
  if (!text || text.length > 2_000_000) return { err: text ? 'big' : 'read' };
  const src = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  const root = /<svg\b([^>]*)>/i.exec(src);
  if (!root) return { err: 'read' };
  const ra = attrs(root[1]);
  const UNIT: Record<string, number> = { in: 1, mm: 1 / 25.4, cm: 1 / 2.54, pt: 1 / 72, pc: 1 / 6, px: 1 / 72, '': 1 / 72 };
  const CSS: Record<string, number> = { in: 96, mm: 96 / 25.4, cm: 96 / 2.54, pt: 96 / 72, pc: 16, px: 1, '': 1 };
  const parseLen = (v: string | undefined, table: Record<string, number>) => {
    const m = /^\s*([\d.]+)\s*(in|mm|cm|pt|pc|px)?\s*$/.exec(v || '');
    return m ? +m[1] * table[m[2] || ''] : null;
  };
  let w = parseLen(ra.width, UNIT),
    h = parseLen(ra.height, UNIT);
  const vb = (ra.viewBox || '').trim().split(/[\s,]+/).map(Number);
  const hasVb = vb.length === 4 && vb.every(isFinite) && vb[2] > 0 && vb[3] > 0;
  if (hasVb) {
    if (w == null && h != null) w = (h * vb[2]) / vb[3];
    else if (h == null && w != null) h = (w * vb[3]) / vb[2];
    else if (w == null && h == null) {
      w = vb[2] / 72;
      h = vb[3] / 72;
    }
  }
  if (!(w! > 0 && h! > 0)) return { err: 'size' };
  const W = w!,
    H = h!;
  // user units → inches
  let base: M;
  if (hasVb) base = mul([W / vb[2], 0, 0, H / vb[3], 0, 0], [1, 0, 0, 1, -vb[0], -vb[1]]);
  else {
    const pw = parseLen(ra.width, CSS) || W * 72;
    const s = W / pw;
    base = [s, 0, 0, s, 0, 0];
  }
  const scale = Math.hypot(base[0], base[1]) || 1;
  const step = 0.04 / scale; // about every 0.04 in, like the prototype's trace

  const polys: [number, number][][] = [];
  let shapes = 0;
  const stack: { m: M; skip: boolean; tag: string }[] = [{ m: base, skip: false, tag: 'svg' }];
  const SKIP = new Set(['defs', 'clippath', 'mask', 'symbol', 'pattern', 'marker', 'style', 'script', 'title', 'desc', 'metadata', 'text', 'foreignobject', 'lineargradient', 'radialgradient', 'filter']);
  const tagRe = /<(\/?)([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g;
  tagRe.lastIndex = root.index + root[0].length;
  let t: RegExpExecArray | null;
  let budget = 6000;
  while ((t = tagRe.exec(src))) {
    const closing = !!t[1],
      tag = t[2].toLowerCase().replace(/^svg:/, ''),
      selfClose = !!t[4] || /\/\s*$/.test(t[3]);
    if (closing) {
      if (stack.length > 1 && stack[stack.length - 1].tag === tag) stack.pop();
      else {
        const k = stack.map(s => s.tag).lastIndexOf(tag);
        if (k > 0) stack.length = k;
      }
      continue;
    }
    const top = stack[stack.length - 1];
    const a = attrs(t[3]);
    const m = mul(top.m, parseTransform(a.transform));
    const skip = top.skip || SKIP.has(tag) || a.display === 'none' || a.visibility === 'hidden';
    if (!selfClose) stack.push({ m, skip, tag });
    if (skip) continue;
    let local: [number, number][][] = [];
    const n = (k: string) => parseFloat(a[k] || '0') || 0;
    switch (tag) {
      case 'path':
        if (a.d) local = pathPolys(a.d, step);
        break;
      case 'rect': {
        const x = n('x'),
          y = n('y'),
          rw = n('width'),
          rh = n('height');
        let rx = Math.min(rw / 2, parseFloat(a.rx || a.ry || '0') || 0),
          ry = Math.min(rh / 2, parseFloat(a.ry || a.rx || '0') || 0);
        if (rw > 0 && rh > 0)
          local =
            rx > 0 && ry > 0
              ? pathPolys(`M${x + rx} ${y}H${x + rw - rx}A${rx} ${ry} 0 0 1 ${x + rw} ${y + ry}V${y + rh - ry}A${rx} ${ry} 0 0 1 ${x + rw - rx} ${y + rh}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + rh - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`, step)
              : [[[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]]];
        break;
      }
      case 'circle':
        if (n('r') > 0) local = [ellipse(n('cx'), n('cy'), n('r'), n('r'), step)];
        break;
      case 'ellipse':
        if (n('rx') > 0 && n('ry') > 0) local = [ellipse(n('cx'), n('cy'), n('rx'), n('ry'), step)];
        break;
      case 'polygon':
      case 'polyline': {
        const v = (a.points || '').match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
        const p: [number, number][] = [];
        for (let k = 0; k + 1 < v.length; k += 2) p.push([+v[k], +v[k + 1]]);
        if (p.length > 2) local = [p];
        break;
      }
      case 'line':
        shapes++;
        break;
    }
    if (local.length) shapes++;
    for (const p of local) {
      if (budget <= 0) break;
      const q = p.map(([x, y]) => ap(m, x, y)).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000] as [number, number]);
      if (Math.abs(polyArea(q)) > 0.01) {
        polys.push(q);
        budget -= q.length;
      }
    }
  }
  if (!shapes) return { err: 'empty' };
  const f: CutFile = { name: String(name || 'cut-file.svg').slice(0, 60), w: Math.round(W * 1000) / 1000, h: Math.round(H * 1000) / 1000, shapes, outline: polys, area: 0 };
  if (!polys.length) {
    f.outline = [[[0, 0], [f.w, 0], [f.w, f.h], [0, f.h]]];
    f.boxOnly = true;
  }
  f.area = f.outline.reduce((s, p) => s + Math.abs(polyArea(p)), 0);
  return f;
}

export const cutFileError = (e: CutFileError) =>
  e === 'size'
    ? 'That SVG has no size. Set the document size in your design app and export again.'
    : e === 'empty'
      ? 'That SVG has no shapes to cut.'
      : e === 'big'
        ? 'That file is too big. Keep cut files under 500 KB.'
        : 'Couldn’t read that SVG.';
