/**
 * Pure sync logic: conflict resolution and change-set planning.
 *
 * No Dexie, no Supabase, no React — the transport lives in src/sync/. Keeping
 * the decisions here means the rules that can silently lose data are the ones
 * covered by unit tests.
 */

/** A row as stored in the Supabase `records` table. */
export interface RemoteRow {
  table_name: string;
  record_id: string;
  /** Full entity JSON, or null for a tombstone. */
  data: Record<string, unknown> | null;
  deleted: boolean;
  /** Client clock (ms) of the write that produced this row. Drives LWW. */
  updated_at: number;
  /** Server-assigned ordering. Drives the pull watermark. */
  seq: number;
}

/** A local record queued for upload. */
export interface PushRow {
  table_name: string;
  record_id: string;
  data: Record<string, unknown> | null;
  deleted: boolean;
  updated_at: number;
}

export type PullMode =
  /** Normal steady state: newest `updated_at` wins. */
  | 'lww'
  /**
   * First pull on a device that is adopting an existing account. The server is
   * authoritative and local rows lose unconditionally.
   *
   * This mode exists because of a specific trap: on a fresh device the chapter
   * seed runs before sync and stamps 55 default chapters with the current
   * clock. Those defaults are *newer* than real server data, so plain LWW
   * would let them win and then push the wipe back up.
   */
  | 'remote-wins';

export interface PullPlan {
  /** table name -> records to bulkPut. */
  upserts: Record<string, Record<string, unknown>[]>;
  /** table name -> primary keys to delete. */
  deletes: Record<string, string[]>;
  /** New pull watermark: the highest `seq` seen, or the previous one. */
  seq: number;
  applied: number;
  /** Rows a local edit beat. Surfaced so sync status can report real work. */
  skipped: number;
}

/**
 * Decide whether one pulled row should overwrite the local copy.
 *
 * Strictly greater, deliberately. On equal timestamps the local copy stands,
 * which keeps a re-pulled row from being rewritten (and re-stamped by the
 * change-tracking hooks, which would echo it straight back to the server).
 * See the note in src/db/changeTracking.ts before relaxing this.
 */
export function shouldApplyRemote(
  remoteUpdatedAt: number,
  localUpdatedAt: number | undefined,
  mode: PullMode = 'lww',
): boolean {
  if (mode === 'remote-wins') return true;
  if (localUpdatedAt === undefined) return true;
  return remoteUpdatedAt > localUpdatedAt;
}

/**
 * Turn a page of pulled rows into the writes to apply locally.
 *
 * `localUpdatedAt` looks up the local `_updatedAt` for a (table, id) pair;
 * returning undefined means "no local copy". The watermark advances over
 * *every* row including skipped ones — a row we chose not to apply is still a
 * row we've seen, and re-pulling it forever would stall sync.
 */
export function planPull(
  rows: RemoteRow[],
  localUpdatedAt: (table: string, recordId: string) => number | undefined,
  previousSeq: number,
  mode: PullMode = 'lww',
): PullPlan {
  const plan: PullPlan = {
    upserts: {},
    deletes: {},
    seq: previousSeq,
    applied: 0,
    skipped: 0,
  };

  for (const row of rows) {
    if (row.seq > plan.seq) plan.seq = row.seq;

    const local = localUpdatedAt(row.table_name, row.record_id);
    if (!shouldApplyRemote(row.updated_at, local, mode)) {
      plan.skipped += 1;
      continue;
    }

    if (row.deleted) {
      // Nothing to delete locally — don't queue a no-op write.
      if (local === undefined) continue;
      (plan.deletes[row.table_name] ??= []).push(row.record_id);
    } else if (row.data) {
      // Carry the server's timestamp onto the record. The change-tracking
      // hooks see an explicit `_updatedAt` and leave it alone, so this write
      // is not mistaken for a local edit.
      (plan.upserts[row.table_name] ??= []).push({
        ...row.data,
        _updatedAt: row.updated_at,
      });
    } else {
      // deleted=false with no payload is malformed; skip rather than write junk.
      plan.skipped += 1;
      continue;
    }
    plan.applied += 1;
  }

  return plan;
}

/**
 * Advance the push watermark past everything we just applied.
 *
 * Without this, a pulled record whose `updated_at` is above the current push
 * watermark gets picked up by the very next push and sent straight back.
 * Harmless but wasteful, and it makes sync counts confusing to read.
 */
export function advancePushWatermark(current: number, rows: RemoteRow[]): number {
  let next = current;
  for (const row of rows) {
    if (row.updated_at > next) next = row.updated_at;
  }
  return next;
}

/** Build the upload row for a local record. */
export function toPushRow(
  table: string,
  pk: string,
  record: Record<string, unknown>,
): PushRow {
  const updatedAt = typeof record._updatedAt === 'number' ? record._updatedAt : Date.now();
  return {
    table_name: table,
    record_id: String(record[pk]),
    data: record,
    deleted: false,
    updated_at: updatedAt,
  };
}

/**
 * Collapse duplicate keys in an upload batch, keeping the newest write.
 *
 * A batch can legitimately contain two rows for the same record: "replace"
 * import and the danger-zone clear both tombstone every row and then re-seed
 * chapters under the *same* stable ids, producing a delete and an upsert for
 * one key. Postgres rejects that outright — `ON CONFLICT DO UPDATE command
 * cannot affect row a second time` — so the batch must be deduped first.
 */
export function dedupePushRows(rows: PushRow[]): PushRow[] {
  const winner = new Map<string, PushRow>();
  for (const row of rows) {
    const key = `${row.table_name}:${row.record_id}`;
    const held = winner.get(key);
    if (!held || row.updated_at >= held.updated_at) winner.set(key, row);
  }
  return [...winner.values()];
}

/** Build the upload row for a deletion. */
export function tombstoneToPushRow(
  table: string,
  recordId: string,
  deletedAt: number,
): PushRow {
  return {
    table_name: table,
    record_id: recordId,
    data: null,
    deleted: true,
    updated_at: deletedAt,
  };
}

/**
 * Whether a local database looks like it holds real user work, as opposed to
 * nothing but freshly seeded defaults.
 *
 * Drives the first-sign-in prompt: with no real work there is nothing to lose,
 * so we can adopt the server silently instead of asking. Seeded chapters and
 * formulas are excluded because every device has those.
 */
export function hasUserData(counts: {
  mocks: number;
  mistakes: number;
  sessions: number;
  goals: number;
  editedChapters: number;
  customFormulas: number;
}): boolean {
  return (
    counts.mocks > 0 ||
    counts.mistakes > 0 ||
    counts.sessions > 0 ||
    counts.goals > 0 ||
    counts.editedChapters > 0 ||
    counts.customFormulas > 0
  );
}
