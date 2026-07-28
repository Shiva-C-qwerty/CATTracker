import { useMemo } from 'react';
import type { Chapter, SectionId } from '@/db/types';
import { SECTION_IDS, SECTIONS } from '@/lib/sections';
import { cn } from '@/lib/cn';

/** Native select of all chapters, grouped by section then topic group. */
export function ChapterSelect({
  chapters,
  value,
  onChange,
  allowEmpty,
  emptyLabel = 'All chapters',
  className,
}: {
  chapters: Chapter[];
  value: string;
  onChange: (id: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const grouped = useMemo(() => groupBySection(chapters), [chapters]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900',
        'focus:outline-none focus:ring-2 focus:ring-slate-400',
        'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
        className,
      )}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {SECTION_IDS.map((sid) =>
        grouped[sid].length === 0 ? null : (
          <optgroup key={sid} label={SECTIONS[sid].short}>
            {grouped[sid].map((c) => (
              <option key={c.id} value={c.id}>
                {c.topicGroup} · {c.name}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </select>
  );
}

function groupBySection(chapters: Chapter[]): Record<SectionId, Chapter[]> {
  const out: Record<SectionId, Chapter[]> = { VARC: [], DILR: [], QA: [] };
  for (const c of chapters) out[c.sectionId].push(c);
  return out;
}
