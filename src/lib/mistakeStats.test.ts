import { describe, expect, it } from 'vitest';
import type { ErrorType, Mistake } from '@/db/types';
import { countByChapter, countByErrorType, dominantErrorType } from './mistakeStats';

let seq = 0;
function mistake(errorType: ErrorType, chapterId = 'c1'): Mistake {
  return {
    id: `m${seq++}`,
    chapterId,
    sourceType: 'practice',
    sourceId: null,
    sourceLabel: '',
    createdAt: 0,
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

describe('countByErrorType', () => {
  it('counts and sorts most-frequent first with shares', () => {
    const res = countByErrorType([
      mistake('calculation-slip'),
      mistake('calculation-slip'),
      mistake('conceptual-gap'),
    ]);
    expect(res[0]).toMatchObject({ errorType: 'calculation-slip', count: 2 });
    expect(res[0]?.share).toBeCloseTo(2 / 3);
    expect(res[1]).toMatchObject({ errorType: 'conceptual-gap', count: 1 });
  });

  it('is empty for no mistakes', () => {
    expect(countByErrorType([])).toEqual([]);
  });
});

describe('countByChapter', () => {
  it('counts per chapter, most-frequent first', () => {
    const res = countByChapter([
      mistake('silly-mistake', 'a'),
      mistake('silly-mistake', 'b'),
      mistake('silly-mistake', 'b'),
    ]);
    expect(res[0]).toEqual({ chapterId: 'b', count: 2 });
    expect(res[1]).toEqual({ chapterId: 'a', count: 1 });
  });
});

describe('dominantErrorType', () => {
  it('returns null below the minimum sample', () => {
    expect(dominantErrorType([mistake('time-pressure'), mistake('time-pressure')])).toBeNull();
  });

  it('flags a type above the threshold share', () => {
    const list = [
      mistake('time-pressure'),
      mistake('time-pressure'),
      mistake('time-pressure'),
      mistake('conceptual-gap'),
    ];
    const dom = dominantErrorType(list); // 3/4 = 75% > 30%
    expect(dom?.errorType).toBe('time-pressure');
  });

  it('returns null when spread out below threshold', () => {
    const list = [
      mistake('time-pressure'),
      mistake('conceptual-gap'),
      mistake('silly-mistake'),
      mistake('calculation-slip'),
    ];
    expect(dominantErrorType(list)).toBeNull(); // max share 25% < 30%
  });
});
