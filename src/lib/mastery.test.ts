import { describe, expect, it } from 'vitest';
import type { Chapter } from '@/db/types';
import { weaknessScore } from './mastery';

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1',
    sectionId: 'QA',
    topicGroup: 'Arithmetic',
    name: 'Percentages',
    status: 'not-started',
    confidence: 1,
    lastStudiedAt: null,
    lastRevisedAt: null,
    targetRevisitAt: null,
    notes: '',
    isCustom: false,
    orderIndex: 0,
    ...overrides,
  };
}

describe('weaknessScore', () => {
  const now = Date.UTC(2026, 6, 23);

  it('a fresh not-started low-confidence chapter is very weak', () => {
    const score = weaknessScore({ chapter: makeChapter(), mistakeCount: 0, now });
    expect(score).toBeGreaterThan(0.6);
  });

  it('a strong high-confidence recently-studied chapter is not weak', () => {
    const score = weaknessScore({
      chapter: makeChapter({ status: 'strong', confidence: 5, lastStudiedAt: now }),
      mistakeCount: 0,
      now,
    });
    expect(score).toBeLessThan(0.1);
  });

  it('more mistakes increase weakness, with saturation', () => {
    const base = makeChapter({ status: 'practicing', confidence: 3, lastStudiedAt: now });
    const few = weaknessScore({ chapter: base, mistakeCount: 2, now });
    const many = weaknessScore({ chapter: base, mistakeCount: 20, now });
    expect(many).toBeGreaterThan(few);
  });

  it('staleness increases weakness', () => {
    const recent = makeChapter({ confidence: 3, status: 'practicing', lastStudiedAt: now });
    const stale = makeChapter({
      confidence: 3,
      status: 'practicing',
      lastStudiedAt: now - 40 * 24 * 60 * 60 * 1000,
    });
    expect(weaknessScore({ chapter: stale, mistakeCount: 0, now })).toBeGreaterThan(
      weaknessScore({ chapter: recent, mistakeCount: 0, now }),
    );
  });
});
