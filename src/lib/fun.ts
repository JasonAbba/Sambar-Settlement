import { orderUnits, type AppData, type LunchOrder, type MenuItem } from '../types';
import { formatINR } from './money';
import { formatDate, todayISO } from './util';

/* ---------------- WhatsApp share text ---------------- */

export function lunchShareText(data: AppData, lunchId: string, link?: string): string {
  const lunch = data.lunches.find((l) => l.id === lunchId);
  if (!lunch) return '';
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? 'Someone';
  const payer = name(lunch.paidByUserId);
  const orders = data.orders.filter((o) => o.lunchRecordId === lunch.id);
  const shares = data.settlements.filter((s) => s.lunchRecordId === lunch.id);
  const dishes = (uid: string) =>
    orders
      .filter((o) => o.userId === uid)
      .map((o) => (o.quantity > 1 ? `${o.itemNameSnapshot} ×${o.quantity}` : o.itemNameSnapshot) + (o.shareUserIds && o.shareUserIds.length > 1 ? ` (shared ÷${o.shareUserIds.length})` : ''))
      .join(', ') || 'no dishes';

  const lines = [`🍛 *Sambar Settlement* · ${formatDate(lunch.date)}`, `*${payer}* paid ${formatINR(lunch.actualBillAmount ?? lunch.totalAmount)}`, ''];
  const others = lunch.attendees.filter((id) => id !== lunch.paidByUserId);
  if (others.length) {
    lines.push(`Please pay *${payer}*:`);
    for (const id of others) {
      const s = shares.find((x) => x.userId === id);
      lines.push(`• ${name(id)}: *${formatINR(s?.amountOwed ?? 0)}* (${dishes(id)})`);
    }
  }
  const own = shares.find((s) => s.userId === lunch.paidByUserId);
  if (own) lines.push('', `${payer}'s own share: ${formatINR(own.amountOwed)} (${dishes(lunch.paidByUserId)})`);
  if (lunch.additionalCharges.length) {
    lines.push('', 'Extras: ' + lunch.additionalCharges.map((c) => `${c.label} ${formatINR(c.amount, { signed: true })}`).join(', '));
  }
  lines.push('', `*Total: ${formatINR(lunch.totalAmount)}*`);
  if (link) lines.push(link);
  return lines.join('\n');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/* ---------------- Badges ---------------- */

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

const NONVEG = /chicken|mutton|fish|egg|omelette|kebab|nalli|chops|prawn|kozhi|meat/i;

function dishCategory(o: LunchOrder, menu: Map<string, MenuItem>): string {
  return (o.menuItemId && menu.get(o.menuItemId)?.category) || '';
}

/**
 * Badges go to the leader of each category (ties share it). Thresholds keep
 * them meaningful: you have to have actually done the thing.
 */
export function computeBadges(data: AppData): Map<string, Badge[]> {
  const menu = new Map(data.menuItems.map((m) => [m.id, m]));
  const counters: Record<string, Map<string, number>> = {};
  const bump = (key: string, user: string, by = 1) => {
    const m = (counters[key] ??= new Map());
    m.set(user, (m.get(user) ?? 0) + by);
  };

  for (const o of data.orders) {
    const name = o.itemNameSnapshot;
    const cat = dishCategory(o, menu);
    if (/chicken/i.test(name) || cat === 'Chicken') bump('chicken', o.userId, orderUnits(o));
    if (/mutton|nalli|chops/i.test(name) || cat === 'Mutton') bump('mutton', o.userId, orderUnits(o));
    if (/biryani/i.test(name) || cat === 'Biryani') bump('biryani', o.userId, orderUnits(o));
    if (/fish/i.test(name) || cat === 'Fish') bump('fish', o.userId, orderUnits(o));
    if (/curd rice/i.test(name)) bump('curd', o.userId, orderUnits(o));
    if (cat === 'Drinks' || /soda|coke|sprite|juice|lassi/i.test(name)) bump('drinks', o.userId, orderUnits(o));
    if (/parotta|chapati/i.test(name)) bump('bread', o.userId, orderUnits(o));
  }

  // Per-lunch facts
  const lunchesSorted = [...data.lunches].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const foodPerLunch = new Map<string, number[]>();
  for (const s of data.settlements) foodPerLunch.set(s.userId, [...(foodPerLunch.get(s.userId) ?? []), s.foodTotal]);
  for (const l of data.lunches) {
    bump('payer', l.paidByUserId);
    for (const id of l.attendees) {
      bump('regular', id);
      const mine = data.orders.filter((o) => o.lunchRecordId === l.id && o.userId === id);
      if (mine.length && mine.every((o) => !NONVEG.test(o.itemNameSnapshot))) bump('veg', id);
    }
  }
  for (const [id, xs] of foodPerLunch) if (xs.length) counters.appetite = (counters.appetite ?? new Map()).set(id, Math.round(xs.reduce((a, b) => a + b, 0) / xs.length));

  const defs: (Badge & { key: string; min: number })[] = [
    { key: 'payer', min: 2, id: 'bank', emoji: '💸', label: 'Bank of the Gang', description: 'Paid the bill most often' },
    { key: 'regular', min: 2, id: 'regular', emoji: '📅', label: 'Never Misses', description: 'Came to the most lunches' },
    { key: 'appetite', min: 1, id: 'appetite', emoji: '🔥', label: 'Big Appetite', description: 'Highest average food bill per lunch' },
    { key: 'chicken', min: 2, id: 'chicken', emoji: '🍗', label: 'Chicken Monster', description: 'Most chicken dishes ordered' },
    { key: 'mutton', min: 2, id: 'mutton', emoji: '🐐', label: 'Mutton Master', description: 'Most mutton dishes ordered' },
    { key: 'biryani', min: 2, id: 'biryani', emoji: '🍛', label: 'Biryani Boss', description: 'Most biryanis ordered' },
    { key: 'fish', min: 2, id: 'fish', emoji: '🐟', label: 'Fish Fanatic', description: 'Most fish dishes ordered' },
    { key: 'curd', min: 1, id: 'curd', emoji: '🥛', label: 'Curd Rice Loyalist', description: 'Most curd rice ordered' },
    { key: 'drinks', min: 2, id: 'drinks', emoji: '🥤', label: 'Soda Sipper', description: 'Most drinks ordered' },
    { key: 'bread', min: 3, id: 'bread', emoji: '🫓', label: 'Parotta Pro', description: 'Most parottas & chapatis' },
    { key: 'veg', min: 1, id: 'veg', emoji: '🥬', label: 'Green Leaf', description: 'Most all-veg lunches' },
  ];

  const out = new Map<string, Badge[]>();
  const give = (user: string, b: Badge) => out.set(user, [...(out.get(user) ?? []), b]);
  for (const d of defs) {
    const m = counters[d.key];
    if (!m || m.size === 0) continue;
    const max = Math.max(...m.values());
    if (max < d.min) continue;
    const leaders = [...m].filter(([, v]) => v === max).map(([u]) => u);
    if (leaders.length > 3) continue; // a 5-way tie isn't a badge
    for (const u of leaders) give(u, { id: d.id, emoji: d.emoji, label: d.label, description: d.description });
  }

  // On a roll: came to each of the last 3 lunches
  const last3 = lunchesSorted.slice(-3);
  if (last3.length === 3) {
    for (const u of data.users) {
      if (last3.every((l) => l.attendees.includes(u.id))) {
        give(u.id, { id: 'streak', emoji: '⚡', label: 'On a Roll', description: 'At each of the last 3 lunches' });
      }
    }
  }
  return out;
}

/* ---------------- Lunch buddies ---------------- */

export interface Buddy {
  a: string;
  b: string;
  count: number;
}

export function lunchBuddies(data: AppData, limit = 5): Buddy[] {
  const pairs = new Map<string, number>();
  for (const l of data.lunches) {
    const ids = [...l.attendees].sort();
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const k = `${ids[i]}|${ids[j]}`;
        pairs.set(k, (pairs.get(k) ?? 0) + 1);
      }
  }
  return [...pairs]
    .map(([k, count]) => {
      const [a, b] = k.split('|');
      return { a, b, count };
    })
    .filter((p) => p.count >= 2)
    .sort((x, y) => y.count - x.count || x.a.localeCompare(y.a) || x.b.localeCompare(y.b))
    .slice(0, limit);
}

