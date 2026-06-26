## Context

`ItemStatus` currently has three values: `"pending"`, `"suggested"`,
`"confirmed"`. `"suggested"` was never used. `"pending"` was the photo-first
default and meant "still needs review". `"confirmed"` was the standard-form
default and meant "ready". This change collapses to a cleaner two-value enum and
replaces the flat triage list with a sequential one-at-a-time editor.

## Goals / Non-Goals

**Goals:**

- Remove the unused `"suggested"` value and rename the remaining two values to
  self-describing names.
- Give users explicit control over the status when saving edits (two buttons).
- Replace the flat triage list with a sequential flow that keeps focus on one
  item at a time.
- Migrate existing live KV records in a single idempotent migration script.

**Non-Goals:**

- No status-transition guards (any `complete` item can be re-opened via the
  triage edit form's "Speichern & unvollständig" button).
- No multi-select bulk actions.
- No status filtering on the main `/items` list (that already shows all items).

## Decisions

### D1 — Two-value enum: `"incomplete" | "complete"`

Chosen over a single boolean `isComplete` to keep the KV schema consistent with
the pattern used elsewhere (`BoxStatus`, `ItemStatus`) and to leave room for a
third value in a future change without a breaking migration.

### D2 — Status stored on save, not derived

The status is an explicit field on the KV record. Edit saves must include the
status explicitly (via which button the user clicks). The server does not
auto-transition based on the presence of a name or photo. This avoids surprising
background state changes.

### D3 — Sequential triage: one item at a time

The triage page (`/items/incomplete`) fetches all incomplete items sorted by
`createdAt` ascending, takes the first one, and shows its full edit form inline.
On save, it redirects to the same URL which picks up the next item. The `N of
M`
index is computed by counting total incomplete items and the current item's
position.

Prev/next links step by index (`?idx=N`). When no incomplete items remain, a
dedicated empty-state page is shown.

### D4 — Migration script `scripts/migrate-item-status.ts`

Iterates all `["item", *]` keys. For each item:

- `"pending"` → `"incomplete"`
- `"confirmed"` or `"suggested"` → `"complete"`

Also updates the `["item-by-time", *]` secondary index (the time index value
contains the full item record). All other secondary indexes (`item-by-category`,
`item-by-room`, `item-by-box`, `item-by-container`) store only the item ID as
the value, so they don't need updating.

The script is idempotent: items already with `"incomplete"` or `"complete"` are
skipped.

### D5 — 301 redirect from `/items/pending`

A new `routes/items/pending.ts` (handler-only, no UI) returns a 301 to
`/items/incomplete`. The existing `routes/items/pending.tsx` is replaced.

## Risks / Trade-offs

- [Live data] Items in production KV have `"pending"` and `"confirmed"` values.
  The migration script must be run before or immediately after deploy. The
  server will handle unknown status values gracefully (they simply don't match
  the `"incomplete"` filter on the triage list), but the UI won't display them
  correctly until migrated. → Mitigate by including migration instructions in
  the PR description.

- [Edit form regression] Adding two save buttons replaces the single "Speichern"
  button. Any test that clicks `button[type="submit"]` on the edit form will
  need updating to target the specific button. → Update E2E selectors.

## Migration Plan

1. Deploy new server code.
2. Run `deno run -A scripts/migrate-item-status.ts` against the production KV
   (via `DENO_KV_PATH` or `deployctl kv`).
3. Verify: visit `/items/incomplete` — should show only items that were
   previously `"pending"`.
4. Rollback: no structural change to KV beyond the `status` field value; rolling
   back the server code will show stale status labels but no data loss.
