import { describe, expect, it } from 'vitest';
import { buildSeedChapters } from './chapters';

describe('buildSeedChapters', () => {
  const chapters = buildSeedChapters();

  it('produces the full CAT chapter list', () => {
    // QA(8+8+6+5+3=30) + DILR(6+9=15) + VARC(5+5=10) = 55
    expect(chapters).toHaveLength(55);
  });

  it('has unique, non-empty ids', () => {
    const ids = new Set(chapters.map((c) => c.id));
    expect(ids.size).toBe(chapters.length);
    expect(chapters.every((c) => c.id.length > 0)).toBe(true);
  });

  it('assigns contiguous orderIndex values', () => {
    const orders = chapters.map((c) => c.orderIndex);
    expect(orders).toEqual(chapters.map((_, i) => i));
  });

  it('seeds every chapter as not-started, confidence 1, non-custom', () => {
    expect(
      chapters.every(
        (c) => c.status === 'not-started' && c.confidence === 1 && !c.isCustom,
      ),
    ).toBe(true);
  });

  it('only uses the three CAT sections', () => {
    const sections = new Set(chapters.map((c) => c.sectionId));
    expect([...sections].sort()).toEqual(['DILR', 'QA', 'VARC']);
  });
});
