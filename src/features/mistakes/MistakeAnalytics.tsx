import type { Chapter, Mistake } from '@/db/types';
import { countByChapter, countByErrorType, dominantErrorType } from '@/lib/mistakeStats';
import { ERROR_TYPE_HEX, ERROR_TYPE_LABEL } from '@/lib/errorTypes';
import { Card } from '@/components/ui/Card';

export function MistakeAnalytics({
  mistakes,
  chapterMap,
}: {
  mistakes: Mistake[];
  chapterMap: Map<string, Chapter>;
}) {
  const byType = countByErrorType(mistakes);
  const byChapter = countByChapter(mistakes).slice(0, 5);
  const dominant = dominantErrorType(mistakes);
  const total = mistakes.length;

  if (total === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Error types ({total})
        </h3>
        <div className="flex flex-col gap-1.5">
          {byType.map((row) => (
            <div key={row.errorType} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 truncate">{ERROR_TYPE_LABEL[row.errorType]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.share * 100}%`,
                    backgroundColor: ERROR_TYPE_HEX[row.errorType],
                  }}
                />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums text-slate-400">
                {Math.round(row.share * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Most-frequent chapters
        </h3>
        {byChapter.length === 0 ? (
          <p className="text-sm text-slate-400">No data.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {byChapter.map((row) => (
              <li key={row.chapterId} className="flex items-center justify-between">
                <span className="truncate">{chapterMap.get(row.chapterId)?.name ?? 'Unknown'}</span>
                <span className="tabular-nums text-slate-400">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col justify-center">
        {dominant ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Targeted fix
            </h3>
            <p className="mt-2 text-sm">
              <span className="font-semibold">{ERROR_TYPE_LABEL[dominant.errorType]}</span> is{' '}
              <span className="font-semibold">{Math.round(dominant.share * 100)}%</span> of these
              mistakes. Fixing this pattern would move the needle most.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No single error type dominates yet — mistakes are spread across categories.
          </p>
        )}
      </Card>
    </div>
  );
}
