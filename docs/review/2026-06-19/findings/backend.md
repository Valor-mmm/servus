# Backend findings

---

### [BLOCKER] No admin-role gate on any /admin route — helpers have full destructive access

- **Where:** `routes/admin/index.tsx`, `routes/admin/export.ts`, `routes/admin/import.ts`, `routes/admin/delete.ts`, `routes/admin/delete-confirm.tsx`, `routes/admin/invites/[id]/revoke.ts` — all handlers. Also `lib/auth/types.ts` (User type), `lib/invites/index.ts:87` (consumeInvite user creation).
- **Relation:** spec-violation (`openspec/specs/invites/spec.md` — "The new account MUST NOT have admin privileges", "role: user, system-generated username"; "allow an authenticated **admin** to generate a single-use invite code")
- **Evidence:**
  - `lib/auth/types.ts`: `User` interface has no `role` field — there is no admin/user distinction anywhere in the type system.
  - `utils.ts`: `State.user` carries only `{ username: string }` — no role.
  - `main.ts:22-23`: Global middleware chain is `requireAuth()` then `csrfGuard()` — no admin check.
  - `routes/admin/delete.ts:5-13`: The POST handler that wipes all KV data calls `deleteAllKv(kv)` with zero role verification beyond "is the user logged in?".
  - `routes/admin/export.ts:5-33`: Same — any authenticated user can download the entire KV backup.
  - `routes/admin/import.ts`: Same — any authenticated user can overwrite all data.
  - `routes/admin/invites/[id]/revoke.ts`: Any authenticated user can revoke any invite.
  - `lib/invites/index.ts:87`: Helper accounts are created with `{ username, passwordHash, createdAt: Date.now() }` — identical record shape to owner accounts; no role stored.
  - Confirmed: invited helpers have FULL `/admin` access immediately upon invite consumption.
- **Recommendation:** Add a `role: "admin" | "user"` field to the `User` type. Set `role: "admin"` for seeded/owner accounts (`lib/auth/seed.ts`). Set `role: "user"` for invite-created accounts (`lib/invites/index.ts:87`). Add a `requireAdmin()` middleware to `lib/auth/middleware.ts` that checks `state.user.role === "admin"` (or re-fetches the User from KV). Wire it as a sub-middleware on all `/admin/*` routes (either via a `_middleware.ts` in `routes/admin/` or by adding a check at the top of each handler). The State type in `utils.ts` must also carry `role`.

---

### [MAJOR] IP rate-limit threshold 6× above recommended minimum with no production override path

- **Where:** `lib/auth/rateLimitRepo.ts:6` — `const IP_THRESHOLD = 30`
- **Relation:** spec-gap (CLAUDE.md §8: "per-IP rate limit (e.g. 5 attempts / 15 min)")
- **Evidence:** The comment says "E2E suite uses ~10-15 slots (setup + auth tests)" — the production threshold was raised from the OWASP guidance to work around the E2E test suite. 30 attempts/15 min is 6× the recommended minimum. There is no env-var override or test-env differentiation.
- **Recommendation:** Restore production threshold to 5–10 per 15 min. Fix the E2E suite to not consume login slots (e.g. use a separate test-only session-seed mechanism, or reset the KV rate key between tests). Alternatively gate with an env var: `IP_THRESHOLD = parseInt(Deno.env.get("LOGIN_IP_RATE_LIMIT") ?? "5")`.

---

### [MINOR] IP and invite rate-limit counters are non-atomic (read-then-write without CAS)

- **Where:** `lib/auth/rateLimitRepo.ts:36-44` (checkAndIncrementIp), `lib/invites/rateLimit.ts:31-40` (checkAndIncrementInviteIp)
- **Relation:** spec-gap
- **Evidence:** Both functions do `kv.get()` then `kv.set()` without a `.check()` (optimistic concurrency). Under concurrent login attempts from the same IP, the counter can be lost — two simultaneous reads see count=5, both write count=6, so only 1 increment lands instead of 2. In a low-concurrency home app this is unlikely to be exploitable but it is a correctness defect.
- **Recommendation:** Use `kv.atomic().check(entry).set(key, record, ...).commit()` and retry on `!result.ok` (same pattern already used correctly in `boxRepo.ts:nextCode`).

---

### [MINOR] Route handler in items/new.tsx POST contains inline validation logic (fat handler)

