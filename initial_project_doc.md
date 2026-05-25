# SERVUS

> Supporting Everyday Routines, Valuables & Upkeep Smoothly
>
> A personal home management system for two people. Bavarian at heart.

## What This Is

A private, self-hosted home inventory system. Starts with tracking items in
the household; grows into a full household assistant (recipes, pantry, shopping
list) over time. Built to last years with minimal maintenance.

**Users:** Two household members plus occasional guests.
**Not:** A product. Not multi-tenant. Not commercialized.

## Current Phase

Phase 1 — Foundation. Target: sturdy base to build all features on top of.

## Architecture

### Stack
- **Backend:** TypeScript + Hono, running on Cloudflare Pages Functions
- **Database:** Cloudflare D1 (SQLite-compatible, accessed via D1 binding)
- **Frontend:** Vue 3 + TypeScript + Vite SPA. Compiled to `web/app/dist/`
  and served by Cloudflare Pages. `vite-plugin-pwa` for service worker and
  PWA manifest. `idb` for IndexedDB access. `vue-i18n` for all user-visible
  strings. Pinia for state management. Tailwind CSS v4. Biome for linting
  and formatting across the whole repo.
- **Image storage:** Cloudflare R2 (Phase 3). Database stores only the key;
  R2 stores the bytes. Zero egress fees.
- **Hosting:** Cloudflare Pages. Single GitHub push deploys both the Vue SPA
  (static) and the Hono API (Pages Functions) to `servus.valor.codes`.
  Auto-deploy on merge to main. No Docker, no custom deploy step.

### Module Layout
- `functions/api/[[route]].ts` — Hono catch-all; entry point for all
  `/api/*` requests; assembles the app from module routers
- `src/auth/` — login, sessions, admin bootstrap (store + handler)
- `src/inventory/` — items, locations (store + handler)
- `src/boxes/` — boxes, item-to-box assignment, QR codes (store + handler)
- `src/middleware/` — session validation, error handling
- `web/app/` — Vue 3 + TypeScript SPA source
  - `src/api/` — fetch wrappers, one file per backend module
  - `src/stores/` — Pinia stores
  - `src/composables/` — reusable logic (prefixed `use`)
  - `src/locales/` — i18n locale files (`de.json`, …)
  - `src/views/` — page-level components (one per route)
  - `src/components/` — shared/reusable components
- `web/app/dist/` — compiled SPA output (gitignored; served by Cloudflare Pages)
- `migrations/` — numbered SQL files, forward-only, applied via Wrangler
- `openspec/` — specs and proposals (see Process below)
- `tests/e2e/` — Playwright browser tests for critical journeys
- `wrangler.toml` — Cloudflare configuration (D1 binding, R2 binding, routes)

### Key Behaviors
- D1 migrations run automatically as part of the Pages build/deploy step
- Sessions are server-side records in D1, set via `HttpOnly; Secure;
  SameSite=Strict` cookies
- Passwords hashed with bcryptjs (pure-JS bcrypt, compatible with Workers)
- Every mutable record carries: `version`, `updated_at`, `updated_by`,
  `deleted`, `deleted_at`, `deleted_by` for future sync support
- Structured logging via `console.error` / `console.log` with JSON shape
  (goes to Cloudflare Logs)
- Frontend served by Cloudflare Pages CDN; all non-API, non-asset routes
  return `index.html` (SPA fallback configured via `_redirects`)
- Offline mutations queued in IndexedDB, flushed to the API on reconnect;
  server is source of truth, last-write-wins for conflicts
- API and frontend share the same origin (`servus.valor.codes`) — no CORS

## Roadmap

### Phase 1 — Foundation (~2 weeks)
TypeScript + Hono + Vue SPA wired end to end and live on Cloudflare. No
product features, but the full foundation is in place. Delivered in two proposals:

**Proposal 1 — Walking Skeleton:**
- Hono app, module structure, D1 migrations runner, health endpoint
- Vue 3 + Vite + TypeScript + Biome wired; `npm run build` output deployed
  to Cloudflare Pages
- SPA fallback via `_redirects`; API under `/api/v1/`
- `servus.valor.codes` live via Cloudflare Pages + existing Cloudflare account
- GitHub Actions CI pipeline (typecheck, Biome, Vitest, Playwright)

**Proposal 2 — PWA + Offline Infrastructure:**
- `vite-plugin-pwa`: service worker registered, app shell cached, PWA manifest
- IndexedDB initialized with versioned schema (migratable)
- Offline API client: queues mutations when offline, flushes on reconnect

