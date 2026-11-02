/* What a quote says to the customer, used by both the in-app client view and the PDF. */
import { dayLabel, money } from './format';
import { itemName, quoteTotals } from './plan';
import { Pdf } from './pdf';
import type { Quote, Shop } from '../state/types';

export function quoteDoc(shop: Shop, q: Quote) {
  const t = quoteTotals(shop, q);
  const c = shop.customers.find(x => x.id === q.cust);
  const Q = shop.cfg.quote;
  const who = c ? c.name : 'you';
  const isVar = (k: string) => !shop.sizes[k];
  const lines = (t.lines as any[]).map(l => ({ name: isVar(l.size) ? itemName(shop, l.size) : itemName(shop, l.size) + ' bandana', qty: l.qty, each: l.unit, amount: l.gross }));
  const dep = q.deposit ? (t.grand * q.deposit) / 100 : 0;
  const contacts = [Q.email && ['Email', Q.email], Q.phone && ['Phone', Q.phone], Q.insta && ['Instagram', '@' + Q.insta.replace(/^@/, '')], Q.site && ['Web', Q.site.replace(/^https?:\/\//, '').replace(/\/$/, '')]].filter(Boolean) as [string, string][];
  const reach = contacts.filter(([n]) => n !== 'Web').slice(0, 2).map(([n, v]) => `${n === 'Instagram' ? 'message' : n === 'Phone' ? 'text' : 'email'} ${v}`).join(' or ');
  const accepted = q.status === 'accepted';
  const steps = [
    accepted ? `You accepted this quote on ${dayLabel(q.acc, { month: 'long', day: 'numeric' })}` : `Reply to accept this quote by ${dayLabel(q.until, { month: 'long', day: 'numeric' })}${reach ? ': ' + reach.replace(/^./, x => x.toUpperCase()) : ''}`,
    q.deposit ? `Pay the ${q.deposit}% deposit of ${money(dep)}${Q.pay ? '. ' + Q.pay : ''}` : '',
    q.pickup ? 'We make your order by hand and let you know when it’s ready to pick up' : 'We make your order by hand and ship it to you',
  ].filter(Boolean);
  return {
    shop: shop.shopName || 'My shop',
    no: q.no,
    date: dayLabel(q.made, { month: 'long', day: 'numeric', year: 'numeric' }),
    title: q.title || `Quote for ${who}`,
    forWho: c ? c.name : '',
    attn: c && c.contact ? c.contact : '',
    email: c ? c.email : '',
    lines,
    gross: t.gross,
    disc: t.disc,
    dname: t.dname,
    ship: q.pickup ? 'No charge' : t.ship ? money(t.ship) : 'Free',
    shipLabel: q.pickup ? 'Pickup' : 'Shipping',
    total: t.grand,
    deposit: q.deposit,
    dep,
    until: accepted ? `Accepted ${dayLabel(q.acc, { month: 'long', day: 'numeric', year: 'numeric' })}` : `Price holds until ${dayLabel(q.until, { month: 'long', day: 'numeric', year: 'numeric' })}`,
    steps,
    notes: [...Q.notes.map(s => s.trim()).filter(Boolean), ...(q.notes.trim() ? [q.notes.trim()] : []), 'All prices are in US dollars.'],
    contacts,
  };
}

export function quotePdf(shop: Shop, q: Quote): string {
  const d = quoteDoc(shop, q);
  const p = new Pdf();
  const L = 54,
    Rt = 558,
    accent: [number, number, number] = [0.541, 0.294, 0.047],
    mute: [number, number, number] = [0.37, 0.37, 0.39];
  p.rect(L, 48, 40, 40, accent);
  p.text(L + 20, 75, (d.shop.trim()[0] || 'S').toUpperCase(), { size: 20, bold: true, color: [1, 1, 1], align: 'center' });
  p.text(L + 52, 64, d.shop, { size: 14, bold: true });
  p.text(L + 52, 80, 'Handmade dog bandanas', { size: 10, color: mute });
  p.text(Rt, 64, `Quote ${d.no}`, { size: 12, bold: true, align: 'right' });
  p.text(Rt, 80, d.date, { size: 10, color: mute, align: 'right' });
  let y = 130;
  p.text(L, y, d.title, { size: 20, bold: true });
  y += 22;
  if (d.forWho && d.title !== `Quote for ${d.forWho}`) {
    p.text(L, y, `For ${d.forWho}`, { size: 11, bold: true });
    y += 15;
  }
  if (d.attn) (p.text(L, y, `Attn: ${d.attn}`, { size: 10, color: mute }), (y += 14));
  if (d.email) (p.text(L, y, d.email, { size: 10, color: mute }), (y += 14));
  y += 14;
  // table
  const cQ = 380,
    cE = 470,
    cA = Rt;
  p.text(L, y, 'Item', { size: 9, bold: true, color: mute });
  p.text(cQ, y, 'Qty', { size: 9, bold: true, color: mute, align: 'right' });
  p.text(cE, y, 'Each', { size: 9, bold: true, color: mute, align: 'right' });
  p.text(cA, y, 'Amount', { size: 9, bold: true, color: mute, align: 'right' });
  y += 8;
  p.line(L, y, Rt, y);
  for (const l of d.lines) {
    y += 20;
    if (y > 700) {
      p.addPage();
      y = 70;
    }
    p.text(L, y, l.name, { size: 11 });
    p.text(cQ, y, String(l.qty), { size: 11, align: 'right' });
    p.text(cE, y, money(l.each), { size: 11, align: 'right' });
    p.text(cA, y, money(l.amount), { size: 11, align: 'right' });
    y += 8;
    p.line(L, y, Rt, y, [0.92, 0.92, 0.93]);
  }
  y += 26;
  // totals on the right, validity on the left
  const tx = 360;
  const row = (a: string, b: string, o: { bold?: boolean; color?: [number, number, number]; size?: number } = {}) => {
    p.text(tx, y, a, { size: o.size || 11, bold: o.bold, color: o.color });
    p.text(Rt, y, b, { size: o.size || 11, bold: o.bold, color: o.color, align: 'right' });
    y += (o.size || 11) + 8;
  };
  const vy = y;
  p.rect(L, vy - 14, 250, 48, [0.996, 0.945, 0.886]);
  p.text(L + 12, vy + 4, d.until, { size: 11, bold: true });
  p.text(L + 12, vy + 20, q.status === 'accepted' ? 'Prices are locked' : 'Ask us for an updated quote after that', { size: 9, color: mute });
  if (d.disc) {
    row('Subtotal', money(d.gross));
    row(d.dname, '–' + money(d.disc), { color: [0.08, 0.42, 0.18] });
  }
  row(d.shipLabel, d.ship);
  p.line(tx, y - 4, Rt, y - 4);
  y += 16;
  row('Total', money(d.total), { bold: true, size: 15 });
  if (d.deposit) {
    row(`Deposit to start (${d.deposit}%)`, money(d.dep), { bold: true });
    row('Balance on delivery', money(d.total - d.dep));
  }
  y = Math.max(y, vy + 60) + 16;
  p.text(L, y, 'What happens next', { size: 12, bold: true });
  y += 18;
  d.steps.forEach((s, i) => {
    p.text(L, y, `${i + 1}.`, { size: 10, bold: true, color: accent });
    y = p.para(L + 16, y, s, Rt - L - 16, { size: 10 }) + 2;
  });
  y += 10;
  p.text(L, y, 'Good to know', { size: 12, bold: true });
  y += 18;
  d.notes.forEach(n => {
    p.text(L, y, '•', { size: 10, color: mute });
    y = p.para(L + 12, y, n, Rt - L - 12, { size: 10, color: mute }) + 2;
  });
  if (d.contacts.length) {
    p.line(L, 742, Rt, 742);
    p.text(L, 758, d.contacts.map(([n, v]) => `${n}: ${v}`).join('    '), { size: 9, color: mute });
  }
  return p.build(`Quote ${d.no} for ${d.forWho || d.shop}`);
}
