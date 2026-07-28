import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { GoalContext } from '@/lib/goals';

/** Live data needed to derive goal progress. */
export function useGoalContext(): GoalContext {
  const mocks = useLiveQuery(() => db.mocks.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const chapters = useLiveQuery(() => db.chapters.toArray(), []);
  return { mocks: mocks ?? [], sessions: sessions ?? [], chapters: chapters ?? [] };
}
