# Authorization Specification

## Purpose

Defines role-based access control: how user roles are stored, enforced on
routes, and reflected in the UI.

## Requirements

### Requirement: User role field

Every `User` record stored in KV MUST carry a `role` field of type
`"admin" | "user"`. Records without a `role` field (created before this change)
are treated as `"admin"` during the migration window only. After the migration
script has run, all records will have an explicit `role` value.

_Threat mitigated:_ privilege escalation — a helper account created via invite
MUST NOT inherit admin-level access by default.

#### Scenario: Seeded user has admin role

- **WHEN** the app seeds user records from `SERVUS_SEED_USERS`
- **THEN** each seeded user record is written with `role: "admin"`

#### Scenario: Invite-created user has user role

- **WHEN** a helper confirms an invite code
- **THEN** the created account is written with `role: "user"`

### Requirement: Admin-only route guard

The system MUST expose a `requireAdmin(ctx)` function (in
`lib/auth/middleware.ts`) that:

1. Calls `requireSession(ctx)` to obtain the current user.
2. If the user's `role` is not `"admin"`, immediately returns a response with
   HTTP 403 and a user-visible German error page.
3. Otherwise, returns `null` to allow the handler to continue.

Every route handler under `/admin/*` MUST call `requireAdmin(ctx)` and return
early if it returns a non-null response.

_Threat mitigated:_ horizontal privilege escalation from helper sessions to
admin-only operations (user management, data export, invite management).

#### Scenario: Helper session blocked from admin route

- **GIVEN** an authenticated helper session with `role: "user"`
- **WHEN** the helper requests GET `/admin`
- **THEN** the response status is 403
- **AND** no admin content is rendered

#### Scenario: Admin session passes through

- **GIVEN** an authenticated admin session with `role: "admin"`
- **WHEN** the admin requests GET `/admin`
- **THEN** the response status is 200
- **AND** admin content is rendered

#### Scenario: Unauthenticated request still redirects to login

- **GIVEN** an unauthenticated client
- **WHEN** the client requests GET `/admin`
- **THEN** the response status is 302 and redirects to `/login?next=%2Fadmin`

### Requirement: Navigation adapts to role

The global navigation rendered by `_app.tsx` MUST hide the "Verwaltung" link for
sessions where the user's `role` is not `"admin"`. The link MUST be visible for
`role: "admin"` sessions.

_Rationale:_ avoids surfacing inaccessible links that would lead helpers to a
403 page on every visit.

#### Scenario: Helper does not see Verwaltung link

- **GIVEN** an authenticated helper session with `role: "user"`
- **WHEN** the helper views any page in the app
- **THEN** the navigation does not contain a link to `/admin`

#### Scenario: Admin sees Verwaltung link

- **GIVEN** an authenticated admin session with `role: "admin"`
- **WHEN** the admin views any page in the app
- **THEN** the navigation contains a link to `/admin`

### Requirement: Migration promotes existing users to admin

A one-time idempotent migration script (`scripts/migrate-user-roles.ts`) MUST
iterate all records at the `["user", *]` prefix and write `role: "admin"` to any
record that lacks a `role` field. Records that already have a `role` field MUST
NOT be modified.

#### Scenario: Migration upgrades role-less users

- **GIVEN** a KV store with two user records that have no `role` field
- **WHEN** the migration script is executed
- **THEN** both records are updated to `role: "admin"`
- **AND** running the script a second time makes no further changes
