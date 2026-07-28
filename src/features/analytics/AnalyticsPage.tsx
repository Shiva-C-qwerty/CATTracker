import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Bar,
  BarChart,
} from 'recharts';
import { db } from '@/db/db';
import type { SectionId } from '@/db/types';
import { SECTIONS, SECTION_IDS } from '@/lib/sections';
import { ERROR_TYPES, ERROR_TYPE_HEX, ERROR_TYPE_LABEL } from '@/lib/errorTypes';
import { accuracy, totalsForMock } from '@/lib/scoring';
import { lastNMocksChrono } from '@/lib/dashboard';
import { errorTypeTrendByWeek, studyMinutesByDay, studyMinutesBySection } from '@/lib/analytics';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChapterMistakeCounts } from '@/features/chapters/useChapterMistakeCounts';

const SECTION_HEX: Record<string, string> = { VARC: '#6366f1', DILR: '#0d9488', QA: '#f59e0b' };

export function AnalyticsPage() {
  const mocks = useLiveQuery(() => db.mocks.toArray(), []);
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), []);
  const chapters = useLiveQuery(() => db.chapters.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const mistakeCounts = useChapterMistakeCounts();

  const trend = useMemo(
    () =>
      lastNMocksChrono(mocks ?? [], 20).map((m) => ({
        label: format(m.takenAt, 'dd MMM'),
        Score: totalsForMock(m).score,
        Percentile: m.overallPercentile,
      })),
    [mocks],
  );

  const scatter = useMemo(() => {
    const bySection: Record<SectionId, { x: number; y: number }[]> = { VARC: [], DILR: [], QA: [] };
    for (const m of mocks ?? []) {
      for (const s of m.sections) {
        const rate = (s.attempted / SECTIONS[s.sectionId].questions) * 100;
        bySection[s.sectionId].push({ x: Math.round(rate), y: Math.round(accuracy(s.correct, s.attempted) * 100) });
      }
    }
    return bySection;
  }, [mocks]);

  const errorTrend = useMemo(() => {
    const buckets = errorTypeTrendByWeek(mistakes ?? [], 8);
    return buckets.map((b) => ({ label: b.label, ...b.counts }));
  }, [mistakes]);
  const activeErrorTypes = useMemo(
    () => ERROR_TYPES.filter((e) => (mistakes ?? []).some((m) => m.errorType === e)),
    [mistakes],
  );

  const matrix = useMemo(() => {
    const bySection: Record<SectionId, { x: number; y: number; name: string }[]> = {
      VARC: [], DILR: [], QA: [],
    };
    for (const c of chapters ?? []) {
      const count = mistakeCounts[c.id] ?? 0;
      if (count === 0 && c.status === 'not-started') continue; // declutter untouched
      bySection[c.sectionId].push({ x: c.confidence, y: count, name: c.name });
    }
    return bySection;
  }, [chapters, mistakeCounts]);

  const studyBySection = useMemo(() => {
    const m = studyMinutesBySection(sessions ?? []);
    return SECTION_IDS.map((s) => ({ section: SECTIONS[s].short, minutes: m[s], hex: SECTION_HEX[s] }));
  }, [sessions]);
  const heatmap = useMemo(() => studyMinutesByDay(sessions ?? []), [sessions]);

  const hasMocks = (mocks?.length ?? 0) > 0;
  const hasMistakes = (mistakes?.length ?? 0) > 0;
  const hasSessions = (sessions?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <ChartTitle>Score &amp; percentile trend</ChartTitle>
          {hasMocks ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="l" type="monotone" dataKey="Score" stroke="#0f172a" strokeWidth={2} dot={{ r: 2 }} />
                  <Line yAxisId="r" type="monotone" dataKey="Percentile" stroke="#6366f1" connectNulls dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No mocks yet" hint="Log mocks to see score and percentile trends." />
          )}
        </Card>

        <Card>
          <ChartTitle>Accuracy vs attempt rate</ChartTitle>
          {hasMocks ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, bottom: 20, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis type="number" dataKey="x" name="Attempt %" unit="%" domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false}>
                  </XAxis>
                  <YAxis type="number" dataKey="y" name="Accuracy %" unit="%" domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} />
                  <ZAxis range={[60, 60]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  {SECTION_IDS.map((s) => (
                    <Scatter key={s} name={SECTIONS[s].short} data={scatter[s]} fill={SECTION_HEX[s]} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No mocks yet" hint="The classic CAT tradeoff appears once you log mocks." />
          )}
        </Card>
      </div>

      <Card>
        <ChartTitle>Error types over time</ChartTitle>
        {hasMistakes ? (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={errorTrend} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  {activeErrorTypes.map((e) => (
                    <Area
                      key={e}
                      type="monotone"
                      dataKey={e}
                      name={ERROR_TYPE_LABEL[e]}
                      stackId="1"
                      stroke={ERROR_TYPE_HEX[e]}
                      fill={ERROR_TYPE_HEX[e]}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Prep is working when conceptual-gap shrinks and time-pressure becomes the dominant type.
            </p>
          </>
        ) : (
          <EmptyState title="No mistakes yet" hint="Log mistakes to track how your error mix evolves." />
        )}
      </Card>

      <Card>
        <ChartTitle>Chapter mastery matrix</ChartTitle>
        {(chapters?.length ?? 0) > 0 ? (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, bottom: 20, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis type="number" dataKey="x" name="Confidence" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="number" dataKey="y" name="Mistakes" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <ZAxis range={[50, 50]} />
                  <ReferenceLine x={3} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [v, n]} />
                  <Legend />
                  {SECTION_IDS.map((s) => (
                    <Scatter key={s} name={SECTIONS[s].short} data={matrix[s]} fill={SECTION_HEX[s]} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Bottom-right = strong &amp; low-error (leave it). Top-left = low confidence &amp; many
              mistakes (attack first). Top-right = confident but error-prone (careless — drill accuracy).
            </p>
          </>
        ) : (
          <EmptyState title="No chapters" hint="Chapters seed on first run." />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <ChartTitle>Study hours by section</ChartTitle>
          {hasSessions ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyBySection} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <XAxis dataKey="section" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} min`, 'Studied']} />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {studyBySection.map((d) => (
                      <Cell key={d.section} fill={d.hex} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No study sessions yet" hint="Log study sessions from the dashboard." />
          )}
        </Card>

        <Card>
          <ChartTitle>Study calendar (8 weeks)</ChartTitle>
          {hasSessions ? (
            <StudyHeatmap minutesByDay={heatmap} />
          ) : (
            <EmptyState title="No study sessions yet" hint="Your daily study heatmap builds as you log time." />
          )}
        </Card>
      </div>
    </div>
  );
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h2>
  );
}

function StudyHeatmap({ minutesByDay }: { minutesByDay: Record<string, number> }) {
  // 8 weeks × 7 days grid ending today.
  const days: { date: string; minutes: number }[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 7 * 8 + 1);
  for (let i = 0; i < 7 * 8; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = format(d, 'yyyy-MM-dd');
    days.push({ date: key, minutes: minutesByDay[key] ?? 0 });
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.minutes} min`}
            className="h-3.5 w-3.5 rounded-sm"
            style={{ backgroundColor: heatColour(d.minutes) }}
          />
        ))}
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
        <span>less</span>
        {[0, 20, 45, 90, 150].map((m) => (
          <span key={m} className="h-3 w-3 rounded-sm" style={{ backgroundColor: heatColour(m) }} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}

function heatColour(minutes: number): string {
  if (minutes <= 0) return '#e2e8f0';
  if (minutes < 30) return '#bbf7d0';
  if (minutes < 60) return '#86efac';
  if (minutes < 120) return '#22c55e';
  return '#15803d';
}
