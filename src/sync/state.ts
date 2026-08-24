import { db } from '@/db/db';
import type { SyncState } from '@/db/types';

/**
 * This device's sync bookkeeping. Lives in its own Dexie table rather than in
 * `meta` because `meta` is itself synced — storing a watermark inside the data
 * being watermarked would round-trip between devices and corrupt itself.
 */

const KEY = 'default';

const INITIAL: SyncState = {
  key: KEY,
  userId: null,
  seq: 0,
  pushedThrough: 0,
  lastSyncAt: null,
};

export async function getSyncState(): Promise<SyncState> {
  return (await db.syncState.get(KEY)) ?? INITIAL;
}

export async function patchSyncState(patch: Partial<Omit<SyncState, 'key'>>): Promise<void> {
  const current = await getSyncState();
  await db.syncState.put({ ...current, ...patch, key: KEY });
}

/**
 * Reset the watermarks for a (possibly new) account.
 *
 * Called on sign-in and sign-out. Zeroed watermarks mean the next sync is a
 * full pull followed by a full push, which is what adopting an account — or
 * re-adopting one after signing out — has to do.
 */
export async function resetSyncState(userId: string | null): Promise<void> {
  await db.syncState.put({ ...INITIAL, userId });
}

/** True when this device has already completed its first pull for this user. */
export async function hasSynced(userId: string): Promise<boolean> {
  const state = await getSyncState();
  return state.userId === userId && state.lastSyncAt !== null;
}
