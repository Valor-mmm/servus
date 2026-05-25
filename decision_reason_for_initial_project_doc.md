# SERVUS — Decision Log

This document records the decisions made during initial planning, the alternatives
considered, and the reasoning behind each choice. It exists so that future-me (or
anyone joining the project) can understand *why* SERVUS is built the way it is.

For the current state of architecture and process, see `initial_project_doc.md`.

---

## Scope & Philosophy

### D-001: Build a household-only tool, not a product
**Choice:** SERVUS is for two people plus occasional guests. Not commercialized,
not multi-tenant, not enterprise-grade.
**Reasoning:** Lets us skip a lot of complexity — no payment, no onboarding flow,
no GDPR compliance theatre, no SSO. Security is "good enough for a public-facing
household tool," not "audit-ready."

### D-002: Modular monolith, not microservices
**Choice:** One Cloudflare Pages project with all API logic in Pages Functions.
Modules live in separate TypeScript directories with clean internal APIs. Could
be extracted later but probably never will be.
**Alternatives rejected:** True microservices (too much ops overhead for a free
household project), single-file script (no boundaries → fast rot).

### D-003: Move deadline drives Phase 2 scope
**Choice:** Phase 2 = move essentials (scope TBD). Phase 3 = move nice-to-haves.
Phase 4 = post-move and future modules (recipes, pantry, shopping).
**Reasoning:** Hard deadline tied to an upcoming household move, ~5 hours/week
available. Anything not needed for the move is deferred without guilt.

---

## Technology Stack

### D-004: TypeScript + Hono for the backend
**Choice:** TypeScript with Hono, running on Cloudflare Pages Functions.
**Alternatives rejected:**
- Go: excellent language for a long-lived binary, but free cloud hosting for
  persistent Go processes is essentially unavailable (Fly.io removed free tier,
  Koyeb acquired by Mistral AI and closed free plan to new users, Cloud Run
  free tier has cold starts that make a low-traffic household app feel slow).
  The initial plan used Go + Fly.io; both the language and hosting choice
  became untenable when evaluated against the zero-cost constraint.
- Node.js (standalone): same ecosystem churn concerns as before — heavy,
  frequent major updates, complex plugin matrices. Cloudflare Workers/Pages
  Functions sidestep this by fixing the runtime (V8 isolates); the npm
  packages are just dependencies, not the runtime.
- Deno: was a strong candidate (user already uses Deno Deploy). Rejected
  because Deno's minor-version breaking changes (e.g. 2.8 setTimeout change)
  add maintenance overhead. Cloudflare Workers' npm-based approach gets the
  same "TypeScript backend" benefit with full Dependabot support.
- Next.js / server-side React: ecosystem churn (18→19, react-router rewrites)
  was the original reason Vue was chosen over React. Applies equally here.
**Reasoning:** Cloudflare Workers requires a JS/TS runtime; there is no Go
or other compiled-language option on the Workers platform. TypeScript is
the natural choice — the user has deep TypeScript expertise, the frontend
is already TypeScript, and having one language across the stack eliminates
context switching. Hono is the leading framework for Cloudflare Workers:
minimal, fast, TypeScript-first, with excellent middleware and routing.
npm packages → full Dependabot support without needing Renovate.

### D-005: Vue 3 SPA on Cloudflare Pages
**Choice:** Vue 3 + TypeScript + Vite SPA. Compiled to `web/app/dist/`,
deployed to Cloudflare Pages. Vue handles all rendering; Hono Functions
serve a JSON API at `/api/v1/`. Both live on the same origin
(`servus.valor.codes`) — no CORS. `vite-plugin-pwa` for service worker
and PWA manifest. `idb` for IndexedDB access. `vue-i18n` for all
user-visible strings. Pinia for state management. Tailwind CSS v4.
**Original single-binary approach superseded:** The initial plan embedded
the Vue SPA into the Go binary via `embed.FS`. That approach is unnecessary
with Cloudflare Pages, which serves static assets natively from its CDN.
The spirit is preserved — a single GitHub push deploys both the SPA and
the API together. The execution is different but the operational simplicity
is the same.
**Alternatives rejected:**
- React + Vite: breaking changes across major versions (v17→18→19) and broad
  ecosystem churn (react-router, react-query, etc.) conflict with the
  low-maintenance requirement.
