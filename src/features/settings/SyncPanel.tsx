import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { useSync } from '@/sync/SyncProvider';

/**
 * Sync controls. Deliberately lives in Settings rather than gating the app
 * behind a login: the tracker is local-first and must stay fully usable
 * without an account, so signing in is something you opt into once.
 */
export function SyncPanel() {
  const sync = useSync();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!sync.configured) {
    return (
      <Card>
        <h2 className="text-sm font-semibold">Sync across devices</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Not configured on this build. Set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then rebuild. Until then everything stays local and
          Export/Import remains your backup.
        </p>
      </Card>
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await sync.sendMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send the link.');
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = {
    off: 'Not signed in',
    idle: 'Synced',
    syncing: 'Syncing…',
    error: 'Sync problem',
  }[sync.status];

  const statusColour = {
    off: 'text-slate-500 dark:text-slate-400',
    idle: 'text-emerald-600 dark:text-emerald-400',
    syncing: 'text-sky-600 dark:text-sky-400',
    error: 'text-rose-600 dark:text-rose-400',
  }[sync.status];

  return (
    <>
      <Card>
        <h2 className="text-sm font-semibold">Sync across devices</h2>

        {sync.email ? (
          <>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Signed in as <span className="font-medium">{sync.email}</span>. Changes sync
              automatically; the app keeps working offline and catches up when you reconnect.
            </p>
            <p className={`mt-3 text-sm font-medium ${statusColour}`}>
              {statusLabel}
              {sync.lastSyncAt && sync.status !== 'syncing' && (
                <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                  · last synced {formatDistanceToNow(sync.lastSyncAt, { addSuffix: true })}
                </span>
              )}
            </p>
            {sync.error && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{sync.error}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void sync.syncNow()}
                disabled={sync.status === 'syncing'}
              >
                Sync now
              </Button>
              <Button variant="secondary" onClick={() => void sync.signOut()}>
                Sign out
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Signing out stops syncing but leaves all data on this device.
            </p>
          </>
        ) : sent ? (
          <>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Check <span className="font-medium">{email}</span> for a sign-in link. Open it on this
              device.
            </p>
            <div className="mt-3">
              <Button variant="secondary" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sign in to keep the same data on your laptop and your phone. No password — you get an
              email link. Your data stays private to your account.
            </p>
            <form onSubmit={handleSend} className="mt-3 flex flex-wrap items-end gap-2">
              <Field label="Email">
                <Input
                  type="email"
                  required
                  className="w-64"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Send sign-in link'}
              </Button>
            </form>
            {formError && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{formError}</p>
            )}
          </>
        )}
      </Card>

      {/* First sign-in where both this device and the account hold real work.
          Neither answer touches the server's data — they differ in what
          happens to the local rows that disagree. */}
      <Modal
        open={sync.needsAdoptionChoice}
        onClose={() => {}}
        title="This device already has data"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your account already has prep data, and this device has data that was never synced. How
            should they be combined?
          </p>
          <div className="rounded-md border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <strong>Merge</strong> keeps both, and where the same record exists on each side the
            more recently edited one wins. <strong>Use the account&apos;s copy</strong> discards
            this device&apos;s version wherever the two disagree.
          </div>
          <p className="text-xs text-slate-400">
            Merge is the safe answer — it never drops a record that exists on only one side.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => void sync.resolveAdoption('merge')}>Merge (recommended)</Button>
            <Button variant="secondary" onClick={() => void sync.resolveAdoption('use-server')}>
              Use the account&apos;s copy
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
