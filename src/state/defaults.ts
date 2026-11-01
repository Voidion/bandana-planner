import type { Shop, Size } from './types';

export const SCHEMA_VERSION = 1;

const size = (name: string): Size => ({ name, cw: null, cl: null, strap: 'snap', price: null });

/** A new, empty shop: no fabric, no plans, sizes waiting for their cut measurements. */
export function emptyShop(): Shop {
  return {
    version: SCHEMA_VERSION,
    shopName: 'My shop',
    sizes: {
      XS: size('XS'),
      S: size('Small'),
      M: size('Medium'),
      L: size('Large'),
      XL: size('XL'),
      XXL: size('XXL'),
    },
    straps: [
      { id: 'snap', name: 'Scrunchie', w: 2.5, l: 16 },
      { id: 'tie', name: 'Tie-on ends', w: 2, l: 30 },
      { id: 'loop', name: 'Over-collar loop', w: 3, l: 9 },
    ],
    fabrics: [],
    plans: [],
    cfg: {
      cut: {
        bolt: 44,
        width: 22,
        mat: 'v2428',
        matLen: 27.5,
        buffer: 5,
        gap: 0.25,
        offStraps: false,
        strapTurn: true,
        useScraps: false,
        minScrap: 2,
        bowW: 4,
        bowL: 7,
        bow: 'classic',
      },
      newBolt: { yards: 3, low: 1 },
      learnFab: true,
      fees: {},
    },
    runs: [],
    products: [],
    supplies: [],
  };
}

/** Bring a saved shop up to the current shape. Never throws away the user's data. */
export function migrate(raw: unknown): Shop {
  const base = emptyShop();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<Shop>;
  return {
    ...base,
    ...s,
    version: SCHEMA_VERSION,
    sizes: { ...(s.sizes || base.sizes) },
    straps: Array.isArray(s.straps) && s.straps.length ? s.straps : base.straps,
    fabrics: Array.isArray(s.fabrics) ? s.fabrics : [],
    plans: Array.isArray(s.plans) ? s.plans : [],
    cfg: {
      ...base.cfg,
      ...(s.cfg || {}),
      cut: { ...base.cfg.cut, ...((s.cfg && s.cfg.cut) || {}) },
      newBolt: { ...base.cfg.newBolt, ...((s.cfg && s.cfg.newBolt) || {}) },
    },
    runs: [],
    products: [],
    supplies: [],
  };
}

export const SWATCHES = ['#C27A1A', '#A8322A', '#D9A42B', '#4E6A4A', '#3C5A82', '#6B4A35', '#B5562A', '#8B5A9A', '#2E7D7A', '#5E5E63'];
