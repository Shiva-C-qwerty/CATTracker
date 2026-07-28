import { Link } from 'react-router-dom';
import type { Chapter, ChapterStatus, Confidence } from '@/db/types';
import { Badge } from '@/components/ui/Badge';
import { ConfidencePill } from '@/components/ui/ConfidencePill';
import { Select } from '@/components/ui/Select';
import { CHAPTER_STATUSES, STATUS_CLASS, STATUS_LABEL } from '@/lib/chapterMeta';
import { relativeTime, isDue } from '@/lib/dates';
import { updateChapterConfidence, updateChapterStatus } from '@/db/mutations';

const STATUS_OPTIONS = CHAPTER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

export function ChapterCard({
  chapter,
  mistakeCount,
}: {
  chapter: Chapter;
  mistakeCount: number;
}) {
  const due = isDue(chapter.targetRevisitAt);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/chapters/${chapter.id}`}
          className="font-medium leading-tight hover:underline"
        >
          {chapter.name}
        </Link>
        {due && (
          <Badge className="shrink-0 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            Due
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between">
        <ConfidencePill
          value={chapter.confidence}
          onChange={(next: Confidence) => void updateChapterConfidence(chapter.id, next)}
        />
        <Badge className={STATUS_CLASS[chapter.status]}>{STATUS_LABEL[chapter.status]}</Badge>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{mistakeCount} mistakes</span>
        <span>studied {relativeTime(chapter.lastStudiedAt)}</span>
      </div>

      <Select<ChapterStatus>
        value={chapter.status}
        options={STATUS_OPTIONS}
        onChange={(next) => void updateChapterStatus(chapter.id, next)}
        className="w-full"
        aria-label={`Status for ${chapter.name}`}
      />
    </div>
  );
}
