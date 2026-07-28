import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/db/db';
import { upsertDailyLog } from '@/db/mutations';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const MOODS: { value: 1 | 2 | 3 | 4 | 5; emoji: string }[] = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😄' },
];

export function DailyReflection() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const log = useLiveQuery(() => db.dailyLogs.get(today), [today]);

  const [reflection, setReflection] = useState('');
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setReflection(log?.reflection ?? '');
    setSaved(true);
  }, [log?.reflection]);

  useEffect(() => {
    if ((log?.reflection ?? '') === reflection) return;
    setSaved(false);
    const t = setTimeout(() => {
      void upsertDailyLog(today, { reflection }).then(() => setSaved(true));
    }, 600);
    return () => clearTimeout(t);
  }, [reflection, log?.reflection, today]);

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Today's reflection
        </h2>
        <span className="text-xs text-slate-400">
          {log?.totalMinutes ? `${log.totalMinutes} min studied` : ''}
        </span>
      </div>
      <div className="mb-2 flex gap-1">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => void upsertDailyLog(today, { mood: log?.mood === m.value ? null : m.value })}
            className={cn(
              'rounded-md px-2 py-1 text-lg transition-transform hover:scale-110',
              log?.mood === m.value ? 'bg-slate-100 dark:bg-slate-800' : 'opacity-50',
            )}
            aria-label={`Mood ${m.value}`}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      <textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        rows={2}
        placeholder="One line on how today went…"
        className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      <div className="mt-1 text-right text-xs text-slate-400">{saved ? 'Saved' : 'Saving…'}</div>
    </Card>
  );
}
