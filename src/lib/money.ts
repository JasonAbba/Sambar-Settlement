import type { Paise } from '../types';

/** Format integer paise as Indian Rupees, e.g. 123450 -> "₹1,234.50", 18000 -> "₹180". */
export function formatINR(paise: Paise, opts: { signed?: boolean } = {}): string {
  const rounded = Math.round(paise);
  const neg = rounded < 0;
  const abs = Math.abs(rounded);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  const body = groupIndian(rupees) + (rem ? '.' + String(rem).padStart(2, '0') : '');
  const sign = neg ? '−' : opts.signed && rounded > 0 ? '+' : '';
  return `${sign}₹${body}`;
}

/** Indian digit grouping (1,23,456) without relying on Intl locale data being present. */
function groupIndian(n: number): string {
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

const RUPEE_RE = /^(\d{1,9})(?:\.(\d{0,2}))?$/;

function clean(input: string): string {
  return input.trim().replace(/[₹,\s]/g, '');
}

/** True when the string is empty or a valid non-negative rupee amount with up to 2 decimals. */
export function isValidRupeeInput(input: string): boolean {
  const t = clean(input);
  return t === '' || RUPEE_RE.test(t);
}

/**
 * Parse a user-entered rupee string into integer paise using string arithmetic
 * (no float multiplication). Returns null for empty or invalid input.
 */
export function parseRupees(input: string): Paise | null {
  const m = RUPEE_RE.exec(clean(input));
  if (!m) return null;
  const rupees = parseInt(m[1], 10);
  const paise = parseInt((m[2] ?? '').padEnd(2, '0'), 10);
  return rupees * 100 + paise;
}

/** Convert paise to an editable input string: 18050 -> "180.50", 18000 -> "180". */
export function paiseToInput(paise: Paise | null | undefined): string {
  if (paise == null) return '';
  const abs = Math.abs(paise);
  const r = Math.floor(abs / 100);
  const p = abs % 100;
  return (paise < 0 ? '-' : '') + r + (p ? '.' + String(p).padStart(2, '0') : '');
}
