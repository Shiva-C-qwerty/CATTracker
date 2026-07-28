# Implementation Progress — CAT Prep Tracker

A phased checklist tracking build progress. Check items off (`[x]`) as they are
completed and verified. Each phase must be working and usable before moving on
(see CLAUDE.md → Implementation Order). Keep this file in sync with reality.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done & verified

---

## Phase 0 — Project setup & tooling

- [x] Vite + React + TypeScript scaffold (strict mode on)
- [x] Tailwind CSS configured, with section colour palette (VARC/DILR/QA) in config
- [x] React Router v6 wired with `BrowserRouter`
- [x] Path alias `@/` → `src/`
- [x] Vitest configured; `test` / single-test scripts in `package.json`
- [x] ESLint configured (Prettier deferred — ESLint + editor covers formatting for now)
- [x] `git init`, `.gitignore`, initial commit
- [x] App shell: sidebar nav, dark-mode default + light toggle, routes stubbed
- [x] Update CLAUDE.md Commands section to match real `package.json`
- [~] Base folder structure: `src/lib`, `src/components/layout` created; `src/db`,
  `src/features`, `src/components/ui` added as their phases begin

## Phase 1 — Persistence layer

- [x] Dexie DB setup with the v1 schema from CLAUDE.md
- [x] Entity TypeScript interfaces (added `Mistake.lapses` for the SM-2 loop)
- [x] Chapter seed data (full QA/DILR/VARC list, 55 chapters) + `seedVersion` in `meta`
- [x] Seed-on-first-run logic (idempotent, additive, never destructive)
- [x] `src/db/mutations.ts` — chapter writes via named functions (more added per phase)
- [x] `useLiveQuery` reads — wired and driving the Sections/Chapter screens

## Phase 2 — Chapters (first useful feature)

- [x] Sections view (`/sections/:sectionId`): chapters grouped by `topicGroup`, section tabs, per-group progress bar
- [x] Confidence pill (inline 5-dot, no modal) + status editing (pill + select)
- [x] Chapter detail (`/chapters/:id`) — Overview tab: notes (markdown textarea, autosave), status, confidence, study meta
- [x] Filter by status + confidence, sort by weakness (pure `weaknessScore`, unit-tested)
- [x] Empty states designed (filter no-match)
- Note: notes stored as markdown text; rendered preview deferred (no md dep added). Chapter detail Formulas/Mistakes/Revision tabs are disabled stubs pointing at their phases.

## Phase 3 — Mocks

- [x] Add/Edit Mock form: VARC/DILR/QA grid; live per-section + total score & accuracy; provider autocomplete; sectional/topic-test show a single section picker
- [x] Mock list: sortable (date/score/name) + filterable (type/provider) table; `Needs analysis` badge
- [x] Mock detail (`/mocks/:id`): totals, per-section breakdown, Recharts section bars, analyse toggle, delete (confirm), autosave post-mortem with template
- [x] Comparison view (`/mocks/compare?ids=`): grouped section-score bars + metric table
- [x] Scoring logic in `src/lib/scoring.ts` (pure) + 10 Vitest tests
- Note: mistakes-from-this-mock list renders but stays empty until Phase 4. Bundle crossed 500 kB (Recharts) — code-split chart routes as a later optimization.

## Phase 4 — Mistake Log (CORE FEATURE — make it frictionless)

- [x] Quick-add modal: chapter, error-type button grid, question, key takeaway; rest behind "Add detail"; Save & add another; ⌘/Ctrl+Enter to save
- [x] Global shortcut `Ctrl/Cmd+M` + floating + button from every screen (QuickAddProvider)
- [x] Clipboard image paste → canvas-compressed JPEG data URL (also file attach)
- [x] Mistake list (`/mistakes`) with all filters (section/chapter/type/difficulty/tag/date/resolved)
- [x] Analytics panel: error-type distribution bars, frequent chapters, >30% dominant-type callout (pure `mistakeStats`, unit-tested)
- [x] List/grid toggle (grid shows image thumbnails)
- [~] < 30s logging — flow built; awaiting your real-use confirmation
- Note: mistakes get an initial `nextRevisionAt = +1 day` so they enter the Phase 8 queue. Full mistake editing (beyond resolve/delete) deferred; card has expand for approaches.

## Phase 5 — Formulas

- [x] Formula CRUD via modal editor with live KaTeX preview; star toggle; safe render fallback for bad LaTeX
- [x] Chapter detail → Formulas tab (also enabled Mistakes tab now that Phase 4 is done)
- [x] Formula Bank (`/formulas`): search (title/plain/chapter) + section/chapter/starred filters, grouped by chapter
- [x] Seeded ~60 high-value QA formulas across all 5 topic groups (each with `whenToUse` + `commonTrap`); additive-by-id seeding, SEED_VERSION=2
- Note: print/PDF sheet of starred formulas is Phase 11 (not yet).

