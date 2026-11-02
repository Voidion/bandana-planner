/* Reads Shopify's orders export (Orders › Export › CSV). One row per line item; the order's details are on its first row. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(r => r.some(x => x.trim()));
}

export interface ShopifyLine {
  name: string;
  qty: number;
  price: number;
}
export interface ShopifyOrder {
  ref: string;
  day: string;
  name: string;
  email: string;
  paid: boolean;
  fulfilled: boolean;
  subtotal: number;
  shipping: number;
  taxes: number;
  discount: number;
  total: number;
  lines: ShopifyLine[];
}

const num = (s: string | undefined) => {
  const n = parseFloat(String(s || '').replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
};

export function parseShopifyOrders(text: string): { orders: ShopifyOrder[]; error?: string } {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) return { orders: [], error: 'That file has no orders in it.' };
  const head = rows[0].map(h => h.trim().toLowerCase());
  const col = (...names: string[]) => names.map(n => head.indexOf(n)).find(i => i >= 0) ?? -1;
  const C = {
    name: col('name'),
    email: col('email'),
    fin: col('financial status'),
    ful: col('fulfillment status'),
    created: col('created at', 'paid at'),
    sub: col('subtotal'),
    ship: col('shipping'),
    tax: col('taxes'),
    total: col('total'),
    disc: col('discount amount'),
    qty: col('lineitem quantity'),
    lname: col('lineitem name'),
    lprice: col('lineitem price'),
    bill: col('billing name'),
    shipName: col('shipping name'),
  };
  if (C.name < 0 || C.lname < 0 || C.qty < 0) return { orders: [], error: 'That doesn’t look like a Shopify orders export. In Shopify, go to Orders › Export and choose CSV for Excel or plain CSV.' };
  const by = new Map<string, ShopifyOrder>();
  for (const r of rows.slice(1)) {
    const ref = (r[C.name] || '').trim();
    if (!ref) continue;
    let o = by.get(ref);
    if (!o) {
      const created = (r[C.created] || '').trim();
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(created);
      o = {
        ref,
        day: m ? `${m[1]}-${m[2]}-${m[3]}` : '',
        name: (r[C.bill] || r[C.shipName] || '').trim(),
        email: (r[C.email] || '').trim(),
        paid: /paid/i.test(r[C.fin] || '') && !/partially|refunded/i.test(r[C.fin] || ''),
        fulfilled: /fulfilled/i.test(r[C.ful] || '') && !/unfulfilled|partial/i.test(r[C.ful] || ''),
        subtotal: num(r[C.sub]),
        shipping: num(r[C.ship]),
        taxes: num(r[C.tax]),
        discount: num(r[C.disc]),
        total: num(r[C.total]),
        lines: [],
      };
      by.set(ref, o);
    }
    const q = Math.round(num(r[C.qty]));
    if (q > 0) o.lines.push({ name: (r[C.lname] || '').trim(), qty: q, price: num(r[C.lprice]) });
  }
  return { orders: [...by.values()].filter(o => o.lines.length) };
}

/** Best guess at which of your sizes or product styles a Shopify line item is, from its name ("Plaid Bandana - Medium") */
export function guessItem(lineName: string, items: { k: string; name: string }[]): string | null {
  const n = lineName.toLowerCase();
  const tail = n.split(/\s[-–\/]\s/).pop() || n;
  const hit = (s: string) => new RegExp(`(^|[^a-z])${s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(tail);
  const sorted = [...items].sort((a, b) => b.name.length - a.name.length);
  return (sorted.find(i => hit(i.name)) || sorted.find(i => hit(i.k)) || null)?.k ?? null;
}
