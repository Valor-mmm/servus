# CLAUDE.md — guidelines for Claude Code in this repo

This file is the contract you (Claude Code) operate under in this repository.
Read it at the start of every session. Re-read the relevant section before
acting on anything security-relevant or architectural.

## 1. What this project is

**servus** is a private home management system for two primary users (the owner
and his wife) plus a small number of short-lived invited helpers during an
imminent house move. Bavarian for "hello/goodbye".

The MVP must be production-usable in **1–2 weeks** so it can support the
upcoming move. Inventory + box/move workflow is the only scope for MVP. Future
capabilities (shopping list, recipes, fridge/pantry) are explicitly out of scope
for the first release.

## 2. Non-negotiable constraints

1. **Free forever.** Every piece of infrastructure must have a free tier we can
   stay on indefinitely. Never introduce a paid service.
2. **Low maintenance.** Avoid dependencies with frequent major version bumps.
   Prefer the Deno standard library and small, stable libs. If a dep has had 3+
   majors in the last 2 years, find an alternative.
3. **Public repo, private app.** All code lives in a public GitHub repo, but the
   running app is gated by our custom auth.
4. **Custom auth only.** No third-party auth providers (no Auth0, Clerk,
   Supabase Auth, etc.). We implement and maintain login, sessions,
   rate-limiting ourselves.
5. **OpenSpec is the source of truth for behavior.** No user-visible feature
   ships without a corresponding archived OpenSpec change.

## 3. Tech stack

| Layer        | Choice                      | Why                                                                 |
| ------------ | --------------------------- | ------------------------------------------------------------------- |
| Runtime      | Deno (latest stable)        | First-class TS, built-in fmt/lint/test, no node_modules churn.      |
| Framework    | Fresh 2                     | Fullstack, server-rendered islands, no separate API. Stable line.   |
| Database     | Deno KV                     | Native, free on Deno Deploy, atomic transactions, automatic backup. |
| Hosting      | Deno Deploy                 | Free tier (1M req/mo), zero-config edge deploy, native to KV.       |
| Domain       | servus.valor.codes          | Subdomain of an owned domain. No registrar cost.                    |
| Object store | Cloudflare R2 (post-MVP)    | 10GB free tier. Only added when image upload lands.                 |
| Tests        | Deno test + Playwright      | Built-in unit/integration; Playwright for end-to-end browser flows. |
| CI/CD        | GitHub Actions              | Free for public repos. Required-checks gate merges to main.         |
| Hashing      | Argon2id via well-known lib | Memory-hard password hashing. Pinned and minimal.                   |

If you ever consider adding a dependency outside this list, stop and justify it
in the PR description.

## 4. Architecture in one paragraph

Fresh 2 serves the whole app: routes are server-rendered, interactive bits are
islands. All business logic lives in `lib/` and is called from route handlers;
route files stay thin. Data is stored in Deno KV using a primary-key +
prefix-index pattern; mutations that touch more than one key use `kv.atomic()`.
Sessions are signed HTTP-only cookies with an opaque session ID looked up in KV.
There is no separate API service.

## 5. Repository layout (expected)

```
servus/
  CLAUDE.md                    ← this file
  README.md                    ← public-facing intro
  deno.json                    ← tasks, imports, lint/fmt config
  fresh.config.ts
  main.ts                      ← Fresh entrypoint
  dev.ts                       ← local dev entrypoint
  routes/                      ← Fresh routes (thin)
  islands/                     ← client-interactive components
  components/                  ← server-rendered components
  lib/
    auth/                      ← password hashing, sessions, rate-limit
    kv/                        ← typed wrappers around Deno KV
    inventory/                 ← item/category/room/box/group domain logic
    invites/                   ← invite code mint + consume
    photos/                    ← R2 presign helpers
    i18n/                      ← German locale + t() helper
  tests/
    unit/                      ← Deno test, fast, no network
    integration/               ← Deno test against a real KV instance
    e2e/                       ← Playwright specs
  docs/
    ROADMAP.md                 ← spec-driven roadmap, source of truth for sequencing
    decisions/                 ← short ADR-style notes when we make a non-obvious call
  openspec/                    ← OpenSpec proposals, specs, archive
  .github/workflows/           ← CI/CD pipelines
```

## 6. Development workflow

Every change follows the same loop. **Do not skip steps.**

1. **Propose** — Create an OpenSpec change using the `openspec-propose` skill.
   The proposal includes: motivation, scope, non-goals, spec deltas, design
   notes, and an ordered task list.
2. **Discuss** — Pause for the user to review the proposal. Specs are the
   artifact the user wants to discuss; implementation details are yours to
   decide unless they affect a spec.
3. **Apply** — Once the proposal is approved, use the `openspec-apply-change`
   skill. Tasks are executed top-to-bottom.
4. **TDD per task** — For each implementation task, write a failing test first,
   then make it pass. Unit and integration tests live in `tests/`. Commit the
   failing test and the fix in separate commits when it clarifies intent.
5. **E2E** — The last task of every change is a Playwright scenario that
   exercises the user-visible flow end-to-end. The change cannot be marked done
   until that scenario passes.
6. **Archive** — Use the `openspec-archive-change` skill to move the change into
   `openspec/changes/archive/` and update the canonical specs in
   `openspec/specs/`.

