import { getShop, update, addFabric, planRun, editRun, startRun } from '../src/state/store';
import { emptyShop } from '../src/state/defaults';
import { alertsNow, alertsSnoozed, dismissAlert, snoozeAlert, snoozeUntil, unseenCount, markSeen, undismissAlert } from '../src/state/alerts';
import { addDays, todayDay } from '../src/lib/plan';

beforeEach(() =>
  update(() => {
    const s = emptyShop();
    s.sizes.M = { ...s.sizes.M, cw: 11, cl: 8, price: 18, mins: 33 };
    return s;
  }),
);

it('lists a late run and low fabric, worst first', () => {
  const f = addFabric({ name: 'Rust gingham', yards: 0.5, cost: 8, low: 1 } as any);
  const r = planRun({ name: 'Harvest plaid', body: f, ties: f, qty: { M: 4 } as any });
  editRun(r, { due: addDays(todayDay(), -2) });
  startRun(r);
  const L = alertsNow(getShop());
  expect(L[0].t).toBe('Harvest plaid is 2 days late');
  expect(L.some(a => a.t === 'Rust gingham is low')).toBe(true);
});

it('dismisses, snoozes and marks as seen', () => {
  addFabric({ name: 'Rust gingham', yards: 0.5, cost: 8, low: 1 } as any);
  const a = alertsNow(getShop())[0];
  expect(unseenCount(getShop())).toBe(1);
  markSeen();
  expect(unseenCount(getShop())).toBe(0);
  dismissAlert(a.id);
  expect(alertsNow(getShop())).toHaveLength(0);
  undismissAlert(a.id);
  snoozeAlert(a.id, snoozeUntil('tom'));
  expect(alertsNow(getShop())).toHaveLength(0);
  expect(alertsSnoozed(getShop())).toHaveLength(1);
});

it('respects reminder types you turned off', () => {
  addFabric({ name: 'Rust gingham', yards: 0.5, cost: 8, low: 1 } as any);
  update(s => ({ ...s, cfg: { ...s.cfg, remind: { ...s.cfg.remind, restock: false } } }));
  expect(alertsNow(getShop())).toHaveLength(0);
});
