# Security + Architecture — findings

Append findings here as you discover them. Never delete. Format per finding:

### <id-short-slug>

- **Severity:** Blocker | Critical | Major | Minor | Nit
- **Evidence:** file:line refs, or repro steps (note which browser tool used)
- **Why it matters:** one sentence
- **Suggested fix direction:** the shape, not the diff
- **Spec impact:** bug against existing spec | gap in spec | new behavior, needs
  proposal | no spec needed

---

## Findings

### csrf-skipped-on-public-mutations

- **Severity:** Minor
- **Evidence:** `lib/auth/middleware.ts:244`
  (`if (!ctx.state.user) return ctx.next();`) — `csrfGuard()` is a no-op when
  there is no session. The public mutation surface is `/login` POST and
  `/invite/[code]` POST.
- **Why it matters:** `/login` is fine (SameSite=Strict on the cookie it issues;
  bad-attempt rate limit). `/invite/[code]` POST is the real concern: a
  third-party site can submit a POST that consumes a valid invite URL on behalf
  of any visitor whose browser hits that site. The attacker doesn't get
  authentication, but the invite is burned and the visitor ends up with a helper
  session they did not request. Defence-in-depth.
- **Suggested fix direction:** Require a confirmation token issued by the GET on
  `/invite/[code]` and validated on POST (double-submit cookie or a short-lived
  HMAC-signed nonce embedded in the form). Alternatively, accept the risk and
  document it in the invites spec under "Non-goals".
- **Spec impact:** gap in spec — invites spec is silent on cross-site
  invite-consumption

### dev-route-exposed-in-production

- **Severity:** Minor
- **Evidence:** `routes/dev/capture-test.tsx:1-28`. It is a real Fresh route,
  picked up by `fsRoutes()` in `main.ts:25`, gated only by `requireAuth`. The
  handler comment ("Dev-only harness") is the only thing keeping people out.
- **Why it matters:** Any authenticated user (including a helper) can hit
  `/dev/capture-test`. The page itself is harmless display, but it embeds the
  `PhotoCapture` island in `append` mode with a hard-coded `itemId="__dev__"`.
  Append uploads from this island go to `/api/items/append-photo` which 404s on
  the missing item (`lib/inventory/appendPhotoApi.ts:26-28`), but the user can
  still use the page to obtain presigned R2 upload URLs and dump objects into
  the bucket. Pollutes storage and CSP, signals the dev surface to anyone
  snooping.
- **Suggested fix direction:** Skip dev routes in production:
  `if (Deno.env.get("DENO_DEPLOYMENT_ID")) return new Response("not found", { status: 404 });`
  at the top of every `/dev/*` handler, or move the file under `dev.ts` only by
  deleting/relocating it before `deno task build`.
- **Spec impact:** no spec needed

### csp-style-src-unsafe-inline

- **Severity:** Minor
- **Evidence:** `lib/auth/middleware.ts:154` always includes `'unsafe-inline'`
  in `style-src`. Multiple `style="display:inline|none"` attributes exist in
  routes/islands (`routes/boxes/[id].tsx:81`, `routes/items/[id].tsx:89`,
  `islands/PhotoCapture.tsx:177`, etc.).
- **Why it matters:** Inline styles are an XSS uplift vector — if an attacker
  lands stored content into HTML, they can use CSS to exfiltrate via
  `background:url(http://attacker)`. The display:inline/display:none uses here
  are mechanical and could be replaced with utility classes; that would let CSP
  drop `'unsafe-inline'` entirely.
- **Suggested fix direction:** Replace the handful of `style="display:..."`
  attributes with utility classes (`.inline`, `.hidden`) and tighten CSP to
  `style-src 'self'`. Not blocking for go-live.
- **Spec impact:** no spec needed

### csp-script-src-fallback-is-dead-permission

- **Severity:** Nit
- **Evidence:** `lib/auth/middleware.ts:146-148` — when no nonce is found,
  `script-src 'self' 'unsafe-inline'` is emitted.
