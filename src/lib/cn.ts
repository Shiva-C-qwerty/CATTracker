/**
 * Tiny className joiner. Filters out falsy values so callers can write
 * `cn('base', active && 'active')`. No dependency needed for this scale.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
