import type { Mistake } from '@/db/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewGrade = 'got-it' | 'partial' | 'wrong';

export interface ReviewPatch {
  intervalDays: number;
  nextRevisionAt: number;
  lastRevisedAt: number;
  revisionCount: number;
  lapses: number;
  reviewStreak: number;
  isResolved: boolean;
}

/**
 * Modified SM-2 (simplified per CLAUDE.md):
 *  - got-it  → interval × 2.5, min 3 days; two consecutive got-its → resolved
 *  - partial → interval × 1.2, min 2 days; resets the streak
 *  - wrong   → reset to 1 day, increment lapses, resets the streak
 * Pure and unit-tested. Callers persist the returned patch.
 */
export function gradeReview(
  mistake: Pick<Mistake, 'intervalDays' | 'reviewStreak' | 'revisionCount' | 'lapses'>,
  grade: ReviewGrade,
  now: number = Date.now(),
): ReviewPatch {
  const currentInterval = mistake.intervalDays ?? 1;
  const streak = mistake.reviewStreak ?? 0;
  const lapses = mistake.lapses ?? 0;

  let intervalDays: number;
  let reviewStreak: number;
  let nextLapses = lapses;
  let isResolved = false;

  switch (grade) {
    case 'got-it':
      intervalDays = Math.max(3, Math.round(currentInterval * 2.5));
      reviewStreak = streak + 1;
      if (reviewStreak >= 2) isResolved = true;
      break;
    case 'partial':
      intervalDays = Math.max(2, Math.round(currentInterval * 1.2));
      reviewStreak = 0;
      break;
    case 'wrong':
      intervalDays = 1;
      reviewStreak = 0;
      nextLapses = lapses + 1;
      break;
  }

  return {
    intervalDays,
    nextRevisionAt: now + intervalDays * DAY_MS,
    lastRevisedAt: now,
    revisionCount: (mistake.revisionCount ?? 0) + 1,
    lapses: nextLapses,
    reviewStreak,
    isResolved,
  };
}

/** Rough time estimate for a revision queue, in minutes (~45s per card). */
export function estimatedMinutes(count: number): number {
  return Math.ceil((count * 45) / 60);
}
