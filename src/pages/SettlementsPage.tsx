import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, HandCoins, PartyPopper } from 'lucide-react';
import { useLookups, useStore } from '../data/store';
import { outstanding, pairBalances, pendingDebts, personBalances, sortLunchesDesc } from '../lib/lunch';
import { formatINR } from '../lib/money';
import { cx, formatDate } from '../lib/util';
import { Avatar, Badge, EmptyState, PageHeader } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

export default function SettlementsPage() {
  const store = useStore();
  const { data } = store;
  const { userName } = useLookups();
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<'pairs' | 'people' | 'lunches'>('pairs');

  const debts = useMemo(() => pendingDebts(data), [data]);
  const pairs = useMemo(() => pairBalances(data), [data]);
  const people = useMemo(() => personBalances(data).sort((a, b) => a.net - b.net), [data]);
  const totalOutstanding = debts.reduce((a, d) => a + d.amount, 0);
  const lunchesWithPending = useMemo(
    () => sortLunchesDesc(data.lunches).filter((l) => data.settlements.some((s) => s.lunchRecordId === l.id && s.status === 'pending')),
    [data],
  );

  const settlePair = async (fromId: string, toId: string, amount: number) => {
    const items = debts
      .filter((d) => (d.debtorId === fromId && d.creditorId === toId) || (d.debtorId === toId && d.creditorId === fromId))
      .map((d) => ({ lunchId: d.lunchId, userId: d.debtorId }));
    if (
      await confirm({
        title: 'Settle up?',
        message: (
          <>
            Confirm <strong>{userName(fromId)}</strong> paid <strong>{userName(toId)} {formatINR(amount)}</strong>. All {items.length} pending share
            {items.length === 1 ? '' : 's'} between them will be marked as paid.
          </>
        ),
        confirmLabel: 'Mark settled',
      })
    ) {
      store.settleMany(items);
      toast.success(`${userName(fromId)} and ${userName(toId)} are settled.`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settlements" subtitle="Who needs to pay whom, across all lunches" />

      <section className="leaf-bg mb-5 flex items-center gap-4 rounded-3xl p-5 text-cream-50 shadow-lift">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <HandCoins className="h-6 w-6 text-mustard-300" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-mustard-200">Total outstanding</div>
          <div className="text-3xl font-extrabold tabular-nums">{formatINR(totalOutstanding)}</div>
          <div className="text-sm text-cream-100">
            {debts.length} pending share{debts.length === 1 ? '' : 's'} across {lunchesWithPending.length} lunch{lunchesWithPending.length === 1 ? '' : 'es'}
          </div>
        </div>
      </section>

      {debts.length === 0 ? (
        <EmptyState icon={<PartyPopper className="h-6 w-6" />} title="All settled!" message="Nobody owes anybody. Time for another meal." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-cream-200 p-1">
            {([
              ['pairs', 'Pay back'],
              ['people', 'By person'],
              ['lunches', 'By lunch'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cx('min-h-[44px] rounded-xl text-sm font-bold transition', tab === k ? 'bg-white text-maroon-800 shadow-sm' : 'text-ink-500')}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'pairs' && (
            <ul className="space-y-2.5">
              {pairs
                .filter((p) => p.amount > 0 || p.gross.fromOwes > 0)
                .map((p) => (
                  <li key={`${p.fromId}-${p.toId}`} className="card p-4">
                    <div className="flex items-center gap-2">
                      <Avatar id={p.fromId} name={userName(p.fromId)} size="sm" />
                      <span className="truncate font-bold">{userName(p.fromId)}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-terracotta-500" />
                      <Avatar id={p.toId} name={userName(p.toId)} size="sm" />
                      <span className="truncate font-bold">{userName(p.toId)}</span>
                      <span className="ml-auto text-lg font-extrabold tabular-nums text-maroon-800">{formatINR(p.amount)}</span>
                    </div>
                    {p.gross.toOwes > 0 && (
                      <p className="mt-2 text-xs text-ink-500">
                        Net of {formatINR(p.gross.fromOwes)} owed minus {formatINR(p.gross.toOwes)} {userName(p.toId)} owes back.
                      </p>
                    )}
                    <button className="btn btn-secondary btn-sm mt-3 w-full" onClick={() => settlePair(p.fromId, p.toId, p.amount)}>
                      <CheckCircle2 className="h-4 w-4 text-leaf-600" /> Mark as settled
                    </button>
                  </li>
                ))}
            </ul>
          )}

          {tab === 'people' && (
            <ul className="card divide-y divide-cream-200">
              {people.map((b) => (
                <li key={b.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar id={b.userId} name={userName(b.userId)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{userName(b.userId)}</div>
                    <div className="text-xs text-ink-500">
                      {b.owes > 0 && <>owes {formatINR(b.owes)}</>}
                      {b.owes > 0 && b.isOwed > 0 && ' · '}
                      {b.isOwed > 0 && <>is owed {formatINR(b.isOwed)}</>}
                    </div>
                  </div>
                  <span className={cx('font-extrabold tabular-nums', b.net < 0 ? 'text-maroon-700' : 'text-leaf-700')}>
                    {b.net < 0 ? `pays ${formatINR(-b.net)}` : `gets ${formatINR(b.net)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {tab === 'lunches' && (
            <div className="space-y-3">
              {lunchesWithPending.map((l) => {
                const ss = data.settlements.filter((s) => s.lunchRecordId === l.id && !s.isPayer);
                return (
                  <section key={l.id} className="card overflow-hidden">
                    <Link to={`/history/${l.id}`} className="flex items-center justify-between gap-2 border-b border-cream-200 bg-cream-50 px-4 py-3">
                      <div>
                        <div className="font-bold">{formatDate(l.date)}</div>
                        <div className="text-xs text-ink-500">Paid by {userName(l.paidByUserId)}</div>
                      </div>
                      {l.isDemo && <Badge tone="demo">Demo</Badge>}
                    </Link>
                    <ul className="divide-y divide-cream-200">
                      {ss.map((s) => {
                        const paid = s.status === 'paid';
                        return (
                          <li key={s.id}>
                            <button
                              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left active:bg-cream-50"
                              onClick={() => {
                                store.setPaid(l.id, s.userId, !paid);
                                toast.success(`${userName(s.userId)} marked as ${paid ? 'pending' : 'paid'}.`);
                              }}
                            >
                              {paid ? <CheckCircle2 className="h-6 w-6 text-leaf-600" /> : <Circle className="h-6 w-6 text-ink-400" />}
                              <span className={cx('flex-1 font-semibold', paid && 'text-ink-400 line-through')}>{userName(s.userId)}</span>
                              <span className="font-extrabold tabular-nums">{formatINR(paid ? s.amountOwed : outstanding(s))}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
