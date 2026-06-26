## Why

The nav currently links directly to `/admin/invites`, bypassing the `/admin` hub
that was introduced in `add-import-export`. As a result, the export, import, and
delete-all tools are unreachable from the navigation — users would have to know
the URL. The two admin entry points are also inconsistent: invite management is
a top-level nav item while data management has no nav presence at all.

Consolidating to a single `/admin` nav link and embedding invite management as a
section on that page gives the admin area a coherent structure: one place to go
for all admin tasks.

## What Changes

- The nav link changes from `/admin/invites` to `/admin`.
- The invite management UI (list, create form, one-time code + QR display,
  revoke buttons) moves into `/admin` as a fourth section alongside export,
  import, and delete-all.
- `/admin/invites` becomes a redirect to `/admin` (preserves any bookmarks).
- `/admin/invites/[id]/revoke` continues to handle revoke POSTs but redirects
  back to `/admin` instead of `/admin/invites`.

## Capabilities

### Modified Capabilities

- `invites`: The invite management UI is now located at `/admin`, not
  `/admin/invites`. The functional requirements (create, list, revoke, one-time
  code display) are unchanged.

### New Capabilities

_(none)_

## Impact

- **Changed files**: `routes/_app.tsx`, `routes/admin/index.tsx`,
  `routes/admin/invites/index.tsx` (becomes redirect),
  `routes/admin/invites/[id]/revoke.ts` (redirect target update),
  `lib/i18n/locales/de.ts` (nav key rename)
- **No new dependencies**
- **No breaking changes to functionality** — all invite operations remain
  available; `/admin/invites` redirects gracefully

## Non-goals

- Restructuring invite management beyond moving it to `/admin`
- Role-based admin access control
- Any change to the invite creation logic, code generation, or QR rendering
