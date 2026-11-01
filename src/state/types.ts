/* The shop as stored on this computer. Field names match the prototype so the cut-plan engine can read it unchanged. */

export type SizeKey = string;

export interface Size {
  name: string;
  /** Wide (neck) edge of the bandana triangle, inches */
  cw: number | null;
  /** Tip length of the triangle, inches */
  cl: number | null;
  /** Strap style id from Shop.straps */
  strap: string;
  price: number | null;
}

export interface Strap {
  id: string;
  name: string;
  /** Cut width, inches */
  w: number;
  /** Cut length, inches */
  l: number;
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
  plan: number;
  used: number;
}

export interface CutPlan {
  id: string;
  name: string;
  /** Bandanas per size */
  qty: Record<SizeKey, number>;
  body: string | null;
  ties: string | null;
  status: 'planning' | 'cut';
  created: string;
  cutAt: string | null;
  /** Yards taken off the shelf when it was cut (so Undo can put them back) */
  fabUse: FabricUse[];
  notes: string;
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
  sizes: Record<SizeKey, Size>;
  straps: Strap[];
  fabrics: Fabric[];
  plans: CutPlan[];
  cfg: {
    cut: CutSettings;
    newBolt: { yards: number; low: number };
    learnFab: boolean;
    fees: Record<string, number>;
  };
  /** Engine compatibility: the engine reads runs/products/supplies */
  runs: unknown[];
  products: unknown[];
  supplies: unknown[];
}
