import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Mistake } from '@/db/types';
import { reviewMistake } from '@/db/mutations';
import { dueMistakes } from '@/lib/dashboard';
import { estimatedMinutes, type ReviewGrade } from '@/lib/revision';
import { ERROR_TYPE_HEX, ERROR_TYPE_LABEL } from '@/lib/errorTypes';
import { SECTIONS } from '@/lib/sections';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAllChapters } from '@/features/mistakes/hooks';

export function RevisePage() {
  const allMistakes = useLiveQuery(() => db.mistakes.toArray(), []);
  const chapters = useAllChapters();
  const chapterMap = useMemo(() => new Map((chapters ?? []).map((c) => [c.id, c])), [chapters]);

  const [revealed, setRevealed] = useState(false);

  const queue = useMemo(() => {
    const due = dueMistakes(allMistakes ?? []);
    return due.sort((a, b) => (a.nextRevisionAt ?? 0) - (b.nextRevisionAt ?? 0));
  }, [allMistakes]);

  const current = queue[0];

  async function grade(g: ReviewGrade) {
    if (!current) return;
    setRevealed(false);
    await reviewMistake(current.id, g);
  }

  if (allMistakes == null) return null;

  if (queue.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-semibold tracking-tight">Revision Queue</h1>
        <EmptyState
          title="Nothing due for revision"
          hint="Mistakes reappear here on their schedule. Log mistakes and come back — spaced repetition does the rest."
          action={
            <Link to="/mistakes" className="text-sm underline">
              Go to mistakes
            </Link>
          }
        />
      </div>
    );
  }

  const chapter = current ? chapterMap.get(current.chapterId) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Revision Queue</h1>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {queue.length} due · ~{estimatedMinutes(queue.length)} min
        </div>
      </div>

      {current && (
        <ReviewCard
          key={current.id}
          mistake={current}
          chapterName={chapter?.name}
          sectionDot={chapter ? SECTIONS[chapter.sectionId].dot : ''}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onGrade={grade}
        />
      )}
    </div>
  );
}

function ReviewCard({
  mistake,
  chapterName,
  sectionDot,
  revealed,
  onReveal,
  onGrade,
}: {
  mistake: Mistake;
  chapterName: string | undefined;
  sectionDot: string;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (g: ReviewGrade) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="text-white" style={{ backgroundColor: ERROR_TYPE_HEX[mistake.errorType] }}>
          {ERROR_TYPE_LABEL[mistake.errorType]}
        </Badge>
        {chapterName && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span className={cn('h-2 w-2 rounded-full', sectionDot)} />
            {chapterName}
          </span>
        )}
        {mistake.lapses > 0 && (
          <span className="text-xs text-rose-500">lapsed ×{mistake.lapses}</span>
        )}
      </div>

      <div className="min-h-[6rem]">
        <div className="text-xs uppercase tracking-wide text-slate-400">Question</div>
        {mistake.questionText && <p className="mt-1 whitespace-pre-wrap">{mistake.questionText}</p>}
        {mistake.questionImage && (
          <img
            src={mistake.questionImage}
            alt="Question"
            className="mt-2 max-h-72 rounded border border-slate-200 object-contain dark:border-slate-700"
          />
        )}
        {!mistake.questionText && !mistake.questionImage && (
          <p className="mt-1 text-slate-400">(No question captured — recall from the takeaway.)</p>
        )}
      </div>

      {revealed ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          {mistake.keyTakeaway && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Key takeaway</div>
              <p className="font-medium">{mistake.keyTakeaway}</p>
            </div>
          )}
          {mistake.correctApproach && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Correct approach</div>
              <p className="whitespace-pre-wrap">{mistake.correctApproach}</p>
            </div>
          )}
          {mistake.myApproach && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">What I did</div>
              <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{mistake.myApproach}</p>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => onGrade('got-it')}>
              Got it
            </Button>
            <Button className="bg-amber-500 text-white hover:bg-amber-400" onClick={() => onGrade('partial')}>
              Partial
            </Button>
            <Button variant="danger" onClick={() => onGrade('wrong')}>
              Still wrong
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={onReveal} className="w-fit">
          Reveal answer
        </Button>
      )}
    </div>
  );
}
