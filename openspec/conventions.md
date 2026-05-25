# SERVUS — Coding Conventions

This is the authoritative style guide. All proposals must conform to these
conventions. CI enforces what it can; human spec review catches the rest.

---

## TypeScript (backend + frontend)

### General
- Strict mode always on (`"strict": true` in `tsconfig.json`). No exceptions.
- Prefer `unknown` over `any`. If `any` is unavoidable, add a comment explaining why.
- No `// @ts-ignore` or `// @ts-expect-error` without a comment explaining the constraint.
- Errors propagate up to the handler layer — do not swallow. Use typed error
  objects or discriminated unions where the shape matters.

### Backend Package Structure (`src/`)
- `src/<module>/store.ts` — all D1 access for that module (repository pattern).
  Functions accept `env: Env` (Cloudflare bindings) and return typed results.
- `src/<module>/handler.ts` — Hono route handlers; one file per module.
  Handlers stay thin: validate → call store → return JSON.
- `src/middleware/` — shared Hono middleware (session validation, error handling).
- `functions/api/[[route]].ts` — entry point; assembles the Hono app from
  module routers. No business logic here.

### API
- All routes under `/api/v1/`. Handlers return JSON only, never HTML.
- HTTP status codes carry the broad meaning; the `code` field carries the
  specific error type.
- **Success response:** HTTP 2xx + JSON body (structure varies per endpoint).
- **Error response — domain error:**
  ```json
  { "code": "ITEM_NOT_FOUND" }
  ```
- **Error response — validation error:**
  ```json
  {
    "code": "VALIDATION_ERROR",
    "fields": { "name": "REQUIRED", "description": "TOO_LONG" }
  }
  ```
- Error codes are `SCREAMING_SNAKE_CASE`. Never return human-readable messages
  from the backend — the frontend owns all user-visible text via vue-i18n.

### Database (D1)
- D1 accessed via `env.DB` binding — raw SQL with `env.DB.prepare()`. No ORM.
- Migrations: numbered SQL files (`0001_*.sql`) in `migrations/`. Never edit
  a shipped migration. Applied via `wrangler d1 migrations apply`.
- Every mutable record carries: `version`, `updated_at`, `updated_by`,
  `deleted`, `deleted_at`, `deleted_by`.
- Soft delete only — never hard-delete mutable records.
- Tables prefixed by module: `auth_*`, `inv_*`, `box_*`.
- Foreign keys enforced via `PRAGMA foreign_keys = ON` in migrations.

### Testing (backend)
- Vitest with `@cloudflare/vitest-pool-workers` for tests that need D1 bindings.
  This runs tests inside the actual Workers runtime with a real local D1 instance.
- Table-driven tests where appropriate.
- Coverage threshold: ≥ 70% on all `src/` packages (enforced in CI).

---

## TypeScript / Vue (frontend)

### Vue Components
- All components use `<script setup>` (Composition API). No Options API.
- One component per file. Filename matches component name (`ItemCard.vue`).
- Props typed explicitly — no untyped prop definitions.
- Emit events typed via `defineEmits<{ … }>()`.

### Project Structure (`web/app/src/`)
- `api/` — thin fetch wrappers; one file per backend module (`items.ts`,
  `boxes.ts`). Handles auth headers, error parsing, and offline queuing.
- `stores/` — Pinia stores; one file per domain concept.
- `composables/` — reusable logic; prefix with `use` (`useOfflineQueue.ts`).
- `locales/` — i18n locale files (`de.json`; add others as needed).
- `components/` — shared/reusable components.
- `views/` — page-level components, one per route.

### State Management (Pinia)
- One store per domain concept, not one global store.
- Stores own the local data. Components read from stores, never fetch directly.
- The offline mutation queue lives in a dedicated store (`useQueueStore`).

### API Client Pattern
- Components never call `fetch` directly. All network calls go through `api/`.
- The API client checks online status; offline mutations are queued in IndexedDB
  via the queue store and flushed on reconnect.
- Errors are parsed into `{ code, fields? }` shape before reaching the store
  or component.

---

## i18n

- **Every user-visible string goes through `t()`** — no hardcoded strings in
  templates or composables.
- Locale files live in `web/app/src/locales/`. Start with `de.json`.
- Key naming: `<section>.<key>` (`nav.items`, `errors.ITEM_NOT_FOUND`).
- Error code mapping: `errors.<CODE>` → translated message.
- Validation field mapping: `errors.fields.<CODE>` → translated message.
- Adding a new backend error code requires a corresponding key in all locale
  files before the PR merges.

---

## CSS / Tailwind

- Tailwind CSS v4 utility-first. No custom CSS unless a utility genuinely
  cannot express the style.
- Mobile-first: base styles target mobile; use `sm:` / `md:` for larger
  breakpoints.
- No inline `style` attributes. Everything through Tailwind or, in rare
  cases, `<style scoped>`.
- Avoid arbitrary values (`w-[347px]`) — if you reach for one, reconsider
  the design.

---

## Testing

### Vitest — backend (Workers)
- `@cloudflare/vitest-pool-workers` — tests run inside the Workers runtime.
- Scope: store functions (D1 queries), middleware, handler logic.
- No mocking D1 — use the real local D1 simulation provided by the pool.

### Vitest — frontend unit
- Scope: composables, Pinia store actions, API client logic, offline queue —
  pure logic only.
- Do **not** write `@vue/test-utils` component tests — component behaviour is
  covered by Playwright E2E.
- Test files co-located: `useOfflineQueue.test.ts` next to `useOfflineQueue.ts`.

### Playwright (E2E)
- Critical user journeys only — not exhaustive.
- Tests live in `tests/e2e/`.
- Use role-based selectors (`getByRole`, `getByLabel`) over CSS selectors —
  keeps tests resilient and doubles as an a11y check.
- Run against a locally-spun-up Wrangler dev server (`wrangler pages dev`).
- Required: `playwright install --with-deps` in CI with browser cache.

---

## Linting & Formatting

- **Biome** handles all TypeScript linting and formatting for the entire repo —
  backend (`src/`, `functions/`) and frontend (`web/app/src/`) via a single
  root `biome.json`.
- Run `biome check --write` locally to autofix.
- CI runs `biome check` (fails on any violation).

---

## Git & PRs

- One OpenSpec proposal per branch, one branch per PR.
- Squash merge to main. Linear history.
- Commit messages in English (code is English; UI strings are German via i18n).
- No direct commits to main. No force pushes.
