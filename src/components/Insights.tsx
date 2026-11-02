import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Drumstick, Flame, HandCoins, Repeat, Soup, Trophy, Utensils } from 'lucide-react';
import { useStore } from '../data/store';
import { computeInsights, type Ranked } from '../lib/insights';
import { formatINR } from '../lib/money';
import { cx, formatDate } from '../lib/util';
import { Avatar } from './ui';

export function Insights() {
  const { data } = useStore();
  const ins = useMemo(() => computeInsights(data), [data]);
  if (data.lunches.length === 0) return null;

  const facts: { icon: ReactNode; title: string; value: string; note: string; tone: string }[] = [];
  if (ins.topDish)
    facts.push({
      icon: <Soup className="h-5 w-5" />,
      title: 'Crowd favourite',
      value: ins.topDish.label,
      note: `ordered ${ins.topDish.value} time${ins.topDish.value === 1 ? '' : 's'}`,
      tone: 'bg-leaf-700 text-cream-50',
    });
  if (ins.topSpender)
    facts.push({
      icon: <Crown className="h-5 w-5" />,
      title: 'Biggest appetite',
      value: ins.topSpender.label,
      note: `${formatINR(ins.topSpender.value)} on lunches so far`,
      tone: 'bg-maroon-700 text-cream-50',
    });
  if (ins.topPayer)
    facts.push({
      icon: <HandCoins className="h-5 w-5" />,
      title: 'Most generous wallet',
      value: ins.topPayer.label,
      note: `paid the bill ${ins.topPayer.value}× · ${ins.topPayer.sub}`,
      tone: 'bg-mustard-300 text-ink-900',
    });
  if (ins.topRegular)
    facts.push({
      icon: <Repeat className="h-5 w-5" />,
      title: 'Never misses lunch',
      value: ins.topRegular.label,
      note: `at ${ins.topRegular.value} of ${data.lunches.length} lunches`,
      tone: 'bg-white text-ink-900',
    });
  if (ins.biggestLunch)
    facts.push({
      icon: <Flame className="h-5 w-5" />,
      title: 'Biggest feast',
      value: formatINR(ins.biggestLunch.total),
      note: `${formatDate(ins.biggestLunch.date, 'short')} · ${ins.biggestLunch.people} people`,
      tone: 'bg-terracotta-500 text-cream-50',
    });
  if (ins.bigEaterOnce) {
    const who = data.users.find((u) => u.id === ins.bigEaterOnce!.userId)?.name ?? 'Someone';
    facts.push({
      icon: <Drumstick className="h-5 w-5" />,
      title: 'Single-lunch record',
      value: who,
      note: `${formatINR(ins.bigEaterOnce.amount)} of food on ${formatDate(ins.bigEaterOnce.date, 'short')}`,
      tone: 'bg-white text-ink-900',
    });
  }
  facts.push({
    icon: <Utensils className="h-5 w-5" />,
    title: 'Plates cleared',
    value: `${ins.totalDishes} dishes`,
    note: ins.biryaniCount ? `incl. ${ins.biryaniCount} biryani${ins.biryaniCount === 1 ? '' : 's'} 🍛` : `≈ ${formatINR(ins.avgPerHead)} per head`,
    tone: 'bg-leaf-50 text-leaf-800',
  });

  return (
    <div className="space-y-7">
      {/* Fun facts: swipeable on phones, grid on desktop */}
      <section>
        <h2 className="section-title">Fun facts</h2>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.title} className={cx('w-[70%] shrink-0 snap-start rounded-2xl p-4 shadow-card sm:w-auto', f.tone)}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
                {f.icon}
                {f.title}
              </div>
              <div className="mt-2 truncate text-xl font-extrabold">{f.value}</div>
              <div className="mt-0.5 text-sm opacity-80">{f.note}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-2">
        <Leaderboard spenders={ins.spenders} regulars={ins.regulars} payers={ins.payers} />
        <SpendChart timeline={ins.timeline} />
      </div>

      <TopDishes dishes={ins.dishes.slice(0, 7)} />
    </div>
  );
}

/* ---------------- Leaderboard ---------------- */

