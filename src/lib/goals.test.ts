import { describe, expect, it } from 'vitest';
import type { Chapter, Goal, Mock, StudySession } from '@/db/types';
import { goalCurrentValue, goalProgress } from './goals';

const now = Date.UTC(2026, 6, 29, 12); // mid-week Wednesday

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: 'g',
    type: 'custom',
    label: 'G',
    targetValue: 10,
    currentValue: 0,
    deadline: null,
    isActive: true,
    ...overrides,
  };
}

function mock(overrides: Partial<Mock>): Mock {
  return {
    id: Math.random().toString(36),
    name: '',
    provider: '',
    type: 'full-mock',
    takenAt: now,
    sections: [],
    overallPercentile: null,
    notes: '',
    analysedAt: null,
    ...overrides,
  };
}

function session(durationMin: number, startedAt: number): StudySession {
  return {
    id: Math.random().toString(36),
    chapterId: null,
    sectionId: null,
    startedAt,
    durationMin,
    questionsAttempted: null,
    questionsCorrect: null,
    activity: 'practice',
    notes: '',
  };
}

function chapter(status: Chapter['status']): Chapter {
  return {
    id: Math.random().toString(36),
    sectionId: 'QA',
    topicGroup: 'Arithmetic',
    name: 'X',
    status,
    confidence: 3,
    lastStudiedAt: null,
    lastRevisedAt: null,
    targetRevisitAt: null,
    notes: '',
    isCustom: false,
    orderIndex: 0,
  };
}

const empty = { mocks: [], sessions: [], chapters: [], now };

describe('goalCurrentValue', () => {
  it('target-percentile uses the best mock percentile', () => {
    const g = goal({ type: 'target-percentile', targetValue: 95 });
    const ctx = { ...empty, mocks: [mock({ overallPercentile: 80 }), mock({ overallPercentile: 91 })] };
    expect(goalCurrentValue(g, ctx)).toBe(91);
  });

  it('weekly-hours sums this week only', () => {
    const g = goal({ type: 'weekly-hours', targetValue: 20 });
    const ctx = {
      ...empty,
      sessions: [session(120, now), session(60, now - 10 * 24 * 60 * 60 * 1000)],
    };
    expect(goalCurrentValue(g, ctx)).toBe(2); // 120 min this week = 2h
  });

  it('chapter-completion counts strong chapters', () => {
    const g = goal({ type: 'chapter-completion', targetValue: 30 });
    const ctx = { ...empty, chapters: [chapter('strong'), chapter('strong'), chapter('learning')] };
    expect(goalCurrentValue(g, ctx)).toBe(2);
  });

  it('custom uses the stored value', () => {
    expect(goalCurrentValue(goal({ type: 'custom', currentValue: 7 }), empty)).toBe(7);
  });
});

describe('goalProgress', () => {
  it('clamps to [0,1]', () => {
    const g = goal({ type: 'custom', currentValue: 15, targetValue: 10 });
    expect(goalProgress(g, empty)).toBe(1);
  });
});
