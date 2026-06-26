# Decision: data export and import

**Date:** 2026-03\
**Change:** `add-import-export`

## Context

Deno KV on Deno Deploy includes automatic backups, but those are opaque to the
user. The owners wanted the ability to take a human-readable snapshot at any
time (before a major data migration, at end-of-move, etc.) and restore from it
if needed.

## Decision

Add an admin-only export endpoint (`GET /admin/export`) that streams all KV
records matching `EXPORT_PREFIXES` as NDJSON (one JSON object per line), with
the KV key and value encoded. Import (`POST /admin/import`) accepts an NDJSON
file, parses it, and writes the entries back.

`EXPORT_PREFIXES` is the authoritative list of all KV prefixes that constitute
app state. `deleteAllKv` delegates to the same list. Adding a new KV entity type
requires adding its prefix to `EXPORT_PREFIXES` or it will be silently omitted
from backups.

Import is atomic at the record level: the file is fully parsed before any writes
begin. A malformed line causes the entire import to be rejected (no partial
commit).

## Alternatives considered

- **Deno Deploy managed backup** — sufficient for disaster recovery but not
  user-accessible for selective restore or migration.
- **SQL dump** — N/A; we use Deno KV.
- **Per-entity CSV** — harder to import reliably; NDJSON is self-describing.

## Consequences

The admin hub at `/admin` is the single access point for both operations.
`EXPORT_PREFIXES` in `lib/kv/export.ts` must be kept in sync with the KV layout
as new entities are added.
