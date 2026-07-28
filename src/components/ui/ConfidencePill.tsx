import type { Confidence } from '@/db/types';
import { cn } from '@/lib/cn';

const LEVELS: Confidence[] = [1, 2, 3, 4, 5];

/**
 * Inline confidence control — five dots, click one to set that level. No
 * modal (per CLAUDE.md). Colour ramps red→green with the level.
 */
export function ConfidencePill({
  value,
  onChange,
}: {
  value: Confidence;
  onChange: (next: Confidence) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Confidence">
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          aria-label={`Set confidence ${level}`}
          aria-pressed={value === level}
          onClick={() => onChange(level)}
          className={cn(
            'h-3 w-3 rounded-full transition-transform hover:scale-125',
            level <= value ? fillColour(value) : 'bg-slate-200 dark:bg-slate-700',
          )}
        />
      ))}
    </div>
  );
}

function fillColour(value: Confidence): string {
  switch (value) {
    case 1:
      return 'bg-red-500';
    case 2:
      return 'bg-orange-500';
    case 3:
      return 'bg-amber-500';
    case 4:
      return 'bg-lime-500';
    case 5:
      return 'bg-emerald-500';
  }
}