- Svelte 5 / SvelteKit: Svelte 4→5 runes rewrite (2024) is a recent major
  API break; too young to depend on for a tool built to last years.
- Next.js: server-side React; same churn concerns as React + adds framework
  complexity (App Router instability, server/client component mental model).
**Reasoning:** Vue 3 has been on minor version bumps (3.0→3.5) since 2020.
Core team maintains vue-router and pinia, avoiding third-party fragmentation.
`vite-plugin-pwa` is the best PWA library in the ecosystem.

### D-006: Cloudflare D1 for the database
**Choice:** Cloudflare D1 (SQLite-compatible). Tables prefixed by module:
`auth_users`, `inv_items`, `box_boxes`, etc. Migrations are numbered SQL
files applied via Wrangler.
**Alternatives rejected:**
- Local SQLite file (original plan): requires persistent disk storage, which
  free cloud hosting tiers do not offer. Works beautifully on a VPS but ties
  the project to paid hosting.
- Neon PostgreSQL: free tier (512MB), but PostgreSQL is a separate platform
  adding network latency between the Worker and the database. Rejected in
  favour of D1 because D1 runs in the same Cloudflare datacenter as the
  Worker — zero network hop.
- Supabase PostgreSQL: free tier projects pause after 1 week of inactivity,
  which is unacceptable for a household app that may not be used for days
  at a time.
**Reasoning:** D1 is SQLite under the hood. The SQL dialect is identical to
the original local-SQLite plan — migrations, schema, queries are all the
same. D1 is accessed via a Workers binding (`env.DB`), not a file path, but
the pattern is the same repository pattern as before. The free tier (5 GB
storage, 5 M row reads/day, 100 k row writes/day) is several orders of
magnitude more than a two-person household app will ever use.

### D-007: Cloudflare Pages as hosting platform
**Choice:** Cloudflare Pages for the Vue SPA + Pages Functions for the
Hono API. Custom domain `servus.valor.codes` via the user's existing
Cloudflare account. Auto-deploy on push to main.
**Alternatives evaluated:**
- Fly.io: removed free tier for new accounts (October 2024). Best DX
  among paid options at ~$4–5/month, but zero-cost is the constraint.
- Koyeb: was the leading free-tier candidate (always-on containers, no cold
  starts), but closed its free Starter plan to new users after being acquired
  by Mistral AI (2025).
- Oracle Cloud Always Free: genuinely free, always-on ARM VM with 200 GB
  block storage. Rejected because of signup friction (accounts sometimes
  rejected, ARM VM capacity constrained) and VPS ops overhead (~3–4 hrs
  setup, ongoing systemd/Caddy maintenance) which conflicts with the
  5 hrs/week constraint and move deadline.
- Render free tier: cold starts after 15 min of inactivity (~30 s wake-up).
  Unacceptable for a daily-use app, especially one intended to expand into
  a shopping tool used on-the-go.
- Google Cloud Run: cold starts for a low-traffic household app would be
  frequent (~1–2 s for Go, still noticeable). A household app checked
  several times a day would cold-start most of the time.
- Vercel serverless: would require abandoning the traditional HTTP server
  model in favour of isolated serverless function handlers, breaking
  the unified API structure.
**Reasoning:** Cloudflare Pages + Functions is the only platform that is
simultaneously zero-cost, always-on (V8 isolates, not containers — no cold
starts), and serves both static assets and API from the same origin. The
user already manages `valor.codes` via Cloudflare — adding `servus.valor.codes`
is a single DNS record with no propagation delay. Single GitHub push deploys
the whole stack. No Docker, no custom CI deploy steps.

