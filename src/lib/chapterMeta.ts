import type { ChapterStatus } from '@/db/types';

export const CHAPTER_STATUSES: ChapterStatus[] = [
  'not-started',
  'learning',
  'practicing',
  'revising',
  'strong',
];

export const STATUS_LABEL: Record<ChapterStatus, string> = {
  'not-started': 'Not started',
  learning: 'Learning',
  practicing: 'Practicing',
  revising: 'Revising',
  strong: 'Strong',
};

// Badge colour per status — muted at the low end, green when strong.
export const STATUS_CLASS: Record<ChapterStatus, string> = {
  'not-started': 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  learning: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  practicing: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  revising: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  strong: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};
