import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '../types';
import { LocalStorageRepository, type DataRepository } from './repository';

/**
 * Shared cloud storage. Every entity is one row in `public.app_records`
 * keyed by (collection, id) with the entity as JSON. Saves are diffed against
 * the last known server state, so only changed rows are written, and each
 * lunch/person/dish is its own row (two people editing different lunches
 * never clobber each other). A LocalStorage copy is kept as an offline cache.
 */

type Collection = 'users' | 'menuItems' | 'lunches' | 'orders' | 'settlements';
const COLLECTIONS: Collection[] = ['users', 'menuItems', 'lunches', 'orders', 'settlements'];
const TABLE = 'app_records';
const UPLOADED_FLAG = 'sambar:local-uploaded:v1';

interface Row {
  collection: Collection | 'meta';
  id: string;
  data: unknown;
}

const byCreated = <T extends { createdAt: string; name?: string; id: string }>(a: T, b: T) =>
  a.createdAt.localeCompare(b.createdAt) || (a.name ?? a.id).localeCompare(b.name ?? b.id);

function assemble(rows: Row[]): AppData {
  const d: AppData = { version: 1, users: [], menuItems: [], lunches: [], orders: [], settlements: [] };
  for (const r of rows) {
    if (r.collection === 'meta') {
      if (r.id === 'app') d.menuSeedVersion = (r.data as { menuSeedVersion?: number }).menuSeedVersion;
    } else {
      (d[r.collection] as unknown[]).push(r.data);
    }
  }
  d.users.sort(byCreated);
  d.menuItems.sort(byCreated);
  d.orders.sort((a, b) => a.id.localeCompare(b.id));
  return d;
}

function toRows(d: AppData): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const c of COLLECTIONS) {
    for (const item of d[c] as { id: string }[]) m.set(`${c}|${item.id}`, { collection: c, id: item.id, data: item });
  }
  m.set('meta|app', { collection: 'meta', id: 'app', data: { menuSeedVersion: d.menuSeedVersion ?? 1 } });
  return m;
}

export class SupabaseRepository implements DataRepository {
  private client: SupabaseClient;
  private cache = new LocalStorageRepository();
  /** Last state known to be on the server; saves are diffed against it. */
  private last: Map<string, Row> = new Map();
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;

  constructor(url: string, key: string) {
    this.client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private async fetchAll(): Promise<Row[]> {
    const rows: Row[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await this.client
        .from(TABLE)
        .select('collection,id,data')
        .order('collection')
        .order('id')
        .range(from, from + page - 1);
      if (error) throw new Error(error.message);
      rows.push(...(data as Row[]));
      if (!data || data.length < page) break;
    }
    return rows;
  }

  async load(): Promise<AppData | null> {
    let rows: Row[];
    try {
      rows = await this.fetchAll();
    } catch (e) {
      const cached = await this.cache.load();
      if (cached) {
        this.last = toRows(cached);
        console.warn('Supabase unreachable, using cached copy', e);
        return cached;
      }
      throw e;
    }

    const local = await this.cache.load();
    if (rows.length === 0) {
      // First ever cloud load: upload whatever this browser already had (if anything).
      this.last = new Map();
      if (local) {
        await this.save(local);
        markUploaded();
        return local;
      }
      return null;
    }

    let remote = assemble(rows);
    this.last = toRows(remote);

    // One-time: lunches recorded on this phone before cloud sync get uploaded, not lost.
    if (local && !wasUploaded()) {
      const merged = mergeLocalLunches(remote, local);
      if (merged) {
        await this.save(merged);
        remote = merged;
      }
      markUploaded();
    }
    await this.cache.save(remote).catch(() => undefined);
    return remote;
  }

  save(data: AppData): Promise<void> {
    this.pending++;
    const run = this.queue.then(() => this.write(data));
    this.queue = run.catch(() => undefined).finally(() => {
      this.pending--;
    });
    return run;
  }

  private async write(data: AppData): Promise<void> {
    await this.cache.save(data).catch(() => undefined);
    const next = toRows(data);
    const upserts: Row[] = [];
    for (const [k, row] of next) {
      const prev = this.last.get(k);
      if (!prev || JSON.stringify(prev.data) !== JSON.stringify(row.data)) upserts.push(row);
    }
    const deletes = new Map<string, string[]>();
    for (const [k, row] of this.last) {
      if (!next.has(k)) deletes.set(row.collection, [...(deletes.get(row.collection) ?? []), row.id]);
    }

    for (let i = 0; i < upserts.length; i += 500) {
      const chunk = upserts.slice(i, i + 500).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
      const { error } = await this.client.from(TABLE).upsert(chunk, { onConflict: 'collection,id' });
      if (error) throw new Error(`Could not sync to the cloud: ${error.message}`);
    }
    for (const [collection, ids] of deletes) {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await this.client.from(TABLE).delete().eq('collection', collection).in('id', ids.slice(i, i + 200));
        if (error) throw new Error(`Could not sync to the cloud: ${error.message}`);
      }
    }
    this.last = next;
  }

