/* The app's view of the cut-plan engine. */
import * as E from '../engine/engine';
import type { CutPlan, Fabric, Shop } from '../state/types';

let lastShop: Shop | null = null;
let engineState: any = null;

/** The engine reads cut plans that were cut as "runs" (it learns real fabric use from them). */
function sync(shop: Shop) {
  if (shop === lastShop) return;
  lastShop = shop;
  engineState = {
    ...shop,
    runs: shop.plans
      .filter(p => p.status === 'cut')
      .map(p => ({ id: p.id, name: p.name, qty: p.qty, status: 'done', cut: true, fabUse: p.fabUse, fabrics: [] })),
    products: [],
    supplies: [],
  };
  E.setEngineState(engineState);
}

export const MATS = E.VENTURE_MATS as { id: string; name: string; mw: number; ml: number; w: number; l: number; sub: string }[];

export function sizeReady(shop: Shop, k: string) {
  const z = shop.sizes[k];
  return !!z && !!z.cw && !!z.cl && z.cw > 0 && z.cl > 0;
}

export function planCount(p: CutPlan) {
  return Object.values(p.qty || {}).reduce((a, b) => a + (b || 0), 0);
}

export interface PlanResult {
  cp: any;
  count: number;
  /** Yards per fabric id this plan needs (bodies, straps, or both when the same fabric) */
  needs: { f: Fabric | null; role: string; yards: number; short: number }[];
  missingSizes: string[];
  tooBig: number;
}

export function computePlan(shop: Shop, plan: CutPlan): PlanResult | null {
  sync(shop);
  const qty: Record<string, number> = {};
  const missing: string[] = [];
  Object.entries(plan.qty || {}).forEach(([k, n]) => {
    if (!n) return;
    if (sizeReady(shop, k)) qty[k] = n;
    else missing.push(k);
  });
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  if (!count) return { cp: null, count: 0, needs: [], missingSizes: missing, tooBig: 0 };
  const body = shop.fabrics.find(f => f.id === plan.body) || null;
  const ties = shop.fabrics.find(f => f.id === plan.ties) || null;
  const cp = E.cutPlan(qty, { body, strap: ties });
  const n = E.planNeeds(qty, plan.body, plan.ties);
  const needs: PlanResult['needs'] = [];
  const add = (f: Fabric | null, role: string, yards: number) =>
    needs.push({ f, role, yards, short: f ? Math.max(0, Math.round((yards - f.yards) * 100) / 100) : 0 });
  if (n.same) add(body, 'Bandanas and straps', n.body);
  else {
    add(body, 'Bandanas', n.body);
    add(ties, 'Straps', n.ties);
  }
  return { cp, count, needs, missingSizes: missing, tooBig: cp.tooBig || 0 };
}

export function pieceShapes(p: any): { s: string; pts: [number, number][] }[] {
  return E.pieceShapes(p);
}

/** One SVG per mat for Cricut Design Space, sized in inches. */
export function cutFiles(shop: Shop, plan: CutPlan, cp: any): { name: string; svg: string }[] {
  sync(shop);
  const run = { name: plan.name || 'Cut plan' };
  const base = (plan.name || 'cut-plan').replace(/[\\/:*?"<>|]+/g, '').trim() || 'cut-plan';
  return cp.mats.map((m: any, i: number) => ({
    name: `${base} - mat ${i + 1} of ${cp.mats.length} (${m.fab === 'strap' ? 'straps' : 'bandanas'}).svg`,
    svg: E.exportSvg(cp, run, i),
  }));
}

export function matWaste(m: any) {
  return m.area ? Math.max(0, 1 - m.pieceArea / m.area) : 0;
}
