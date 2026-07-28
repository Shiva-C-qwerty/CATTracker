import { db } from './db';

// Well-known keys for the `meta` key/value table.
export const META_KEYS = {
  seedVersion: 'seedVersion',
  lastExportAt: 'lastExportAt',
  examDate: 'examDate', // epoch ms of the CAT exam
} as const;

/** Current seed version. Bump when seed data changes. Seeding is additive-by-id
 * and runs every startup, so existing DBs pick up new seed rows automatically. */
export const SEED_VERSION = 2;

/**
 * Default exam date: last Sunday of November 2026 (per CLAUDE.md Settings).
 * Computed rather than hardcoded so it stays correct if the year changes.
 */
export function defaultExamDate(year = 2026): number {
  // Last day of November, then walk back to Sunday (getDay() === 0).
  const d = new Date(year, 11, 0); // day 0 of December = Nov 30
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  d.setHours(9, 0, 0, 0); // exam morning
  return d.getTime();
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
