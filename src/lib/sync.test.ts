import { describe, expect, it } from 'vitest';
import {
  advancePushWatermark,
  dedupePushRows,
  hasUserData,
  planPull,
  shouldApplyRemote,
  toPushRow,
  tombstoneToPushRow,
  type PushRow,
  type RemoteRow,
} from './sync';

function row(over: Partial<RemoteRow> = {}): RemoteRow {
  return {
    table_name: 'mistakes',
    record_id: 'm1',
    data: { id: 'm1', keyTakeaway: 'remote' },
    deleted: false,
    updated_at: 100,
    seq: 1,
    ...over,
  };
}

/** Local lookup helper: a map of `table:id` -> _updatedAt. */
function lookup(entries: Record<string, number>) {
  return (table: string, id: string) => entries[`${table}:${id}`];
}

describe('shouldApplyRemote', () => {
  it('applies when there is no local copy', () => {
    expect(shouldApplyRemote(100, undefined)).toBe(true);
  });

  it('applies when the remote copy is newer', () => {
    expect(shouldApplyRemote(200, 100)).toBe(true);
  });

  it('rejects when the local copy is newer', () => {
    expect(shouldApplyRemote(100, 200)).toBe(false);
  });

  it('rejects on an exact tie so re-pulled rows are not rewritten', () => {
    expect(shouldApplyRemote(100, 100)).toBe(false);
  });

  it('applies unconditionally in remote-wins mode', () => {
    expect(shouldApplyRemote(1, 999_999, 'remote-wins')).toBe(true);
  });
});

describe('planPull', () => {
  it('queues an upsert carrying the server timestamp', () => {
    const plan = planPull([row()], lookup({}), 0);
    expect(plan.upserts.mistakes).toEqual([
      { id: 'm1', keyTakeaway: 'remote', _updatedAt: 100 },
    ]);
    expect(plan.applied).toBe(1);
  });

  it('keeps a newer local edit and counts it as skipped', () => {
    const plan = planPull([row()], lookup({ 'mistakes:m1': 500 }), 0);
    expect(plan.upserts).toEqual({});
    expect(plan.skipped).toBe(1);
    expect(plan.applied).toBe(0);
  });

  it('queues a delete when a local copy exists', () => {
    const rows = [row({ deleted: true, data: null, updated_at: 300 })];
    const plan = planPull(rows, lookup({ 'mistakes:m1': 100 }), 0);
    expect(plan.deletes.mistakes).toEqual(['m1']);
  });

  it('ignores a delete for a record it never had', () => {
    const rows = [row({ deleted: true, data: null, updated_at: 300 })];
    const plan = planPull(rows, lookup({}), 0);
    expect(plan.deletes).toEqual({});
    expect(plan.applied).toBe(0);
  });

  it('advances the watermark over skipped rows too', () => {
    // A row we decline to apply is still a row we have seen. If the watermark
    // stalled on it, every later pull would re-fetch it forever.
    const rows = [row({ seq: 42 })];
    const plan = planPull(rows, lookup({ 'mistakes:m1': 999 }), 7);
    expect(plan.skipped).toBe(1);
    expect(plan.seq).toBe(42);
  });

  it('never moves the watermark backwards', () => {
    const plan = planPull([row({ seq: 3 })], lookup({}), 10);
    expect(plan.seq).toBe(10);
  });

  it('groups rows by table', () => {
    const rows = [
      row({ table_name: 'mocks', record_id: 'k1', data: { id: 'k1' }, seq: 1 }),
      row({ table_name: 'mistakes', record_id: 'm1', seq: 2 }),
    ];
    const plan = planPull(rows, lookup({}), 0);
    expect(Object.keys(plan.upserts).sort()).toEqual(['mistakes', 'mocks']);
  });

  it('skips malformed rows that are neither a delete nor a payload', () => {
    const plan = planPull([row({ data: null, deleted: false })], lookup({}), 0);
    expect(plan.upserts).toEqual({});
    expect(plan.skipped).toBe(1);
  });

  it('lets the server win over fresh seed data in remote-wins mode', () => {
    // The data-loss trap: seeded chapters on a new device carry a *newer*
    // timestamp than the real server copy, so plain LWW would keep the blank
    // defaults and push them up.
    const seededLocally = Date.now();
    const rows = [
      row({
        table_name: 'chapters',
        record_id: 'qa-percentages',
        data: { id: 'qa-percentages', confidence: 4, notes: 'four months of work' },
        updated_at: seededLocally - 86_400_000,
      }),
    ];

    const lww = planPull(rows, lookup({ 'chapters:qa-percentages': seededLocally }), 0);
    expect(lww.applied).toBe(0);

    const adopt = planPull(
      rows,
      lookup({ 'chapters:qa-percentages': seededLocally }),
      0,
      'remote-wins',
    );
    expect(adopt.upserts.chapters?.[0]).toMatchObject({ notes: 'four months of work' });
  });
});

