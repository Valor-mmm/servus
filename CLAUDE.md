# CLAUDE.md — Servus

## Read These First (Every Session)

1. `initial_project_doc.md` — architecture, stack, roadmap, process
2. `decision_reason_for_initial_project_doc.md` — why each decision was made
3. `openspec/conventions.md` — full coding style guide (TypeScript + Hono + Vue + testing + i18n)
4. Recent specs in `openspec/specs/` — current behaviour of the system

## Stack at a Glance

- **Backend:** TypeScript + Hono, on Cloudflare Pages Functions
- **Database:** Cloudflare D1 (SQLite-compatible), accessed via `env.DB` binding.
  No ORM — raw SQL in `src/<module>/store.ts`.
- **Frontend:** Vue 3 + TypeScript + Vite + Pinia + Tailwind v4 + vue-i18n,
  compiled to `web/app/dist/`, served by Cloudflare Pages
- **Images:** Cloudflare R2 (Phase 3)
- **All API routes:** `/api/v1/` — return JSON only, never HTML
- **Error responses:** `{ "code": "SCREAMING_SNAKE_CASE" }` + HTTP status.
  Backend never returns human-readable messages — frontend maps via vue-i18n.
- **i18n:** Every user-visible string goes through `t()`. No hardcoded strings
  in templates. Locale files in `web/app/src/locales/de.json`.
- **Linting/formatting:** Biome (covers entire repo — backend + frontend)
- **Testing:** Vitest with `@cloudflare/vitest-pool-workers` (backend, real D1)
  + Vitest (frontend pure logic) + Playwright E2E (critical journeys)
- **Database migrations:** Numbered SQL files in `migrations/`, applied via
  `wrangler d1 migrations apply`
- **Hosting:** Cloudflare Pages, auto-deploy on push to main, `servus.valor.codes`

## Process Rules (Non-Negotiable)

- **Never build a feature without a proposal.** Run `/propose` first, get it
  reviewed, then run `/apply`.
- **TDD always.** Write failing tests before writing implementation code.
- **One proposal per branch, one branch per PR.**
- **Squash merge to main only.** No direct commits, no force pushes.

## What the Human Always Reviews

The human does not review code line-by-line. They review:
- The OpenSpec spec delta (`openspec/changes/.../delta.md`)
- The PR description
- Any file under `src/auth/`
- Any migration file in `migrations/`
- Any `package.json` or `web/app/package.json` change (new dependency)
- Any code touching cookies, file uploads, file paths, or raw D1 queries
- Any `wrangler.toml` change

Do not sneak dependencies in. Flag them explicitly in the proposal.

## Commands

```bash
# Local development (full stack — Hono + Vue via Wrangler)
npm install
npx wrangler pages dev                  # serves both API and SPA at localhost:8788

# Frontend (standalone Vite dev server)
cd web/app && npm install
cd web/app && npm run dev               # Vite dev server at localhost:5173
cd web/app && npm run build             # production build → web/app/dist/

# Type checking
npm run typecheck                       # tsc --noEmit (backend)
cd web/app && npm run typecheck         # tsc --noEmit (frontend)

# Linting & formatting (whole repo from root)
biome check                             # check
biome check --write                     # autofix

# Database migrations
npx wrangler d1 migrations apply servus-db --local     # local D1
npx wrangler d1 migrations apply servus-db             # production (careful)

# Testing
npm run test                            # Vitest backend (vitest-pool-workers)
cd web/app && npm run test              # Vitest frontend
npm run test:e2e                        # Playwright E2E
```

## What CI Enforces

- `npm run typecheck` clean (backend TypeScript)
- `cd web/app && npm run typecheck` clean (frontend TypeScript)
- `biome check` clean (entire repo)
- `cd web/app && npm ci && npm run build` succeeds
- Vitest backend passes (via vitest-pool-workers)
- `cd web/app && npm run test` passes
- Playwright E2E passes (PRs to main only)
- `gitleaks` finds no secrets
- GitHub dependency review passes
- D1 migrations apply cleanly against a fresh local D1 instance
- OpenSpec proposals validate

## Current Phase

Phase 1 — Foundation. No features exist yet. The next step is to run
`/propose` with a description of the walking skeleton.
