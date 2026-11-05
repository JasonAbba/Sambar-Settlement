import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Handshake,
  Minus,
  Package,
  Pencil,
  Percent,
  Plus,
  PlusCircle,
  Receipt,
  Scale,
  Search,
  Trash2,
  UserPlus,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import { useLookups, useStore } from '../data/store';
import { loadDraftRaw, saveDraftRaw } from '../data/repository';
import {
  computeDraftSplit,
  draftFromRecord,
  draftItemCount,
  draftPortions,
  emptyDraft,
  lineParticipants,
  lineTotal,
  sortAttendees,
  type DraftLine,
  type LunchDraft,
} from '../lib/lunch';
import { formatINR, isValidRupeeInput, paiseToInput, parseRupees } from '../lib/money';
import { cx, formatDate, uid } from '../lib/util';
import { Avatar, AvatarStack, Badge, EmptyState, QtyStepper, RupeeInput } from '../components/ui';
import { allocate } from '../lib/split';
import { Modal } from '../components/Modal';
import { DishImage } from '../components/DishArt';
import { useConfirm, useToast } from '../components/feedback';
import type { AdditionalCharge, ChargeKind, MenuItem } from '../types';

const STEPS = ['Details', 'Who came', 'Orders', 'Bill', 'Split'] as const;

const CHARGE_PRESETS: { kind: ChargeKind; label: string; icon: typeof Package }[] = [
  { kind: 'parcel', label: 'Parcel charges', icon: Package },
  { kind: 'extra', label: 'Extra items', icon: PlusCircle },
  { kind: 'discount', label: 'Discount', icon: Percent },
  { kind: 'other', label: 'Other charges', icon: Receipt },
];

