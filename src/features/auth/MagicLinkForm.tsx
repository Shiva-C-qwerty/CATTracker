import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useSync } from '@/sync/SyncProvider';

/**
 * Email sign-in, shared by the login page and the Settings panel so the two
 * can't drift apart.
 *
 * Passwordless by choice: there's exactly one user, and a password is one more
 * thing to lose four months into prep.
 */
export function MagicLinkForm({
  redirectPath = '/',
  autoFocus = false,
}: {
  /** Where the emailed link should land. Preserves the deep link you asked for. */
  redirectPath?: string;
  autoFocus?: boolean;
}) {
  const { sendMagicLink } = useSync();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendMagicLink(email.trim(), redirectPath);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Check <span className="font-medium">{email}</span> for a sign-in link. Open it on this
          device — the link signs in whichever browser opens it.
        </p>
        <div>
          <Button variant="secondary" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="Email">
        <Input
          type="email"
          required
          autoFocus={autoFocus}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={busy || !email.trim()}>
        {busy ? 'Sending…' : 'Send sign-in link'}
      </Button>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}
