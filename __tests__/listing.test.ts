import { addFabric, editRun, finishRun, getShop, planRun, update } from '../src/state/store';
import { emptyShop } from '../src/state/defaults';
import { listingCsv, listingFor } from '../src/lib/plan';

it('writes a Shopify listing and product CSV from a finished run', () => {
  update(() => {
    const s = emptyShop();
    s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
    s.sizes.L = { ...s.sizes.L, cw: 14, cl: 9, price: 22, mins: 41 };
    return s;
  });
  const f = addFabric({ name: 'Harvest plaid flannel', yards: 9 });
  const id = planRun({ body: f, ties: f });
  editRun(id, { qty: { ...getShop().runs[0].qty, M: 4, L: 2 } });
  finishRun(id);
  const r = getShop().runs[0];
  const l = listingFor(getShop(), r);
  expect(l.title.toLowerCase()).toContain('harvest plaid');
  expect(l.desc.length).toBeGreaterThan(60);
  const { csv, name } = listingCsv(getShop(), r);
  expect(name).toMatch(/^shopify-product-.*\.csv$/);
  expect(csv.split('\n')[0]).toContain('Handle');
  expect(csv).toContain('Medium');
  expect(csv).toContain('22');
});
