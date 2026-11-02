import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ChevronRight, History, PlusCircle, Utensils } from 'lucide-react';
import { useLookups, useStore } from '../data/store';
import { sortLunchesDesc } from '../lib/lunch';
import { formatINR } from '../lib/money';
import { cx, formatDate, relativeDay } from '../lib/util';
import { Badge, EmptyState, PageHeader } from '../components/ui';

export default function HistoryPage() {
  const { data } = useStore();
  const { userName } = useLookups();
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');

  const lunches = useMemo(() => {
    return sortLunchesDesc(data.lunches).map((l) => {
      const settlements = data.settlements.filter((s) => s.lunchRecordId === l.id);
      const dishes = data.orders.filter((o) => o.lunchRecordId === l.id).reduce((a, o) => a + o.quantity, 0);
      const pending = settlements.filter((s) => s.status === 'pending').length;
      return { l, settlements, dishes, pending };
    });
  }, [data]);

  const shown = lunches.filter((x) => (filter === 'all' ? true : filter === 'pending' ? x.pending > 0 : x.pending === 0));

  return (
    <div>
      <PageHeader title="Lunch history" subtitle={`${data.lunches.length} lunch${data.lunches.length === 1 ? '' : 'es'} recorded`} />

      {data.lunches.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {(['all', 'pending', 'settled'] as const).map((f) => (
            <button key={f} className={cx('chip capitalize', f === filter ? 'chip-on' : 'chip-off')} onClick={() => setFilter(f)}>
              {f === 'pending' ? 'Has pending' : f}
            </button>
          ))}
        </div>
      )}

      {data.lunches.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="No lunches recorded yet"
          message="Once you split a lunch, it shows up here with everyone’s share."
          action={<Link to="/split" className="btn btn-primary"><PlusCircle className="h-5 w-5" /> Split today’s lunch</Link>}
        />
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-500">No lunches in this filter.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map(({ l, settlements, dishes, pending }) => (
            <li key={l.id}>
              <Link to={`/history/${l.id}`} className="card block overflow-hidden active:bg-cream-50">
                <div className="flex items-center gap-3 border-b border-cream-200 bg-cream-50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold">{formatDate(l.date)}</span>
                      {relativeDay(l.date) && <span className="text-xs text-ink-400">· {relativeDay(l.date)}</span>}
                      {l.isDemo && <Badge tone="demo">Demo</Badge>}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-500">
                      Paid by <strong className="text-ink-700">{userName(l.paidByUserId)}</strong> · {l.attendees.length} people ·{' '}
                      <Utensils className="inline h-3.5 w-3.5" /> {dishes} dishes
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold tabular-nums text-maroon-800">{formatINR(l.actualBillAmount ?? l.totalAmount)}</div>
                    {pending ? <Badge tone="pending">{pending} pending</Badge> : <Badge tone="paid">Settled</Badge>}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" />
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 py-3">
                  {l.attendees.map((id) => {
                    const s = settlements.find((x) => x.userId === id);
                    return (
                      <span
                        key={id}
                        className={cx(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                          s?.isPayer ? 'bg-mustard-100 text-ink-900' : s?.status === 'paid' ? 'bg-leaf-50 text-leaf-700' : 'bg-cream-100 text-ink-700',
                        )}
                      >
                        {userName(id)} <span className="font-extrabold tabular-nums">{formatINR(s?.amountOwed ?? 0)}</span>
                      </span>
                    );
                  })}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
