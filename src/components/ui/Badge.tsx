import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Badge({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
