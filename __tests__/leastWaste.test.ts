import { emptyShop } from '../src/state/defaults';
import { cutExact, leastWasteWidth } from '../src/lib/plan';
test('least waste finds a width inside the mat', () => {
  const s: any = emptyShop();
  s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8 };
  s.sizes.L = { ...s.sizes.L, cw: 14, cl: 10 };
  const b = leastWasteWidth(s);
  expect(b).not.toBeNull();
  expect(b!.w).toBeGreaterThanOrEqual(6);
  expect(b!.wst).toBeGreaterThan(0);
  expect(b!.wst).toBeLessThan(1);
  expect(cutExact(s).every(w => (s.cfg.cut.bolt / w) % 1 === 0)).toBe(true);
});
