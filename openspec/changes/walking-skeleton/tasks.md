## 1. Repo Scaffolding

- [x] 1.1 Initialize git repository; create `.gitignore` (node_modules, dist, worker-configuration.d.ts, .wrangler/, .env)
- [x] 1.2 Create root `package.json` with backend dependencies: `hono`, and devDependencies: `wrangler`, `typescript`, `@cloudflare/workers-types`, `@cloudflare/vitest-pool-workers`, `vitest`, `@biomejs/biome`, `@playwright/test`
- [x] 1.3 Create root `tsconfig.json` targeting the Workers runtime (`lib: ["ESNext"]`, `types: ["@cloudflare/workers-types"]`, covers `src/` and `functions/`)
- [x] 1.4 Create `biome.json` at repo root covering `src/`, `functions/`, and `web/app/src/` (formatter + linter, strict TypeScript rules)
- [x] 1.5 Create `wrangler.toml` with Pages config: `pages_build_output_dir = "web/app/dist"`, D1 binding (`DB` → `servus-db`), R2 binding placeholder (`ASSETS` → `servus-assets`)

## 2. First Migration

- [x] 2.1 Write failing Vitest test: running `wrangler d1 migrations apply servus-db --local` against a fresh D1 exits with code 0 and reports the migration applied
- [x] 2.2 Create `migrations/0001_init.sql` — enables WAL mode and foreign key enforcement; establishes baseline (make the test pass)
- [x] 2.3 Run `npm run test` and confirm migration sanity test is green

## 3. Health Endpoint (TDD)

- [x] 3.1 Write failing Vitest test (vitest-pool-workers): `GET /api/v1/health` returns HTTP 200 with body `{ "status": "ok" }`
- [x] 3.2 Write failing Vitest test: health handler executes `SELECT 1` against the D1 binding before responding (D1 reachability check)
- [x] 3.3 Create `src/health/handler.ts` — Hono router with `GET /health` that runs `SELECT 1` on `env.DB` then returns `{ status: 'ok' }`
- [x] 3.4 Create `functions/api/[[route]].ts` — Hono app mounting the health router at `/api/v1`; export `onRequest = app.fetch`
- [x] 3.5 Run `wrangler types` to generate `worker-configuration.d.ts` (defines `Env` type from `wrangler.toml`); add file to `.gitignore`
- [x] 3.6 Run `npm run test` and confirm all health tests are green

## 4. Vue SPA Skeleton

- [x] 4.1 Scaffold `web/app/` with Vue 3 + TypeScript + Vite (`npm create vue@latest` or manual); create `web/app/package.json` with: `vue`, `vue-router`, `pinia`, `vue-i18n`; devDependencies: `vite`, `@vitejs/plugin-vue`, `@tailwindcss/vite`, `typescript`, `@vue/tsconfig`
- [x] 4.2 Create `web/app/tsconfig.json` extending `@vue/tsconfig/dom.json` (browser environment, strict mode)
- [x] 4.3 Configure Tailwind v4: add `@tailwindcss/vite` plugin to `vite.config.ts`; import `tailwindcss` in `main.css`
- [x] 4.4 Wire vue-i18n: create `web/app/src/locales/de.json` with `{ "app": { "name": "Servus" } }`; create `web/app/src/i18n.ts` and install in `main.ts`
- [x] 4.5 Wire vue-router: create `web/app/src/router/index.ts` with one route (`/` → `HomeView`); install in `main.ts`
- [x] 4.6 Wire Pinia: `createPinia()` installed in `main.ts`; no stores yet
- [x] 4.7 Create `web/app/src/views/HomeView.vue` (single `<script setup>`, renders `{{ t('app.name') }}`)
- [x] 4.8 Run `cd web/app && npm run build`; verify `web/app/dist/` is populated with no errors

## 5. SPA Routing and 404 Handling

- [x] 5.1 Write failing Playwright test: `GET /` returns 200 HTML and the DOM contains `<div id="app">`
- [x] 5.2 Write failing Playwright test: `GET /inventory/nonexistent` returns 200 (SPA fallback, not 404)
- [x] 5.3 Write failing Playwright test: `GET /api/v1/nonexistent` returns 404 with `Content-Type: application/json` and body `{ "code": "NOT_FOUND" }`
- [x] 5.4 Create `web/app/public/_redirects` with the SPA fallback rule (`/* /index.html 200`, API pass-through first)
- [x] 5.5 Add `app.notFound()` handler in `functions/api/[[route]].ts` returning `{ code: 'NOT_FOUND' }` with HTTP 404
- [x] 5.6 Run `npx wrangler pages dev` locally and confirm all three Playwright tests pass

## 6. CI Pipeline

- [x] 6.1 Create `.github/workflows/ci.yml` with parallel jobs: `typecheck` (backend + frontend), `lint` (biome check), `build` (web/app), `test-backend` (vitest-pool-workers), `test-frontend` (vitest in web/app), `e2e` (wrangler pages dev + Playwright, PRs to main only), `secrets` (gitleaks), `deps` (dependency review, PRs to main only), `migrations` (apply to fresh local D1)
- [x] 6.2 Add `playwright install --with-deps` with browser cache step to the `e2e` CI job
- [ ] 6.3 Open a draft PR; verify all CI jobs pass before proceeding to deploy steps

## 7. Cloudflare Pages Deploy ⚠️ Manual Steps

- [ ] 7.1 **[HUMAN]** Create a Cloudflare D1 database named `servus-db` in the Cloudflare dashboard; paste the assigned `database_id` into `wrangler.toml`
- [ ] 7.2 **[HUMAN]** Create a Cloudflare Pages project connected to the GitHub repo; set build command to `npx wrangler d1 migrations apply servus-db && cd web/app && npm ci && npm run build`; set build output to `web/app/dist`
- [ ] 7.3 **[HUMAN]** Add `servus.valor.codes` as a custom domain in the Cloudflare Pages project settings (CNAME record auto-created within the existing Cloudflare account)
- [ ] 7.4 **[HUMAN]** Create a scoped Cloudflare API token (Pages deploy + D1 write permissions only); add as `CLOUDFLARE_API_TOKEN` secret in GitHub repository settings
- [ ] 7.5 Merge the PR to main; verify Cloudflare Pages auto-deploy succeeds
- [ ] 7.6 Hit `https://servus.valor.codes/api/v1/health` and confirm `{ "status": "ok" }` — walking skeleton is live
