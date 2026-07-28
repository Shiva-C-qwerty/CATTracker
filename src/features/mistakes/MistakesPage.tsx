import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Chapter, Difficulty, ErrorType, Mistake, SectionId } from '@/db/types';
import { ERROR_TYPES, ERROR_TYPE_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '@/lib/errorTypes';
import { SECTION_IDS, SECTIONS } from '@/lib/sections';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChapterSelect } from './ChapterSelect';
import { MistakeCard } from './MistakeCard';
import { MistakeAnalytics } from './MistakeAnalytics';
import { useAllChapters, useAllTags } from './hooks';
import { useQuickAdd } from './QuickAddProvider';

type ResolvedFilter = 'all' | 'open' | 'resolved';
type ViewMode = 'list' | 'grid';

export function MistakesPage() {
  const quickAdd = useQuickAdd();
  const mistakes = useLiveQuery(() => db.mistakes.orderBy('createdAt').reverse().toArray(), []);
  const chapters = useAllChapters();
  const tags = useAllTags();

  const [section, setSection] = useState<SectionId | 'all'>('all');
  const [chapterId, setChapterId] = useState('');
  const [errorType, setErrorType] = useState<ErrorType | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [tag, setTag] = useState('all');
  const [resolved, setResolved] = useState<ResolvedFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [view, setView] = useState<ViewMode>('list');

  const chapterMap = useMemo(
    () => new Map((chapters ?? []).map((c) => [c.id, c])),
    [chapters],
  );

  const filtered = useMemo(
    () =>
      filterMistakes(mistakes ?? [], chapterMap, {
        section,
        chapterId,
        errorType,
        difficulty,
        tag,
        resolved,
        fromDate,
        toDate,
      }),
    [mistakes, chapterMap, section, chapterId, errorType, difficulty, tag, resolved, fromDate, toDate],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mistake Log</h1>
        <Button onClick={() => quickAdd.open()}>+ Log mistake</Button>
      </div>

      {mistakes && mistakes.length > 0 && (
        <MistakeAnalytics mistakes={filtered} chapterMap={chapterMap} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={section}
          onChange={(v) => {
            setSection(v);
            setChapterId('');
          }}
          options={[
            { value: 'all', label: 'All sections' },
            ...SECTION_IDS.map((s) => ({ value: s, label: SECTIONS[s].short })),
          ]}
        />
        {chapters && (
          <ChapterSelect
            chapters={section === 'all' ? chapters : chapters.filter((c) => c.sectionId === section)}
            value={chapterId}
            onChange={setChapterId}
            allowEmpty
            emptyLabel="All chapters"
          />
        )}
        <Select
          value={errorType}
          onChange={setErrorType}
          options={[
            { value: 'all', label: 'All error types' },
            ...ERROR_TYPES.map((e) => ({ value: e, label: ERROR_TYPE_LABEL[e] })),
          ]}
        />
        <Select
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: 'all', label: 'Any difficulty' },
            ...DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] })),
          ]}
        />
        <Select
          value={tag}
          onChange={setTag}
          options={[
            { value: 'all', label: 'Any tag' },
            ...tags.map((t) => ({ value: t, label: `#${t}` })),
          ]}
        />
        <Select
          value={resolved}
          onChange={setResolved}
          options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'resolved', label: 'Resolved' },
          ]}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="From date"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="To date"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />

        <div className="ml-auto flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
          {(['list', 'grid'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setView(m)}
              className={cn(
                'px-3 py-1 text-sm capitalize',
                view === m
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mistakes == null ? null : mistakes.length === 0 ? (
        <EmptyState
          title="No mistakes logged yet"
          hint="This is the most valuable habit in the app. Log every mistake — press Ctrl/Cmd+M anywhere, or use the button."
          action={<Button onClick={() => quickAdd.open()}>+ Log your first mistake</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No mistakes match these filters" hint="Try widening the filters." />
      ) : (
        <div
          className={cn(
            view === 'grid'
              ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
              : 'flex flex-col gap-3',
          )}
        >
          {filtered.map((m) => (
            <MistakeCard
              key={m.id}
              mistake={m}
              chapter={chapterMap.get(m.chapterId)}
              grid={view === 'grid'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Filters {
  section: SectionId | 'all';
  chapterId: string;
  errorType: ErrorType | 'all';
  difficulty: Difficulty | 'all';
  tag: string;
  resolved: ResolvedFilter;
  fromDate: string;
  toDate: string;
}

function filterMistakes(
  mistakes: Mistake[],
  chapterMap: Map<string, Chapter>,
  f: Filters,
): Mistake[] {
  const from = f.fromDate ? new Date(`${f.fromDate}T00:00:00`).getTime() : null;
  const to = f.toDate ? new Date(`${f.toDate}T23:59:59`).getTime() : null;

  return mistakes.filter((m) => {
    if (f.section !== 'all' && chapterMap.get(m.chapterId)?.sectionId !== f.section) return false;
    if (f.chapterId && m.chapterId !== f.chapterId) return false;
    if (f.errorType !== 'all' && m.errorType !== f.errorType) return false;
    if (f.difficulty !== 'all' && m.difficulty !== f.difficulty) return false;
    if (f.tag !== 'all' && !m.tags.includes(f.tag)) return false;
    if (f.resolved === 'open' && m.isResolved) return false;
    if (f.resolved === 'resolved' && !m.isResolved) return false;
    if (from != null && m.createdAt < from) return false;
    if (to != null && m.createdAt > to) return false;
    return true;
  });
}
