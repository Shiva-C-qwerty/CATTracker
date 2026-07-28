import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';

/** Distinct provider names seen so far, for autocomplete. */
export function useProviders(): string[] {
  return (
    useLiveQuery(async () => {
      const providers = new Set<string>();
      await db.mocks.each((m) => {
        if (m.provider.trim()) providers.add(m.provider.trim());
      });
      return [...providers].sort();
    }, []) ?? []
  );
}
