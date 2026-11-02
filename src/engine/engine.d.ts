/* Types for the generated engine (engine.js). Kept loose on purpose: the engine is shared code from the prototype. */
export function setEngineState(state: any): void;
export function cutPlan(qty: Record<string, number>, opt?: { body?: any; strap?: any; fast?: boolean; prod?: any }): any;
export function cutPlan0(qty: Record<string, number>, opt?: any): any;
export function planNeeds(
  qty: Record<string, number>,
  bodyId: string | null,
  tiesId: string | null,
  prod?: Record<string, number>,
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
export function setUid(n: number): void;
export function setToday(d: Date): void;
/* Runs and production */
export function pieces(r: any): number;
export function doneN(r: any): number;
export function runMins(r: any): number;
export function leftMins(r: any): number;
export function atList(r: any): number;
export function mats(r: any): number;
export function rate(r: any): number;
export function runProfit(r: any): number;
export function avgEach(): number;
export function effRate(): number;
export function unitMins(k: string): number | null;
export function unitMat(k: string): number | null;
export function unitCost(k: string): number;
export function pcsEq(qty: Record<string, number>): number;
export function tplMins(id: string, qty: Record<string, number>): number;
export function stepsFor(id: string, qty: Record<string, number>): { id: string; name: string; est: number; source: 'template'; done: boolean }[];
export function runSteps(id: string, qty: Record<string, number>, prod?: any): { id: string; name: string; est: number; source: 'template'; done: boolean }[];
export function tplOf(id: string): any;
export function defTpl(): any;
export function tplTotal(t: any): number;
export function paceStats(): { n: number; stepMed: Record<string, number | null>; perShop: number };
export function fabCostOf(r: any): number;
export function overheadEach(): number;
export function feeEach(price: number): number;
export function laborF(): number;
export function priceFor(k: string, margin: number): number;
export function marginOf(k: string): number | null;
export function IT(k: string): any;
export function tEl(t: any): number;
export function isStale(t: any): boolean;
export function isSewStep(n: string): boolean;
/* Selling */
export function feeFor(ch: string, amt: number): number;
export function matFor(items: Record<string, number>): number;
export function eTotal(e: any): number;
export function eOwed(e: any): number;
export function eNet(e: any): number;
export function eProfit(e: any): number;
export function eUnits(e: any): number;
export function sums(list: any[]): any;
export function perList(per: string): any[];
export function profitEach(): number;
export function qtotals(q: any): any;
export function monthlyBills(): number;
/* Planning and numbers */
export function scheduleWork(days?: number): { cap: number[]; used: number[]; finish: Record<string, number | null> };
export function lateRuns(sc: any): any[];
export function freeMins(d: number): number;
export function monthIncome(): number;
export function repAgg(list: any[], key: string): { k: string; sales: number; profit: number; units: number }[];
export function perMonths(per: string): number;
