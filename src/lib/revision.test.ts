import { describe, expect, it } from 'vitest';
import { estimatedMinutes, gradeReview } from './revision';

const DAY = 24 * 60 * 60 * 1000;
const base = { intervalDays: 1, reviewStreak: 0, revisionCount: 0, lapses: 0 };

describe('gradeReview', () => {
  it('got-it grows interval ×2.5 with a 3-day floor', () => {
    const r = gradeReview(base, 'got-it', 0);
    expect(r.intervalDays).toBe(3); // max(3, round(2.5))
    expect(r.nextRevisionAt).toBe(3 * DAY);
    expect(r.reviewStreak).toBe(1);
    expect(r.isResolved).toBe(false);
    expect(r.revisionCount).toBe(1);
  });

  it('two consecutive got-its resolves the mistake', () => {
    const first = gradeReview(base, 'got-it', 0);
    const second = gradeReview(
      { ...base, intervalDays: first.intervalDays, reviewStreak: first.reviewStreak },
      'got-it',
      0,
    );
    expect(second.reviewStreak).toBe(2);
    expect(second.isResolved).toBe(true);
    expect(second.intervalDays).toBe(Math.max(3, Math.round(3 * 2.5))); // 8
  });

  it('partial grows ×1.2 with a 2-day floor and resets streak', () => {
    const r = gradeReview({ ...base, reviewStreak: 1, intervalDays: 10 }, 'partial', 0);
    expect(r.intervalDays).toBe(12);
    expect(r.reviewStreak).toBe(0);
    expect(r.isResolved).toBe(false);
  });

  it('wrong resets to 1 day, bumps lapses, resets streak', () => {
    const r = gradeReview({ ...base, reviewStreak: 1, intervalDays: 20, lapses: 2 }, 'wrong', 0);
    expect(r.intervalDays).toBe(1);
    expect(r.nextRevisionAt).toBe(DAY);
    expect(r.lapses).toBe(3);
    expect(r.reviewStreak).toBe(0);
  });

  it('defaults interval/streak when missing (old records)', () => {
    const r = gradeReview({ revisionCount: 0, lapses: 0 }, 'got-it', 0);
    expect(r.intervalDays).toBe(3);
  });
});

describe('estimatedMinutes', () => {
  it('estimates ~45s per card', () => {
    expect(estimatedMinutes(4)).toBe(3); // 180s → 3 min
    expect(estimatedMinutes(0)).toBe(0);
  });
});
