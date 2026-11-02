import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, MenuItem, Paise, User } from '../types';
import { LocalStorageRepository, saveDraftRaw, type DataRepository } from './repository';
import { createDemoData, migrateMenu } from './seed';
import { buildLunch, sortAttendees, type LunchDraft } from '../lib/lunch';
import { nowISO, uid } from '../lib/util';
import { useToast } from '../components/feedback';

type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

interface StoreApi {
  data: AppData;
  // people
  addUser(name: string): Result<User>;
  renameUser(id: string, name: string): Result;
  setUserActive(id: string, active: boolean): void;
  /** Hard-deletes a user with no history; users with history are deactivated instead. */
  removeUser(id: string): 'deleted' | 'deactivated';
  userHasHistory(id: string): boolean;
  // menu
  saveMenuItem(item: Omit<MenuItem, 'id' | 'createdAt'> & { id?: string }): Result<MenuItem>;
  deleteMenuItem(id: string): void;
  // lunches
  saveLunch(draft: LunchDraft, actualBill: Paise | null): Result<string>;
  deleteLunch(id: string): void;
  setPaid(lunchId: string, userId: string, paid: boolean): void;
  settleMany(items: { lunchId: string; userId: string }[]): void;
  // data
  resetDemo(): void;
  removeDemoLunches(): number;
  startFresh(): void;
}

const StoreContext = createContext<StoreApi | null>(null);

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');

