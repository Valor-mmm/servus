# data-export Specification

## Purpose

TBD - created by archiving change add-import-export. Update Purpose after
archive.

## Requirements

### Requirement: Admin web UI for export and import

The app MUST provide a protected admin page at `/admin` accessible to any
authenticated user. The page MUST offer an export action that triggers a browser
file download and an import form that accepts a file upload to restore a
snapshot. Unauthenticated requests to any `/admin/*` route MUST be redirected to
`/login`.

#### Scenario: Export triggers a file download

- **WHEN** an authenticated user activates the export action on `/admin`
- **THEN** the browser downloads a file named
  `servus-export-<YYYY-MM-DD>.ndjson`
- **AND** the file contains one NDJSON line per in-scope KV entry

#### Scenario: Import restores data and shows summary

- **WHEN** an authenticated user uploads a valid NDJSON snapshot file via the
  import form
- **THEN** all in-scope entries are written to KV
- **AND** the page displays the imported and skipped record counts

#### Scenario: Import with malformed or empty file shows error

- **WHEN** an authenticated user submits the import form with a malformed or
  empty file
- **THEN** the page displays an error message
- **AND** no existing KV entries are corrupted

#### Scenario: Unauthenticated access is rejected

- **WHEN** an unauthenticated request is made to any `/admin/*` route
- **THEN** the response is a redirect to `/login`

---

### Requirement: Export produces NDJSON covering all in-scope KV prefixes

`GET /admin/export` MUST stream the response as `application/x-ndjson` with
`Content-Disposition: attachment`. Each entry MUST be serialised as a single
JSON line: `{ "key": [...], "value": <any>, "versionstamp": "<hex>" }`.

The following KV key prefixes are in scope (iterated via `kv.list`): `["item"]`,
`["item-by-category"]`, `["item-by-room"]`, `["item-by-box"]`,
`["item-by-time"]`, `["box"]`, `["box-by-code"]`, `["box-tombstone"]`,
`["room"]`, `["room-by-name"]`, `["category"]`, `["category-by-name"]`,
`["user"]`, `["invite"]`, `["invite-by-code"]`, `["invite-by-expiry"]`.

The single key `["box-code-counter"]` MUST also be included (via `kv.get`).

The following prefixes MUST be excluded: `["session"]`, `["session-by-user"]`,
`["rate"]`.

#### Scenario: All in-scope prefixes appear in the download

- **WHEN** the KV store contains entries across all in-scope prefixes
- **THEN** the downloaded file contains one line for each such entry

#### Scenario: Excluded prefixes are never written

- **WHEN** the KV store contains session, session-by-user, and rate entries
- **THEN** the export output MUST NOT contain any line whose `key[0]` is
  `"session"`, `"session-by-user"`, or `"rate"`

#### Scenario: Empty store produces an empty file

- **WHEN** the KV store contains no in-scope entries
- **THEN** the downloaded file is empty (zero bytes)

---

### Requirement: Import writes all in-scope entries in atomic batches

`POST /admin/import` MUST accept a multipart form upload, parse each NDJSON
line, and write entries to KV in batches of at most 50 per `kv.atomic()`
transaction. Entries whose `key[0]` is `"session"`, `"session-by-user"`, or
`"rate"` MUST be silently skipped. After completion the handler MUST redirect to
`/admin` with the imported and skipped counts visible on the page.

#### Scenario: Successful import of a valid snapshot

- **WHEN** a valid NDJSON snapshot containing N in-scope entries is uploaded
- **THEN** all N entries are written to KV
- **AND** the admin page shows the imported count

#### Scenario: Import is idempotent

- **WHEN** the same snapshot is uploaded twice
- **THEN** the KV store contains the same data as after the first upload
  (overwrite semantics; no duplicates, no errors)

#### Scenario: Session and rate entries in snapshot are skipped

- **WHEN** the snapshot contains entries with `key[0]` equal to `"session"`,
  `"session-by-user"`, or `"rate"`
- **THEN** those entries are silently skipped
- **AND** the skipped count is shown on the admin page after redirect

---

### Requirement: Delete all application data with two-step confirmation

The admin page MUST provide a path to wipe all in-scope KV data. The flow is two
steps: the owner first navigates to a dedicated confirmation page
(`GET /admin/delete-confirm`), then submits the confirmation form
(`POST /admin/delete`). The confirmation page MUST display the exact count of
records that will be deleted and MUST use a visually destructive style
(danger/red treatment on the delete button, prominent warning text). A clearly
visible cancel action MUST return the owner to `/admin` without deleting
anything.

Sessions (`["session"]`, `["session-by-user"]`) and rate entries (`["rate"]`)
MUST NOT be deleted, so the owner remains logged in and can immediately run an
import.

After a successful delete the owner MUST be redirected to `/admin` with the
deleted count visible on the page.

#### Scenario: Confirmation page shows record count

- **WHEN** an authenticated user navigates to `/admin/delete-confirm`
- **THEN** the page displays the number of records that will be deleted
- **AND** the page uses a visually destructive style for the delete action
- **AND** a cancel action is prominently available

#### Scenario: Cancel returns to admin without deleting

- **WHEN** the owner activates the cancel action on the confirmation page
- **THEN** the owner is returned to `/admin`
- **AND** no KV entries are modified

#### Scenario: Confirming the deletion wipes all in-scope data

- **WHEN** the owner submits the confirmation form
- **THEN** all entries under the in-scope prefixes are deleted from KV
- **AND** the owner is redirected to `/admin` with the deleted count shown
- **AND** no session or rate-limit entries are deleted

#### Scenario: Owner remains logged in after deletion

- **WHEN** the owner completes a delete-all
- **THEN** their session cookie remains valid
- **AND** they can immediately use the import form without re-authenticating

#### Scenario: Unauthenticated access to confirmation page is rejected

- **WHEN** an unauthenticated request is made to `/admin/delete-confirm` or
  `POST /admin/delete`
- **THEN** the response is a redirect to `/login`

---

### Requirement: KV logic is decoupled from the web layer

`lib/kv/export.ts` and `lib/kv/import.ts` MUST accept a `Deno.Kv` instance as an
argument rather than opening KV themselves. Route handlers MUST obtain the KV
instance via the app's existing `getKv()` and pass it in. This keeps the KV
logic independently testable with an in-memory KV.

#### Scenario: Export function is callable with an in-memory KV

- **WHEN** a test passes `await Deno.openKv(":memory:")` to `exportKv()`
- **THEN** the function iterates and yields entries without error

#### Scenario: Import function is callable with an in-memory KV

- **WHEN** a test passes `await Deno.openKv(":memory:")` to `importKv()`
- **THEN** the function writes entries without error

---

### Requirement: No new runtime dependencies

Export and import MUST rely solely on `Deno.openKv`, the Deno standard library,
and modules already imported in `deno.json`. No new entries in `deno.json`'s
`imports` map MUST be required.

#### Scenario: CI dependency audit passes

- **WHEN** CI runs the dependency audit step after this change is merged
- **THEN** no new external dependencies are detected
