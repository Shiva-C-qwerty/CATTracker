import { SYNCED_TABLES, db } from './db';
import type { Tombstone } from './types';

/**
 * Local change tracking for cross-device sync.
 *
 * Every synced table gets `creating`/`updating` hooks that stamp `_updatedAt`.
 * This is why the ~30 mutation functions in mutations.ts need no changes: any
 * write through any code path is timestamped automatically, and the push query
 * just scans the `_updatedAt` index for anything above the watermark.
 *
 * Deletes can't work that way — once the row is gone there's nothing left to
 * scan — so the delete mutations call `recordTombstone()` instead. That's the
 * only place sync leaks into mutations.ts, and it's 5 call sites.
 */

/**
 * How remote writes avoid being re-detected as local edits:
 *
 * `applyRemoteRecords()` only ever writes a record when the remote copy is
 * strictly newer than the local one, so `_updatedAt` is *always* part of the
 * change. On create the incoming object already carries it; on update Dexie's
 * diff therefore always includes it. Both hooks below treat "an explicit
 * `_updatedAt` came in with this write" as the signal to leave it alone.
 *
 * That precondition is what makes this deterministic rather than a race — do
 * not weaken the comparison in applyRemoteRecords to `>=` without revisiting
 * this, or pulled records will be re-stamped and echo back to the server.
 */
export function installChangeTracking(): void {
  for (const { name } of SYNCED_TABLES) {
    const table = db.table(name);

    table.hook('creating', (_primKey, obj: Record<string, unknown>) => {
      if (obj._updatedAt === undefined) obj._updatedAt = Date.now();
      notifyLocalChange();
      // Returning nothing keeps the (already mutated) object.
    });

    // `modifications` is typed `object` to match Dexie's call signature under
    // strictFunctionTypes; a narrower parameter type fails to type-check.
    table.hook('updating', (modifications: object) => {
      notifyLocalChange();
      // A remote apply carries its own timestamp — preserve it verbatim.
      if ('_updatedAt' in modifications) return;
      return { _updatedAt: Date.now() };
    });
  }
}

// ---------------------------------------------------------------------------
// Local-change notification
// ---------------------------------------------------------------------------

type Listener = () => void;

const listeners = new Set<Listener>();
let pendingNotify: ReturnType<typeof setTimeout> | null = null;

/**
 * Subscribe to "something changed locally". Drives the prompt push that makes
 * a mistake logged on your phone show up on the laptop seconds later, rather
 * than whenever the next poll happens to land.
 */
export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Coalesced fan-out. The hooks fire once per row, so a bulkPut of 55 seeded
 * chapters would otherwise trigger 55 syncs. Deferring to a macrotask also
 * gets subscribers out of the Dexie transaction before they touch the DB again.
 */
function notifyLocalChange(): void {
  if (pendingNotify) return;
  pendingNotify = setTimeout(() => {
    pendingNotify = null;
    for (const listener of listeners) listener();
  }, 0);
}

/**
 * Mark a record as deleted so the deletion propagates to other devices.
 *
 * Must run inside the same transaction as the delete itself, otherwise a
 * crash between the two leaves a row deleted locally that silently resurrects
 * on the next pull. Callers pass a transaction scope that includes `outbox`.
 */
export async function recordTombstone(table: string, recordId: string): Promise<void> {
  const tombstone: Tombstone = {
    key: `${table}:${recordId}`,
    table,
    recordId,
    deletedAt: Date.now(),
  };
  await db.outbox.put(tombstone);
  notifyLocalChange();
}

/**
 * Delete a record and record its tombstone atomically.
 *
 * Used by the delete mutations so neither half can happen without the other.
 */
export async function deleteAndTrack(table: string, recordId: string): Promise<void> {
  await db.transaction('rw', [db.table(table), db.outbox], async () => {
    await db.table(table).delete(recordId);
    await recordTombstone(table, recordId);
  });
}
