# servus — pre-launch review (2026-06-03)

**Scope:** Full-app review before going live for the upcoming move. **Method:**
4 lens agents in parallel — Security+Architecture, Spec+Senior,
UX+UI+Personas+i18n, Observability+Ops+Edge cases. Code review + browser-driven
UX walkthrough + spec/archive cross-check. **Total findings:** ~138 across the
four lenses (with substantial cross-lens overlap — see "Cross-lens themes"
below; real unique issue count is ~80–90).

Detailed findings live in `findings/<lens>.md`. This document is the **triage
index** — read top-to-bottom to decide what to fix vs. defer.

---

## 1. Executive summary

- **Go-live confidence: not ready.** Three classes of issue block a safe launch:
  (a) any redeemed helper gets full admin access with no scoped UI, (b)
  operational blindness (no deploy gate, no monitoring, no backups, no global
  error handler, ad-hoc logging), (c) mobile UX breakage that makes the primary
  device unusable for the wife.
- The **single highest-impact bug** is the missing helper role: `routes/admin/*`
  is gated only by `requireAuth`, and `consumeInvite()` creates a regular user.
  A helper minted during the move can mint more invites, revoke owner's invites,
  delete every item. This contradicts the invites spec and CLAUDE.md §1.
- The **second-highest cluster** is operational: no GitHub Actions deploy job
  (README claims one), no uptime monitoring, `/healthz` is a static `ok`,
  `lib/log.ts` exists but is never imported, no global error middleware, no
  documented backup or rollback. Any prod incident during move week will be
  silent and unrecoverable.
- **Mobile is broken** at the primary viewport (375×812): item names truncate to
  3 characters because the inline quantity control eats the row; the bottom nav
  overflows and omits "Einladungen" entirely. The default `/items` page lies in
  its heading ("50 neueste Gegenstände (21)" with only 4 cards rendered).
