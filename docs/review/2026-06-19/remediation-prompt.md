# Servus review remediation — implementation prompt

> **Usage:** paste this as the first message in a new Claude Code session inside
> `/home/valor/projects/v2/servus`.

---

## What this is

This prompt drives the full remediation of the 2026-06-19 multi-agent
verification review. Source: `docs/review/2026-06-19/final.md`. All findings
have been verified against the codebase and all blocking design decisions have
been answered. Work through the phases below in order.

## How to work

1. **Before implementing any behavior change that touches a spec**, run
   `/openspec-propose` with a focused scope. Wait for the user to approve the
   proposal before writing code for that change. The spec is the source of
   truth.
2. **If a question arises during implementation** that you cannot resolve from
   the code, the specs, or the decisions below — write it to
   `/tmp/servus-questions.md` and continue with the most reasonable assumption.
   Do not stop to ask the user inline.
3. **After each phase** run `deno task test` and `deno task e2e`. Do not start
   the next phase until tests are green.
4. `deno fmt` runs automatically via a post-tool hook. Do not run it manually.
5. **Track your position.** At the start of each phase write a one-line
   checkpoint to `/tmp/servus-remediation-progress.md` (e.g.
   `Phase 0 — started`). Mark it done when tests pass. If the session is cut
   off, the next session reads this file first to find where to resume.
6. **Commit** at the end of each phase (not after every file edit).

---

## Locked-in design decisions (do not re-litigate)

| Topic                | Decision                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 — user migration  | Promote **all** existing role-less KV users to `role: "admin"` in the migration. Update seed to write `role: "admin"` for maus and monster.                               |
| M2 — status rename   | Replace `"pending"/"confirmed"` with `"incomplete"/"complete"`. Photo-first captures → `"incomplete"`. Standard form → `"complete"`.                                      |
| M2 — triage UX       | Sequential: one item at a time, inline edit, two save buttons ("Speichern & fertig" / "Speichern & unvollständig"), next/prev navigation.                                 |
| M4 — key rename      | Prevent it in the UI: disable the key input for existing fields + show a tooltip. Backend rejects it too as a safety net.                                                 |
| M5 — confirm pattern | `window.confirm()` dialog wired via a single shared inline `<script>` or island — keep it simple.                                                                         |
| M6 — rate limit      | Restore `IP_THRESHOLD` to `5` (CLAUDE.md §8). Fix test isolation via env var `SERVUS_RATE_LIMIT_IP_THRESHOLD` so E2E suite can override without touching production code. |

---

## Phase 0 — Emergency data fix (no spec change)

**Goal:** stop the backup silent data-loss bug before anything else. This is a
one-line fix; ship it first.

### B2 — Fix `EXPORT_PREFIXES` in `lib/kv/export.ts`

Add the five missing prefixes:

```
["category-schema"]
["group"]
["group-item"]
["item-group"]
["item-by-container"]
```

`deleteAllKv` in `lib/kv/deleteAll.ts` delegates to `EXPORT_PREFIXES` already,
so it is fixed automatically.

Add a regression test in `tests/unit/` that enumerates every `kv.list` prefix
used in `lib/inventory/` and asserts each one appears in `EXPORT_PREFIXES`.
(Grep for `kv.list({ prefix:` to find them all.)

Commit: `fix(kv): add 5 missing prefixes to EXPORT_PREFIXES`.

---

## Phase 1 — Authorization (spec change required)

**Spec change first.** Before writing any code, run `/openspec-propose` with
this scope:

> Propose a change titled "Authorization: role-based admin access". Scope: (1)
> Add `role: "admin" | "user"` to the `User` model in `lib/auth/types.ts`. (2)
> Seed writes `role: "admin"` for both seeded users. A one-time KV migration
> promotes all existing role-less users to `"admin"`. (3) `consumeInvite` writes
> `role: "user"` on the new account. (4) New `requireAdmin()` middleware (in
> `lib/auth/middleware.ts`) reads the session user and returns 403 if
> `role !== "admin"`. (5) Every `/admin/*` route handler calls `requireAdmin()`.
> The `_app.tsx` nav hides "Verwaltung" for `role: "user"` sessions. Non-goals:
> no fine-grained permissions beyond admin/user.

Wait for user approval, then implement. Spec files to update: `auth` and
`invites`.

### Implementation checklist (after spec approved)

- [ ] Add `role` field to `User` type and all constructors
- [ ] Update seed (`lib/auth/` or wherever seeding happens) to write
      `role: "admin"`
- [ ] Write migration script `scripts/migrate-user-roles.ts` — iterates
      `["user", *]` KV prefix, promotes any user with no `role` to `"admin"`,
      idempotent
- [ ] Update `consumeInvite` to write `role: "user"` on the created account
- [ ] Add `requireAdmin(ctx)` to `lib/auth/middleware.ts` — 403 if not admin
- [ ] Apply `requireAdmin` in every `/admin/*` route (index, delete,
      delete-confirm, export, import, invites/index, invites/[id]/revoke)
