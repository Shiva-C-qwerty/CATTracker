import type { Chapter, SectionId } from '../types';

// Seed chapter list from CLAUDE.md → Chapter Seed Data. Source of truth for
// the built-in chapters. IDs are stable slugs so re-seeding is idempotent.

interface SeedGroup {
  topicGroup: string;
  chapters: string[];
}

interface SeedSection {
  sectionId: SectionId;
  groups: SeedGroup[];
}

const SEED: SeedSection[] = [
  {
    sectionId: 'QA',
    groups: [
      {
        topicGroup: 'Arithmetic',
        chapters: [
          'Percentages',
          'Profit, Loss & Discount',
          'Simple & Compound Interest',
          'Ratio & Proportion',
          'Averages & Alligation',
          'Time, Speed & Distance',
          'Time & Work',
          'Mixtures',
        ],
      },
      {
        topicGroup: 'Algebra',
        chapters: [
          'Linear Equations',
          'Quadratic Equations',
          'Inequalities',
          'Functions & Graphs',
          'Logarithms',
          'Progressions (AP/GP/HP)',
          'Surds & Indices',
          'Maxima & Minima',
        ],
      },
      {
        topicGroup: 'Geometry',
        chapters: [
          'Triangles',
          'Circles',
          'Quadrilaterals & Polygons',
          'Coordinate Geometry',
          'Mensuration (2D & 3D)',
          'Trigonometry',
        ],
      },
      {
        topicGroup: 'Number System',
        chapters: [
          'Divisibility & Remainders',
          'HCF & LCM',
          'Factors & Factorials',
          'Base Systems',
          'Cyclicity & Unit Digits',
        ],
      },
      {
        topicGroup: 'Modern Math',
        chapters: [
          'Permutations & Combinations',
          'Probability',
          'Set Theory & Venn Diagrams',
        ],
      },
    ],
  },
  {
    sectionId: 'DILR',
    groups: [
      {
        topicGroup: 'DI',
        chapters: [
          'Tables',
          'Bar & Line Graphs',
          'Pie Charts',
          'Caselets',
          'Mixed/Multi-source DI',
          'Data Sufficiency',
        ],
      },
      {
        topicGroup: 'LR',
        chapters: [
          'Arrangements (Linear & Circular)',
          'Grouping & Distribution',
          'Blood Relations',
          'Puzzles & Matrix',
          'Games & Tournaments',
          'Cubes & Dice',
          'Venn-based LR',
          'Networks & Routes',
          'Quant-based LR',
        ],
      },
    ],
  },
  {
    sectionId: 'VARC',
    groups: [
      {
        topicGroup: 'RC',
        chapters: [
          'RC — Inference',
          'RC — Main Idea',
          'RC — Tone & Attitude',
          'RC — Vocabulary in Context',
          'RC — Structure & Function',
        ],
      },
      {
        topicGroup: 'VA',
        chapters: [
          'Para Jumbles',
          'Para Summary',
          'Odd Sentence Out',
          'Para Completion',
          'Critical Reasoning',
        ],
      },
    ],
  },
];

export function slugify(...parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Stable id for a seeded chapter — the same value formula seeds reference. */
export function chapterSlug(sectionId: string, topicGroup: string, name: string): string {
  return slugify(sectionId, topicGroup, name);
}

/** Build the flat seed Chapter[] with stable ids and default state. */
export function buildSeedChapters(): Chapter[] {
  const chapters: Chapter[] = [];
  let orderIndex = 0;
  for (const section of SEED) {
    for (const group of section.groups) {
      for (const name of group.chapters) {
        chapters.push({
          id: slugify(section.sectionId, group.topicGroup, name),
          sectionId: section.sectionId,
          topicGroup: group.topicGroup,
          name,
          status: 'not-started',
          confidence: 1,
          lastStudiedAt: null,
          lastRevisedAt: null,
          targetRevisitAt: null,
          notes: '',
          isCustom: false,
          orderIndex: orderIndex++,
        });
      }
    }
  }
  return chapters;
}
