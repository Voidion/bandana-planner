/* The app must plan exactly like the prototype: same mats, same piece positions, same yards. */
import * as E from '../src/engine/engine';
const fixture = require('./fixtures/prototype-parity.json');

const snap = (cp: any) => ({
  mats: cp.mats.length,
  yards: cp.yards,
  sy: cp.strapYards,
  waste: cp.waste,
  pieces: cp.mats.map((m: any) => m.pieces.map((p: any) => [p.k, +p.x.toFixed(3), +p.y.toFixed(3), p.kind, p.n || 0])),
});

describe('cut-plan engine matches the prototype', () => {
  E.setEngineState(fixture.state);
  const f = (id: string | null) => fixture.state.fabrics.find((x: any) => x.id === id) || null;
  fixture.cases.forEach(([qty, body, strap]: [Record<string, number>, string, string | null], i: number) => {
    it(`case ${i + 1}: ${JSON.stringify(qty)} on ${body}${strap ? ' / ' + strap : ''}`, () => {
      const cp = E.cutPlan(qty, { body: f(body), strap: f(strap) });
      expect(snap(cp)).toEqual(fixture.res[i]);
    });
  });

  it('keeps every piece inside the Venture cut area', () => {
    const cp = E.cutPlan({ S: 20, M: 20, L: 20 }, { body: f('plaid'), strap: f('plaid') });
    cp.mats.forEach((m: any) =>
      E.pieceShapes !== undefined &&
      m.pieces.forEach((p: any) => E.pieceShapes(p).forEach(sh => sh.pts.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(-1e-6);
        expect(y).toBeGreaterThanOrEqual(-1e-6);
        expect(x).toBeLessThanOrEqual(cp.W + 1e-6);
        expect(y).toBeLessThanOrEqual(cp.L + 1e-6);
      }))),
    );
  });

  it('writes one SVG per mat sized in inches', () => {
    const cp = E.cutPlan({ M: 6 }, { body: f('plaid'), strap: f('plaid') });
    const svg = E.exportSvg(cp, { name: 'Test' }, 0);
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/width="[\d.]+in"/);
    expect((svg.match(/<path /g) || []).length).toBeGreaterThan(0);
  });
});
