import type { Run, Shop, Size, Template } from './types';

export const SCHEMA_VERSION = 2;

const size = (name: string): Size => ({ name, cw: null, cl: null, strap: 'snap', price: null, mins: null });

/** The prototype's standard steps, in minutes per bandana */
export const STEP_RATE: [string, number][] = [
  ['Cut day', 3.8],
  ['Press & fold', 3.4],
  ['Body sewing', 16.5],
  ['Topstitch', 8.3],
  ['Tags & finish', 4.4],
  ['Photograph & list', 3.3],
];

export const defaultTemplates = (): Template[] => [
  { id: 'std', name: 'Standard bandana', steps: STEP_RATE.map(([n, r]) => ({ n, r })) },
];

/** A new, empty shop: no fabric, no runs, sizes waiting for their cut measurements. */
export function emptyShop(): Shop {
  return {
    version: SCHEMA_VERSION,
    shopName: 'My shop',
    laborRate: 25,
    sizes: {
      XS: size('XS'),
      S: size('Small'),
      M: size('Medium'),
      L: size('Large'),
      XL: size('XL'),
      XXL: size('XXL'),
    },
    straps: [
      { id: 'snap', name: 'Scrunchie', w: 2.5, l: 16, mins: 5, mat: 0.35 },
      { id: 'tie', name: 'Tie-on ends', w: 2, l: 30, mins: 4, mat: 0.25 },
      { id: 'loop', name: 'Over-collar loop', w: 3, l: 9, mins: 3, mat: 0.15 },
    ],
    fabrics: [],
    runs: [],
    templates: defaultTemplates(),
    sessions: [],
    stock: [],
    defectLog: [],
    timer: null,
    activity: [],
    bills: [],
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
      fees: { on: true, rate: 2.9, flat: 0.3, perOrder: 2 },
      hours: [0, 1.5, 2, 1.5, 2, 2, 3],
      defTpl: 'std',
      staleMins: 240,
      margin: 75,
      piecesPerMonth: 80,
      untracked: 0,
      round: 0.5,
      payLabor: false,
      ship: { threshold: 50, charge: 4.5, cost: 5.2 },
      theme: 'system',
      quote: { email: '', phone: '', insta: '', site: '', pay: '', notes: ['Every bandana is cut and sewn by hand, so pattern placement varies a little from piece to piece.'], holdDays: 30 },
    },
    suppliers: [],
    supplies: [],
    customers: [],
    sales: [],
    orders: [],
    quotes: [],
    bundles: [],
    market: { open: false, name: '', booth: 0, goal: 30, pay: 'Card', tally: [], openedAt: null, last: null },
    usage: [],
    cal: [],
    photos: [],
    albums: [],
    tools: [
      { id: 'blade', name: 'Rotary blade', kind: 'blade', uses: 0, life: 400, since: new Date().toISOString().slice(0, 10), notes: 'Counted in mats cut', log: [] },
      { id: 'mat', name: 'Cutting mat', kind: 'mat', uses: 0, life: 250, since: new Date().toISOString().slice(0, 10), notes: 'Counted in mats loaded', log: [] },
    ],
    goals: { income: 1000, hours: 40 },
    products: [],
  };
}

const arr = <T,>(v: unknown, fallback: T[] = []): T[] => (Array.isArray(v) ? (v as T[]) : fallback);

/** Version 1 kept cut plans; each one becomes a run (a cut plan was a draft, a cut one is in progress). */
function planToRun(p: any, s: Shop): Run {
  const qty: Record<string, number> = {};
  Object.entries(p.qty || {}).forEach(([k, n]) => {
    if (n) qty[k] = n as number;
  });
  const cut = p.status === 'cut';
  return {
    id: p.id,
    name: p.name || '',
    status: cut ? 'active' : 'draft',
    qty,
    body: p.body ?? null,
    ties: p.ties ?? null,
    fabrics: cut ? (p.fabUse || []).map((u: any) => ({ f: u.f, role: u.role || 'Fabric', need: u.plan })) : [],
    tpl: s.cfg.defTpl,
    steps: [],
    due: null,
    created: p.created || new Date().toISOString().slice(0, 10),
    cut,
    cutAt: p.cutAt || null,
    fabUse: (p.fabUse || []).map((u: any) => ({ ...u, cost: u.cost ?? (s.fabrics.find(f => f.id === u.f) || { cost: 0 }).cost })),
    finishedAt: null,
    defects: 0,
    notes: p.notes || '',
  };
}

