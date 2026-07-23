# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CAT Prep Tracker

## Status

Scaffolded (Phase 0 done). Track build progress in `PROGRESS.md` — a phased
checklist. Follow the **Implementation Order** section below for sequencing.

## Commands

- `npm install` — install dependencies
- `npm run dev` — Vite dev server
- `npm run build` — production build (`tsc -b` then `vite build`)
- `npm run typecheck` — type-check only, no emit
- `npm run lint` — ESLint over `.ts`/`.tsx`
- `npm run test` — Vitest, single run
- `npm run test:watch` — Vitest watch mode
- `npm run test -- src/lib/foo.test.ts` — run a single test file
- `npm run test -- -t "name"` — run tests matching a name

The path alias `@/` maps to `src/` (configured in `vite.config.ts` and
`tsconfig.app.json` — keep them in sync).

## Project Purpose

A local-first, single-user web app to track CAT 2026 preparation. It replaces
a spreadsheet with a structured system for: mock test performance, sectional
and chapter-level mastery, a personal formula sheet, and — most importantly —
a mistake log designed to surface *patterns* in errors rather than just record
them.

The user is one person preparing for CAT (exam ~late November 2026). Prep
window is roughly August to November. The app will be used daily, often for
quick 30-second entries between study blocks.

## Design Principles (read before writing any code)

1. **Speed of entry beats completeness of data.** Any form that takes more
   than 30 seconds to fill will be abandoned. Default everything. Make
   optional fields visibly optional. Never block a save on a missing field.
2. **Local-first, no backend, no auth.** All data in IndexedDB via Dexie.
   No login screen. No network calls. The app must work fully offline.
3. **Data is precious and portable.** Export-to-JSON and import-from-JSON are
   P0 features, not nice-to-haves. Losing four months of prep data is
   unacceptable. Auto-prompt an export reminder every 7 days.
4. **Insight over logging.** Every screen should answer "what should I do
   next?" A tracker that only stores data is a worse spreadsheet. Charts and
   summaries must lead to an action.
5. **Keyboard-first.** The user will be typing fast. Global shortcuts, enter
   to submit, escape to close, no mouse required for the common paths.

## Tech Stack

- **React 18 + TypeScript** (strict mode on)
- **Vite** for build/dev
- **Dexie 4** over IndexedDB for persistence
- **dexie-react-hooks** (`useLiveQuery`) for reactive reads — do not build a
  separate state management layer, `useLiveQuery` is sufficient
- **Tailwind CSS** for styling
- **Recharts** for charts
- **React Router v6** for routing
- **date-fns** for date handling
- **KaTeX** (`react-katex`) for rendering formulas in LaTeX
- **Vitest** for tests on the analytics/computation layer

Do **not** add: Redux, Zustand, a component library (build the ~10 primitives
needed), a backend, an ORM, or any auth solution.

## Domain Model

### CAT Structure (hardcode this as seed data)

Three sections, fixed:

| Section | Full name | Questions | Time |
|---|---|---|---|
| VARC | Verbal Ability & Reading Comprehension | 24 | 40 min |
| DILR | Data Interpretation & Logical Reasoning | 22 | 40 min |
| QA | Quantitative Aptitude | 22 | 40 min |

Scoring: +3 correct, −1 incorrect for MCQs, 0 for TITA (non-MCQ) incorrect.
Total 66 questions, 120 minutes, max raw score 198.

### Chapter Seed Data

Seed the DB on first run with this chapter list. Each chapter belongs to a
section and has a `topicGroup` for grouping in the UI.

**QA**
- Arithmetic: Percentages; Profit, Loss & Discount; Simple & Compound
  Interest; Ratio & Proportion; Averages & Alligation; Time, Speed &
  Distance; Time & Work; Mixtures
- Algebra: Linear Equations; Quadratic Equations; Inequalities; Functions &
  Graphs; Logarithms; Progressions (AP/GP/HP); Surds & Indices; Maxima &
  Minima
- Geometry: Triangles; Circles; Quadrilaterals & Polygons; Coordinate
  Geometry; Mensuration (2D & 3D); Trigonometry
- Number System: Divisibility & Remainders; HCF & LCM; Factors & Factorials;
  Base Systems; Cyclicity & Unit Digits
- Modern Math: Permutations & Combinations; Probability; Set Theory & Venn
  Diagrams

**DILR**
- DI: Tables; Bar & Line Graphs; Pie Charts; Caselets; Mixed/Multi-source DI;
  Data Sufficiency
- LR: Arrangements (Linear & Circular); Grouping & Distribution; Blood
  Relations; Puzzles & Matrix; Games & Tournaments; Cubes & Dice; Venn-based
  LR; Networks & Routes; Quant-based LR

