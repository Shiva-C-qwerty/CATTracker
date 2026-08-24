/**
 * Real-browser verification for the sync layer (schema v2).
 *
 * jsdom + fake-indexeddb don't catch Dexie upgrade bugs, and the v1 -> v2
 * migration touches every row of real prep data. Run against `npm run dev`:
 *   node scripts/verify-sync.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const V1_SCHEMA = {
  chapters: 'id, sectionId, topicGroup, status, confidence, targetRevisitAt',
  mocks: 'id, takenAt, type, provider, analysedAt',
  mistakes: 'id, chapterId, errorType, createdAt, nextRevisionAt, isResolved, *tags',
  formulas: 'id, chapterId, isStarred',
  sessions: 'id, chapterId, sectionId, startedAt, activity',
  dailyLogs: 'date',
  goals: 'id, isActive',
  meta: 'key',
};

const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

// Dexie errors log as opaque aliases ("DexieError2") through the console
// bridge; capture name/message in-page so failures are diagnosable.
await page.addInitScript(() => {
  window.__errorDetail = [];
  const orig = console.error;
  console.error = (...args) => {
    window.__errorDetail.push(
      args
        .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
        .join(' '),
    );
    orig(...args);
  };
});

await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__db));

// --- 1. Fresh install opens at schema v2 -----------------------------------
const version = await page.evaluate(() => window.__db.verno);
check('fresh install opens at schema v2', version === 2, `verno=${version}`);

// --- 2. Seed a legacy v1 database, then reload to force the upgrade --------
await page.evaluate(async (v1) => {
  const Dexie = Object.getPrototypeOf(window.__db.constructor);
  window.__db.close();
  await Dexie.delete('cat-prep-tracker');

  const old = new Dexie('cat-prep-tracker');
  old.version(1).stores(v1);
  await old.open();
  await old.table('chapters').put({
    id: 'legacy-chapter',
    sectionId: 'QA',
    topicGroup: 'Arithmetic',
    name: 'Percentages',
    status: 'practicing',
    confidence: 4,
    lastStudiedAt: 1_700_000_000_000,
    lastRevisedAt: null,
    targetRevisitAt: null,
    notes: 'four months of work',
    isCustom: false,
    orderIndex: 0,
  });
  await old.table('mistakes').put({
    id: 'legacy-mistake',
    chapterId: 'legacy-chapter',
    sourceType: 'mock',
    sourceId: null,
    sourceLabel: 'SimCAT 07 Q14',
    createdAt: 1_700_000_000_000,
    errorType: 'calculation-slip',
    questionText: '',
    questionImage: null,
    myApproach: '',
    correctApproach: '',
    keyTakeaway: 'check the denominator',
    timeSpentSec: null,
    difficulty: 'medium',
    tags: ['percentages'],
    revisionCount: 0,
    lastRevisedAt: null,
    nextRevisionAt: null,
    lapses: 0,
    isResolved: false,
  });
  old.close();
}, V1_SCHEMA);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__db));
await page.waitForFunction(async () => (await window.__db.chapters.get('legacy-chapter')) != null);

const upgraded = await page.evaluate(async () => {
  const chapter = await window.__db.chapters.get('legacy-chapter');
  const mistake = await window.__db.mistakes.get('legacy-mistake');
  return {
    verno: window.__db.verno,
    confidence: chapter?.confidence,
    notes: chapter?.notes,
    stamped: typeof chapter?._updatedAt === 'number',
    mistakeStamped: typeof mistake?._updatedAt === 'number',
    takeaway: mistake?.keyTakeaway,
    seededAlongside: await window.__db.chapters.count(),
  };
});

check('v1 data survives the upgrade', upgraded.confidence === 4 && upgraded.notes === 'four months of work',
  `confidence=${upgraded.confidence}, notes="${upgraded.notes}"`);
check('upgrade stamps _updatedAt on every table', upgraded.stamped && upgraded.mistakeStamped);
check('seed still tops up alongside legacy rows', upgraded.seededAlongside > 50,
  `${upgraded.seededAlongside} chapters`);

// --- 3. Local writes are stamped by the change-tracking hooks --------------
const stamping = await page.evaluate(async () => {
  const before = (await window.__db.chapters.get('legacy-chapter'))._updatedAt;
  await new Promise((r) => setTimeout(r, 5));
  await window.__db.chapters.update('legacy-chapter', { confidence: 5 });
  const after = (await window.__db.chapters.get('legacy-chapter'))._updatedAt;
  return { before, after };
});
check('a local edit advances _updatedAt', stamping.after > stamping.before,
  `${stamping.before} -> ${stamping.after}`);

// --- 4. A remote apply keeps the server timestamp (no echo) ---------------
const remoteApply = await page.evaluate(async () => {
  const record = await window.__db.chapters.get('legacy-chapter');
  const serverStamp = 1_600_000_000_000;
  await window.__db.chapters.put({ ...record, confidence: 2, _updatedAt: serverStamp });
  const after = await window.__db.chapters.get('legacy-chapter');
  return { stamp: after._updatedAt, serverStamp, confidence: after.confidence };
});
check('a remote apply is not re-stamped as a local edit',
  remoteApply.stamp === remoteApply.serverStamp,
  `kept ${remoteApply.stamp}, expected ${remoteApply.serverStamp}`);

// --- 5. Deletes leave a tombstone ----------------------------------------
const tombstone = await page.evaluate(async () => {
  await window.__db.mistakes.get('legacy-mistake');
  const mod = await import('/src/db/changeTracking.ts');
  await mod.deleteAndTrack('mistakes', 'legacy-mistake');
  return {
    gone: (await window.__db.mistakes.get('legacy-mistake')) === undefined,
    outbox: await window.__db.outbox.toArray(),
  };
});
check('delete removes the row and records a tombstone',
  tombstone.gone && tombstone.outbox.some((t) => t.recordId === 'legacy-mistake'),
  `outbox=${JSON.stringify(tombstone.outbox.map((t) => t.key))}`);

// --- 6. The Settings sync panel renders ----------------------------------
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
const panel = await page.getByText('Sync across devices').isVisible();
check('Settings shows the sync panel', panel);

const unconfigured = await page.getByText('Not configured on this build').isVisible();
check('unconfigured build degrades gracefully (no login wall)', unconfigured);

// --- 7. Other screens still work -----------------------------------------
for (const path of ['/', '/mistakes', '/mocks', '/formulas', '/analytics', '/revise']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  const crashed = await page.getByText('Something went wrong').isVisible().catch(() => false);
  check(`route ${path} renders`, !crashed);
}

const detail = await page.evaluate(() => window.__errorDetail ?? []);
const realErrors = errors.filter((e) => !/favicon|manifest/i.test(e));
check('no console errors', realErrors.length === 0,
  [...realErrors, ...detail].slice(0, 4).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
