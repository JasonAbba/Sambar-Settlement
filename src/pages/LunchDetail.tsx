import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import { useLookups, useStore } from '../data/store';
import { orderUnits } from '../types';
import { formatINR } from '../lib/money';
import { formatDate } from '../lib/util';
import { Avatar, Badge, EmptyState } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';
import { BadgeIcons, ShareLunch } from '../components/Badges';

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
  const shares = data.settlements.filter((s) => s.lunchRecordId === lunch.id);
  const payerId = lunch.paidByUserId;
  const payer = userName(payerId);
  const payerShare = shares.find((s) => s.userId === payerId);
  const others = lunch.attendees.filter((id) => id !== payerId);
  const toCollect = shares.filter((s) => s.userId !== payerId).reduce((a, s) => a + s.amountOwed, 0);
  const diff = lunch.actualBillAmount == null ? 0 : lunch.actualBillAmount - lunch.totalAmount;
  const dishCount = Math.round(orders.reduce((a, o) => a + orderUnits(o), 0));

  const del = async () => {
    if (
      await confirm({
        title: 'Delete this lunch?',
        message: 'The lunch and everyone’s orders will be permanently deleted.',
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

      {/* Headline: who paid, who pays them back */}
      <section className="relative overflow-hidden rounded-3xl bg-maroon-800 p-5 text-cream-50 shadow-lift">
        <div className="kolam-bg absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl">{formatDate(lunch.date)}</h1>
            {lunch.isDemo && <Badge tone="demo">Demo data</Badge>}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Avatar id={payerId} name={payer} size="lg" />
            <div>
              <div className="text-xl font-extrabold">
                {payer} paid {formatINR(lunch.actualBillAmount ?? lunch.totalAmount)}
              </div>
              <div className="text-sm text-cream-200">
                {payerShare ? <>Own share {formatINR(payerShare.amountOwed)} · </> : null}
                to collect {formatINR(toCollect)}
              </div>
            </div>
          </div>

          {others.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {others.map((id) => {
                const s = shares.find((x) => x.userId === id);
                return (
                  <li key={id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-[15px]">
                    <span className="truncate font-semibold">
                      {userName(id)} pays {payer}
                    </span>
                    <span className="font-extrabold tabular-nums text-mustard-200">{formatINR(s?.amountOwed ?? 0)}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mustard-300">Food</div>
              <div className="font-extrabold tabular-nums">{formatINR(lunch.subtotal)}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mustard-300">Extras</div>
              <div className="font-extrabold tabular-nums">{formatINR(lunch.totalAmount - lunch.subtotal, { signed: true })}</div>
            </div>
            <div className="rounded-xl bg-mustard-400 p-2.5 text-ink-900">
              <div className="text-[10px] font-bold uppercase tracking-wider">Total</div>
              <div className="font-extrabold tabular-nums">{formatINR(lunch.totalAmount)}</div>
            </div>
          </div>
        </div>
      </section>

      <ShareLunch lunchId={lunch.id} />

      {diff !== 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-maroon-300 bg-maroon-50 p-3 text-sm text-maroon-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            The bill was {formatINR(lunch.actualBillAmount!)} but the shares add up to {formatINR(lunch.totalAmount)} (difference{' '}
            <strong>{formatINR(diff, { signed: true })}</strong>). <Link to={`/split/${lunch.id}`} className="font-bold underline">Edit</Link> to fix it.
          </span>
        </div>
      )}

      <h2 className="section-title mb-0">
        Who ate what <span className="font-sans text-sm font-semibold text-ink-400">· {lunch.attendees.length} people · {dishCount} dishes</span>
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {lunch.attendees.map((id) => {
          const s = shares.find((x) => x.userId === id);
          const mine = orders.filter((o) => o.userId === id);
          const isPayer = id === payerId;
          return (
            <section key={id} className="card overflow-hidden">
              <header className="flex items-center gap-3 px-4 py-3">
                <Avatar id={id} name={userName(id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-bold">{userName(id)}</span>
                    <BadgeIcons userId={id} max={3} />
                  </div>
                  <div className="text-xs text-ink-500">{isPayer ? 'Paid the bill' : `Pays ${payer}`}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold tabular-nums text-maroon-800">{formatINR(s?.amountOwed ?? 0)}</div>
                  {isPayer && <Badge tone="paid">Payer</Badge>}
                </div>
              </header>
              <ul className="space-y-1 border-t border-cream-200 bg-cream-50/60 px-4 py-2.5 text-sm">
                {mine.length === 0 && <li className="text-ink-400">No dishes</li>}
                {mine.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2">
                    <span className="min-w-0 text-ink-700">
                      <span className="block truncate">
                        {o.itemNameSnapshot} <span className="text-ink-400">× {o.quantity}</span>
                      </span>
                      {o.shareUserIds && o.shareUserIds.length > 1 && (
                        <span className="block text-xs text-terracotta-600">
                          🤝 shared ÷{o.shareUserIds.length} with{' '}
                          {o.shareUserIds.filter((u) => u !== id).map(userName).join(', ')} · {formatINR(o.unitPriceSnapshot * o.quantity)} total
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-700">{formatINR(o.totalPrice)}</span>
                  </li>
                ))}
                {s && s.chargesShare !== 0 && (
                  <>
                    <li className="flex justify-between gap-2 border-t border-dashed border-cream-300 pt-1 text-ink-500">
                      <span>Food</span>
                      <span className="tabular-nums">{formatINR(s.foodTotal)}</span>
                    </li>
                    <li className="flex justify-between gap-2 text-ink-500">
                      <span>Share of extras</span>
                      <span className="tabular-nums">{formatINR(s.chargesShare, { signed: true })}</span>
                    </li>
                  </>
                )}
              </ul>
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
        <span>Total</span>
        <span className="tabular-nums text-maroon-800">{formatINR(lunch.totalAmount)}</span>
      </div>
    </div>
  );
}
