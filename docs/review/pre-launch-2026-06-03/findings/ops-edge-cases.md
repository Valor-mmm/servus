# Observability + Operations + Edge cases — findings

Append findings here as you discover them. Never delete. Format per finding:

### <id-short-slug>

- **Severity:** Blocker | Critical | Major | Minor | Nit
- **Evidence:** file:line refs, or repro steps
- **Why it matters:** one sentence
- **Suggested fix direction:** the shape, not the diff
- **Spec impact:** bug against existing spec | gap in spec | new behavior, needs
  proposal | no spec needed

---

## Findings

### log-module-never-used

- **Severity:** Major
- **Evidence:** `lib/log.ts:18-26` defines a structured `log()` and `redact()`
  helper. Grep for imports of `lib/log` across the whole tree returns only
  `tests/unit/auth/log_test.ts`. Production code instead uses raw
  `console.log/error/warn` directly: `lib/auth/seed.ts:35,43,48`,
  `routes/api/photos/upload-url.ts:18`, `lib/inventory/removePhotoApi.ts:43`,
  `lib/inventory/itemRepo.ts:291`, `islands/ContinuousCapture.tsx:142`,
  `islands/PhotoCapture.tsx:59,79,100,125,143`.
- **Why it matters:** The structured/redacted logger built for this purpose is
  dead code. Prod logs are ad‑hoc, free‑text, un‑levelled, and not JSON — Deno
  Deploy's log viewer is text search only, so without a stable field layout
  (`level`, `msg`, `route`, `userId`) we cannot filter for `level:error` or
  build a "error rate" alert. The redaction set (`password`, `sessionId`,
  `csrfToken`, `cookie`, …) is also bypassed everywhere it matters.
- **Suggested fix direction:** Either remove `lib/log.ts` and accept ad-hoc
  logs, or — preferred — replace the `console.*` call sites with
  `log("level", "msg", {…})` and add a lint rule (or simple grep CI check)
  forbidding raw `console.*` in `lib/` and `routes/`. Also add `log("error", …)`
  from any top-level route catch.
- **Spec impact:** gap in spec (no observability spec exists; should be a small
  new proposal or an addendum to ops docs)

### no-global-error-handler

- **Severity:** Major
- **Evidence:** `main.ts` mounts `staticFiles`, `securityHeaders`,
  `requireAuth`, `csrfGuard`, `fsRoutes` — no error middleware. No
  `routes/_error.tsx` / `_500.tsx` / `_404.tsx` files exist (verified by
  `find routes -name '_error*' -o -name '_500*' -o -name '_404*'` returning
  empty). Most handlers (e.g. `routes/api/items/create-from-photo.ts:5-19`) only
  try/catch the JSON parse and then call into repo functions whose unhandled
  throws (e.g. `updateItem` throws `Item not found` at `itemRepo.ts:167`) bubble
  straight to Fresh.
- **Why it matters:** Fresh's default behavior will return a generic 500 with no
  JSON body and no structured log line we can search for. On Deno Deploy that
  means a real bug shows up as: user sees blank/500 page, we have no aggregated
  error event, no stack trace tied to a request ID. We will not know it happened
  unless the user tells us.
- **Suggested fix direction:** (1) Add a top-level error-catching middleware in
  `main.ts` that wraps `ctx.next()`, logs the error JSON (route, method, stack,
  requestId), and returns a friendly localized error page (or
  `{error:"internal"}` for `/api/*`). (2) Optionally add `routes/_500.tsx` for
  the HTML path. Same for `_404.tsx` so 404s are localized.
- **Spec impact:** gap in spec — no error-handling/observability behavior is
  specified

### atomic-commit-result-not-checked

- **Severity:** Major
- **Evidence:** `lib/inventory/itemRepo.ts:80-93` (createItem), `:199-221`
  (updateItem), `:276-284` (deleteItem);
  `lib/inventory/boxRepo.ts:114, 127, 148, 165-169, 183-186`;
  `lib/auth/sessionRepo.ts:39-44, 60-63`. All call `await op.commit()` and
  ignore the returned `{ ok }` result. Other repos (`categoryRepo.ts:30`,
  `roomRepo.ts:29`, `userRepo.ts:20`, `invites/kv.ts:23`, `invites/index.ts:93`)
  do check, so the contract is inconsistent.
- **Why it matters:** `Deno.Kv.atomic().commit()` does not throw on a failed
  check or rate-limit/quota error — it returns `{ ok: false }`. The current code
  therefore silently proceeds as if the write succeeded: createItem returns the
  in-memory `item`, updateItem returns `updated`, and the caller renders a
  "success" page while KV holds no record. During the move, a failed
  `createSession` would log the user in client-side (cookie set) but the
  server-side session record would never exist, causing instant logout on next
  request with no log line explaining why.
- **Suggested fix direction:** Make the contract uniform: every `commit()` call
  captures `const result = await op.commit();` and throws on `!result.ok` with
  the operation name. The thrown error is then caught by the global error
  middleware (see `no-global-error-handler`) and surfaced.
