/** All money values are integer paise (₹1 = 100 paise). Never store floats. */
export type Paise = number;

export interface User {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export const CATEGORIES = [
  'Meals',
  'Rice',
  'Biryani',
  'Chicken',
  'Mutton',
  'Fish',
  'Egg',
  'Starters',
  'Breads',
  'Drinks',
  'Extras',
] as const;
export type Category = string;

export interface MenuItem {
  id: string;
  name: string;
  /** `art:<kind>` for a bundled illustration, otherwise an http(s) URL or data: URL. */
  image: string;
  category: Category;
  price: Paise;
  isAvailable: boolean;
  createdAt: string;
}

export type ChargeKind = 'parcel' | 'extra' | 'discount' | 'other' | 'adjustment';
export type ChargeAllocation = 'equal' | 'proportional';

export interface AdditionalCharge {
  id: string;
  kind: ChargeKind;
  label: string;
  /** Signed paise: positive adds to the bill, negative (discounts) reduces it. */
  amount: Paise;
  allocation: ChargeAllocation;
}

export interface LunchRecord {
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  paidByUserId: string;
  /** Amount printed on the restaurant bill, if entered (for reconciliation). */
  actualBillAmount: Paise | null;
  /** Sum of all food orders. */
  subtotal: Paise;
  additionalCharges: AdditionalCharge[];
  /** subtotal + sum(additionalCharges). Always equals the sum of all shares. */
  totalAmount: Paise;
  /** User ids, in display & allocation order. */
  attendees: string[];
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface LunchOrder {
  id: string;
  lunchRecordId: string;
  userId: string;
  /** null for one-off custom items that are not on the menu. */
  menuItemId: string | null;
  itemNameSnapshot: string;
  unitPriceSnapshot: Paise;
  quantity: number;
  totalPrice: Paise;
}

export type SettlementStatus = 'pending' | 'paid';

export interface Settlement {
  id: string;
  lunchRecordId: string;
  userId: string;
  /** Food total for this person (snapshot). */
  foodTotal: Paise;
  /** Allocated share of additional charges (may be negative for discounts). */
  chargesShare: Paise;
  /** foodTotal + chargesShare. */
  amountOwed: Paise;
  amountPaid: Paise;
  status: SettlementStatus;
  /** The person who paid the bill — always settled for their own share. */
  isPayer: boolean;
  settledAt: string | null;
}

export interface AppData {
  version: 1;
  /** Which built-in menu additions this dataset has received. */
  menuSeedVersion?: number;
  users: User[];
  menuItems: MenuItem[];
  lunches: LunchRecord[];
  orders: LunchOrder[];
  settlements: Settlement[];
}
