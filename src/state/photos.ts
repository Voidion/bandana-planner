/* Photos: a library on this computer, linked to runs, fabric and customers, with albums and Recently Deleted. */
import { addDays, rel, todayDay } from '../lib/plan';
import { deletePhotoFile, pickPhotos } from './storage';
import { getShop, newId, update, withLog } from './store';
import type { Album, Photo } from './types';

/** Opens the picker and adds what you choose, linked to whatever you're looking at. Returns the new ids. */
export async function addPhotos(link: Partial<Pick<Photo, 'run' | 'fabric' | 'cust'>> & { album?: string } = {}): Promise<string[]> {
  const got = await pickPhotos();
  if (!got.length) return [];
  const ids = got.map(() => newId('ph'));
  update(s =>
    withLog(
      {
        ...s,
        photos: [
          ...got.map((g, i) => ({ id: ids[i], src: g.src, name: g.name, added: todayDay(), run: link.run || null, fabric: link.fabric || null, cust: link.cust || null, fav: false, albums: link.album ? [link.album] : [], note: '', deleted: null })),
          ...s.photos,
        ],
      },
      `added ${got.length} photo${got.length === 1 ? '' : 's'}`,
      '',
    ),
  );
  return ids;
}

export const editPhoto = (id: string, p: Partial<Photo>) => update(s => ({ ...s, photos: s.photos.map(x => (x.id === id ? { ...x, ...p } : x)) }));
export const editPhotos = (ids: string[], fn: (p: Photo) => Partial<Photo>) => update(s => ({ ...s, photos: s.photos.map(x => (ids.includes(x.id) ? { ...x, ...fn(x) } : x)) }));

/** To Recently Deleted (kept 30 days) */
export const trashPhotos = (ids: string[]) => editPhotos(ids, () => ({ deleted: todayDay() }));
export const recoverPhotos = (ids: string[]) => editPhotos(ids, () => ({ deleted: null }));
/** Gone for good: the files are removed too */
export function purgePhotos(ids: string[]) {
  const s = getShop();
  s.photos.filter(p => ids.includes(p.id)).forEach(p => deletePhotoFile(p.src));
  update(x => ({ ...x, photos: x.photos.filter(p => !ids.includes(p.id)), albums: x.albums.map(a => (a.cover && ids.includes(a.cover) ? { ...a, cover: null } : a)) }));
}
/** Run at start-up: anything in Recently Deleted for 30 days is removed. */
export function purgeOld() {
  const old = getShop().photos.filter(p => p.deleted && (rel(addDays(p.deleted, 30)) ?? 1) <= 0).map(p => p.id);
  if (old.length) purgePhotos(old);
}

export function addAlbum(p: Partial<Album> = {}): string {
  const id = newId('al');
  update(s => ({ ...s, albums: [...s.albums, { name: 'New album', cust: null, cover: null, ...p, id }] }));
  return id;
}
export const editAlbum = (id: string, p: Partial<Album>) => update(s => ({ ...s, albums: s.albums.map(a => (a.id === id ? { ...a, ...p } : a)) }));
export function deleteAlbum(id: string) {
  update(s => ({ ...s, albums: s.albums.filter(a => a.id !== id), photos: s.photos.map(p => (p.albums.includes(id) ? { ...p, albums: p.albums.filter(x => x !== id) } : p)) }));
}
export const live = (ps: Photo[]) => ps.filter(p => !p.deleted);
