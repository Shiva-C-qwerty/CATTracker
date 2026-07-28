import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { db } from '@/db/db';
import type { Mistake } from '@/db/types';
import { deleteMock, setMockAnalysed, updateMockNotes } from '@/db/mutations';
import { MOCK_TYPE_LABEL } from '@/lib/mockMeta';
import { SECTIONS } from '@/lib/sections';
import { deriveSection, needsAnalysis, totalsForMock } from '@/lib/scoring';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const SECTION_HEX: Record<string, string> = {
  VARC: '#6366f1',
  DILR: '#0d9488',
  QA: '#f59e0b',
};

export function MockDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mock = useLiveQuery(() => (id ? db.mocks.get(id) : undefined), [id]);
  // sourceId is not an indexed key, so filter with a table scan (mistakes is
  // small). Using .where('sourceId') would throw — Dexie requires an index.
  const mistakes = useLiveQuery(
    () =>
      id
        ? db.mistakes.filter((m) => m.sourceId === id).toArray()
        : Promise.resolve<Mistake[]>([]),
    [id],
  );

  if (mock === undefined) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Loading… If this persists the mock may not exist.{' '}
        <Link to="/mocks" className="underline">
          Back to mocks
        </Link>
      </div>
    );
  }

  const totals = totalsForMock(mock);
  const chartData = mock.sections.map((s) => ({
    section: SECTIONS[s.sectionId].short,
    score: s.score,
  }));

  async function handleDelete() {
    if (!id) return;
    if (window.confirm(`Delete "${mock!.name}"? This cannot be undone.`)) {
      await deleteMock(id);
      navigate('/mocks');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/mocks" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Mocks
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{mock.name}</h1>
            {needsAnalysis(mock) && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Needs analysis
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {MOCK_TYPE_LABEL[mock.type]} · {mock.provider || 'no provider'} ·{' '}
            {format(mock.takenAt, 'dd MMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/mocks/${mock.id}/edit`)}>
            Edit
          </Button>
          <Button
            variant={needsAnalysis(mock) ? 'primary' : 'secondary'}
            onClick={() => void setMockAnalysed(mock.id, needsAnalysis(mock))}
          >
            {needsAnalysis(mock) ? 'Mark analysed' : 'Reopen analysis'}
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Stat label="Total score" value={totals.score} />
        <Stat label="Attempted" value={totals.attempted} />
        <Stat label="Correct" value={totals.correct} />
        <Stat label="Incorrect" value={totals.incorrect} />
        <Stat label="Accuracy" value={`${(totals.accuracy * 100).toFixed(1)}%`} />
        <Stat label="Overall %ile" value={mock.overallPercentile ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Section scores
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                <XAxis dataKey="section" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.section} fill={SECTION_HEX[d.section]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Breakdown
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-1">Section</th>
                <th className="py-1 text-right">A</th>
                <th className="py-1 text-right">C</th>
                <th className="py-1 text-right">W</th>
                <th className="py-1 text-right">Score</th>
                <th className="py-1 text-right">Acc</th>
                <th className="py-1 text-right">%ile</th>
              </tr>
            </thead>
            <tbody>
              {mock.sections.map((s) => {
                const d = deriveSection(s);
                return (
                  <tr key={s.sectionId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 font-medium">{SECTIONS[s.sectionId].short}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.attempted}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.correct}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.incorrect}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{d.score}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {(d.accuracy * 100).toFixed(0)}%
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{s.percentile ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PostMortem mockId={mock.id} notes={mock.notes} />

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Mistakes from this mock ({mistakes?.length ?? 0})
        </h2>
        {mistakes && mistakes.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {mistakes.map((m) => (
              <li
                key={m.id}
                className="rounded border border-slate-200 px-3 py-2 dark:border-slate-800"
              >
                {m.sourceLabel || m.keyTakeaway || 'Mistake'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            No mistakes logged against this mock yet. (Mistake logging arrives in Phase 4.)
          </p>
        )}
      </div>
    </div>
  );
}

const POSTMORTEM_TEMPLATE =
  'What went well:\n\nWhat cost me marks:\n\nOne change for next mock:\n';

function PostMortem({ mockId, notes }: { mockId: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setValue(notes);
    setSaved(true);
  }, [mockId, notes]);

  useEffect(() => {
    if (value === notes) return;
    setSaved(false);
    const t = setTimeout(() => {
      void updateMockNotes(mockId, value).then(() => setSaved(true));
    }, 600);
    return () => clearTimeout(t);
  }, [value, notes, mockId]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Post-mortem
        </h2>
        <div className="flex items-center gap-3">
          {value.trim() === '' && (
            <button
              type="button"
              onClick={() => setValue(POSTMORTEM_TEMPLATE)}
              className="text-xs text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200"
            >
              Insert template
            </button>
          )}
          <span className="text-xs text-slate-400">{saved ? 'Saved' : 'Saving…'}</span>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        placeholder="What went well / what cost me marks / one change for next mock"
        className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
