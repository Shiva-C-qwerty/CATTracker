import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  className,
  ...rest
}: SelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900',
        'focus:outline-none focus:ring-2 focus:ring-slate-400',
        'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        className,
      )}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
