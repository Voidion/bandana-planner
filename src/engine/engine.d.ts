/* Types for the generated engine (engine.js). Kept loose on purpose: the engine is shared code from the prototype. */
export function setEngineState(state: any): void;
export function cutPlan(qty: Record<string, number>, opt?: { body?: any; strap?: any; fast?: boolean; prod?: any }): any;
export function cutPlan0(qty: Record<string, number>, opt?: any): any;
export function planNeeds(
  qty: Record<string, number>,
  bodyId: string | null,
  tiesId: string | null,
): { body: number; ties: number; same: boolean; learned?: number };
export function grainOf(f: any): any;
export function topOf(f: any): string;
export function strapOf(k: string): any;
export function sizeYd(k: string): { body: number; strap: number } | null;
export function sizeFab(k: string, cost?: number): number;
export function isLow(f: any): boolean;
export function ventMat(): any;
export const VENTURE_MATS: any[];
export const TOPS: any;
export function fabFactor(id: string | null): { k: number };
export function pieceShapes(p: any): { s: string; pts: [number, number][] }[];
export function exportSvg(cp: any, run: any, only?: number): string;
