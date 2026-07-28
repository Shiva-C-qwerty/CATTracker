import { describe, expect, it } from 'vitest';
import { BACKUP_APP, countTables, parseBackup } from './backup';

function validBackup(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: BACKUP_APP,
    version: 1,
    exportedAt: 123,
    tables: { chapters: [{ id: 'a' }], mocks: [], ...extra },
  });
}

describe('parseBackup', () => {
  it('parses a valid backup and defaults missing tables to empty', () => {
    const file = parseBackup(validBackup());
    expect(file.app).toBe(BACKUP_APP);
    expect(file.tables.chapters).toHaveLength(1);
    expect(file.tables.mistakes).toEqual([]); // missing → empty
    expect(file.tables.goals).toEqual([]);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow(/valid JSON/);
  });

  it('rejects a file from another app', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'something-else' }))).toThrow(/CAT Tracker/);
  });

  it('rejects a malformed table', () => {
    expect(() =>
      parseBackup(JSON.stringify({ app: BACKUP_APP, tables: { chapters: 'nope' } })),
    ).toThrow(/malformed/);
  });

  it('tolerates a missing version/exportedAt', () => {
    const file = parseBackup(JSON.stringify({ app: BACKUP_APP, tables: {} }));
    expect(file.version).toBe(1);
    expect(typeof file.exportedAt).toBe('number');
  });
});

describe('countTables', () => {
  it('counts rows per table', () => {
    const file = parseBackup(validBackup({ mistakes: [{ id: 'm1' }, { id: 'm2' }] }));
    const counts = countTables(file.tables);
    expect(counts.chapters).toBe(1);
    expect(counts.mistakes).toBe(2);
    expect(counts.formulas).toBe(0);
  });
});
