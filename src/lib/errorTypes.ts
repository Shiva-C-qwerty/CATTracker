import type { ErrorType, Difficulty } from '@/db/types';

export const ERROR_TYPES: ErrorType[] = [
  'conceptual-gap',
  'application-error',
  'calculation-slip',
  'misread-question',
  'silly-mistake',
  'time-pressure',
  'guessed-wrong',
  'unattempted-should-have',
  'unattempted-correctly',
];

export const ERROR_TYPE_LABEL: Record<ErrorType, string> = {
  'conceptual-gap': 'Conceptual gap',
  'application-error': 'Application error',
  'calculation-slip': 'Calculation slip',
  'misread-question': 'Misread question',
  'silly-mistake': 'Silly mistake',
  'time-pressure': 'Time pressure',
  'guessed-wrong': 'Guessed wrong',
  'unattempted-should-have': 'Skipped (should have)',
  'unattempted-correctly': 'Skipped (correctly)',
};

// Short blurb shown as a hint — what each type means.
export const ERROR_TYPE_HINT: Record<ErrorType, string> = {
  'conceptual-gap': "Didn't know the concept",
  'application-error': 'Knew concept, applied it wrong',
  'calculation-slip': 'Arithmetic mistake',
  'misread-question': 'Solved the wrong problem',
  'silly-mistake': 'Marked wrong option, etc.',
  'time-pressure': "Rushed; would've got it with time",
  'guessed-wrong': 'Took a low-probability gamble',
  'unattempted-should-have': 'Skipped a doable question',
  'unattempted-correctly': 'Skipped correctly — logged to reinforce',
};

// Stable colour per error type for charts/badges.
export const ERROR_TYPE_HEX: Record<ErrorType, string> = {
  'conceptual-gap': '#ef4444',
  'application-error': '#f97316',
  'calculation-slip': '#eab308',
  'misread-question': '#8b5cf6',
  'silly-mistake': '#ec4899',
  'time-pressure': '#3b82f6',
  'guessed-wrong': '#14b8a6',
  'unattempted-should-have': '#f59e0b',
  'unattempted-correctly': '#22c55e',
};

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};
