import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/db/db';
import type { Mock, MockType } from '@/db/types';
import { MOCK_TYPE_LABEL } from '@/lib/mockMeta';
import { needsAnalysis, totalsForMock } from '@/lib/scoring';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProviders } from './useProviders';

type SortKey = 'takenAt' | 'score' | 'name';
type TypeFilter = MockType | 'all';

export function MocksPage() {
  const navigate = useNavigate();
  const mocks = useLiveQuery(() => db.mocks.orderBy('takenAt').reverse().toArray(), []);
  const providers = useProviders();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('takenAt');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const filtered = (mocks ?? []).filter(
      (m) =>
        (typeFilter === 'all' || m.type === typeFilter) &&
        (providerFilter === 'all' || m.provider === providerFilter),
    );
    return [...filtered].sort((a, b) => compareMocks(a, b, sortKey));
  }, [mocks, typeFilter, providerFilter, sortKey]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mocks</h1>
        <Button onClick={() => navigate('/mocks/new')}>+ Add mock</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: 'All types' },
            { value: 'full-mock', label: 'Full mock' },
            { value: 'sectional', label: 'Sectional' },
            { value: 'topic-test', label: 'Topic test' },
          ]}
        />
        <Select
          value={providerFilter}
          onChange={setProviderFilter}
          options={[
            { value: 'all', label: 'All providers' },
            ...providers.map((p) => ({ value: p, label: p })),
          ]}
        />
        <Select
          value={sortKey}
          onChange={setSortKey}
          options={[
            { value: 'takenAt', label: 'Newest first' },
            { value: 'score', label: 'Highest score' },
            { value: 'name', label: 'Name (A–Z)' },
          ]}
        />
        {selected.size >= 2 && (
          <Button
            variant="secondary"
            className="ml-auto"
            onClick={() => navigate(`/mocks/compare?ids=${[...selected].join(',')}`)}
          >
            Compare {selected.size}
          </Button>
        )}
      </div>

      {mocks == null ? null : rows.length === 0 ? (
        <EmptyState
          title={mocks.length === 0 ? 'No mocks logged yet' : 'No mocks match these filters'}
          hint={
            mocks.length === 0
              ? 'Log your first mock to start tracking score and percentile trends.'
              : 'Try clearing the type or provider filter.'
          }
          action={
            mocks.length === 0 ? (
              <Button onClick={() => navigate('/mocks/new')}>+ Add mock</Button>
            ) : undefined
          }
        />
      ) : (
        <MockTable rows={rows} selected={selected} onToggle={toggleSelected} />
      )}
    </div>
  );
}

function MockTable({
  rows,
  selected,
  onToggle,
}: {
  rows: Mock[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            <th className="w-8 px-3 py-2"></th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2 text-right">Score</th>
            <th className="px-3 py-2 text-right">Accuracy</th>
            <th className="px-3 py-2 text-right">%ile</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const t = totalsForMock(m);
            return (
              <tr
                key={m.id}
                className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => onToggle(m.id)}
                    aria-label={`Select ${m.name} for comparison`}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500 dark:text-slate-400">
                  {format(m.takenAt, 'dd MMM yy')}
                </td>
                <td className="px-3 py-2">
                  <Link to={`/mocks/${m.id}`} className="font-medium hover:underline">
                    {m.name}
                  </Link>
                  {m.provider && (
                    <span className="ml-2 text-xs text-slate-400">{m.provider}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                  {MOCK_TYPE_LABEL[m.type]}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{t.score}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {(t.accuracy * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {m.overallPercentile ?? '—'}
                </td>
                <td className={cn('px-3 py-2 text-right')}>
                  {needsAnalysis(m) && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Needs analysis
                    </Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function compareMocks(a: Mock, b: Mock, key: SortKey): number {
  switch (key) {
    case 'takenAt':
      return b.takenAt - a.takenAt;
    case 'score':
      return totalsForMock(b).score - totalsForMock(a).score;
    case 'name':
      return a.name.localeCompare(b.name);
  }
}
