import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { ChapterStatus, Confidence, Formula, Mistake } from '@/db/types';
import { SECTIONS } from '@/lib/sections';
import { CHAPTER_STATUSES, STATUS_LABEL } from '@/lib/chapterMeta';
import { relativeTime } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ConfidencePill } from '@/components/ui/ConfidencePill';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  updateChapterConfidence,
  updateChapterNotes,
  updateChapterStatus,
} from '@/db/mutations';
import { useAllChapters } from '@/features/mistakes/hooks';
import { useQuickAdd } from '@/features/mistakes/QuickAddProvider';
import { MistakeCard } from '@/features/mistakes/MistakeCard';
import { FormulaCard } from '@/features/formulas/FormulaCard';
import { FormulaEditor } from '@/features/formulas/FormulaEditor';
import { StudyLogModal } from '@/features/study/StudyLogModal';
import { format } from 'date-fns';

const STATUS_OPTIONS = CHAPTER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

type TabId = 'overview' | 'formulas' | 'mistakes' | 'revision';
const TABS: { id: TabId; label: string; phase: string | null }[] = [
  { id: 'overview', label: 'Overview', phase: null },
  { id: 'formulas', label: 'Formulas', phase: null },
  { id: 'mistakes', label: 'Mistakes', phase: null },
  { id: 'revision', label: 'Revision', phase: 'Phase 8' },
];

export function ChapterDetailPage() {
  const { id } = useParams();
  const chapter = useLiveQuery(() => (id ? db.chapters.get(id) : undefined), [id]);
  const [tab, setTab] = useState<TabId>('overview');

  if (chapter === undefined) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Loading… If this persists, the chapter may not exist.{' '}
        <Link to="/sections/QA" className="underline">
          Back to sections
        </Link>
      </div>
    );
  }

  const meta = SECTIONS[chapter.sectionId];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          to={`/sections/${chapter.sectionId}`}
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← {meta.short} · {chapter.topicGroup}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{chapter.name}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Field label="Status">
          <Select<ChapterStatus>
            value={chapter.status}
            options={STATUS_OPTIONS}
            onChange={(next) => void updateChapterStatus(chapter.id, next)}
          />
        </Field>
        <Field label="Confidence">
          <ConfidencePill
            value={chapter.confidence}
            onChange={(next: Confidence) => void updateChapterConfidence(chapter.id, next)}
          />
        </Field>
        <Field label="Last studied">
          <span className="text-sm">{relativeTime(chapter.lastStudiedAt)}</span>
        </Field>
        <Field label="Last revised">
          <span className="text-sm">{relativeTime(chapter.lastRevisedAt)}</span>
        </Field>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.phase !== null}
            title={t.phase ? `Coming in ${t.phase}` : undefined}
            onClick={() => t.phase === null && setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              t.phase !== null
                ? 'cursor-not-allowed border-transparent text-slate-400 dark:text-slate-600'
                : tab === t.id
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab chapterId={chapter.id} notes={chapter.notes} />}
      {tab === 'formulas' && <FormulasTab chapterId={chapter.id} />}
      {tab === 'mistakes' && <MistakesTab chapterId={chapter.id} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function OverviewTab({ chapterId, notes }: { chapterId: string; notes: string }) {
  const [studyOpen, setStudyOpen] = useState(false);
  const sessions = useLiveQuery(
    () => db.sessions.where('chapterId').equals(chapterId).reverse().sortBy('startedAt'),
    [chapterId],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Study history
        </h2>
        <Button onClick={() => setStudyOpen(true)}>+ Log study</Button>
      </div>
      {sessions && sessions.length === 0 ? (
        <p className="text-sm text-slate-400">No study sessions logged for this chapter yet.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {(sessions ?? []).slice(0, 10).map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded border border-slate-200 px-3 py-1.5 dark:border-slate-800"
            >
              <span>
                {format(s.startedAt, 'dd MMM')} · {s.activity.replace('-', ' ')}
                {s.questionsAttempted != null && ` · ${s.questionsCorrect ?? 0}/${s.questionsAttempted}`}
              </span>
              <span className="tabular-nums text-slate-400">{s.durationMin} min</span>
            </li>
          ))}
        </ul>
      )}
      <NotesEditor chapterId={chapterId} notes={notes} />
      <StudyLogModal open={studyOpen} onClose={() => setStudyOpen(false)} defaultChapterId={chapterId} />
    </div>
  );
}

function FormulasTab({ chapterId }: { chapterId: string }) {
  const chapters = useAllChapters();
  const formulas = useLiveQuery(
    () => db.formulas.where('chapterId').equals(chapterId).toArray(),
    [chapterId],
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Formula | undefined>();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(undefined);
            setEditorOpen(true);
          }}
        >
          + Add formula
        </Button>
      </div>
      {formulas && formulas.length === 0 ? (
        <EmptyState title="No formulas for this chapter" hint="Add one, or re-seed built-ins from Settings." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(formulas ?? []).map((f) => (
            <FormulaCard
              key={f.id}
              formula={f}
              onEdit={(formula) => {
                setEditing(formula);
                setEditorOpen(true);
              }}
            />
          ))}
        </div>
      )}
      {chapters && (
        <FormulaEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          chapters={chapters}
          editing={editing}
          defaultChapterId={chapterId}
        />
      )}
    </div>
  );
}

function MistakesTab({ chapterId }: { chapterId: string }) {
  const quickAdd = useQuickAdd();
  const chapters = useAllChapters();
  const mistakes = useLiveQuery(
    () => db.mistakes.where('chapterId').equals(chapterId).reverse().sortBy('createdAt'),
    [chapterId],
  );
  const chapterMap = new Map((chapters ?? []).map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => quickAdd.open({ chapterId })}>+ Log mistake</Button>
      </div>
      {mistakes && mistakes.length === 0 ? (
        <EmptyState
          title="No mistakes logged for this chapter"
          hint="Log mistakes here as you practise — patterns will surface over time."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {(mistakes ?? []).map((m: Mistake) => (
            <MistakeCard key={m.id} mistake={m} chapter={chapterMap.get(m.chapterId)} grid={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotesEditor({ chapterId, notes }: { chapterId: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setValue(notes);
    setSaved(true);
  }, [chapterId, notes]);

  useEffect(() => {
    if (value === notes) return;
    setSaved(false);
    const t = setTimeout(() => {
      void updateChapterNotes(chapterId, value).then(() => setSaved(true));
    }, 600);
    return () => clearTimeout(t);
  }, [value, notes, chapterId]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="text-slate-400">(markdown)</span>
        </label>
        <span className="text-xs text-slate-400">{saved ? 'Saved' : 'Saving…'}</span>
      </div>
      <textarea
        id="notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        placeholder="Key ideas, gotchas, worked examples…"
        className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
}