**VARC**
- RC: RC — Inference; RC — Main Idea; RC — Tone & Attitude; RC — Vocabulary
  in Context; RC — Structure & Function
- VA: Para Jumbles; Para Summary; Odd Sentence Out; Para Completion; Critical
  Reasoning

### Entities

```ts
// Chapters are seeded, not user-created, but user can add custom ones.
interface Chapter {
  id: string;
  sectionId: 'VARC' | 'DILR' | 'QA';
  topicGroup: string;         // 'Arithmetic', 'RC', etc.
  name: string;
  status: 'not-started' | 'learning' | 'practicing' | 'revising' | 'strong';
  confidence: 1 | 2 | 3 | 4 | 5;   // self-rated, updated freely
  lastStudiedAt: number | null;
  lastRevisedAt: number | null;
  targetRevisitAt: number | null;   // computed by spaced repetition
  notes: string;                    // markdown
  isCustom: boolean;
  orderIndex: number;
}

interface Mock {
  id: string;
  name: string;                     // 'IMS SimCAT 07'
  provider: string;                 // free text, autocompleted from history
  type: 'full-mock' | 'sectional' | 'topic-test';
  takenAt: number;
  // Per-section results. For sectionals, only one entry.
  sections: MockSection[];
  overallPercentile: number | null;
  notes: string;                    // markdown — post-mortem
  analysedAt: number | null;        // null = analysis pending. Surface this.
}

interface MockSection {
  sectionId: 'VARC' | 'DILR' | 'QA';
  attempted: number;
  correct: number;
  incorrect: number;
  timeSpentMin: number;
  score: number;                    // computed, but store it
  percentile: number | null;
  // Derived at read time: accuracy, netScore, attemptsPerMin
}

// The most important entity in the app.
interface Mistake {
  id: string;
  chapterId: string;
  sourceType: 'mock' | 'sectional' | 'practice' | 'module' | 'other';
  sourceId: string | null;          // FK to Mock if applicable
  sourceLabel: string;              // 'SimCAT 07 Q14' — free text
  createdAt: number;

  // The taxonomy. This is what drives improvement.
  errorType:
    | 'conceptual-gap'        // didn't know the concept
    | 'application-error'     // knew concept, applied wrong
    | 'calculation-slip'      // arithmetic mistake
    | 'misread-question'      // solved the wrong problem
    | 'silly-mistake'         // marked wrong option, etc.
    | 'time-pressure'         // rushed, would've got it with time
    | 'guessed-wrong'         // took a low-probability gamble
    | 'unattempted-should-have'  // skipped a doable question
    | 'unattempted-correctly';   // skipped correctly — log to reinforce

  questionText: string;             // markdown + LaTeX
  questionImage: string | null;     // base64 data URL, compress before store
  myApproach: string;               // what I did
  correctApproach: string;          // what I should have done
  keyTakeaway: string;              // one line. Force brevity.
  timeSpentSec: number | null;

  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];                   // freeform, autocompleted

  // Revision loop
  revisionCount: number;
  lastRevisedAt: number | null;
  nextRevisionAt: number | null;
  isResolved: boolean;              // marked when re-solved correctly twice
}

interface Formula {
  id: string;
  chapterId: string;
  title: string;
  latex: string;                    // rendered with KaTeX
  plainText: string;                // fallback + searchable
  description: string;
  whenToUse: string;                // trigger conditions — the useful part
  commonTrap: string;               // where people go wrong with it
  isSeeded: boolean;                // distinguish built-in from user-added
  isStarred: boolean;
  createdAt: number;
}

interface StudySession {
  id: string;
  chapterId: string | null;
  sectionId: 'VARC' | 'DILR' | 'QA' | null;
  startedAt: number;
  durationMin: number;
  questionsAttempted: number | null;
  questionsCorrect: number | null;
  activity: 'learning' | 'practice' | 'revision' | 'mock-analysis';
  notes: string;
}

interface DailyLog {
  date: string;                     // 'YYYY-MM-DD', primary key
  totalMinutes: number;             // derived from sessions
  sectionsTouched: string[];
  mood: 1 | 2 | 3 | 4 | 5 | null;
  reflection: string;
}

interface Goal {
  id: string;
  type: 'target-percentile' | 'weekly-hours' | 'mocks-per-week'
      | 'chapter-completion' | 'custom';
  label: string;
  targetValue: number;
  currentValue: number;             // derived where possible
  deadline: number | null;
  isActive: boolean;
}
```

## Dexie Schema

```ts
db.version(1).stores({
  chapters: 'id, sectionId, topicGroup, status, confidence, targetRevisitAt',
  mocks: 'id, takenAt, type, provider, analysedAt',
  mistakes: 'id, chapterId, errorType, createdAt, nextRevisionAt, isResolved, *tags',
  formulas: 'id, chapterId, isStarred',
  sessions: 'id, chapterId, sectionId, startedAt, activity',
  dailyLogs: 'date',
  goals: 'id, isActive',
  meta: 'key'   // for lastExportAt, seedVersion, settings
});
```

