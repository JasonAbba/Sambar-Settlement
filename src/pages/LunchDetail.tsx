import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCheck, CheckCircle2, Circle, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import { useLookups, useStore } from '../data/store';
import { outstanding } from '../lib/lunch';
import { formatINR } from '../lib/money';
import { cx, formatDate } from '../lib/util';
import { Avatar, Badge, EmptyState } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

export default function LunchDetail() {
  const { lunchId } = useParams();
  const store = useStore();
  const { data } = store;
  const { userName } = useLookups();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  const lunch = data.lunches.find((l) => l.id === lunchId);
  if (!lunch) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-6 w-6" />}
        title="Lunch not found"
        message="It may have been deleted."
        action={<Link to="/history" className="btn btn-primary">Back to history</Link>}
      />
    );
  }

  const orders = data.orders.filter((o) => o.lunchRecordId === lunch.id);
  const settlements = data.settlements.filter((s) => s.lunchRecordId === lunch.id);
  const payer = userName(lunch.paidByUserId);
  const pendingList = settlements.filter((s) => s.status === 'pending');
  const pendingTotal = pendingList.reduce((a, s) => a + outstanding(s), 0);
  const diff = lunch.actualBillAmount == null ? 0 : lunch.actualBillAmount - lunch.totalAmount;
  const dishCount = orders.reduce((a, o) => a + o.quantity, 0);

  const togglePaid = (userId: string, paid: boolean) => {
    store.setPaid(lunch.id, userId, paid);
    toast.success(paid ? `${userName(userId)} marked as paid.` : `${userName(userId)} marked as pending.`);
  };

  const markAll = async () => {
    if (
      await confirm({
        title: 'Mark everyone as paid?',
        message: `${pendingList.length} pending share${pendingList.length === 1 ? '' : 's'} (${formatINR(pendingTotal)}) will be marked as paid to ${payer}.`,
        confirmLabel: 'Mark all paid',
      })
    ) {
      store.settleMany(pendingList.map((s) => ({ lunchId: lunch.id, userId: s.userId })));
      toast.success('All shares settled.');
    }
  };

  const del = async () => {
    if (
      await confirm({
        title: 'Delete this lunch?',
        message: 'The lunch, its orders and settlement status will be permanently deleted.',
        confirmLabel: 'Delete',
        danger: true,
      })
    ) {
      store.deleteLunch(lunch.id);
      toast.success('Lunch deleted.');
      navigate('/history', { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link to="/history" className="btn btn-ghost btn-sm -ml-3">
          <ArrowLeft className="h-4 w-4" /> History
        </Link>
        <div className="flex gap-1">
          <Link to={`/split/${lunch.id}`} className="btn btn-secondary btn-sm">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button className="icon-btn text-maroon-600" onClick={del} aria-label="Delete lunch">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-maroon-800 p-5 text-cream-50 shadow-lift">
        <div className="kolam-bg absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl">{formatDate(lunch.date)}</h1>
            {lunch.isDemo && <Badge tone="demo">Demo data</Badge>}
          </div>
          <p className="mt-1 text-cream-200">
            <strong className="text-mustard-200">{payer}</strong> paid {formatINR(lunch.actualBillAmount ?? lunch.totalAmount)} · {lunch.attendees.length} people · {dishCount} dishes
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mustard-300">Food</div>
              <div className="font-extrabold tabular-nums">{formatINR(lunch.subtotal)}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mustard-300">Extras</div>
              <div className="font-extrabold tabular-nums">{formatINR(lunch.totalAmount - lunch.subtotal, { signed: true })}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mustard-300">Pending</div>
              <div className="font-extrabold tabular-nums">{formatINR(pendingTotal)}</div>
            </div>
          </div>
        </div>
      </section>

      {diff !== 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-maroon-300 bg-maroon-50 p-3 text-sm text-maroon-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            The bill was {formatINR(lunch.actualBillAmount!)} but the recorded shares add up to {formatINR(lunch.totalAmount)} (difference{' '}
            <strong>{formatINR(diff, { signed: true })}</strong>). <Link to={`/split/${lunch.id}`} className="font-bold underline">Edit</Link> to fix it.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Who owes what</h2>
        {pendingList.length > 0 && (
          <button className="btn btn-leaf btn-sm" onClick={markAll}>
            <CheckCheck className="h-4 w-4" /> Mark all paid
          </button>
        )}
      </div>

      <div className="space-y-3">
        {lunch.attendees.map((id) => {
          const s = settlements.find((x) => x.userId === id);
          const mine = orders.filter((o) => o.userId === id);
          if (!s) return null;
          const paid = s.status === 'paid';
          return (
            <section key={id} className={cx('card overflow-hidden', paid && !s.isPayer && 'border-leaf-300')}>
              <header className="flex items-center gap-3 px-4 py-3">
                <Avatar id={id} name={userName(id)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{userName(id)}</div>
                  <div className="text-xs text-ink-500">
                    {s.isPayer ? 'Paid the bill' : paid ? `Paid ${payer}` : `Owes ${payer}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold tabular-nums text-maroon-800">{formatINR(s.amountOwed)}</div>
                  {s.isPayer ? <Badge tone="paid">Payer</Badge> : paid ? <Badge tone="paid">Paid</Badge> : <Badge tone="pending">Pending</Badge>}
                </div>
              </header>
              <ul className="space-y-1 border-t border-cream-200 bg-cream-50/60 px-4 py-2.5 text-sm">
                {mine.length === 0 && <li className="text-ink-400">No dishes</li>}
                {mine.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2">
                    <span className="truncate text-ink-700">
                      {o.itemNameSnapshot} <span className="text-ink-400">× {o.quantity}</span>
                    </span>
                    <span className="tabular-nums text-ink-700">{formatINR(o.totalPrice)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-2 border-t border-dashed border-cream-300 pt-1 font-semibold">
                  <span>Food total</span>
                  <span className="tabular-nums">{formatINR(s.foodTotal)}</span>
                </li>
                {s.chargesShare !== 0 && (
                  <li className="flex justify-between gap-2 text-ink-500">
                    <span>Extra charges share</span>
                    <span className="tabular-nums">{formatINR(s.chargesShare, { signed: true })}</span>
                  </li>
                )}
                {!s.isPayer && s.amountPaid > 0 && s.amountPaid < s.amountOwed && (
                  <li className="flex justify-between gap-2 text-leaf-700">
                    <span>Already paid</span>
                    <span className="tabular-nums">{formatINR(s.amountPaid)}</span>
                  </li>
                )}
              </ul>
              {!s.isPayer && (
                <button
                  onClick={() => togglePaid(id, !paid)}
                  className={cx(
                    'flex min-h-[48px] w-full items-center justify-center gap-2 border-t text-[15px] font-bold transition',
                    paid ? 'border-leaf-200 bg-leaf-50 text-leaf-700' : 'border-cream-200 bg-white text-maroon-700 active:bg-cream-100',
                  )}
                >
                  {paid ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  {paid ? 'Paid — tap to undo' : `Mark ${formatINR(outstanding(s))} as paid`}
                </button>
              )}
            </section>
          );
        })}
      </div>

      {lunch.additionalCharges.length > 0 && (
        <section className="card p-4">
          <h3 className="mb-2 font-bold">Additional charges</h3>
          <ul className="space-y-1.5 text-sm">
            {lunch.additionalCharges.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>
                  {c.label} <span className="text-xs text-ink-400">· {c.allocation === 'equal' ? 'split equally' : 'by food cost'}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatINR(c.amount, { signed: true })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="card flex justify-between p-4 text-[15px] font-bold">
        <span>Total of all shares</span>
        <span className="tabular-nums text-maroon-800">{formatINR(lunch.totalAmount)}</span>
      </div>
    </div>
  );
}
