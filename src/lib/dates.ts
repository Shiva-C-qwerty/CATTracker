import { formatDistanceToNowStrict } from 'date-fns';

/** "3 days ago" / "never" for nullable epoch timestamps. */
export function relativeTime(ts: number | null | undefined): string {
  if (ts == null) return 'never';
  return `${formatDistanceToNowStrict(ts)} ago`;
}

/** True if a target revisit timestamp is due (in the past). */
export function isDue(ts: number | null | undefined, now: number = Date.now()): boolean {
  return ts != null && ts <= now;
}
