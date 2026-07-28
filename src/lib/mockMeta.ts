import type { MockType } from '@/db/types';

export const MOCK_TYPES: MockType[] = ['full-mock', 'sectional', 'topic-test'];

export const MOCK_TYPE_LABEL: Record<MockType, string> = {
  'full-mock': 'Full mock',
  sectional: 'Sectional',
  'topic-test': 'Topic test',
};
