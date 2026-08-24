import { SYNCED_TABLES, db } from '@/db/db';
import {
  advancePushWatermark,
  dedupePushRows,
  planPull,
  toPushRow,
  tombstoneToPushRow,
  type PullMode,
  type PushRow,
  type RemoteRow,
} from '@/lib/sync';
import { requireSupabase } from './client';
import { getSyncState, patchSyncState } from './state';

/**
 * Sync transport. The decisions live in src/lib/sync.ts (pure, tested); this
 * file only moves bytes and writes to Dexie.
 */

/** Rows per pull request. Kept modest because mistake images ride inside the
 * jsonb payload and a page of them is real bandwidth. */
const PULL_PAGE = 100;

/** Cap an upload batch by serialized size, not row count — one mistake with a
 * pasted screenshot can be 200 KB on its own. */
const MAX_BATCH_BYTES = 1_500_000;
const MAX_BATCH_ROWS = 50;

export interface SyncResult {
  pulled: number;
  skipped: number;
  pushed: number;
}

const SELECT_COLUMNS = 'table_name, record_id, data, deleted, updated_at, seq';

/**
 * Look up local `_updatedAt` for the rows in a pull page.
 *
 * Returns undefined for "no local record" and 0 for "record exists but has no
 * timestamp". The distinction matters: a remote *delete* must be ignored when
 * we never had the record, but applied when we have an untimestamped one.
 */
async function localTimestamps(
  rows: RemoteRow[],
): Promise<(table: string, id: string) => number | undefined> {
  const idsByTable = new Map<string, string[]>();
  for (const row of rows) {
    const ids = idsByTable.get(row.table_name) ?? [];
    ids.push(row.record_id);
    idsByTable.set(row.table_name, ids);
  }

  const found = new Map<string, number>();
  for (const [table, ids] of idsByTable) {
    if (!SYNCED_TABLES.some((t) => t.name === table)) continue; // unknown table
    const records = await db.table(table).bulkGet(ids);
    records.forEach((record, i) => {
      if (record === undefined) return;
      const stamp = (record as { _updatedAt?: number })._updatedAt;
      found.set(`${table}:${ids[i]}`, typeof stamp === 'number' ? stamp : 0);
    });
  }

  return (table, id) => found.get(`${table}:${id}`);
}

/**
 * Download and apply everything above this device's pull watermark.
 *
 * `mode` is 'remote-wins' only for the first pull when adopting an existing
 * account — see the note on PullMode in src/lib/sync.ts.
 */
export async function pull(
  userId: string,
  mode: PullMode = 'lww',
): Promise<{ pulled: number; skipped: number }> {
  const supabase = requireSupabase();
  let pulled = 0;
  let skipped = 0;

  for (;;) {
    const state = await getSyncState();
    const { data, error } = await supabase
      .from('records')
      .select(SELECT_COLUMNS)
      .eq('user_id', userId)
      .gt('seq', state.seq)
      .order('seq', { ascending: true })
      .limit(PULL_PAGE);

    if (error) throw new Error(`Pull failed: ${error.message}`);
    const rows = (data ?? []) as RemoteRow[];
    if (rows.length === 0) break;

    const plan = planPull(rows, await localTimestamps(rows), state.seq, mode);

    const touched = new Set([
      ...Object.keys(plan.upserts),
      ...Object.keys(plan.deletes),
    ]);
    if (touched.size > 0) {
      await db.transaction(
        'rw',
        [...touched].map((t) => db.table(t)),
        async () => {
          for (const [table, records] of Object.entries(plan.upserts)) {
            await db.table(table).bulkPut(records);
          }
          for (const [table, ids] of Object.entries(plan.deletes)) {
            // Deliberately not deleteAndTrack: a delete that came *from* the
            // server must not generate a tombstone that we push back.
            await db.table(table).bulkDelete(ids);
          }
        },
      );
    }

    await patchSyncState({
      seq: plan.seq,
      pushedThrough: advancePushWatermark(
        (await getSyncState()).pushedThrough,
        rows,
      ),
    });

    pulled += plan.applied;
    skipped += plan.skipped;
    if (rows.length < PULL_PAGE) break;
  }

  return { pulled, skipped };
}

