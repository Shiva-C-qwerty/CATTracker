import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '@/db/db';
import type { Mock, SectionId } from '@/db/types';
import { SECTIONS, SECTION_IDS } from '@/lib/sections';
import { totalsForMock } from '@/lib/scoring';
import { EmptyState } from '@/components/ui/EmptyState';

const BAR_COLOURS = ['#6366f1', '#0d9488', '#f59e0b', '#e11d48', '#8b5cf6'];

export function MockComparePage() {
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);

  const mocks = useLiveQuery(async () => {
    const found = await Promise.all(ids.map((id) => db.mocks.get(id)));
    return found.filter((m): m is Mock => m != null);
  }, [params.get('ids')]);

  if (mocks == null) return null;
  if (mocks.length < 2) {
    return (
      <EmptyState
        title="Pick at least two mocks to compare"
        hint="Select mocks with the checkboxes on the Mocks page, then choose Compare."
        action={
          <Link to="/mocks" className="text-sm underline">
            Back to mocks
          </Link>
        }
      />
    );
  }

  // One grouped bar per section, a series per mock.
  const sectionData = SECTION_IDS.map((sid) => {
    const row: Record<string, string | number> = { section: SECTIONS[sid].short };
    for (const m of mocks) {
      row[m.name] = sectionScoreFor(m, sid);
    }
    return row;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/mocks" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Mocks
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Comparing {mocks.length} mocks
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Section scores
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectionData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
              <XAxis dataKey="section" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              {mocks.map((m, i) => (
                <Bar
                  key={m.id}
                  dataKey={m.name}
                  fill={BAR_COLOURS[i % BAR_COLOURS.length]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">Metric</th>
              {mocks.map((m) => (
                <th key={m.id} className="px-3 py-2 text-right">
                  <Link to={`/mocks/${m.id}`} className="hover:underline">
                    {m.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <MetricRow label="Date" mocks={mocks} value={(m) => format(m.takenAt, 'dd MMM yy')} />
            <MetricRow label="Total score" mocks={mocks} value={(m) => totalsForMock(m).score} />
            <MetricRow label="Attempted" mocks={mocks} value={(m) => totalsForMock(m).attempted} />
            <MetricRow
              label="Accuracy"
              mocks={mocks}
              value={(m) => `${(totalsForMock(m).accuracy * 100).toFixed(1)}%`}
            />
            <MetricRow
              label="Overall %ile"
              mocks={mocks}
              value={(m) => m.overallPercentile ?? '—'}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  mocks,
  value,
}: {
  label: string;
  mocks: Mock[];
  value: (m: Mock) => string | number;
}) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">{label}</td>
      {mocks.map((m) => (
        <td key={m.id} className="px-3 py-2 text-right tabular-nums">
          {value(m)}
        </td>
      ))}
    </tr>
  );
}

function sectionScoreFor(mock: Mock, sectionId: SectionId): number {
  return mock.sections.find((s) => s.sectionId === sectionId)?.score ?? 0;
}
