import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { MagicLinkForm } from '@/features/auth/MagicLinkForm';
import { useSync } from '@/sync/SyncProvider';

const STATUS_LABEL = {
  off: 'Not signed in',
  idle: 'Synced',
  syncing: 'Syncing…',
  error: 'Sync problem',
} as const;

const STATUS_COLOUR = {
  off: 'text-slate-500 dark:text-slate-400',
  idle: 'text-emerald-600 dark:text-emerald-400',
  syncing: 'text-sky-600 dark:text-sky-400',
  error: 'text-rose-600 dark:text-rose-400',
} as const;

/**
 * Sync controls. Signing in also lives on the login page; this is the way in
 * for someone who chose "continue without an account" and later changed their
 * mind, plus the status readout once sync is running.
 */
export function SyncPanel() {
  const sync = useSync();

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
            <p className={`mt-3 text-sm font-medium ${STATUS_COLOUR[sync.status]}`}>
              {STATUS_LABEL[sync.status]}
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
              Signing out stops syncing and returns you to the login page. All data stays on this
              device.
            </p>
          </>
        ) : (
          <>
            <p className="mb-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
              You&apos;re using this device without an account, so nothing leaves it. Sign in to
              keep the same data on your laptop and your phone — your existing data comes with you.
            </p>
            <div className="max-w-sm">
              <MagicLinkForm redirectPath="/settings" />
            </div>
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
