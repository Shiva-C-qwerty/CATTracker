import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/db/db';
import type { GoalType } from '@/db/types';
import { addGoal, deleteGoal, updateGoal } from '@/db/mutations';
import { goalCurrentValue } from '@/lib/goals';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GoalRow } from './GoalRow';
import { GOAL_TYPES, GOAL_TYPE_LABEL } from './goalMeta';
import { useGoalContext } from './useGoalContext';

export function GoalsManager() {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const ctx = useGoalContext();

  const [type, setType] = useState<GoalType>('weekly-hours');
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

  async function add() {
    const targetValue = Number(target);
    if (!label.trim() || !Number.isFinite(targetValue) || targetValue <= 0) return;
    await addGoal({
      type,
      label: label.trim(),
      targetValue,
      deadline: deadline ? new Date(`${deadline}T23:59:59`).getTime() : null,
    });
    setLabel('');
    setTarget('');
    setDeadline('');
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold">Goals</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Progress is computed live where possible (percentile, weekly hours, mocks, chapters).
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {(goals ?? []).map((g) => (
          <div key={g.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <GoalRow goal={g} ctx={ctx} />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => void updateGoal(g.id, { isActive: !g.isActive })}
                className="text-slate-500 hover:underline"
              >
                {g.isActive ? 'Deactivate' : 'Activate'}
              </button>
              {g.type === 'custom' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void updateGoal(g.id, { currentValue: Math.max(0, goalCurrentValue(g, ctx) - 1) })
                    }
                    className="rounded border border-slate-300 px-1.5 dark:border-slate-700"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateGoal(g.id, { currentValue: goalCurrentValue(g, ctx) + 1 })}
                    className="rounded border border-slate-300 px-1.5 dark:border-slate-700"
                  >
                    +
                  </button>
                </>
              )}
              {g.deadline && (
                <span className="text-slate-400">due {format(g.deadline, 'dd MMM')}</span>
              )}
              <button
                type="button"
                onClick={() => void deleteGoal(g.id)}
                className="ml-auto text-rose-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {goals && goals.length === 0 && (
          <p className="text-sm text-slate-400">No goals yet. Add one below.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2">
        <Field label="Type">
          <Select
            value={type}
            onChange={setType}
            options={GOAL_TYPES.map((t) => ({ value: t, label: GOAL_TYPE_LABEL[t] }))}
          />
        </Field>
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 20 hrs/week" />
        </Field>
        <Field label="Target value">
          <Input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Deadline" hint="optional">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <div>
          <Button onClick={add}>Add goal</Button>
        </div>
      </div>
    </Card>
  );
}
