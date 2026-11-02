import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx, initials } from '../lib/util';

const AVATAR_COLORS = [
  'bg-maroon-600 text-cream-50',
  'bg-leaf-600 text-cream-50',
  'bg-terracotta-500 text-cream-50',
  'bg-mustard-400 text-ink-900',
  'bg-leaf-800 text-mustard-200',
  'bg-maroon-800 text-mustard-200',
  'bg-terracotta-600 text-mustard-100',
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ id, name, size = 'md', className }: { id: string; name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold ring-2 ring-cream-50',
        colorFor(id),
        size === 'xs' && 'h-6 w-6 text-[10px]',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-12 w-12 text-base',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 5 }: { people: { id: string; name: string }[]; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} id={p.id} name={p.name} size="sm" />
      ))}
      {extra > 0 && (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-200 text-xs font-bold text-ink-700 ring-2 ring-cream-50">
          +{extra}
        </span>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight text-maroon-800 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card kolam-bg flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-mustard-100 text-mustard-600">{icon}</div>
      <h3 className="font-display text-lg text-maroon-800">{title}</h3>
      {message && <p className="mt-1 max-w-xs text-sm text-ink-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-cream-300 bg-white">
      <button
        type="button"
        aria-label="Decrease quantity"
        className="flex h-9 w-9 items-center justify-center rounded-full text-maroon-700 active:bg-cream-200 disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center rounded-full text-maroon-700 active:bg-cream-200"
        onClick={() => onChange(Math.min(99, value + 1))}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Rupee input that brings up the numeric keypad on iOS/Android. */
export function RupeeInput({
  value,
  onChange,
  placeholder = '0',
  id,
  invalid,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-semibold text-ink-400">₹</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        placeholder={placeholder}
        className={cx('input pl-8 tabular-nums', invalid && 'border-maroon-500 ring-2 ring-maroon-100')}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
      />
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'paid' | 'pending' | 'demo' | 'warn'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        tone === 'neutral' && 'bg-cream-200 text-ink-700',
        tone === 'paid' && 'bg-leaf-100 text-leaf-700',
        tone === 'pending' && 'bg-mustard-100 text-mustard-600',
        tone === 'demo' && 'bg-terracotta-100 text-terracotta-600',
        tone === 'warn' && 'bg-maroon-50 text-maroon-600',
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({ label, value, icon, tone = 'cream' }: { label: string; value: ReactNode; icon: ReactNode; tone?: 'cream' | 'leaf' | 'maroon' | 'mustard' }) {
  return (
    <div
      className={cx(
        'rounded-2xl p-4 shadow-card',
        tone === 'cream' && 'bg-white',
        tone === 'leaf' && 'bg-leaf-700 text-cream-50',
        tone === 'maroon' && 'bg-maroon-700 text-cream-50',
        tone === 'mustard' && 'bg-mustard-300 text-ink-900',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 truncate text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
