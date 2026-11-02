import type { CutFile } from '../lib/svg';

/* The shop as stored on this computer. Field names match the prototype so the shared engine can read it unchanged.
   Dates are stored as real calendar days (YYYY-MM-DD); src/lib/engineState.ts turns them into the prototype's "days from today". */

export type SizeKey = string;
/** A calendar day, YYYY-MM-DD */
export type Day = string;

export interface Size {
  name: string;
  /** Wide (neck) edge of the bandana triangle, inches */
  cw: number | null;
  /** Tip length of the triangle, inches */
  cl: number | null;
  /** Strap style id from Shop.straps */
  strap: string;
  /** Your price for one, dollars */
  price: number | null;
  /** Minutes to make one, start to finish (straps add their own minutes) */
  mins: number | null;
  /** Thread, tags and other bits for one, dollars */
  notions?: number | null;
  /** Your own cut file for this size: pieces are nested by its real outline */
  file?: CutFile | null;
  /** A strap cut just for this size (overrides the strap style's size or file) */
  strapCut?: { w?: number; l?: number; file?: CutFile | null };
}

export interface Strap {
  id: string;
  name: string;
  /** Cut width, inches */
  w: number;
  /** Cut length, inches */
  l: number;
  /** Extra minutes per bandana for this strap */
  mins?: number;
  /** Notions per strap (elastic, snaps), dollars */
  mat?: number;
  /** Your own cut file for this strap */
  file?: CutFile | null;
}

export type PrintTop = 'up' | 'down' | 'left' | 'right';

export interface Fabric {
  id: string;
  name: string;
  /** Yards on the shelf */
  yards: number;
  /** Warn in Fabric when the shelf drops to this many yards */
  low: number;
  /** Cost per yard, dollars */
  cost: number;
  /** 'directional' when the print has a right way up */
  grain: 'none' | 'directional';
  /** Where the top of the print faces on the bolt (directional prints only) */
  top: PrintTop;
  /** 'one' = print only reads one way; 'two' = reads either way up */
  way: 'one' | 'two';
  supplier: string;
  notes: string;
  /** Swatch colour shown in lists */
  color: string;
  added: string;
  /** Prototype compatibility */
  onOrder: number;
  offcut?: boolean;
}

export interface FabricUse {
  f: string;
  name: string;
  role?: string;
  plan: number;
  used: number;
  /** Cost per yard when it was cut */
  cost?: number;
}

/** A fabric a run needs, frozen when the run is cut */
export interface RunFabric {
  f: string;
  role: string;
  need: number;
  learned?: number;
}

export interface Step {
  id: string;
  name: string;
  /** Planned minutes for the whole run */
  est: number;
  done: boolean;
  /** Minutes it really took (timed or entered) */
  actual?: number;
  /** Typed in by hand, so estimates ignore it */
  entered?: boolean;
  /** Recorded by the timer */
  recorded?: boolean;
  /** Finished without a time */
  untimed?: boolean;
  source: 'template' | 'learned' | 'actual';
  note?: string;
}

export type RunStatus = 'draft' | 'active' | 'done';

/** A run: a batch of bandanas from one fabric, from planning and cutting to finished stock */
export interface Run {
  id: string;
  name: string;
  status: RunStatus;
  /** Bandanas per size */
  qty: Record<SizeKey, number>;
  body: string | null;
  ties: string | null;
  /** What it needs from the shelf (kept up to date while it's a draft, frozen once cut) */
  fabrics: RunFabric[];
  /** Workflow template it started from */
  tpl: string;
  steps: Step[];
  /** You changed the steps by hand, so changing sizes won't rebuild them */
  stepsEdited?: boolean;
  due: Day | null;
  created: Day;
  cut: boolean;
  cutAt: Day | null;
  /** Yards really taken off the shelf when it was cut */
  fabUse: FabricUse[];
  finishedAt: Day | null;
  defects: number;
  notes: string;
}

export interface TemplateStep {
  /** Step name */
  n: string;
  /** Minutes per bandana */
  r: number;
}

export interface Template {
  id: string;
  name: string;
  steps: TemplateStep[];
}

/** One timed step, used to learn your real pace */
export interface Session {
  who: string;
  step: string;
  pcs: number;
  mins: number;
  day: Day;
  hour: number;
}

export interface StockLine {
  /** Run id, or 'adj' for counts added by hand */
  run: string;
  size: SizeKey;
  n: number;
}

export interface DefectRec {
  id: string;
  day: Day;
  run: string | null;
  kind: string;
  step: string | null;
  n: number;
  size: SizeKey | null;
  fate: 'fix' | 'toss' | 'keep';
  /** Taken out of finished stock (so Undo can put it back) */
  removed: StockLine[];
}

export interface Timer {
  run: string;
  step: string;
  /** When it last started or resumed (ms) */
  start: number;
  /** Time counted before the last pause (ms) */
  acc: number;
  paused: boolean;
  /** You said it's still going at this time (ms) */
  checked?: number;
}

export interface Activity {
  who: string;
  text: string;
  sub: string;
  t: number;
}

export interface Bill {
  id: string;
  name: string;
  amt: number;
  basis: 'month' | 'year';
}

export interface CutSettings {
  /** Usable bolt width across, inches */
  bolt: number;
  /** Strip width cut from the bolt for one mat, inches */
  width: number;
  /** Cricut mat id: v2428 (24 x 28) or v1224 (24 x 12) */
  mat: string;
  /** Usable cut length on the mat, inches */
  matLen: number;
  /** Extra fabric to allow, percent */
  buffer: number;
  /** Space left between pieces for the blade, inches */
  gap: number;
  offStraps: boolean;
  strapTurn: boolean;
  useScraps: boolean;
  minScrap: number;
  bowW: number;
  bowL: number;
  bow: string;
}

export interface Shop {
  version: number;
  shopName: string;
  /** Your hourly target, dollars (used when time counts as a cost) */
  laborRate: number;
  sizes: Record<SizeKey, Size>;
  straps: Strap[];
  fabrics: Fabric[];
  runs: Run[];
  templates: Template[];
  sessions: Session[];
  stock: StockLine[];
  defectLog: DefectRec[];
  timer: Timer | null;
  activity: Activity[];
  bills: Bill[];
  cfg: {
    cut: CutSettings;
    newBolt: { yards: number; low: number };
    learnFab: boolean;
    fees: { on: boolean; rate: number; flat: number; perOrder: number };
    /** Free hours each day, Sunday first */
    hours: number[];
    /** Template new runs start from */
    defTpl: string;
    /** Ask about a timer after this many minutes */
    staleMins: number;
    /** Profit target, percent of the price */
    margin: number;
    /** Bandanas made in a usual month (spreads monthly bills) */
    piecesPerMonth: number;
    /** Percent of time that isn't timed (setup, breaks) */
    untracked: number;
    /** Round suggested prices up to this step, dollars */
    round: number;
    /** Count your time as a cost (off: time isn't a cost) */
    payLabor: boolean;
  };
  /** Engine compatibility: read by the shared engine, filled in later stages */
  products: unknown[];
  supplies: unknown[];
}
