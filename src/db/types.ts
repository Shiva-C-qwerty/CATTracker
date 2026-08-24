// Domain entities for the CAT Prep Tracker. Mirrors the domain model in
// CLAUDE.md. Derived values (accuracy, net score, mastery) are computed at
// read time in src/lib — NOT stored — except MockSection.score.

export type SectionId = 'VARC' | 'DILR' | 'QA';

/**
 * Sync bookkeeping carried by every syncable entity. Stamped automatically by
 * the change-tracking hooks in src/db/changeTracking.ts — never set it by hand
 * in a mutation. Optional because records written before schema v2 (and rows
 * from older JSON backups) won't have it; those are treated as "never synced"
 * and get stamped on the next write or on the v2 upgrade.
 */
export interface SyncFields {
  /** Client clock (ms) at the last local write. Drives last-write-wins. */
  _updatedAt?: number;
}

export type ChapterStatus =
  | 'not-started'
  | 'learning'
  | 'practicing'
  | 'revising'
  | 'strong';

export type Confidence = 1 | 2 | 3 | 4 | 5;

export interface Chapter extends SyncFields {
  id: string;
  sectionId: SectionId;
  topicGroup: string; // 'Arithmetic', 'RC', etc.
  name: string;
  status: ChapterStatus;
  confidence: Confidence;
  lastStudiedAt: number | null;
  lastRevisedAt: number | null;
  targetRevisitAt: number | null; // computed by spaced repetition
  notes: string; // markdown
  isCustom: boolean;
  orderIndex: number;
}

export type MockType = 'full-mock' | 'sectional' | 'topic-test';

export interface MockSection {
  sectionId: SectionId;
  attempted: number;
  correct: number;
  incorrect: number;
  timeSpentMin: number;
  score: number; // computed, but stored for query performance
  percentile: number | null;
}

export interface Mock extends SyncFields {
  id: string;
  name: string; // 'IMS SimCAT 07'
  provider: string; // free text, autocompleted from history
  type: MockType;
  takenAt: number;
  sections: MockSection[];
  overallPercentile: number | null;
  notes: string; // markdown — post-mortem
  analysedAt: number | null; // null = analysis pending
}

export type MistakeSourceType =
  | 'mock'
  | 'sectional'
  | 'practice'
  | 'module'
  | 'other';

export type ErrorType =
  | 'conceptual-gap'
  | 'application-error'
  | 'calculation-slip'
  | 'misread-question'
  | 'silly-mistake'
  | 'time-pressure'
  | 'guessed-wrong'
  | 'unattempted-should-have'
  | 'unattempted-correctly';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Mistake extends SyncFields {
  id: string;
  chapterId: string;
  sourceType: MistakeSourceType;
  sourceId: string | null; // FK to Mock if applicable
  sourceLabel: string; // 'SimCAT 07 Q14' — free text
  createdAt: number;

  errorType: ErrorType;

  questionText: string; // markdown + LaTeX
  questionImage: string | null; // base64 data URL, compressed before store
  myApproach: string;
  correctApproach: string;
  keyTakeaway: string;
  timeSpentSec: number | null;

  difficulty: Difficulty;
  tags: string[];

  // Revision loop (SM-2, simplified). intervalDays/reviewStreak are optional so
  // mistakes created before the revision feature still work (default to 1 / 0).
  revisionCount: number;
  lastRevisedAt: number | null;
  nextRevisionAt: number | null;
  lapses: number;
  isResolved: boolean;
  intervalDays?: number;
  reviewStreak?: number; // consecutive "Got it" — two in a row resolves it
}

export interface Formula extends SyncFields {
  id: string;
  chapterId: string;
  title: string;
  latex: string;
  plainText: string; // fallback + searchable
  description: string;
  whenToUse: string;
  commonTrap: string;
  isSeeded: boolean;
  isStarred: boolean;
  createdAt: number;
}

export type StudyActivity = 'learning' | 'practice' | 'revision' | 'mock-analysis';

export interface StudySession extends SyncFields {
  id: string;
  chapterId: string | null;
  sectionId: SectionId | null;
  startedAt: number;
  durationMin: number;
  questionsAttempted: number | null;
  questionsCorrect: number | null;
  activity: StudyActivity;
  notes: string;
}

export interface DailyLog extends SyncFields {
  date: string; // 'YYYY-MM-DD', primary key
  totalMinutes: number; // derived from sessions
  sectionsTouched: string[];
  mood: 1 | 2 | 3 | 4 | 5 | null;
  reflection: string;
}

export type GoalType =
  | 'target-percentile'
  | 'weekly-hours'
  | 'mocks-per-week'
  | 'chapter-completion'
  | 'custom';

export interface Goal extends SyncFields {
  id: string;
  type: GoalType;
  label: string;
  targetValue: number;
  currentValue: number; // derived where possible
  deadline: number | null;
  isActive: boolean;
}

// Key/value store for app metadata: lastExportAt, seedVersion, exam date, etc.
export interface MetaRecord extends SyncFields {
  key: string;
  value: unknown;
}

// ---------------------------------------------------------------------------
// Sync-only tables (schema v2). These are local bookkeeping and are themselves
// never synced — syncing the sync state would be circular.
// ---------------------------------------------------------------------------

/**
 * A delete that still needs to be propagated. Deletes can't be detected by
 * scanning the local tables (the row is gone), so the delete mutations record
 * one of these. `key` is `${table}:${recordId}` so repeat deletes collapse.
 */
export interface Tombstone {
  key: string;
  table: string;
  recordId: string;
  deletedAt: number;
}

/** Single-row (`key: 'default'`) sync bookkeeping for this device. */
export interface SyncState {
  key: string;
  /** Supabase user id this device is currently synced as; null = sync off. */
  userId: string | null;
  /** Pull watermark: the highest server `seq` this device has applied. */
  seq: number;
  /** Push watermark: rows with `_updatedAt` above this still need pushing. */
  pushedThrough: number;
  /** Wall-clock of the last fully successful sync, for the Settings UI. */
  lastSyncAt: number | null;
}
