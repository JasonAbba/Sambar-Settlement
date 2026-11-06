import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  History,
  IndianRupee,
  Info,
  PlusCircle,
  Trash2,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { useLookups, useStore } from '../data/store';
import { sortLunchesDesc } from '../lib/lunch';
import { formatINR } from '../lib/money';
import { formatDate, relativeDay } from '../lib/util';
import { AvatarStack, Badge, EmptyState, StatCard } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';
import { loadDraftRaw } from '../data/repository';
import { Insights } from '../components/Insights';
import { isCloud } from '../data/config';

export default function Dashboard() {
  const store = useStore();
  const { data } = store;
  const { userName } = useLookups();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const hasDraft = !!loadDraftRaw();

  const stats = useMemo(() => {
    const total = data.lunches.reduce((a, l) => a + (l.actualBillAmount ?? l.totalAmount), 0);
    return {
      lunches: data.lunches.length,
      people: data.users.filter((u) => u.isActive).length,
      total,
      avg: data.lunches.length ? Math.round(total / data.lunches.length / 100) * 100 : 0,
    };
  }, [data]);

  const recent = useMemo(() => sortLunchesDesc(data.lunches).slice(0, 5), [data.lunches]);
  const demoCount = data.lunches.filter((l) => l.isDemo).length;

  return (
    <div className="space-y-7">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-maroon-800 text-cream-50 shadow-lift">
        <div className="kolam-bg absolute inset-0 opacity-40" />
        <div className="leaf-bg absolute -right-16 -top-10 h-56 w-56 rotate-[30deg] rounded-[60%_0_60%_0] opacity-90 sm:-right-6" />
        <div className="relative p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mustard-300">Chettiar Karaikudi Mess</p>
          <h1 className="mt-2 max-w-[14ch] font-display text-[34px] leading-[1.05] sm:text-5xl">Sambar Settlement</h1>
          <p className="mt-2 max-w-xs text-[15px] text-cream-200">Good food. Good company. Fair splits.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button onClick={() => navigate('/split')} className="btn btn-accent min-h-[56px] w-full text-base sm:w-auto sm:px-6">
              <PlusCircle className="h-5 w-5" />
              {hasDraft ? 'Resume Today’s Split' : 'Split Today’s Lunch'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="temple-border relative opacity-80" />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lunches" value={stats.lunches} icon={<CalendarDays className="h-4 w-4" />} tone="maroon" />
        <StatCard label="People" value={stats.people} icon={<Users className="h-4 w-4" />} tone="leaf" />
        <StatCard label="Total spent" value={formatINR(stats.total)} icon={<IndianRupee className="h-4 w-4" />} tone="mustard" />
        <StatCard label="Avg bill" value={formatINR(stats.avg)} icon={<TrendingUp className="h-4 w-4" />} />
      </section>

      <Insights />

      {/* Recent */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title mb-0">Recent lunches</h2>
          {recent.length > 0 && (
            <Link to="/history" className="flex min-h-[44px] items-center gap-1 text-sm font-bold text-maroon-700">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-6 w-6" />}
            title="No lunches yet"
            message="Record your first lunch and everyone's share is worked out for you."
            action={
              <Link to="/split" className="btn btn-primary">
                <PlusCircle className="h-5 w-5" /> Split a lunch
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-2.5 lg:grid-cols-2">
            {recent.map((l) => (
              <li key={l.id}>
                <Link to={`/history/${l.id}`} className="card flex items-center gap-3 p-3.5 active:bg-cream-50">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-100 leading-none text-maroon-700">
                    <span className="text-lg font-extrabold">{l.date.slice(8)}</span>
                    <span className="text-[10px] font-bold uppercase">{formatDate(l.date, 'short').split(' ')[1]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-bold">Paid by {userName(l.paidByUserId)}</span>
                      {l.isDemo && <Badge tone="demo">Demo</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <AvatarStack people={l.attendees.map((id) => ({ id, name: userName(id) }))} max={4} />
                      <span className="truncate text-xs text-ink-500">{relativeDay(l.date) ?? formatDate(l.date, 'short')}</span>
                    </div>
                  </div>
                  <div className="text-right font-extrabold tabular-nums">{formatINR(l.actualBillAmount ?? l.totalAmount)}</div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="section-title">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: '/split', label: 'Record a lunch', icon: PlusCircle, cls: 'bg-maroon-700 text-cream-50' },
            { to: '/menu', label: 'Manage menu', icon: BookOpen, cls: 'leaf-bg text-cream-50' },
            { to: '/people', label: 'Manage people', icon: Users, cls: 'bg-mustard-300 text-ink-900' },
            { to: '/history', label: 'Lunch history', icon: History, cls: 'bg-white text-maroon-800 border border-cream-200' },
          ].map(({ to, label, icon: Icon, cls }) => (
            <Link key={to} to={to} className={`flex min-h-[88px] flex-col justify-between rounded-2xl p-4 shadow-card active:scale-[0.98] ${cls}`}>
              <Icon className="h-6 w-6" />
              <span className="text-[15px] font-bold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Data management */}
      <section className="card kolam-bg p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-500" />
          <div className="text-sm text-ink-700">
            {isCloud && (
              <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-leaf-700">
                <span className="h-2 w-2 rounded-full bg-leaf-500" /> Shared with the whole group — changes sync live.
              </p>
            )}
            {demoCount > 0 ? (
              <>
                <strong>
                  {demoCount} demo lunch{demoCount > 1 ? 'es are' : ' is'}
                </strong>{' '}
                included so you can explore. Remove them when you start recording real lunches.
              </>
            ) : (
              <>Every lunch here is real. Saved lunches can be edited or deleted from History.</>
            )}
          </div>
        </div>
        {demoCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                if (
                  await confirm({
                    title: 'Remove demo lunches?',
                    message: 'The sample lunches will be deleted. People and menu stay.',
                    confirmLabel: 'Remove',
                    danger: true,
                  })
                ) {
                  const n = store.removeDemoLunches();
                  toast.success(`Removed ${n} demo lunch${n === 1 ? '' : 'es'}.`);
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Remove demo lunches
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
