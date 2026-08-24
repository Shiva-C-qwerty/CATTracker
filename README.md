# CAT Prep Tracker

A local-first, single-user web app for tracking CAT 2026 preparation. It replaces
the usual prep spreadsheet with a structured system for mock performance, chapter
mastery, a personal formula sheet, and — most importantly — a **mistake log**
designed to surface *patterns* in errors rather than just record them.

Everything runs in the browser against IndexedDB, so the app is fully usable
offline and with no account at all. Optionally, you can sign in to sync the same
data across your laptop and phone — see [Sync](#sync-across-devices).

## Features

- **Dashboard** — countdown to CAT, today's snapshot, revision due, percentile
  trend, weakest chapters, an unanalysed-mocks warning, and an error-type donut.
- **Mocks** — fast entry (just *attempted* and *correct* per section; score,
  accuracy, and wrong-count are computed), sortable/filterable list, per-mock
  breakdown with charts, post-mortem notes, and multi-mock comparison.
- **Mistake Log** — the core feature. Quick-add from anywhere (`Ctrl/Cmd+M`),
  paste a question screenshot straight from the clipboard, tag by a 9-way error
  taxonomy, then filter and analyse to find what's actually costing marks.
- **Revision Queue** — spaced repetition (a simplified SM-2) over your logged
  mistakes: reveal, grade *Got it / Partial / Still wrong*, and mistakes resolve
  out of the queue after two clean passes.
- **Formula Bank** — ~60 seeded CAT QA formulas rendered with KaTeX, each with a
  *when to use* and *common trap*. Add your own, star the important ones, and
  print a dense revision sheet.
- **Analytics** — score/percentile trends, accuracy-vs-attempt scatter, error
  types over time, a chapter mastery matrix, and study-time charts.
- **Study log & goals** — log study sessions, a daily mood/reflection, and track
  goals (weekly hours, mocks/week, chapters mastered, target percentile).
- **Backup** — one-click JSON export/import with a merge-or-replace choice, plus
  a 7-day backup reminder.
- **Sync** — optional cross-device sync over Supabase, with offline-first
  behaviour and last-write-wins conflict resolution.
- **Keyboard-first, dark mode by default, and mobile-friendly.**

## Tech stack

- **React 18 + TypeScript** (strict)
- **Vite** for dev/build
- **Dexie 4** over IndexedDB for persistence, with `dexie-react-hooks`
  (`useLiveQuery`) for reactive reads
- **Supabase** for optional cross-device sync (Postgres + auth + realtime)
- **Tailwind CSS** for styling
- **Recharts** for charts, **KaTeX** (`react-katex`) for formulas,
  **date-fns** for dates
- **Vitest** for the pure computation layer

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | Type-check only, no emit |
| `npm run lint` | ESLint over `.ts`/`.tsx` |
| `npm run verify:sync` | Real-browser checks for the Dexie v2 migration and sync hooks (needs `npm run dev` running) |

Run a single test file: `npm run test -- src/lib/scoring.test.ts`

## Project structure

```
src/
  db/          Dexie setup, schema, seed data, mutations, backup, change tracking
  lib/         Pure, unit-tested logic (scoring, SM-2, analytics, goals, sync)
  sync/        Supabase transport: client, auth, push/pull engine, provider
  components/  Shared UI primitives + layout (shell, error boundary)
  features/    One folder per feature: chapters, mocks, mistakes, revision,
               formulas, analytics, study, goals, dashboard, settings, command
supabase/
  schema.sql   Postgres schema, RLS policies, and realtime setup for sync
```

Conventions: reads go through `useLiveQuery`; **all writes go through named
functions in `src/db/mutations.ts`** (components never call `db.table.put()`);
derived values are computed at read time in `src/lib` and unit-tested there.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + M` | Log a mistake |
| `Ctrl/Cmd + K` or `/` | Command palette |
| `Ctrl/Cmd + E` | Export backup |
| `Ctrl/Cmd + Enter` | Save (inside the mistake modal) |
| `Esc` | Close a modal / palette |

## Sync across devices

Sync is **optional and off by default**. Without it the app behaves exactly as
before: local-only, no account, no network calls. With it, the same data follows
you between your laptop and your phone.

### How it works

IndexedDB stays the source of truth. Supabase holds a replica, and the app reads
and writes locally whether or not the network is up — edits made offline are
uploaded on reconnect. Conflicts resolve **last-write-wins per record**, which is
the right model for one person on two devices.

Every record carries an `_updatedAt` stamp applied automatically by Dexie hooks,
so mutations don't have to know sync exists. Deletes are recorded as tombstones
in an `outbox` table, since a deleted row can't be detected by scanning.

### Setup

1. Create a project at [supabase.com](https://supabase.com) (the free tier is
   plenty).
2. Run `supabase/schema.sql` from this repo in the SQL Editor.
3. Copy `.env.example` to `.env.local` and fill in the Project URL and anon key
   from **Settings → API**.
4. Restart the dev server, then **Settings → Sync across devices → sign in**.
   You get an email link; no password.

For a deployed build, set the same two variables in your Vercel project's
environment variables and redeploy.

The anon key is a public client key and is meant to ship in the bundle — row
level security is what keeps rows private. Never put the `service_role` key in
a `VITE_` variable; it bypasses RLS.

### First sign-in

If the account already has data *and* the device has unsynced local work, you'll
be asked to **merge** (both sides kept, newest edit wins per record) or **use the
account's copy**. Merge is the safe answer — it never drops a record that exists
on only one side.

## Data & privacy

Data lives in your browser's IndexedDB. With sync off it is **per-browser and
per-device** and never sent anywhere; with sync on it is additionally stored in
your own Supabase project, private to your account. Either way:

- Use **Settings → Export** regularly. Sync is not a backup — it faithfully
  replicates deletions too.
- Don't rely on Incognito/Private windows (their storage is wiped on close).
- Moving to a new browser/machine? Either sign in, or Export then Import.

Note that **Clear all data** propagates when sync is on: it clears the account,
on every device. That's deliberate — it's what the button says — and it sits
behind a double confirmation.

## Deployment

The app is a static SPA and deploys to any static host. It's configured for
**Vercel** out of the box:

- `vercel.json` rewrites all routes to `index.html` so deep links survive a hard
  refresh.
- A web app manifest (`public/manifest.webmanifest`) makes it installable.

Deploy by importing the repo at [vercel.com](https://vercel.com) (Vite is
auto-detected: build `npm run build`, output `dist`), or run `npx vercel` in the
project directory. The deployed site starts with an empty database — use
Export/Import to bring your data across.

## Scope

This tracks preparation; it is deliberately **not** a question bank or practice
engine, and it stays single-user — sync keeps *your* devices in step, it does not
add sharing or collaboration.