- **Spec impact:** bug against existing spec — atomicity of item/box/session
  writes is implied by `inventory` and `auth` specs

### no-uncaught-exception-handler

- **Severity:** Minor
- **Evidence:** `main.ts` has no `addEventListener("unhandledrejection", …)` or
  `addEventListener("error", …)`. Async fire-and-forget operations like
  `removePhotoApi.ts:42` (`deleteObject(...).catch(...)`) log to stderr but
  other unawaited promises elsewhere would terminate silently.
- **Why it matters:** Unhandled promise rejections will crash the isolate on
  Deno Deploy with only Deno's default printout; no structured log, no route
  context. With low volume this is recoverable, but during the move week we'll
  lose state about why an isolate restarted.
- **Suggested fix direction:** Register `addEventListener("unhandledrejection")`
  and `addEventListener("error")` in `main.ts` that call the structured
  `log("error", ...)` (once that's wired up) before returning. Document the
  expectation.
- **Spec impact:** no spec needed

### client-errors-go-nowhere

- **Severity:** Major
- **Evidence:** Client error handling lives only as `console.error(...)` inside
  the islands: `islands/ContinuousCapture.tsx:142`,
  `islands/PhotoCapture.tsx:59,79,100,125,143`, plus an image-error banner in
  `static/app-init.js:20-32`. No `window.onerror`, no `unhandledrejection`
  listener, no `navigator.sendBeacon` to a server endpoint — verified by grep
  across the repo.
- **Why it matters:** During the move the primary use case is on phones, away
  from a desktop devtools window. If the camera island throws, R2 starts
  returning 5xx, or a `JSON.parse` fails on a slow network, the user sees
  `t("items.captureFailed")` but the operator has zero record. There is no way
  to confirm "the wife had 3 upload failures yesterday at 14:32 on her phone" —
  Deno Deploy logs only show what the server saw, and the failure was
  client-side.
- **Suggested fix direction:** Minimal: add
  `globalThis.addEventListener("unhandledrejection", …)` +
  `globalThis.addEventListener("error", …)` in `app-init.js` that POSTs a small
  JSON blob `{ts, ua, url, msg, stack}` to a new `/api/log/client` endpoint,
  with per-session rate cap (e.g. 20 events). Keep payload free of PII; redact
  query strings. Replace `console.error` calls inside islands with a small
  helper that also fires this. No external services needed.
- **Spec impact:** gap in spec — no client telemetry exists in any spec; would
  be a small new proposal

### app-init-js-string-html-injection-risk

- **Severity:** Minor
- **Evidence:** `static/app-init.js:25-31` builds the error banner with
  `b.innerHTML = "Einige Bilder konnten nicht geladen werden. " + '<a href=…>...</a>...'`.
  The inline `onclick="this.parentElement.remove()"` will also be blocked by the
  strict CSP from `lib/auth/middleware.ts:146-148`
  (`script-src 'self' 'nonce-{nonce}'`).
- **Why it matters:** The dismiss button won't work in prod because inline event
  handlers are blocked by CSP. The banner reload link uses
  `onclick="location.reload();return false;"` — also CSP-blocked. So the user
  sees the banner but can't dismiss or act on it.
- **Suggested fix direction:** Replace `innerHTML` with element creation +
  `addEventListener`. While there, drop `bannerShown` from module scope into
  closure scope so it's re-armable after dismiss.
- **Spec impact:** no spec needed (bug in dev experience)

### healthz-is-static-ok

- **Severity:** Major
- **Evidence:** `routes/healthz.ts:1-7` returns a literal
  `new Response("ok", { headers: { "content-type": "text/plain" } })`. It does
  not call `getKv()`, doesn't verify R2 reachability, doesn't check
  `SERVUS_SESSION_KEY` is non-empty, doesn't read `SERVUS_SEED_USERS`. The
  handler is also added to `PUBLIC_PATHS` (`lib/auth/middleware.ts:11`) so it
  intentionally bypasses auth — which is correct, but it makes the lack of any
  real check more impactful.
- **Why it matters:** A health probe answering 200 while KV is unreachable, R2
  misconfigured, or the session key has been blanked is worse than no probe: it
  tells UptimeRobot the app is fine while users see 500s. For an unattended
  free-tier deployment with no APM, healthz is the primary signal.
- **Suggested fix direction:** Two endpoints: `/healthz` (liveness, cheap,
  current behavior — confirms the isolate booted), and `/readyz` (readiness —
  does `await kv.get(["__ping"])`, verifies `SERVUS_SESSION_KEY` is set and not
  the placeholder, optionally probes `R2_PUBLIC_URL` if configured). Use
  `/readyz` for the external uptime monitor. Keep the cost low (single KV read).
- **Spec impact:** gap in spec — no health-check behavior is specified

### no-monitoring-configured

- **Severity:** Critical
- **Evidence:** No external uptime monitor, no Deno Deploy alert rule, no
  log-search saved query, and no doc anywhere under `docs/` describes how the
  operator will know the app is down. CLAUDE.md §10 lists the CI pipeline but no
  monitoring; `docs/decisions/` covers only Argon2 and R2 setup. The `/healthz`
  endpoint is a static `ok` (see `healthz-is-static-ok` finding).
- **Why it matters:** Free-tier Deno Deploy doesn't email you when the project
  errors. For a 2-user app it's tolerable in steady state, but for a move-week
  deployment where data loss = lost belongings, you need at minimum a 1-minute
  external HTTPS check so a deploy that wedges or a KV outage is detected within
  minutes rather than at the next time someone tries to use the app. The KV
  consumption gauge (rows + storage) also has no alert before you hit free-tier
  limits.
- **Suggested fix direction:** Pre-launch checklist: (1) UptimeRobot or similar
  (free) pinging `/readyz` every 5 min, alert to the owner's phone via
  email/SMS/Telegram; (2) one Deno Deploy log-based alert on `level:"error"` —
  depends on the `lib/log.ts` rollout; (3) note the operator's manual "weekly KV
  usage glance" in a short `docs/operations.md`. Cost: zero. Effort: ~30 min.
- **Spec impact:** no spec needed — this is operational, not behavioral

### no-audit-log

- **Severity:** Major
- **Evidence:** Grep for `audit`, `actionLog`, `eventLog` across `lib/` and
  `routes/` returns nothing relevant. Invite mint (`lib/invites/index.ts`),
  invite revoke (`routes/admin/invites/[id]/revoke.ts`), invite consume
  (`routes/invite/[code].tsx`), item delete
  (`lib/inventory/itemRepo.ts:267-295`), and box delete
  (`lib/inventory/boxRepo.ts`) all perform their operation and return. No KV
  record describes "who did what when".
- **Why it matters:** During the move there will be 3+ people (owner, wife,
  helpers) touching inventory. If a box gets accidentally tombstoned or items
  vanish, there is no way to reconstruct what happened. Worse for invites: a
  stolen device redeeming an invite leaves no forensic trace beyond the new
  user's creation timestamp. The auth spec already mentions per-IP rate limit
  telemetry but no broader audit trail.
- **Suggested fix direction:** Lightweight: a single `audit` key prefix in KV
  with `["audit", timestamp, randomId]` → `{actor, action, target, meta}`. Write
  from a small `lib/audit/record.ts` helper. Cap rows or use `expireIn` to bound
  growth. Render at `/admin/audit` (admin-only). Don't try to be exhaustive —
  focus on destructive + privileged: item/box deletion, invite
  mint/revoke/consume, user seed events, failed login bursts.
- **Spec impact:** gap in spec — would need a small new proposal
  (`add-audit-log`) post-MVP, but a minimal version is reasonable as a go-live
  add

### no-deploy-workflow

- **Severity:** Critical
- **Evidence:** `.github/workflows/` contains only `ci.yml`. `ci.yml` runs lint,
  fmt, type-check, unit/integration tests, and Playwright e2e — but has no
  deploy job. Grep for `deployctl`, `DENO_DEPLOY_TOKEN`, `deno-deploy` across
  `.github/`, `deno.json`, `docs/` returns nothing. `README.md:62-66` claims
  "Pushes to `main` trigger CI → if green → auto-deploy" and mentions
  `DENO_DEPLOY_TOKEN`, but the secret is not used anywhere. CLAUDE.md §10 step 8
  also promises `deployctl`-based deploy gated on CI.
- **Why it matters:** Either the project is using Deno Deploy's separate
  dashboard-side GitHub integration (which bypasses GitHub Actions entirely —
  meaning every push to `main` deploys regardless of whether tests pass, since
  Deno Deploy's own build doesn't run our test suite), or no deploy mechanism is
  wired up at all. In the first case, the "green checks gate prod" promise is
  broken; in the second, prod is hand-deployed and the README lies. Either way
  the operator has no documented, reproducible deploy path.
- **Suggested fix direction:** Add `.github/workflows/deploy.yml`:
  `on: push: branches: [main]`, `needs: [check, test, e2e]` (or duplicate the
  chain), then
  `deployctl deploy --project=servus --prod --token=${{ secrets.DENO_DEPLOY_TOKEN }} main.ts`.
  Disable Deno Deploy's dashboard GitHub integration so only this workflow can
  promote to prod.
- **Spec impact:** no spec needed — operational gap, but documented in CLAUDE.md
  §10 as the expected setup

### secrets-injection-untested-but-pattern-ok

- **Severity:** Nit
- **Evidence:** `.env.example:1-15` documents required env vars;
  `lib/photos/config.ts:7-19` correctly throws if R2 vars are missing;
  `main.ts:10-15` checks `SERVUS_SESSION_KEY` and exits if it's missing or
  starts with the `REPLACE_` placeholder. README §Deployment says secrets go
  into Deno Deploy dashboard. No `.env` in git (`.gitignore` enforces it —
  confirmed it exists in repo root and is not tracked).
- **Why it matters:** Pattern is sound, but no automated check guards against a
  deploy that loses an env var (e.g. dashboard edit fat-fingers
  `R2_PUBLIC_URL`). The `R2_*` vars are only validated lazily on the first
  upload — a missing var doesn't surface until the wife tries to capture her
  first photo and gets a 503.
- **Suggested fix direction:** Add an eager validation pass in `main.ts` after
  the `SERVUS_SESSION_KEY` check: try `getR2Config()` once at startup if any R2
  var is set; log a single line `[startup] R2 configured: bucket=… key=…` (no
  secrets) or `[startup] R2 not configured — photo upload will return 503`.
- **Spec impact:** no spec needed

### no-rollback-plan

- **Severity:** Major
- **Evidence:** Grep for "rollback" or "revert" across `docs/`, `README.md`,
  `CLAUDE.md` finds only the R2 setup doc mentioning orphan objects
  (`docs/decisions/cloudflare-r2-setup.md:112`). No `docs/operations.md`, no
  runbook. With no deploy workflow (see `no-deploy-workflow`) there is also no
  obvious "promote previous artifact" button.
- **Why it matters:** During the move week, a bad deploy that corrupts how items
  are stored could destroy state we can't recover. Without a documented "git
  revert HEAD; push" or "Deno Deploy dashboard → previous deployment → promote"
  step, the operator (under stress, possibly on a phone) will improvise.
- **Suggested fix direction:** Add a 10-line `docs/operations.md` with: how to
  roll back (Deno Deploy dashboard path, or `git revert` + redeploy if workflow
  exists), how to verify rollback (curl `/readyz`, log in, view items list), and
  what to do if a migration-style data change went out (currently: none
  planned). Wire the Deno Deploy dashboard "Promote previous deployment" path
  into the runbook explicitly.
- **Spec impact:** no spec needed

### no-backup-strategy-documented

- **Severity:** Critical
- **Evidence:** `CLAUDE.md:39` table says Deno KV has "automatic backup" — this
  is **misleading**. Deno KV on Deno Deploy does internal replication for
  durability but does NOT expose user-accessible point-in-time backups or
  restore for the free tier. The official Deno KV docs note that backups/exports
  require manual `deno task` work or paid features. No `kv-backup.ts` or
  `tasks: backup` exists in `deno.json`.
- **Why it matters:** If the wife accidentally bulk-deletes a box, the inventory
  of what was in it is gone. There's no "last night's snapshot". For an MVP that
  catalogs every item the family owns ahead of a move, "no recovery from user
  error" is a real risk.
- **Suggested fix direction:** Two options, pick one before go-live: (1) add a
  `deno task backup` that does `kv.list({prefix:[]})` → JSON file → optionally
  uploaded to R2 or downloaded by the operator; run it manually weekly + before
  any risky operation. (2) Document explicitly that there are no backups and the
  user accepts the risk for MVP. Either way, fix the misleading line in
  CLAUDE.md §3.
- **Spec impact:** gap in spec — no backup behavior is specified; either add a
  `backups` capability spec or update CLAUDE.md to say "no backups"

### session-key-rotation-undocumented

- **Severity:** Minor
- **Evidence:** `lib/auth/sessionCookie.ts` (not read but referenced from
  `middleware.ts:46`) signs cookies with `SERVUS_SESSION_KEY`.
  `lib/auth/middleware.ts:185` reads it per-request as
  `Deno.env.get("SERVUS_SESSION_KEY") ?? ""`. No docs explain what happens when
  the key is rotated — implicitly: every session cookie becomes invalid, every
  user is logged out.
- **Why it matters:** The owner may want to rotate the key (e.g. after sharing
  access with a helper who has since left). Without docs, the operator doesn't
  know whether rotation is supported at all, whether old sessions need cleanup,
  or whether the rate-limit IP hashes (which are also keyed off
  `SERVUS_SESSION_KEY` per `openspec/specs/auth/spec.md:304` and design doc)
  will be invalidated too — which they will be, breaking the lockout state for
  in-flight brute-force attempts (probably fine; worth knowing).
- **Suggested fix direction:** One paragraph in `docs/operations.md`: "Rotate
  SERVUS_SESSION_KEY in Deno Deploy dashboard → deploy → all users are signed
  out and must re-authenticate. Rate-limit counters reset. Do not retain the old
  key. There is no key versioning."
- **Spec impact:** gap in spec — could be an addendum to the auth spec's "Key
  management" section, but documentation may be sufficient

### env-var-startup-validation-partial

- **Severity:** Minor
- **Evidence:** `main.ts:10-15` validates `SERVUS_SESSION_KEY` is set and not
  the `REPLACE_*` placeholder. `seedFromEnv()` in `lib/auth/seed.ts:32-49`
  silently logs "0 user(s)" and returns when `SERVUS_SEED_USERS` is missing,
  instead of failing. R2 vars are not validated at startup at all (only on first
  request via `getR2Config()` in `lib/photos/config.ts:13-19`).
- **Why it matters:** A first-boot of a fresh deployment with no seed users will
  start cleanly, show login, and reject every login attempt (because no user
  exists) — with no log line saying "you forgot SERVUS_SEED_USERS". An operator
  debugging this from a phone has no signal. Similarly, missing R2 vars are
  invisible until the wife tries to take her first photo and gets a
  friendly-ish 503.
- **Suggested fix direction:** In `main.ts`, after the session key check, also:
  (1) warn loudly if `SERVUS_SEED_USERS` is unset AND
  `kv.list({prefix:["user"]})` is empty (do the KV check before allowing
  requests); (2) call `getR2Config()` in a try/catch and log a single "R2 not
  configured — photo features disabled" line so the operator sees it in the
  deploy log.
- **Spec impact:** gap in spec — could extend the existing "SERVUS_SESSION_KEY
  must be set at startup" requirement to cover seed users

### static-asset-cache-headers-default

- **Severity:** Minor
- **Evidence:** `main.ts:18` mounts `staticFiles()` from Fresh — no explicit
  cache headers configured. The `securityHeaders()` middleware in
  `lib/auth/middleware.ts:191-216` only sets `Cache-Control: no-store` when an
  HTML response carries a CSP nonce (line 168-170); otherwise it leaves cache
  headers untouched. Static assets like `/styles.css`, `/app-init.js`,
  `/lion.svg`, `/manifest.json`, `/favicon.ico` rely on Fresh's defaults
  (typically `cache-control: public, max-age=0, must-revalidate` and an ETag —
  fine but not optimal for free-tier bandwidth).
- **Why it matters:** Each page load revalidates every asset. On flaky mobile
  networks during the move this means more round trips, slower UI, and faster
  burn through the 1M req/mo Deno Deploy free tier. The `_fresh/` build
  artifacts (JS bundles produced by `deno task build`) typically have
  content-hashed filenames and could be served with
  `immutable, max-age=31536000`.
- **Suggested fix direction:** Add a small middleware in front of
  `staticFiles()` that sets `Cache-Control: public, max-age=31536000, immutable`
  for paths in `/_fresh/` (hashed) and `Cache-Control: public, max-age=300` for
  the un-hashed `/static/*` files. Keep HTML at `no-store` (already correct for
  nonce'd pages).
- **Spec impact:** no spec needed

### timezone-server-rendered-dates

- **Severity:** Minor
- **Evidence:** `routes/items/[id].tsx:78,81` and
  `routes/admin/invites/index.tsx:17` render dates via
  `new Date(item.createdAt).toLocaleDateString("de-DE", …)` on the server. Deno
  Deploy edge isolates run with `TZ=UTC` (no docs guarantee otherwise). The user
  is in Germany (CET/CEST). For a `createdAt` timestamp captured at, say,
  2026-06-03 23:30 CEST (= 2026-06-03 21:30 UTC), the server renders
  "03.06.2026" — which is correct in this case. For 2026-06-03 01:00 CEST (=
  2026-06-02 23:00 UTC), the server renders "02.06.2026" but the user remembers
  "the morning of the 3rd".
- **Why it matters:** Items captured around midnight will appear under the
  previous day. For inventory & invite-mint dates that's annoying but not
  data-loss; for any future timeline/audit view it's a real issue. Spec is
  silent on TZ.
- **Suggested fix direction:** Either (a) pass an explicit
  `timeZone: "Europe/Berlin"` option to `toLocaleDateString` everywhere on the
  server, or (b) render an `<time datetime="…iso…">` element with a small
  client-side enhancement that reformats in the browser's TZ. Option (a) is
  simpler and matches the German UI assumption.
- **Spec impact:** gap in spec — add a tiny "all user-visible dates render in
  Europe/Berlin" line somewhere (CLAUDE.md §11 i18n or a new section)

### photo-upload-no-retry

- **Severity:** Critical
- **Evidence:** `islands/PhotoCapture.tsx:48-148` and
  `islands/ContinuousCapture.tsx:100-164` each do a single `fetch()` for the
  presigned URL, a single `fetch(url, PUT)` to R2, and a single `fetch` to
  `/api/items/...` — with no retry, no exponential backoff, no offline
  detection. On failure the error appears as a localized message but the resized
  blob is discarded (`blob` is a local in `handleFileChange`).
- **Why it matters:** Move day: hands full, in a basement with one bar of LTE,
  taking 20 photos in a row. A single dropped packet kills one photo and the
  user has to find it again on the shelf to re-capture. With `ContinuousCapture`
  the user is in viewfinder mode — if the third upload fails, the
  previously-captured blob URL thumbnail in `thumbnails` is now misleading
  because the item has only 2 photos in R2 (or 0, if the create call failed
  before the append). The "Fertig" path then reloads to a partial state.
- **Suggested fix direction:** Add a small retry helper (3 attempts, exponential
  backoff, only on network/5xx, never on 4xx). Keep the resized blob in a
  per-photo state object so a retry doesn't require re-capturing. For
  `ContinuousCapture`, attach the blob URL to a status
  (`uploading | uploaded | failed`) and offer "retry this photo" before
  "Fertig".
- **Spec impact:** gap in spec — `photos` spec and `continuous-capture` spec are
  silent on upload failure handling

### no-concurrent-edit-protection

- **Severity:** Major
- **Evidence:** `routes/items/[id]/edit.tsx:241` calls
  `updateItem(item.id, {...})` without sending a versionstamp;
  `lib/inventory/itemRepo.ts:161-230` does `findItem` then writes the merged
  result with `kv.atomic().set(...)` and no `check({key, versionstamp})`. Same
  pattern in `boxRepo.ts:114-127` (`updateBox` does have a versionstamp check
  but `setBoxStatus` at line 148 has only one). Grep for `check({` shows only
  the invite consume path (`lib/invites/index.ts:84-86`) and the protected box
  paths actually enforce optimistic concurrency.
- **Why it matters:** Owner and wife both edit the same item from two phones
  during packing. Wife sets `quantity=2, roomId=basement`. Owner had opened the
  form earlier with `quantity=1, roomId=null` and saves a minute later with no
  quantity change — wife's quantity is gone. Spec defines fields and indexes but
  says nothing about concurrent edits. No conflict UI exists.
- **Suggested fix direction:** Short-term (good enough for MVP with 2 users):
  include `updatedAt` as a hidden form field, and in `updateItem` accept
  `expectedUpdatedAt`, do a `check({key, versionstamp: existing.versionstamp})`
  (you need to pass the versionstamp out of `findItem`). On mismatch return a
  409 → render the edit page with a localized "Item changed since you opened
  this — review and re-save" banner. Long-term: real-time presence indicator,
  but out of scope.
- **Spec impact:** gap in spec — `inventory` spec should specify the concurrency
  model (e.g. "last-save wins" explicitly, or optimistic concurrency)

### session-expiry-eats-form-submission

- **Severity:** Major
- **Evidence:** `lib/auth/middleware.ts:36-95` (`applyRequireAuth`) returns a
  302 to `/login?next=…` on missing/expired session for GETs but a bare 401 for
  any other method (lines 60, 75, 91). Long edit forms
  (`routes/items/[id]/edit.tsx`) and the photo capture flows POST to
  authenticated endpoints. If the wife leaves the edit page open for >14 days
  (`IDLE_TTL_MS` in `sessionRepo.ts:13`) or >60 days (`ABSOLUTE_TTL_MS:11`) and
  hits Save, she gets a blank 401 — Fresh shows the default error page, the form
  contents are gone, and there's no flow back to login that preserves the form.
- **Why it matters:** Realistic during the move: pages are left open on phones
  for hours. Even the 14-day idle window can be hit if the phone never reloads.
  Photo capture POST will return 401 mid-session and the island just renders the
  generic "captureFailed" copy with the photo lost.
- **Suggested fix direction:** Two paths: (1) On POST 401, return JSON
  `{ error: "session_expired" }` for `/api/*` and a 302-with-`next` for HTML
  forms. The login page already accepts `?next=…`. (2) On the form pages, add a
  tiny island that polls `/healthz` every 5 min and warns the user when the
  cookie nears expiry. For MVP, (1) is the must-have; (2) is nice-to-have.
- **Spec impact:** gap in spec — auth spec mentions idle/absolute expiry but
  doesn't specify the user-visible behavior on POST during expiry

### invite-redemption-race-handled

- **Severity:** Nit
- **Evidence:** `lib/invites/index.ts:84-91` consumes the invite with
  `kv.atomic().check({key: inviteKey, versionstamp: inviteEntry.versionstamp}).check({key: userKey, versionstamp: null}).set(userKey,…).delete(inviteKey).delete(codeLookupKey).delete(expiryIndexKey).commit()`.
  The result is checked at line 93. The expiry check at line 54 happens before
  the atomic, but the versionstamp `check` ensures only one redemption wins.
- **Why it matters:** Two devices redeeming the same invite at the same instant:
  one succeeds, the other gets `{ok:false}` and falls into the "not_found"
  branch — exactly the desired single-use behavior. No race in this path.
- **Suggested fix direction:** No change needed; documenting as verified.
- **Spec impact:** no spec needed — behavior matches `invites` spec

### r2-5xx-handling-partial

- **Severity:** Major
- **Evidence:** `islands/PhotoCapture.tsx:78-83` and
  `islands/ContinuousCapture.tsx:148-149` surface a localized error with the
  HTTP status on R2 PUT failure. Server-side `lib/inventory/itemRepo.ts:290`
  swallows R2 DELETE failures (`deleteObject(...).catch(...)`) and only logs to
  `console.warn`. `lib/photos/r2.ts:13-34` returns a result object; the caller
  decides what to do. The R2 GET path (presigned URLs rendered server-side via
  `routes/items/[id]/edit.tsx:151`) has no fallback — if R2 returns 5xx the user
  sees broken images, with the `static/app-init.js:20-32` banner mitigating
  somewhat (but see `app-init-js-string-html-injection-risk`).
- **Why it matters:** R2 has had multi-hour regional outages in the past. During
  such an event the inventory still works (text/structure is in KV), but no
  photos load and capture is dead. There's no operator UX path saying "R2 is
  down — text-only mode". Worse, photo metadata in KV exists for items that may
  have had their R2 object lost (e.g. if a presigned PUT URL expires before the
  upload completes, the item is created but the photo is missing).
- **Suggested fix direction:** (1) After a successful PUT to R2 from the client,
  the server should HEAD the object before linking it (in
  `handleCreateFromPhoto` / `handleAppendPhoto`) — if it's not there, return 502
  so the client can retry. (2) On R2 GET 5xx, the server-side render could
  optionally fall back to a placeholder + clearer "Bilder vorübergehend nicht
  verfügbar" banner instead of broken `<img>` tags. (3) Document expected
  behavior in the photos spec.
- **Spec impact:** gap in spec — `photos` spec doesn't say what happens when R2
  is unavailable

### continuous-capture-refresh-loses-session

- **Severity:** Critical
- **Evidence:** `islands/ContinuousCapture.tsx:23-180` keeps `phase`, `itemId`,
  `thumbnails`, `hadCaptures` in signal state — no `localStorage`, no
  `sessionStorage`. A browser refresh (or accidental swipe-back, or accidental
  tap on the navigation) destroys all local state. The server-side item exists
  with `name:""` and however many photos succeeded before the refresh, but the
  user has no UI signal that they were mid-capture; they're dropped back to
  whatever page they were on. The `pagehide` / `beforeunload` handlers at lines
  50-55 actually call `cleanup()` which closes the camera stream — so even
  attempting to scroll up on iOS Safari (which triggers `pagehide` on the bottom
  toolbar interaction) silently kills the session.
- **Why it matters:** The continuous capture spec scenarios assume the user
  works in one uninterrupted flow. On mobile that flow is fragile — a phone call
  comes in, the screen locks, the user pulls down notifications: any of these
  can trigger `visibilitychange:hidden` which calls `cleanup()` at line 48. When
  the user comes back, the camera is dead, the thumbnails are still on screen
  but the underlying `MediaStream` is closed — taps on the shutter quietly do
  nothing because `videoRef.current` is now an inert element.
- **Suggested fix direction:** (1) On `visibilitychange:visible`, if
  `phase === "in-progress"`, attempt to re-acquire the camera and rebind. (2)
  Persist `{itemId, phase, thumbnailKeys}` to `sessionStorage` so a refresh
  in-flight can ask "Continue capture for item X? You have N photos so far". (3)
  Document recovery behavior in `continuous-capture` spec.
- **Spec impact:** gap in spec — `continuous-capture/spec.md` requires a section
  on recovery from interruption (phone call, screen lock, refresh)

### free-tier-limits-not-instrumented

- **Severity:** Major
- **Evidence:** No code measures KV row count, KV storage bytes, R2 object
  count, R2 bandwidth, or Deno Deploy request count. No
  `kv.list({prefix:[]}).reduce(...)` style "are we close to the limit" job
  exists. CLAUDE.md §3 says "1M req/mo" for Deno Deploy, "10GB" for R2 — both
  can be exceeded silently.
- **Why it matters:** A move family taking 2000 photos + 5000 inventory items ×
  4 KV writes each = 20k writes upfront, plus continuous reads while browsing.
  With no instrumentation, the first signal that we've hit a quota is the app
  starting to return 5xx (Deno Deploy) or photos failing to upload (R2). There's
  no preventive alert.
- **Suggested fix direction:** A small cron-like script: `tasks/quota-report.ts`
  that runs as a Deno Deploy cron (free tier supports one cron) once per day:
  `count = await listCount`; for R2: count objects + sum sizes; log structured
  `{type:"quota", kvCount, r2Count, r2Bytes}`. Alert email is out of scope;
  operator reviews logs manually weekly. Pre-launch alternative: a one-line
  `/admin/health` page that shows the same numbers.
- **Spec impact:** no spec needed — operational tooling

### no-local-storage-fallback-quota-handling

- **Severity:** Minor
- **Evidence:** `static/app-init.js:13` does
  `localStorage.setItem("servus-theme", ...)`. `islands/ContinuousCapture.tsx`
  and `islands/PhotoCapture.tsx` use only in-memory signal state. No use of
  IndexedDB. Grep for `try { localStorage` returns no defensive uses.
- **Why it matters:** localStorage in private/incognito mode throws on
  `setItem`; in some Safari modes the quota is very small. The theme-toggle
  would throw and crash `app-init.js` execution, breaking the lazy-thumbnail
  observer and theme icons. With CSP `script-src 'self'` (per middleware) no
  inline `<script>` will recover.
- **Suggested fix direction:** Wrap the `setItem` and `getItem` calls in
  try/catch in `app-init.js` and `theme-init.js`. Small change; eliminates a
  class of mobile-Safari-private-mode breakage.
- **Spec impact:** no spec needed

### camera-permission-denial-handled

- **Severity:** Nit
- **Evidence:** `islands/ContinuousCapture.tsx:82-91` classifies `getUserMedia`
  errors via `classifyGetUserMediaError` and shows distinct hints
  (`permissionDeniedHint`, `noCameraHint`) and falls back to `<PhotoCapture>`
  (file input mode). `lib/capture/fallbackLogic.ts` handles the classification.
- **Why it matters:** This is the right behavior — denied permission falls back
  to file picker, no dead-end UX. Verified by reading the island code; matches
  the `continuous-capture` spec requirement at
  `openspec/specs/continuous-capture/spec.md:130` "Graceful fallback when
  continuous capture is unavailable".
- **Suggested fix direction:** No change needed.
- **Spec impact:** no spec needed — behavior matches spec

### flaky-mobile-network-ui-stalls

- **Severity:** Major
- **Evidence:** `islands/PhotoCapture.tsx:32-148` and
  `islands/ContinuousCapture.tsx:67-166` set `busy=true` before the fetch chain
  and only clear it in `finally`. There is no `AbortController`, no timeout. A
  `fetch()` that hangs on a stalled connection leaves the UI in `busy=true`
  indefinitely with `…` as the button label.
- **Why it matters:** Moving boxes in a basement with 1-bar coverage: the user
  taps shutter, sees `…`, waits 30 seconds, tries to tap again — button is
  disabled, no error message. They have no way to know whether their photo is
  uploading slowly or whether the network just dropped. Eventually they reload
  the page, lose their session state (see
  `continuous-capture-refresh-loses-session`), and start over.
- **Suggested fix direction:** Wrap each fetch in an `AbortController` with a
  30-second timeout. On timeout, set `error.value = t("items.captureTimeout")`
  and clear `busy`. Same change in both islands. Localize the new key in
  `lib/i18n/locales/de.ts`.
- **Spec impact:** gap in spec — neither `photos` nor `continuous-capture` spec
  mentions timeout behavior

---

## Go-live blockers

**Absolute blockers — must fix or accept-with-mitigation before the move:**

1. **`no-deploy-workflow`** (Critical) — There is no CI-gated deploy pipeline.
   Either fix the README and rely on Deno Deploy's dashboard GitHub integration
   (which bypasses tests entirely), or add `.github/workflows/deploy.yml`. Pick
   one before any code reaches prod.
2. **`no-monitoring-configured`** (Critical) — Combined with
   `healthz-is-static-ok`. A 30-min UptimeRobot setup hitting a real readiness
   probe is non-negotiable; otherwise we won't notice an outage until someone
   tries to use the app.
3. **`no-backup-strategy-documented`** (Critical) — CLAUDE.md's "automatic
   backup" claim is misleading. Either build a `deno task backup` exporting KV
   to JSON, or explicitly accept-the-risk and update the docs. Without one of
   these, a user-error bulk delete is unrecoverable.
4. **`photo-upload-no-retry`** (Critical) — Single-attempt photo uploads on
   flaky mobile networks will silently lose photos during the move. Add retry +
   AbortController + clearer error UX before move week.
5. **`continuous-capture-refresh-loses-session`** (Critical) —
   `visibilitychange:hidden` cleanup means a phone call interrupts a capture
   session and silently breaks the camera. Either re-acquire on `visible`, or
   stop cleaning up on transient visibility changes.

**Strongly recommended (Major) — ship if at all possible:**

6. `atomic-commit-result-not-checked` — silently swallowed write failures in
   `itemRepo`, `boxRepo`, `sessionRepo`.
7. `no-global-error-handler` + `client-errors-go-nowhere` — together these mean
   we are operationally blind. At minimum: a `main.ts` error middleware that
   logs structured JSON, and a client-side `unhandledrejection` listener POSTing
   to a small endpoint.
8. `no-audit-log` — destructive actions (item/box delete, invite mint/consume)
   leave no trace.
9. `no-concurrent-edit-protection` — two phones editing the same item silently
   overwrite each other.
10. `session-expiry-eats-form-submission` — long-open mobile pages POST to a 401
    and lose the form.
11. `r2-5xx-handling-partial` — no HEAD-after-PUT verification means orphan
    items can exist after a failed upload.
12. `flaky-mobile-network-ui-stalls` — no fetch timeout means the UI gets stuck
    on bad networks.
13. `free-tier-limits-not-instrumented` — first signal of quota exhaustion is a
    prod outage.

**Acceptable risk for move-week MVP (Minor / Nit):**

- `no-uncaught-exception-handler`, `secrets-injection-untested-but-pattern-ok`,
  `session-key-rotation-undocumented`, `env-var-startup-validation-partial`,
  `static-asset-cache-headers-default`, `timezone-server-rendered-dates`,
  `no-local-storage-fallback-quota-handling`,
  `app-init-js-string-html-injection-risk`.

## Deferred

- Structured client telemetry → small SaaS-free analog (e.g. a `/api/log/client`
  endpoint with a 20-events-per-session cap).
- Real-time presence indicators for concurrent edits.
- Multi-key support for `SERVUS_SESSION_KEY` to allow seamless rotation.
- IndexedDB-based offline capture (queue photos client-side when offline, sync
  on reconnect) — large change, post-move.
- KV → R2 nightly backup tarball and a `deno task restore` path.
- `/admin/audit` view to render the audit log.
- Server-rendered date formatting unified to `Europe/Berlin` with a small
  helper.
- A `/readyz` endpoint distinct from `/healthz`.