- **Why it matters:** Pages with no islands have no inline scripts to need
  `'unsafe-inline'`; the fallback weakens CSP without enabling anything. If a
  future change ever adds an inline script, it will work in CSP terms but slip
  past the nonce model.
- **Suggested fix direction:** Drop the fallback to `script-src 'self'`. If a
  page-without-islands ever needs a nonce, the existing nonce path will still
  fire (it currently keys on Fresh's nonce regex which only matches when an
  island boot tag is rendered).
- **Spec impact:** no spec needed

### csp-html-buffering-defeats-streaming

- **Severity:** Minor
- **Evidence:** `lib/auth/middleware.ts:191-216` — `securityHeaders()` calls
  `await response.text()` on every HTML response to extract the nonce, then
  rewraps the body.
- **Why it matters:** Fresh 2's streaming SSR is undone for every HTML response;
  large pages must fully buffer in memory before bytes can leave. For a 2-user
  app this is fine; surface as a latency/architecture nit so future scaling work
  is aware.
- **Suggested fix direction:** Have Fresh expose the per-request nonce via
  `ctx.state` so the middleware can read it without inspecting the body. Open a
  Fresh upstream issue, or hardcode the nonce generation in middleware so we own
  it.
- **Spec impact:** no spec needed

### duplicated-sigv4-and-pure-js-sha256