Note the `*tags` multi-entry index — tag filtering must be fast.

## Screens

### 1. Dashboard (`/`)

The default landing view. Must answer "what do I do today?" in one glance.

- **Countdown to CAT** — days remaining, prominent but not anxiety-inducing.
- **Today's snapshot** — minutes studied, sections touched, mistakes logged.
- **Due for revision** — chapters past `targetRevisitAt` and mistakes past
  `nextRevisionAt`, as an actionable list with one-click "revise now".
- **Percentile trend** — line chart of last 10 mocks, overall + 3 sections.
- **Weakest chapters** — bottom 5 by a composite of confidence, mistake
  density, and time since last revision.
- **Unanalysed mocks** — loud warning if any mock has `analysedAt === null`
  older than 24h. Taking mocks without analysis is the #1 prep failure mode.
- **Error type breakdown** — donut of last 30 days' mistakes by `errorType`.
  This is the highest-signal chart in the app.

### 2. Mocks (`/mocks`)

- Sortable, filterable table of all mocks.
- **Add Mock** form: name, provider (autocomplete), type, date, then a
  three-column grid for VARC/DILR/QA — attempted, correct, incorrect, time.
  Auto-compute score as `(correct × 3) − (incorrect × 1)` and show it live
  as the user types. Auto-compute accuracy. Percentile fields optional.
