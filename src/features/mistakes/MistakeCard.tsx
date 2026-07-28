import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Chapter, Mistake } from '@/db/types';
import { ERROR_TYPE_HEX, ERROR_TYPE_LABEL, DIFFICULTY_LABEL } from '@/lib/errorTypes';
import { SECTIONS } from '@/lib/sections';
import { setMistakeResolved, deleteMistake } from '@/db/mutations';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export function MistakeCard({
  mistake,
  chapter,
  grid,
}: {
  mistake: Mistake;
  chapter: Chapter | undefined;
  grid: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  async function handleDelete() {
    if (window.confirm('Delete this mistake? This cannot be undone.')) {
      await deleteMistake(mistake.id);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900',
        mistake.isResolved && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            className="text-white"
            style={{ backgroundColor: ERROR_TYPE_HEX[mistake.errorType] }}
          >
            {ERROR_TYPE_LABEL[mistake.errorType]}
          </Badge>
          {chapter && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span className={cn('h-2 w-2 rounded-full', SECTIONS[chapter.sectionId].dot)} />
              <Link to={`/chapters/${chapter.id}`} className="hover:underline">
                {chapter.name}
              </Link>
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {format(mistake.createdAt, 'dd MMM')}
        </span>
      </div>

      {mistake.keyTakeaway && (
        <p className="text-sm font-medium">{mistake.keyTakeaway}</p>
      )}

      {mistake.questionImage && grid && (
        <img
          src={mistake.questionImage}
          alt="Question"
          className="max-h-40 rounded border border-slate-200 object-contain dark:border-slate-700"
        />
      )}

      {mistake.questionText && !grid && (
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
          {mistake.questionText}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <span>{DIFFICULTY_LABEL[mistake.difficulty]}</span>
        {mistake.sourceLabel && <span>· {mistake.sourceLabel}</span>}
        {mistake.tags.map((t) => (
          <span key={t} className="rounded bg-slate-100 px-1 dark:bg-slate-800">
            #{t}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
          {mistake.questionImage && !grid && (
            <img
              src={mistake.questionImage}
              alt="Question"
              className="max-h-56 rounded border border-slate-200 object-contain dark:border-slate-700"
            />
          )}
          {mistake.myApproach && (
            <div>
              <span className="text-xs uppercase text-slate-400">My approach</span>
              <p>{mistake.myApproach}</p>
            </div>
          )}
          {mistake.correctApproach && (
            <div>
              <span className="text-xs uppercase text-slate-400">Correct approach</span>
              <p>{mistake.correctApproach}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs">
        {(mistake.myApproach || mistake.correctApproach || (mistake.questionImage && !grid)) && (
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="text-slate-500 hover:underline"
          >
            {expanded ? 'Less' : 'More'}
          </button>
        )}
        <button
          type="button"
          onClick={() => void setMistakeResolved(mistake.id, !mistake.isResolved)}
          className="text-slate-500 hover:underline"
        >
          {mistake.isResolved ? 'Unresolve' : 'Resolve'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="text-rose-500 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
