import { describe, expect, it } from 'vitest';
import type { MockSection } from '@/db/types';
import {
  accuracy,
  attemptsPerMin,
  deriveSection,
  mockTotals,
  sectionScore,
} from './scoring';

function section(overrides: Partial<MockSection> = {}): MockSection {
  return {
    sectionId: 'QA',
    attempted: 0,
    correct: 0,
    incorrect: 0,
    timeSpentMin: 0,
    score: 0,
    percentile: null,
    ...overrides,
  };
}

describe('sectionScore', () => {
  it('applies +3 / −1', () => {
    expect(sectionScore(10, 3)).toBe(27); // 30 − 3
  });
  it('is zero for no attempts', () => {
    expect(sectionScore(0, 0)).toBe(0);
  });
  it('can go negative', () => {
    expect(sectionScore(0, 4)).toBe(-4);
  });
});

describe('accuracy', () => {
  it('is correct/attempted', () => {
    expect(accuracy(9, 12)).toBeCloseTo(0.75);
  });
  it('guards divide-by-zero', () => {
    expect(accuracy(0, 0)).toBe(0);
  });
});

describe('attemptsPerMin', () => {
  it('divides attempts by time', () => {
    expect(attemptsPerMin(20, 40)).toBeCloseTo(0.5);
  });
  it('guards zero time', () => {
    expect(attemptsPerMin(20, 0)).toBe(0);
  });
});

describe('deriveSection', () => {
  it('derives score, accuracy and pace together', () => {
    const d = deriveSection(section({ attempted: 12, correct: 9, incorrect: 3, timeSpentMin: 40 }));
    expect(d.score).toBe(24); // 27 − 3
    expect(d.net).toBe(24);
    expect(d.accuracy).toBeCloseTo(0.75);
    expect(d.attemptsPerMin).toBeCloseTo(0.3);
  });
});

describe('mockTotals', () => {
  it('aggregates across sections', () => {
    const t = mockTotals([
      section({ sectionId: 'VARC', attempted: 20, correct: 15, incorrect: 5, timeSpentMin: 40 }),
      section({ sectionId: 'DILR', attempted: 14, correct: 10, incorrect: 4, timeSpentMin: 40 }),
      section({ sectionId: 'QA', attempted: 18, correct: 14, incorrect: 4, timeSpentMin: 40 }),
    ]);
    expect(t.attempted).toBe(52);
    expect(t.correct).toBe(39);
    expect(t.incorrect).toBe(13);
    expect(t.score).toBe(39 * 3 - 13); // 104
    expect(t.timeSpentMin).toBe(120);
    expect(t.accuracy).toBeCloseTo(39 / 52);
  });

  it('is all-zero for no sections', () => {
    const t = mockTotals([]);
    expect(t).toMatchObject({ attempted: 0, correct: 0, incorrect: 0, score: 0, accuracy: 0 });
  });
});
