import { startOfWeek } from 'date-fns';
import type { Chapter, Goal, Mock, StudySession } from '@/db/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GoalContext {
  mocks: Mock[];
  sessions: StudySession[];
  chapters: Chapter[];
  now?: number;
}

/**
 * Current value for a goal, derived from live data where possible. `custom`
 * goals fall back to the stored currentValue (user-maintained). Pure + tested.
 */
export function goalCurrentValue(goal: Goal, ctx: GoalContext): number {
  const now = ctx.now ?? Date.now();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();

  switch (goal.type) {
    case 'target-percentile':
      return ctx.mocks.reduce((max, m) => Math.max(max, m.overallPercentile ?? 0), 0);
    case 'weekly-hours': {
      const mins = ctx.sessions
        .filter((s) => s.startedAt >= weekStart)
        .reduce((sum, s) => sum + s.durationMin, 0);
      return Math.round((mins / 60) * 10) / 10;
    }
    case 'mocks-per-week':
      return ctx.mocks.filter((m) => m.takenAt >= weekStart).length;
    case 'chapter-completion':
      return ctx.chapters.filter((c) => c.status === 'strong').length;
    case 'custom':
      return goal.currentValue;
  }
}

/** Progress ratio in [0, 1] toward the goal's target. */
export function goalProgress(goal: Goal, ctx: GoalContext): number {
  const current = goalCurrentValue(goal, ctx);
  if (goal.targetValue <= 0) return 0;
  return Math.max(0, Math.min(1, current / goal.targetValue));
}

/** Whole days until a goal's deadline, or null if none. */
export function goalDaysLeft(goal: Goal, now: number = Date.now()): number | null {
  if (goal.deadline == null) return null;
  return Math.ceil((goal.deadline - now) / DAY_MS);
}
