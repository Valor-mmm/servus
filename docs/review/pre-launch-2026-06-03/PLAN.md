# servus pre-launch — running plan

Single source of truth for the pre-launch discussion. Updated incrementally as
decisions are made. A fresh Claude Code session can resume the conversation from
this file alone.

**Related artifacts (in this same folder):**

- `final.md` — full triage of the 137 review findings
- `findings/<lens>.md` — per-lens detailed findings
- `design-exploration/` — Bavarian-themed visual redesign options (separate PR)

---

## 1. Where we are

- Pre-launch review of the codebase complete: 137 findings across 4 lenses
  (security, spec+senior, ux+personas, ops+edge cases).
- The 10 consolidated go-live blockers (§2 of `final.md`) have been triaged with
  the user — see §2 below for decisions.
- Two new items surfaced during discussion (see §3): a short-session-timeout bug
  on mobile, and dissatisfaction with the current design/UX.
- Major-recommendation triage and final proposal-drafting still ahead.

## 2. Go-live blockers — decisions

| #   | Blocker                                                   | Decision                                                  | Action                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No helper role                                            | **Accept**                                                | None pre-MVP. Post-move concern. Helpers will be less relevant after the move anyway.                                                                                                                                                                                                                             |
| 2   | No "scan existing item into box" flow                     | **Closed — verified**                                     | Existing camera + mark_delivered + unpack_all flow covers the user's described workflow end-to-end. See §5.2.                                                                                                                                                                                                     |
| 3   | No deploy gate                                            | **Accept**                                                | Deno Deploy dashboard integration is the path; CI is rigorous on PRs, main is protected. README claim about "auto-deploy after CI" is stale — note: README should be updated.                                                                                                                                     |
| 4   | No monitoring                                             | **Fix**                                                   | Folded into the `add-observability` spec. External service, Deno Deploy native preferred, Sentry as fallback.                                                                                                                                                                                                     |
| 5a  | Import/export (high-priority, derived from #5 discussion) | **Fix**                                                   | Spec: `add-import-export`. Manual `deno task export` / `deno task import`. Storage location TBD.                                                                                                                                                                                                                  |
| 5b  | Automatic backup snapshots                                | **Defer (2nd spec)**                                      | Spec: `add-backup-snapshots`. Built on top of import/export.                                                                                                                                                                                                                                                      |
| 6   | Photo upload loses silently on flaky networks             | **Reframed — verify-after-PUT + box discrepancy summary** | Flaky-network simulation is hard to test reliably. Better path: server-side HEAD verification after the client's PUT to R2 (`handleCreateFromPhoto` / `handleAppendPhoto`), AND a per-box "captured N, stored M" discrepancy hint on the box detail page so any silent drift is visible. See proposal #3.5 in §7. |
| 7   | Mobile primary device is broken                           | **Confirmed — low priority**                              | User confirmed: last 2 characters of item names get truncated on mobile. Not blocking (user can deduce from context). Bottom-nav overflow + tap-target findings still stand but are also low-prio. Add to a "mobile-polish" follow-up PR (post-MVP unless trivial).                                               |
| 8   | Invite redemption while logged in hijacks session         | **Accept**                                                | Acceptable while everyone is admin. Revisit when scoped tokens / helper-role exists.                                                                                                                                                                                                                              |
| 9   | Items list heading lies ("50 neueste (21)" with 4 cards)  | **Fix**                                                   | Bug-fix PR with regression test against `items-browse-performance` spec. The list should show the actual rendered count, or fall back to `listItems()` when fewer than 50 exist.                                                                                                                                  |
| 10a | Operationally blind (logger unused, no error handler)     | **Fix**                                                   | Folded into `add-observability`. Wire `lib/log.ts`, structured logs, error middleware, client-side error endpoint.                                                                                                                                                                                                |
| 10b | Box label should stand alone (move-without-software)      | **Closed — verified**                                     | Label renders room icon + room name + box code + box label + item count + QR. User-described "move-without-software" need is met. See §5.3. The count-stale nit is deferred.                                                                                                                                      |

## 3. New items added during discussion

### 3.1 Short session timeout on mobile (user-reported)

- **Symptom:** On mobile, after logging in and either navigating between pages
  or staying on a page for >~1 minute (and doing an update / adding an image /
  etc.), the user is logged out and must re-enter credentials.
- **Status:** Root cause identified — see §5.1. Fix queued in §7 as a small PR
  (or proposal if auth spec needs updating).
- **Severity:** Major (UX-blocking on the primary device).
- **Root cause (one-line):** Session cookie has no `Max-Age` so iOS Safari drops
  it when the OS evicts Safari from memory (which can happen after just minutes
  of inactivity).

### 3.2 Design / UX dissatisfaction (user-reported)

- User feels the design has improved over recent specs but is not yet "proud of
  it".
- No concrete vision yet — "I just know it's not there yet."
- Wants to address it before the move if possible; functionality remains the
  highest priority.
- **User direction:** Full visual reset is on the table. Bavarian theme woven in
  — open on which aspect (heraldic colours, alpine Hütte cosiness, Munich
  modernist heritage, etc.).
- **Status:** Design exploration agent launched in background (2026-06-05). Will
  produce screenshots of current state, fresh-observer critique, and three
  distinct Bavarian-themed visual directions with HTML mocks. Output lands in
  `design-exploration/`. Owner reads on their own time and reacts.
- **Next:** Owner picks/blends a direction → I synthesise `design-vision.md` →
  spec deltas to `design-system` → implementation.

## 4. Open questions

| Q                                                                     | Status                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Where will automatic snapshots live?                                  | Deferred; manual export script first                                              |
| Which external monitoring service?                                    | Investigate Deno Deploy native options first, then Sentry / Logtail / BetterStack |
| What's the design vision?                                             | Pending discussion                                                                |
| Root cause of mobile session-timeout bug?                             | Investigation in progress (§5.1)                                                  |
| Does the box-detail camera + mark_delivered flow cover #2 end-to-end? | Investigation in progress (§5.2)                                                  |
| What's actually on the box label today (#10)?                         | Investigation in progress (§5.3)                                                  |

## 5. Investigation results

### 5.1 Session timeout on mobile — ROOT CAUSE FOUND

**Most likely cause: no `Max-Age` / `Expires` on the session cookie, combined
with iOS evicting Safari from memory.**

Evidence from the code:

- `lib/auth/loginHandler.ts:81-87` sets the cookie with
  `HttpOnly; Secure; SameSite=Strict; Path=/` — no `Max-Age` and no `Expires`
  attribute. Without either, browsers treat it as a "session cookie" that is
  dropped when the browser is closed.
- iOS Safari aggressively evicts background tabs/Safari itself from memory when
  the OS needs RAM. Switching apps for a minute, taking a phone call, or just
  leaving the screen idle can be enough. When the user returns, Safari is
  cold-started and the session cookie is gone.
- This is **mobile-specific** because iOS does this much more aggressively than
  desktop browsers, which explains why the user only sees it on phone.
- The KV-side state is fine: `sessionRepo.ts:10-13` sets `IDLE_TTL_MS = 14 days`
  and `ABSOLUTE_TTL_MS = 60 days`. KV `expireIn: ABSOLUTE_TTL_MS` is set on the
  session record. The idle-check in `middleware.ts:79` compares against
  `session.lastSeen`, which is 14 days, so it would not fire after 1 minute.

**Why it presents as "logged out after 1+ minute":** The user goes to the app,
logs in, uses it for a bit, then idles (or switches apps). OS kills Safari
background, cookie evaporates. Next interaction → middleware sees no cookie →
302 to `/login`.

**Secondary contributing factor (independent bug):**
`lib/inventory/sessionRepo.ts:79-93` defines `touchSession`, but `middleware.ts`
never calls it. So even on long-lived browsers, `lastSeen` is frozen at login
time and the 14-day idle window is absolute, not rolling. Already documented as
`session-idle-timeout-never-renews` Major in the security review.

**Possible tertiary factor:** `findSession` (`sessionRepo.ts:49-53`) does
`kv.get` with default consistency = "eventual". Deno KV eventual reads can lag
by several seconds across edge regions. If two requests in a row hit different
regions, one may see the session, the next may not. This would manifest as
sporadic logouts. Not the primary cause but worth fixing.

**Severity:** **Major (was Minor)** — bumped because this is the user's primary
friction on the main device.

**Fix shape (small PR, no proposal needed if the auth spec already mandates
persistent cookies; otherwise an `add-persistent-session-cookie` proposal that
touches the auth spec):**

1. Add `Max-Age=<ABSOLUTE_TTL_seconds>` to the `Set-Cookie` value in
   `lib/auth/loginHandler.ts:81-87` and the equivalent in
   `lib/invites/index.ts:100-106`. Use `60 * 24 * 60 * 60 = 5184000` seconds.
2. Call `touchSession(sessionId)` from `middleware.ts requireAuth()` after a
   successful session lookup. (Fixes the `session-idle-timeout-never-renews`
   finding in the same change.)
3. Use `{ consistency: "strong" }` in `findSession` to eliminate the edge-region
   read lag.
4. Add Playwright regression: log in, advance time / clear in-memory tab state,
   verify still logged in.

### 5.2 Box workflow verification (#2) — VERIFIED, NO WORK NEEDED

The flow the user described is fully supported by the existing
`routes/boxes/[id].tsx`:

| User step                              | Implementation                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Helper creates a box                   | `routes/boxes/new` (presumed; not in this read)                                                                                                      |
| Helper photographs items into the box  | `CaptureSurface boxId={box.id}` (line 130) renders the continuous-capture island; each capture creates a new item bound to this box                  |
| Helper names the box                   | "Bearbeiten" link (line 71) → `/boxes/<id>/edit`                                                                                                     |
| Mark box delivered when at destination | `_action=mark_delivered` button (lines 77-89), only shown when status=packed                                                                         |
| Unpack box later                       | `_action=unpack_all` form (lines 239-253), only shown when delivered AND destination room set; assigns all items to that room and tombstones the box |

The UX agent's `box-detail-has-no-way-to-pack-existing-items` finding (Critical)
was based on a different assumption — that helpers would need to bind
_pre-existing_ items to a box. The user explicitly ruled that out: items are
_created via the camera_ as they go in. So that Critical drops to "not a
blocker" for our use case.

The only Major from #2 that remains relevant is the box-label-print-button issue
(covered by §6 major recommendations), since owners print labels in batches.

**Status:** Closed.

### 5.3 Box label content (#10) — VERIFIED, NO WORK NEEDED

`routes/boxes/[id]/label.tsx:135-146` renders the label with these fields:

- Room icon (emoji based on room name)
- Room name (large, prominent)
- Box code (e.g. `B-010`)
- Box label (user-defined free text — the "content" descriptor)
- Item count (stale-prone; see `box-label-count-snapshot-misleading` Minor)
- QR code linking back to `/boxes/<id>`

User confirmed "name/content and room — both are already present". The only
outstanding nit is the item count becoming a permanent lie once items are
added/removed after printing — fix later by moving it to a screen-only badge.

**Status:** Closed (defer the count-stale nit).

## 6. Major-recommendations triage — DECIDED

| ID | Major                                            | Decision                                                                                                                                                                                                                                                 | Vehicle                                   |
| -- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| M1 | Auth rate-limit drift (4 sub-issues)             | **Fix pre-launch (all 4)**. User observation: fixing sub-issue #2 (counter only counts failures) likely removes the reason the threshold was raised to 30 — try restoring to 10. Per-username lockout to be re-integrated (user recalls seeing it once). | Proposal: `tighten-auth-ratelimit`        |
| M2 | Destructive action confirmations                 | **Fix pre-launch** — high risk during move with helpers.                                                                                                                                                                                                 | Proposal: `add-destructive-confirmations` |
| M3 | `photoKey` path traversal                        | **Fix, low priority** — proposal preferred over PR per user, but not urgent. Real exploit risk for our 2-user single-bucket setup is low; principle-of-least-trust hardening.                                                                            | Small proposal or PR (TBD)                |
| M4 | Session expiry on POST eats form                 | **Defer to post-launch** — mitigated for the move by the longer cookie + `touchSession` rolling-renewal (Proposal #1). Revisit after the move.                                                                                                           | Future PR                                 |
| M5 | Box-label Drucken/Zurück affordance              | **Fix pre-launch** — owner prints labels in batches.                                                                                                                                                                                                     | Small PR                                  |
| M6 | Item-detail page hides quantity / value / photos | **Fix pre-launch if quick** — not blocking the move but should be done.                                                                                                                                                                                  | Small PR                                  |
| M7 | No concurrent-edit protection                    | **Defer** — 2-user load makes this low-probability.                                                                                                                                                                                                      | Future PR if hit                          |
| M8 | Items heading lie                                | **Queued as planned** — PR #4 in §7.                                                                                                                                                                                                                     | Existing                                  |

### Notes for the M1 proposal

- The four sub-issues are intertwined; one proposal fixes all of them.
- Sub-issue #2 (counter increments on every attempt) is the load-bearing fix —
  once it lands and e2e tests stop being throttled by their own successful
  logins, the threshold can almost certainly drop back to the spec'd 10 without
  test flakiness. The proposal should attempt 10 first; only fall back to "keep
  at 30 and document why" if e2e flakes.
- Per-username lockout (`auth.locked_out` locale key already exists, user thinks
  they saw an earlier implementation get lost in iteration). Add exponential
  backoff per CLAUDE.md §8.
- Returning 429 with `Retry-After` is the standard contract; brings the
  observable behaviour in line with monitoring + future API clients.

## 7. Proposals to draft — final order

### Pre-launch (must ship before move)

1. **PR: persistent session cookie + touchSession + strong consistency** —
   small, fast. Touches `lib/auth/loginHandler.ts`, `lib/invites/index.ts`,
   `lib/auth/middleware.ts`, `lib/auth/sessionRepo.ts`. Includes Playwright
   regression. May need a small `auth` spec delta. See §5.1. **Critical** —
   fixes the daily mobile-friction.
2. **`add-import-export`** — manual `deno task export` / `deno task import` with
   KV snapshot + R2 manifest. Storage destination TBD.
3. **`add-observability`** — wire `lib/log.ts`, error middleware, client-error
   endpoint, ship to external service (Deno Deploy native first, Sentry as
   fallback). Spec covers what gets logged + where it goes.
4. **`add-photo-upload-verification`** — server-side HEAD verification after
   client PUT to R2; if missing, 502. Per-box "captured N, stored M" discrepancy
   hint on box detail. Covers `r2-5xx-handling-partial` + user's flaky-network
   concern.
5. **`tighten-auth-ratelimit`** (M1) — fix the 4 sub-issues: only count failures
   (sub-issue #2 first; should unlock dropping threshold from 30 → 10), return
   429+`Retry-After`, re-integrate per-username lockout with exponential
   backoff.
6. **`add-destructive-confirmations`** (M2) — locale keys already exist for
   items/rooms/categories/boxes; wire confirmation island consistently.
7. **PR: items heading respects actual count** (M8 / blocker #9) — small bug
   fix + regression test.
8. **PR: box-label Drucken/Zurück toolbar** (M5) — screen-only toolbar with
   `window.print()` and Zurück.
9. **PR: item-detail fields** (M6) — render quantity, value, box link, photo
   strip on `/items/<id>`.

### Post-launch (after the move)

10. **`add-backup-snapshots`** — automated periodic snapshots built on the
    export script.
11. **PR: photoKey regex validation** (M3) — `/^[0-9a-f]{64}$/` + optional
    issued-keys tracking. Could be a proposal if the spec needs the
    ownership-lifecycle text.
12. **PR: session-expiry redirect** (M4) — 302+`next=` for HTML form POSTs,
    `{error:"session_expired"}` for `/api/*`.
13. **PR: concurrent-edit protection** (M7) — only if hit in practice.
14. **Mobile-polish PR** — item-row truncation, bottom-nav overflow, tap-target
    sizes (from #7 retest + UX findings).

### Design

15. **`design-vision`** doc + `design-system` spec deltas — driven by user's
    reaction to the design exploration (output at `design-exploration/`).
    Ideally pre-launch if the chosen direction is light-touch; otherwise
    post-launch.

## 8. Next steps

- [x] Create this plan file
- [x] Investigate mobile session timeout — root cause found (§5.1)
- [x] Verify #2 box workflow — closed (§5.2)
- [x] Verify #10 box label content — closed (§5.3)
- [x] Retest #6 photo upload behavior — reframed to verify-after-PUT +
      discrepancy summary
- [x] Retest #7 mobile layout — confirmed (item names truncate); low priority
- [x] Discuss §6 major recommendations — decided (see §6 table)
- [x] Finalize §7 proposal order
- [ ] User reviews design exploration deliverable at `design-exploration/` →
      picks/blends a direction
- [ ] Draft proposals in §7 order (one at a time, OpenSpec workflow). Start with
      #1 (cookie PR).

## 9. Standing constraints / preferences

- Free forever; never introduce paid services.
- Low-maintenance deps; prefer Deno std lib.
- OpenSpec is the source of truth for behavior.
- TDD; Playwright E2E for user-visible flows.
- Run `deno fmt` before pushing (recurring CI miss otherwise).
- German UI only; copy lives in `lib/i18n/locales/de.ts` and goes through `t()`.
- Custom auth only (no Auth0/Clerk/etc.).
- User uses STT on phone — tolerate transcription variations.
- Functionality > polish, but design vision matters and is a deferred priority.

## 10. Session-restart hand-off note

If you're a fresh Claude Code session reading this:

1. Read this file top to bottom — it captures every decision made so far.
2. The current sub-task is §5: filling in the three investigations.
3. Detailed findings live in `findings/<lens>.md`; `final.md` is the triage
   index.
4. The CLAUDE.md workflow (§6) is OpenSpec-driven: propose → discuss → apply →
   TDD → E2E → archive. Do not skip the discuss step on a proposal.
5. Update this file as decisions are made — don't keep state only in the chat.
