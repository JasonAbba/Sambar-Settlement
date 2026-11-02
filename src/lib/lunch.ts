import type { AdditionalCharge, AppData, LunchOrder, LunchRecord, Paise, Settlement } from '../types';
import { paiseToInput } from './money';
import { computeSplit, type SplitResult } from './split';
import { nowISO, todayISO, uid } from './util';

export interface DraftLine {
  key: string;
  menuItemId: string | null;
  name: string;
  unitPrice: Paise;
  quantity: number;
}

/** In-progress lunch, as edited in the Split wizard. */
export interface LunchDraft {
  /** Set when editing an existing record. */
  editingId: string | null;
  date: string;
  paidByUserId: string;
  /** Raw rupee input string so partially typed values survive navigation. */
  actualBillInput: string;
  attendees: string[];
  orders: Record<string, DraftLine[]>;
  charges: AdditionalCharge[];
}

export function emptyDraft(): LunchDraft {
  return {
    editingId: null,
    date: todayISO(),
    paidByUserId: '',
    actualBillInput: '',
    attendees: [],
    orders: {},
    charges: [],
  };
}

export function lineTotal(l: DraftLine): Paise {
  return l.unitPrice * l.quantity;
}

export function draftFoodTotals(draft: LunchDraft): Record<string, Paise> {
  const totals: Record<string, Paise> = {};
  for (const id of draft.attendees) {
    totals[id] = (draft.orders[id] ?? []).reduce((a, l) => a + lineTotal(l), 0);
  }
  return totals;
}

export function draftItemCount(draft: LunchDraft): number {
  return draft.attendees.reduce(
    (a, id) => a + (draft.orders[id] ?? []).reduce((b, l) => b + l.quantity, 0),
    0,
  );
}

export function computeDraftSplit(draft: LunchDraft): SplitResult {
  return computeSplit(draft.attendees, draftFoodTotals(draft), draft.charges);
}

/** Sort attendee ids by the order of the users list, so allocation order is stable. */
export function sortAttendees(ids: string[], userOrder: string[]): string[] {
  const idx = new Map(userOrder.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => (idx.get(a) ?? 1e9) - (idx.get(b) ?? 1e9));
}

export interface BuiltLunch {
  record: LunchRecord;
  orders: LunchOrder[];
  settlements: Settlement[];
}

/**
 * Turn a draft into persisted entities. When editing, previously recorded
 * payments are preserved (amountPaid is kept and status re-derived), so
 * editing a lunch never silently forgives or invents a payment.
 */
export function buildLunch(
  draft: LunchDraft,
  actualBillAmount: Paise | null,
  previous?: { record: LunchRecord; settlements: Settlement[] },
  opts: { isDemo?: boolean; id?: string } = {},
): BuiltLunch {
  const id = previous?.record.id ?? opts.id ?? uid('lunch');
  const now = nowISO();
  const split = computeDraftSplit(draft);

  const orders: LunchOrder[] = [];
  for (const userId of draft.attendees) {
    for (const l of draft.orders[userId] ?? []) {
      if (l.quantity <= 0) continue;
      orders.push({
        // Deterministic & sortable, so dish order survives a round-trip through the database.
        id: `ord-${id}-${String(orders.length).padStart(3, '0')}`,
        lunchRecordId: id,
        userId,
        menuItemId: l.menuItemId,
        itemNameSnapshot: l.name,
        unitPriceSnapshot: l.unitPrice,
        quantity: l.quantity,
        totalPrice: lineTotal(l),
      });
    }
  }

  const settlements: Settlement[] = split.rows.map((row) => {
    const isPayer = row.userId === draft.paidByUserId;
    const prev = previous?.settlements.find((s) => s.userId === row.userId);
    // A previous payer's "payment" was automatic, not a real transfer.
    const prevPaid = prev && !prev.isPayer ? prev.amountPaid : 0;
    const amountPaid = isPayer ? row.finalShare : prevPaid;
    const status = isPayer || amountPaid >= row.finalShare ? 'paid' : 'pending';
    return {
      id: prev?.id ?? uid('stl'),
      lunchRecordId: id,
      userId: row.userId,
      foodTotal: row.foodTotal,
      chargesShare: row.chargesShare,
      amountOwed: row.finalShare,
      amountPaid,
      status,
      isPayer,
      settledAt: status === 'paid' ? (prev?.status === 'paid' ? prev.settledAt : now) : null,
    };
  });

  const record: LunchRecord = {
    id,
    date: draft.date,
    paidByUserId: draft.paidByUserId,
    actualBillAmount,
    subtotal: split.subtotal,
    additionalCharges: draft.charges.map((c) => ({ ...c })),
    totalAmount: split.total,
    attendees: [...draft.attendees],
    createdAt: previous?.record.createdAt ?? now,
    updatedAt: now,
    isDemo: previous?.record.isDemo ?? opts.isDemo,
  };

  return { record, orders, settlements };
}

