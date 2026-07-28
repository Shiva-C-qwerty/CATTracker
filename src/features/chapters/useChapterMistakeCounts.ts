import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';

/**
 * Live map of chapterId → mistake count. Empty until mistakes exist (Phase 4).
 * Computed by scanning the mistakes table; fine at personal-tracker scale.
 */
export function useChapterMistakeCounts(): Record<string, number> {
  return (
    useLiveQuery(async () => {
      const counts: Record<string, number> = {};
      await db.mistakes.each((m) => {
        counts[m.chapterId] = (counts[m.chapterId] ?? 0) + 1;
      });
      return counts;
    }, []) ?? {}
  );
}
