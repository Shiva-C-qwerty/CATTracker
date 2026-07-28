import { differenceInCalendarDays } from 'date-fns';
import type { Mistake, Mock } from '@/db/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `now` until the exam. Negative once the exam has passed. */
export function daysUntil(target: number, now: number = Date.now()): number {
  return differenceInCalendarDays(target, now);
}

/**
 * Mocks taken but still unanalysed after `ageMs` (default 24h). Taking mocks
 * without analysing them is the #1 prep-failure mode, so the dashboard shouts
 * about these.
 */
export function staleUnanalysedMocks(
  mocks: Mock[],
  now: number = Date.now(),
  ageMs = DAY_MS,
): Mock[] {
  return mocks.filter((m) => m.analysedAt == null && now - m.takenAt > ageMs);
}

/** Mistakes created within the last `days` (default 30). */
export function recentMistakes(
  mistakes: Mistake[],
  now: number = Date.now(),
  days = 30,
): Mistake[] {
  const cutoff = now - days * DAY_MS;
  return mistakes.filter((m) => m.createdAt >= cutoff);
}

/** The last `n` mocks in chronological order (oldest→newest), for trend lines. */
export function lastNMocksChrono(mocks: Mock[], n = 10): Mock[] {
  return [...mocks].sort((a, b) => a.takenAt - b.takenAt).slice(-n);
}

/** Mistakes due for revision now (past their next-revision date, unresolved). */
export function dueMistakes(mistakes: Mistake[], now: number = Date.now()): Mistake[] {
  return mistakes.filter(
    (m) => !m.isResolved && m.nextRevisionAt != null && m.nextRevisionAt <= now,
  );
}