/** Recreate an editable draft from a stored lunch. */
export function draftFromRecord(data: AppData, lunchId: string): LunchDraft | null {
  const record = data.lunches.find((l) => l.id === lunchId);
  if (!record) return null;
  const orders: Record<string, DraftLine[]> = {};
  for (const id of record.attendees) orders[id] = [];
  for (const o of data.orders.filter((o) => o.lunchRecordId === lunchId)) {
    (orders[o.userId] ??= []).push({
      key: uid('ln'),
      menuItemId: o.menuItemId,
      name: o.itemNameSnapshot,
      unitPrice: o.unitPriceSnapshot,
      quantity: o.quantity,
    });
  }
  return {
    editingId: record.id,
    date: record.date,
    paidByUserId: record.paidByUserId,
    actualBillInput: paiseToInput(record.actualBillAmount),
    attendees: [...record.attendees],
    orders,
    charges: record.additionalCharges.map((c) => ({ ...c })),
  };
}

/** Amount still pending for a settlement (never negative). */
export function outstanding(s: Settlement): Paise {
  return s.isPayer ? 0 : Math.max(0, s.amountOwed - s.amountPaid);
}

export interface Debt {
  lunchId: string;
  date: string;
  debtorId: string;
  creditorId: string;
  amount: Paise;
}

export function pendingDebts(data: AppData): Debt[] {
  const lunches = new Map(data.lunches.map((l) => [l.id, l]));
  const debts: Debt[] = [];
  for (const s of data.settlements) {
    const lunch = lunches.get(s.lunchRecordId);
    if (!lunch) continue;
    const amt = outstanding(s);
    if (amt > 0 && s.userId !== lunch.paidByUserId) {
      debts.push({ lunchId: lunch.id, date: lunch.date, debtorId: s.userId, creditorId: lunch.paidByUserId, amount: amt });
    }
  }
  return debts;
}

export interface PersonBalance {
  userId: string;
  owes: Paise;
  isOwed: Paise;
  net: Paise;
}

export function personBalances(data: AppData): PersonBalance[] {
  const map = new Map<string, PersonBalance>();
  const get = (id: string) => {
    let b = map.get(id);
    if (!b) map.set(id, (b = { userId: id, owes: 0, isOwed: 0, net: 0 }));
    return b;
  };
  for (const d of pendingDebts(data)) {
    get(d.debtorId).owes += d.amount;
    get(d.creditorId).isOwed += d.amount;
  }
  for (const b of map.values()) b.net = b.isOwed - b.owes;
  return [...map.values()];
}

export interface PairBalance {
  /** Person who should pay. */
  fromId: string;
  /** Person who should receive. */
  toId: string;
  /** Net amount after offsetting debts in both directions. */
  amount: Paise;
  /** Gross amounts, for transparency. */
  gross: { fromOwes: Paise; toOwes: Paise };
  lunchIds: string[];
}

/** Net balances between each pair of people across all unsettled lunches. */
export function pairBalances(data: AppData): PairBalance[] {
  const pairs = new Map<string, { a: string; b: string; aOwesB: Paise; bOwesA: Paise; lunches: Set<string> }>();
  for (const d of pendingDebts(data)) {
    const [a, b] = [d.debtorId, d.creditorId].sort();
    const key = `${a}|${b}`;
    let p = pairs.get(key);
    if (!p) pairs.set(key, (p = { a, b, aOwesB: 0, bOwesA: 0, lunches: new Set() }));
    if (d.debtorId === a) p.aOwesB += d.amount;
    else p.bOwesA += d.amount;
    p.lunches.add(d.lunchId);
  }
  const out: PairBalance[] = [];
  for (const p of pairs.values()) {
    const net = p.aOwesB - p.bOwesA;
    const fromA = net >= 0;
    out.push({
      fromId: fromA ? p.a : p.b,
      toId: fromA ? p.b : p.a,
      amount: Math.abs(net),
      gross: fromA ? { fromOwes: p.aOwesB, toOwes: p.bOwesA } : { fromOwes: p.bOwesA, toOwes: p.aOwesB },
      lunchIds: [...p.lunches],
    });
  }
  return out.sort((x, y) => y.amount - x.amount);
}

export function sortLunchesDesc(lunches: LunchRecord[]): LunchRecord[] {
  return [...lunches].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}
