import type { Goal } from '@/db/types';
import type { GoalContext } from '@/lib/goals';
import { goalCurrentValue, goalDaysLeft, goalProgress } from '@/lib/goals';
import { GOAL_UNIT } from './goalMeta';

export function GoalRow({
  goal,
  ctx,
  compact,
}: {
  goal: Goal;
  ctx: GoalContext;
  compact?: boolean;
}) {
  const current = goalCurrentValue(goal, ctx);
  const pct = Math.round(goalProgress(goal, ctx) * 100);
  const daysLeft = goalDaysLeft(goal);
  const unit = GOAL_UNIT[goal.type];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{goal.label}</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {current}
          {unit && ` ${unit}`} / {goal.targetValue}
          {unit && ` ${unit}`}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={pct >= 100 ? 'h-full rounded-full bg-emerald-500' : 'h-full rounded-full bg-slate-500'}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && daysLeft != null && (
        <div className="mt-1 text-xs text-slate-400">
          {daysLeft >= 0 ? `${daysLeft} days left` : `${-daysLeft} days overdue`}
        </div>
      )}
    </div>
  );
}
