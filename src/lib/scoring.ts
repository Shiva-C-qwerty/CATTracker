import type { Mock, MockSection } from '@/db/types';

// CAT scoring: +3 correct, −1 incorrect (MCQ). TITA incorrect is 0, but at
// entry time we only capture attempted/correct/incorrect, so score is computed
// as correct*3 − incorrect. If the user logs TITA wrongs as "incorrect" that
// slightly under-scores; acceptable for a personal tracker. All functions here
// are pure (CLAUDE.md convention).

export const MARK_CORRECT = 3;
export const MARK_INCORRECT = -1;

/** Raw score for a section from correct/incorrect counts. */
export function sectionScore(correct: number, incorrect: number): number {
  return correct * MARK_CORRECT + incorrect * MARK_INCORRECT;
}

/** Accuracy = correct / attempted, in [0, 1]. 0 when nothing attempted. */
export function accuracy(correct: number, attempted: number): number {
  return attempted > 0 ? correct / attempted : 0;
}

/** Attempts per minute; 0 when no time recorded. */
export function attemptsPerMin(attempted: number, timeSpentMin: number): number {
  return timeSpentMin > 0 ? attempted / timeSpentMin : 0;
}

export interface SectionDerived {
  score: number;
  accuracy: number;
  net: number; // alias of score, the net after negatives
  attemptsPerMin: number;
}

/** All derived read-time stats for a section entry. */
export function deriveSection(s: MockSection): SectionDerived {
  const score = sectionScore(s.correct, s.incorrect);
  return {
    score,
    net: score,
    accuracy: accuracy(s.correct, s.attempted),
    attemptsPerMin: attemptsPerMin(s.attempted, s.timeSpentMin),
  };
}

export interface MockTotals {
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  accuracy: number;
  timeSpentMin: number;
}

/** Aggregate totals across a mock's sections. */
export function mockTotals(sections: MockSection[]): MockTotals {
  const t = sections.reduce(
    (acc, s) => {
      acc.attempted += s.attempted;
      acc.correct += s.correct;
      acc.incorrect += s.incorrect;
      acc.score += sectionScore(s.correct, s.incorrect);
      acc.timeSpentMin += s.timeSpentMin;
      return acc;
    },
    { attempted: 0, correct: 0, incorrect: 0, score: 0, timeSpentMin: 0 },
  );
  return { ...t, accuracy: accuracy(t.correct, t.attempted) };
}

/** Convenience: totals for a whole Mock. */
export function totalsForMock(mock: Mock): MockTotals {
  return mockTotals(mock.sections);
}

/** True when a mock is taken but not yet analysed. */
export function needsAnalysis(mock: Mock): boolean {
  return mock.analysedAt == null;
}