/* ---------------- Dish of the week ---------------- */

export interface DishOfWeek {
  name: string;
  menuItem: MenuItem | null;
  qty: number;
  topFan: { userId: string; qty: number } | null;
  lunches: number;
}

/** Most ordered dish in lunches from the last 7 days (falls back to all-time if none). */
export function dishOfTheWeek(data: AppData): { dish: DishOfWeek | null; window: 'week' | 'all' } {
  const since = todayISO(-6);
  let window: 'week' | 'all' = 'week';
  let ids = new Set(data.lunches.filter((l) => l.date >= since).map((l) => l.id));
  if (ids.size === 0) {
    ids = new Set(data.lunches.map((l) => l.id));
    window = 'all';
  }
  const qty = new Map<string, number>();
  const fans = new Map<string, Map<string, number>>();
  const inLunches = new Map<string, Set<string>>();
  for (const o of data.orders) {
    if (!ids.has(o.lunchRecordId)) continue;
    const k = o.itemNameSnapshot;
    qty.set(k, (qty.get(k) ?? 0) + orderUnits(o));
    const f = fans.get(k) ?? new Map();
    f.set(o.userId, (f.get(o.userId) ?? 0) + orderUnits(o));
    fans.set(k, f);
    inLunches.set(k, (inLunches.get(k) ?? new Set()).add(o.lunchRecordId));
  }
  if (qty.size === 0) return { dish: null, window };
  const [name, q] = [...qty].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const fanEntries = [...(fans.get(name) ?? new Map())].sort((a, b) => b[1] - a[1]);
  const topFan = fanEntries.length && (fanEntries.length === 1 || fanEntries[0][1] > fanEntries[1][1]) ? { userId: fanEntries[0][0], qty: fanEntries[0][1] } : null;
  return {
    dish: {
      name,
      menuItem: data.menuItems.find((m) => m.name === name) ?? null,
      qty: q,
      topFan,
      lunches: inLunches.get(name)?.size ?? 0,
    },
    window,
  };
}

/** A menu dish nobody has ordered in 3 weeks (or ever), rotating daily. */
export function forgottenDish(data: AppData): { item: MenuItem; never: boolean } | null {
  const since = todayISO(-20);
  const recentIds = new Set(data.lunches.filter((l) => l.date >= since).map((l) => l.id));
  const recentNames = new Set(data.orders.filter((o) => recentIds.has(o.lunchRecordId)).map((o) => o.itemNameSnapshot));
  const everNames = new Set(data.orders.map((o) => o.itemNameSnapshot));
  const candidates = data.menuItems.filter((m) => m.isAvailable && !recentNames.has(m.name) && m.category !== 'Drinks');
  if (!candidates.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  const item = candidates[day % candidates.length];
  return { item, never: !everNames.has(item.name) };
}
