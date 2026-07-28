import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { endOfDay, format, startOfDay } from 'date-fns';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '@/db/db';
import { META_KEYS, getMeta } from '@/db/meta';
import type { Chapter } from '@/db/types';
import { SECTIONS } from '@/lib/sections';
import { ERROR_TYPE_HEX, ERROR_TYPE_LABEL } from '@/lib/errorTypes';
import { countByErrorType } from '@/lib/mistakeStats';
import { weaknessScore } from '@/lib/mastery';
import {
  daysUntil,
  dueMistakes,
  lastNMocksChrono,
  recentMistakes,
  staleUnanalysedMocks,
} from '@/lib/dashboard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChapterMistakeCounts } from '@/features/chapters/useChapterMistakeCounts';
import { StudyLogModal } from '@/features/study/StudyLogModal';
import { DailyReflection } from '@/features/study/DailyReflection';
import { GoalsWidget } from '@/features/goals/GoalsWidget';

const SECTION_HEX: Record<string, string> = { VARC: '#6366f1', DILR: '#0d9488', QA: '#f59e0b' };

export function DashboardPage() {
  const mocks = useLiveQuery(() => db.mocks.toArray(), []);
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), []);
  const chapters = useLiveQuery(() => db.chapters.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const examDate = useLiveQuery(() => getMeta<number>(META_KEYS.examDate), []);
  const mistakeCounts = useChapterMistakeCounts();
  const [studyOpen, setStudyOpen] = useState(false);

  const now = Date.now();
  const chapterMap = useMemo(() => new Map((chapters ?? []).map((c) => [c.id, c])), [chapters]);

  const stale = useMemo(() => staleUnanalysedMocks(mocks ?? [], now), [mocks, now]);
  const due = useMemo(() => dueMistakes(mistakes ?? [], now), [mistakes, now]);
  const dueChapters = useMemo(
    () => (chapters ?? []).filter((c) => c.targetRevisitAt != null && c.targetRevisitAt <= now),
    [chapters, now],
  );

  const todayRange = useMemo(() => ({ from: startOfDay(now).getTime(), to: endOfDay(now).getTime() }), [now]);
  const todayMistakes = useMemo(
    () => (mistakes ?? []).filter((m) => m.createdAt >= todayRange.from && m.createdAt <= todayRange.to),
    [mistakes, todayRange],
  );
  const todayMinutes = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => s.startedAt >= todayRange.from && s.startedAt <= todayRange.to)
        .reduce((sum, s) => sum + s.durationMin, 0),
    [sessions, todayRange],
  );

  const weakest = useMemo(() => {
    return [...(chapters ?? [])]
      .map((c) => ({ chapter: c, score: weaknessScore({ chapter: c, mistakeCount: mistakeCounts[c.id] ?? 0, now }) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [chapters, mistakeCounts, now]);

  const trend = useMemo(() => buildTrend(mocks ?? []), [mocks]);
  const errorBreakdown = useMemo(
    () =>
      countByErrorType(recentMistakes(mistakes ?? [], now, 30)).map((r) => ({
        name: ERROR_TYPE_LABEL[r.errorType],
        value: r.count,
        hex: ERROR_TYPE_HEX[r.errorType],
      })),
    [mistakes, now],
  );

  const days = examDate != null ? daysUntil(examDate, now) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Button onClick={() => setStudyOpen(true)}>+ Log study</Button>
      </div>
      <StudyLogModal open={studyOpen} onClose={() => setStudyOpen(false)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">Days to CAT</div>
          <div className="mt-1 text-4xl font-bold tabular-nums">
            {days == null ? '—' : days >= 0 ? days : 'Done'}
          </div>
          {examDate != null && (
            <div className="mt-1 text-xs text-slate-400">{format(examDate, 'EEE, dd MMM yyyy')}</div>
          )}
        </Card>

        <Card className="flex flex-col justify-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">Today</div>
          <div className="mt-1 text-sm">
            <div>
              <span className="text-2xl font-bold tabular-nums">{todayMinutes}</span> min ·{' '}
              <span className="font-bold tabular-nums">{todayMistakes.length}</span> mistakes
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {new Set(todayMistakes.map((m) => chapterMap.get(m.chapterId)?.sectionId)).size}{' '}
              section(s) touched
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">Revision due</div>
          <div className="mt-1 text-4xl font-bold tabular-nums">{due.length + dueChapters.length}</div>
          <Link to="/revise" className="mt-1 text-xs text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200">
            Go revise →
          </Link>
        </Card>

        <Card className="flex flex-col justify-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">Total mistakes</div>
          <div className="mt-1 text-4xl font-bold tabular-nums">{mistakes?.length ?? 0}</div>
          <Link to="/mistakes" className="mt-1 text-xs text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200">
            View log →
          </Link>
        </Card>
      </div>

      {stale.length > 0 && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
          <div className="font-semibold text-rose-700 dark:text-rose-300">
            {stale.length} mock{stale.length > 1 ? 's' : ''} taken but not analysed
          </div>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
            Analysing mocks is where the marks come from. Don't let these pile up.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {stale.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/mocks/${m.id}`}
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
                >
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailyReflection />
        <GoalsWidget />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Due for revision
          </h2>
          {due.length === 0 && dueChapters.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing due. You're on top of it.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {dueChapters.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <Link to={`/chapters/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-xs text-slate-400">chapter</span>
                </li>
              ))}
              {due.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <span className="truncate">{m.keyTakeaway || chapterMap.get(m.chapterId)?.name || 'Mistake'}</span>
                  <span className="text-xs text-slate-400">mistake</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Weakest chapters
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {weakest.map(({ chapter, score }) => (
              <WeakRow key={chapter.id} chapter={chapter} score={score} />
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Percentile trend (last 10)
          </h2>
          {trend.length === 0 ? (
            <EmptyState title="No mocks yet" hint="Log mocks with percentiles to see your trend." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Overall" stroke="#0f172a" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="VARC" stroke={SECTION_HEX.VARC} connectNulls dot={false} />
                  <Line type="monotone" dataKey="DILR" stroke={SECTION_HEX.DILR} connectNulls dot={false} />
                  <Line type="monotone" dataKey="QA" stroke={SECTION_HEX.QA} connectNulls dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Error types (30d)
          </h2>
          {errorBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400">No mistakes in the last 30 days.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {errorBreakdown.map((d) => (
                      <Cell key={d.name} fill={d.hex} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function WeakRow({ chapter, score }: { chapter: Chapter; score: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${SECTIONS[chapter.sectionId].dot}`} />
      <Link to={`/chapters/${chapter.id}`} className="flex-1 truncate hover:underline">
        {chapter.name}
      </Link>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, score * 100)}%` }} />
      </div>
    </li>
  );
}

interface TrendPoint {
  label: string;
  Overall: number | null;
  VARC: number | null;
  DILR: number | null;
  QA: number | null;
}

function buildTrend(mocks: Parameters<typeof lastNMocksChrono>[0]): TrendPoint[] {
  return lastNMocksChrono(mocks, 10).map((m) => ({
    label: format(m.takenAt, 'dd MMM'),
    Overall: m.overallPercentile,
    VARC: m.sections.find((s) => s.sectionId === 'VARC')?.percentile ?? null,
    DILR: m.sections.find((s) => s.sectionId === 'DILR')?.percentile ?? null,
    QA: m.sections.find((s) => s.sectionId === 'QA')?.percentile ?? null,
  }));
}
