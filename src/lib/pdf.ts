/* A small PDF writer: Letter pages with Helvetica text, lines and boxes. Output is plain ASCII (other characters are
   written as WinAnsi octal escapes), so it can be saved as text by the native file module. */

const WIN: Record<string, number> = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '•': 0x95, '…': 0x85, '×': 0xd7, '″': 0x22, '′': 0x27, '·': 0xb7, '€': 0x80 };
function enc(s: string) {
  let o = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (ch === '(' || ch === ')' || ch === '\\') o += '\\' + ch;
    else if (c >= 32 && c < 127) o += ch;
    else {
      const w = WIN[ch] ?? (c >= 160 && c < 256 ? c : 0x3f);
      o += '\\' + w.toString(8).padStart(3, '0');
    }
  }
  return o;
}

/* Helvetica widths (per 1000 em) for ASCII 32–126, regular and bold */
const HR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
export function textWidth(s: string, size: number, bold = false) {
  const W = bold ? HB : HR;
  let w = 0;
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c < 127 ? W[c - 32] : 556;
  }
  return (w * size) / 1000;
}

export class Pdf {
  private pages: string[] = [];
  private cur = '';
  readonly W = 612;
  readonly H = 792;
  constructor() {
    this.addPage();
  }
  addPage() {
    if (this.cur) this.pages.push(this.cur);
    this.cur = ' ';
  }
  /** y is measured from the top of the page */
  text(x: number, y: number, s: string, o: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'right' | 'center' } = {}) {
    const size = o.size || 10;
    const w = textWidth(s, size, o.bold);
    const px = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    const [r, g, b] = o.color || [0.1, 0.1, 0.12];
    this.cur += `BT ${r} ${g} ${b} rg /${o.bold ? 'F2' : 'F1'} ${size} Tf ${px.toFixed(2)} ${(this.H - y).toFixed(2)} Td (${enc(s)}) Tj ET\n`;
  }
  /** Wraps text to a width; returns the y after the last line */
  para(x: number, y: number, s: string, width: number, o: { size?: number; bold?: boolean; color?: [number, number, number]; lead?: number } = {}) {
    const size = o.size || 10;
    const lead = o.lead || size * 1.4;
    const words = s.split(/\s+/);
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (textWidth(t, size, o.bold) > width && line) {
        this.text(x, y, line, o);
        y += lead;
        line = w;
      } else line = t;
    }
    if (line) {
      this.text(x, y, line, o);
      y += lead;
    }
    return y;
  }
  line(x1: number, y1: number, x2: number, y2: number, color: [number, number, number] = [0.85, 0.85, 0.87], w = 0.8) {
    this.cur += `${color.join(' ')} RG ${w} w ${x1} ${this.H - y1} m ${x2} ${this.H - y2} l S\n`;
  }
  rect(x: number, y: number, w: number, h: number, fill: [number, number, number]) {
    this.cur += `${fill.join(' ')} rg ${x} ${this.H - y - h} ${w} ${h} re f\n`;
  }
  /** The finished file, as ASCII text */
  build(title: string) {
    this.pages.push(this.cur);
    const objs: string[] = [];
    const n = this.pages.length;
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    const kids = this.pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
    objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`;
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    this.pages.forEach((c, i) => {
      objs[5 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
      objs[6 + i * 2] = `<< /Length ${c.length} >>\nstream\n${c}\nendstream`;
    });
    const info = objs.length;
    objs[info] = `<< /Title (${enc(title)}) /Producer (Bandana Planner) >>`;
    let out = '%PDF-1.4\n';
    const offs: number[] = [];
    for (let i = 1; i < objs.length; i++) {
      offs[i] = out.length;
      out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return out;
  }
}