- **Mock detail view** (`/mocks/:id`): full breakdown, section comparison
  bars, all mistakes logged against this mock, and a post-mortem notes field
  with a prompt template ("What went well / What cost me marks / One change
  for next mock").
- **Comparison view**: select 2+ mocks, overlay their metrics.
- Show a `Needs Analysis` badge until `analysedAt` is set.

### 3. Sections (`/sections/:sectionId`)

- Section-level stats: average score, accuracy trend, attempt rate.
- Chapters grouped by `topicGroup`, each as a card showing: status, a
  confidence pill (click to change, no modal), mistake count, formula count,
  last studied, and a "due for revision" flag.
- Filter by status and confidence. Sort by weakness.
- Progress bar per topic group.

### 4. Chapter Detail (`/chapters/:id`)

Tabbed. This is where the user spends most time.

- **Overview** — status, confidence, notes (markdown editor), study history
  from sessions, accuracy over time if practice data exists.
- **Formulas** — list of formula cards. Each shows the KaTeX-rendered
  formula, when-to-use, and common-trap. Add/edit inline. Star toggling.
- **Mistakes** — all mistakes for this chapter, filterable by error type,
  sorted by most recent or most-revised.
- **Revision** — spaced-repetition queue for this chapter's mistakes.

### 5. Mistake Log (`/mistakes`)

The global cross-chapter view.

- **Quick add** — floating button and `Ctrl/Cmd + M` shortcut, available from
  every screen. Modal with the minimum fields: chapter, error type,
  question (text or image paste), key takeaway. Everything else optional and
  collapsed behind "Add detail". Support pasting an image directly from
  clipboard — this is how the user will capture questions fastest.
- Filter by: section, chapter, error type, difficulty, tag, date range,
  resolved status.
- **Analytics panel**: error type distribution overall and per section,
  most-frequent chapters, trend of mistakes-per-mock over time. Call out
  when a specific error type is >30% of mistakes in a section — that's a
  targeted fix.
- List/grid toggle. Grid mode for image-heavy browsing.

### 6. Revision Queue (`/revise`)

Flashcard-style. Pulls mistakes where `nextRevisionAt <= now`.

- Show question only. User attempts on paper. Reveal approach on click.
- Three buttons: **Got it** / **Partial** / **Still wrong**.
- Scheduling (modified SM-2, simplified):
  - Got it → interval × 2.5, min 3 days
  - Partial → interval × 1.2, min 2 days
  - Still wrong → reset to 1 day, increment a `lapses` counter
  - Two consecutive "Got it" → `isResolved = true`, drop from queue
- Show queue size and estimated time.

### 7. Formula Bank (`/formulas`)

- All formulas across chapters, searchable by title, plainText, and chapter.
- Filter by section, chapter, starred.
- **Print/PDF view** — a clean, dense, print-stylesheet layout of starred
  formulas. The user will want a physical revision sheet before the exam.
- Seed with ~60–80 high-value CAT formulas across QA chapters. Prioritise
  Arithmetic, Algebra, Geometry, Number System. Include the `whenToUse` and
  `commonTrap` fields for each — a formula list without those is just a
  textbook index.

### 8. Analytics (`/analytics`)

- Percentile and score trends, all mocks, filterable by date and provider.
- Section-wise accuracy vs. attempt-rate scatter — the classic CAT tradeoff.
- Error type trend over time (stacked area). The goal is watching
  `conceptual-gap` shrink and `time-pressure` become the dominant type — that
  progression means the prep is working.
- Study hours: heatmap calendar, hours by section, hours vs. score
  correlation.
- Chapter mastery matrix — confidence on one axis, mistake density on the
  other, four quadrants with plain-language labels.

### 9. Settings (`/settings`)

- Exam date (default: last Sunday of November 2026, editable).
- **Export all data as JSON** — one button, downloads a timestamped file.
- **Import from JSON** — with a merge-or-replace choice and a confirmation
  showing record counts before committing.
- Re-seed formulas / chapters (additive, never destructive).
- Danger zone: clear all data, double-confirm.

## Implementation Order

Build in this sequence. Each step must be working and usable before moving on.

1. Vite + React + TS + Tailwind + Router scaffold. Dexie schema. Seed script
   for chapters. App shell with sidebar nav.
2. Chapter list + chapter detail (overview tab only). Status and confidence
   editing. This alone is useful.
3. Mock entry form and mock list. Score auto-calculation.
4. Mistake quick-add modal with global shortcut + mistake list with filters.
   **This is the core feature — get it fast and frictionless.**
5. Formula CRUD with KaTeX rendering. Formula seed data.
6. Export/import JSON. Do not defer this.
7. Dashboard with the widgets listed above.
8. Revision queue with spaced repetition.
9. Analytics screen.
10. Study session logging + daily log.
11. Print stylesheet for formula sheet.
12. Goals.

## Code Conventions

- `src/db/` — Dexie setup, schema, seed data, migration helpers.
- `src/features/<feature>/` — colocate components, hooks, and logic per
  feature (mocks, mistakes, chapters, formulas, analytics).
- `src/components/ui/` — shared primitives (Button, Card, Modal, Select,
  Input, Tabs, Badge, EmptyState). Keep them dumb.
- `src/lib/` — pure functions: scoring, spaced repetition, derived stats,
  date helpers. **All logic here must be pure and unit-tested with Vitest.**
  No React, no Dexie imports in this folder.
- Reads go through `useLiveQuery`. Writes go through named functions in
  `src/db/mutations.ts` — never call `db.table.put()` from a component.
- Derived values (accuracy, net score, mastery scores) are computed at read
  time in `src/lib/`, not stored — except `MockSection.score`, which is
  stored for query performance.
- Strict TypeScript. No `any`. Discriminated unions for entity variants.

## UI/UX Requirements

- Dark mode default, light mode toggle. The user studies at night.
- Every list needs a designed empty state that tells the user what to do,
  not a blank panel.
- Destructive actions confirm. Everything else saves optimistically.
- Global shortcuts: `Cmd/Ctrl+M` new mistake, `Cmd/Ctrl+K` command palette,
  `Cmd/Ctrl+E` export, `/` focus search, `Esc` close modal.
- Section colour coding, consistent everywhere: VARC one hue, DILR another,
  QA a third. Pick an accessible palette and put it in Tailwind config.
- Mobile-responsive but desktop-first. Mistake logging must work on mobile —
  that's when the user photographs a question from a book.
- No loading spinners for local reads. IndexedDB is fast; render immediately.

## Deployment

The app may be deployed to a free static host (GitHub Pages or Vercel) in the
near future. This is compatible with the local-first design — it ships only
static assets; all data stays in the user's browser (IndexedDB). No backend,
no environment secrets, no server. Implications to keep in mind while building:

- **SPA routing must survive a hard refresh on a deep link.** On Vercel, add a
  catch-all rewrite to `index.html`. On GitHub Pages (no rewrites), either use
  `HashRouter` or ship a `404.html` fallback. Prefer keeping `BrowserRouter`
  and handling the host quirk at deploy time; don't let the choice leak into
  app code.
- **Base path.** GitHub Pages project sites serve from `/<repo>/`. If used, set
  Vite `base` accordingly and use Router `basename`. Vercel serves from `/`.
- Keep the bundle self-contained and offline-capable; a PWA manifest is fine
  (see Non-Goals — native is not).

## Explicit Non-Goals

- No user accounts, no multi-user, no sharing.
- No question bank or practice engine. This tracks prep, it doesn't replace
  study material.
- No AI/LLM features in v1.
- No mobile app. PWA manifest is acceptable, native is not.
- No cloud sync in v1. Export/import covers backup.

## Definition of Done for v1

The user can, without touching a spreadsheet: log a mock in under 60 seconds,
log a mistake in under 30 seconds, see which chapters need revision today,
see which error type is costing the most marks, browse a personal formula
sheet, and export everything to a file they control.