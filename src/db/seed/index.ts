import { db } from '../db';
import { META_KEYS, SEED_VERSION, defaultExamDate, getMeta, setMeta } from '../meta';
import { buildSeedChapters } from './chapters';
import { buildSeedFormulas } from './formulas';

/**
 * Seed the database on first run. Idempotent and ADDITIVE — never destructive.
 * Safe to call on every app start and safe to call again to top up new seed
 * chapters without clobbering the user's edits (status, confidence, notes).
 */
export async function seedDatabase(): Promise<void> {
  await seedChapters();
  await seedFormulas();
  await ensureExamDate();
  await setMeta(META_KEYS.seedVersion, SEED_VERSION);
}

async function seedChapters(): Promise<void> {
  const seed = buildSeedChapters();
  const existingIds = new Set(await db.chapters.toCollection().primaryKeys());
  // Only insert chapters that don't already exist — preserves user edits and
  // any custom chapters, and adds chapters introduced in a newer seed version.
  const toAdd = seed.filter((c) => !existingIds.has(c.id));
  if (toAdd.length > 0) {
    await db.chapters.bulkAdd(toAdd);
  }
}

async function seedFormulas(): Promise<void> {
  const seed = buildSeedFormulas();
  const existingIds = new Set(await db.formulas.toCollection().primaryKeys());
  // Additive by stable id — never overwrites a user's starred/edited seed
  // formula, and tops up new seed formulas on later versions.
  const toAdd = seed.filter((f) => !existingIds.has(f.id));
  if (toAdd.length > 0) {
    await db.formulas.bulkAdd(toAdd);
  }
}

async function ensureExamDate(): Promise<void> {
  const existing = await getMeta<number>(META_KEYS.examDate);
  if (existing == null) {
    await setMeta(META_KEYS.examDate, defaultExamDate());
  }
}