## Phase 6 — Export / Import (do not defer)

- [x] Export all data → timestamped JSON download (`cat-tracker-backup-<ts>.json`)
- [x] Import from JSON: merge-or-replace choice + per-table record-count confirmation modal; single transaction (failure leaves DB untouched)
- [x] `Ctrl/Cmd+E` export shortcut (global)
- [x] 7-day export reminder banner (via `lastExportAt` in `meta`, `useExportReminder`)
- [x] Pure `parseBackup`/`countTables` validator + 6 Vitest tests
- Also landed early (Phase 13 overlap): Settings page with editable exam date, additive re-seed, danger-zone clear-all (double-confirm).

## Phase 7 — Dashboard

- [x] Countdown to CAT (from meta.examDate)
- [x] Today's snapshot (mistakes logged + sections touched today)
- [x] Due-for-revision list (chapters past targetRevisitAt + mistakes past nextRevisionAt) with link to /revise
- [x] Percentile trend line chart, last 10 mocks, overall + 3 sections (Recharts)
- [x] Weakest chapters (composite `weaknessScore` incl. mistake density)
- [x] Unanalysed-mocks warning (>24h, loud rose banner)
- [x] Error-type breakdown donut (last 30 days)
- [x] Pure `dashboard` helpers + 6 Vitest tests
- Note: "minutes studied today" awaits Phase 10 (study sessions); snapshot shows mistakes/sections for now.

## Phase 8 — Revision Queue

- [x] `/revise` flashcard flow; question-only → reveal
- [x] Got it / Partial / Still wrong buttons
- [x] Modified SM-2 scheduling in `src/lib/revision.ts` (pure) + Vitest tests
- [x] Two-consecutive-"Got it" → `isResolved`, drop from queue
- [x] Queue size + estimated time
- Added optional `Mistake.intervalDays` / `reviewStreak` fields (default for old records).

## Phase 9 — Analytics

- [x] Score & percentile trends (dual-axis line)
- [x] Accuracy vs attempt-rate scatter (per section)
- [x] Error-type trend over time (stacked area, 8-week buckets)
- [x] Study hours by section + 8-week study calendar heatmap
- [x] Chapter mastery matrix (confidence × mistake density, quadrant labels)
- [x] Pure `analytics` helpers + Vitest tests

## Phase 10 — Study sessions & daily log

- [x] Study session logging (modal from dashboard + chapter overview) via transaction
- [x] Daily log (mood + reflection, autosave); `totalMinutes` derived from sessions
- [x] Chapter study history list + `lastStudiedAt` updates; "min studied today" on dashboard

## Phase 11 — Formula print sheet

- [x] `/formulas/print` standalone (no shell) dense print stylesheet of starred formulas + Print button

## Phase 12 — Goals

- [x] Goal CRUD in Settings; derived `currentValue` (percentile/weekly-hours/mocks/chapters) via pure `goals` lib + tests
- [x] Active goals surfaced on dashboard with live progress

## Phase 13 — Settings & polish

- [x] Settings (`/settings`): editable exam date, re-seed, danger zone (double-confirm) — done earlier
- [x] Command palette `Ctrl/Cmd+K` + `/` (nav + actions); `Esc` closes; modals close on Esc
- [x] Mobile-responsive shell (off-canvas drawer + top bar); quick-add works on mobile
- [x] `navigator.storage.persist()` requested on startup (anti-eviction)
- [~] A11y: section palette is colour-coded but form `<label>`s aren't yet tied to inputs via `htmlFor` — minor, follow-up.
- Deferred minor items: markdown *rendering* for notes, per-section mock percentiles input, hours-vs-score correlation chart.

## Phase 14 — Deployment (Vercel)

- [x] Host chosen: Vercel (serves from `/`, no base-path needed)
- [x] SPA deep-link fallback: `vercel.json` rewrite `/(.*) → /index.html` (verified via prod preview + real browser)
- [x] n/a — no Vite `base`/basename needed (root-served)
- [x] PWA manifest + on-brand SVG icon (`public/manifest.webmanifest`, `public/icon.svg`), linked in `index.html`
- [x] Prod build verified: deep-link renders, manifest/icon 200, no page errors
- [ ] **User action:** push repo + connect to Vercel (or `npx vercel`) — deploy done from user's own git account
- [ ] Optional later: service worker (offline first-load / installable caching) via vite-plugin-pwa — needs a dependency, ask first
