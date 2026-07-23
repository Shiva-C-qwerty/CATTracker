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

- [ ] Dexie DB setup with the v1 schema from CLAUDE.md
- [ ] Entity TypeScript interfaces (discriminated unions where specified)
- [ ] Chapter seed data (full QA/DILR/VARC list) + `seedVersion` in `meta`
- [ ] Seed-on-first-run logic (idempotent, additive, never destructive)
- [ ] `src/db/mutations.ts` — all writes go through named functions
- [ ] `useLiveQuery` reads confirmed working

## Phase 2 — Chapters (first useful feature)

- [ ] Sections view (`/sections/:sectionId`): chapters grouped by `topicGroup`
- [ ] Confidence pill (inline change, no modal) + status editing
- [ ] Chapter detail (`/chapters/:id`) — Overview tab: notes (markdown), status, confidence
- [ ] Filter by status/confidence, sort by weakness
- [ ] Empty states designed

## Phase 3 — Mocks

- [ ] Add Mock form: 3-column VARC/DILR/QA grid; live score + accuracy calc
- [ ] Mock list: sortable/filterable table; `Needs Analysis` badge
- [ ] Mock detail (`/mocks/:id`): breakdown, section bars, post-mortem template
- [ ] Comparison view (overlay 2+ mocks)
- [ ] Scoring logic in `src/lib/` (pure) + Vitest tests

## Phase 4 — Mistake Log (CORE FEATURE — make it frictionless)

- [ ] Quick-add modal: chapter, error type, question, key takeaway; rest collapsed
- [ ] Global shortcut `Ctrl/Cmd+M` from every screen
- [ ] Clipboard image paste → compressed base64
- [ ] Mistake list (`/mistakes`) with all filters (section/chapter/type/difficulty/tag/date/resolved)
- [ ] Analytics panel: error-type distribution, frequent chapters, >30% callouts
- [ ] List/grid toggle
- [ ] < 30s logging verified end-to-end

## Phase 5 — Formulas

- [ ] Formula CRUD with inline add/edit; KaTeX rendering; star toggle
- [ ] Chapter detail → Formulas tab
- [ ] Formula Bank (`/formulas`): search + filters
- [ ] Seed ~60–80 high-value QA formulas (with `whenToUse` + `commonTrap`)

## Phase 6 — Export / Import (do not defer)

- [ ] Export all data → timestamped JSON download
- [ ] Import from JSON: merge-or-replace choice + record-count confirmation
- [ ] `Ctrl/Cmd+E` export shortcut
- [ ] 7-day export reminder (via `lastExportAt` in `meta`)

## Phase 7 — Dashboard

- [ ] Countdown to CAT
- [ ] Today's snapshot
- [ ] Due-for-revision list (chapters + mistakes) with one-click revise
- [ ] Percentile trend chart (Recharts)
- [ ] Weakest chapters (composite score)
- [ ] Unanalysed-mocks warning (>24h)
- [ ] Error-type breakdown donut (last 30 days)

## Phase 8 — Revision Queue

- [ ] `/revise` flashcard flow; question-only → reveal
- [ ] Got it / Partial / Still wrong buttons
- [ ] Modified SM-2 scheduling in `src/lib/` (pure) + Vitest tests
- [ ] Two-consecutive-"Got it" → `isResolved`, drop from queue
- [ ] Queue size + estimated time

## Phase 9 — Analytics

- [ ] Percentile/score trends (filter by date/provider)
- [ ] Accuracy vs attempt-rate scatter
- [ ] Error-type trend over time (stacked area)
- [ ] Study hours heatmap + hours-vs-score correlation
- [ ] Chapter mastery matrix (4 quadrants)

## Phase 10 — Study sessions & daily log

- [ ] Study session logging
- [ ] Daily log (mood, reflection); `totalMinutes` derived
- [ ] Chapter study history + `lastStudiedAt` updates

## Phase 11 — Formula print sheet

- [ ] Print/PDF stylesheet: dense layout of starred formulas

## Phase 12 — Goals

- [ ] Goal CRUD; derived `currentValue` where possible
- [ ] Surface active goals on dashboard

## Phase 13 — Settings & polish

- [ ] Settings (`/settings`): editable exam date, re-seed, danger zone (double-confirm)
- [ ] Global shortcuts: `Ctrl/Cmd+K` command palette, `/` focus search, `Esc` close
- [ ] Mobile-responsive pass (mistake logging works on mobile)
- [ ] Accessibility pass on section colour palette

## Phase 14 — Deployment

- [ ] Choose host (GitHub Pages or Vercel)
- [ ] SPA deep-link fallback (rewrite / 404.html / HashRouter as needed)
- [ ] Vite `base` + Router `basename` if project-site subpath
- [ ] Optional PWA manifest for offline install
- [ ] Verify offline load + IndexedDB persistence on the deployed URL
