import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { META_KEYS } from '@/db/meta';

const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPORT_REMINDER_DAYS = 7;

export interface ExportReminder {
  loaded: boolean;
  hasData: boolean;
  lastExportAt: number | null;
  daysSince: number | null; // null = never exported
  due: boolean;
}

/**
 * Drives the "back up your data" nudge. Due when there's data and it's been
 * more than 7 days (or never) since the last export.
 */
export function useExportReminder(): ExportReminder {
  const result = useLiveQuery(async () => {
    const row = await db.meta.get(META_KEYS.lastExportAt);
    const lastExportAt = typeof row?.value === 'number' ? row.value : null;
    const mistakeCount = await db.mistakes.count();
    const mockCount = await db.mocks.count();
    return { lastExportAt, hasData: mistakeCount + mockCount > 0 };
  }, []);

  if (!result) {
    return { loaded: false, hasData: false, lastExportAt: null, daysSince: null, due: false };
  }

  const daysSince =
    result.lastExportAt == null ? null : Math.floor((Date.now() - result.lastExportAt) / DAY_MS);
  const due = result.hasData && (daysSince == null || daysSince >= EXPORT_REMINDER_DAYS);

  return {
    loaded: true,
    hasData: result.hasData,
    lastExportAt: result.lastExportAt,
    daysSince,
    due,
  };
}
