# CAT Prep Tracker

A local-first, single-user web app for tracking CAT 2026 preparation. It replaces
the usual prep spreadsheet with a structured system for mock performance, chapter
mastery, a personal formula sheet, and — most importantly — a **mistake log**
designed to surface *patterns* in errors rather than just record them.

Everything runs in the browser. No backend, no accounts, no network calls. Your
data lives in IndexedDB and never leaves your machine.

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
  a 7-day backup reminder. This is your only backup, so it's a first-class feature.
- **Keyboard-first, dark mode by default, and mobile-friendly.**

## Tech stack

- **React 18 + TypeScript** (strict)
- **Vite** for dev/build
- **Dexie 4** over IndexedDB for persistence, with `dexie-react-hooks`
  (`useLiveQuery`) for reactive reads
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

Run a single test file: `npm run test -- src/lib/scoring.test.ts`

## Project structure

```
src/
  db/          Dexie setup, schema, seed data, mutations, backup
  lib/         Pure, unit-tested logic (scoring, SM-2, analytics, goals, dates)
  components/  Shared UI primitives + layout (shell, error boundary)
  features/    One folder per feature: chapters, mocks, mistakes, revision,
               formulas, analytics, study, goals, dashboard, settings, command
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

## Data & privacy

All data is stored in your browser's IndexedDB — it is **per-browser and
per-device**, and never sent anywhere. Because of that:

- Use **Settings → Export** regularly. That JSON file is your backup.
- Don't rely on Incognito/Private windows (their storage is wiped on close).
- Moving to a new browser/machine? Export on the old one, Import on the new one.

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
engine, and has no accounts, multi-user, or cloud sync. Backup/restore covers
data portability.