/** Bring a saved shop up to the current shape. Never throws away the user's data. */
export function migrate(raw: unknown): Shop {
  const base = emptyShop();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as any;
  const cfg = s.cfg || {};
  const out: Shop = {
    ...base,
    ...s,
    version: SCHEMA_VERSION,
    laborRate: typeof s.laborRate === 'number' ? s.laborRate : base.laborRate,
    sizes: Object.fromEntries(Object.entries(s.sizes || base.sizes).map(([k, z]: [string, any]) => [k, { ...size(k), ...z }])),
    straps: arr(s.straps).length ? arr<any>(s.straps).map(x => ({ ...(base.straps.find(b => b.id === x.id) || { mins: 0, mat: 0 }), ...x })) : base.straps,
    fabrics: arr(s.fabrics),
    runs: arr(s.runs),
    templates: arr(s.templates).length ? arr(s.templates) : base.templates,
    sessions: arr(s.sessions),
    stock: arr(s.stock),
    defectLog: arr(s.defectLog),
    timer: s.timer && s.timer.run ? s.timer : null,
    activity: arr(s.activity),
    bills: arr(s.bills),
    cfg: {
      ...base.cfg,
      ...cfg,
      cut: { ...base.cfg.cut, ...(cfg.cut || {}) },
      newBolt: { ...base.cfg.newBolt, ...(cfg.newBolt || {}) },
      fees: { ...base.cfg.fees, ...(cfg.fees && typeof cfg.fees.rate === 'number' ? cfg.fees : {}) },
      ship: { ...base.cfg.ship, ...(cfg.ship || {}) },
      quote: { ...base.cfg.quote, ...(cfg.quote && typeof cfg.quote.email === 'string' ? cfg.quote : {}) },
      hours: Array.isArray(cfg.hours) && cfg.hours.length === 7 ? cfg.hours : base.cfg.hours,
    },
    suppliers: arr(s.suppliers),
    supplies: arr<any>(s.supplies).map(x => ({ unit: '', qty: 0, low: 0, cost: 0, use: 'none', per: 1, sup: null, url: '', onOrder: 0, ...x })),
    usage: arr(s.usage),
    customers: arr<any>(s.customers).map(c => ({ dogs: [], ...c })),
    sales: arr(s.sales),
    orders: arr(s.orders),
    quotes: arr(s.quotes),
    cal: arr(s.cal),
    photos: arr(s.photos),
    albums: arr(s.albums),
    tools: Array.isArray(s.tools) ? s.tools : base.tools,
    goals: { ...base.goals, ...(s.goals || {}) },
    market: { ...base.market, ...(s.market && Array.isArray(s.market.tally) ? s.market : {}) },
    bundles: arr(s.bundles),
    products: arr(s.products),
  };
  // Version 1 kept "where you buy it" as text on each fabric: those become suppliers.
  out.fabrics.forEach(f => {
    const name = (f.supplier || '').trim();
    if (f.sup || !name) return;
    let sp = out.suppliers.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!sp) {
      const site = /^(https?:\/\/|www\.)/i.test(name) ? name : '';
      sp = { id: 'sp' + Math.random().toString(36).slice(2, 8), name: site ? name.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '') : name, site, lead: 7, ship: '', notes: '' };
      out.suppliers.push(sp);
    }
    f.sup = sp.id;
  });
  if (!out.templates.some(t => t.id === out.cfg.defTpl)) out.cfg.defTpl = out.templates[0].id;
  if (Array.isArray(s.plans) && s.plans.length) {
    const have = new Set(out.runs.map(r => r.id));
    out.runs = [...out.runs, ...s.plans.filter((p: any) => !have.has(p.id)).map((p: any) => planToRun(p, out))];
  }
  delete (out as any).plans;
  return out;
}

export const SWATCHES = ['#C27A1A', '#A8322A', '#D9A42B', '#4E6A4A', '#3C5A82', '#6B4A35', '#B5562A', '#8B5A9A', '#2E7D7A', '#5E5E63'];