### Phase 2 — Move Essentials (scope TBD, ~4–5 weeks)
Features required to actually conduct the move. Exact scope to be decided
once Phase 1 ships and the move timeline is clearer.

**Candidates:** single admin auth, inventory items + locations, boxes + QR
codes, basic search, nightly D1 backup to R2.

### Phase 3 — Move Nice-to-Haves (scope TBD, ~2–3 weeks)
Features that improve the experience but are not blocking for the move.

**Candidates:** photos via R2 (one per item), CSV import/export, UX polish,
full offline write UX (visible queue indicator, conflict feedback).
**Stop coding after this phase.** Inventory the house, use it in real life
before the move.

### Phase 4 — Post-Move (no pressure)
Helper accounts, multiple photos, tags, prices, brute-force protection,
PWA install prompt polish, recipes module, pantry module, shopping list,
maintenance tracker, document vault.

## Process

### How We Work
1. Human writes prose describing what they want to build
2. Claude Code runs OpenSpec `/propose` to generate a spec proposal
3. Human reviews the spec carefully and pushes back on anything wrong
4. Claude Code runs OpenSpec `/apply`:
   - Creates a feature branch
   - Writes failing tests first (TDD)
   - Writes minimal code to pass
   - Refactors
   - Opens a PR
5. CI runs all checks
6. Human spot-checks the PR (description, spec delta, security-adjacent
   files, new npm dependencies)
7. If CI is green and spot check passes, human merges
8. Cloudflare Pages auto-deploys; post-deploy smoke test verifies it works
9. OpenSpec `/archive` merges the spec delta into the canonical spec library

### Working Mode
- **One proposal per PR.** No multi-feature branches.
- **Squash merge to main.** Linear history.
- **Branch protection on main:** require PR, require all CI checks to pass,
  no force push, no direct commits.
- **Human reviews specs; CI verifies correctness.** Code is not reviewed
  line-by-line.

### What Human Always Reviews
- The PR description
- The OpenSpec spec delta (in `openspec/changes/.../delta.md`)
- Any file under `src/auth/`
- Any migration file
- Any change to `package.json` or `web/app/package.json` (new dependencies)
- Any code touching cookies, file uploads, file paths, or D1 raw queries
- `wrangler.toml` changes

### What CI Always Enforces
- `cd web/app && npm ci && npm run build` succeeds
- `biome check` clean (whole repo — backend + frontend)
- `npm run typecheck` clean (tsc --noEmit across all TypeScript)
- Vitest passes (backend unit tests via vitest-pool-workers)
- `cd web/app && npm run test` passes (frontend unit tests)
- Playwright E2E tests pass (PRs to main only)
- `gitleaks` finds no secrets
- GitHub dependency review passes
- D1 migrations apply cleanly against a fresh local D1 instance
- OpenSpec proposals validate

### Deployment
- Merge to main → Cloudflare Pages auto-deploys (connected to GitHub)
- Build command runs D1 migrations then builds the Vue SPA
- Post-deploy smoke test hits production endpoints
- Smoke test failure → GitHub issue auto-created (email via GitHub notifications)
- Rollback: re-deploy previous Pages deployment via Cloudflare dashboard

### Coding Conventions
See `openspec/conventions.md` for the full style guide. Highlights:
- Hono for routing; handlers stay thin, business logic in store/service layer
- D1 queries via raw SQL in `src/<module>/store.ts` — no ORM
- All API routes under `/api/v1/`; return JSON, never HTML
- Strict TypeScript everywhere (`"strict": true`), `unknown` over `any`
- Biome enforces formatting and linting for the entire repo
- Frontend source in `web/app/`; Vue components use `<script setup>`
- Tests: Vitest for logic, Playwright for critical E2E journeys

### Spec Structure
`openspec/specs/` holds the canonical behavior of the system, organized by
capability:
- `auth/` — login, sessions, admin bootstrap
- `inventory/` — items, locations, soft delete
- `boxes/` — CRUD, item assignment, QR codes
- `infra/` — migrations, logging, backup, deployment

`openspec/changes/` holds in-flight proposals. Each is a folder with
`proposal.md`, `design.md`, `tasks.md`, `delta.md`.

## Getting Started (for fresh Claude Code sessions)
1. Read this file
2. Read `openspec/conventions.md`
3. Read recent archived proposals in `openspec/specs/` to understand current behaviour
4. If asked to build something new, run `/propose` first
