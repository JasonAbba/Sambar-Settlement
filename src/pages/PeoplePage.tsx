import { useMemo, useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import { useStore } from '../data/store';
import { personBalances } from '../lib/lunch';
import { formatINR } from '../lib/money';
import { Avatar, Badge, PageHeader } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';
import type { User } from '../types';

export default function PeoplePage() {
  const store = useStore();
  const { data } = store;
  const toast = useToast();
  const confirm = useConfirm();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const active = data.users.filter((u) => u.isActive);
  const inactive = data.users.filter((u) => !u.isActive);

  const stats = useMemo(() => {
    const balances = new Map(personBalances(data).map((b) => [b.userId, b]));
    const lunches = new Map<string, number>();
    for (const l of data.lunches) for (const id of l.attendees) lunches.set(id, (lunches.get(id) ?? 0) + 1);
    return { balances, lunches };
  }, [data]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.addUser(newName);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${res.value.name} added.`);
    setNewName('');
  };

  const saveEdit = (u: User) => {
    const res = store.renameUser(u.id, editName);
    if (!res.ok) return toast.error(res.error);
    toast.success('Name updated.');
    setEditingId(null);
  };

  const remove = async (u: User) => {
    const hasHistory = store.userHasHistory(u.id);
    const owes = stats.balances.get(u.id);
    if (
      await confirm({
        title: hasHistory ? `Deactivate ${u.name}?` : `Remove ${u.name}?`,
        message: hasHistory ? (
          <>
            {u.name} appears in past lunches, so they’ll be moved to <strong>Inactive</strong> and kept in history.
            {owes && (owes.owes > 0 || owes.isOwed > 0) && <> Their outstanding balances stay visible in Settlements.</>}
          </>
        ) : (
          <>{u.name} has no lunch history and will be removed completely.</>
        ),
        confirmLabel: hasHistory ? 'Deactivate' : 'Remove',
        danger: true,
      })
    ) {
      const r = store.removeUser(u.id);
      toast.success(r === 'deleted' ? `${u.name} removed.` : `${u.name} deactivated.`);
    }
  };

  const row = (u: User) => {
    const b = stats.balances.get(u.id);
    const n = stats.lunches.get(u.id) ?? 0;
    const isEditing = editingId === u.id;
    return (
      <li key={u.id} className="flex items-center gap-3 px-4 py-3">
        <Avatar id={u.id} name={u.name} size="md" className={u.isActive ? '' : 'grayscale'} />
        {isEditing ? (
          <form className="flex flex-1 items-center gap-1" onSubmit={(e) => { e.preventDefault(); saveEdit(u); }}>
            <input className="input min-h-[44px]" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus autoCapitalize="words" aria-label="Name" />
            <button type="submit" className="icon-btn text-leaf-600" aria-label="Save name"><Check className="h-5 w-5" /></button>
            <button type="button" className="icon-btn" onClick={() => setEditingId(null)} aria-label="Cancel"><X className="h-5 w-5" /></button>
          </form>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold">{u.name}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                <span>{n} lunch{n === 1 ? '' : 'es'}</span>
                {b && b.owes > 0 && <Badge tone="pending">owes {formatINR(b.owes)}</Badge>}
                {b && b.isOwed > 0 && <Badge tone="paid">gets {formatINR(b.isOwed)}</Badge>}
              </div>
            </div>
            {u.isActive ? (
              <>
                <button className="icon-btn" onClick={() => { setEditingId(u.id); setEditName(u.name); }} aria-label={`Rename ${u.name}`}>
                  <Pencil className="h-[18px] w-[18px]" />
                </button>
                <button className="icon-btn -mr-2 text-maroon-600" onClick={() => remove(u)} aria-label={`Remove ${u.name}`}>
                  {store.userHasHistory(u.id) ? <UserMinus className="h-[18px] w-[18px]" /> : <Trash2 className="h-[18px] w-[18px]" />}
                </button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => { store.setUserActive(u.id, true); toast.success(`${u.name} is back.`); }}>
                <RotateCcw className="h-4 w-4" /> Reactivate
              </button>
            )}
          </>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="People" subtitle={`${active.length} in the lunch group`} />

      <form onSubmit={add} className="card mb-5 flex gap-2 p-3">
        <input className="input" placeholder="Add a new person" value={newName} onChange={(e) => setNewName(e.target.value)} autoCapitalize="words" enterKeyHint="done" />
        <button className="btn btn-primary shrink-0" disabled={!newName.trim()}>
          <UserPlus className="h-5 w-5" /> <span className="hidden sm:inline">Add</span>
        </button>
      </form>

      <ul className="card divide-y divide-cream-200">{active.map(row)}</ul>
      {active.length === 0 && <p className="py-6 text-center text-sm text-ink-500">No active people. Add someone above.</p>}

      {inactive.length > 0 && (
        <>
          <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-ink-400">Inactive (kept for history)</h2>
          <ul className="card divide-y divide-cream-200 opacity-80">{inactive.map(row)}</ul>
        </>
      )}
    </div>
  );
}
