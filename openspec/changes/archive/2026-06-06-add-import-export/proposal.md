## Why

The running app has no way to back up or restore its data. Before the move goes
live, the owner needs confidence that the full KV dataset can be snapshotted and
re-imported if the store is ever lost or corrupted. A web admin view makes this
accessible from any device — including a phone — without requiring terminal
access.

## What Changes

- New protected admin section at `/admin` — accessible only to authenticated
  users; provides data management tools.
- Export: `GET /admin/export` streams the full KV snapshot as an NDJSON file
  download directly in the browser. Sessions and rate-limit entries are
  excluded.
- Import: `POST /admin/import` accepts a multipart file upload of a
  previously-exported NDJSON file, restores all entries in batches, and
  redirects back to `/admin` with a summary. Idempotent: re-importing the same
  snapshot is safe.
- Delete all data: `GET /admin/delete-confirm` shows a dedicated confirmation
  page with the count of records about to be deleted and a visually destructive
  warning. `POST /admin/delete` executes the wipe and redirects to `/admin` with
  the deleted count. Sessions and rate-limit entries are preserved so the owner
  stays logged in and can immediately run an import.
- New `lib/kv/export.ts`, `lib/kv/import.ts`, and `lib/kv/deleteAll.ts` — pure
  KV logic, callable from route handlers.

## Capabilities

### New Capabilities

- `data-export`: Web admin snapshot/restore of Deno KV application data. Covers
  the admin UI, export download, import upload, delete-all with confirmation,
  what gets exported and in what format, import behaviour (idempotency, batch
  writes, error handling), and the KV key prefixes in scope.

### Modified Capabilities

_(none — no existing spec requirements change)_

## Impact

- **New files**: `routes/admin/index.tsx`, `routes/admin/export.ts`,
  `routes/admin/import.ts`, `routes/admin/delete-confirm.tsx`,
  `routes/admin/delete.ts`, `lib/kv/export.ts`, `lib/kv/import.ts`,
  `lib/kv/deleteAll.ts`
- **No new dependencies** — uses `Deno.openKv`, standard KV iteration, and Fresh
  route handlers already in the project. No external libraries required.
- **No breaking changes** — existing KV schema is unchanged; export reads it
  as-is.
- **R2 photo bytes** are not exported. Photo R2 keys are embedded in item
  records and will appear in the snapshot naturally.

## Non-goals

- Automatic / scheduled snapshots — that is `add-backup-snapshots` (post-launch,
  §7 #10).
- Exporting or migrating R2 photo bytes — R2 has its own durability.
- Data migration or schema transformation — this is a raw snapshot/restore, not
  a migration tool.
- Encryption of the export file — owner is responsible for keeping the
  downloaded file secure.
- Role-based access control on the admin section — all authenticated users are
  currently admins; revisit when helper roles land.
