import type { Chapter, ChapterStatus } from '@/db/types';

const DAY_MS = 24 * 60 * 60 * 1000;

// Higher status = more mastered → lower weakness contribution.
const STATUS_WEIGHT: Record<ChapterStatus, number> = {
  'not-started': 1.0,
  learning: 0.8,
  practicing: 0.55,
  revising: 0.4,
  strong: 0.15,
};

export interface WeaknessInput {
  chapter: Chapter;
  mistakeCount: number;
  now?: number;
}

/**
 * Composite weakness score in [0, 1+] — higher means the chapter needs work.
 * Blends self-rated confidence, chapter status, mistake density, and how long
 * since it was last touched. Pure and unit-tested; used to sort/surface weak
 * chapters. Not stored — computed at read time (CLAUDE.md convention).
 */
export function weaknessScore({ chapter, mistakeCount, now = Date.now() }: WeaknessInput): number {
  // Confidence 1..5 → 1..0 (low confidence = weak).
  const confidenceComponent = (5 - chapter.confidence) / 4;

  const statusComponent = STATUS_WEIGHT[chapter.status];

  // Mistake density: saturating so a few mistakes matter, many don't dominate.
  const mistakeComponent = mistakeCount / (mistakeCount + 3);

  // Staleness: chapters not studied in a while drift up, capped at 30 days.
  const last = chapter.lastStudiedAt ?? chapter.lastRevisedAt;
  const staleDays = last == null ? 30 : Math.min(30, (now - last) / DAY_MS);
  const staleComponent = staleDays / 30;

  return (
    0.4 * confidenceComponent +
    0.25 * statusComponent +
    0.25 * mistakeComponent +
    0.1 * staleComponent
  );
}
