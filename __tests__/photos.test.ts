import { getShop, update } from '../src/state/store';
import { addAlbum, deleteAlbum, editPhotos, live, purgeOld, purgePhotos, recoverPhotos, trashPhotos } from '../src/state/photos';
import { emptyShop } from '../src/state/defaults';
import { addDays, todayDay } from '../src/lib/plan';

const ph = (id: string, extra = {}) => ({ id, src: 'data:,', name: id, added: todayDay(), run: null, fabric: null, cust: null, fav: false, albums: [], note: '', deleted: null, ...extra });

describe('photos', () => {
  beforeEach(() => update(() => ({ ...emptyShop(), photos: [ph('a'), ph('b'), ph('c', { deleted: addDays(todayDay(), -31) })] })));
  it('moves to Recently deleted, recovers, and clears out after 30 days', () => {
    trashPhotos(['a']);
    expect(live(getShop().photos).map(p => p.id)).toEqual(['b']);
    recoverPhotos(['a']);
    expect(live(getShop().photos)).toHaveLength(2);
    purgeOld();
    expect(getShop().photos.map(p => p.id)).toEqual(['a', 'b']);
    purgePhotos(['b']);
    expect(getShop().photos.map(p => p.id)).toEqual(['a']);
  });
  it('albums hold photos; deleting an album keeps the photos', () => {
    const al = addAlbum({ name: 'Riverside order' });
    editPhotos(['a', 'b'], p => ({ albums: [...p.albums, al] }));
    expect(getShop().photos.filter(p => p.albums.includes(al))).toHaveLength(2);
    deleteAlbum(al);
    expect(getShop().photos.filter(p => p.albums.length)).toHaveLength(0);
    expect(getShop().photos).toHaveLength(3);
  });
});