describe('advancePushWatermark', () => {
  it('moves past the newest applied row so it is not echoed back', () => {
    expect(advancePushWatermark(50, [row({ updated_at: 300 })])).toBe(300);
  });

  it('never moves backwards', () => {
    expect(advancePushWatermark(500, [row({ updated_at: 300 })])).toBe(500);
  });

  it('is a no-op on an empty pull', () => {
    expect(advancePushWatermark(500, [])).toBe(500);
  });
});

describe('push row construction', () => {
  it('uses the record timestamp and the table primary key', () => {
    const r = toPushRow('dailyLogs', 'date', { date: '2026-08-23', _updatedAt: 42 });
    expect(r).toMatchObject({
      table_name: 'dailyLogs',
      record_id: '2026-08-23',
      deleted: false,
      updated_at: 42,
    });
  });

  it('builds a tombstone with a null payload', () => {
    expect(tombstoneToPushRow('mocks', 'k1', 900)).toEqual({
      table_name: 'mocks',
      record_id: 'k1',
      data: null,
      deleted: true,
      updated_at: 900,
    });
  });
});

describe('dedupePushRows', () => {
  const del: PushRow = {
    table_name: 'chapters',
    record_id: 'qa-percentages',
    data: null,
    deleted: true,
    updated_at: 100,
  };
  const reseed: PushRow = {
    table_name: 'chapters',
    record_id: 'qa-percentages',
    data: { id: 'qa-percentages' },
    deleted: false,
    updated_at: 200,
  };

  it('collapses a wipe-then-reseed of the same stable id to the reseed', () => {
    // Postgres rejects a batch that touches one conflict key twice, and the
    // danger-zone clear + re-seed produces exactly that for every chapter.
    const out = dedupePushRows([del, reseed]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ deleted: false, updated_at: 200 });
  });

  it('keeps the newest write regardless of input order', () => {
    expect(dedupePushRows([reseed, del])[0]).toMatchObject({ updated_at: 200 });
  });

  it('leaves distinct keys alone', () => {
    const other: PushRow = { ...del, record_id: 'qa-averages' };
    expect(dedupePushRows([del, other])).toHaveLength(2);
  });

  it('never emits two rows for one conflict key', () => {
    const rows = [del, reseed, { ...del, updated_at: 300 }];
    const keys = dedupePushRows(rows).map((r) => `${r.table_name}:${r.record_id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('hasUserData', () => {
  const empty = {
    mocks: 0,
    mistakes: 0,
    sessions: 0,
    goals: 0,
    editedChapters: 0,
    customFormulas: 0,
  };

  it('is false for a freshly seeded database', () => {
    expect(hasUserData(empty)).toBe(false);
  });

  it('is true once anything real has been logged', () => {
    expect(hasUserData({ ...empty, mistakes: 1 })).toBe(true);
    expect(hasUserData({ ...empty, editedChapters: 1 })).toBe(true);
  });
});
