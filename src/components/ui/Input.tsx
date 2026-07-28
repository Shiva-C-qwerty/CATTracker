import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {label} {hint && <span className="font-normal text-slate-400">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
