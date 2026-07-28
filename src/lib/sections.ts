import type { SectionId } from '@/db/types';

export interface SectionMeta {
  id: SectionId;
  name: string;
  short: string;
  questions: number;
  timeMin: number;
  // Tailwind classes for consistent section colour coding across the app.
  text: string;
  bg: string;
  border: string;
  dot: string;
}

export const SECTIONS: Record<SectionId, SectionMeta> = {
  VARC: {
    id: 'VARC',
    name: 'Verbal Ability & Reading Comprehension',
    short: 'VARC',
    questions: 24,
    timeMin: 40,
    text: 'text-varc',
    bg: 'bg-varc/10',
    border: 'border-varc/40',
    dot: 'bg-varc',
  },
  DILR: {
    id: 'DILR',
    name: 'Data Interpretation & Logical Reasoning',
    short: 'DILR',
    questions: 22,
    timeMin: 40,
    text: 'text-dilr',
    bg: 'bg-dilr/10',
    border: 'border-dilr/40',
    dot: 'bg-dilr',
  },
  QA: {
    id: 'QA',
    name: 'Quantitative Aptitude',
    short: 'QA',
    questions: 22,
    timeMin: 40,
    text: 'text-qa',
    bg: 'bg-qa/10',
    border: 'border-qa/40',
    dot: 'bg-qa',
  },
};

export const SECTION_IDS: SectionId[] = ['VARC', 'DILR', 'QA'];

export function isSectionId(value: string): value is SectionId {
  return value === 'VARC' || value === 'DILR' || value === 'QA';
}
