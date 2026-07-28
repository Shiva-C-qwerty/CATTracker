import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Card } from '@/components/ui/Card';
import { GoalRow } from './GoalRow';
import { useGoalContext } from './useGoalContext';

/** Active goals with live progress, for the dashboard. */
export function GoalsWidget() {
  const goals = useLiveQuery(() => db.goals.filter((g) => g.isActive).toArray(), []);
  const ctx = useGoalContext();

  if (!goals || goals.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Goals
        </h2>
        <Link to="/settings" className="text-xs text-slate-400 hover:underline">
          Manage
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {goals.map((g) => (
          <GoalRow key={g.id} goal={g} ctx={ctx} compact />
        ))}
      </div>
    </Card>
  );
}