## 7. TDD rules

- **Red → green → refactor.** Never write production code without a failing test
  that justifies it.
- Unit tests must not touch the network or the real KV. Use
  `Deno.openKv(":memory:")` or an in-memory fake.
- Integration tests run against an ephemeral KV (per-test prefix or per-test
  in-memory instance).
- E2E tests use Playwright against a freshly started dev server with a seeded
  KV. Each E2E test resets its slice of state.
- If a bug is fixed, a regression test is added in the same PR.

## 8. Auth and security non-negotiables

- Passwords hashed with **Argon2id** (memory cost ≥ 64MB, time cost ≥ 3,
  parallelism = 1, salt ≥ 16 bytes from `crypto.getRandomValues`).
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Strict`, signed with
  HMAC-SHA256, server-side session lookup in KV with idle + absolute expiry.
- Login endpoint: **per-IP** rate limit (e.g. 5 attempts / 15 min) AND
  **per-username** lockout with exponential backoff. Always answer in constant
  time to avoid username enumeration.
- All state-changing endpoints require a CSRF token bound to the session.
- Invite codes: single-use, expire in 7 days by default, generated with
  `crypto.getRandomValues`, stored hashed.
- Never log passwords, session IDs, invite codes, or CSRF tokens.
- Security headers on every response: `Content-Security-Policy`,
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: same-origin`, `Permissions-Policy` minimal.

## 9. Dependency policy

Before adding any dependency, ask:

1. Can the Deno standard library do this? If yes, use it.
2. Has the lib had a major version bump in the last 6 months? If yes, document
   why we accept the churn.
3. Is the API surface small enough that we could vendor it in `lib/` if the lib
   were abandoned? If not, reconsider.

Forbidden by default (override only with explicit user OK):

- Anything that pulls a build step we don't control (heavy bundlers, CSS-in-JS
  runtimes).
- Auth libraries that abstract away the password/session flow — we own that code
  on purpose.
- ORM/query builders for KV. Use thin typed wrappers in `lib/kv/`.

## 10. CI/CD

GitHub Actions runs on every PR and on push to main. Three parallel jobs (all
required before merge):

1. **check** — `deno lint`, `deno fmt --check`, `deno check **/*.ts`
2. **test** — unit + integration: `deno test tests/unit tests/integration`
3. **e2e** — `deno task build`, Playwright install, `playwright test`

Pushes to main auto-deploy to Deno Deploy via the `deployctl` GitHub Action.

Branch protection on main: all checks required, linear history, no direct
pushes.

## 11. Internationalisation (i18n)

The app is in **German**. All user-visible copy must go through the `t()`
helper. No inline German (or English) strings in JSX/TSX components.

- `lib/i18n/locales/de.ts` — single source of truth for all German strings.
- `lib/i18n/t.ts` — `t(key, params?)` function; no external library.
- Variables, types, and function names stay in English — only the UI is German.
- If a new user-visible string is introduced, add the German translation to
  `de.ts` first, then use the key in the component. Never commit untranslated
  copy.
- When writing specs and scenarios, describe behavior, not specific string
  values. Specs are language-agnostic; the locale file is the contract for copy.

## 12. Dependency management with Renovate

Renovate Bot automatically opens PRs for dependency updates. Configuration is in
`renovate.json` at the repo root.

- **Patch/minor updates** — auto-merged when CI passes. No action needed.
- **Major updates** — labeled `major-update`, require manual review. Always
  check the changelog before merging. If the major upgrade brings high churn,
  consider pinning or replacing the dependency.
- **GitHub Actions** — Renovate also updates action versions. Treat the same
  way.
- Never merge a Renovate major-update PR without reading what changed.

## 13. Coding style

- Run `deno fmt` before every commit. Don't argue with the formatter.
- Names over comments. Only comment when the _why_ is non-obvious.
- No half-finished implementations. If you can't finish a task in this session,
  leave it as a failing test, not as a stub returning placeholder data.
- No defensive checks for things that can't happen. Trust internal invariants;
  validate at the network boundary.
- Type-driven design: define the domain types in `lib/<domain>/types.ts` first,
  then build the functions that operate on them.

## 14. Communication with the user

The user is the product owner and primary reviewer. They want to spend their
time on **specs**, not on implementation review.

- Run the OpenSpec proposal step explicitly so they can react.
- Don't ask for review on routine implementation choices — make the call,
  document it briefly in the PR or in `docs/decisions/`.
- Surface trade-offs that affect specs, security, or cost. Stay quiet on
  stylistic choices.
- The user often uses speech-to-text on a phone. Tolerate name variations
  ("Cloud Code" = Claude Code, "Dino KV" = Deno KV, etc.).

## 15. Useful commands

```bash
# Local dev
deno task dev

# Run unit + integration tests
deno task test

# Run Playwright E2E (boots dev server automatically)
deno task e2e

# Format and lint
deno task fmt
deno task lint

# OpenSpec workflow (via skills)
/openspec-propose
/openspec-apply-change
/openspec-archive-change
```

## 16. When in doubt

- Re-read this file.
- Read `docs/ROADMAP.md`.
- Read the relevant spec in `openspec/specs/`.
- Then ask the user — but only if the answer would change a spec.
