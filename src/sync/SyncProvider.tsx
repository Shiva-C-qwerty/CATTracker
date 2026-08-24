import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { onLocalChange } from '@/db/changeTracking';
import { hasUserData } from '@/lib/sync';
import { isSyncConfigured, supabase } from './client';
import { localWorkSummary, remoteHasData, syncNow as runSyncCycle } from './engine';
import { getSyncState, hasSynced, resetSyncState } from './state';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

/**
 * What to do the first time this device signs into an account that already
 * has data *and* holds unsynced local work. Both answers are lossless on the
 * server; they differ in what happens to this device's local rows.
 */
export type AdoptionChoice =
  /** Reconcile both sides record-by-record, newest edit winning. */
  | 'merge'
  /** Discard local rows wherever the server disagrees. */
  | 'use-server';

interface SyncContextValue {
  configured: boolean;
  email: string | null;
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
  /** Set when first sign-in needs a merge-or-replace decision. */
  needsAdoptionChoice: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  resolveAdoption: (choice: AdoptionChoice) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

/** Poll interval as a backstop for missed realtime events (tab asleep, etc). */
const POLL_MS = 60_000;
/** Debounce after a local write before pushing, to batch a burst of edits. */
const PUSH_DEBOUNCE_MS = 1_500;

export function SyncProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAdoptionChoice, setNeedsAdoptionChoice] = useState(false);

  // Guards a sync cycle so overlapping triggers (realtime + poll + local write)
  // can't run two cycles at once and interleave their watermark writes.
  const running = useRef(false);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

  const runSync = useCallback(async (mode: 'lww' | 'remote-wins' = 'lww') => {
    const uid = userIdRef.current;
    if (!uid || running.current) return;
    running.current = true;
    setStatus('syncing');
    try {
      await runSyncCycle(uid, mode);
      const state = await getSyncState();
      setLastSyncAt(state.lastSyncAt);
      setError(null);
      setStatus('idle');
    } catch (err) {
      // Offline is the common case here and isn't worth alarming about — the
      // next trigger retries. Keep the message for the Settings panel.
      console.error('Sync failed:', err);
      setError(err instanceof Error ? err.message : 'Sync failed.');
      setStatus('error');
    } finally {
      running.current = false;
    }
  }, []);

  // --- Auth session ---------------------------------------------------------
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setUserId(data.session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- First sync for a session (with the adoption decision) ----------------
  useEffect(() => {
    if (!userId) {
      setStatus('off');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Already established on this device — just resume the normal loop.
        if (await hasSynced(userId)) {
          const state = await getSyncState();
          if (cancelled) return;
          setLastSyncAt(state.lastSyncAt);
          await runSync('lww');
          return;
        }

        // New device/account pairing: decide before writing anything.
        await resetSyncState(userId);
        const [remote, local] = await Promise.all([
          remoteHasData(userId),
          localWorkSummary(),
        ]);
        if (cancelled) return;

        if (remote && hasUserData(local)) {
          // Both sides hold real work — this is the only genuinely ambiguous
          // case, so ask rather than guess.
          setNeedsAdoptionChoice(true);
          setStatus('idle');
          return;
        }

        // Adopt the server when it has the only real data. This is what keeps
        // freshly seeded chapters from beating four months of work on LWW.
        await runSync(remote ? 'remote-wins' : 'lww');
      } catch (err) {
        if (cancelled) return;
        console.error('Initial sync failed:', err);
        setError(err instanceof Error ? err.message : 'Sync failed.');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, runSync]);

  // --- Triggers: realtime, local writes, focus, poll ------------------------
  useEffect(() => {
    if (!userId || !supabase || needsAdoptionChoice) return;

    // Capture the narrowed client — the cleanup closure below runs after
    // narrowing is lost.
    const client = supabase;
    const channel = client
      .channel(`sync:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_signal',
          filter: `user_id=eq.${userId}`,
        },
        // The signal carries no payload by design — a base64 screenshot would
        // blow past Realtime's message limit. Treat it purely as "go pull".
        () => void runSync('lww'),
      )
      .subscribe();

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeLocal = onLocalChange(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void runSync('lww'), PUSH_DEBOUNCE_MS);
    });

    const onFocus = () => {
      if (document.visibilityState === 'visible') void runSync('lww');
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onFocus);

    const poll = setInterval(() => void runSync('lww'), POLL_MS);

    return () => {
      void client.removeChannel(channel);
      unsubscribeLocal();
      if (debounce) clearTimeout(debounce);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onFocus);
      clearInterval(poll);
    };
  }, [userId, needsAdoptionChoice, runSync]);

  const sendMagicLink = useCallback(async (address: string) => {
    if (!supabase) throw new Error('Sync is not configured on this build.');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    });
    if (err) throw new Error(err.message);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Clear the watermarks so signing back in re-establishes cleanly rather
    // than resuming against stale positions. Local data is left untouched.
    await resetSyncState(null);
    setNeedsAdoptionChoice(false);
    setLastSyncAt(null);
    setStatus('off');
  }, []);

  const resolveAdoption = useCallback(
    async (choice: AdoptionChoice) => {
      setNeedsAdoptionChoice(false);
      await runSync(choice === 'use-server' ? 'remote-wins' : 'lww');
    },
    [runSync],
  );

  return (
    <SyncContext.Provider
      value={{
        configured: isSyncConfigured,
        email,
        status,
        lastSyncAt,
        error,
        needsAdoptionChoice,
        sendMagicLink,
        signOut,
        syncNow: () => runSync('lww'),
        resolveAdoption,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
