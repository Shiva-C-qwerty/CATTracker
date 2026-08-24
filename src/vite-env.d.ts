/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Absent = sync is unconfigured and stays off. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key. Safe to ship — row-level security guards rows. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
