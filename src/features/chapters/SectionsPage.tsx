import { useMemo, useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Chapter, ChapterStatus, Confidence } from '@/db/types';
import { SECTION_IDS, SECTIONS, isSectionId } from '@/lib/sections';
import { CHAPTER_STATUSES, STATUS_LABEL } from '@/lib/chapterMeta';
import { weaknessScore } from '@/lib/mastery';
import { cn } from '@/lib/cn';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChapterCard } from './ChapterCard';
import { useChapterMistakeCounts } from './useChapterMistakeCounts';

type StatusFilter = ChapterStatus | 'all';
type ConfidenceFilter = `${Confidence}` | 'all';
type SortMode = 'order' | 'weakness';

const STATUS_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All statuses' },
  ...CHAPTER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

const CONFIDENCE_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All confidence' },
  ...([1, 2, 3, 4, 5] as Confidence[]).map((c) => ({
    value: String(c) as `${Confidence}`,
    label: `Confidence ${c}`,
  })),
];

const SORT_OPTIONS = [
  { value: 'order' as const, label: 'Default order' },
  { value: 'weakness' as const, label: 'Weakest first' },
];

export function SectionsPage() {
  const { sectionId } = useParams();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [sort, setSort] = useState<SortMode>('order');

  const valid = sectionId != null && isSectionId(sectionId);
  const chapters = useLiveQuery(
    () =>
      valid
        ? db.chapters.where('sectionId').equals(sectionId).toArray()
        : Promise.resolve<Chapter[]>([]),
    [sectionId, valid],
  );
  const mistakeCounts = useChapterMistakeCounts();

  const groups = useMemo(
    () => groupAndSort(chapters ?? [], statusFilter, confidenceFilter, sort, mistakeCounts),
    [chapters, statusFilter, confidenceFilter, sort, mistakeCounts],
  );

  if (!valid) return <Navigate to="/sections/QA" replace />;

  const meta = SECTIONS[sectionId];
  const total = chapters?.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <SectionTabs />

      <div>
        <div className="flex items-center gap-2">
          <span className={cn('h-3 w-3 rounded-full', meta.dot)} />
          <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {meta.questions} questions · {meta.timeMin} min · {total} chapters
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} options={STATUS_FILTER_OPTIONS} onChange={setStatusFilter} />
        <Select
          value={confidenceFilter}
          options={CONFIDENCE_FILTER_OPTIONS}
          onChange={setConfidenceFilter}
        />
        <Select value={sort} options={SORT_OPTIONS} onChange={setSort} />
      </div>

      {chapters == null ? null : groups.length === 0 ? (
        <EmptyState
          title="No chapters match this filter"
          hint="Try clearing the status filter."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <TopicGroupBlock
              key={group.topicGroup}
              topicGroup={group.topicGroup}
              chapters={group.chapters}
              mistakeCounts={mistakeCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTabs() {
  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {SECTION_IDS.map((id) => (
        <NavLink
          key={id}
          to={`/sections/${id}`}
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              isActive
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            )
          }
        >
          {SECTIONS[id].short}
        </NavLink>
      ))}
    </div>
  );
}

function TopicGroupBlock({
  topicGroup,
  chapters,
  mistakeCounts,
}: {
  topicGroup: string;
  chapters: Chapter[];
  mistakeCounts: Record<string, number>;
}) {
  const strong = chapters.filter((c) => c.status === 'strong').length;
  const pct = chapters.length ? Math.round((strong / chapters.length) * 100) : 0;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {topicGroup}
        </h2>
        <span className="text-xs text-slate-400">{pct}% strong</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map((c) => (
          <ChapterCard key={c.id} chapter={c} mistakeCount={mistakeCounts[c.id] ?? 0} />
        ))}
      </div>
    </section>
  );
}

interface Grouped {
  topicGroup: string;
  chapters: Chapter[];
}

function groupAndSort(
  chapters: Chapter[],
  statusFilter: StatusFilter,
  confidenceFilter: ConfidenceFilter,
  sort: SortMode,
  mistakeCounts: Record<string, number>,
): Grouped[] {
  const filtered = chapters.filter(
    (c) =>
      (statusFilter === 'all' || c.status === statusFilter) &&
      (confidenceFilter === 'all' || String(c.confidence) === confidenceFilter),
  );

  const byGroup = new Map<string, Chapter[]>();
  for (const c of filtered) {
    const list = byGroup.get(c.topicGroup) ?? [];
    list.push(c);
    byGroup.set(c.topicGroup, list);
  }

  const sortFn =
    sort === 'weakness'
      ? (a: Chapter, b: Chapter) =>
          weaknessScore({ chapter: b, mistakeCount: mistakeCounts[b.id] ?? 0 }) -
          weaknessScore({ chapter: a, mistakeCount: mistakeCounts[a.id] ?? 0 })
      : (a: Chapter, b: Chapter) => a.orderIndex - b.orderIndex;

  // Preserve seed group order by using the order the groups first appear.
  return [...byGroup.entries()].map(([topicGroup, list]) => ({
    topicGroup,
    chapters: [...list].sort(sortFn),
  }));
}
