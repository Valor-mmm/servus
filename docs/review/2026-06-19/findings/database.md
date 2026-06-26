# Database findings

Branch: explore/boxes-contain-items Reviewer: Database agent Date: 2026-06-19

<!-- Findings appended per area; severity: BLOCKER / MAJOR / MINOR / NIT -->

---

## Area 1: lib/kv wrappers & key schema

### [NIT] No global key registry / collision guard

- **Where:** lib/kv/ (no key-registry file exists)
- **Relation:** quality
- **Evidence:** Key-prefix strings like `"item-by-container"`,
  `"category-schema"`, `"group"`, `"group-item"`, `"item-group"` are defined
  locally in each repo file with no cross-file deduplication check. No test
  asserts uniqueness.
- **Recommendation:** Not urgent but a key constant file (even a simple
  `lib/kv/keys.ts`) would prevent future typos that create silent key-space
  clashes.

No BLOCKER/MAJOR/MINOR issues in Area 1. The client wrapper (`lib/kv/client.ts`)
is clean: singleton with `setKv()` for test injection, `closeKv()` for teardown,
`DENO_KV_PATH` override for E2E isolation. All repo files use typed key-builder
functions; no raw string keys leak into the public interface.

---

## Area 2: Inventory entity keys + indexes (items, categories, rooms, boxes, groups)

### [MAJOR] updateItem does not version-check before committing — lost-update race

- **Where:** lib/inventory/itemRepo.ts line 378
  (`op = kv.atomic().set(ITEM_KEY(id), updated)`)
- **Relation:** spec-gap
- **Evidence:** `updateItem` reads the item with a plain `kv.get` (via
  `findItem`), computes `updated`, then commits with `kv.atomic().set(...)` — no
  `.check(existingEntry)` against the item's versionstamp. Two concurrent edits
  (e.g. quantity adjust racing with a field edit) will silently overwrite each
  other's changes; the last write wins. `adjustQuantity` uses `updateItem` and
  is therefore also unprotected. By contrast, `markBoxDelivered` correctly does
  `.check(entry)`. `createRoom/Category/Group` correctly use
  `.check({ key: nameKey, versionstamp: null })` for uniqueness; those are fine.
- **Recommendation:** In `updateItem`, capture the versionstamp from the initial
  `kv.get<Item>(ITEM_KEY(id))` call (currently reached through `normalizeItem`
  inside `findItem`) and add `.check({ key: ITEM_KEY(id), versionstamp })` to
  the atomic op. This requires refactoring `findItem` to optionally return the
  entry or threading the versionstamp through a wrapper.

### [MINOR] reorderMembers in groupRepo uses non-atomic per-member kv.set loop

- **Where:** lib/inventory/groupRepo.ts lines 244–251
- **Relation:** spec-violation (groups spec: "Reordering MUST persist")
- **Evidence:** `reorderMembers` loops over `orderedItemIds` and calls
  `await kv.set(GROUP_ITEM_KEY(groupId, itemId), { position })` for each item
  individually. If the process is interrupted mid-loop, the group will have a
  partially updated position set — some members at new positions, others at old
  positions.
- **Recommendation:** Build a single `kv.atomic()` op covering all position
  updates in the loop; commit once.

### [NIT] listItems() / countItems() use prefix ["item"] with eventual consistency

- **Where:** lib/inventory/itemRepo.ts lines 203–211, 436–444
- **Relation:** quality
- **Evidence:** `listItems()` uses `{ prefix: ["item"] }` with strong
  consistency (acceptable). `countItems()` uses `{ consistency: "eventual" }`
  which may undercount immediately after a write. Currently only used on the
  dashboard for a display count; not a data-correctness issue, but callers
  should be aware of the lag.
- **Recommendation:** Document the eventual-consistency caveat at the call site;
  acceptable for a display metric.

---

## Area 3: Containment data model & orphan handling

### [MAJOR] Group-membership cleanup on item delete is not atomic with item deletion — dangling index risk

