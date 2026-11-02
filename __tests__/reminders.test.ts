import { getShop, update } from '../src/state/store';
import { addOrder } from '../src/state/selling';
import { reminders, sendReminders } from '../src/state/reminders';
import { emptyShop } from '../src/state/defaults';
import { addDays, todayDay } from '../src/lib/plan';

it('sends a reminder once, after the reminder hour', async () => {
  update(() => emptyShop());
  addOrder({ title: 'Riverside restock', due: addDays(todayDay(), 1), qty: { M: 2 } });
  expect(reminders(getShop()).map(r => r.title)).toContain('An order is due tomorrow');
  const early = new Date();
  early.setHours(6);
  await sendReminders(early);
  expect(Object.keys(getShop().notified)).toHaveLength(0);
  const later = new Date();
  later.setHours(10);
  await sendReminders(later);
  expect(Object.keys(getShop().notified)).toHaveLength(1);
  await sendReminders(later);
  expect(Object.keys(getShop().notified)).toHaveLength(1);
});