- **Where:** `routes/items/new.tsx:141-213`
- **Relation:** quality
- **Evidence:** The POST handler performs name/categoryId/quantity validation, group-assignment orchestration, and error message formatting inline rather than delegating to `lib/`. Per CLAUDE.md §4: "All business logic lives in `lib/` and is called from route handlers; route files stay thin." The validation (≥3 guard clauses with i18n messages) and the `findOrCreateGroup` + `addMembership` orchestration belong in `lib/inventory/`.
- **Recommendation:** Extract a `createItemFromForm(input, t)` function (or similar) into `lib/inventory/` that handles validation and group assignment. The route handler becomes: parse form → call lib → handle error response or redirect.

---

### [NIT] Shared rate-limit counter for GET and POST on /invite/[code] depletes invite inspection budget

- **Where:** `routes/invite/[code].tsx:46`, `routes/invite/[code].tsx:67` — both call `checkAndIncrementInviteIp`
- **Relation:** quality
- **Evidence:** The same 10-requests-per-15-min budget is shared between GETs (view confirmation page) and POSTs (consume invite). If a helper retries after a page load error, their 10 GET slots plus any POST attempts all count against the same counter. The spec calls for rate-limiting both GET and POST, but doesn't require sharing a counter.
- **Recommendation:** Use separate KV keys for GET and POST rate limits (e.g. `["rate-invite", "get", hashedIp]` vs `["rate-invite", "post", hashedIp]`) so viewing the confirmation page doesn't consume the action budget.

---

### [NIT] `log.ts` redaction helper is defined but almost never used — most logging bypasses it

- **Where:** `lib/log.ts`, vs `lib/auth/seed.ts`, `routes/api/photos/upload-url.ts`, `lib/inventory/removePhotoApi.ts`, `lib/inventory/itemRepo.ts`
- **Relation:** quality
- **Evidence:** The `log()` helper with `redact()` is in `lib/log.ts` but all actual log calls across the app use raw `console.log/error/warn`. The seed file logs plain strings (no secrets — fine). R2 error logs include only error messages (not keys — fine). But the pattern is inconsistent: the safety net exists but is not used.
- **Recommendation:** Either adopt `log()` as the project-wide logging function (replace direct `console.*` calls in routes and lib), or document that direct `console.*` is intentional for strings guaranteed to be secret-free, and add a lint rule or comment contract.

---

## Summary

**Counts:** 1 BLOCKER / 1 MAJOR / 2 MINOR / 2 NIT

**Top 3 to fix:**

1. **BLOCKER — Admin access for helpers:** Every invited helper immediately has full `/admin` access including delete-all-data, export, import, and invite management. There is no role field on `User` and no admin gate anywhere. Fix: add `role` to `User`, set it in seed and consumeInvite, add `requireAdmin()` middleware to all `/admin/*` routes.

2. **MAJOR — IP rate-limit threshold 30×:** The login IP rate limiter allows 30 attempts per 15 minutes because the E2E suite consumed the original budget. This should be restored to ≤10 in production with a proper test isolation approach.

3. **MINOR — Non-atomic rate counters:** Both login-IP and invite-IP counters are vulnerable to a race condition under concurrent requests. Use CAS (atomic check+set with retry) as already done in `boxRepo.ts:nextCode`.

## Observations

- The Argon2id parameters for both passwords and invite codes are correct: memory=64MiB, time=3, parallelism=1, salt=16 bytes from CSPRNG. Full marks.
- The session cookie has all required flags: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=…` — the prior Max-Age mobile logout bug is confirmed fixed.
- Constant-time login is properly implemented: dummy hash for unknown users, same Argon2id cost path regardless of user existence.
- CSRF tokens use CSPRNG (32 bytes), are session-bound, and the comparison is constant-time. CSRF guard correctly fires on POST/PUT/PATCH/DELETE.
- Invite codes are 20 bytes = 160 bits of raw entropy (above the 128-bit minimum), hashed with Argon2id at password cost params, with a separate SHA-256 lookup index. The atomic CAS in `consumeInvite` correctly prevents double-use.
- The `/admin` CSRF protection on forms is present (csrf_token hidden fields) — the gap is purely authorization, not CSRF.
- Security headers are comprehensive: CSP with nonce extraction, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. The `Permissions-Policy: camera=(self)` correctly permits camera for photo capture.
- The open-redirect guard in `login.tsx:84` (`next.startsWith("/") ? next : "/"`) is correct.
- All API routes (`routes/api/*`) are thin shells over lib functions — properly structured.
- All KV access goes through typed `lib/kv/client.ts` or the domain repo functions — no raw KV scattered in routes.
- `deleteItem` orphan handling for containment children is in-band with the atomic KV commit (correct).
