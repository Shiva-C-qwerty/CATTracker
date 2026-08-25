/**
 * "Continue without an account" mode.
 *
 * Lets the tracker be used with zero setup — no Supabase project, no email, no
 * network — which is how it worked before sync existed and how it still needs
 * to work on a device you don't want to sign in on.
 *
 * Stored in localStorage rather than Dexie on purpose: the `meta` table syncs,
 * and a per-device UI preference has no business travelling between devices.
 */

const KEY = 'cat-tracker.local-only';

export function isLocalOnly(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    // Private-mode browsers can throw on localStorage access; treat as off.
    return false;
  }
}

export function setLocalOnly(value: boolean): void {
  try {
    if (value) localStorage.setItem(KEY, 'true');
    else localStorage.removeItem(KEY);
  } catch {
    // Non-fatal — the user just gets asked again next load.
  }
}
