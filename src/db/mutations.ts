import { format } from 'date-fns';
import { db } from './db';
import { deleteAndTrack } from './changeTracking';
import { newId } from '@/lib/id';
import { sectionScore } from '@/lib/scoring';
import { gradeReview, type ReviewGrade } from '@/lib/revision';
import type {
  Chapter,
  ChapterStatus,
  Confidence,
  DailyLog,
  Difficulty,
  ErrorType,
  Formula,
  Goal,
  GoalType,
  Mistake,
  MistakeSourceType,
  Mock,
  MockSection,
  MockType,
  SectionId,
  StudyActivity,
  StudySession,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// All writes go through named functions here — components never call
// db.table.put() directly (see CLAUDE.md → Code Conventions). Reads use
// useLiveQuery against `db` directly.

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

export function updateChapterStatus(id: string, status: ChapterStatus): Promise<number> {
  return db.chapters.update(id, { status });
}

export function updateChapterConfidence(id: string, confidence: Confidence): Promise<number> {
  return db.chapters.update(id, { confidence });
}

export function updateChapterNotes(id: string, notes: string): Promise<number> {
  return db.chapters.update(id, { notes });
}

export function markChapterStudied(id: string, at: number = Date.now()): Promise<number> {
  return db.chapters.update(id, { lastStudiedAt: at });
}

export async function addCustomChapter(input: {
  sectionId: SectionId;
  topicGroup: string;
  name: string;
}): Promise<string> {
  // orderIndex is not an index — compute the max in JS to avoid a SchemaError.
  const all = await db.chapters.toArray();
  const maxOrderIndex = all.reduce((m, c) => Math.max(m, c.orderIndex), -1);
  const chapter: Chapter = {
    id: newId(),
    sectionId: input.sectionId,
    topicGroup: input.topicGroup,
    name: input.name,
    status: 'not-started',
    confidence: 1,
    lastStudiedAt: null,
    lastRevisedAt: null,
    targetRevisitAt: null,
    notes: '',
    isCustom: true,
    orderIndex: maxOrderIndex + 1,
  };
  await db.chapters.add(chapter);
  return chapter.id;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

export interface MockSectionInput {
  sectionId: SectionId;
  attempted: number;
  correct: number;
  incorrect: number;
  timeSpentMin: number;
  percentile: number | null;
}

export interface MockInput {
  name: string;
  provider: string;
  type: MockType;
  takenAt: number;
  overallPercentile: number | null;
  notes: string;
  sections: MockSectionInput[];
}

/** Stamp the stored `score` on each section (see CLAUDE.md — score is the one
 * derived value we persist, for query performance). */
function withScores(sections: MockSectionInput[]): MockSection[] {
  return sections.map((s) => ({
    ...s,
    score: sectionScore(s.correct, s.incorrect),
  }));
}

export async function addMock(input: MockInput): Promise<string> {
  const mock: Mock = {
    id: newId(),
    name: input.name,
    provider: input.provider,
    type: input.type,
    takenAt: input.takenAt,
    sections: withScores(input.sections),
    overallPercentile: input.overallPercentile,
    notes: input.notes,
    analysedAt: null,
  };
  await db.mocks.add(mock);
  return mock.id;
}

export async function updateMock(id: string, input: MockInput): Promise<number> {
  return db.mocks.update(id, {
    name: input.name,
    provider: input.provider,
    type: input.type,
    takenAt: input.takenAt,
    sections: withScores(input.sections),
    overallPercentile: input.overallPercentile,
    notes: input.notes,
  });
}

export function updateMockNotes(id: string, notes: string): Promise<number> {
  return db.mocks.update(id, { notes });
}

export function setMockAnalysed(id: string, analysed: boolean): Promise<number> {
  return db.mocks.update(id, { analysedAt: analysed ? Date.now() : null });
}

export function deleteMock(id: string): Promise<void> {
  return deleteAndTrack('mocks', id);
}

// ---------------------------------------------------------------------------
// Mistakes
// ---------------------------------------------------------------------------

export interface MistakeInput {
  chapterId: string;
  errorType: ErrorType;
  keyTakeaway: string;
  // Everything below is optional — quick-add captures the minimum.
  sourceType?: MistakeSourceType;
  sourceId?: string | null;
  sourceLabel?: string;
  questionText?: string;
  questionImage?: string | null;
  myApproach?: string;
  correctApproach?: string;
  timeSpentSec?: number | null;
  difficulty?: Difficulty;
  tags?: string[];
}

function normaliseTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (t) seen.add(t);
  }
  return [...seen];
}

export async function addMistake(input: MistakeInput): Promise<string> {
  const now = Date.now();
  const mistake: Mistake = {
    id: newId(),
    chapterId: input.chapterId,
    sourceType: input.sourceType ?? 'practice',
    sourceId: input.sourceId ?? null,
    sourceLabel: input.sourceLabel ?? '',
    createdAt: now,
    errorType: input.errorType,
    questionText: input.questionText ?? '',
    questionImage: input.questionImage ?? null,
    myApproach: input.myApproach ?? '',
    correctApproach: input.correctApproach ?? '',
    keyTakeaway: input.keyTakeaway,
    timeSpentSec: input.timeSpentSec ?? null,
    difficulty: input.difficulty ?? 'medium',
    tags: normaliseTags(input.tags),
    revisionCount: 0,
    lastRevisedAt: null,
    // Enter the revision queue tomorrow by default (SM-2 refines this later).
    nextRevisionAt: now + DAY_MS,
    lapses: 0,
    isResolved: false,
    intervalDays: 1,
    reviewStreak: 0,
  };
  await db.mistakes.add(mistake);
  return mistake.id;
}

