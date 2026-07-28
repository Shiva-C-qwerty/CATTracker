import { describe, expect, it } from 'vitest';
import type { Mistake, StudySession } from '@/db/types';
import { errorTypeTrendByWeek, studyMinutesByDay, studyMinutesBySection } from './analytics';

const DAY = 24 * 60 * 60 * 1000;

function mistake(errorType: Mistake['errorType'], createdAt: number): Mistake {
  return {
    id: Math.random().toString(36),
    chapterId: 'c',
    sourceType: 'practice',
    sourceId: null,
    sourceLabel: '',
    createdAt,
    errorType,
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
  };
}

function session(sectionId: StudySession['sectionId'], durationMin: number, startedAt = 0): StudySession {
  return {
    id: Math.random().toString(36),
    chapterId: null,
    sectionId,
    startedAt,
    durationMin,
    questionsAttempted: null,
    questionsCorrect: null,
    activity: 'practice',
    notes: '',
  };
}

describe('errorTypeTrendByWeek', () => {
  const now = Date.UTC(2026, 6, 27, 12); // a Monday-ish reference

  it('produces one bucket per week', () => {
    expect(errorTypeTrendByWeek([], 8, now)).toHaveLength(8);
  });

  it('counts a recent mistake in the latest bucket', () => {
    const buckets = errorTypeTrendByWeek([mistake('time-pressure', now)], 8, now);
    const total = buckets.reduce((s, b) => s + b.counts['time-pressure'], 0);
    expect(total).toBe(1);
  });

  it('ignores mistakes older than the window', () => {
    const buckets = errorTypeTrendByWeek([mistake('time-pressure', now - 100 * DAY)], 4, now);
    const total = buckets.reduce((s, b) => s + b.counts['time-pressure'], 0);
    expect(total).toBe(0);
  });
});

describe('studyMinutesBySection', () => {
  it('sums minutes per section and ignores null', () => {
    const res = studyMinutesBySection([session('QA', 30), session('QA', 20), session(null, 99)]);
    expect(res.QA).toBe(50);
    expect(res.VARC).toBe(0);
  });
});

describe('studyMinutesByDay', () => {
  it('aggregates minutes per calendar day', () => {
    const res = studyMinutesByDay([session('QA', 30, 0), session('QA', 15, 0)]);
    expect(Object.values(res)[0]).toBe(45);
  });
});
