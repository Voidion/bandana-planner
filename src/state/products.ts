/* Bows and other products made from fabric: styles (variants) with a cut size or cut file, and add-on parts. */
import { change as update, newId } from './store';
import type { Product, ProductPart, ProductVariant } from './types';

export function addProduct(): string {
  const id = newId('pr');
  update(s => {
    const first = !s.products.length;
    const p: Product = {
      id,
      name: first ? 'Bows' : 'New product',
      one: first ? 'bow' : 'item',
      varLabel: 'Style',
      partLabel: 'Attachment',
      steps: first ? [{ n: 'Prep & press', r: 1 }, { n: 'Sewing', r: 2.5 }, { n: 'Finish', r: 0.5 }] : [{ n: 'Make', r: 1 }],
      parts: [],
      variants: [{ id: newId('pv'), pid: id, name: first ? 'Classic bow' : 'Standard', price: null, w: first ? 4 : 6, l: first ? 7 : 6, pieces: 1, mins: first ? 4 : 10, notions: first ? 0.15 : 0, part: null }],
    };
    return { ...s, products: [...s.products, p] };
  });
  return id;
}

const mapP = (id: string, fn: (p: Product) => Product) => update(s => ({ ...s, products: s.products.map(p => (p.id === id ? fn(p) : p)) }));

export const editProduct = (id: string, patch: Partial<Product>) => mapP(id, p => ({ ...p, ...patch }));

export function deleteProduct(id: string) {
  update(s => ({ ...s, products: s.products.filter(p => p.id !== id) }));
}
export function restoreProduct(p: Product, index: number) {
  update(s => {
    const list = s.products.slice();
    list.splice(Math.min(index, list.length), 0, p);
    return { ...s, products: list };
  });
}

export function addVariant(pid: string): string {
  const id = newId('pv');
  mapP(pid, p => {
    const last = p.variants[p.variants.length - 1];
    return { ...p, variants: [...p.variants, { id, pid, name: 'New style', price: last?.price ?? null, w: last?.w ?? 4, l: last?.l ?? 7, pieces: last?.pieces ?? 1, mins: last?.mins ?? 5, notions: last?.notions ?? 0, part: last?.part ?? null }] };
  });
  return id;
}
export const editVariant = (pid: string, id: string, patch: Partial<ProductVariant>) => mapP(pid, p => ({ ...p, variants: p.variants.map(v => (v.id === id ? { ...v, ...patch } : v)) }));
export const deleteVariant = (pid: string, id: string) => mapP(pid, p => ({ ...p, variants: p.variants.filter(v => v.id !== id) }));

export function addPart(pid: string): string {
  const id = newId('pp');
  mapP(pid, p => ({ ...p, parts: [...p.parts, { id, name: 'New part', w: 1.5, l: 5, pieces: 1, mins: 1, notions: 0 }] }));
  return id;
}
export const editPart = (pid: string, id: string, patch: Partial<ProductPart>) => mapP(pid, p => ({ ...p, parts: p.parts.map(x => (x.id === id ? { ...x, ...patch } : x)) }));
export const deletePart = (pid: string, id: string) =>
  mapP(pid, p => ({ ...p, parts: p.parts.filter(x => x.id !== id), variants: p.variants.map(v => (v.part === id ? { ...v, part: null } : v)) }));