- **Where:** lib/inventory/itemRepo.ts lines 497–505
- **Relation:** spec-violation (groups spec: "Deleting an item MUST remove all
  of that item's group memberships … no membership entry referencing it
  remains")
- **Evidence:** `deleteItem` commits the item deletion and all containment/index
  cleanup in one `kv.atomic()` op (lines 469–493). Group membership cleanup then
  runs in a separate `for await` loop with individual `kv.atomic()` calls per
  membership (lines 497–505). If the process terminates after the item is
  deleted but before all membership entries are cleaned,
  `["item-group", id, groupId]` and `["group-item", groupId, id]` entries
  survive pointing at a deleted item. `listMembers` silently skips the dangling
  `group-item` entries (because `findItem` returns null), but the orphaned
  entries grow silently and the group's displayed count (from `countMembers`,
  which counts index keys without checking item existence) will be inflated.
- **Recommendation:** Either include all group-membership deletes in the same
  atomic op as the item deletion (feasible if group count is small), or run them
  as best-effort with a compensating sweep. At minimum, make `countMembers`
  consistent with what `listMembers` would display.

### [MINOR] assertNoCycle has no depth limit — unbounded KV reads on deep chains

- **Where:** lib/inventory/itemRepo.ts lines 104–121
- **Relation:** quality
- **Evidence:** `assertNoCycle` walks ancestors one KV get per level with no
  iteration cap. `resolveRoom` has a 100-iteration guard. A pathological chain
  of depth N triggers N async KV reads on every container assignment update.
  Normal use won't hit this, but it's asymmetric with `resolveRoom`.
