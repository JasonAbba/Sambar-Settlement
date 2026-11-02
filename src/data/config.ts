import { LocalStorageRepository, type DataRepository } from './repository';
import { SupabaseRepository } from './supabaseRepository';

/**
 * Shared cloud database (Supabase). The publishable key is designed to be
 * public; access is governed by the row-level-security policies in
 * `supabase-schema.sql`. Override with VITE_SUPABASE_URL /
 * VITE_SUPABASE_PUBLISHABLE_KEY, or set VITE_STORAGE=local to keep data
 * only in this browser.
 */
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://leoaigkhgpaqlycninbe.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_6XnWP3I0DHiZdXvQqIbo_w_tok2aB2d';

export const isCloud = import.meta.env.VITE_STORAGE !== 'local' && !!URL && !!KEY;

export function createRepository(): DataRepository {
  return isCloud ? new SupabaseRepository(URL, KEY) : new LocalStorageRepository();
}
