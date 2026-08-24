import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client, or null when the app is built without credentials.
 *
 * Sync is an optional layer bolted onto a local-first app: with no env vars the
 * whole feature stays dormant and every other screen works exactly as before.
 * That's deliberate — an unconfigured build must never break the tracker.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSyncConfigured: boolean = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSyncConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The magic-link callback lands back on the app with tokens in the URL.
        detectSessionInUrl: true,
      },
    })
  : null;

/** Narrow the nullable client at call sites that already checked configuration. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Sync is not configured on this build.');
  }
  return supabase;
}