function Leaderboard({ spenders, regulars, payers }: { spenders: Ranked[]; regulars: Ranked[]; payers: Ranked[] }) {
  const [tab, setTab] = useState<'spend' | 'regular' | 'payer'>('spend');
  const rows = (tab === 'spend' ? spenders : tab === 'regular' ? regulars : payers).slice(0, 8);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const fmt = (r: Ranked) => (tab === 'spend' ? formatINR(r.value) : tab === 'regular' ? `${r.value} lunch${r.value === 1 ? '' : 'es'}` : `${r.value}× paid`);
  const medal = ['bg-mustard-400 text-ink-900', 'bg-cream-300 text-ink-900', 'bg-terracotta-300 text-ink-900'];

  return (
    <section>
      <h2 className="section-title">
        <Trophy className="h-5 w-5 text-mustard-500" /> Leaderboard
      </h2>
      <div className="card p-3">
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-cream-100 p-1" role="tablist">
          {([
            ['spend', 'Top eaters'],
            ['regular', 'Regulars'],
            ['payer', 'Bill payers'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cx('min-h-[40px] rounded-lg text-sm font-bold transition', tab === k ? 'bg-white text-maroon-800 shadow-sm' : 'text-ink-500')}
            >
              {label}
            </button>
          ))}
        </div>
        <ol className="space-y-1">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
              <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold', medal[i] ?? 'bg-cream-100 text-ink-500')}>
                {i + 1}
              </span>
              <Avatar id={r.id} name={r.label} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{r.label}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-ink-700">{fmt(r)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-100">
                  <div className="h-full rounded-full bg-maroon-600" style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Spend per lunch (bar chart, tap for value) ---------------- */

function SpendChart({ timeline }: { timeline: { id: string; date: string; total: number; people: number }[] }) {
  const recent = timeline.slice(-12);
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(1, ...recent.map((t) => t.total));
  const selected = recent.find((t) => t.id === sel) ?? recent[recent.length - 1];
  const avg = recent.length ? Math.round(recent.reduce((a, t) => a + t.total, 0) / recent.length) : 0;

  return (
    <section>
      <h2 className="section-title">Bill per lunch</h2>
      <div className="card p-4">
        {/* readout of the tapped / latest bar */}
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-400">{formatDate(selected.date)}</div>
            <div className="text-2xl font-extrabold tabular-nums text-maroon-800">{formatINR(selected.total)}</div>
            <div className="text-xs text-ink-500">
              {selected.people} people · {formatINR(Math.round(selected.total / Math.max(1, selected.people)))} per head
            </div>
          </div>
          <div className="text-right text-xs text-ink-500">
            avg
            <div className="text-sm font-bold tabular-nums text-ink-700">{formatINR(avg)}</div>
          </div>
        </div>

        <div className="relative flex h-40 items-end gap-1.5 border-b border-cream-300" role="list" aria-label="Bill amount per lunch">
          {/* average guide line */}
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-400/40" style={{ bottom: `${(avg / max) * 100}%` }} />
          {recent.map((t) => {
            const on = t.id === selected.id;
            return (
              <button
                key={t.id}
                role="listitem"
                aria-label={`${formatDate(t.date)}: ${formatINR(t.total)}`}
                onClick={() => setSel(t.id)}
                onMouseEnter={() => setSel(t.id)}
                className="group relative flex h-full flex-1 items-end justify-center"
              >
                <span
                  className={cx('w-full max-w-[28px] rounded-t transition-colors', on ? 'bg-maroon-700' : 'bg-maroon-300 group-hover:bg-maroon-500')}
                  style={{ height: `${Math.max(3, (t.total / max) * 100)}%` }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {recent.map((t) => (
            <span key={t.id} className={cx('flex-1 text-center text-[10px] font-semibold tabular-nums', t.id === selected.id ? 'text-maroon-700' : 'text-ink-400')}>
              {Number(t.date.slice(8))}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-400">Tap a bar to see that lunch. Dashed line = average.</p>
      </div>
    </section>
  );
}

/* ---------------- Top dishes ---------------- */

function TopDishes({ dishes }: { dishes: Ranked[] }) {
  if (!dishes.length) return null;
  const max = Math.max(1, ...dishes.map((d) => d.value));
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title mb-0">Most ordered dishes</h2>
        <Link to="/menu" className="flex min-h-[44px] items-center text-sm font-bold text-maroon-700">
          Menu
        </Link>
      </div>
      <div className="card space-y-2.5 p-4">
        {dishes.map((d) => (
          <div key={d.id} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,13rem)_1fr_auto]">
            <span className="truncate text-sm font-semibold">{d.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-cream-100">
              <div className="h-full rounded-full bg-leaf-600" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-sm font-bold tabular-nums text-ink-700">×{d.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
