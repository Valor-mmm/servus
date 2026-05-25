## Why

The project has no code yet. Before any product feature can be built, there
must be a working foundation: TypeScript + Hono + Vue wired together, deployed
live, and guarded by CI. This proposal establishes that foundation so every
subsequent proposal can build on it without reinventing the plumbing.

## What Changes

- **Root package.json + tsconfig.json** — backend dependencies (Hono, Wrangler,
  Vitest, Biome) and TypeScript config for the Cloudflare Workers runtime
- **`wrangler.toml`** ⚠️ — Cloudflare Pages configuration: D1 binding, R2
  binding placeholder, Pages Functions directory, build output directory
- **`biome.json`** — single root Biome config covering `src/`, `functions/`,
  and `web/app/src/`
- **`functions/api/[[route]].ts`** — Hono catch-all entry point; one route:
  `GET /api/v1/health → 200 { "status": "ok" }`
- **`src/`** — module skeleton with one example of the store/handler pattern
  (no real domain logic; establishes the directory and file conventions)
- **`migrations/0001_init.sql`** ⚠️ — creates the `schema_migrations` table;
  the only migration shipped in this proposal
- **`web/app/`** — Vue 3 SPA skeleton: TypeScript strict, Vite, Tailwind v4,
  vue-i18n (de.json with one key), vue-router (one route `/`), Pinia (no stores
  yet). HomeView displays `t('app.name')`. No real UI beyond a mounted app shell.
- **`web/app/public/_redirects`** — SPA fallback rule: all non-API, non-asset
  routes return index.html
- **GitHub Actions CI** — runs on every PR and push to main: typecheck (backend
  + frontend), Biome, `npm run build`, Vitest backend, Vitest frontend,
  Playwright E2E smoke test, gitleaks, dependency review, migration sanity check
- **Cloudflare Pages project** — connected to the GitHub repo, auto-deploys
  main to `servus.valor.codes`

## Capabilities

### New Capabilities

- `infra-foundation`: Project build, CI pipeline, Cloudflare Pages deploy,
  SPA routing (fallback), Hono module structure, D1 migration runner.
  Covers the rules every future proposal builds on: route namespace, error
  response shape, migration conventions.
- `health`: `GET /api/v1/health` — liveness probe used by the smoke test and
  monitoring. Returns `200 { "status": "ok" }` when the Worker and D1 binding
  are reachable.

### Modified Capabilities

_(none — this is the first proposal)_

## Impact

**New npm dependencies (all require human approval):**

Root `package.json`:
- `hono` — Hono web framework (Workers-native)
- `wrangler` (dev) — Cloudflare CLI for local dev and migrations
- `@cloudflare/workers-types` (dev) — TypeScript types for the Workers runtime
- `@cloudflare/vitest-pool-workers` (dev) — runs Vitest inside the Workers runtime
- `vitest` (dev) — test runner
- `typescript` (dev) — TypeScript compiler
- `@biomejs/biome` (dev) — linting and formatting

`web/app/package.json`:
- `vue` — Vue 3
- `vue-router` — client-side routing
- `pinia` — state management
- `vue-i18n` — i18n
- `vite` (dev) — build tool
- `@vitejs/plugin-vue` (dev) — Vite plugin for Vue SFC compilation
- `@tailwindcss/vite` (dev) — Tailwind CSS v4 Vite plugin
- `typescript` (dev) — TypeScript compiler
- `@vue/tsconfig` (dev) — Vue-specific TypeScript base config
- `playwright` / `@playwright/test` (dev, root) — E2E test runner

**Files requiring human review:**
- `wrangler.toml` — Cloudflare binding configuration
- `migrations/0001_init.sql` — first migration file

**No changes to:** auth, sessions, cookies, file uploads, R2.

## Non-goals

- No authentication or session handling
- No inventory, box, or any domain features
- No PWA, service worker, or offline infrastructure (Proposal 2)
- No R2 image storage
- No real UI beyond a mounted Vue app shell with a single placeholder view
- No admin bootstrap CLI command
