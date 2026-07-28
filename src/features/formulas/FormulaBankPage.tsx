import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Chapter, Formula, SectionId } from '@/db/types';
import { SECTION_IDS, SECTIONS } from '@/lib/sections';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChapterSelect } from '@/features/mistakes/ChapterSelect';
import { useAllChapters } from '@/features/mistakes/hooks';
import { FormulaCard } from './FormulaCard';
import { FormulaEditor } from './FormulaEditor';

export function FormulaBankPage() {
  const formulas = useLiveQuery(() => db.formulas.toArray(), []);
  const chapters = useAllChapters();

  const [search, setSearch] = useState('');
  const [section, setSection] = useState<SectionId | 'all'>('all');
  const [chapterId, setChapterId] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Formula | undefined>();

  const chapterMap = useMemo(() => new Map((chapters ?? []).map((c) => [c.id, c])), [chapters]);

  const groups = useMemo(
    () =>
      groupByChapter(
        filterFormulas(formulas ?? [], chapterMap, { search, section, chapterId, starredOnly }),
        chapterMap,
      ),
    [formulas, chapterMap, search, section, chapterId, starredOnly],
  );

  function openAdd() {
    setEditing(undefined);
    setEditorOpen(true);
  }
  function openEdit(f: Formula) {
    setEditing(f);
    setEditorOpen(true);
  }

  const starredCount = (formulas ?? []).filter((f) => f.isStarred).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Formula Bank</h1>
        <div className="flex gap-2">
          <Link
            to="/formulas/print"
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            ★ Print sheet
          </Link>
          <Button onClick={openAdd}>+ Add formula</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or text…"
          className="w-56"
        />
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
        <button
          type="button"
          onClick={() => setStarredOnly((s) => !s)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm',
            starredOnly
              ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300',
          )}
        >
          ★ Starred{starredCount ? ` (${starredCount})` : ''}
        </button>
      </div>

      {formulas == null ? null : groups.length === 0 ? (
        <EmptyState
          title={(formulas.length === 0) ? 'No formulas yet' : 'No formulas match'}
          hint={
            formulas.length === 0
              ? 'Add your own, or re-seed the built-in QA formulas from Settings.'
              : 'Try clearing the search or filters.'
          }
          action={formulas.length === 0 ? <Button onClick={openAdd}>+ Add formula</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.chapter.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', SECTIONS[g.chapter.sectionId].dot)} />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {g.chapter.name}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {g.formulas.map((f) => (
                  <FormulaCard key={f.id} formula={f} onEdit={openEdit} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {chapters && (
        <FormulaEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          chapters={chapters}
          editing={editing}
          defaultChapterId={chapterId || undefined}
        />
      )}
    </div>
  );
}

interface Filters {
  search: string;
  section: SectionId | 'all';
  chapterId: string;
  starredOnly: boolean;
}

function filterFormulas(
  formulas: Formula[],
  chapterMap: Map<string, Chapter>,
  f: Filters,
): Formula[] {
  const q = f.search.trim().toLowerCase();
  return formulas.filter((formula) => {
    const chapter = chapterMap.get(formula.chapterId);
    if (f.section !== 'all' && chapter?.sectionId !== f.section) return false;
    if (f.chapterId && formula.chapterId !== f.chapterId) return false;
    if (f.starredOnly && !formula.isStarred) return false;
    if (q) {
      const hay = `${formula.title} ${formula.plainText} ${chapter?.name ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

interface Group {
  chapter: Chapter;
  formulas: Formula[];
}

function groupByChapter(formulas: Formula[], chapterMap: Map<string, Chapter>): Group[] {
  const byChapter = new Map<string, Formula[]>();
  for (const f of formulas) {
    const list = byChapter.get(f.chapterId) ?? [];
    list.push(f);
    byChapter.set(f.chapterId, list);
  }
  return [...byChapter.entries()]
    .map(([id, list]) => ({ chapter: chapterMap.get(id), formulas: list }))
    .filter((g): g is Group => g.chapter !== undefined)
    .sort((a, b) => a.chapter.orderIndex - b.chapter.orderIndex);
}
