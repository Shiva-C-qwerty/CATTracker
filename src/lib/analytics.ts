import { format, startOfWeek } from 'date-fns';
import type { ErrorType, Mistake, SectionId, StudySession } from '@/db/types';
import { ERROR_TYPES } from './errorTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeekBucket {
  label: string;
  weekStart: number;
  counts: Record<ErrorType, number>;
}

/**
 * Bucket mistakes into the last `weeks` calendar weeks, counting each error
 * type per week. Feeds the stacked-area "error type over time" chart. The goal
 * is watching conceptual-gap shrink while time-pressure comes to dominate.
 */
export function errorTypeTrendByWeek(
  mistakes: Mistake[],
  weeks = 8,
  now: number = Date.now(),
): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = thisWeekStart - i * 7 * DAY_MS;
    buckets.push({
      label: format(weekStart, 'dd MMM'),
      weekStart,
      counts: emptyCounts(),
    });
  }
  const firstStart = buckets[0]?.weekStart ?? thisWeekStart;
  for (const m of mistakes) {
    if (m.createdAt < firstStart) continue;
    const idx = Math.floor((m.createdAt - firstStart) / (7 * DAY_MS));
    const bucket = buckets[idx];
    if (bucket) bucket.counts[m.errorType] += 1;
  }
  return buckets;
}

function emptyCounts(): Record<ErrorType, number> {
  return ERROR_TYPES.reduce(
    (acc, e) => {
      acc[e] = 0;
      return acc;
    },
    {} as Record<ErrorType, number>,
  );
}

/** Total study minutes per section (null-section sessions are ignored). */
export function studyMinutesBySection(sessions: StudySession[]): Record<SectionId, number> {
  const out: Record<SectionId, number> = { VARC: 0, DILR: 0, QA: 0 };
  for (const s of sessions) {
    if (s.sectionId) out[s.sectionId] += s.durationMin;
  }
  return out;
}

/** Study minutes keyed by 'yyyy-MM-dd' — feeds the calendar heatmap. */
export function studyMinutesByDay(sessions: StudySession[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    const day = format(s.startedAt, 'yyyy-MM-dd');
    out[day] = (out[day] ?? 0) + s.durationMin;
  }
  return out;
}