  async clear(): Promise<void> {
    await this.save({ version: 1, users: [], menuItems: [], lunches: [], orders: [], settlements: [] });
  }

  /** Live updates: reload when anyone changes data, and when the app comes back to the foreground. */
  subscribe(onChange: (data: AppData) => void): () => void {
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (this.pending > 0) return refresh(); // let our own writes land first
        try {
          const rows = await this.fetchAll();
          const fresh = toRows(assemble(rows));
          if (sameRows(fresh, this.last)) return;
          const data = assemble(rows);
          this.last = fresh;
          await this.cache.save(data).catch(() => undefined);
          onChange(data);
        } catch {
          /* offline: try again on next event */
        }
      }, 400);
    };

    const channel = this.client
      .channel('app_records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, refresh)
      .subscribe();
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
      this.client.removeChannel(channel);
    };
  }
}

function sameRows(a: Map<string, Row>, b: Map<string, Row>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, r] of a) {
    const o = b.get(k);
    if (!o || JSON.stringify(o.data) !== JSON.stringify(r.data)) return false;
  }
  return true;
}

function wasUploaded(): boolean {
  try {
    return localStorage.getItem(UPLOADED_FLAG) === '1';
  } catch {
    return true;
  }
}
function markUploaded() {
  try {
    localStorage.setItem(UPLOADED_FLAG, '1');
  } catch {
    /* ignore */
  }
}

/** Adds real (non-demo) lunches that exist only locally, plus any people/dishes they reference. */
export function mergeLocalLunches(remote: AppData, local: AppData): AppData | null {
  const remoteLunchIds = new Set(remote.lunches.map((l) => l.id));
  const extra = local.lunches.filter((l) => !l.isDemo && !remoteLunchIds.has(l.id));
  if (!extra.length) return null;
  const ids = new Set(extra.map((l) => l.id));
  const userIds = new Set(remote.users.map((u) => u.id));
  const menuIds = new Set(remote.menuItems.map((m) => m.id));
  const neededUsers = new Set(extra.flatMap((l) => [...l.attendees, l.paidByUserId]));
  const extraOrders = local.orders.filter((o) => ids.has(o.lunchRecordId));
  const neededMenu = new Set(extraOrders.map((o) => o.menuItemId).filter(Boolean) as string[]);
  return {
    ...remote,
    users: [...remote.users, ...local.users.filter((u) => neededUsers.has(u.id) && !userIds.has(u.id))],
    menuItems: [...remote.menuItems, ...local.menuItems.filter((m) => neededMenu.has(m.id) && !menuIds.has(m.id))],
    lunches: [...remote.lunches, ...extra],
    orders: [...remote.orders, ...extraOrders],
    settlements: [...remote.settlements, ...local.settlements.filter((s) => ids.has(s.lunchRecordId))],
  };
}
