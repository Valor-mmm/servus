## Context

Deno KV is the sole persistent store. There is currently no way to take a
snapshot of its contents or restore one. The running app has two users and a
small but irreplaceable inventory dataset. Before the move goes live, a
backup/restore mechanism is required — one that can be triggered from a phone
browser, needs no terminal access, and requires no new infrastructure or
dependencies.

R2 is used for photo storage. Photo bytes live in R2 with R2's own durability.
Photo R2 keys are stored as `string[]` on each item record — they appear
naturally in the KV export without any special handling.

## Goals / Non-Goals

**Goals:**

- Produce a lossless, machine-readable snapshot of all application KV data,
  downloadable from the browser
- Restore a snapshot from a browser file upload
- Require zero new dependencies beyond what is already in the project
- Be accessible from any device (including mobile) without terminal access

**Non-Goals:**

- Automatic or scheduled snapshots (`add-backup-snapshots`, post-launch)
- Exporting R2 photo bytes
- Data migration or schema transformation
- Encryption of the export file
- Role-based admin access control (all authenticated users are currently admins)

## Decisions

### 1. Output format: newline-delimited JSON (NDJSON)

A single JSON blob of the full KV store requires holding the entire dataset in
memory before writing. NDJSON streams one record per line, keeping memory flat
and making the file human-readable and greppable.

Each line is a JSON object:
`{ "key": [...], "value": <any>, "versionstamp": "<hex>" }`.

**Alternatives considered:**

- Single JSON array — requires full in-memory buffer; harder to stream.
  Rejected.
- Binary/MessagePack — no human readability, no standard Deno tooling. Rejected.

### 2. KV key prefix scope

**Exported** (application data, non-ephemeral), all via
`kv.list({ prefix: [...] })`:

- `["item"]`, `["item-by-category"]`, `["item-by-room"]`, `["item-by-box"]`,
  `["item-by-time"]`
- `["box"]`, `["box-by-code"]`, `["box-tombstone"]`
- `["room"]`, `["room-by-name"]`
- `["category"]`, `["category-by-name"]`
- `["user"]`
- `["invite"]`, `["invite-by-code"]`, `["invite-by-expiry"]`

The single key `["box-code-counter"]` is fetched via `kv.get` and included
separately.

**Excluded** (ephemeral / security-sensitive):

- `["session"]`, `["session-by-user"]` — tied to browser cookies; meaningless
  after restore
- `["rate"]` — transient rate-limit counters; importing stale ones would lock
  users out

These lists are constants in `lib/kv/export.ts` and are the canonical reference.

### 3. Import idempotency: last-writer-wins via `kv.set`

Re-running import on a store that already contains data is safe: each `kv.set`
call overwrites the existing value. No merge logic. If the owner wants a clean
restore, they clear the KV namespace first (out of scope here).

**Alternative:** `kv.atomic().check(null, key).set(...)` to only write missing
keys — complicates the restore story and is surprising if stale data is already
present. Rejected.

### 4. Batch size for import writes: 50 per atomic transaction

Deno KV atomics have an undocumented but observed limit of ~100 operations per
transaction. 50-entry batches stay safely below that limit. Each batch is one
`kv.atomic()` commit; a failure mid-batch is retryable.

### 5. KV connection: app's existing `getKv()` from `lib/kv/client.ts`

Route handlers already use `getKv()`, which returns the singleton KV instance
for the running process. `lib/kv/export.ts` and `lib/kv/import.ts` accept a
`Deno.Kv` argument so they are testable in isolation (pass an in-memory KV in
tests). Route handlers call `await getKv()` and pass it in.

This is consistent with the rest of the app and needs no env-var wiring.

### 6. Export delivery: HTTP streaming response with `Content-Disposition: attachment`

`GET /admin/export` sets:

- `Content-Type: application/x-ndjson`
- `Content-Disposition: attachment; filename="servus-export-<YYYY-MM-DD>.ndjson"`

The response body is a `ReadableStream` that yields NDJSON lines as they are
produced. The browser triggers a file download immediately — no intermediate
storage needed, works on mobile.

**Alternative:** Buffer the full export in memory and send as a single response
— wastes memory for large datasets. Rejected in favour of streaming.

### 7. Import delivery: multipart form upload

`POST /admin/import` accepts `multipart/form-data` with a single file field
(`file`). The Fresh route handler reads the uploaded file bytes, splits on
newlines, and passes the lines to `importKv()`. After completion (or error), it
redirects to `/admin?result=imported&count=N` (or `?error=...`).

No island is needed — standard HTML form submit. The result is displayed as a
banner on the admin page using the query param.

### 8. Delete-all: two-step confirmation with session preservation

`GET /admin/delete-confirm` renders a standalone confirmation page — not the
main admin page — to prevent accidental submission. It shows the exact count of
records that will be deleted (via a live `kv.list` count across all export
prefixes) and uses a visually destructive style: red/danger button, prominent
warning text, and a large "Cancel" link back to `/admin`. No JS is required; the
confirmation is a standard HTML form POST.

`POST /admin/delete` executes the wipe using the same prefix list as export,
then redirects to `/admin?deleted=N`.

Sessions (`["session"]`, `["session-by-user"]`) and rate-limit entries
(`["rate"]`) are **not** deleted. This keeps the owner logged in after the wipe
so they can immediately use the import form — the intended follow-up action.

`lib/kv/deleteAll.ts` exports
`deleteAllKv(kv: Deno.Kv): Promise<{deleted: number}>`, reusing
`EXPORT_PREFIXES` from `lib/kv/export.ts`. It deletes in batches of 50 via
`kv.atomic()`, matching the import batch strategy for consistency.

**Alternative considered:** Require typing "LÖSCHEN" to confirm — stronger guard
but adds friction on mobile. Rejected; two-step with a destructive visual is
sufficient for a 2-user app where both users are trusted admins.

### 9. Admin page access control

`/admin/*` routes use the existing `requireAuth` middleware (same as all other
routes). There is no additional role check — all authenticated users are
currently admins. The non-goal note in the proposal acknowledges this and defers
role-based access to the helper-role change.

## Risks / Trade-offs

- **KV iteration is not a point-in-time snapshot** — concurrent mutations during
  export may produce an internally inconsistent snapshot. Mitigation: document
  this on the admin page; for a 2-user app the risk is negligible.
- **Re-importing does not rebuild derived index keys from scratch** — if a new
  index prefix is added in a future schema change, an old snapshot won't
  populate it. Acceptable at current scale; a future migration script would
  handle re-indexing.
- **Sessions excluded from delete** — after a delete-all, the owner stays logged
  in. This is intentional but means their browser session references data that
  no longer exists until re-imported. Mitigation: the admin page should prompt
  to run an import immediately after deletion.
- **No integrity check on the import file** — a truncated NDJSON file will
  silently restore partial data. Mitigation: the route returns the imported and
  skipped counts; owner can compare with the line count of the original file.
- **Streaming export over a slow mobile connection** — if the connection drops
  mid-stream, the download is incomplete. Mitigation: the owner can simply
  retry; import is idempotent.

## Open Questions

_(none — all design decisions resolved above)_