- **Auth rate-limit drifted from spec on three axes**: IP threshold raised from
  10 → 30 to keep e2e green; counter increments on every attempt (locks out
  NAT'd legitimate users); returns HTTP 200 instead of 429. Per-username lockout
  — required by CLAUDE.md §8 — is missing entirely (`auth.locked_out` locale key
  exists with no caller). Brute-force protection is meaningfully weaker than the
  spec advertises.
- **Photo capture is fragile**: single-attempt fetches with no
  retry/timeout/AbortController; `visibilitychange:hidden` calls `cleanup()` so
  a phone call kills the camera session; refresh loses in-flight state with no
  recovery. Move-day capture in a basement with one bar of LTE will silently
  lose photos.
- **Dead code from "done" tasks**: `lib/log.ts` (task 8.2 of authentication),
  `lib/capture/stateMachine.ts` (replaced by ad-hoc island state, with drifted
  names), `lib/inventory/boxRepo.deleteBox` (task 6.2 of box-lifecycle),
  `aws4fetch` dependency (zero callers; SHA-256 hand-rolled in two duplicated
  files). CLAUDE.md §13 forbids this pattern.
- **Positive findings worth preserving**: Argon2id parameters meet the §8
  baseline; invite redemption race is correctly handled via versionstamp check;
  camera permission denial gracefully falls back to file input; login form is
  keyboard-accessible with visible focus states; no TODO/FIXME left in source.

---

## 2. Go-live blockers (consolidated, cross-lens)

These are the issues we recommend resolving — or explicitly accepting in writing
— before any production traffic. Each blocker may collapse multiple findings
from different lenses.

| #  | Blocker                                                                                                                                                                                               | Lenses    | Constituent findings                                                                                                                                                                                                |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | **Helper role does not exist** — redeemed helpers have full admin access including invite-mint/revoke                                                                                                 | sec, ux   | `admin-routes-have-no-admin-check`, `invite-redemption-creates-full-admin-user`, `persona-helper-blockers`                                                                                                          |
| 2  | **No "scan existing item into box" flow** — the core move-day MVP scenario does not exist; helpers can only create new items via camera                                                               | ux        | `box-detail-has-no-way-to-pack-existing-items`, `persona-helper-blockers`                                                                                                                                           |
| 3  | **No deploy gate** — README claims CI-gated auto-deploy, but no `deploy.yml` exists; either Deno Deploy's dashboard integration bypasses tests, or deploys are manual                                 | ops       | `no-deploy-workflow`                                                                                                                                                                                                |
| 4  | **No monitoring** — `/healthz` is a static `"ok"`; no uptime probe, no error-rate alert, no log search saved. Prod outages will be invisible until someone tries to use the app                       | ops       | `no-monitoring-configured`, `healthz-is-static-ok`                                                                                                                                                                  |
| 5  | **No backup story** — CLAUDE.md misleadingly claims "automatic backup" for KV; user-error data loss is unrecoverable                                                                                  | ops       | `no-backup-strategy-documented`                                                                                                                                                                                     |
| 6  | **Photo upload silently loses on flaky networks** — single-attempt fetches, no retry, no timeout; `visibilitychange:hidden` cleanup kills capture on phone calls                                      | ops, ux   | `photo-upload-no-retry`, `continuous-capture-refresh-loses-session`, `flaky-mobile-network-ui-stalls`, `capture-error-banner-not-dismissable-no-retry-cta`, `capture-activation-no-escape-while-permission-pending` |
| 7  | **Mobile primary device is broken** — item rows truncate names to ~3 chars; bottom nav overflows and omits Einladungen; tap targets below 44px                                                        | ux        | `mobile-item-row-truncates-name-to-three-chars`, `mobile-bottom-nav-overflows-and-omits-invites`, `mobile-tap-targets-below-44px`                                                                                   |
| 8  | **Invite redemption while logged in silently hijacks the session** — owner previewing their own QR loses admin access; no warning                                                                     | ux        | `invite-redemption-while-logged-in-hijacks-session-silently`                                                                                                                                                        |
| 9  | **Items list heading lies** — default `/items` shows "50 neueste Gegenstände (21)" with only 4 cards rendered; confidence-shattering as the post-login landing page                                   | ux        | `items-list-heading-misleading-when-recent-is-short`                                                                                                                                                                |
| 10 | **Operationally blind** — `lib/log.ts` never imported, no global error middleware, no client-side error reporting, `kv.atomic().commit()` results unchecked across `itemRepo`/`boxRepo`/`sessionRepo` | ops, spec | `log-module-never-used`, `no-global-error-handler`, `client-errors-go-nowhere`, `atomic-commit-result-not-checked`, `archive-add-authentication-log-redaction-unused`                                               |

**Strongly recommended (Major, ship if at all possible):**

- Destructive actions need confirmation
  (`rooms-categories-delete-without-confirmation`,
  `item-delete-button-no-confirmation`) — single-tap delete on mobile during a
  move is high-risk.
- Auth rate-limit drift (threshold 30 not 10, 200 not 429, counts successes) —
  security claim does not match code; see Cross-lens themes §1.
- Per-username lockout missing entirely (locale key defined, no implementation)
  — CLAUDE.md §8 violation.
- Session idle timeout never renews (`touchSession` defined but never called) —
  sessions silently die at 14 days regardless of activity.
- `photoKey` accepted from client unvalidated — possible path-traversal via `..`
  in presigned URL.
- No concurrent-edit protection on items/boxes — last-write-wins silently
  overwrites.
- Session expiry on POST returns bare 401 with no redirect-and-preserve-form
  path.
- Box label page has no Drucken/Zurück affordance — owner prints in batches.
- Item detail page hides quantity, value, box, photos — owner can't "see all
  info" without entering edit mode.

---

## 3. Severity table (sorted)

Counts per lens (after the spec lens withdrew one Critical on re-check):

| Lens                             | Blocker | Critical | Major  | Minor  | Nit    | Total   |
| -------------------------------- | ------- | -------- | ------ | ------ | ------ | ------- |
| Security + Architecture          | 0       | 1        | 5      | 8      | 4      | 18      |
| Spec compliance + Senior dev     | 0       | 0        | 17     | 23     | 9      | 49      |
| UX + UI + Personas + i18n        | 1       | 5        | 14     | 16     | 7      | 43      |
| Observability + Ops + Edge cases | 0       | 5        | 11     | 7      | 4      | 27      |
| **Total**                        | **1**   | **11**   | **47** | **54** | **24** | **137** |

For full per-finding entries, see the lens files:

- `findings/security-architecture.md`
- `findings/spec-senior.md`
- `findings/ux-ui-personas.md`
- `findings/ops-edge-cases.md`

### Blocker (1)

| ID                        | Lens | One-line                                                                                                                               |
| ------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `persona-helper-blockers` | ux   | Helpers get full admin UI; no scan-into-box flow; no onboarding; no recoverable identity — MVP unusable for the move's primary persona |

### Critical (11)

| ID                                                           | Lens | One-line                                                                             |
| ------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------ |
| `admin-routes-have-no-admin-check`                           | sec  | Any authenticated user (incl. helpers) can mint/revoke invites                       |
| `no-deploy-workflow`                                         | ops  | README promises CI-gated deploy; no `deploy.yml` exists                              |
| `no-monitoring-configured`                                   | ops  | No uptime probe, no error alert; prod outages invisible                              |
| `no-backup-strategy-documented`                              | ops  | CLAUDE.md "automatic backup" claim is misleading; user-error data loss unrecoverable |
| `photo-upload-no-retry`                                      | ops  | Single-attempt fetch + no AbortController loses photos on flaky networks             |
| `continuous-capture-refresh-loses-session`                   | ops  | `visibilitychange:hidden` cleanup kills camera on phone calls; no recovery           |
| `box-detail-has-no-way-to-pack-existing-items`               | ux   | Core MVP flow ("pack books into box B-006") does not exist                           |
| `invite-redemption-while-logged-in-hijacks-session-silently` | ux   | Owner previewing QR loses admin access; no warning                                   |
| `invite-redemption-creates-full-admin-user`                  | ux   | Same root cause as `admin-routes-have-no-admin-check` from UX angle                  |
| `mobile-bottom-nav-overflows-and-omits-invites`              | ux   | Bottom nav overflows 375px and has no path to /admin/invites                         |
| `mobile-item-row-truncates-name-to-three-chars`              | ux   | Inline quantity control eats the row; item names show as "(uN…"                      |
| `persona-wife-confusion-points` (composite)                  | ux   | Wife persona hits ≥7 distinct confusing/silent-failure states                        |

### Major (47)

**Auth / security (8):**

- `login-ip-rate-limit-too-loose-for-spec` /
  `auth-ip-rate-limit-threshold-drift` — threshold raised 10 → 30 to keep e2e
  green (sec, spec)
- `login-lockout-not-429` / `auth-rate-limit-returns-200-not-429` /
  `archive-add-authentication-429-not-emitted` — wrong HTTP status on lockout
  (sec, spec ×2)
- `auth-ip-rate-limit-counts-successes` — counter never resets on success; NAT'd
  users locked out (spec)
- `session-idle-timeout-never-renews` / `auth-lastseen-touch-never-called` —
  `touchSession` unused; sessions die at 14d (sec, spec)
- `photo-key-trusted-from-client` — `photoKey` accepted unvalidated; `..`
  survives URL normalization (sec)
- `duplicated-sigv4-and-pure-js-sha256` /
  `photos-sha256-duplicated-across-files` / `photos-aws4fetch-dead-dependency` /
  `senior-dependency-violations` — pure-JS SHA-256 + SigV4 duplicated across 2
  files; aws4fetch dep unused (sec, spec ×3)
- `i18n-auth-locked-out-defined-but-no-per-username-lockout` — locale key for
  per-user lockout exists, but no implementation; §8 violation (ux)

**Observability / ops (7):**

- `log-module-never-used` / `archive-add-authentication-log-redaction-unused` —
  `lib/log.ts` defined, never imported (ops, spec)
- `no-global-error-handler` — Fresh default 500s; no aggregated logs (ops)
- `atomic-commit-result-not-checked` — `kv.atomic().commit()` results ignored
  across `itemRepo`/`boxRepo`/`sessionRepo` (ops)
- `client-errors-go-nowhere` — `console.error` only; no client telemetry (ops)
- `no-audit-log` — destructive actions leave no trace (ops)
- `no-rollback-plan` — no documented revert path (ops)
- `free-tier-limits-not-instrumented` — first signal of quota exhaustion is a
  prod outage (ops)

**Edge cases (3):**

- `no-concurrent-edit-protection` / `item-update-missing-version-check` —
  items/boxes lack versionstamp check; last-write-wins (ops, sec)
- `session-expiry-eats-form-submission` — POST to expired session returns bare
  401, form lost (ops)
- `r2-5xx-handling-partial` — no HEAD-after-PUT, orphan items possible (ops)
- `flaky-mobile-network-ui-stalls` — no fetch timeout; UI hangs on bad network
  (ops)

**UX (9):**

- `items-list-heading-misleading-when-recent-is-short` — heading lies about
  quantity (ux)
- `items-thumbnails-are-full-size-images` — 640×640 images for 40×40 slots;
  bandwidth burn (ux)
- `item-detail-omits-quantity-value-box-and-photos` — detail page missing core
  attributes (ux)
- `item-delete-button-no-confirmation` /
  `rooms-categories-delete-without-confirmation` — single-tap destructive POST
  (ux)
- `capture-activation-no-escape-while-permission-pending` — no in-app abort
  during permission prompt (ux)
- `capture-error-banner-not-dismissable-no-retry-cta` — capture errors have no
  retry or dismiss (ux)
- `invite-mint-page-has-no-copy-button` — long URL inside `<code>` is hard to
  select on mobile (ux)
- `invite-invalid-page-is-dead-end` — no nav, no CTA on expired/consumed invite
  (ux)
- `box-label-page-has-no-navigation-or-print-cta` — owner prints in batches with
  no Drucken button (ux)
- `mobile-tap-targets-below-44px` — quantity buttons 29px, theme toggle 36px
  (ux)
- `i18n-app-init-has-inline-german` — `static/app-init.js` hard-codes German;
  §11 violation (ux)
- `dev-capture-test-route-is-reachable-and-untranslated` — `/dev/capture-test`
  reachable in prod by any helper (ux + dev-route-exposed-in-production sec)
- `persona-owner-friction-points` (composite) — owner walkthrough hits 6
  friction points (ux)

**Spec / senior dev (12):**

- `boxes-deleteBox-no-tombstone` /
  `archive-box-lifecycle-deleteBox-cleanup-not-done` — dead-but-wrong-shape
  `deleteBox` still exported (spec ×2)
- `capture-stateMachine-dead-code` /
  `archive-add-continuous-capture-CaptureSurface-not-a-decider` — reducer +
  selector unused; island reimplements with drifted state names (spec ×2)
- `lazy-thumbnails-only-applied-on-items-list` — `/items/pending` and box detail
  bypass deferred loading (spec)
- `inventory-itemRepo-coerceQuantity-from-string-fails` — silent coercion to 1
  on non-number input (spec)
- `senior-dead-code-summary` — eight dead exports listed (spec)
- `senior-error-swallow-summary` — every category/room error maps to
  "duplicate"/"in use" (spec)

### Minor (54)

Most live in the per-lens files. Highest-leverage Minors:

- `item-update-missing-version-check` — see Major above (sec)
- `session-cookie-no-expires-attribute` — UX-only logout on browser restart
  (sec)
- `csrf-skipped-on-public-mutations` — `/invite/[code]` POST can be cross-site
  triggered (sec)
- `dev-route-exposed-in-production` — see UX
  `dev-capture-test-route-is-reachable-and-untranslated` (sec)
- `csp-style-src-unsafe-inline` / `csp-html-buffering-defeats-streaming` (sec)
- `inventory-category-error-swallows-real-failures` — KV outage rendered as
  "duplicate" (spec)
- `inventory-category-blank-name-not-validated` — relies on HTML `required` only
  (spec)
- `items-empty-state-conflates-no-data-with-no-results` — wife reads "no items"
  as data loss (ux)
- `quantity-decrement-at-1-is-silent-no-op` — disabled button missing; reads as
  "broken" (ux)
- `i18n-orphan-keys-29-defined-but-unused` — locale keys defined for unbuilt
  confirmations, status badges, error pages (ux)
- `i18n-no-singular-plural-handling` — "1 Gegenstände" today (ux)
- `items-thumbnail-presign-expires-after-15-min` — false-positive error banners
  when user returns after 15 min (ux)
- `invite-back-navigation-after-redemption-reposts` — back-button → consent page
  → dead-end (ux)
- `session-key-rotation-undocumented` (ops)
- `env-var-startup-validation-partial` — missing R2 vars surface only on first
  upload (ops)
- `static-asset-cache-headers-default` — `_fresh/` hashed assets re-validated on
  every load (ops)
- `timezone-server-rendered-dates` — items captured near midnight appear under
  wrong day (ops)
- `no-uncaught-exception-handler` — unhandled rejections crash isolate with no
  context (ops)
- `no-local-storage-fallback-quota-handling` — private-mode Safari throws;
  app-init crashes (ops)
- `app-init-js-string-html-injection-risk` — CSP blocks the banner's inline
  onclick (ops)

### Nit (24)

Includes positive findings: `argon2id-params-meet-baseline`,
`a11y-login-keyboard-and-focus-ok`, `a11y-items-new-form-labels-ok`,
`senior-no-TODO-FIXME-in-source`, `invite-redemption-race-handled`,
`camera-permission-denial-handled`. Worth preserving as the baseline.

---

## 4. Cross-lens themes

When the same root issue surfaced from multiple lenses, it likely warrants a
single bundled fix (or proposal) rather than separate ones.

1. **Auth rate-limit drift on three axes** (threshold, status code, count
   semantics). Surfaced by sec + spec + ux (locked_out i18n key). One fix
   touches `lib/auth/rateLimitRepo.ts` + `routes/login.tsx` + the auth spec.
2. **Session lifecycle drift** (`touchSession` never called, idle timeout
   silently absolute, no cookie Max-Age, expiry-on-POST eats form). Surfaced by
   sec + spec + ops. One bundled change.
3. **No helper role** (admin routes ungated, redeemed user is full-admin, helper
   persona blocked). Surfaced by sec + ux. Requires a small `role` field +
   middleware + UI hides; same change unblocks the helper persona work.
4. **Operationally blind** (log module unused, no global error handler, no
   client errors, atomic commits unchecked, ad-hoc `console.*`). Surfaced by
   ops + spec. One bundle: wire `lib/log.ts`, add error middleware, add client
   error endpoint, fix commit checks, add a lint rule against `console.*` in
   `lib/` / `routes/`.
5. **R2/photos hand-rolled crypto duplicated**, aws4fetch dead. Surfaced by
   sec + spec. Refactor: extract `lib/crypto/sha256.ts`, use `crypto.subtle`,
   drop aws4fetch.
6. **Dead code from "done" tasks** (`deleteBox`, `stateMachine`,
   `selectCaptureSurface`, `lib/log.ts`, `_makeClient`). Surfaced by spec.
   Either wire up or delete; CLAUDE.md §13 explicitly forbids the half-finished
   state.
7. **Capture island state-name drift vs spec** + dev capture-test route exposed
   in prod. Surfaced by spec + sec + ux. Single change to fix the route and
   align the spec/state-machine names.
8. **Destructive actions need confirmation across four surfaces** (rooms,
   categories, items, boxes — note that
   `items.delete_confirm`/`rooms.delete_confirm`/`categories.delete_confirm`/`boxes.delete_confirm`
   locale keys all exist, unused). Surfaced by ux. Single small island.
9. **Lazy thumbnails coverage incomplete + thumbnail variant missing** —
   `/items/pending` and box detail bypass deferred loading; even the lazy paths
   fetch full-size R2 originals. Surfaced by spec + ux. Two-step fix.
10. **i18n contract gaps** — orphan keys (29), inline German in `app-init.js`,
    no plural support, "Alle Kategorie" string-concat. Surfaced by ux. Bundle
    into a small i18n tightening change.

---

## 5. Recommendation on OpenSpec proposals

You asked earlier whether to open a proposal per finding. **Don't.** A
per-finding proposal pass would generate ~50 proposals where ~6–9 cohesive
proposals cover the same ground. Recommended grouping (each line ≈ one OpenSpec
proposal; pure bugs against existing specs need no proposal, just a fix PR with
a regression test):

| Proposal                                         | Bundles                                                                                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add-helper-role`                                | Cross-lens theme #3. New behavior — needs a spec.                                                                                                                                                                               |
| `add-observability`                              | Cross-lens theme #4. New observability spec capturing log shape, error middleware, client telemetry endpoint, `/readyz`.                                                                                                        |
| `add-go-live-ops` (or just `docs/operations.md`) | Deploy workflow, backup script (or accept-the-risk note), rollback runbook, monitoring setup. May not need a spec if it's all docs/CI.                                                                                          |
| `add-helper-pack-flow`                           | Cross-lens theme #1 + #2. "Scan existing item into box" — new MVP behavior.                                                                                                                                                     |
| `harden-capture-recovery`                        | Capture retry, AbortController/timeout, visibilitychange handling, error UX with retry CTA. Update `continuous-capture` spec.                                                                                                   |
| `tighten-auth-ratelimit-and-session`             | Theme #1 + #2. Bug against existing auth spec — could be a fix PR, but enough spec text changes that a proposal is cleaner.                                                                                                     |
| `add-destructive-action-confirmation`            | Theme #8. Locale keys already exist; spec needs to define the policy.                                                                                                                                                           |
| `mobile-ui-correctness`                          | Mobile row layout, bottom nav inventory, tap targets ≥44px. New design-system spec deltas.                                                                                                                                      |
| Pure bug-fix PRs (no new proposal needed)        | Items heading lie, lazy-thumbnails coverage, `deleteBox` removal, `photoKey` validation, dead `aws4fetch`, item detail page rendering, KV atomic commit checks, dev route gating, items-list filter `cat+room` combined branch. |

After your triage, I can draft any subset of these. Suggest starting with
`add-helper-role` and `add-go-live-ops` since they unblock the move.

---

## 6. Deferred (consolidated from all lenses)

Post-MVP — none of these are blockers; preserve for after the move:

- Autosave / draft preservation for partially-filled item-create form
- "Mein Konto" page for self-serve password change
- Bulk-move boxes between rooms UI (locale already has `boxes.bulk_add_*`
  orphans)
- Barcode/QR scan of item labels for box-packing
- Thumbnail variants generated on upload
- Plural-aware `t.plural(key, n)` helper
- Print-friendly QR-code label sheets (e.g. 8 per A4)
- "Letzte Aktivität" feed on home (audit log surface)
- Service worker / offline queue for capture
- Long-press multi-select for batch box-assignment
- Pending list scales linearly with total item count — add `item-by-status`
  index once corpus grows
- N+1 read pattern in `listItemsByCategory` / `listItemsByRoom` could be batched
- HMAC the invite codeLookup with `SERVUS_SESSION_KEY` to defeat KV-dump
  enumeration
- `Cache-Control: private, no-store` on all HTML responses (currently only
  nonce-bearing)
- Refactor `ContinuousCapture.tsx` to consume `captureReducer` from
  `lib/capture/stateMachine.ts`
- Server-side feature detection in `CaptureSurface` so unsupported browsers
  don't ship the island JS
- Real-time presence indicators for concurrent edits
- Multi-key support for `SERVUS_SESSION_KEY` to allow seamless rotation
- IndexedDB-based offline capture queue
- KV → R2 nightly backup tarball + `deno task restore`
- `/admin/audit` view
- Server-rendered dates unified to `Europe/Berlin`
- `/readyz` endpoint distinct from `/healthz`

---

## 7. Next step

Triage with the user. Categorize each item in §2 as: **fix before launch**,
**fix-in-flight (accept risk)**, **defer**. Then bundle accepted items into the
proposals in §5 (or fix-against-spec PRs for pure bugs).