- **Severity:** Major (architecture)
- **Evidence:** `lib/photos/signing.ts:80-353` and `lib/photos/r2.ts:36-280`
  each contain an inlined pure-JS SigV4 presign implementation and pure-JS
  SHA-256/HMAC. They are byte-for-byte copies. The file-level comment in
  `r2.ts:104-105` acknowledges this ("Duplicated from signing.ts to keep r2.ts
  independently testable").
- **Why it matters:** Two cryptographic implementations means two places to get
  wrong; a fix or constant-time tweak applied to one will silently diverge from
  the other. The "synchronous SubtleCrypto" justification (`signing.ts:139-145`)
  is misleading — every caller is in an async context already;
  `crypto.subtle.digest` would work fine and remove ~500 lines of hand-rolled
  crypto. Reviewers cannot easily verify the SigV4 spec compliance because of
  the duplication.
- **Suggested fix direction:** Make presign functions `async` and use the
  platform's `crypto.subtle.digest`/`importKey('HMAC')`/`sign`. Move the shared
  signer into a single module that both `signing.ts` and `r2.ts` import. Drop
  the inlined pure-JS SHA-256.
- **Spec impact:** no spec needed (internal refactor)

### r2-cfg-cached-per-request

- **Severity:** Nit
- **Evidence:** `routes/items/index.tsx:209`, `routes/items/[id].tsx:118`,
  `routes/items/pending.tsx:85`, `routes/boxes/[id].tsx:266`,
  `routes/items/[id]/edit.tsx:151` — every render that needs presigned GETs
  calls `getR2Config()` which does three `Deno.env.get` lookups.
- **Why it matters:** Trivial perf; bigger concern is that any page render
  throws 500 if R2 env vars happen to be missing, even for read-only paths that
  have no photos. Worth wrapping in a memoized helper.
- **Suggested fix direction:** Cache `getR2Config()` result at module load;
  treat absent config as "no thumbnails" rather than throwing.
- **Spec impact:** no spec needed

### photo-key-trusted-from-client

- **Severity:** Major
- **Evidence:** `lib/inventory/appendPhotoApi.ts:17-33` and
  `lib/inventory/createFromPhotoApi.ts:22-39` accept `photoKey` straight from
  the request body and store it on the item with no format validation.
  `lib/photos/keys.ts:1-5` generates 64-char hex keys.
- **Why it matters:** The server never checks that the supplied `photoKey` (a)
  matches the generated format, (b) was actually uploaded, or (c) doesn't
  contain path-traversal characters. A malicious authenticated client can set
  `photoKey` to any string — e.g. `../../etc/passwd` — and that string is then
  concatenated into the presigned GET URL at render time (`presignGet` does
  `new URL(\` ${cfg.publicUrl}/${key}\`)`). URL parsing will normalise`..` and
  break out of the bucket prefix, producing a signed URL pointing at a sibling
  path. R2 will 404 (and the signature covers that other path), but the
  canonical-request still includes the attacker-controlled key. Also enables
  attaching arbitrary attacker-known R2 keys to any item.
- **Suggested fix direction:** Validate `photoKey` matches `/^[0-9a-f]{64}$/`
  (the exact shape `generatePhotoKey` produces). Track issued keys (server-side
  set in KV during `/api/photos/upload-url`) and reject any append that
  references an unknown key.
- **Spec impact:** new behavior, needs proposal (a "photo ownership / key
  lifecycle" requirement is missing from the photos work)

### item-update-missing-version-check

- **Severity:** Minor
- **Evidence:** `lib/inventory/itemRepo.ts:161-230` — `updateItem` reads
  `existing` via `findItem(id)`, computes the new value, and commits via
  `kv.atomic().set(...).commit()` _without_ an `.check({ key, versionstamp })`
  guarding the write. Same shape in `deleteItem` (`:267-285`). `updateBox`
  (`lib/inventory/boxRepo.ts:97-116`) has the identical pattern.
- **Why it matters:** Concurrent edits to the same item silently
  last-write-wins, including the index reconciliation logic (`:201-219`). If two
  users move the same item between rooms at the same time, the index can be left
  referencing the _earlier_ room while the item record points at a different one
  — exactly the inconsistency the atomic block is supposed to prevent. Two-user
  app, but the wife and husband editing during the move together is plausible.
- **Suggested fix direction:** Pass the entry returned by `findItem` (or change
  `findItem` to expose the versionstamp) and add
  `.check({ key: ITEM_KEY(id), versionstamp: existingEntry.versionstamp })` to
  every atomic update/delete. Retry once on `result.ok === false`.
- **Spec impact:** gap in spec — inventory spec says "Atomic writes keep indexes
  consistent" but does not pin down concurrent-update semantics

### thick-box-detail-route

- **Severity:** Minor (architecture)
- **Evidence:** `routes/boxes/[id].tsx` is 427 lines. The POST handler at
  `:309-426` branches on a `_action` form field into 6 different workflows
  (`delete`, `mark_delivered`, `assign_room`, `place_item`, `unpack_all`,
  `remove_item`) — each containing real business logic (e.g. `place_item` at
  `:369-388` decides "if no items remain, tombstone-delete the box"). Similarly
  `routes/items/[id]/edit.tsx` (257 lines) and `routes/items/new.tsx` (163
  lines) carry rendering + form parsing + multi-step workflows together.
- **Why it matters:** CLAUDE.md §4: "route files stay thin … all business logic
  lives in `lib/` and is called from route handlers". The "unpack box, possibly
  tombstone" sequence is exactly the kind of multi-step domain workflow that
  should live in `lib/inventory/` (or a new `lib/moving/`) where it can be
  unit-tested without spinning up Fresh. As written, the only way to verify
  these workflows is the Playwright suite, which is the slowest test layer.
- **Suggested fix direction:** Extract each `_action` branch into a named
  function in `lib/inventory/` (`placeItem(boxId, itemId, roomId)`,
  `unpackAll(boxId)`, etc.) that returns either a redirect target or a re-render
  hint. Route handler becomes a 3-line dispatcher.
- **Spec impact:** no spec needed (refactor)

### dead-aws4fetch-dependency

- **Severity:** Nit
- **Evidence:** `deno.json:36` declares `aws4fetch@1.0.20`. Only
  `lib/photos/signing.ts:1` imports it; the use sites are `_makeClient`
  (`:6-13`, underscore-prefixed = unused) and a re-export (`:352`). Grep across
  `routes/`, `islands/`, `components/` finds no consumer.
- **Why it matters:** A dependency that ships in the bundle but isn't used adds
  attack surface (Renovate alerts, type-juggling), and the inline comment at
  `signing.ts:81-83` calling out _why_ aws4fetch doesn't work for presigning
  suggests the team has already decided it's not the right tool.
- **Suggested fix direction:** Remove the `aws4fetch` entry from `deno.json` and
  delete the dead `_makeClient`/re-export. If the long-term plan is to switch to
  it, leave a TODO.
- **Spec impact:** no spec needed

### admin-routes-have-no-admin-check

- **Severity:** Critical
- **Evidence:** `routes/admin/invites/index.tsx:99-155` and
  `routes/admin/invites/[id]/revoke.ts:1-13` are gated only by the global
  `requireAuth()` middleware (`main.ts:22`). There is no role concept anywhere
  in `lib/auth/` (grep for `admin`, `isAdmin`, `role` in `lib/auth/` returns no
  hits). `User` (`lib/auth/types.ts:1-5`) and `Session` (`:7-13`) carry only
  `username`.
- **Why it matters:** Any authenticated user — including helpers minted through
  the invite system — can open `/admin/invites`, mint new invites, and revoke
  existing ones. The invites spec (`openspec/specs/invites/spec.md`) starts
  every requirement with "an authenticated admin"; the code treats
  "authenticated" as the only gate. A helper can therefore invite arbitrary
  additional people, indefinitely, without the actual owners ever knowing —
  which defeats the entire single-use, time-boxed model the spec describes.
- **Suggested fix direction:** Introduce a minimal role bit on `User`
  (`role: "admin" | "user"`); seeded users from `SERVUS_SEED_USERS` are admin,
  invite-consumed users are not. Add an `requireAdmin()` middleware on the
  `/admin/*` prefix, and reject in `applyRequireAuth` early. Until that lands,
  consider blocking `/admin/*` for any username that starts with `helper-` as a
  stop-gap.
- **Spec impact:** bug against existing spec (invites spec assumes an admin role
  that does not exist)

### login-username-enumeration-via-counter

- **Severity:** Minor
- **Evidence:** `lib/auth/loginHandler.ts:55-63` increments the per-username
  failure counter even when the user does not exist. `checkAndIncrementUser`
  (`lib/auth/rateLimitRepo.ts:54-82`) keys on raw `username`.
- **Why it matters:** An attacker can probe whether a username exists by
  triggering lockout: invoke 6 failed logins for username `alice` from one IP,
  then attempt a 7th from a _different_ IP — if the server replies with a 429 /
  "rate limited" page even though the IP has no history, the username exists in
  the lockout namespace. The counter is created for non-existent users too, so
  this leak is small in the steady state, but a probe pattern still leaks
  whether a username has had recent activity (which only happens to real users
  in practice). Combine with the fact that the production threshold is 30/IP and
  the username window is 1 h: it's a slow but real enumeration vector.
- **Suggested fix direction:** Either (a) check user existence and only
  increment the per-username counter for real users (re-introducing the timing
  leak the dummy hash already mitigates), or (b) keep both counters but never
  expose the per-username retry-after time to the client — clamp it to the
  per-IP value so an attacker on a fresh IP cannot distinguish "your IP is
  rate-limited" from "this username is locked".
- **Spec impact:** gap in spec — auth spec does not address this interaction

### login-ip-rate-limit-too-loose-for-spec

- **Severity:** Major
- **Evidence:** `lib/auth/rateLimitRepo.ts:6` (`IP_THRESHOLD = 30`) vs. auth
  spec "After 10 failed attempts from the same IP within the window"
  (`openspec/specs/auth/spec.md:167-169`) and CLAUDE.md §8 ("~5 attempts / 15
  min").
- **Why it matters:** The production code allows 30 attempts per 15 min from the
  same IP — 3× the documented threshold and 6× the CLAUDE.md baseline. The
  inline comment ("E2E suite uses ~10-15 slots") shows the limit was relaxed to
  keep the test harness happy, not for a security reason. This weakens
  brute-force resistance, which is the primary defence for a public app.
- **Suggested fix direction:** Drop the production threshold back to 10 to match
  the spec; isolate the E2E suite via per-test usernames + a different IP path
  (the existing `x-forwarded-for` parsing makes it trivial) or via a test-only
  override env var the prod build does not honour.
- **Spec impact:** bug against existing spec

### login-lockout-not-429

- **Severity:** Major
- **Evidence:** `routes/login.tsx:68-76` returns
  `ctx.render(<LoginForm error=… />)` (HTTP 200, HTML) when `result.limited` is
  true; no `Retry-After` header, no 429 status.
- **Why it matters:** The auth spec mandates "HTTP 429 and a `Retry-After`
  header" for both per-IP and per-username lockout
  (`openspec/specs/auth/spec.md:168-169`, `:184-186`). Returning 200 hides the
  lockout from clients/log aggregators, makes it impossible for monitoring to
  alert on brute-force episodes, and would fail the spec scenarios as written.
  Constant-time / UX considerations do not require returning 200.
- **Suggested fix direction:** When `result.limited`, return a `Response` with
  status 429 and `Retry-After: <seconds>`; the body can still be the rendered
  login form for the user.
- **Spec impact:** bug against existing spec

### session-idle-timeout-never-renews

- **Severity:** Major
- **Evidence:** `lib/auth/sessionRepo.ts:79-93` defines `touchSession`;
  `lib/auth/middleware.ts:36-95` (`applyRequireAuth`) and
  `lib/auth/middleware.ts:218-239` (`requireAuth()` factory) never call it. Grep
  for `touchSession` outside tests returns no callers.
- **Why it matters:** `Session.lastSeen` is set only at login and never updated
  by request traffic. As a result the 14-day "idle" timeout in
  `applyRequireAuth` (line 79) silently becomes an _absolute_ 14-day cap —
  sessions die 14 days after login no matter how active the user is. The
  advertised 60-day absolute expiry (`ABSOLUTE_TTL_MS`, sessionRepo.ts:11) is
  effectively unreachable.
- **Suggested fix direction:** Call `touchSession(sessionId)` inside
  `requireAuth()` after a successful session lookup (the 1-hour throttle in
  `touchSession` already limits write amplification). Alternatively, document
  that 14 days is the absolute lifetime and drop the dead 60-day constant.
- **Spec impact:** bug against existing spec (CLAUDE.md §8 calls out "idle +
  absolute expiry" as distinct concepts)

### session-cookie-no-expires-attribute

- **Severity:** Minor
- **Evidence:** `lib/auth/loginHandler.ts:81-87`, `lib/invites/index.ts:100-106`
- **Why it matters:** The session cookie is set without `Max-Age` or `Expires`,
  so browsers treat it as a session cookie and drop it on browser restart.
  Combined with the never-renewed `lastSeen`, this is mostly a UX regression
  (users get logged out on browser restart even though the server-side session
  is valid for 14–60 days), but it can also surprise users who expect "remember
  me" behaviour after the move ships.
- **Suggested fix direction:** Add `Max-Age=<absolute-ttl-seconds>` to the
  `Set-Cookie` header so the browser keeps the cookie until the server-side
  absolute expiry.
- **Spec impact:** gap in spec — auth spec does not state cookie persistence
  policy

### argon2id-params-meet-baseline

- **Severity:** Nit
- **Evidence:** `lib/auth/password.ts:4-8`, `lib/invites/generate.ts:3-8`
- **Why it matters:** Both password and invite-code hashing use Argon2id with
  memory cost 64 MiB, time cost 3, parallelism 1, 16-byte salt from
  `crypto.getRandomValues` — meets §8.
- **Suggested fix direction:** none; just confirm.
- **Spec impact:** no spec needed