export function StoreProvider({ children, repository }: { children: ReactNode; repository?: DataRepository }) {
  const repo = useMemo(() => repository ?? new LocalStorageRepository(), [repository]);
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    repo.load().then((loaded) => {
      if (cancelled) return;
      const migrated = loaded ? migrateMenu(loaded) : null;
      const initial = migrated ?? loaded ?? createDemoData();
      if (!loaded || migrated) repo.save(initial).catch(() => undefined);
      dataRef.current = initial;
      setData(initial);
    });
    const unsub = repo.subscribe?.((d) => {
      dataRef.current = d;
      setData(d);
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [repo]);

  const commit = useCallback(
    (fn: (d: AppData) => AppData) => {
      const current = dataRef.current;
      if (!current) return;
      const next = fn(current);
      dataRef.current = next;
      setData(next);
      repo.save(next).catch((e: Error) => toast.error(e.message));
    },
    [repo, toast],
  );

  const api = useMemo<StoreApi | null>(() => {
    if (!data) return null;
    const get = () => dataRef.current!;
    const nameTaken = (name: string, exceptId?: string) =>
      get().users.some((u) => u.id !== exceptId && u.name.toLowerCase() === name.toLowerCase());

    const userHasHistory = (id: string) =>
      get().lunches.some((l) => l.paidByUserId === id || l.attendees.includes(id));

    return {
      data,
      addUser(rawName) {
        const name = normalize(rawName);
        if (!name) return { ok: false, error: 'Please enter a name.' };
        if (name.length > 40) return { ok: false, error: 'Name is too long.' };
        const existing = get().users.find((u) => u.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          if (!existing.isActive) {
            commit((d) => ({ ...d, users: d.users.map((u) => (u.id === existing.id ? { ...u, isActive: true } : u)) }));
            return { ok: true, value: { ...existing, isActive: true } };
          }
          return { ok: false, error: `${existing.name} is already in the group.` };
        }
        const user: User = { id: uid('u'), name, isActive: true, createdAt: nowISO() };
        commit((d) => ({ ...d, users: [...d.users, user] }));
        return { ok: true, value: user };
      },
      renameUser(id, rawName) {
        const name = normalize(rawName);
        if (!name) return { ok: false, error: 'Please enter a name.' };
        if (nameTaken(name, id)) return { ok: false, error: `Someone called ${name} already exists.` };
        commit((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, name } : u)) }));
        return { ok: true, value: undefined };
      },
      setUserActive(id, active) {
        commit((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, isActive: active } : u)) }));
      },
      userHasHistory,
      removeUser(id) {
        if (userHasHistory(id)) {
          commit((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, isActive: false } : u)) }));
          return 'deactivated';
        }
        commit((d) => ({ ...d, users: d.users.filter((u) => u.id !== id) }));
        return 'deleted';
      },

      saveMenuItem(input) {
        const name = normalize(input.name);
        if (!name) return { ok: false, error: 'Please enter the dish name.' };
        if (!Number.isInteger(input.price) || input.price < 0) return { ok: false, error: 'Please enter a valid price.' };
        if (!input.category) return { ok: false, error: 'Please choose a category.' };
        const dup = get().menuItems.find((m) => m.id !== input.id && m.name.toLowerCase() === name.toLowerCase());
        if (dup) return { ok: false, error: `${dup.name} is already on the menu.` };
        if (input.id) {
          const existing = get().menuItems.find((m) => m.id === input.id);
          if (!existing) return { ok: false, error: 'Item not found.' };
          const updated: MenuItem = { ...existing, ...input, id: existing.id, name };
          commit((d) => ({ ...d, menuItems: d.menuItems.map((m) => (m.id === updated.id ? updated : m)) }));
          return { ok: true, value: updated };
        }
        const item: MenuItem = { ...input, id: uid('m'), name, createdAt: nowISO() };
        commit((d) => ({ ...d, menuItems: [...d.menuItems, item] }));
        return { ok: true, value: item };
      },
      deleteMenuItem(id) {
        // Past orders keep their name/price snapshots, so history is unaffected.
        commit((d) => ({ ...d, menuItems: d.menuItems.filter((m) => m.id !== id) }));
      },

      saveLunch(draft, actualBill) {
        if (!draft.date) return { ok: false, error: 'Please choose the lunch date.' };
        if (!draft.paidByUserId) return { ok: false, error: 'Please choose who paid the bill.' };
        if (draft.attendees.length === 0) return { ok: false, error: 'Select at least one attendee.' };
        const d0 = get();
        const userOrder = d0.users.map((u) => u.id);
        const ordered: LunchDraft = { ...draft, attendees: sortAttendees(draft.attendees, userOrder) };
        const prevRecord = draft.editingId ? d0.lunches.find((l) => l.id === draft.editingId) : undefined;
        if (draft.editingId && !prevRecord) return { ok: false, error: 'That lunch no longer exists.' };
        const built = buildLunch(
          ordered,
          actualBill,
          prevRecord
            ? { record: prevRecord, settlements: d0.settlements.filter((s) => s.lunchRecordId === prevRecord.id) }
            : undefined,
        );
        if (built.record.totalAmount < 0) return { ok: false, error: 'The total cannot be negative. Check the discounts.' };
        const id = built.record.id;
        commit((d) => ({
          ...d,
          lunches: prevRecord ? d.lunches.map((l) => (l.id === id ? built.record : l)) : [...d.lunches, built.record],
          orders: [...d.orders.filter((o) => o.lunchRecordId !== id), ...built.orders],
          settlements: [...d.settlements.filter((s) => s.lunchRecordId !== id), ...built.settlements],
        }));
        return { ok: true, value: id };
      },
      deleteLunch(id) {
        commit((d) => ({
          ...d,
          lunches: d.lunches.filter((l) => l.id !== id),
          orders: d.orders.filter((o) => o.lunchRecordId !== id),
          settlements: d.settlements.filter((s) => s.lunchRecordId !== id),
        }));
      },
      setPaid(lunchId, userId, paid) {
        commit((d) => ({
          ...d,
          settlements: d.settlements.map((s) =>
            s.lunchRecordId === lunchId && s.userId === userId && !s.isPayer
              ? paid
                ? { ...s, amountPaid: s.amountOwed, status: 'paid', settledAt: nowISO() }
                : { ...s, amountPaid: 0, status: 'pending', settledAt: null }
              : s,
          ),
        }));
      },
      settleMany(items) {
        const keys = new Set(items.map((i) => `${i.lunchId}|${i.userId}`));
        const now = nowISO();
        commit((d) => ({
          ...d,
          settlements: d.settlements.map((s) =>
            keys.has(`${s.lunchRecordId}|${s.userId}`) && !s.isPayer
              ? { ...s, amountPaid: Math.max(s.amountPaid, s.amountOwed), status: 'paid', settledAt: now }
              : s,
          ),
        }));
      },

      resetDemo() {
        saveDraftRaw(null);
        commit(() => createDemoData());
      },
      removeDemoLunches() {
        const demoIds = new Set(get().lunches.filter((l) => l.isDemo).map((l) => l.id));
        commit((d) => ({
          ...d,
          lunches: d.lunches.filter((l) => !demoIds.has(l.id)),
          orders: d.orders.filter((o) => !demoIds.has(o.lunchRecordId)),
          settlements: d.settlements.filter((s) => !demoIds.has(s.lunchRecordId)),
        }));
        return demoIds.size;
      },
      startFresh() {
        saveDraftRaw(null);
        const demo = createDemoData();
        commit(() => ({ ...demo, lunches: [], orders: [], settlements: [] }));
      },
    };
  }, [data, commit]);

  if (!api) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-100 text-ink-500">
        <div className="animate-pulse font-display text-2xl text-maroon-700">Chettiar Splitter</div>
      </div>
    );
  }
  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** Convenience lookups. */
export function useLookups() {
  const { data } = useStore();
  return useMemo(() => {
    const users = new Map(data.users.map((u) => [u.id, u]));
    const menu = new Map(data.menuItems.map((m) => [m.id, m]));
    const userName = (id: string) => users.get(id)?.name ?? 'Unknown';
    return { users, menu, userName };
  }, [data]);
}