/** Grade a mistake in the revision queue (SM-2 scheduling). */
export async function reviewMistake(id: string, grade: ReviewGrade): Promise<void> {
  const m = await db.mistakes.get(id);
  if (!m) return;
  await db.mistakes.update(id, gradeReview(m, grade) as Partial<Mistake>);
}

export async function updateMistake(
  id: string,
  patch: Partial<Omit<Mistake, 'id' | 'createdAt'>>,
): Promise<number> {
  const next = patch.tags ? { ...patch, tags: normaliseTags(patch.tags) } : patch;
  return db.mistakes.update(id, next);
}

export function setMistakeResolved(id: string, resolved: boolean): Promise<number> {
  return db.mistakes.update(id, { isResolved: resolved });
}

export function deleteMistake(id: string): Promise<void> {
  return deleteAndTrack('mistakes', id);
}

// ---------------------------------------------------------------------------
// Formulas
// ---------------------------------------------------------------------------

export interface FormulaInput {
  chapterId: string;
  title: string;
  latex: string;
  plainText: string;
  description: string;
  whenToUse: string;
  commonTrap: string;
}

export async function addFormula(input: FormulaInput): Promise<string> {
  const formula: Formula = {
    id: newId(),
    ...input,
    isSeeded: false,
    isStarred: false,
    createdAt: Date.now(),
  };
  await db.formulas.add(formula);
  return formula.id;
}

export function updateFormula(id: string, patch: Partial<FormulaInput>): Promise<number> {
  return db.formulas.update(id, patch);
}

export function toggleFormulaStar(id: string, starred: boolean): Promise<number> {
  return db.formulas.update(id, { isStarred: starred });
}

export function deleteFormula(id: string): Promise<void> {
  return deleteAndTrack('formulas', id);
}

// ---------------------------------------------------------------------------
// Study sessions & daily log
// ---------------------------------------------------------------------------

export interface StudySessionInput {
  chapterId: string | null;
  sectionId: SectionId | null;
  startedAt: number;
  durationMin: number;
  questionsAttempted: number | null;
  questionsCorrect: number | null;
  activity: StudyActivity;
  notes: string;
}

export async function addStudySession(input: StudySessionInput): Promise<string> {
  const session: StudySession = { id: newId(), ...input };
  await db.transaction('rw', [db.sessions, db.chapters, db.dailyLogs], async () => {
    await db.sessions.add(session);
    if (input.chapterId) {
      const chapter = await db.chapters.get(input.chapterId);
      if (chapter && (chapter.lastStudiedAt == null || input.startedAt > chapter.lastStudiedAt)) {
        await db.chapters.update(input.chapterId, { lastStudiedAt: input.startedAt });
      }
    }
    await recomputeDailyLog(format(input.startedAt, 'yyyy-MM-dd'));
  });
  return session.id;
}

export async function deleteStudySession(id: string): Promise<void> {
  const session = await db.sessions.get(id);
  await deleteAndTrack('sessions', id);
  if (session) await recomputeDailyLog(format(session.startedAt, 'yyyy-MM-dd'));
}

/** Recompute a day's derived totals from its sessions, preserving mood/reflection. */
async function recomputeDailyLog(date: string): Promise<void> {
  const dayStart = new Date(`${date}T00:00:00`).getTime();
  const dayEnd = new Date(`${date}T23:59:59.999`).getTime();
  const sessions = await db.sessions.where('startedAt').between(dayStart, dayEnd, true, true).toArray();
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const sectionsTouched = [...new Set(sessions.map((s) => s.sectionId).filter((s): s is SectionId => s != null))];
  const existing = await db.dailyLogs.get(date);
  await db.dailyLogs.put({
    date,
    totalMinutes,
    sectionsTouched,
    mood: existing?.mood ?? null,
    reflection: existing?.reflection ?? '',
  });
}

export async function upsertDailyLog(
  date: string,
  patch: { mood?: DailyLog['mood']; reflection?: string },
): Promise<void> {
  const existing = await db.dailyLogs.get(date);
  await db.dailyLogs.put({
    date,
    totalMinutes: existing?.totalMinutes ?? 0,
    sectionsTouched: existing?.sectionsTouched ?? [],
    mood: patch.mood !== undefined ? patch.mood : (existing?.mood ?? null),
    reflection: patch.reflection !== undefined ? patch.reflection : (existing?.reflection ?? ''),
  });
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export interface GoalInput {
  type: GoalType;
  label: string;
  targetValue: number;
  deadline: number | null;
}

export async function addGoal(input: GoalInput): Promise<string> {
  const goal: Goal = {
    id: newId(),
    type: input.type,
    label: input.label,
    targetValue: input.targetValue,
    currentValue: 0,
    deadline: input.deadline,
    isActive: true,
  };
  await db.goals.add(goal);
  return goal.id;
}

export function updateGoal(id: string, patch: Partial<Omit<Goal, 'id'>>): Promise<number> {
  return db.goals.update(id, patch);
}

export function deleteGoal(id: string): Promise<void> {
  return deleteAndTrack('goals', id);
}
