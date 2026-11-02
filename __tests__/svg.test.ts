/* The app reads cut files without a browser. These match what the prototype's browser tracer measured for the same files
   (scalloped.svg differs on purpose: the prototype also traced a shape hidden in <defs>, which Design Space doesn't cut). */
import { parseCutFile } from '../src/lib/svg';
const cases: [string, string][] = require('./fixtures/svg-cases.json');
const proto: Record<string, { w: number; h: number; polys: number; area: number }> = {
  'bandana-in.svg': { w: 11, h: 8, polys: 1, area: 45.2657 },
  'mm-rect.svg': { w: 3.937, h: 1.969, polys: 1, area: 2.7776 },
  'px-noviewbox.svg': { w: 10, h: 5, polys: 2, area: 19.3178 },
};

describe('cut files', () => {
  for (const [name, text] of cases) {
    const want = proto[name];
    if (!want) continue;
    it(`traces ${name} like the prototype`, () => {
      const f = parseCutFile(text, name) as any;
      expect(f.err).toBeUndefined();
      expect(f.w).toBeCloseTo(want.w, 3);
      expect(f.h).toBeCloseTo(want.h, 3);
      expect(f.outline).toHaveLength(want.polys);
      expect(Math.abs(f.area - want.area) / want.area).toBeLessThan(0.005);
    });
  }
  it('ignores shapes hidden in defs', () => {
    const f = parseCutFile(cases.find(c => c[0] === 'scalloped.svg')![1], 'x') as any;
    expect(f.outline).toHaveLength(2);
    expect(f.area).toBeLessThan(70);
  });
  it('explains files it cannot use', () => {
    expect(parseCutFile('<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>', 'a')).toEqual({ err: 'size' });
    expect(parseCutFile('<svg width="2in" height="2in"></svg>', 'a')).toEqual({ err: 'empty' });
    expect(parseCutFile('hello', 'a')).toEqual({ err: 'read' });
  });
});
