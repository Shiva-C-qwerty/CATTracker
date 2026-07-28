// Domain entities for the CAT Prep Tracker. Mirrors the domain model in
// CLAUDE.md. Derived values (accuracy, net score, mastery) are computed at
// read time in src/lib — NOT stored — except MockSection.score.

export type SectionId = 'VARC' | 'DILR' | 'QA';

export type ChapterStatus =
  | 'not-started'
  | 'learning'
  | 'practicing'
  | 'revising'
  | 'strong';

export type Confidence = 1 | 2 | 3 | 4 | 5;

export interface Chapter {
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

export interface Mock {
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

export interface Mistake {
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

export interface Formula {
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

export interface StudySession {
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

export interface DailyLog {
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

export interface Goal {
  id: string;
  type: GoalType;
  label: string;
  targetValue: number;
  currentValue: number; // derived where possible
  deadline: number | null;
  isActive: boolean;
}

// Key/value store for app metadata: lastExportAt, seedVersion, exam date, etc.
export interface MetaRecord {
  key: string;
  value: unknown;
}
