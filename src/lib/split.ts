import type { AdditionalCharge, ChargeAllocation, Paise } from '../types';

/**
 * Split an integer amount of paise across weights using the largest-remainder
 * method. Pure integer arithmetic; the result always sums exactly to `amount`.
 *
 * Deterministic tie-breaking: leftover paise go to the largest fractional
 * remainders first, and to the earliest index when remainders are equal.
 * Negative amounts (discounts) are split by absolute value, then negated.
 * If all weights are zero, it falls back to an equal split.
 */
export function allocate(amount: Paise, weights: number[]): Paise[] {
  const n = weights.length;
  if (n === 0) return [];
  if (amount === 0) return weights.map(() => 0);
  if (amount < 0) return allocate(-amount, weights).map((v) => (v === 0 ? 0 : -v));

  let w = weights.map((x) => Math.max(0, Math.round(x)));
  let total = w.reduce((a, b) => a + b, 0);
  if (total === 0) {
    w = w.map(() => 1);
    total = n;
  }

  const base: number[] = [];
  const rems: number[] = [];
  for (let i = 0; i < n; i++) {
    const num = amount * w[i];
    base.push(Math.floor(num / total));
    rems.push(num % total);
  }
  let leftover = amount - base.reduce((a, b) => a + b, 0);
  const order = [...Array(n).keys()].sort((a, b) => rems[b] - rems[a] || a - b);
  for (let k = 0; leftover > 0; k = (k + 1) % n) {
    base[order[k]] += 1;
    leftover -= 1;
  }
  return base;
}

export function allocateCharge(amount: Paise, foodTotals: Paise[], mode: ChargeAllocation): Paise[] {
  return allocate(amount, mode === 'equal' ? foodTotals.map(() => 1) : foodTotals);
}

export interface SplitRow {
  userId: string;
  foodTotal: Paise;
  chargesShare: Paise;
  finalShare: Paise;
}

export interface SplitResult {
  rows: SplitRow[];
  subtotal: Paise;
  chargesTotal: Paise;
  total: Paise;
}

/**
 * Compute every attendee's share. Each attendee pays for exactly what they
 * ordered plus their allocated part of each additional charge.
 * Invariant: sum(rows.finalShare) === total === subtotal + chargesTotal.
 */
export function computeSplit(
  attendees: string[],
  foodTotals: Record<string, Paise>,
  charges: AdditionalCharge[],
): SplitResult {
  const food = attendees.map((id) => foodTotals[id] ?? 0);
  const chargeShares = attendees.map(() => 0);
  for (const c of charges) {
    allocateCharge(c.amount, food, c.allocation).forEach((p, i) => (chargeShares[i] += p));
  }
  const rows = attendees.map((userId, i) => ({
    userId,
    foodTotal: food[i],
    chargesShare: chargeShares[i],
    finalShare: food[i] + chargeShares[i],
  }));
  const subtotal = food.reduce((a, b) => a + b, 0);
  const chargesTotal = charges.reduce((a, c) => a + c.amount, 0);
  return { rows, subtotal, chargesTotal, total: subtotal + chargesTotal };
}