export default function SplitLunch() {
  const { lunchId } = useParams();
  const store = useStore();
  const { data } = store;
  const { userName } = useLookups();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const isEdit = !!lunchId;
  const [draft, setDraft] = useState<LunchDraft | null>(() => {
    if (lunchId) return draftFromRecord(data, lunchId);
    return loadDraftRaw<LunchDraft>() ?? emptyDraft();
  });
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(isEdit ? STEPS.length - 1 : 0);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Persist new-lunch drafts so a refresh / accidental tap away loses nothing.
  useEffect(() => {
    if (!isEdit && draft) saveDraftRaw(draft);
  }, [draft, isEdit]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
    window.scrollTo({ top: 0 });
  }, [step]);

  const split = useMemo(() => (draft ? computeDraftSplit(draft) : null), [draft]);

  if (!draft || !split) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-6 w-6" />}
        title="Lunch not found"
        message="It may have been deleted."
        action={<Link to="/history" className="btn btn-primary">Back to history</Link>}
      />
    );
  }

  const update = (patch: Partial<LunchDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setLines = (userId: string, fn: (lines: DraftLine[]) => DraftLine[]) =>
    setDraft((d) => (d ? { ...d, orders: { ...d.orders, [userId]: fn(d.orders[userId] ?? []) } } : d));

  const billValid = isValidRupeeInput(draft.actualBillInput);
  const actualBill = draft.actualBillInput.trim() ? parseRupees(draft.actualBillInput) : null;
  const itemCount = draftItemCount(draft);
  const userOrder = data.users.map((u) => u.id);

  const validate = async (s: number): Promise<boolean> => {
    if (s === 0) {
      if (!draft.date) return fail('Please choose the lunch date.');
      if (!draft.paidByUserId) return fail('Who paid the bill? Tap their name.');
      if (!billValid) return fail('Bill amount should be a number like 840 or 840.50.');
    }
    if (s === 1 && draft.attendees.length === 0) return fail('Select at least one person who came for lunch.');
    if (s === 2) {
      if (itemCount === 0) return fail('Add at least one dish.');
      const eating = new Set(draftPortions(draft).map((p) => p.userId));
      const empty = draft.attendees.filter((id) => !eating.has(id));
      if (empty.length) {
        return confirm({
          title: 'Some people have no dishes',
          message: (
            <>
              <strong>{empty.map(userName).join(', ')}</strong> {empty.length > 1 ? 'have' : 'has'} nothing ordered. They will only share
              any extra charges. Continue anyway?
            </>
          ),
          confirmLabel: 'Continue',
        });
      }
    }
    if (s === 3) {
      if (!billValid) return fail('Bill amount should be a number like 840 or 840.50.');
      if (draft.charges.some((c) => !c.label.trim())) return fail('Give each extra charge a name.');
      if (split.total < 0) return fail('Discounts are larger than the bill. Please check them.');
    }
    return true;
  };
  function fail(msg: string) {
    toast.error(msg);
    return false;
  }

  const goTo = async (target: number) => {
    if (target > step) {
      for (let s = step; s < target; s++) if (!(await validate(s))) return;
    }
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
  };

  const save = async () => {
    for (let s = 0; s < 4; s++) {
      if (!(await validate(s))) {
        setStep(s);
        return;
      }
    }
    const cleaned: LunchDraft = { ...draft, charges: draft.charges.filter((c) => c.amount !== 0) };
    const res = store.saveLunch(cleaned, actualBill);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (!isEdit) saveDraftRaw(null);
    toast.success(isEdit ? 'Lunch updated.' : 'Lunch saved! Shares are ready.');
    navigate(`/history/${res.value}`, { replace: true });
  };

  const discard = async () => {
    if (
      await confirm({
        title: isEdit ? 'Discard changes?' : 'Discard this lunch?',
        message: isEdit ? 'Your edits will be lost.' : 'Everything entered for this lunch will be cleared.',
        confirmLabel: 'Discard',
        danger: true,
      })
    ) {
      if (isEdit) navigate(`/history/${lunchId}`);
      else {
        saveDraftRaw(null);
        setDraft(emptyDraft());
        setStep(0);
        setMaxStep(0);
      }
    }
  };

  const payerName = draft.paidByUserId ? userName(draft.paidByUserId) : '—';
  const isLast = step === STEPS.length - 1;

  return (
    <div ref={topRef} className="scroll-mt-20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] leading-tight text-maroon-800 sm:text-3xl">
            {isEdit ? 'Edit lunch' : 'Split today’s lunch'}
          </h1>
          <p className="text-sm text-ink-500">{formatDate(draft.date)}</p>
        </div>
        <button onClick={discard} className="btn btn-ghost btn-sm -mr-2">
          <X className="h-4 w-4" /> {isEdit ? 'Cancel' : 'Discard'}
        </button>
      </div>

      {/* Stepper */}
      <ol className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STEPS.map((label, i) => {
          const reachable = i <= maxStep;
          return (
            <li key={label} className="flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => goTo(i)}
                className="group w-full min-w-[60px] text-left"
                aria-current={i === step ? 'step' : undefined}
              >
                <div
                  className={cx(
                    'h-1.5 rounded-full transition',
                    i < step ? 'bg-leaf-500' : i === step ? 'bg-maroon-700' : 'bg-cream-300',
                  )}
                />
                <div
                  className={cx(
                    'mt-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide',
                    i === step ? 'text-maroon-700' : reachable ? 'text-ink-500' : 'text-ink-400/60',
                  )}
                >
                  {i < step ? <Check className="h-3 w-3 text-leaf-600" /> : <span>{i + 1}</span>}
                  <span className="truncate">{label}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 0 && <StepDetails draft={draft} update={update} billValid={billValid} />}
      {step === 1 && <StepAttendees draft={draft} update={update} userOrder={userOrder} />}
      {step === 2 && (
        <StepOrders draft={draft} setLines={setLines} openPicker={setPickerFor} totals={split.rows} />
      )}
      {step === 3 && (
        <StepBill draft={draft} update={update} split={split} itemCount={itemCount} actualBill={actualBill} billValid={billValid} payerName={payerName} />
      )}
      {step === 4 && <StepSummary draft={draft} split={split} actualBill={actualBill} />}

      {/* Sticky action bar (above the iOS home indicator) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-cream-50/95 backdrop-blur lg:left-64 pb-safe">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {draft.attendees.length} {draft.attendees.length === 1 ? 'person' : 'people'} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </div>
            <div className="truncate text-lg font-extrabold tabular-nums text-maroon-800">{formatINR(split.total)}</div>
          </div>
          {step > 0 && (
            <button className="btn btn-secondary w-12 px-0 sm:w-auto sm:px-4" onClick={() => setStep(step - 1)} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          {isLast ? (
            <button className="btn btn-leaf px-5" onClick={save}>
              <CheckCircle2 className="h-5 w-5" /> {isEdit ? 'Save changes' : 'Confirm & save'}
            </button>
          ) : (
            <button className="btn btn-primary px-5" onClick={() => goTo(step + 1)}>
              Next <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {pickerFor && (
        <ItemPicker
          userId={pickerFor}
          userName={userName(pickerFor)}
          lines={draft.orders[pickerFor] ?? []}
          menu={data.menuItems}
          onClose={() => setPickerFor(null)}
          setLines={(fn) => setLines(pickerFor, fn)}
        />
      )}
    </div>
  );
}

/* ---------------- Step 1: details ---------------- */

function StepDetails({ draft, update, billValid }: { draft: LunchDraft; update: (p: Partial<LunchDraft>) => void; billValid: boolean }) {
  const { data } = useStore();
  const people = data.users.filter((u) => u.isActive || u.id === draft.paidByUserId);

  const choosePayer = (id: string) => {
    // The payer almost always ate too: pre-select them as an attendee.
    const attendees = draft.attendees.includes(id) ? draft.attendees : [...draft.attendees, id];
    update({ paidByUserId: id, attendees });
  };

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <label className="label" htmlFor="lunch-date">Lunch date</label>
        <input id="lunch-date" type="date" className="input" value={draft.date} onChange={(e) => update({ date: e.target.value })} />
      </div>

      <div className="card p-4">
        <div className="label flex items-center gap-2">
          <Wallet className="h-4 w-4 text-terracotta-500" /> Who paid the bill?
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {people.map((u) => {
            const on = draft.paidByUserId === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => choosePayer(u.id)}
                aria-pressed={on}
                className={cx(
                  'flex min-h-[52px] items-center gap-2.5 rounded-xl border px-3 text-left text-[15px] font-semibold transition',
                  on ? 'border-maroon-700 bg-maroon-700 text-cream-50 shadow-sm' : 'border-cream-300 bg-white active:bg-cream-100',
                )}
              >
                <Avatar id={u.id} name={u.name} size="sm" />
                <span className="truncate">{u.name}</span>
                {on && <Check className="ml-auto h-4 w-4 shrink-0 text-mustard-300" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-4">
        <label className="label" htmlFor="bill">
          Total on the restaurant bill <span className="font-normal text-ink-400">(optional)</span>
        </label>
        <RupeeInput id="bill" value={draft.actualBillInput} onChange={(v) => update({ actualBillInput: v })} placeholder="e.g. 840" invalid={!billValid} />
        <p className="mt-2 text-xs text-ink-500">Used to double-check the dishes add up to the bill. Shares are calculated from what each person ordered.</p>
      </div>
    </div>
  );
}

/* ---------------- Step 2: attendees ---------------- */

function StepAttendees({ draft, update, userOrder }: { draft: LunchDraft; update: (p: Partial<LunchDraft>) => void; userOrder: string[] }) {
  const store = useStore();
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const people = store.data.users.filter((u) => u.isActive || draft.attendees.includes(u.id));
  const selected = new Set(draft.attendees);

  const toggle = (id: string) => {
    const next = selected.has(id) ? draft.attendees.filter((x) => x !== id) : sortAttendees([...draft.attendees, id], userOrder);
    update({ attendees: next });
  };

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.addUser(newName);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    update({ attendees: [...draft.attendees, res.value.id] });
    setNewName('');
    toast.success(`${res.value.name} added to the group and to today’s lunch.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink-700">
          <span className="text-lg font-extrabold text-maroon-700">{draft.attendees.length}</span> of {people.length} came for lunch
        </p>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-sm" onClick={() => update({ attendees: sortAttendees(people.map((p) => p.id), userOrder) })}>
            All
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => update({ attendees: [] })}>
            None
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {people.map((u) => {
          const on = selected.has(u.id);
          return (
            <label
              key={u.id}
              className={cx(
                'relative flex min-h-[60px] cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-3 transition',
                on ? 'border-leaf-500 bg-leaf-50 shadow-sm' : 'border-cream-200 bg-white opacity-70',
              )}
            >
              <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(u.id)} />
              <Avatar id={u.id} name={u.name} size="sm" className={cx(!on && 'grayscale')} />
              <span className={cx('min-w-0 flex-1 truncate text-[15px] font-semibold', on ? 'text-leaf-800' : 'text-ink-500')}>{u.name}</span>
              <span
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition',
                  on ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-cream-300 bg-white',
                )}
              >
                {on && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              {u.id === draft.paidByUserId && (
                <span className="absolute -top-2 left-3 rounded-full bg-mustard-400 px-1.5 text-[10px] font-bold uppercase text-ink-900">Paid</span>
              )}
            </label>
          );
        })}
      </div>

      <form onSubmit={addPerson} className="card flex gap-2 p-3">
        <input
          className="input"
          placeholder="Someone new joined? Add name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoCapitalize="words"
          enterKeyHint="done"
        />
        <button type="submit" className="btn btn-secondary shrink-0" disabled={!newName.trim()}>
          <UserPlus className="h-5 w-5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>
    </div>
  );
}

/* ---------------- Step 3: orders ---------------- */

function StepOrders({
  draft,
  setLines,
  openPicker,
  totals,
}: {
  draft: LunchDraft;
  setLines: (userId: string, fn: (l: DraftLine[]) => DraftLine[]) => void;
  openPicker: (userId: string) => void;
  totals: { userId: string; foodTotal: number }[];
}) {
  const { userName } = useLookups();
  const foodOf = (id: string) => totals.find((t) => t.userId === id)?.foodTotal ?? 0;
  const [sharing, setSharing] = useState<{ ownerId: string; key: string } | null>(null);
  const portions = useMemo(() => draftPortions(draft), [draft]);
  const portionOf = (ownerId: string, key: string, userId: string) =>
    portions.find((p) => p.ownerId === ownerId && p.line.key === key && p.userId === userId);

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">
        Tap <strong>Add dishes</strong> under each person. Shared a dish? Add it to whoever ordered it, then tap{' '}
        <span className="inline-flex translate-y-0.5 items-center rounded-md bg-terracotta-100 px-1 text-terracotta-600">
          <Handshake className="h-4 w-4" />
        </span>{' '}
        to split it.
      </p>
      {draft.attendees.map((id) => {
        const lines = draft.orders[id] ?? [];
        // Dishes someone else ordered that this person shared.
        const incoming = portions.filter((p) => p.userId === id && p.ownerId !== id);
        return (
          <section key={id} className="card overflow-hidden">
            <header className="flex items-center gap-3 border-b border-cream-200 bg-cream-50 px-4 py-3">
              <Avatar id={id} name={userName(id)} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-base font-bold">{userName(id)}</span>
                  {id === draft.paidByUserId && <Badge tone="pending">Paid bill</Badge>}
                </div>
                <div className="text-xs text-ink-500">
                  {lines.reduce((a, l) => a + l.quantity, 0)} item(s){incoming.length > 0 && ` + ${incoming.length} shared`}
                </div>
              </div>
              <div className="text-right text-lg font-extrabold tabular-nums text-maroon-800">{formatINR(foodOf(id))}</div>
            </header>
            {(lines.length > 0 || incoming.length > 0) && (
              <ul className="divide-y divide-cream-200">
                {lines.map((l) => {
                  const parts = lineParticipants(draft, id, l);
                  const shared = parts.length > 1;
                  const mine = portionOf(id, l.key, id)?.amount ?? lineTotal(l);
                  return (
                    <li key={l.key} className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[15px] font-semibold leading-snug">{l.name}</div>
                          <div className="text-xs tabular-nums text-ink-500">
                            {formatINR(l.unitPrice)} × {l.quantity} = <strong className="text-ink-700">{formatINR(lineTotal(l))}</strong>
                          </div>
                        </div>
                        <QtyStepper
                          value={l.quantity}
                          min={1}
                          onChange={(q) => setLines(id, (ls) => ls.map((x) => (x.key === l.key ? { ...x, quantity: q } : x)))}
                        />
                        <button
                          className={cx('icon-btn', shared ? 'bg-terracotta-100 text-terracotta-600' : 'text-ink-500')}
                          aria-label={`Share ${l.name} with others`}
                          title="Shared this dish? Split it"
                          onClick={() => setSharing({ ownerId: id, key: l.key })}
                        >
                          <Handshake className="h-[18px] w-[18px]" />
                        </button>
                        <button
                          className="icon-btn -mr-2 text-maroon-600"
                          aria-label={`Remove ${l.name}`}
                          onClick={() => setLines(id, (ls) => ls.filter((x) => x.key !== l.key))}
                        >
                          <Trash2 className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                      {shared && (
                        <button
                          onClick={() => setSharing({ ownerId: id, key: l.key })}
                          className="mt-1.5 flex w-full items-center gap-2 rounded-lg bg-terracotta-100/60 px-2.5 py-1.5 text-left text-xs text-terracotta-600"
                        >
                          <AvatarStack people={parts.map((p) => ({ id: p, name: userName(p) }))} max={4} />
                          <span className="min-w-0 flex-1">
                            Shared ÷{parts.length} · {userName(id)}’s part <strong className="tabular-nums">{formatINR(mine)}</strong>
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
                {incoming.map((p) => (
                  <li key={`${p.ownerId}-${p.line.key}`} className="flex items-center gap-2 bg-terracotta-100/40 px-4 py-2.5">
                    <Handshake className="h-5 w-5 shrink-0 text-terracotta-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{p.line.name}</div>
                      <div className="text-xs text-ink-500">
                        Shared ÷{p.participants.length} from {userName(p.ownerId)}’s order ({formatINR(lineTotal(p.line))})
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-ink-700">{formatINR(p.amount)}</span>
                    <button
                      className="icon-btn -mr-2 text-ink-500"
                      aria-label={`Edit sharing of ${p.line.name}`}
                      onClick={() => setSharing({ ownerId: p.ownerId, key: p.line.key })}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="p-3">
              <button className="btn btn-secondary w-full border-dashed text-maroon-700" onClick={() => openPicker(id)}>
                <Plus className="h-5 w-5" /> {lines.length ? 'Add more dishes' : 'Add dishes'}
              </button>
            </div>
          </section>
        );
      })}

      {sharing && (
        <SharePicker
          draft={draft}
          ownerId={sharing.ownerId}
          lineKey={sharing.key}
          onClose={() => setSharing(null)}
          setSharedWith={(ids) =>
            setLines(sharing.ownerId, (ls) => ls.map((x) => (x.key === sharing.key ? { ...x, sharedWith: ids } : x)))
          }
        />
      )}
    </div>
  );
}

/** Choose who shared a dish; cost is split equally to the paisa. */
function SharePicker({
  draft,
  ownerId,
  lineKey,
  onClose,
  setSharedWith,
}: {
  draft: LunchDraft;
  ownerId: string;
  lineKey: string;
  onClose: () => void;
  setSharedWith: (ids: string[]) => void;
}) {
  const { userName } = useLookups();
  const line = (draft.orders[ownerId] ?? []).find((l) => l.key === lineKey);
  if (!line) return null;
  const selected = new Set((line.sharedWith ?? []).filter((id) => draft.attendees.includes(id)));
  const others = draft.attendees.filter((id) => id !== ownerId);
  const parts = lineParticipants(draft, ownerId, line);
  const amounts = allocate(lineTotal(line), parts.map(() => 1));
  const each = (uid: string) => amounts[parts.indexOf(uid)] ?? 0;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSharedWith([...next]);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Share ${line.name}`}
      footer={
        <button className="btn btn-primary w-full" onClick={onClose}>
          <Check className="h-5 w-5" />
          {parts.length > 1 ? `Split ÷${parts.length} · ${formatINR(lineTotal(line))}` : 'Not shared · Done'}
        </button>
      }
    >
      <p className="mb-3 text-sm text-ink-700">
        <strong>{userName(ownerId)}</strong> ordered {line.quantity > 1 ? `${line.quantity}× ` : ''}
        {line.name} ({formatINR(lineTotal(line))}). Who shared it? The cost is split equally.
      </p>

      <div className="mb-3 flex gap-2">
        <button className="btn btn-secondary btn-sm" onClick={() => setSharedWith(others)}>
          <Users className="h-4 w-4" /> Everyone
        </button>
        {selected.size > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSharedWith([])}>
            Not shared
          </button>
        )}
      </div>

      <div className="mb-2 flex items-center gap-2.5 rounded-xl border-2 border-terracotta-300 bg-terracotta-100/50 px-3 py-2.5">
        <Avatar id={ownerId} name={userName(ownerId)} size="sm" />
        <span className="flex-1 text-[15px] font-semibold">{userName(ownerId)} <span className="text-xs font-normal text-ink-500">(ordered it)</span></span>
        <span className="font-bold tabular-nums">{formatINR(each(ownerId))}</span>
      </div>
      <div className="grid gap-2">
        {others.map((id) => {
          const on = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={on}
              className={cx(
                'flex min-h-[52px] items-center gap-2.5 rounded-xl border-2 px-3 text-left transition',
                on ? 'border-leaf-500 bg-leaf-50' : 'border-cream-200 bg-white',
              )}
            >
              <span
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2',
                  on ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-cream-300',
                )}
              >
                {on && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              <Avatar id={id} name={userName(id)} size="sm" />
              <span className="flex-1 text-[15px] font-semibold">{userName(id)}</span>
              {on && <span className="font-bold tabular-nums text-leaf-700">{formatINR(each(id))}</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function ItemPicker({
  userName,
  lines,
  menu,
  onClose,
  setLines,
}: {
  userId: string;
  userName: string;
  lines: DraftLine[];
  menu: MenuItem[];
  onClose: () => void;
  setLines: (fn: (l: DraftLine[]) => DraftLine[]) => void;
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const toast = useToast();

  const available = menu.filter((m) => m.isAvailable);
  const categories = ['All', ...Array.from(new Set(available.map((m) => m.category)))];
  const shown = available.filter(
    (m) => (cat === 'All' || m.category === cat) && m.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  // The picker only touches this person's own (unshared) lines; shared dishes are managed with 🤝.
  const solo = (l: DraftLine) => !l.sharedWith?.length;
  const qtyOf = (id: string) => lines.find((l) => l.menuItemId === id && solo(l))?.quantity ?? 0;
  const total = lines.reduce((a, l) => a + lineTotal(l), 0);
  const count = lines.reduce((a, l) => a + l.quantity, 0);

  const add = (m: MenuItem) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.menuItemId === m.id && solo(l));
      if (existing) return ls.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { key: uid('ln'), menuItemId: m.id, name: m.name, unitPrice: m.price, quantity: 1 }];
    });
  const remove = (m: MenuItem) =>
    setLines((ls) =>
      ls.flatMap((l) => (l.menuItemId !== m.id || !solo(l) ? [l] : l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : [])),
    );

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseRupees(customPrice);
    if (!customName.trim()) return toast.error('Enter the dish name.');
    if (price == null || price <= 0) return toast.error('Enter a valid price.');
    setLines((ls) => [...ls, { key: uid('ln'), menuItemId: null, name: customName.trim(), unitPrice: price, quantity: 1 }]);
    setCustomName('');
    setCustomPrice('');
    toast.success(`Added ${customName.trim()}.`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Dishes for ${userName}`}
      size="lg"
      footer={
        <button className="btn btn-primary w-full" onClick={onClose}>
          <Check className="h-5 w-5" /> Done · {count} item{count === 1 ? '' : 's'} · {formatINR(total)}
        </button>
      }
    >
      <div className="-mx-5 -mt-4 mb-3 space-y-2 bg-cream-50 px-5 pb-1 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-11"
            placeholder="Search dishes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            enterKeyHint="search"
          />
        </div>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {categories.map((c) => (
            <button key={c} className={cx('chip', c === cat ? 'chip-on' : 'chip-off')} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && <p className="py-6 text-center text-sm text-ink-500">No dishes match. Add a custom item below.</p>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {shown.map((m) => {
          const n = qtyOf(m.id);
          return (
            <div
              key={m.id}
              className={cx(
                'relative overflow-hidden rounded-2xl border-2 bg-white transition',
                n ? 'border-leaf-500 shadow-sm' : 'border-cream-200',
              )}
            >
              <button type="button" onClick={() => add(m)} className="block w-full text-left active:opacity-80" aria-label={`Add ${m.name}`}>
                <div className="aspect-[4/3] w-full overflow-hidden bg-cream-200">
                  <DishImage image={m.image} category={m.category} alt={m.name} />
                </div>
                <div className="px-2.5 pb-2.5 pt-2">
                  <div className="line-clamp-2 min-h-[2.5em] text-sm font-bold leading-tight">{m.name}</div>
                  <div className="mt-1 text-sm font-extrabold tabular-nums text-maroon-700">{formatINR(m.price)}</div>
                </div>
              </button>
              {n > 0 ? (
                <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-leaf-600 p-0.5 text-white shadow">
                  <button className="flex h-8 w-8 items-center justify-center rounded-full active:bg-leaf-700" onClick={() => remove(m)} aria-label={`Remove one ${m.name}`}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span key={n} className="pop min-w-[1.25rem] text-center text-sm font-extrabold">{n}</span>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full active:bg-leaf-700" onClick={() => add(m)} aria-label={`Add one more ${m.name}`}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <span className="pointer-events-none absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-maroon-700 shadow">
                  <Plus className="h-5 w-5" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={addCustom} className="mt-5 rounded-2xl border border-dashed border-cream-300 p-3">
        <div className="mb-2 text-sm font-bold text-ink-700">Not on the menu? Add a one-off item</div>
        <div className="flex gap-2">
          <input className="input" placeholder="Dish name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
          <RupeeInput value={customPrice} onChange={setCustomPrice} placeholder="Price" className="w-28 shrink-0" />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm mt-2 w-full">
          <Plus className="h-4 w-4" /> Add custom item
        </button>
      </form>
    </Modal>
  );
}

/* ---------------- Step 4: bill & charges ---------------- */

function StepBill({
  draft,
  update,
  split,
  itemCount,
  actualBill,
  billValid,
  payerName,
}: {
  draft: LunchDraft;
  update: (p: Partial<LunchDraft>) => void;
  split: ReturnType<typeof computeDraftSplit>;
  itemCount: number;
  actualBill: number | null;
  billValid: boolean;
  payerName: string;
}) {
  const diff = actualBill == null ? null : actualBill - split.total;

  const addCharge = (kind: ChargeKind, label: string, amount = 0, allocation: AdditionalCharge['allocation'] = 'equal') =>
    update({ charges: [...draft.charges, { id: uid('chg'), kind, label, amount, allocation }] });
  const setCharge = (id: string, patch: Partial<AdditionalCharge>) =>
    update({ charges: draft.charges.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <MiniStat label="Attendees" value={draft.attendees.length} />
        <MiniStat label="Items ordered" value={itemCount} />
        <MiniStat label="Food total" value={formatINR(split.subtotal)} />
        <MiniStat label="Paid by" value={payerName} />
        <MiniStat label="Extra charges" value={formatINR(split.chargesTotal, { signed: true })} />
        <MiniStat label="Calculated total" value={formatINR(split.total)} strong />
      </div>

      <div className="card p-4">
        <label className="label" htmlFor="bill2">Amount on the restaurant bill</label>
        <RupeeInput id="bill2" value={draft.actualBillInput} onChange={(v) => update({ actualBillInput: v })} placeholder="optional" invalid={!billValid} />
        {diff !== null && diff !== 0 && (
          <div className="mt-3 rounded-xl border border-maroon-300 bg-maroon-50 p-3">
            <div className="flex items-start gap-2 text-sm text-maroon-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-maroon-600" />
              <div>
                <strong>Bill doesn’t match.</strong> The bill is <strong>{formatINR(Math.abs(diff))} {diff > 0 ? 'more' : 'less'}</strong> than the dishes +
                charges entered ({formatINR(actualBill!)} vs {formatINR(split.total)}). Check for a missed dish or price change, or split the
                difference.
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm mt-3 w-full"
              onClick={() => addCharge('adjustment', diff > 0 ? 'Bill difference (tax / rounding)' : 'Bill difference (reduction)', diff, 'proportional')}
            >
              <Scale className="h-4 w-4" /> Add {formatINR(diff, { signed: true })} as an adjustment
            </button>
          </div>
        )}
        {diff === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-leaf-50 p-3 text-sm font-semibold text-leaf-700">
            <CheckCircle2 className="h-5 w-5" /> Matches the bill exactly.
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">Additional charges & discounts</h3>
        </div>
        <p className="mb-3 text-xs text-ink-500">Split equally by default, or by food cost (people who ordered more pay more).</p>

        <div className="space-y-3">
          {draft.charges.map((c) => (
            <ChargeRow key={c.id} charge={c} onChange={(p) => setCharge(c.id, p)} onRemove={() => update({ charges: draft.charges.filter((x) => x.id !== c.id) })} />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {CHARGE_PRESETS.map(({ kind, label, icon: Icon }) => (
            <button key={kind} className="btn btn-secondary btn-sm justify-start" onClick={() => addCharge(kind, label)}>
              <Icon className="h-4 w-4 text-terracotta-500" /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChargeRow({ charge, onChange, onRemove }: { charge: AdditionalCharge; onChange: (p: Partial<AdditionalCharge>) => void; onRemove: () => void }) {
  const isDiscount = charge.kind === 'discount';
  const isAdjustment = charge.kind === 'adjustment';
  const [input, setInput] = useState(paiseToInput(Math.abs(charge.amount)) === '0' ? '' : paiseToInput(Math.abs(charge.amount)));
  const negative = isDiscount || (isAdjustment && charge.amount < 0);

  return (
    <div className={cx('rounded-xl border p-3', negative ? 'border-leaf-300 bg-leaf-50/60' : 'border-cream-300 bg-cream-50')}>
      <div className="flex items-center gap-2">
        <input className="input min-h-[44px]" value={charge.label} onChange={(e) => onChange({ label: e.target.value })} aria-label="Charge name" />
        <button className="icon-btn text-maroon-600" onClick={onRemove} aria-label="Remove charge">
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cx('w-4 text-center text-lg font-bold', negative ? 'text-leaf-600' : 'text-maroon-600')}>{negative ? '−' : '+'}</span>
          <RupeeInput
            className="w-32"
            value={input}
            invalid={!isValidRupeeInput(input)}
            onChange={(v) => {
              setInput(v);
              const p = parseRupees(v) ?? 0;
              onChange({ amount: negative ? -p : p });
            }}
          />
        </div>
        <div className="ml-auto inline-flex rounded-xl border border-cream-300 bg-white p-0.5 text-xs font-bold">
          {(['equal', 'proportional'] as const).map((mode) => (
            <button
              key={mode}
              className={cx('min-h-[38px] rounded-lg px-3 transition', charge.allocation === mode ? 'bg-maroon-700 text-cream-50' : 'text-ink-500')}
              onClick={() => onChange({ allocation: mode })}
            >
              {mode === 'equal' ? 'Equally' : 'By food cost'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cx('rounded-xl p-3', strong ? 'bg-maroon-700 text-cream-50' : 'bg-white shadow-card')}>
      <div className={cx('text-[11px] font-bold uppercase tracking-wider', strong ? 'text-mustard-300' : 'text-ink-400')}>{label}</div>
      <div className="mt-0.5 truncate text-lg font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

/* ---------------- Step 5: final split ---------------- */

function StepSummary({ draft, split, actualBill }: { draft: LunchDraft; split: ReturnType<typeof computeDraftSplit>; actualBill: number | null }) {
  const { userName } = useLookups();
  const payer = draft.paidByUserId;
  const payerRow = split.rows.find((r) => r.userId === payer);
  const portions = draftPortions(draft);
  const paidAmount = actualBill ?? split.total;
  const others = split.rows.filter((r) => r.userId !== payer);
  const diff = actualBill == null ? 0 : actualBill - split.total;

  return (
    <div className="space-y-5">
      <div className="leaf-bg overflow-hidden rounded-3xl p-5 text-cream-50 shadow-lift">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-mustard-300">{formatDate(draft.date)}</div>
        <div className="mt-2 flex items-center gap-3">
          <Avatar id={payer} name={userName(payer)} size="lg" />
          <div>
            <div className="text-2xl font-extrabold">{userName(payer)} paid {formatINR(paidAmount)}</div>
            <div className="text-sm text-cream-100">
              {payerRow ? <>Own share: <strong>{formatINR(payerRow.finalShare)}</strong></> : 'Did not eat — everyone pays them back in full.'}
            </div>
          </div>
        </div>
        {others.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {others.map((r) => (
              <li key={r.userId} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-[15px]">
                <span className="font-semibold">{userName(r.userId)} owes {userName(payer)}</span>
                <span className="font-extrabold tabular-nums text-mustard-200">{formatINR(r.finalShare)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {diff !== 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-maroon-300 bg-maroon-50 p-3 text-sm text-maroon-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Shares add up to {formatINR(split.total)}, but the bill says {formatINR(actualBill!)} (difference {formatINR(diff, { signed: true })}). Go back
            to <em>Bill</em> to add an adjustment, or save as-is.
          </span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-[15px]">
          <thead className="bg-cream-50 text-[11px] font-bold uppercase tracking-wider text-ink-400">
            <tr>
              <th className="px-3 py-2.5 text-left">Person</th>
              <th className="px-2 py-2.5 text-right">Food</th>
              <th className="px-2 py-2.5 text-right">Extras</th>
              <th className="px-3 py-2.5 text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {split.rows.map((r) => (
              <tr key={r.userId}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{userName(r.userId)}</span>
                    {r.userId === payer && <Badge tone="paid">Paid</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs leading-snug text-ink-500">
                    {portions
                      .filter((p) => p.userId === r.userId)
                      .map((p) => `${p.line.name}${p.line.quantity > 1 ? ` ×${p.line.quantity}` : ''}${p.participants.length > 1 ? ` (÷${p.participants.length})` : ''}`)
                      .join(', ') || 'No dishes'}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-ink-700">{formatINR(r.foodTotal)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-ink-500">{r.chargesShare ? formatINR(r.chargesShare, { signed: true }) : '—'}</td>
                <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-maroon-800">{formatINR(r.finalShare)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-cream-50 font-bold">
            <tr>
              <td className="px-3 py-3">Total</td>
              <td className="px-2 py-3 text-right tabular-nums">{formatINR(split.subtotal)}</td>
              <td className="px-2 py-3 text-right tabular-nums">{split.chargesTotal ? formatINR(split.chargesTotal, { signed: true }) : '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums text-maroon-800">{formatINR(split.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-center text-xs text-ink-400">Review the split, then tap <strong>Confirm &amp; save</strong>.</p>
    </div>
  );
}
