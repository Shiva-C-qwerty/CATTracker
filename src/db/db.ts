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
} from './types';

export class CatTrackerDB extends Dexie {
  chapters!: Table<Chapter, string>;
  mocks!: Table<Mock, string>;
  mistakes!: Table<Mistake, string>;
  formulas!: Table<Formula, string>;
  sessions!: Table<StudySession, string>;
  dailyLogs!: Table<DailyLog, string>;
  goals!: Table<Goal, string>;
  meta!: Table<MetaRecord, string>;

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
  }
}

export const db = new CatTrackerDB();

// Dev-only: expose the DB on window for manual testing in the console
// (e.g. backdating mistakes to test the revision queue). Not available in
// production builds.
if (import.meta.env.DEV) {
  (window as unknown as { __db: CatTrackerDB }).__db = db;
}
