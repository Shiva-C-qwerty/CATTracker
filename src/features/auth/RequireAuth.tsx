import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSync } from '@/sync/SyncProvider';
import { isLocalOnly } from './localOnly';

/**
 * Routing gate in front of the app shell.
 *
 * Three ways through:
 *  - signed in;
 *  - chose "continue without an account";
 *  - the build has no Supabase credentials at all, so there is nothing to sign
 *    into and gating would just lock the user out of their own local data.
 *
 * The unauthenticated redirect carries the attempted location, so a deep link
 * survives the round trip through the emailed sign-in link.
 */
export function RequireAuth() {
  const { configured, email, initializing } = useSync();
  const location = useLocation();

  if (!configured) return <Outlet />;

  // Session restore is a localStorage read in the common case, so this is
  // typically a single frame. Render nothing rather than a spinner — a flash
  // of "signing in…" on every load reads as slower than it is.
  if (initializing) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;

  if (email || isLocalOnly()) return <Outlet />;

  return <Navigate to="/login" replace state={{ from: location }} />;
}
