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
  /** Supplier id from Shop.suppliers */
  sup?: string | null;
  /** Days from ordering to arriving (overrides the supplier's) */
  lead?: number | null;
  /** For an offcut: what it was left over from */
  from?: string;
}

/** Something else you make from fabric, like bows. Each style is a variant; a part is an add-on piece (a loop, a clip). */
export interface ProductPart {
  id: string;
  name: string;
  /** Cut width and length, inches */
  w: number;
  l: number;
  pieces: number;
  mins: number;
  notions: number;
  file?: CutFile | null;
}
export interface ProductVariant {
  id: string;
  pid: string;
  name: string;
  price: number | null;
  w: number;
  l: number;
  /** Fabric pieces for one */
  pieces: number;
  /** Minutes to make one */
  mins: number;
  /** Notions for one, dollars */
  notions: number;
  part: string | null;
  file?: CutFile | null;
}
export interface Product {
  id: string;
  name: string;
  /** One of them, for counts: "bow" */
  one: string;
  varLabel: string;
  partLabel: string;
  /** Steps with their share of the time */
  steps: { n: string; r: number }[];
  parts: ProductPart[];
  variants: ProductVariant[];
}

export interface Dog {
  id: string;
  name: string;
  breed: string;
  /** Neck, inches */
  neck: number | null;
  size: SizeKey | null;
  notes: string;
}

export type CustomerKind = 'Person' | 'Shop' | 'Consignment' | 'Shopify' | 'Custom';
export interface Customer {
  id: string;
  name: string;
  kind: CustomerKind;
  contact: string;
  email: string;
  phone: string;
  handle: string;
  dogs: Dog[];
  notes: string;
  added: Day;
}

export type Channel = 'Market' | 'Direct' | 'Wholesale' | 'Shopify';
/** A sale, in the prototype's ledger shape so Reports, Tax and Trends read it unchanged */
export interface Sale {
  id: string;
  day: Day;
  ch: Channel;
  ref: string;
  cust?: string;
  run?: string;
  order?: string;
  what: string;
  /** What sold, per size or product style */
  items: Record<string, number>;
  /** Price of the goods after discounts */
  sub: number;
  ship: number;
  tax: number;
  fees: number;
  /** Materials for what sold */
  mat: number;
  refund: number;
  /** Paid so far */
  paid: number;
  pays: { day: Day; amt: number }[];
  /** When the rest is due (pay later) */
  due?: Day;
  /** Taken out of finished stock (Undo puts it back) */
  from: StockLine[];
  sup?: { id: string; name: string; n: number }[];
  /** Other costs of the sale (a market's booth fee) */
  costs?: number;
}

export type OrderStatus = 'new' | 'delivered';
export interface Order {
  id: string;
  cust: string | null;
  title: string;
  /** Where it came from: "Email from Dana", "Shopify #1042", "From quote Q-1040" */
  src: string;
  qty: Record<string, number>;
  due: Day | null;
  fab: string | null;
  /** The run making it */
  run: string | null;
  /** Set aside from finished stock */
  fromStock: StockLine[];
  status: OrderStatus;
  deliveredAt: Day | null;
  /** Agreed price for the whole order (otherwise your prices) */
  price: number | null;
  notes: string;
  quote?: string;
}

export interface QuoteLine {
  size: string;
  qty: number;
  /** Agreed price each; null follows your current price until it's sent */
  price: number | null;
}
export interface Quote {
  id: string;
  no: string;
  cust: string | null;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  made: Day;
  sent: Day | null;
  acc: Day | null;
  /** Price holds until */
  until: Day;
  lines: QuoteLine[];
  /** none, b2g1half, spend150, or bundle:<id> */
  deal: string;
  /** Deposit to start, percent */
  deposit: number;
  pickup: boolean;
  notes: string;
  order: string | null;
}

export interface MarketTap {
  k: string;
  price: number;
  pay: 'Card' | 'Cash';
  t: number;
}
export interface MarketDay {
  open: boolean;
  name: string;
  booth: number;
  goal: number;
  pay: 'Card' | 'Cash';
  tally: MarketTap[];
  openedAt: number | null;
  last?: { name: string; sale: string; n: number; total: number; day: Day } | null;
}

export interface CalEvent {
  id: string;
  day: Day;
  title: string;
  /** market and off take the day's free hours out of run planning */
  kind: 'market' | 'off' | 'other';
  days: number;
  notes: string;
}

export interface Photo {
  id: string;
  /** file:///… in the app's photos folder (or a data URL in the browser preview) */
  src: string;
  name: string;
  added: Day;
  run: string | null;
  fabric: string | null;
  cust: string | null;
  fav: boolean;
  albums: string[];
  note: string;
  /** In Recently Deleted since this day; removed for good after 30 days */
  deleted: Day | null;
}
export interface Album {
  id: string;
  name: string;
  /** A client album: photos of their order, ready to save and send */
  cust: string | null;
  cover: string | null;
}

export interface Tool {
  id: string;
  name: string;
  kind: 'blade' | 'mat' | 'machine' | 'other';
  /** Cuts (blades), mats loaded (mats) or hours sewn (machines) since it was last replaced or serviced */
  uses: number;
  /** Replace or service after this many */
  life: number;
  since: Day;
  notes: string;
  log: { day: Day; text: string }[];
}

export interface Bundle {
  id: string;
  name: string;
  items: Record<string, number>;
  price: number;
  on: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  site: string;
  /** Usual days from ordering to arriving */
  lead: number;
  /** Shipping, in your words ("Free over $75") */
  ship: string;
  notes: string;
}

/** Tags, mailers, elastic, snaps… anything you keep a count of */
export interface Supply {
  id: string;
  name: string;
  /** What you count it in: tags, yards, sets */
  unit: string;
  qty: number;
  low: number;
  /** Cost for one unit, dollars */
  cost: number;
  /** Taken automatically: per bandana when a run finishes, per order when it's sent, or never */
  use: 'bandana' | 'order' | 'item' | 'none';
  /** How many each time it's used */
  per: number;
  sup: string | null;
  url: string;
  onOrder: number;
}

/** Yards taken off the shelf, for how fast each fabric gets used */
export interface UsageLine {
  f: string;
  yd: number;
  day: Day;
  run: string | null;
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
  /** Other products per variant id */
  prod?: Record<string, number>;
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
  /** Supplies taken when it finished */
  supUse?: { id: string; name: string; unit: string; n: number }[];
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
    /** Free shipping over `threshold`; otherwise charge `charge`. `cost` is what a label costs you. */
    ship: { threshold: number; charge: number; cost: number };
    /** Light, dark, or follow Windows */
    theme: 'system' | 'light' | 'dark';
    /** Windows notifications for reminders */
    remind: { on: boolean; hour: number; orders: boolean; payments: boolean; restock: boolean; timer: boolean; tools: boolean; quotes: boolean };
    /** What every quote says: how to reach you, how to pay, and your notes */
    quote: { email: string; phone: string; insta: string; site: string; pay: string; notes: string[]; holdDays: number };
  };
  suppliers: Supplier[];
  supplies: Supply[];
  customers: Customer[];
  sales: Sale[];
  orders: Order[];
  quotes: Quote[];
  bundles: Bundle[];
  market: MarketDay;
  cal: CalEvent[];
  tools: Tool[];
  photos: Photo[];
  albums: Album[];
  /** Reminders already sent (key → day), so each is sent once */
  notified: Record<string, Day>;
  goals: { income: number; hours: number };
  usage: UsageLine[];
  products: Product[];
}