/** Split rows into request-sized batches, bounded by bytes and by count. */
function batchRows(rows: PushRow[]): PushRow[][] {
  const batches: PushRow[][] = [];
  let batch: PushRow[] = [];
  let bytes = 0;

  for (const row of rows) {
    const size = row.data ? JSON.stringify(row.data).length : 64;
    if (batch.length > 0 && (bytes + size > MAX_BATCH_BYTES || batch.length >= MAX_BATCH_ROWS)) {
      batches.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(row);
    bytes += size;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

/** Upload every local change above the push watermark, plus all tombstones. */
export async function push(userId: string): Promise<number> {
  const supabase = requireSupabase();
  const state = await getSyncState();

  const collected: PushRow[] = [];
  for (const { name, pk } of SYNCED_TABLES) {
    const dirty = await db
      .table(name)
      .where('_updatedAt')
      .above(state.pushedThrough)
      .toArray();
    for (const record of dirty) {
      collected.push(toPushRow(name, pk, record as Record<string, unknown>));
    }
  }

  const tombstones = await db.outbox.toArray();
  for (const t of tombstones) {
    collected.push(tombstoneToPushRow(t.table, t.recordId, t.deletedAt));
  }

  // A re-seed after a wipe produces a tombstone and an upsert for the same
  // stable chapter id; Postgres rejects a batch that touches one key twice.
  const rows = dedupePushRows(collected);
  if (rows.length === 0) return 0;

  for (const batch of batchRows(rows)) {
    const { error } = await supabase.from('records').upsert(
      batch.map((row) => ({ ...row, user_id: userId })),
      { onConflict: 'user_id,table_name,record_id' },
    );
    if (error) throw new Error(`Push failed: ${error.message}`);
  }

  // Advance only past what actually went up. Anything written while we were
  // uploading keeps a newer timestamp and gets caught by the next push.
  const highest = rows.reduce((max, r) => Math.max(max, r.updated_at), state.pushedThrough);
  await patchSyncState({ pushedThrough: highest });

  // Tombstones are only clearable once their deletes are durably on the server.
  await db.outbox.bulkDelete(tombstones.map((t) => t.key));

  return rows.length;
}

/** One full cycle: pull first so local edits are reconciled before uploading. */
export async function syncNow(userId: string, mode: PullMode = 'lww'): Promise<SyncResult> {
  const { pulled, skipped } = await pull(userId, mode);
  const pushed = await push(userId);
  await patchSyncState({ lastSyncAt: Date.now(), userId });
  return { pulled, skipped, pushed };
}

/**
 * Does this device hold real work, or only seeded defaults?
 *
 * Drives whether first sign-in has to ask merge-or-replace. Seeded chapters
 * and formulas don't count — every device has those.
 */
export async function localWorkSummary(): Promise<{
  mocks: number;
  mistakes: number;
  sessions: number;
  goals: number;
  editedChapters: number;
  customFormulas: number;
}> {
  const [mocks, mistakes, sessions, goals, chapters, formulas] = await Promise.all([
    db.mocks.count(),
    db.mistakes.count(),
    db.sessions.count(),
    db.goals.count(),
    db.chapters.toArray(),
    // `isSeeded` isn't indexed (and booleans aren't valid Dexie keys anyway),
    // so filter in JS rather than with .where().
    db.formulas.filter((f) => !f.isSeeded).count(),
  ]);

  const editedChapters = chapters.filter(
    (c) => c.status !== 'not-started' || c.confidence !== 1 || c.notes.trim() !== '' || c.isCustom,
  ).length;

  return { mocks, mistakes, sessions, goals, editedChapters, customFormulas: formulas };
}

/** Check whether the account already holds data, to detect a two-sided merge. */
export async function remoteHasData(userId: string): Promise<boolean> {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from('records')
    .select('record_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .limit(1);
  if (error) throw new Error(`Could not read the account: ${error.message}`);
  return (count ?? 0) > 0;
}