- [ ] Hide "Verwaltung" nav link in `_app.tsx` when `role !== "admin"`
- [ ] Unit test: `requireAdmin` returns 403 for role=user session
- [ ] Integration test: helper session → GET `/admin` → 403
- [ ] E2E test (Playwright): log in as a helper → assert nav has no Verwaltung →
      direct navigation to `/admin` → assert 403 page

---

## Phase 2 — Item status redesign (spec change required)

**Spec change first.** Before writing any code, run `/openspec-propose` with
this scope:

> Propose a change titled "Item status: incomplete/complete + sequential
> triage". Scope: (1) Rename `ItemStatus` from
> `"pending" | "suggested" | "confirmed"` to `"incomplete" | "complete"`.
> Photo-first capture creates items with `status: "incomplete"`. Standard form
> creates items with `status: "complete"`. (2) The item edit form gains two
> submit buttons: "Speichern & fertig" (saves with `status: "complete"`) and
> "Speichern & unvollständig" (saves with `status: "incomplete"`). (3)
> `/items/pending` is renamed to `/items/incomplete` (redirect old URL). The
> triage page shows items one at a time in creation-time order. The user edits
> the current item inline (the full edit form), saves with one of the two
> buttons, and is forwarded to the next incomplete item automatically (or to the
> empty-state page when none remain). Prev/next navigation links are shown. Each
> triage row MUST show: thumbnail, `item.name || "(unbenannt)"`, quantity, and
> box assignment if any. Non-goals: no AI auto-fill in this change, no
> bulk-confirm.

Wait for user approval, then implement.

### Implementation checklist (after spec approved)

- [ ] Update `ItemStatus` type in `lib/inventory/types.ts`
- [ ] Update `createItem` default to `"complete"` for standard form, keep
      `"incomplete"` for photo-first path
- [ ] Update `UpdateItemInput` to accept `status` field
- [ ] Fix the triage page name display:
      `item.name || t("items.placeholderName")` (this is the one-line fix that
      was broken regardless of rename)
- [ ] Redesign `/items/incomplete` as a sequential triage: fetch incomplete
      items ordered by createdAt asc; show index N of total; inline edit form;
      two save buttons; auto-advance on save
- [ ] Add 301 redirect from `/items/pending` → `/items/incomplete`
- [ ] Update all other references to old status values in routes, islands,
      components, i18n keys
- [ ] Write/update unit tests for status transitions
- [ ] E2E test: photo-first flow → item appears in triage → fill in name → save
      as complete → auto-advances to next item → empty state when done

---

## Phase 3 — Bug fixes (no spec change)

These are all correctness fixes. Work through them in order; each is
independent.

### M1 — Optimistic locking on `updateItem`

In `lib/inventory/itemRepo.ts`:

`findItem` must return the KV entry including versionstamp. Change the internal
helper (or add a new one `findItemEntry`) to return `Deno.KvEntry<Item>`. Pass
the versionstamp into `updateItem`. Add
`.check({ key: ITEM_KEY(id), versionstamp })` to the atomic commit at line 378.

Also apply to `adjustQuantity` (`itemRepo.ts:453`) which calls `updateItem` —
ensure the read and write are in the same atomic check.

Add a unit test that simulates a concurrent write (two updates on the same item,
second one must fail or retry).

### M3 — `importKv` try/catch around `JSON.parse`

In `lib/kv/import.ts`: wrap `JSON.parse(trimmed)` in try/catch. On parse error,
skip the line, increment a `malformed` counter, and continue. After the loop, if
`malformed > 0` throw an error so the caller surfaces it. Make import
all-or-nothing: collect all parsed entries first, then flush — don't flush
partial batches before the full parse pass completes.

Add a unit test: feed a stream with one malformed line among valid ones; assert
nothing was imported and an error was thrown.

### M4 — Schema editor: disable field key for existing fields

In `components/SchemaEditorForm.tsx` (or whichever component renders field
rows): for fields that already exist in the saved schema (i.e. have an existing
`key` value from the server), render the key `<input>` as `disabled` and add a
`title` attribute with the German tooltip text (add the i18n key
`schemas.field_key_immutable_hint` to `lib/i18n/locales/de.ts`).

As a backend safety net, add validation in `updateSchema`
(`lib/inventory/schemaRepo.ts`) that detects if any existing field key was
changed and throws a `SchemaValidationError` with a clear message.

### M5 — Wire destructive confirmations

Add a small script (either an island or an inline `<script>` in `_app.tsx`) that
intercepts `submit` events on forms and `click` events on links where the
element has a `data-confirm` attribute, calls `window.confirm(value)`, and
cancels the event if the user declines.

Audit every destructive action in the routes (delete-confirm, "Alle entpacken",
category/room/group delete, schema delete, invite revoke) and add `data-confirm`
attributes with appropriate German confirmation messages. Add the i18n keys for
each to `de.ts`.

### M6 — Restore IP rate limit

In `lib/auth/rateLimitRepo.ts`: change `IP_THRESHOLD` from `30` to `5`. Read an
optional `SERVUS_RATE_LIMIT_IP_THRESHOLD` env var to allow override (for E2E).
Add to `tests/e2e/` setup: set `SERVUS_RATE_LIMIT_IP_THRESHOLD=50` in the dev
server launch command (update `deno task e2e` or the Playwright global setup).

