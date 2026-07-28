import { describe, expect, it } from 'vitest';
import { defaultExamDate } from './meta';

describe('defaultExamDate', () => {
  it('is a Sunday in November of the given year', () => {
    const d = new Date(defaultExamDate(2026));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10); // November (0-indexed)
    expect(d.getDay()).toBe(0); // Sunday
  });

  it('is the LAST Sunday of November (within the final 7 days)', () => {
    const d = new Date(defaultExamDate(2026));
    expect(d.getDate()).toBeGreaterThanOrEqual(24);
    expect(d.getDate()).toBeLessThanOrEqual(30);
  });
});
