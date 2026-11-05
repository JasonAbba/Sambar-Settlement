import { orderUnits, type AppData, type Paise } from '../types';

export interface Ranked {
  id: string;
  label: string;
  value: number;
  sub?: string;
}

export interface Insights {
  totalDishes: number;
  avgPerHead: Paise;
  topDish: Ranked | null;
  topSpender: Ranked | null;
  topPayer: Ranked | null;
  topRegular: Ranked | null;
  biggestLunch: { id: string; date: string; total: Paise; people: number } | null;
  biryaniCount: number;
  bigEaterOnce: { userId: string; date: string; amount: Paise } | null;
  spenders: Ranked[];
  regulars: Ranked[];
  payers: Ranked[];
  dishes: Ranked[];
  categories: Ranked[];
  timeline: { id: string; date: string; total: Paise; people: number }[];
}

const top = (xs: Ranked[]) => (xs.length ? xs[0] : null);
const byValue = (a: Ranked, b: Ranked) => b.value - a.value || a.label.localeCompare(b.label);

export function computeInsights(data: AppData): Insights {
  const name = new Map(data.users.map((u) => [u.id, u.name]));
  const menu = new Map(data.menuItems.map((m) => [m.id, m]));
  const userLabel = (id: string) => name.get(id) ?? 'Unknown';

  // Spend per person = their share across all lunches
  const spend = new Map<string, number>();
  const attend = new Map<string, number>();
  let bigEaterOnce: Insights['bigEaterOnce'] = null;
  const lunchDate = new Map(data.lunches.map((l) => [l.id, l.date]));
  for (const s of data.settlements) {
    spend.set(s.userId, (spend.get(s.userId) ?? 0) + s.amountOwed);
    if (!bigEaterOnce || s.foodTotal > bigEaterOnce.amount) {
      bigEaterOnce = { userId: s.userId, date: lunchDate.get(s.lunchRecordId) ?? '', amount: s.foodTotal };
    }
  }
  for (const l of data.lunches) for (const id of l.attendees) attend.set(id, (attend.get(id) ?? 0) + 1);

  const payCount = new Map<string, number>();
  const payAmount = new Map<string, number>();
  for (const l of data.lunches) {
    payCount.set(l.paidByUserId, (payCount.get(l.paidByUserId) ?? 0) + 1);
    payAmount.set(l.paidByUserId, (payAmount.get(l.paidByUserId) ?? 0) + (l.actualBillAmount ?? l.totalAmount));
  }

  const dishQty = new Map<string, number>();
  const catQty = new Map<string, number>();
  let totalDishes = 0;
  let biryaniCount = 0;
  for (const o of data.orders) {
    const key = o.itemNameSnapshot;
    dishQty.set(key, (dishQty.get(key) ?? 0) + orderUnits(o));
    const cat = (o.menuItemId && menu.get(o.menuItemId)?.category) || 'Other';
    catQty.set(cat, (catQty.get(cat) ?? 0) + orderUnits(o));
    totalDishes += orderUnits(o);
    if (/biryani/i.test(o.itemNameSnapshot)) biryaniCount += orderUnits(o);
  }

  const spenders = [...spend].map(([id, v]) => ({ id, label: userLabel(id), value: v, sub: `${attend.get(id) ?? 0} lunches` })).sort(byValue);
  const regulars = [...attend].map(([id, v]) => ({ id, label: userLabel(id), value: v })).sort(byValue);
  const payers = [...payCount]
    .map(([id, v]) => ({ id, label: userLabel(id), value: v, sub: `fronted ₹${Math.round((payAmount.get(id) ?? 0) / 100).toLocaleString('en-IN')}` }))
    .sort(byValue);
  const dishes = [...dishQty].map(([k, v]) => ({ id: k, label: k, value: v })).sort(byValue);
  const categories = [...catQty].map(([k, v]) => ({ id: k, label: k, value: v })).sort(byValue);

  const timeline = [...data.lunches]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((l) => ({ id: l.id, date: l.date, total: l.actualBillAmount ?? l.totalAmount, people: l.attendees.length }));
  const biggest = timeline.reduce<Insights['biggestLunch']>((m, x) => (!m || x.total > m.total ? x : m), null);

  const headCount = data.lunches.reduce((a, l) => a + l.attendees.length, 0);
  const totalSpend = data.lunches.reduce((a, l) => a + l.totalAmount, 0);

  return {
    totalDishes,
    avgPerHead: headCount ? Math.round(totalSpend / headCount) : 0,
    topDish: top(dishes),
    topSpender: top(spenders),
    topPayer: top(payers),
    topRegular: top(regulars),
    biggestLunch: biggest,
    biryaniCount,
    bigEaterOnce: bigEaterOnce && bigEaterOnce.amount > 0 ? bigEaterOnce : null,
    spenders,
    regulars,
    payers,
    dishes,
    categories,
    timeline,
  };
}
