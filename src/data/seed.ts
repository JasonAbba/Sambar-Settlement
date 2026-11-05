import type { AdditionalCharge, AppData, MenuItem, User } from '../types';
import { buildLunch, emptyDraft, type DraftLine, type LunchDraft } from '../lib/lunch';
import { nowISO, todayISO } from '../lib/util';

const PEOPLE = [
  'Jason',
  'Sagnik',
  'Hemant',
  'Rithika',
  'Rohit',
  'Johan',
  'Ashwini',
  'Angwyn',
  'Ranjith',
  'Aswin',
  'Sarthak',
];

/**
 * PLACEHOLDER menu. These are NOT the restaurant's verified dishes or prices —
 * everything is editable from the Menu page.
 */
const MENU: [name: string, category: string, rupees: number, art: string][] = [
  ['Chicken Meals', 'Meals', 180, 'meals'],
  ['Mutton Meals', 'Meals', 220, 'meals'],
  ['Fish Meals', 'Meals', 200, 'meals'],
  ['Chicken Biryani', 'Biryani', 220, 'biryani'],
  ['Mutton Biryani', 'Biryani', 280, 'biryani'],
  ['Chicken 65', 'Chicken', 140, 'chicken65'],
  ['Pepper Chicken', 'Chicken', 180, 'pepperchicken'],
  ['Fish Fry', 'Fish', 150, 'fish'],
  ['Egg Omelette', 'Egg', 40, 'omelette'],
  ['Kolumbu Omelette', 'Egg', 60, 'kolumbu'],
  ['Parotta', 'Breads', 30, 'parotta'],
  ['Curd Rice', 'Rice', 80, 'curdrice'],
  ['Lime Soda', 'Drinks', 40, 'drink'],
  // Added in menu v2 (prices are placeholders too)
  ['Veg Meals', 'Meals', 120, 'meals'],
  ['Paneer Biryani', 'Biryani', 200, 'biryani'],
  ['Ghee Rice', 'Rice', 120, 'curdrice'],
  ['Khuska Rice', 'Rice', 130, 'biryani'],
  ['White Rice', 'Rice', 50, 'curdrice'],
  ['Grill Chicken', 'Chicken', 250, 'pepperchicken'],
  ['Chicken Chettinad', 'Chicken', 200, 'mutton'],
  ['Boneless Chicken Tawa Fry', 'Chicken', 220, 'pepperchicken'],
  ['Chicken Kebab (Half)', 'Starters', 160, 'chicken65'],
  ['Chicken Kebab (Full)', 'Starters', 300, 'chicken65'],
  ['Mutton Chops', 'Mutton', 280, 'mutton'],
  ['Mutton Nalli', 'Mutton', 300, 'mutton'],
  ['Boiled Egg', 'Egg', 20, 'omelette'],
  ['Chapati', 'Breads', 25, 'parotta'],
  ['Diet Coke', 'Drinks', 40, 'drink'],
  ['Coke Zero', 'Drinks', 40, 'drink'],
  ['Sprite Zero', 'Drinks', 40, 'drink'],
  ['Goli Soda', 'Drinks', 25, 'drink'],
  // Added in menu v4
  ['Butter Chicken', 'Chicken', 120, 'mutton'],
];

/** Bump when seed menu items are added, so existing browsers receive them once. */
export const MENU_SEED_VERSION = 4;

/**
 * Adds seed menu items that an existing dataset doesn't have yet (matched by
 * id or name). Runs once per MENU_SEED_VERSION, so dishes a user deliberately
 * deleted afterwards are not resurrected.
 */
