import type { GoalType } from '@/db/types';

export const GOAL_TYPES: GoalType[] = [
  'target-percentile',
  'weekly-hours',
  'mocks-per-week',
  'chapter-completion',
  'custom',
];

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  'target-percentile': 'Target percentile',
  'weekly-hours': 'Weekly study hours',
  'mocks-per-week': 'Mocks per week',
  'chapter-completion': 'Chapters mastered',
  custom: 'Custom',
};

export const GOAL_UNIT: Record<GoalType, string> = {
  'target-percentile': '%ile',
  'weekly-hours': 'h',
  'mocks-per-week': '',
  'chapter-completion': 'chapters',
  custom: '',
};

/** Whether the goal's current value is derived (read-only) vs user-maintained. */
export function isDerived(type: GoalType): boolean {
  return type !== 'custom';
}
