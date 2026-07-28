import { describe, expect, it } from 'vitest';
import type { Mistake, Mock } from '@/db/types';
import {
  dueMistakes,
  daysUntil,
  lastNMocksChrono,
  recentMistakes,
  staleUnanalysedMocks,
} from './dashboard';

const DAY = 24 * 60 * 60 * 1000;

function mock(overrides: Partial<Mock> = {}): Mock {
  return {
    id: Math.random().toString(36),
    name: 'M',
    provider: '',
    type: 'full-mock',
    takenAt: 0,
    sections: [],
    overallPercentile: null,
    notes: '',
    analysedAt: null,
    ...overrides,
  };
}

function mistake(overrides: Partial<Mistake> = {}): Mistake {
  return {
    id: Math.random().toString(36),
    chapterId: 'c',
    sourceType: 'practice',
    sourceId: null,
    sourceLabel: '',
    createdAt: 0,
    errorType: 'silly-mistake',
    questionText: '',
    questionImage: null,
    myApproach: '',
    correctApproach: '',
    keyTakeaway: '',
    timeSpentSec: null,
    difficulty: 'medium',
    tags: [],
    revisionCount: 0,
    lastRevisedAt: null,
    nextRevisionAt: null,
    lapses: 0,
    isResolved: false,
    ...overrides,
  };
}

describe('daysUntil', () => {
  const now = Date.UTC(2026, 6, 25, 12);
  it('counts calendar days ahead', () => {
    expect(daysUntil(now + 10 * DAY, now)).toBe(10);
  });
  it('is negative after the target', () => {
    expect(daysUntil(now - 3 * DAY, now)).toBe(-3);
  });
});

describe('staleUnanalysedMocks', () => {
  const now = 100 * DAY;
  it('includes unanalysed mocks older than 24h', () => {
    const res = staleUnanalysedMocks([mock({ takenAt: now - 2 * DAY })], now);
    expect(res).toHaveLength(1);
  });
  it('excludes analysed mocks', () => {
    const res = staleUnanalysedMocks([mock({ takenAt: now - 2 * DAY, analysedAt: now })], now);
    expect(res).toHaveLength(0);
  });
  it('excludes fresh unanalysed mocks (<24h)', () => {
    const res = staleUnanalysedMocks([mock({ takenAt: now - 1000 })], now);
    expect(res).toHaveLength(0);
  });
});

describe('recentMistakes', () => {
  const now = 100 * DAY;
  it('keeps mistakes within the window', () => {
    const list = [mistake({ createdAt: now - 5 * DAY }), mistake({ createdAt: now - 40 * DAY })];
    expect(recentMistakes(list, now, 30)).toHaveLength(1);
  });
});

describe('lastNMocksChrono', () => {
  it('returns the last n sorted oldest→newest', () => {
    const mocks = [mock({ takenAt: 3 }), mock({ takenAt: 1 }), mock({ takenAt: 2 })];
    const res = lastNMocksChrono(mocks, 2);
    expect(res.map((m) => m.takenAt)).toEqual([2, 3]);
  });
});

describe('dueMistakes', () => {
  const now = 100 * DAY;
  it('returns unresolved mistakes past their next-revision time', () => {
    const list = [
      mistake({ nextRevisionAt: now - DAY }),
      mistake({ nextRevisionAt: now + DAY }),
      mistake({ nextRevisionAt: now - DAY, isResolved: true }),
    ];
    expect(dueMistakes(list, now)).toHaveLength(1);
  });
});