export function migrateMenu(data: AppData): AppData | null {
  const from = data.menuSeedVersion ?? 1;
  if (from >= MENU_SEED_VERSION) return null;
  let items = data.menuItems;
  // v3: the single "Chicken Kebab" became Half / Full variants. Past lunches keep their snapshots.
  if (from < 3) {
    items = items.map((m) => (m.name.toLowerCase() === 'chicken kebab' ? { ...m, name: 'Chicken Kebab (Half)' } : m));
  }
  const haveIds = new Set(items.map((m) => m.id));
  const haveNames = new Set(items.map((m) => m.name.toLowerCase()));
  const missing = seedMenu().filter((m) => !haveIds.has(m.id) && !haveNames.has(m.name.toLowerCase()));
  return { ...data, menuItems: [...items, ...missing], menuSeedVersion: MENU_SEED_VERSION };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function seedUsers(): User[] {
  const created = nowISO();
  return PEOPLE.map((name) => ({ id: `u-${slug(name)}`, name, isActive: true, createdAt: created }));
}

export function seedMenu(): MenuItem[] {
  const created = nowISO();
  return MENU.map(([name, category, rupees, art]) => ({
    id: `m-${slug(name)}`,
    name,
    image: `art:${art}`,
    category,
    price: rupees * 100,
    isAvailable: true,
    createdAt: created,
  }));
}

/** Builds the full demo dataset: people, placeholder menu and three sample lunches. */
export function createDemoData(): AppData {
  const users = seedUsers();
  const menuItems = seedMenu();
  const menu = new Map(menuItems.map((m) => [m.name, m]));
  const u = (name: string) => `u-${slug(name)}`;

  let n = 0;
  const line = (itemName: string, quantity = 1): DraftLine => {
    const m = menu.get(itemName)!;
    return { key: `demo-ln-${n++}`, menuItemId: m.id, name: m.name, unitPrice: m.price, quantity };
  };
  const charge = (id: string, kind: AdditionalCharge['kind'], label: string, rupees: number, allocation: AdditionalCharge['allocation'] = 'equal'): AdditionalCharge => ({
    id,
    kind,
    label,
    amount: rupees * 100,
    allocation,
  });

  const drafts: { id: string; draft: LunchDraft; billDelta: number; paidBy: string[] }[] = [
    {
      id: 'demo-lunch-1',
      billDelta: 0,
      paidBy: ['Sagnik', 'Hemant'],
      draft: {
        ...emptyDraft(),
        date: todayISO(-6),
        paidByUserId: u('Jason'),
        attendees: [u('Jason'), u('Sagnik'), u('Hemant')],
        orders: {
          [u('Jason')]: [line('Chicken Meals'), line('Lime Soda')],
          [u('Sagnik')]: [line('Mutton Meals'), line('Chicken 65')],
          [u('Hemant')]: [line('Chicken Meals'), line('Curd Rice')],
        },
        charges: [charge('demo-c-1', 'parcel', 'Parcel charges', 30)],
      },
    },
    {
      id: 'demo-lunch-2',
      billDelta: 0,
      paidBy: ['Rohit'],
      draft: {
        ...emptyDraft(),
        date: todayISO(-3),
        paidByUserId: u('Rithika'),
        attendees: [u('Rithika'), u('Rohit'), u('Johan'), u('Ashwini'), u('Angwyn')],
        orders: {
          [u('Rithika')]: [line('Fish Meals'), line('Fish Fry')],
          [u('Rohit')]: [line('Chicken Biryani'), line('Egg Omelette')],
          [u('Johan')]: [line('Mutton Biryani'), line('Lime Soda')],
          [u('Ashwini')]: [line('Curd Rice'), line('Kolumbu Omelette')],
          [u('Angwyn')]: [line('Parotta', 3), line('Pepper Chicken')],
        },
        charges: [charge('demo-c-2', 'discount', 'Regulars discount', -50, 'proportional')],
      },
    },
    {
      id: 'demo-lunch-3',
      billDelta: 20,
      paidBy: [],
      draft: {
        ...emptyDraft(),
        date: todayISO(-1),
        paidByUserId: u('Ranjith'),
        attendees: [u('Jason'), u('Sagnik'), u('Ranjith'), u('Aswin'), u('Sarthak')],
        orders: {
          [u('Jason')]: [line('Mutton Biryani')],
          [u('Sagnik')]: [line('Chicken Meals'), line('Fish Fry')],
          [u('Ranjith')]: [line('Chicken Biryani'), line('Chicken 65')],
          [u('Aswin')]: [line('Parotta', 2), line('Pepper Chicken'), line('Lime Soda')],
          [u('Sarthak')]: [line('Mutton Meals')],
        },
        charges: [],
      },
    },
  ];

  const data: AppData = { version: 1, menuSeedVersion: MENU_SEED_VERSION, users, menuItems, lunches: [], orders: [], settlements: [] };
  for (const { id, draft, billDelta, paidBy } of drafts) {
    const preview = buildLunch(draft, null, undefined, { id, isDemo: true });
    const bill = preview.record.totalAmount + billDelta * 100;
    const built = buildLunch(draft, bill, undefined, { id, isDemo: true });
    const paidIds = new Set(paidBy.map(u));
    built.settlements = built.settlements.map((s) =>
      paidIds.has(s.userId) ? { ...s, amountPaid: s.amountOwed, status: 'paid', settledAt: nowISO() } : s,
    );
    data.lunches.push(built.record);
    data.orders.push(...built.orders);
    data.settlements.push(...built.settlements);
  }
  return data;
}
