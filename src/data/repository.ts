import type { AppData } from '../types';

/**
 * Persistence boundary. The app only talks to this interface, so swapping
 * LocalStorage for Supabase (or any cloud DB) later means adding another
 * implementation — the UI and calculation code stay unchanged.
 */
export interface DataRepository {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
  /** Optional: notify when data changes elsewhere (another tab / another device). */
  subscribe?(onChange: (data: AppData) => void): () => void;
}

const KEY = 'chettiar-splitter:data:v1';

function isAppData(x: unknown): x is AppData {
  const d = x as AppData;
  return (
    !!d &&
    d.version === 1 &&
    Array.isArray(d.users) &&
    Array.isArray(d.menuItems) &&
    Array.isArray(d.lunches) &&
    Array.isArray(d.orders) &&
    Array.isArray(d.settlements)
  );
}

export class LocalStorageRepository implements DataRepository {
  constructor(private key = KEY) {}

  async load(): Promise<AppData | null> {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isAppData(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      throw new Error(
        quota
          ? 'Storage is full. Try using image URLs or smaller photos for menu items.'
          : 'Could not save data (private browsing may block storage).',
      );
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }

  subscribe(onChange: (data: AppData) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key !== this.key || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (isAppData(parsed)) onChange(parsed);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

/** Small helpers for the in-progress lunch draft, kept separate from the main data. */
const DRAFT_KEY = 'chettiar-splitter:draft:v1';

export function loadDraftRaw<T>(): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraftRaw<T>(draft: T | null): void {
  try {
    if (draft == null) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* draft persistence is best-effort */
  }
}
