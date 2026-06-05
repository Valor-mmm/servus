# Spec compliance + Senior dev — findings

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

### auth-ip-rate-limit-threshold-drift

- **Severity:** Major
- **Evidence:** `lib/auth/rateLimitRepo.ts:6` sets `IP_THRESHOLD = 30`; spec
  `openspec/specs/auth/spec.md:165-179` ("Login resists brute force per IP")
  requires **10** failed attempts per 15-min window before lockout. Code comment
  explicitly says it was raised to make the E2E suite pass.
- **Why it matters:** The brute-force protection is 3× weaker than the spec
  advertises. Attackers get 30 attempts/IP/15 min instead of 10.
- **Suggested fix direction:** Either honor the spec value (10) and isolate the
  e2e suite (per-test prefix or a separate rate-limit namespace under a test
  flag), or amend the spec to acknowledge the chosen number. Don't keep them out
  of sync.
- **Spec impact:** bug against existing spec

### auth-ip-rate-limit-counts-successes

- **Severity:** Major
- **Evidence:** `lib/auth/rateLimitRepo.ts:24-52` increments the IP counter
  unconditionally; `lib/auth/loginHandler.ts:45-76` calls `checkAndIncrementIp`
  and `checkAndIncrementUser` before verifying the password and never decrements
  on success. Spec requires the counter to track **failed** attempts
  (`openspec/specs/auth/spec.md:166-167`, "track failed attempts per source
  IP").
- **Why it matters:** Legitimate users sharing an outgoing NAT (home network,
  mobile carrier) get locked out after 30 normal logins. Per-username counter
  also never resets on the IP side, and per-user counter is incremented for
  _every_ attempt (only cleared on success), making the failure semantics
  inconsistent.
- **Suggested fix direction:** Either (a) increment only after a verified-bad
  outcome, keeping a single atomic-update pattern, or (b) rename/reshape the
  metric and amend the spec to "all attempts" if that is the intent. Today the
  impl drifts from the literal spec wording.
- **Spec impact:** bug against existing spec

### auth-rate-limit-returns-200-not-429

- **Severity:** Major
- **Evidence:** `routes/login.tsx:68-76` re-renders the login page with the same
  status (200) when `result.limited`. Spec at
  `openspec/specs/auth/spec.md:168-198` requires HTTP 429 with `Retry-After`
  header for both per-IP and per-username lockout.
- **Why it matters:** Browser dev tools, monitoring, and any future API client
  cannot see that the server is rate-limited. `Retry-After` is part of the
  contract for credential-stuffing defense.
- **Suggested fix direction:** Return a 429 response with
  `Retry-After: <seconds>` and an HTML body for browser users; keep the
  localized error message.
- **Spec impact:** bug against existing spec

### auth-lastseen-touch-never-called

- **Severity:** Major
- **Evidence:** `lib/auth/sessionRepo.ts:79-93` defines `touchSession`, but
  `grep` for callers returns only the unit test.
  `lib/auth/middleware.ts:218-239` (`requireAuth`) never updates `lastSeen` on
  authenticated requests.
- **Why it matters:** Spec `openspec/specs/auth/spec.md:135-162` ("Session
  lifetime") requires `lastSeen` to update on authenticated requests so a
  still-active session is not killed by idle timeout. Today, a session that
  started 14 days ago will be lazily deleted on the next visit even if the user
  has been active continuously, because `lastSeen` is frozen at creation time.
- **Suggested fix direction:** Have `requireAuth` call `touchSession(sessionId)`
  after a successful session lookup (the function already throttles to
  once/hour).
- **Spec impact:** bug against existing spec

### auth-absolute-timeout-not-enforced-in-code

- **Severity:** Minor
- **Evidence:** `lib/auth/sessionRepo.ts:11,40` sets KV
  `expireIn: ABSOLUTE_TTL_MS` on session creation but never checks
  `session.createdAt` in middleware. Spec `openspec/specs/auth/spec.md:135-156`
  requires the system to treat sessions older than 60 days as invalid.
- **Why it matters:** Behavior is correct in practice (KV TTL deletes the
  record), but the invariant is implicit in storage, not enforced in code. If
  anything in the future writes a session without `expireIn`, the 60-day cap is
  silently lost.
- **Suggested fix direction:** Add an explicit
  `Date.now() - session.createdAt > ABSOLUTE_TTL_MS` check in
  `applyRequireAuth`, mirroring the idle check.
- **Spec impact:** gap between spec wording and code (works today by accident of
  KV TTL)

### auth-public-paths-include-invite-undocumented

- **Severity:** Minor
- **Evidence:** `lib/auth/middleware.ts:16` adds `/invite/` to public paths.
  Spec `openspec/specs/auth/spec.md:255-261` ("Unauthenticated requests are
  redirected to login") says the public set is exactly `/login`, `/logout` (POST
  only), `/static/*`, and `/healthz`.
- **Why it matters:** `/invite/<code>` exists for the invite-token-auth change
  but `auth/spec.md` was not updated to mention it as a public path. Spec drift
  makes the auth contract incomplete.
- **Suggested fix direction:** Update the auth spec's "public routes"
  requirement to include `/invite/*` (matching the invite spec), or move that
  requirement entirely under the invite spec.
- **Spec impact:** gap in spec

### auth-csp-style-src-not-self-only

- **Severity:** Minor
- **Evidence:** `lib/auth/middleware.ts:154` emits
  `style-src 'self' 'unsafe-inline'`. Spec `openspec/specs/auth/spec.md:285-291`
  mandates `default-src 'self'`, no other directives. The spec is silent on
  style-src specifically, but the global rule is "restrict default-src to
  'self'".
- **Why it matters:** `'unsafe-inline'` for styles defeats the main
  XSS-via-style protection. Used so islands or 3rd-party UI can inject styles;
  if not strictly required, tighten.
- **Suggested fix direction:** Audit whether any island actually needs inline
  styles. If yes, document it in the auth spec (gap in spec). If no, drop
  `'unsafe-inline'`.
- **Spec impact:** gap in spec

### auth-logout-public-but-GET-too

- **Severity:** Minor
- **Evidence:** `lib/auth/middleware.ts:11` treats `/logout` as public for both
  GET and POST. Spec `openspec/specs/auth/spec.md:255-261` allows
  `/logout (POST only)` to be public. `routes/logout.ts` only defines POST, so a
  GET 404s under Fresh anyway, but the middleware is more permissive than the
  spec.
- **Why it matters:** Cosmetic today, but the middleware contract is broader
  than the spec contract.
- **Suggested fix direction:** Either gate the public exemption to
  `req.method === "POST"` for `/logout`, or update the spec to say public
  regardless of method.
- **Spec impact:** gap in spec

### auth-seed-empty-array-log-message

- **Severity:** Nit
- **Evidence:** `lib/auth/seed.ts:35` logs
  `seeded 0 user(s), skipped 0 existing` when `SERVUS_SEED_USERS` is unset, but
  the spec's "Empty seed" scenario (`openspec/specs/auth/spec.md:35-39`) only
  says boot must succeed, not what to log. Fine.
- **Why it matters:** Not a bug, but the spec is silent on the logging message
  for the unset case. Worth noting if anyone tightens the spec.
- **Suggested fix direction:** No action.
- **Spec impact:** no spec needed

### boxes-deleteBox-no-tombstone

- **Severity:** Major
- **Evidence:** `lib/inventory/boxRepo.ts:172-187` defines `deleteBox` which
  removes the live record AND the code index (`BOX_CODE_KEY`) but writes NO
  tombstone. Spec `openspec/specs/boxes/spec.md:276-301` ("Box tombstone
  deletion") requires a tombstone before removing the live record on every
  deletion path. Production callers actually use `tombstoneDeleteBox`, so the
  live code is correct — but `deleteBox` is exported and tested as if it were
  API. Tests at `tests/unit/inventory/boxRepo_test.ts:130-150` and
  `tests/integration/inventory/boxRepo_integration_test.ts:89` exercise this
  incorrect path.
- **Why it matters:** Future contributor sees `deleteBox` in the public surface,
  calls it from a route, and silently drops the tombstone — breaking the "short
  codes are never reused" invariant. Also: today this code also frees
  `BOX_CODE_KEY(code)`, which means the next `nextCode()` will allocate a fresh
  number (good) but if there were ever a `findBoxByCode(oldCode)` lookup it
  would 404 silently. Dead code with the wrong shape.
- **Suggested fix direction:** Either delete `deleteBox` entirely or rewrite it
  as a thin alias for `tombstoneDeleteBox("manual")` after asserting emptiness.
- **Spec impact:** bug against existing spec (would manifest if used)

### boxes-label-page-fresh-chrome-untested

- **Severity:** Nit
- **Evidence:** `routes/boxes/[id]/label.tsx:150-153` returns an explicit
  `text/html` response with a hand-written `<html>` doc, bypassing Fresh's
  `_app.tsx`. Spec `openspec/specs/boxes/spec.md:330-336` ("renders without
  navigation chrome") is satisfied by this design.
- **Why it matters:** Fine today, but the auth/security middleware in
  `lib/auth/middleware.ts` only re-wraps text/html responses to extract a CSP
  nonce; the label page never includes islands so no nonce is needed. Worth
  keeping in mind that this route bypasses the layout but still passes through
  the security headers middleware (which it does).
- **Suggested fix direction:** No action — flagged for awareness.
- **Spec impact:** no spec needed

### boxes-delete-button-only-when-empty

- **Severity:** Nit
- **Evidence:** `routes/boxes/[id].tsx:90-102` renders the delete button only
  when `items.length === 0`. The spec's "Box tombstone deletion" requires a
  tombstone on manual deletion (`openspec/specs/boxes/spec.md:286-289`) — the
  scenario is "deletes an empty box", so the UI gate is aligned with the spec.
  Code at `routes/boxes/[id].tsx:317-348` _also_ re-checks emptiness on POST and
  re-renders an error if the box is no longer empty (race-safe). Good
  defense-in-depth.
- **Why it matters:** Mention for completeness — spec/code aligned.
- **Suggested fix direction:** No action.
- **Spec impact:** no spec needed

### capture-stateMachine-dead-code

- **Severity:** Major
- **Evidence:** `lib/capture/stateMachine.ts:1-47` defines a typed reducer
  (`captureReducer`, `initialCaptureState`) covering all the capture state
  transitions. `grep -rn` shows the only caller is
  `tests/unit/capture/state.test.ts`. The production island
  `islands/ContinuousCapture.tsx:23-44` reimplements the state machine inline
  with `useSignal` and ad-hoc string phases.
- **Why it matters:** Spec `openspec/specs/continuous-capture/spec.md:62-95`
  defines exactly three observable states (`starting`, `in-progress`, `closed`)
  and very specific transitions. The reducer encodes them correctly — but the
  island uses _four_ states (`idle`, `starting`, `in-progress`, `closed`), which
  drifts from both the spec and the tested reducer. Concretely:
  - Spec says first shutter tap of an item: `starting → in-progress`. Island
    treats first tap from `idle` as a "request camera" tap that does NOT capture
    a photo (correct per "Permission prompt does not consume the first shot"
    requirement at `spec.md:164-178`), but renames the spec's `starting` state
    to `idle` and the post-permission state to `starting`. The naming mismatch
    makes the code harder to map back to the spec.
  - The unit tests pass against the reducer but never against the island, so a
    future bug in the island's transition logic will not surface.
- **Suggested fix direction:** Either (a) refactor the island to consume
  `captureReducer` via `useReducer`, ensuring tests cover production; or (b)
  delete `stateMachine.ts` + tests and add direct tests of the island's
  behavior. Update the spec's state names if the four-state model is what we
  actually want.
- **Spec impact:** drifted (code does what the spec means, with different names;
  the typed reducer is unused)

### capture-selectCaptureSurface-dead-code

- **Severity:** Minor
- **Evidence:** `lib/capture/fallbackLogic.ts:8-12` defines
  `selectCaptureSurface`. The wrapper `components/CaptureSurface.tsx:14-16`
  ignores it and always renders `<ContinuousCapture />`. The island then makes
  its own runtime decision via `isContinuousCaptureSupported`.
- **Why it matters:** Pure dead code in production; only used in unit tests.
  Adds confusion when reading the codebase.
- **Suggested fix direction:** Either inline the helper at the `CaptureSurface`
  boundary (server-render the file-input path when `getUserMedia` is unknown) or
  delete the helper + tests.
- **Spec impact:** no spec needed

### capture-preview-spec-only-mentions-photo-capture

- **Severity:** Minor
- **Evidence:** `openspec/specs/capture-preview/spec.md:9-29` says "the capture
  island MUST display a horizontal strip of thumbnail images". This is satisfied
  by `PhotoCapture` (the fallback file-input island) at
  `islands/PhotoCapture.tsx:158-165` and by `ContinuousCapture` at
  `islands/ContinuousCapture.tsx:211-217`. The spec is implicitly about both
  islands but never names them.
- **Why it matters:** Spec language is ambiguous about "the capture island" now
  that there are two. A future contributor implementing a third capture path
  might overlook the requirement.
- **Suggested fix direction:** Update the capture-preview spec to say "every
  capture island" or list both explicitly.
- **Spec impact:** gap in spec

### capture-preview-count-on-continuous

- **Severity:** Minor
- **Evidence:** `openspec/specs/capture-preview/spec.md:32-46` ("Photo count is
  shown next to the 'add another' button") is met by `PhotoCapture` (line 170:
  `${t("items.addAnotherPhoto")} (${count})`). The `ContinuousCapture` island
  does NOT show a count next to the shutter button
  (`islands/ContinuousCapture.tsx:222-228` shows only `shutterLabel`).
- **Why it matters:** Spec scenario "Count reflects photos taken so far" reads
  "the user has captured N photos and the multi-photo state is active — THEN the
  'Weiteres Foto' label shows the count N in parentheses." In
  `ContinuousCapture` there is no "Weiteres Foto" button per se (the shutter is
  reused), but the thumbnail strip count is the implicit replacement. The
  literal text of the spec does not match the continuous-capture UI.
- **Suggested fix direction:** Either add a count badge to the
  continuous-capture shutter or amend the spec to say "the count is reflected in
  the visible thumbnail strip" and explicitly exempt `ContinuousCapture` from
  showing it as text.
- **Spec impact:** drifted (continuous-capture island missing the count text)

### continuous-capture-state-name-drift

- **Severity:** Minor
- **Evidence:** Spec `openspec/specs/continuous-capture/spec.md:62-95`
  enumerates three observable states: `starting`, `in-progress`, `closed`.
  Island `islands/ContinuousCapture.tsx:19` declares
  `type Phase = "idle" | "starting" | "in-progress" | "closed"` — the entry
  point is `idle`, not `starting`. The transition the spec calls
  `starting → in-progress` is in the code `starting → in-progress`, but the
  spec's `starting` (pre-first-photo, post-camera-ready) maps to the island's
  `starting`. Actually after re-reading: the island's `idle` is "before camera
  permission grant", which the spec does not explicitly name — see the
  "Permission prompt does not consume the first shot" requirement.
- **Why it matters:** The mismatch is small but real: spec readers cannot tell
  where "before the user has activated the camera" sits in the state machine.
- **Suggested fix direction:** Add an explicit "idle / activation" state to the
  continuous-capture spec's state machine requirement, or rename the island's
  `idle` to make the mapping unambiguous.
- **Spec impact:** gap in spec

### inventory-category-error-swallows-real-failures

- **Severity:** Minor
- **Evidence:** `routes/categories/index.tsx:86-88` catches every exception in
  `createCategory` and surfaces it as `t("categories.error.duplicate")`. The
  same pattern at `routes/categories/index.tsx:97-99` maps every
  `deleteCategory` failure to `t("categories.error.in_use")`.
  `routes/rooms/index.tsx:81-83` and `:92-94` do the same for rooms.
- **Why it matters:** A KV outage, validation error, or unexpected throw is
  presented to the user as "duplicate" or "in use" — the user retries with a
  different name, hits the same generic error, and there is no operational
  signal. CLAUDE.md §13 forbids "defensive checks for things that can't happen"
  but also implicitly forbids hiding real errors as misleading user copy.
- **Suggested fix direction:** Distinguish the well-known duplicate/in-use
  exceptions (custom error class or sentinel) from unexpected ones; rethrow or
  log+500 on unknown errors instead of misclassifying them.
- **Spec impact:** no spec needed (implementation quality)

### inventory-category-blank-name-not-validated

- **Severity:** Minor
- **Evidence:** `lib/inventory/categoryRepo.ts:11-35` accepts any string for
  `name`, including empty/whitespace. The HTML `required` attribute on
  `routes/categories/index.tsx:31` guards the browser path, but
  `createCategory("")` from any other call site (admin tools, future API) would
  happily store a category with empty name. Same for
  `lib/inventory/roomRepo.ts:11-34`.
- **Why it matters:** Spec `openspec/specs/inventory/spec.md:13-15` says "POSTs
  a non-empty category name". The boundary check sits in the HTML form, not in
  the repo layer. Falls back to "trust internal invariants" (CLAUDE.md §13), but
  the route trims and forwards the empty string without re-checking.
- **Suggested fix direction:** Either (a) reject blank/whitespace names at the
  route, or (b) move the check into the repo create function.
- **Spec impact:** gap between spec and code (relies on HTML-only validation)

### inventory-deleteCategory-name-key-mismatch

- **Severity:** Critical
- **Evidence:** `lib/inventory/categoryRepo.ts:67` calls
  `CAT_BY_NAME_KEY(category.name)`. The key builder at line 5-8 lowercases the
  name. `createCategory` stores the key with `name.toLowerCase()` at line 14
  (`CAT_BY_NAME_KEY(name)` -> `name.toLowerCase()`). So delete also lowercases
  via the same builder — actually consistent. No bug. Withdrawing.
- **Why it matters:** N/A
- **Suggested fix direction:** N/A
- **Spec impact:** no spec needed

### inventory-pending-list-loads-all-items

- **Severity:** Minor
- **Evidence:** `routes/items/pending.tsx:68-75` calls `listItems()` (full scan)
  and filters in-memory for `status === "pending"`. Spec
  `openspec/specs/inventory/spec.md:233-251` does not mandate a pending-specific
  index; it just specifies the output. But `items-browse-performance` spec (see
  below) is explicit about avoiding full scans on `/items`. The pending route is
  exempt because the spec does not require pagination, but the full-scan pattern
  will degrade once the inventory grows.
- **Why it matters:** Post-MVP the pending list will scan every item; works fine
  for hundreds, slows past thousands.
- **Suggested fix direction:** Either add an `item-by-status` index, or paginate
  the pending route, or accept the slowdown explicitly in the spec.
- **Spec impact:** gap in spec / acceptable for MVP scale

### inventory-itemRepo-normalizeItem-any

- **Severity:** Nit
- **Evidence:** `lib/inventory/itemRepo.ts:98-107` uses
  `// deno-lint-ignore no-explicit-any` to accept any-shaped KV row for
  normalization (legacy-record support). This is intentional and well-isolated.
- **Why it matters:** Acceptable use of `any` — flagged so the senior-dev
  "type-safety escape hatches" item has a record.
- **Suggested fix direction:** No action; the comment justifies it. Optionally
  type as `Partial<Item> & Record<string, unknown>` to recover some safety.
- **Spec impact:** no spec needed

### inventory-itemRepo-coerceQuantity-from-string-fails

- **Severity:** Major
- **Evidence:** `lib/inventory/itemRepo.ts:52-55` accepts only `number` for the
  `quantity` input, returning 1 for any string/other value.
  `routes/items/new.tsx:144` parses `parseInt(quantityRaw, 10)` and passes a
  number, so the happy path works. But: if `createItem`/`updateItem` is ever
  called with `quantity: "6"` (e.g. via a future API route that forgot to
  parse), the input is silently coerced to 1. Equivalent KV write succeeds with
  the wrong value — no validation error.
- **Why it matters:** Spec `openspec/specs/inventory/spec.md:58-65` requires
  `quantity` to be a positive integer with minimum value 1. Silent coercion to 1
  violates "fail loudly" — a buggy caller would never see the bug.
- **Suggested fix direction:** Treat non-number input as a validation error:
  throw, or document that the function expects a parsed number and validate at
  every route boundary.
- **Spec impact:** gap between spec and code (the spec is in terms of the value;
  the code is in terms of the JS type)

### invites-no-csrf-on-confirmation

- **Severity:** Minor
- **Evidence:** `routes/invite/[code].tsx:62-86` POST handler does NOT validate
  any CSRF token; the consume action depends only on the URL secret. The
  middleware's `csrfGuard()` only runs when `ctx.state.user` is set, so
  unauthenticated POSTs bypass it. Spec `openspec/specs/invites/spec.md:65-107`
  does not explicitly require a CSRF token for the confirmation step.
- **Why it matters:** The invite code itself is the secret. Without CSRF an
  attacker on another origin could POST to a known invite URL and trigger
  consumption — but they would need to know the code, which is already the
  secret. Risk is limited to a session being created in the attacker's browser,
  not the victim's. Worth a sentence in the spec to confirm intent.
- **Suggested fix direction:** Add a one-line scenario in invites spec
  explicitly noting that the confirmation POST does not require a CSRF token
  (the invite secret is the only credential).
- **Spec impact:** gap in spec

### invites-codeLookup-deterministic-vs-pwd-hash

- **Severity:** Minor
- **Evidence:** `lib/invites/generate.ts:19-26` stores a SHA-256 of the raw code
  in `codeLookup` and indexes it under `["invite-by-code", lookup]`. Spec
  `openspec/specs/invites/spec.md:154-158` only requires the stored
  representation to be an Argon2id hash. The lookup index is a separate value
  stored alongside the Argon2 hash.
- **Why it matters:** The spec is satisfied (Argon2id is stored). But the
  SHA-256 lookup key is itself a deterministic hash of the raw code. Anyone with
  KV access could brute-force the SHA-256 (which is fast) to recover the raw
  codes, defeating the Argon2id protection. Codes are 20 random bytes (>=160
  bits entropy) so brute-forcing is currently infeasible, but the layered hash
  gives a false sense of security.
- **Suggested fix direction:** Either document this trade-off explicitly in
  invites/spec.md, or HMAC the lookup with `SERVUS_SESSION_KEY` so a KV dump
  alone cannot enumerate codes.
- **Spec impact:** gap in spec

### invites-rate-limit-counts-successes

- **Severity:** Minor
- **Evidence:** `lib/invites/rateLimit.ts:18-47` increments on every GET/POST
  regardless of outcome. Same pattern as the login rate limiter. Spec
  `openspec/specs/invites/spec.md:125-143` says "more than the allowed number of
  GET requests" — it does not specify failed-only, so the impl is compliant.
  Just consistent with the inconsistency in auth rate limiting.
- **Why it matters:** A helper who pulls the invite page, gets distracted,
  refreshes a dozen times, and then confirms can be locked out on their own
  invite. Threshold is 10 in 15 min, slightly tight.
- **Suggested fix direction:** Tune threshold or only count failed requests,
  matching the (intended) login behavior.
- **Spec impact:** no spec needed

### items-browse-cat-room-combined-undefined

- **Severity:** Minor
- **Evidence:** `routes/items/index.tsx:171-195` handles `?all=1`, `?cat&q`,
  `?cat`, `?room&q`, `?room`, `?q`, default. The combination `?cat=X&room=Y` (no
  `q`) falls into the `catFilter` branch only, which loads by category and _does
  not_ filter further by room. Spec
  `openspec/specs/items-browse-performance/spec.md:71-86` does not enumerate
  `cat+room`; the table is missing this row.
- **Why it matters:** A user who filters by both category and room sees items
  matching only the category, with the room filter silently ignored. Cheap bug
  if rare in practice.
- **Suggested fix direction:** Either add a combined branch (load by category,
  filter by `roomId === room`), or treat `?cat=X&room=Y` as overspecified and
  document which wins.
- **Spec impact:** drifted (UI sends both params; impl ignores room) / gap in
  spec

### lazy-thumbnails-only-applied-on-items-list

- **Severity:** Major
- **Evidence:** `routes/items/index.tsx:122` uses `data-src=`, satisfying the
  spec for the primary items list. But:
  - `routes/items/pending.tsx:36-43` uses `src=` directly.
  - `routes/boxes/[id].tsx:146-153` (item rows inside a box detail) uses `src=`
    directly. Spec `openspec/specs/lazy-thumbnails/spec.md:5-11` requires "Item
    thumbnail images in list views MUST use deferred loading". The pending list
    and box-detail item list are both list views.
- **Why it matters:** Box detail pages with many items pre-fetch every R2 URL on
  render (and burn presigned-URL "freshness"). Same for `/items/pending`. Spec
  drift; the lazy-loading mechanism in `app-init.js` would handle these for free
  if the markup used `data-src`.
- **Suggested fix direction:** Switch both call sites to `data-src=` and remove
  `loading="lazy"` (browser-native lazy is duplicative with the IO-based one).
- **Spec impact:** bug against existing spec

### lazy-thumbnails-no-placeholder-styling

- **Severity:** Minor
- **Evidence:** Spec `openspec/specs/lazy-thumbnails/spec.md:32-50` requires a
  placeholder of the same dimensions with shimmer (respecting reduced-motion).
  `static/styles.css` has no `.item-thumbnail` shimmer rules visible; the
  `<img>` tag has `width="40" height="40"` so the slot is reserved, but no
  shimmer animation or background is defined for un-`src`-ed images.
- **Why it matters:** While images load lazily, the empty slot is blank — no
  visual cue that something is loading.
- **Suggested fix direction:** Add a CSS rule `img.item-thumbnail:not([src])`
  with a muted background and an `@keyframes` shimmer; wrap in
  `@media (prefers-reduced-motion: no-preference)`.
- **Spec impact:** bug against existing spec

### photos-aws4fetch-dead-dependency

- **Severity:** Major
- **Evidence:** `lib/photos/signing.ts:1,6-13,351-352` imports and re-exports
  `AwsClient` from `aws4fetch`. The local `_makeClient` is unused (leading
  underscore, no callers). `lib/photos/r2.ts:21` references `aws4fetch` in a
  comment only — the actual signing is hand-rolled. `deno.json:35` declares the
  dep. No production code path calls `AwsClient` or `aws4fetch`.
- **Why it matters:** Violates CLAUDE.md §9 ("Before adding any dependency, ask:
  Can the Deno std library do this?"). The hand-rolled SigV4 is in two files,
  both duplicating a pure-JS SHA-256. The dep adds a maintenance surface
  (Renovate PRs, license audit) for zero benefit.
- **Suggested fix direction:** Drop the `aws4fetch` import and dependency.
  Either keep the hand-rolled signer (and dedupe SHA-256 into a shared module)
  or replace it with a maintained presign helper.
- **Spec impact:** no spec needed (dependency hygiene)

### photos-sha256-duplicated-across-files

- **Severity:** Major
- **Evidence:** Pure-JS SHA-256 + HMAC implementation appears twice:
  `lib/photos/signing.ts:165-348` (~185 lines) and `lib/photos/r2.ts:104-280`
  (~175 lines), with identical constants and slightly different naming.
- **Why it matters:** Bug fixes apply once; security-critical code copy-pasted
  with subtle naming differences is the worst kind of duplication. CLAUDE.md §13
  calls out "names over comments" but two copies share neither name nor comment.
- **Suggested fix direction:** Extract `sha256(bytes)` +
  `hmacSha256(key, bytes)` to `lib/crypto/sha256.ts` and import from both files.
- **Spec impact:** no spec needed (refactor)

### photos-presigned-put-content-type-not-bound-in-r2-rules

- **Severity:** Minor
- **Evidence:** `lib/photos/uploadUrlApi.ts:48` calls
  `presignPut(r2cfg, key, contentType, 300)`. `lib/photos/signing.ts:38` signs
  `content-type;host` headers. Spec `openspec/specs/photos/spec.md:152-153`
  requires the presigned URL to "encode a Content-Type constraint matching the
  declared type" — the SigV4 binding satisfies this only if the client sends the
  matching `Content-Type` header at PUT time. R2 will reject a mismatched header
  (good).
- **Why it matters:** Working as intended. Worth noting: the only enforcement is
  the signature mismatch at PUT time; if the bucket somehow ignored the signed
  headers, mismatched uploads would succeed. Trust R2.
- **Suggested fix direction:** No action; flag for awareness.
- **Spec impact:** no spec needed

### quantity-island-no-auth-check-direct-in-handler

- **Severity:** Minor
- **Evidence:** `routes/api/items/adjust-quantity.ts:4-19` and the
  api/photos/upload-url, create-from-photo, append-photo, remove-photo routes do
  not themselves check `ctx.state.user`. They rely entirely on `requireAuth`
  middleware to have rejected unauthenticated requests before this handler runs.
  Spec `openspec/specs/quantity-island/spec.md:11` requires unauth POSTs to
  return 403; the current behavior is to return 401 (from middleware).
- **Why it matters:** Spec says 403; middleware returns 401. Minor wording
  mismatch — `401 Unauthorized` is more correct for "no session",
  `403 Forbidden` is for "session present but action denied". Spec text should
  be updated to 401.
- **Suggested fix direction:** Update the spec from 403 → 401 for
  unauthenticated requests; keep 403 for "missing CSRF" cases. Today the
  middleware returns 401, which is HTTP-correct.
- **Spec impact:** drifted (code is HTTP-correct, spec wording wrong)

### quantity-island-adjustQuantity-not-found

- **Severity:** Minor
- **Evidence:** `lib/inventory/itemRepo.ts:257-265` `adjustQuantity` throws
  `Error("Item '${id}' not found")` if the item is missing.
  `lib/inventory/adjustQuantityApi.ts:26` calls it and does not catch. The route
  handler at `routes/api/items/adjust-quantity.ts:13` likewise does not catch,
  so a 500 propagates.
- **Why it matters:** A client could exhaust 500s on missing IDs. Returning 404
  (item not found) is more useful for the island error handler, which reverts
  the optimistic value on any non-ok response.
- **Suggested fix direction:** Have `handleAdjustQuantityPost` look up the item
  first and return `{ status: 404 }` if missing; or wrap the call in a try/catch
  that maps the known error to 404.
- **Spec impact:** no spec needed

### archive-add-authentication-log-redaction-unused

- **Severity:** Major
- **Evidence:** Task 8.2 of `2026-05-28-add-authentication/tasks.md` says
  "Implement `lib/log.ts` and replace direct `console.*` calls in auth code
  paths." `lib/log.ts` is implemented but `grep -rn "from \"@/lib/log"` returns
  only its own test. `lib/auth/seed.ts:35,43,48` still uses `console.log/error`;
  `routes/api/photos/upload-url.ts:18` uses `console.error`; multiple islands
  use `console.error`. The redaction logic is never exercised in production.
- **Why it matters:** Spec `openspec/specs/auth/spec.md:301-309` requires
  sensitive values to never be logged. The redaction helper exists but nothing
  uses it. Today no auth code logs passwords/sessionIds, but the protection is
  not actually wired — a future contributor adding
  `console.log({ sessionId, ... })` will leak it.
- **Suggested fix direction:** Either delete `lib/log.ts` (and the test) as
  unused, or wire it as the canonical logger across `lib/auth/`, `lib/invites/`,
  `lib/photos/` and route handlers — and add a CI lint that flags raw
  `console.*` in those directories.
- **Spec impact:** bug against archived task (8.2 marked done, not done)

### archive-add-authentication-429-not-emitted

- **Severity:** Major
- **Evidence:** Task 5.1 of `2026-05-28-add-authentication/tasks.md`:
  "rate-limited responses return 429"; task 7.1: "10 failures → 429". Code emits
  200 (see `auth-rate-limit-returns-200-not-429` above). The threshold is 30,
  not 10 (see `auth-ip-rate-limit-threshold-drift`).
- **Why it matters:** Two checked-off tasks demonstrably don't match the code.
- **Suggested fix direction:** Already covered in the auth findings.
- **Spec impact:** task lied (bug against archived change)

### archive-add-boxes-and-codes-bulk-add-superseded

- **Severity:** Nit
- **Evidence:** Task 7.1 of `2026-05-30-add-boxes-and-codes/tasks.md` shipped a
  bulk-add textarea handler. The `2026-06-01-add-item-photos/proposal.md`
  explicitly removes it. Today there is no bulk-add anywhere, which is correct
  per the later change. The archived task is "still checked" but its artifact
  has been removed by a later archived change.
- **Why it matters:** Reviewer chasing the task history could be momentarily
  confused. Acceptable — OpenSpec evolves via deltas.
- **Suggested fix direction:** No action.
- **Spec impact:** no spec needed

### archive-box-lifecycle-deleteBox-cleanup-not-done

- **Severity:** Major
- **Evidence:** Task 6.2 of `2026-05-30-box-lifecycle-and-label/tasks.md`:
  "Remove the now-unused `deleteBox` export from `lib/inventory/boxRepo.ts` (or
  keep it as a wrapper for tombstoneDeleteBox if referenced elsewhere)." Neither
  happened. `deleteBox` still exists at `lib/inventory/boxRepo.ts:172-187`, is
  not a wrapper, and is not used in production.
- **Why it matters:** Dead-but-wrong code exported from a public module (see
  `boxes-deleteBox-no-tombstone` above for impact).
- **Suggested fix direction:** Delete the function or refactor as a wrapper.
- **Spec impact:** task partially complete

### archive-short-term-invite-codes-status-field-missing

- **Severity:** Nit
- **Evidence:** Task 1.1 of `2026-06-02-short-term-invite-codes/tasks.md`:
  define `Invite` type with `(id, hashedCode, expiry, createdAt, status)`.
  `lib/invites/types.ts:1-7` has no `status` field — consume/revoke are
  expressed via record deletion.
- **Why it matters:** Functionally identical (a deleted record is
  "consumed/revoked"). The task description didn't match what shipped.
- **Suggested fix direction:** No action; the deletion-based model is simpler.
  Future spec evolution could note the choice.
- **Spec impact:** task wording out-of-date

### archive-ui-design-polish-anti-flash-script-external

- **Severity:** Minor
- **Evidence:** Task 1.2 of `2026-06-02-ui-design-polish/tasks.md`: "Add
  anti-flash inline `<script>` in `<head>` of `_app.tsx`". The spec
  `openspec/specs/design-system/spec.md:81-83` also says "An inline `<script>`
  in `<head>`, before any stylesheet link, MUST read `localStorage`". Actual
  code (`routes/_app.tsx:19`) uses `<script src="/theme-init.js" />` — an
  external file.
- **Why it matters:** The external file works (browsers load it sync if not
  `async/defer`), but introduces a network round-trip on cold caches that an
  inline script would skip. The reason for the external file is presumably to
  satisfy the CSP nonce policy without injecting a nonce into every page.
- **Suggested fix direction:** Either accept the external load and update the
  spec wording to "a script in `<head>`, before any stylesheet link"; or use
  Fresh's per-request nonce on an inline `<script nonce={...}>` block.
- **Spec impact:** bug against existing spec / drift from archived task

### archive-add-continuous-capture-CaptureSurface-not-a-decider

- **Severity:** Major
- **Evidence:** Task 8.4 of `2026-06-03-add-continuous-capture/tasks.md`:
  "Implement the feature-detect parent component `components/CaptureSurface.tsx`
  that decides between `<ContinuousCapture>` and `<PhotoCapture>`." Actual
  `components/CaptureSurface.tsx:14-16` always renders `<ContinuousCapture>` and
  the _island_ does the runtime detection.
- **Why it matters:** Two consequences: (1) the public surface
  (`CaptureSurface`) doesn't do what its task description says; (2) every page
  that uses `CaptureSurface` ships the `ContinuousCapture` island JS even when
  the browser doesn't support it — only at runtime is the fallback chosen, which
  still loads the island.
- **Suggested fix direction:** Either (a) do the feature detection in the server
  component (no JS at all on unsupported browsers), or (b) accept the
  runtime-only approach and update the task/spec to describe it.
- **Spec impact:** drifted from archived task

### senior-dead-code-summary

- **Severity:** Major
- **Evidence:** Production code that is exported, type-checked, and tested, but
  never called from any route or island:
  - `lib/inventory/boxRepo.ts:172-187` `deleteBox`
  - `lib/auth/sessionRepo.ts:79-93` `touchSession` (production-relevant logic
    skipped — see auth findings)
  - `lib/auth/sessionRepo.ts:66-76` `listSessionsForUser` (no callers anywhere)
  - `lib/capture/stateMachine.ts:1-47` `captureReducer` / `initialCaptureState`
  - `lib/capture/fallbackLogic.ts:8-12` `selectCaptureSurface`
  - `lib/log.ts:10-26` `redact` / `log` (only ever called from its own test)
  - `lib/photos/signing.ts:1,6-13,351-352` `AwsClient` import + re-export +
    `_makeClient`
  - SHA-256 duplicated across `lib/photos/signing.ts` and `lib/photos/r2.ts`
- **Why it matters:** Each item is either a bug-in-waiting (someone calls the
  wrong function) or unjustified weight (Renovate noise, bundle size, mental
  load). CLAUDE.md §13 is explicit: "no half-finished implementations".
- **Suggested fix direction:** Delete or wire-up; do not leave unused exports.
- **Spec impact:** no spec needed

### senior-error-swallow-summary

- **Severity:** Major
- **Evidence:** Error handlers that map every exception to a misleading
  user-facing string:
  - `routes/categories/index.tsx:86-88,97-99` — every create/delete failure
    becomes "duplicate" / "in use".
  - `routes/rooms/index.tsx:81-83,92-94` — same pattern.
  - `routes/boxes/[id].tsx:270-272` `buildThumbnailUrls` swallows any error and
    returns empty.
  - `routes/items/index.tsx:212` and `routes/items/pending.tsx:88` swallow
    `getR2Config` errors silently (acceptable for "R2 not configured" but masks
    misconfigured credentials).
  - `routes/items/[id].tsx:119,141` swallow R2 config errors silently.
- **Why it matters:** A real bug (KV outage, malformed config, etc.) is shown to
  the user as a domain error or hidden entirely. Operationally there is no
  signal.
- **Suggested fix direction:** Distinguish expected errors (sentinel class or
  instanceof check) from unexpected ones; log+rethrow the unexpected.
- **Spec impact:** no spec needed

### senior-type-safety-escape-hatches

- **Severity:** Nit
- **Evidence:** Type-safety escape hatches found:
  - `lib/inventory/itemRepo.ts:98` `// deno-lint-ignore no-explicit-any` —
    intentional for legacy record normalization, isolated.
  - `lib/capture/shutterLogic.ts:31` `videoEl as unknown as CanvasImageSource` —
    works around mismatched DOM lib; pragmatic.
  - `lib/auth/sessionCookie.ts:57`
    `const sig = new Uint8Array(sigBytes).buffer as ArrayBuffer` — `.buffer` is
    already `ArrayBuffer | SharedArrayBuffer`; cast is to narrow the union for
    Web Crypto.
  - Multiple `as string | null` and `as string` on form values across routes
    (e.g. `routes/items/new.tsx:117-122`) — Fresh `FormData.get` returns
    `FormDataEntryValue | null` and the cast is a manual narrowing. Mostly safe
    but if a file input were ever named `"name"` it would be a `File` object.
- **Why it matters:** None individually critical; the form-value casts are the
  most likely to bite.
- **Suggested fix direction:** Centralize form parsing into a tiny helper
  (`getString(form, name)` returning a trimmed string or empty) so the cast
  lives in one place.
- **Spec impact:** no spec needed

### senior-dependency-violations

- **Severity:** Major
- **Evidence:** `aws4fetch` is in `deno.json:35` but no production code uses it
  (see `photos-aws4fetch-dead-dependency`). CLAUDE.md §9 says: "Can the Deno std
  library do this? If yes, use it" — the hand-rolled SigV4 in
  `lib/photos/signing.ts` and `lib/photos/r2.ts` proves we don't need an SDK.
- **Why it matters:** Direct §9 violation. Renovate will keep proposing updates
  to an unused dep.
- **Suggested fix direction:** Remove the import.
- **Spec impact:** no spec needed

### senior-no-tests-for-route-handlers

- **Severity:** Minor
- **Evidence:** `tests/unit/` has comprehensive coverage of `lib/`.
  `tests/integration/` covers KV repos via `lib/`. Route handlers
  (`routes/items/index.tsx`, `routes/boxes/[id].tsx`,
  `routes/categories/index.tsx`, etc.) are only exercised end-to-end through
  Playwright. The dispatch table in `routes/items/index.tsx` has integration
  coverage via `itemsRouteDispatch_test.ts`; most other routes are not
  unit-tested.
- **Why it matters:** When the e2e suite is flaky or skipped, route bugs slip
  through. Integration tests against an in-memory KV would be a faster signal.
- **Suggested fix direction:** Add integration tests for `routes/boxes/[id].tsx`
  action handlers (delete, mark_delivered, place_item, unpack_all, remove_item),
  `routes/categories/index.tsx`, `routes/rooms/index.tsx`, and the api/photos
  route.
- **Spec impact:** no spec needed

### senior-no-TODO-FIXME-in-source

- **Severity:** Nit
- **Evidence:** `grep -rn "TODO\|FIXME\|XXX"` over `lib/`, `routes/`,
  `islands/`, `components/` returns nothing. Clean.
- **Why it matters:** Positive finding.
- **Suggested fix direction:** No action.
- **Spec impact:** no spec needed

### senior-hot-path-quality

- **Severity:** Minor
- **Evidence:** Hot-path review:
  - **Login** (`lib/auth/loginHandler.ts`): dummy-hash for constant-time is
    good; rate-limit increment-then-decrement-on-success pattern would be ideal
    but absent (already flagged).
  - **Items list** (`routes/items/index.tsx`): dispatch table is correct;
    `listItemsByRoom` and `listItemsByCategory` each do N round trips via
    `findItem` rather than batching — for hundreds of items this is fine, for
    thousands it will be slow.
  - **Capture upload** (`islands/PhotoCapture.tsx`,
    `islands/ContinuousCapture.tsx`): pipeline is clean (resize → presign → PUT
    → link). Errors carry HTTP status into the user-facing message via i18n —
    good.
- **Why it matters:** N+1 read pattern on category/room filter is the next
  bottleneck after the recent/limited optimization. For MVP scale (small move)
  it doesn't matter.
- **Suggested fix direction:** Document the N+1 in a decision note; revisit if
  item count grows past low thousands.
- **Spec impact:** no spec needed

### senior-inventory-suggested-status-undocumented

- **Severity:** Minor
- **Evidence:** `lib/inventory/types.ts:35`
  `ItemStatus = "pending" | "suggested" | "confirmed"`. Spec
  `openspec/specs/inventory/spec.md` only references `pending` and `confirmed`.
  `grep -rn "\"suggested\"\|status: \"suggested\""` finds no production write
  site.
- **Why it matters:** A type that admits values nothing produces is a confusing
  dead variant.
- **Suggested fix direction:** Remove `"suggested"` from the union, or add a
  spec requirement explaining when it's set.
- **Spec impact:** gap in spec

### senior-csp-cache-control-only-on-html-with-nonce

- **Severity:** Nit
- **Evidence:** `lib/auth/middleware.ts:168-170` sets `Cache-Control: no-store`
  only when a CSP nonce was injected. Pages without islands (no nonce) get no
  Cache-Control header, so a downstream proxy could cache HTML across user
  sessions. The current deployment uses Deno Deploy directly with no
  intermediary cache, so this is theoretical.
- **Why it matters:** If Cloudflare ever sits in front of the app, page bodies
  could be cached for cross-user serving.
- **Suggested fix direction:** Apply `Cache-Control: private, no-store` to every
  text/html response, not only nonce-bearing ones.
- **Spec impact:** gap in spec

## Deferred

- Pending items list scales linearly with total item count
  (`inventory-pending-list-loads-all-items`); add `item-by-status` index once
  corpus grows past low thousands.
- N+1 read pattern in `listItemsByCategory` / `listItemsByRoom` could be batched
  (`senior-hot-path-quality`).
- `Invite` type could regain a `status` field if revoked/used distinction
  becomes useful (`archive-short-term-invite-codes-status-field-missing`).
- Consider HMACing the invite codeLookup with `SERVUS_SESSION_KEY` to defeat
  KV-dump enumeration (`invites-codeLookup-deterministic-vs-pwd-hash`).
- Apply `Cache-Control: private, no-store` to all HTML responses (currently only
  when CSP nonce is injected) once a CDN sits in front of the app.
- Refactor `ContinuousCapture.tsx` to consume the `captureReducer` from
  `lib/capture/stateMachine.ts` so unit tests cover production behavior.
- Consider moving feature detection into the server-side `CaptureSurface`
  component so unsupported browsers don't ship the island JS.
