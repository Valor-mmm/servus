## Context

`/admin` is the data-management hub (export / import / delete-all).
`/admin/invites` is the invite management page. The nav links only to
`/admin/invites`, leaving the data tools unreachable. The fix is a single nav
link to `/admin` that hosts all admin sections.

## Goals / Non-Goals

**Goals:**

- One nav entry point for all admin functionality
- Invite management UI fully preserved — only its location changes
- `/admin/invites` continues to work for any saved links

**Non-Goals:**

- Changing any invite business logic
- Adding role-based access or sub-navigation within admin
- Pagination or search within the invite list

## Decisions

### 1. Invite creation POST moves to `/admin`, renders inline

The existing `/admin/invites` POST handler generates the invite and renders an
inline response (including the one-time QR banner). After this change, the
create form on `/admin` POSTs to `/admin` itself with `_action=create_invite`.
The `/admin` POST handler mints the invite, generates the QR SVG, and renders
the full admin page with the one-time banner visible — no redirect.

**Why not redirect to `/admin?new_invite=<id>`?** The raw invite URL contains
the raw code (`/invite/<rawCode>`). The raw code is not stored in KV (only its
hash is), so it cannot be regenerated from the invite ID. Passing the raw code
in a URL query param would expose it in browser history and server logs.
Rendering inline keeps the raw code out of the address bar entirely.

**Why not keep the create POST at `/admin/invites`?** That route becomes a
simple redirect; keeping POST logic there would mean the redirect swallows the
form submission. Moving the handler to `/admin` keeps all admin mutations in one
place and avoids the redirect ambiguity.

### 2. `/admin/invites` becomes a 302 redirect to `/admin`

Permanent (301) would cause browsers to cache the redirect, preventing any
future use of the path. Temporary (302) is safer for a path that may be reused
later.

### 3. Revoke redirects to `/admin` instead of `/admin/invites`

`routes/admin/invites/[id]/revoke.ts` currently redirects to `/admin/invites`
after a successful revoke. It will redirect to `/admin` instead, so the user
lands back on the hub page.

### 4. Nav i18n key

The existing key `invites.nav` is invite-specific copy. A new key `nav.admin` is
added for the admin hub link. `invites.nav` is kept in the locale file (it may
still be used elsewhere) but is no longer referenced by the nav.

## Route and File Changes

| File                                  | Change                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `routes/_app.tsx`                     | Replace `/admin/invites` nav link with `/admin` using `nav.admin` key                                  |
| `routes/admin/index.tsx`              | Add invite section (list + create form + QR banner); handler loads invites, handles `?new_invite=<id>` |
| `routes/admin/invites/index.tsx`      | Replace with a 302 redirect to `/admin` (GET and POST both redirect)                                   |
| `routes/admin/invites/[id]/revoke.ts` | Change redirect target from `/admin/invites` to `/admin`                                               |
| `lib/i18n/locales/de.ts`              | Add `nav.admin` key                                                                                    |

## UI Layout (admin page sections)

```
/admin
├── [banner: import success / delete success / invite created / error]
├── Section: Export
├── Section: Import
├── Section: Löschen (delete-all)
└── Section: Einladungen
    ├── [one-time invite code + QR — shown only after creation]
    ├── Create form (expiry days input + submit)
    └── List of outstanding invites (expiry date, revoke button each)
```

The invite section reuses the existing `admin-section` CSS class. The one-time
code banner reuses the existing `invite-code-banner` styles from the old page.
