import Dexie, { type Table } from 'dexie';
import type {
  Chapter,
  DailyLog,
  Formula,
  Goal,
  MetaRecord,
  Mistake,
  Mock,
  StudySession,
  SyncState,
  Tombstone,
} from './types';

/** Tables that participate in cross-device sync, with their primary key name. */
export const SYNCED_TABLES = [
  { name: 'chapters', pk: 'id' },
  { name: 'mocks', pk: 'id' },
  { name: 'mistakes', pk: 'id' },
  { name: 'formulas', pk: 'id' },
  { name: 'sessions', pk: 'id' },
  { name: 'dailyLogs', pk: 'date' },
  { name: 'goals', pk: 'id' },
  { name: 'meta', pk: 'key' },
] as const;

export type SyncedTableName = (typeof SYNCED_TABLES)[number]['name'];

export class CatTrackerDB extends Dexie {
  chapters!: Table<Chapter, string>;
  mocks!: Table<Mock, string>;
  mistakes!: Table<Mistake, string>;
  formulas!: Table<Formula, string>;
  sessions!: Table<StudySession, string>;
  dailyLogs!: Table<DailyLog, string>;
  goals!: Table<Goal, string>;
  meta!: Table<MetaRecord, string>;
  // Sync bookkeeping (v2). Local-only — never synced.
  outbox!: Table<Tombstone, string>;
  syncState!: Table<SyncState, string>;

  constructor() {
    super('cat-prep-tracker');
    // Schema v1 — see CLAUDE.md → Dexie Schema.
    this.version(1).stores({
      chapters: 'id, sectionId, topicGroup, status, confidence, targetRevisitAt',
      mocks: 'id, takenAt, type, provider, analysedAt',
      mistakes:
        'id, chapterId, errorType, createdAt, nextRevisionAt, isResolved, *tags',
      formulas: 'id, chapterId, isStarred',
      sessions: 'id, chapterId, sectionId, startedAt, activity',
      dailyLogs: 'date',
      goals: 'id, isActive',
      meta: 'key',
    });

    // Schema v2 — cross-device sync. Adds a `_updatedAt` index to every synced
    // table (the push query scans it) plus two local-only bookkeeping tables.
    this.version(2)
      .stores({
        chapters:
          'id, sectionId, topicGroup, status, confidence, targetRevisitAt, _updatedAt',
        mocks: 'id, takenAt, type, provider, analysedAt, _updatedAt',
        mistakes:
          'id, chapterId, errorType, createdAt, nextRevisionAt, isResolved, *tags, _updatedAt',
        formulas: 'id, chapterId, isStarred, _updatedAt',
        sessions: 'id, chapterId, sectionId, startedAt, activity, _updatedAt',
        dailyLogs: 'date, _updatedAt',
        goals: 'id, isActive, _updatedAt',
        meta: 'key, _updatedAt',
        outbox: 'key, deletedAt',
        syncState: 'key',
      })
      .upgrade(async (tx) => {
        // Stamp every pre-existing row so it lands in the new `_updatedAt`
        // index and is therefore pushable. Without this, records created
        // before sync existed would be invisible to the push query and would
        // silently never reach the server.
        const now = Date.now();
        await Promise.all(
          SYNCED_TABLES.map(({ name }) =>
            tx
              .table(name)
              .toCollection()
              .modify((row: Record<string, unknown>) => {
                row._updatedAt = now;
              }),
          ),
        );
      });
  }
}

export const db = new CatTrackerDB();

// A second tab holding the old schema open will block this tab's upgrade, and
// a blocked upgrade means the seed (and every read after it) fails. That isn't
// hypothetical: it happens the first time a new build loads while the app is
// already open in another tab. Yield the connection and reload into the new
// schema rather than leaving a half-working tab behind.
if (typeof window !== 'undefined') {
  db.on('versionchange', () => {
    db.close();
    window.location.reload();
    return false;
  });

  db.on('blocked', () => {
    console.warn(
      'Database upgrade is blocked by another open tab. Close other CAT Tracker tabs.',
    );
  });
}

// Dev-only: expose the DB on window for manual testing in the console
// (e.g. backdating mistakes to test the revision queue). Not available in
// production builds.
if (import.meta.env.DEV) {
  (window as unknown as { __db: CatTrackerDB }).__db = db;
}
