import { describe, expect, it } from 'vitest';
import { allocate, computeSplit } from './split';
import { formatINR, parseRupees, paiseToInput } from './money';
import { buildLunch, emptyDraft, pairBalances, personBalances, type LunchDraft } from './lunch';
import { createDemoData } from '../data/seed';
import type { AdditionalCharge, AppData } from '../types';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('money', () => {
  it('parses rupee strings into integer paise without float error', () => {
    expect(parseRupees('180')).toBe(18000);
    expect(parseRupees('180.5')).toBe(18050);
    expect(parseRupees('0.29')).toBe(29);
    expect(parseRupees('1,234.56')).toBe(123456);
    expect(parseRupees('₹ 99.99')).toBe(9999);
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('12.345')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
  });
  it('formats INR with Indian grouping', () => {
    expect(formatINR(18000)).toBe('₹180');
    expect(formatINR(123456)).toBe('₹1,234.56');
    expect(formatINR(12345678900)).toBe('₹12,34,56,789');
    expect(formatINR(-5000)).toBe('−₹50');
    expect(formatINR(1000, { signed: true })).toBe('+₹10');
  });
  it('round-trips input strings', () => {
    expect(paiseToInput(18050)).toBe('180.50');
    expect(paiseToInput(18000)).toBe('180');
    expect(paiseToInput(null)).toBe('');
  });
});

describe('allocate', () => {
  it('splits equally with deterministic remainder to earliest people', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(allocate(1001, [1, 1, 1])).toEqual([334, 334, 333]);
  });
  it('splits proportionally using largest remainder and always sums exactly', () => {
    const parts = allocate(3000, [21000, 34000, 26000]);
    expect(sum(parts)).toBe(3000);
    expect(parts).toEqual([778, 1259, 963]);
  });
  it('handles negative amounts (discounts)', () => {
    const parts = allocate(-5000, [1, 1, 1]);
    expect(parts).toEqual([-1667, -1667, -1666]);
    expect(sum(parts)).toBe(-5000);
  });
  it('falls back to equal when all weights are zero', () => {
    expect(allocate(100, [0, 0])).toEqual([50, 50]);
  });
  it('sums exactly for many random cases', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let t = 0; t < 2000; t++) {
      const n = 1 + Math.floor(rnd() * 11);
      const weights = Array.from({ length: n }, () => Math.floor(rnd() * 50000));
      const amount = Math.floor(rnd() * 200000) - 50000;
      expect(sum(allocate(amount, weights))).toBe(amount);
    }
  });
});

describe('computeSplit', () => {
  it('matches the spec example (Jason / Sagnik / Hemant)', () => {
    const charges: AdditionalCharge[] = [{ id: 'c', kind: 'parcel', label: 'Parcel', amount: 3000, allocation: 'equal' }];
    const res = computeSplit(['j', 's', 'h'], { j: 21000, s: 34000, h: 26000 }, charges);
    expect(res.rows.map((r) => r.finalShare)).toEqual([22000, 35000, 27000]);
    expect(res.total).toBe(84000);
    expect(sum(res.rows.map((r) => r.finalShare))).toBe(res.total);
  });
  it('never divides food equally — each pays only what they ordered', () => {
    const res = computeSplit(['a', 'b'], { a: 10000, b: 30000 }, []);
    expect(res.rows.map((r) => r.finalShare)).toEqual([10000, 30000]);
  });
});

describe('buildLunch / settlements', () => {
  const draft: LunchDraft = {
    ...emptyDraft(),
    date: '2026-11-03',
    paidByUserId: 'j',
    attendees: ['j', 's', 'h'],
    orders: {
      j: [{ key: '1', menuItemId: 'm1', name: 'Chicken Meals', unitPrice: 18000, quantity: 1 }],
      s: [{ key: '2', menuItemId: 'm2', name: 'Mutton Meals', unitPrice: 22000, quantity: 2 }],
      h: [{ key: '3', menuItemId: null, name: 'Curd Rice', unitPrice: 8000, quantity: 1 }],
    },
  };

  it('marks the payer as settled and others pending', () => {
    const b = buildLunch(draft, null);
    const by = Object.fromEntries(b.settlements.map((s) => [s.userId, s]));
    expect(by.j.status).toBe('paid');
    expect(by.j.isPayer).toBe(true);
    expect(by.s.status).toBe('pending');
    expect(by.s.amountOwed).toBe(44000);
    expect(b.record.totalAmount).toBe(70000);
    expect(b.orders.find((o) => o.userId === 's')!.totalPrice).toBe(44000);
  });

  it('preserves payments on edit and re-derives status when the amount changes', () => {
    const first = buildLunch(draft, null);
    const paid = first.settlements.map((s) => (s.userId === 's' ? { ...s, amountPaid: s.amountOwed, status: 'paid' as const } : s));
    const edited: LunchDraft = { ...draft, orders: { ...draft.orders, s: [{ ...draft.orders.s[0], quantity: 3 }] } };
    const second = buildLunch(edited, null, { record: first.record, settlements: paid });
    const s = second.settlements.find((x) => x.userId === 's')!;
    expect(s.amountOwed).toBe(66000);
    expect(s.amountPaid).toBe(44000);
    expect(s.status).toBe('pending');
  });

  it('resets the old payer when the payer changes', () => {
    const first = buildLunch(draft, null);
    const second = buildLunch({ ...draft, paidByUserId: 's' }, null, { record: first.record, settlements: first.settlements });
    const j = second.settlements.find((x) => x.userId === 'j')!;
    expect(j.isPayer).toBe(false);
    expect(j.amountPaid).toBe(0);
    expect(j.status).toBe('pending');
  });
});

describe('demo data & balances', () => {
  const data: AppData = createDemoData();
  it('has 11 people, 13 menu items, 3 demo lunches', () => {
    expect(data.users).toHaveLength(11);
    expect(data.menuItems).toHaveLength(13);
    expect(data.lunches).toHaveLength(3);
    expect(data.lunches.every((l) => l.isDemo)).toBe(true);
  });
  it('every lunch: shares sum to total', () => {
    for (const l of data.lunches) {
      const shares = data.settlements.filter((s) => s.lunchRecordId === l.id).map((s) => s.amountOwed);
      expect(sum(shares)).toBe(l.totalAmount);
    }
  });
  it('balances net to zero across the group', () => {
    expect(sum(personBalances(data).map((b) => b.net))).toBe(0);
    const pairs = pairBalances(data);
    expect(pairs.length).toBeGreaterThan(0);
  });
});
