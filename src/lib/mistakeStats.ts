import type { ErrorType, Mistake } from '@/db/types';

export interface ErrorTypeCount {
  errorType: ErrorType;
  count: number;
  share: number; // 0..1 of the total
}

/** Count mistakes by error type, sorted most-frequent first, with shares. */
export function countByErrorType(mistakes: Mistake[]): ErrorTypeCount[] {
  const counts = new Map<ErrorType, number>();
  for (const m of mistakes) {
    counts.set(m.errorType, (counts.get(m.errorType) ?? 0) + 1);
  }
  const total = mistakes.length;
  return [...counts.entries()]
    .map(([errorType, count]) => ({ errorType, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Count mistakes per chapter id, most-frequent first. */
export function countByChapter(mistakes: Mistake[]): Array<{ chapterId: string; count: number }> {
  const counts = new Map<string, number>();
  for (const m of mistakes) {
    counts.set(m.chapterId, (counts.get(m.chapterId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([chapterId, count]) => ({ chapterId, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The single error type exceeding `threshold` share of the set, if any — the
 * signal that a targeted fix would pay off. Needs a minimum sample so a couple
 * of mistakes don't trigger a false alarm.
 */
export function dominantErrorType(
  mistakes: Mistake[],
  threshold = 0.3,
  minSample = 4,
): ErrorTypeCount | null {
  if (mistakes.length < minSample) return null;
  const top = countByErrorType(mistakes)[0];
  return top && top.share > threshold ? top : null;
}
