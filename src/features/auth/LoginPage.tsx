import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSync } from '@/sync/SyncProvider';
import { MagicLinkForm } from './MagicLinkForm';
import { isLocalOnly, setLocalOnly } from './localOnly';

/** Where the user was headed before the gate sent them here. */
interface FromState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { configured, email, initializing } = useSync();
  const location = useLocation();
  const navigate = useNavigate();

  const from = (location.state as FromState | null)?.from?.pathname ?? '/';

  // Already in — don't show a login page to someone who is signed in, or to
  // someone who previously chose local-only mode.
  if (!initializing && (email || isLocalOnly())) {
    return <Navigate to={from} replace />;
  }

  function continueLocally() {
    setLocalOnly(true);
    navigate(from, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            CAT Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">CAT 2026 prep</p>
        </div>

        <Card>
          {configured ? (
            <>
              <h2 className="text-sm font-semibold">Sign in</h2>
              <p className="mb-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                Keeps the same data on your laptop and your phone. No password — you get an email
                link.
              </p>
              <MagicLinkForm redirectPath={from} autoFocus />
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold">Local mode</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Sync isn&apos;t configured on this build, so there&apos;s no account to sign into.
                Everything works — your data just stays on this device, and Export/Import is your
                backup.
              </p>
            </>
          )}
        </Card>

        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={continueLocally}>
            {configured ? 'Continue without an account' : 'Continue'}
          </Button>
          {configured && (
            <p className="mt-2 text-xs text-slate-400">
              Data stays on this device only. You can sign in later from Settings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