Verify the existing E2E auth tests still pass with the env var in place.

---

## Phase 4 — Experience (R items)

These are larger UX improvements. Write a quick note to
`/tmp/servus-questions.md` for any UX detail that is ambiguous and continue with
the most reasonable assumption.

### R6b — Harden invite flow (smallest, start here)

- A logged-in user visiting `/invite/[code]` should NOT consume the single-use
  code silently. Instead, show a message: "Du bist bereits angemeldet. Melde
  dich zuerst ab, um einen neuen Zugang zu aktivieren." Redirect to home.
- Add a copy-to-clipboard button on the one-time invite banner shown after
  creation (the banner that shows the raw code once).
- On the `/invite/[code]` accept page, add context: the app name, that this is a
  temporary helper access, and the expiry date of the code.

### R1 — Shared styled-atom library

Create reusable CSS and component atoms that close the "half-finished" look
identified across the review. Ship as a pass over existing components, not new
files — update the components in place.

Atoms to build (in priority order):

1. `.btn-secondary` — consistent style for all Zurück/Abbrechen links (currently
   inconsistent)
2. Confirm link/button color — deduplicate the red delete button style
3. `EmptyState` component — reusable lion empty-state with icon + message props
   (replace all ad-hoc empty-state divs)
4. `count(n, singular, plural)` helper in `lib/i18n/t.ts` — fixes "1
   Gegenstände" pluralization bug wherever it appears
5. BottomNav prefix-match fix (`BottomNav.tsx:3-6`) — currently matches `/items`
   for `/items/incomplete` etc.; fix to exact-match or
   prefix-with-trailing-slash

### R2 — Dashboard landing page

Make `/` a real dashboard. Current landing is three static lines.

Show:

- Total item count
- Count of incomplete items (link to `/items/incomplete`)
- Count of packed boxes / total boxes
- Recent items (last 5, with thumbnails if available)
- A prominent "Erfassen" primary action button

Use existing data-fetching functions — do not add new KV queries beyond what's
already in `itemRepo.ts` / `boxRepo.ts`.

### R3 — Placement controls + destination-side packing

Two sub-tasks:

**3a — Collapse placement controls on item form.** The edit form currently has
three overlapping placement fields (Behälter, Raum, Karton). Collapse to a
single "Standort" picker: a segmented control or dropdown that lets the user
choose one of {Raum, Karton, Behälter} then shows only the relevant sub-picker.
Write the question about exact interaction to `/tmp/servus-questions.md` if
unclear.

**3b — "Vorhandene einpacken" on box detail.** On the `/boxes/[id]` detail page,
add an "Einpacken" action that shows a picker to assign an existing room's items
to this box in bulk (or select individual items). This is the "destination-side
packing" the review identified as missing. Keep it simple: a list of unassigned
items with checkboxes and a single "Einpacken" submit.

---

## Phase 5 — Docs and housekeeping (P3/P4)

### CLAUDE.md drift

Fix the three documented inaccuracies:

- §5: remove reference to `lib/moving/` (logic is in `lib/inventory/`)
- §10: update CI pipeline description to match actual `ci.yml` (3 jobs, not 8
  steps)
- §15: change `deno task start` to `deno task dev` for local dev

### ROADMAP.md and README

- Update `docs/ROADMAP.md` to reflect the ~14 shipped capabilities that are
  unreflected (groups, containment, named themes, data export, lazy thumbnails,
  etc.)
- Update README: remove claim of auto-deploy, add required env vars (R2 config,
  session key, etc.)

### Spec placeholders

- Fill in the "Purpose" placeholder in `openspec/specs/groups/spec.md` and
  `openspec/specs/data-export/spec.md`
- Add decision records in `docs/decisions/` for: groups feature, containment
  feature, named-theme system, data-export feature

### Rate-limit response codes (P4 minor)

Rate-limit responses in the login handler currently return 302 → error HTML. Per
spec and HTTP semantics they should return 429 with a `Retry-After` header. Fix
the login handler to return 429 when rate-limited.

### Non-atomic loops (P4 minor, data-layer)

- `groupRepo.ts` reorder and membership-cleanup loops are non-atomic — wrap in
  `kv.atomic()` where possible
- `assertNoCycle` has unbounded depth — add a depth limit (e.g. 50) and throw a
  clear error if exceeded

### a11y and copy fixes (P4 minor)

- Add `<label>` for filter `<select>` elements on `/items` and `/boxes`
- Re-populate the username field on failed login (`routes/login.tsx`)
- Make file input on import page styled (hide native input, use a styled label)
  with German text
- Fix "1 Gegenstände" pluralization using the `count()` helper from R1

---

## Done criteria

The remediation is complete when:

- All phases are marked done in `/tmp/servus-remediation-progress.md`
- `deno task test` passes
- `deno task e2e` passes
- `/tmp/servus-questions.md` has been presented to the user for any open items

At completion, surface the questions file to the user.