### D-008: bcryptjs for password hashing
**Choice:** `bcryptjs` (pure JavaScript bcrypt implementation).
**Reasoning:** Cloudflare Workers runs a V8 isolate, not a full Node.js
environment. Native bindings (e.g. `@node-rs/argon2`) don't work. `bcryptjs`
is a pure-JS implementation that runs in any JS environment including Workers.
Argon2 would be preferable from a security standpoint, but there is no
Workers-compatible Argon2 implementation. bcryptjs is widely used and
thoroughly reviewed. Work factor tuned to keep D1 session lookup under
the 10 ms CPU budget.

### D-009: Session cookies, not JWT
**Choice:** Random session tokens stored in D1, transmitted via
`HttpOnly; Secure; SameSite=Strict` cookies.
**Reasoning:** Easier to invalidate server-side, no key management, smaller
attack surface. JWT is overkill for two users.

### D-010: Forward-only migrations, numbered SQL files
**Choice:** `migrations/0001_*.sql`, `0002_*.sql`, etc. Applied via
`wrangler d1 migrations apply`. Tracked in `schema_migrations` table.
Never edit a shipped migration; only add new ones.
**Reasoning:** Simplest viable model. No rollback complexity. Spec-driven
development means schema changes are deliberate. D1's SQL dialect is
compatible with the same numbered-file convention originally planned for
local SQLite.

### D-011: Soft delete from day one (tombstones)
**Choice:** Every mutable record has `deleted INTEGER DEFAULT 0`,
`deleted_at`, `deleted_by`.
**Reasoning:** Cheap to add now, expensive to retrofit. Pays off when the
offline sync infrastructure starts queuing and replaying mutations.

### D-012: Currency = EUR throughout (no multi-currency)
**Reasoning:** Household tool, single currency context. Schema reserves
`purchase_currency` field for future-proofing only.

### D-013: Single admin in Phase 2, full role system post-move
**Choice:** Phase 2 ships with a `create-admin` CLI command (or admin
bootstrap endpoint). No user management UI, no Helper role.
**Reasoning:** Roles add real complexity (per-field access control, expiry
checks, helper-during-offline behavior). Defer until after the move.

### D-014: Biome over ESLint + Prettier
**Choice:** Biome for all TypeScript linting and formatting — backend
(`src/`) and frontend (`web/app/src/`) via a single root Biome config.
**Alternatives rejected:**
- ESLint + Prettier: ESLint v8→v9 (flat config rewrite) broke most projects
  and required manual plugin migration. Maintaining eslint, prettier,
  @typescript-eslint, and eslint-plugin-vue in sync is ongoing overhead.
**Reasoning:** One package, one config, one `biome check` command covers
the entire repo. No plugin compatibility matrix. Consistent formatting
across backend and frontend TypeScript.

### D-015: Offline-first infrastructure in Phase 1
**Choice:** Service worker, IndexedDB schema, and the offline mutation queue
are set up in Phase 1, not deferred.
**Reasoning:** Building Phase 2 features assuming "network always available"
means every component has the wrong shape. Retrofitting offline into existing
components later means rewriting the entire data layer. Putting the plumbing
in Phase 1 means each Phase 2/3 feature naturally follows the offline-first
pattern at no extra cost per feature.

### D-016: vue-i18n for all user-visible strings from day one
**Choice:** Every user-visible string in the Vue app goes through `t()`
from vue-i18n. A single `de.json` locale file. No hardcoded strings.
**Reasoning:** Retrofitting i18n requires extracting every string from every
component — high effort, easy to miss. Adding it upfront costs ~30 minutes
of setup. Writing `t('nav.items')` is no harder than writing the string.

### D-017: Backend returns error codes only; frontend owns all user text
**Choice:** Hono error responses: `{ "code": "SCREAMING_SNAKE_CASE" }` +
HTTP status. Validation errors add `fields` map. No human-readable message.
**Reasoning:** Backend doesn't know the display language, UI context, or
screen space. Error codes are easier to assert in tests than string matching.
Adding a new error type requires one TypeScript constant and one i18n key.

### D-018: Last-write-wins for offline conflict resolution
**Choice:** When two offline edits conflict, the last sync wins. No CRDTs.
**Reasoning:** True conflicts are rare for a two-person household tool.
Manual correction on the rare occasion is acceptable. Simplicity wins.