- **Recommendation:** Add the same depth guard (e.g. > 100 → throw "containment
  chain too deep") to `assertNoCycle`.

### [NIT] deleteItem only re-homes direct children — grandchildren implicitly depend on child being kept alive

- **Where:** lib/inventory/itemRepo.ts lines 477–491
- **Relation:** quality
- **Evidence:** When a container item is deleted, only its direct children are
  repointed (containerId cleared, optional roomId set) in the atomic op.
  Grandchildren still have containerId pointing to the (now-root) child item,
  which is correct — the chain is simply shortened. No data loss. However, if
  the caller passes `replacementRoomId` expecting all descendants to land in a
  room, only the direct children get roomId; grandchildren remain contained
  within the child (whose roomId was just set). This matches the spec ("direct
  children have containerId cleared and roomId set") but could surprise callers
  expecting a full flatten.
- **Recommendation:** The spec is clear that only direct children are re-homed.
  Add a comment clarifying that grandchildren stay under their direct parent
  (the now-root child) rather than being flattened.

Area 3 containment model is otherwise sound: root-owns-room invariant is
correctly enforced in both `createItem` and `updateItem` (containerId forces
roomId=null, boxId=null); mutual exclusion between containerId/boxId/roomId is
fully handled; cycle detection is present in both create and update paths;
category-based container-capability check is applied before any containerId
assignment; category `canContain` flip is blocked when containers are occupied.

---

## Area 4: Quantity / atomic mutation paths

### [MAJOR] updateItem (and therefore all quantity mutations) has no version check — lost-update race

- **Where:** lib/inventory/itemRepo.ts lines 307–418 (`updateItem`), lines
  446–454 (`adjustQuantity`)
- **Relation:** spec-gap
- **Evidence:** `updateItem` reads the existing item via `findItem` (which does
  a plain `kv.get` without capturing the versionstamp), computes the updated
  record, then commits with `kv.atomic().set(ITEM_KEY(id), updated)` — no
  `.check()`. Two concurrent `adjustQuantity(id, 1)` calls on an item with
  quantity=5 can both read 5 and both write 6, silently losing one increment.
  This is the same root cause as the finding in Area 2 but has specific
  quantity-correctness impact. The `markBoxDelivered` function correctly uses
  `.check(entry)` — this inconsistency indicates the pattern was known but not
  applied uniformly.
- **Recommendation:** Thread the versionstamp from the initial `kv.get` through
  to the atomic commit (either refactor `findItem` to return the raw entry, or
  add a new `findItemEntry` helper that returns `Deno.KvEntry<Item>`). For the
  `adjustQuantity` hot path specifically, a CAS retry loop is the cleanest fix.

### [MINOR] adjustQuantity reads item twice before the atomic write — the second read (inside updateItem) may see a different version

- **Where:** lib/inventory/itemRepo.ts lines 446–454
- **Relation:** quality
- **Evidence:** `adjustQuantity` reads the item once to check `quantity <= 1`
  clamp condition, then calls `updateItem` which reads the item again. The delta
  is computed from the FIRST read (`item.quantity + delta`) but passed as a
  literal to `updateItem`, which then validates against its OWN fresh read for
  all other fields. The two reads create a subtle split-brain: the delta is
  computed from the first snapshot but merged with the second snapshot's other
  fields. In practice this only matters if another concurrent update changes a
  non-quantity field between the two reads (unlikely but possible).
- **Recommendation:** Collapse both reads into one by making `adjustQuantity`
  call a dedicated CAS loop that atomically increments within a single
  read-check-write cycle.

Area 4 summary: the quantity island and `adjustQuantity` path have no optimistic
locking. For a two-person app the window is tiny, but the pattern should be
fixed before the app sees any helper users during move day.

---

## Area 5: Category-schema storage & evolution

### [MAJOR] Field key rename in schema editor silently orphans existing item metadata

- **Where:** lib/inventory/schemaRepo.ts `updateSchema`;
  lib/inventory/validateSchema.ts `validateSchemaDefinition`
- **Relation:** spec-gap
- **Evidence:** When a user-defined schema field key is renamed (e.g. `"brand"`
  → `"marke"`), `updateSchema` writes the new schema definition but does NOT
  update any existing item's `metadata` object. Items whose category uses that
  schema will thereafter store the old key (`metadata.brand`) which the schema
  no longer defines. On the next item edit, `validateMetadata` silently drops
  unknown keys — the stored value for `"brand"` is permanently lost from that
  item's metadata. On live data this is a silent, irreversible data loss.
- **Recommendation:** Block field key changes in `updateSchema` (keys are stable
  machine identifiers per `FieldDef` comment). Alternatively, issue a migration
  over all items in categories using the schema type when a key changes. The
  blocking approach is simpler and safer.

### [MINOR] updateSchema uses plain kv.set (no optimistic lock)

- **Where:** lib/inventory/schemaRepo.ts line 189
- **Relation:** quality
- **Evidence:** `updateSchema` writes with `await kv.set(key, stored)` without
  checking the existing versionstamp. Two concurrent schema edits could
  overwrite each other silently. Less impactful than item updates (schemas are
  rarely edited concurrently) but inconsistent with `createSchema` which uses
  `kv.atomic().check(...)`.
- **Recommendation:** Use
  `kv.atomic().check(existing).set(key, stored).commit()` — retry or surface
  conflict to caller.

### [NIT] deleteSchema race: schema deleted between category's schemaTypeExists check and its atomic write

- **Where:** lib/inventory/categoryRepo.ts `createCategory` /
  lib/inventory/schemaRepo.ts `deleteSchema`
- **Relation:** quality
- **Evidence:** `createCategory` checks `schemaTypeExists` then atomically
  writes the category. `deleteSchema` checks `schemaInUse` then deletes. In a
  concurrent scenario: category creation passes `schemaTypeExists`, schema
  deletion passes `schemaInUse` (no categories yet), both proceed — category is
  created pointing at a now-deleted user schema. Resolution falls back to
  generic silently. Consequence is mild (metadata treated as generic) but item
  fields are silently ignored. Not a real risk for a two-user app.
- **Recommendation:** Document as known limitation; acceptable for current use.

Area 5 summary: schema evolution (field key rename) is the most dangerous
pattern — it causes silent, irreversible metadata loss on existing items. The
fix (block key changes) is straightforward. The `["category-schema"]` export gap
(confirmed here, reported in Area 7) compounds this: after a backup-restore,
custom schemas are lost and all items that used them fall back to generic
schema, losing metadata display.

---

## Area 6: migrate-item-containment script safety

### [MINOR] Migration script shebang missing --allow-write — will fail when run against local KV path

- **Where:** scripts/migrate-item-containment.ts line 1
- **Relation:** quality
- **Evidence:** Shebang:
  `#!/usr/bin/env -S deno run --allow-env --allow-read --unstable-kv`. The
  `--allow-write` flag is absent. When running this script against a local
  SQLite-backed KV file (via `DENO_KV_PATH`), `kv.set()` calls will fail with a
  permission error at runtime. Deno KV on Deno Deploy does not need
  `--allow-write`, but the script is intended for local migration use.
- **Recommendation:** Add `--allow-write` to the shebang:
  `#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --unstable-kv`.
  Also add a header comment recommending `GET /admin/export` backup before
  running.

### [MINOR] Migration writes without a version check — concurrent category/item updates can be clobbered

- **Where:** scripts/migrate-item-containment.ts lines 16–20, 28–32
- **Relation:** quality
- **Evidence:** The migration lists all categories and items, then for each
  record that lacks the new field, calls
  `kv.set(entry.key, { ...val, canContain: false })`. No versionstamp check. If
  a concurrent category rename (or item edit in the live app) occurs between the
  list scan and the set call, the migration write will overwrite the updated
  value with a stale snapshot. The newly renamed category name or edited item
  fields are silently discarded.
- **Recommendation:** Use
  `kv.atomic().check(entry).set(entry.key, {...}).commit()` and skip on conflict
  (the record was already updated and likely already has the field). Since the
  migration is additive (only writes when the field is absent), a conflict means
  the other write already handled it — safe to skip.

### [NIT] No backup reminder in script header

- **Where:** scripts/migrate-item-containment.ts lines 1–7
- **Relation:** quality
- **Evidence:** The script runs against live KV but includes no comment
  suggesting a pre-migration export backup. Live data is at risk if the script
  has unexpected behavior.
- **Recommendation:** Add:
  `// IMPORTANT: Run GET /admin/export to create a backup before executing this migration.`

Area 6 summary: the migration is logically correct and idempotent (skips records
that already have the field). The shebang permission gap is the most actionable
issue — it would block execution against a local KV file without manual
permission flags.

---

## Area 7: Export/import round-trip integrity

### [BLOCKER] Five KV prefixes are absent from EXPORT_PREFIXES — backup-restore loses groups, containment, and custom schemas

- **Where:** lib/kv/export.ts lines 1–18 (`EXPORT_PREFIXES`); data-export spec
  lines 52–58
- **Relation:** spec-gap (data-export spec lists in-scope prefixes; it predates
  groups and containment and was never updated to include them)
- **Evidence:** `EXPORT_PREFIXES` contains 16 prefix entries. The following
  in-production key spaces are absent:
  - `["category-schema"]` — all user-defined custom category field schemas
  - `["group"]` — group primary records
  - `["group-item"]` — group→item membership index (both directions)
  - `["item-group"]` — item→group reverse index
  - `["item-by-container"]` — containment index (new in this branch) A
    `GET /admin/export` → `POST /admin/import` round-trip silently drops all
    groups, all group memberships, all custom schemas, and the containment
    index. After a restore the UI shows items but: all custom schema field
    definitions are gone (items fall back to generic schema; metadata fields are
    invisible), all groups are gone, all containment relationships are gone
    (container items appear as plain items). Since the production app is LIVE
    with custom schemas and items added by the wife, a restore today loses that
    work permanently. `deleteAllKv` also uses `EXPORT_PREFIXES`, so a delete-all
    leaves all five of these key spaces intact — producing orphaned
    group/containment index entries that are invisible to the app but accumulate
    silently.
- **Recommendation:** Add the five missing prefixes to `EXPORT_PREFIXES` in
  `lib/kv/export.ts`. Update the data-export spec to list them. Add a test case
  to `tests/unit/kv/export_test.ts` that seeds one entry of each prefix and
  asserts it appears in the output. Priority: fix before any backup/restore is
  used on real data.

### [MAJOR] importKv has no try/catch around JSON.parse — a malformed line partially commits the import and aborts

- **Where:** lib/kv/import.ts lines 27–30
- **Relation:** spec-violation (data-export spec scenario "Import with malformed
  or empty file shows error" requires "no existing KV entries are corrupted")
- **Evidence:** `importKv` calls `JSON.parse(trimmed)` with no surrounding
  try/catch. A `SyntaxError` propagates up through the route handler's outer
  try/catch (routes/admin/import.ts line 41–56) and returns an error redirect —
  but all batches already flushed before the bad line have been committed to KV.
  The import is left in a half-written state: some entries exist, the rest are
  absent, with no rollback. The spec requires "no existing KV entries are
  corrupted" but says nothing about atomicity of the import itself; nevertheless
  a partial import is worse than no import and silently splits the dataset.
- **Recommendation:** Wrap `JSON.parse` in a try/catch inside `importKv`; on
  parse error either skip the line (with a skipped++ increment) or throw with
  the line number so the route can show a useful error. To enforce
  all-or-nothing semantics, accumulate all lines in memory and only commit after
  full parse (viable for typical export sizes); for large files at least
  document that failure mid-stream leaves a partial state.

### [MINOR] importKv performs no schema or type validation on imported values

- **Where:** lib/kv/import.ts lines 27–43
- **Relation:** quality
- **Evidence:** Every non-session, non-rate entry from the NDJSON file is
  written directly to KV without checking the key structure or value shape. A
  corrupted or manually edited export file could write malformed item, box, or
  category records that pass silently through the importer and then cause
  runtime errors later when the typed wrappers try to use them.
- **Recommendation:** At minimum, validate that `entry.key` is a non-empty array
  of strings/numbers and that `entry.value` is not `undefined`. Full per-entity
  validation is optional given the two-user scope but the key shape check is
  cheap and catches the most common corruption.

### [NIT] deleteAllKv leaves category-schema, group, group-item, item-group, and item-by-container entries intact

- **Where:** lib/kv/deleteAll.ts lines 22–30 (uses `EXPORT_PREFIXES`)
- **Relation:** quality
- **Evidence:** Because `deleteAllKv` derives its scope from `EXPORT_PREFIXES`,
  it shares the same prefix gap as the export. After a delete-all, the five
  missing key spaces remain in KV. If the owner then runs import to restore from
  a backup, the restored app has groups/containment from the backup PLUS
  orphaned entries from before the delete — potential duplicates or stale group
  memberships.
- **Recommendation:** Fix is implicit in the BLOCKER fix above (adding missing
  prefixes to `EXPORT_PREFIXES` also fixes `deleteAllKv`). No separate change
  needed.

Area 7 summary: the export prefix gap is the highest-severity finding in this
entire review. Five key spaces — including the custom category schemas that the
wife has already created — are silently absent from every backup and every
delete-all. A restore today would lose all group data and all custom schema
definitions, making item metadata fields invisible. The fix is one-line (add
five entries to `EXPORT_PREFIXES`) but the spec must be updated alongside it.

---

## Area 8: Live-data migration risk summary

This area synthesizes all findings through the lens of the production app, which
is LIVE with real data (items + custom categories added by the owner's wife) and
is about to undergo the house move.

### Migration requirement for the containment branch

The branch introduces two schema changes:

1. `Category.canContain: boolean` (new field)
2. `Item.containerId: string | null` (new field)

**Runtime normalizers handle missing fields automatically:** `normalizeCategory`
(categoryRepo.ts:17) defaults `canContain` to `false`; `normalizeItem`
(itemRepo.ts:185) defaults `containerId` to `null`. The script
`scripts/migrate-item-containment.ts` is therefore NOT required for correctness
— the live app will handle existing records correctly without it. Running the
migration is a hygiene improvement (explicit field in KV) but its omission is
not a data risk.

**If the migration IS run:** it has two fixable issues (missing `--allow-write`,
no version check) documented in Area 6. It is logically correct and idempotent.
Recommend running it with the permission fix applied and with a pre-run export
backup.

### Critical live-data risk: export does not cover custom schemas or groups

The most serious live-data risk is the export gap found in Area 7. The
production app has custom category schemas (`["category-schema"]` keys) that the
wife created. Any admin export taken today produces a file that silently omits
those schemas. If the owner ever restores from that backup — including after a
delete-all — the custom schemas are gone. Items fall back to generic schema and
all custom metadata fields become invisible in the UI.

**Mitigation before next backup:** add `["category-schema"]`, `["group"]`,
`["group-item"]`, `["item-group"]`, and `["item-by-container"]` to
`EXPORT_PREFIXES`. This must happen before any backup is relied upon as a
restore point.

### Concurrent-write risk (move-day helper users)

The branch does not change the pre-existing lack of optimistic locking in
`updateItem` (Areas 2 and 4). During the move, helper users may be invited and
multiple people editing items simultaneously could silently lose each other's
quantity adjustments. The window is small for a two-person household but rises
when helpers are present. This is a pre-existing risk, not introduced by this
branch.

### Field-rename risk (custom schema editor)

Any user renaming a custom schema field key (e.g. "brand" → "marke") silently
orphans existing item metadata for that field (Area 5). On a live database this
is an irreversible, silent data loss. The fix (block field key renames) must be
applied before the schema editor is used on production data.

### Schema-delete race (minor)

The race between schema delete and category creation (Area 5 NIT) is extremely
unlikely in a two-user system and has no live-data consequence worth acting on
before the move.

### Rank-ordered live-data risks (most urgent first)

| Rank | Finding                                                        | Area      | Risk if not fixed                                                                 | Urgency                                |
| ---- | -------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| 1    | Export missing `category-schema` + groups/containment prefixes | 7 BLOCKER | Any backup is incomplete; restore loses all custom schema + group data            | Fix before taking any backup           |
| 2    | Field key rename silently orphans item metadata                | 5 MAJOR   | Silent, irreversible metadata loss on live items                                  | Fix before schema editor used again    |
| 3    | updateItem / adjustQuantity no version check                   | 2/4 MAJOR | Silent quantity loss under concurrent edits (move-day helpers)                    | Fix before helper users invited        |
| 4    | migration script missing --allow-write                         | 6 MINOR   | Script fails to run against local KV                                              | Fix before running migration locally   |
| 5    | Group-membership delete not atomic with item delete            | 3 MAJOR   | Orphaned index entries (inflated group count); self-heals when members are viewed | Low urgency; no user-visible data loss |

Area 8 summary: the single highest-stakes action before the move is fixing the
export prefix list. Everything else is fixable in sequence. The migration script
itself is safe to skip — the runtime normalizers handle the new fields
gracefully without it.

---

## Summary

### Finding counts

| Severity | Count |
| -------- | ----- |
| BLOCKER  | 1     |
| MAJOR    | 6     |
| MINOR    | 7     |
| NIT      | 5     |

### Top 3 things to fix (move-day order)

**1. Fix the export prefix list (BLOCKER — Area 7)** Add `["category-schema"]`,
`["group"]`, `["group-item"]`, `["item-group"]`, and `["item-by-container"]` to
`EXPORT_PREFIXES` in `lib/kv/export.ts`. This is a one-file, one-liner fix with
an outsized impact: every backup taken today silently discards custom schemas
and groups. A restore from a current backup would make all custom metadata
fields invisible in the UI, losing the wife's data configuration permanently.
Must be done before any backup is treated as a valid restore point.

**2. Block custom schema field key renames (MAJOR — Area 5)** In `updateSchema`,
detect when a field key changes and reject the request (or issue a metadata
migration over all affected items). Currently a key rename silently orphans all
existing item metadata for that field — irreversible on a live database.

**3. Add optimistic locking to `updateItem` (MAJOR — Areas 2 and 4)** Capture
the versionstamp in the initial `kv.get` inside `findItem` and add `.check(...)`
to the atomic commit in `updateItem`. This protects all quantity adjustments and
field edits from silent lost-update races — especially important when helper
users are active during the move.

### Live-data risk callout

The production app is LIVE with real data. The single most dangerous gap is the
**export prefix omission**: if the owner takes a backup today and restores it
after any issue, all custom category schemas and all groups are silently lost.
The normalizers protect the app at runtime from the migration not having been
run, so no migration is urgently required — but the export must be fixed
immediately. All other findings are pre-existing concerns that do not originate
from the containment branch.
