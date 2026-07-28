import { db } from './db';
import { META_KEYS, setMeta } from './meta';
import type {
  Chapter,
  DailyLog,
  Formula,
  Goal,
  MetaRecord,
  Mistake,
  Mock,
  StudySession,
} from './types';

export const BACKUP_APP = 'cat-prep-tracker';
export const BACKUP_VERSION = 1;

export interface BackupTables {
  chapters: Chapter[];
  mocks: Mock[];
  mistakes: Mistake[];
  formulas: Formula[];
  sessions: StudySession[];
  dailyLogs: DailyLog[];
  goals: Goal[];
  meta: MetaRecord[];
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  tables: BackupTables;
}

const TABLE_NAMES: (keyof BackupTables)[] = [
  'chapters',
  'mocks',
  'mistakes',
  'formulas',
  'sessions',
  'dailyLogs',
  'goals',
  'meta',
];

export type BackupCounts = Record<keyof BackupTables, number>;

/** Record count per table — shown to the user before importing. */
export function countTables(tables: BackupTables): BackupCounts {
  return TABLE_NAMES.reduce((acc, name) => {
    acc[name] = tables[name]?.length ?? 0;
    return acc;
  }, {} as BackupCounts);
}

/** Read the entire database into a backup object. */
export async function exportAll(): Promise<BackupFile> {
  const [chapters, mocks, mistakes, formulas, sessions, dailyLogs, goals, meta] = await Promise.all(
    [
      db.chapters.toArray(),
      db.mocks.toArray(),
      db.mistakes.toArray(),
      db.formulas.toArray(),
      db.sessions.toArray(),
      db.dailyLogs.toArray(),
      db.goals.toArray(),
      db.meta.toArray(),
    ],
  );
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    tables: { chapters, mocks, mistakes, formulas, sessions, dailyLogs, goals, meta },
  };
}

/**
 * Parse and validate a backup JSON string. Pure and testable — throws a
 * user-readable Error if the shape is wrong. Missing tables default to empty
 * so older/partial backups still import.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Unrecognised backup file.');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== BACKUP_APP) {
    throw new Error('This does not look like a CAT Tracker backup.');
  }
  const rawTables = (obj.tables ?? {}) as Record<string, unknown>;
  const tables = {} as BackupTables;
  for (const name of TABLE_NAMES) {
    const value = rawTables[name];
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error(`Backup table "${name}" is malformed.`);
    }
    // Cast is safe enough for a personal tool; Dexie will reject bad rows.
    tables[name] = (value ?? []) as never;
  }
  return {
    app: BACKUP_APP,
    version: typeof obj.version === 'number' ? obj.version : 1,
    exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : Date.now(),
    tables,
  };
}

/**
 * Import a backup. `merge` upserts by primary key (keeps existing rows not in
 * the file); `replace` clears every table first. Runs in one transaction so a
 * failure leaves the DB untouched.
 */
export async function importAll(file: BackupFile, mode: 'merge' | 'replace'): Promise<void> {
  const t = file.tables;
  await db.transaction(
    'rw',
    [
      db.chapters,
      db.mocks,
      db.mistakes,
      db.formulas,
      db.sessions,
      db.dailyLogs,
      db.goals,
      db.meta,
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.chapters.clear(),
          db.mocks.clear(),
          db.mistakes.clear(),
          db.formulas.clear(),
          db.sessions.clear(),
          db.dailyLogs.clear(),
          db.goals.clear(),
          db.meta.clear(),
        ]);
      }
      await Promise.all([
        db.chapters.bulkPut(t.chapters),
        db.mocks.bulkPut(t.mocks),
        db.mistakes.bulkPut(t.mistakes),
        db.formulas.bulkPut(t.formulas),
        db.sessions.bulkPut(t.sessions),
        db.dailyLogs.bulkPut(t.dailyLogs),
        db.goals.bulkPut(t.goals),
        db.meta.bulkPut(t.meta),
      ]);
    },
  );
}

/** Wipe all app data. Used by the Settings danger zone. */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.chapters.clear(),
    db.mocks.clear(),
    db.mistakes.clear(),
    db.formulas.clear(),
    db.sessions.clear(),
    db.dailyLogs.clear(),
    db.goals.clear(),
    db.meta.clear(),
  ]);
}

/** Record that a successful export just happened (drives the 7-day reminder). */
export function markExported(at: number = Date.now()): Promise<void> {
  return setMeta(META_KEYS.lastExportAt, at);
}