### D-019: Spec-driven development with OpenSpec
**Choice:** OpenSpec for every feature. Specs reviewed by human; code mostly
not reviewed line-by-line.
**Reasoning:** At 5 hours/week, reading code line-by-line isn't feasible.
Specs are the human-AI contract. CI is the correctness gate.

### D-020: Strict TDD
**Choice:** Tests written before code, always.
**Reasoning:** TDD gives Claude Code unambiguous targets, which it handles
much better than open-ended "implement this feature."

### D-021: Cloudflare R2 for image storage (Phase 3)
**Choice:** Images stored in Cloudflare R2. Database stores only the object
key. Zero egress fees.
**Reasoning:** Images should never go in the database. R2's free tier
(10 GB storage, 1 M writes, 10 M reads per month, zero egress) is
comfortable for a household inventory (5,000 items × 500 KB/photo ≈ 2.5 GB).
On the same Cloudflare platform as everything else — no additional account,
no cross-provider auth complexity.

### D-022: Cloudflare platform single-vendor decision
**Choice:** Workers, Pages, D1, and R2 are all Cloudflare products.
**Risk acknowledged:** Concentration risk — if Cloudflare changes pricing or
terms, migration would touch every layer. Mitigations: (a) D1 is SQLite —
migrations are plain SQL files portable to any SQLite host; (b) the Hono
framework runs on Deno Deploy, Bun, Node.js, and Vercel with minimal changes;
(c) the Vue SPA is fully portable static output.
**Reasoning:** Single platform = single account, single dashboard, single
deploy target, no cross-provider auth. The user already has a Cloudflare
account for `valor.codes`. The free tiers are generous and the platform has
a strong backward-compatibility track record.

---

## Workflow & Process

### D-023: Maximum CI from Phase 1
**Choice:** typecheck, Biome, Vitest (backend + frontend), Playwright E2E,
gitleaks, dependency review, migration sanity — all required for merge from
day one.
**Reasoning:** CI is the safety net for not reading code. Better to invest
in it early than retrofit later.

### D-024: Cloudflare Pages auto-deploy with smoke test safety net
**Choice:** Merge to main → Cloudflare Pages auto-deploys. Post-deploy smoke
test hits production endpoints. On failure, creates a GitHub issue.
**Reasoning:** Fast iteration with a human-in-the-loop safety net. No manual
deploy step needed — Pages handles it natively from the GitHub integration.
Rollback is a single click in the Cloudflare Pages dashboard (re-deploy a
previous build).

### D-025: Playwright for E2E
**Choice:** Playwright browser test suite, run in CI against a locally-spun-up
Wrangler dev server.
**Reasoning:** Playwright's DX and SPA support are best-in-class. Role-based
selectors double as accessibility checks. Wrangler's local dev mode (`wrangler
pages dev`) provides a faithful local replica of the production environment
including D1 bindings.

---

## Explicitly Deferred

- Full offline write UX (queue indicator, conflict feedback) — Phase 3
- Multi-photo per item, structured tags, categories, purchase prices
- Invoice/manual PDF attachments
- Helper role, Member role, full RBAC
- Brute-force protection (rate limiting, progressive delay)
- Room → sublocation hierarchy (Tier 1 uses flat locations)
- Push notifications, barcode scanning
- Modules 2, 3, 4 (recipes, pantry, shopping)
- Self-hosting

---

## Open Questions (Decide When Reached)

- D1 backup strategy: nightly snapshot to R2 via a Cron Trigger? Decide in Phase 2.
- Password hashing CPU budget: verify bcryptjs work factor stays within the
  Workers 10 ms CPU-time limit under load. Tune in Phase 2 when auth is built.
- Phase 2 exact scope: which features are truly move-critical? Decide once
  Phase 1 is shipped and the move timeline is clearer.
- Move-day offline requirements: read-only sufficient, or do we need offline
  writes on moving day? Determines whether offline mutations belong in Phase 2
  or Phase 3.
- Photo storage path in R2: flat bucket or prefix by item ID? Decide in Phase 3.
