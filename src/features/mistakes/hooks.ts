import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Chapter } from '@/db/types';

/** All chapters, ordered, for pickers. `orderIndex` is not an index, so sort
 * in JS (the table is tiny) rather than with Dexie orderBy (SchemaError). */
export function useAllChapters(): Chapter[] | undefined {
  return useLiveQuery(
    () => db.chapters.toArray().then((cs) => cs.sort((a, b) => a.orderIndex - b.orderIndex)),
    [],
  );
}

/** Distinct tags seen across mistakes, for autocomplete. */
export function useAllTags(): string[] {
  return (
    useLiveQuery(async () => {
      const tags = new Set<string>();
      await db.mistakes.each((m) => m.tags.forEach((t) => tags.add(t)));
      return [...tags].sort();
    }, []) ?? []
  );
}
