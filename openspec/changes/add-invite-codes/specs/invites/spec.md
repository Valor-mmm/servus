# Invites Specification

## ADDED Requirements

### Requirement: Invite code minting

An authenticated user MUST be able to mint a new single-use invite code from the
`/invites` page. The system MUST generate a cryptographically random token of at
least 128 bits, store only its SHA-256 hash in KV, and display the full
registration URL (including the plain token) exactly once. The code MUST expire
7 days from the time of minting.

#### Scenario: Admin mints a new invite code

- **WHEN** an authenticated user submits the mint form on `/invites` with an
  optional note
- **THEN** a new invite record is created in KV with a hashed token, an expiry 7
  days in the future, and the optional note; the registration URL containing the
  plain token is displayed on the page

#### Scenario: Plain token shown only once

- **WHEN** the invite is minted and the page is reloaded or navigated away from
- **THEN** the full plain token is no longer shown; only the hash prefix and
  metadata remain visible

#### Scenario: Optional note is stored with the code

- **WHEN** an admin mints a code with a note (e.g. "für Oma")
- **THEN** the note appears alongside the code in the invite list

---

### Requirement: Invite code listing

The `/invites` page MUST show all outstanding invite codes — those that are
unexpired and not yet consumed — ordered by creation time (newest first). Each
entry MUST show the creation date, expiry date, optional note, and a revoke
button. Expired codes MUST be visually marked and still shown until explicitly
revoked.

#### Scenario: Outstanding invites listed

- **WHEN** an authenticated user visits `/invites` and two active codes exist
- **THEN** both codes are listed with their creation date, expiry date, and
  optional note

#### Scenario: Expired code marked visually

- **WHEN** a code's expiry date has passed
- **THEN** the code is still shown in the list but is visually distinguished
  (e.g. muted style or "Abgelaufen" label)

#### Scenario: Empty state when no invites exist

- **WHEN** no invite codes have been minted or all have been consumed/revoked
- **THEN** an empty-state message is shown on `/invites`

---

### Requirement: Invite code revocation

An authenticated user MUST be able to revoke any outstanding invite code from
the `/invites` page. Revoking a code MUST delete it from KV so it can no longer
be used for registration.

#### Scenario: Admin revokes an invite

- **WHEN** an authenticated user clicks the revoke button for a code
- **THEN** the code record is deleted from KV and the code no longer appears in
  the invite list

#### Scenario: Revoked code cannot be used

- **WHEN** a user attempts to register with a token whose code has been revoked
- **THEN** the registration page shows an error and no user is created

---

### Requirement: Registration via invite code

The system MUST provide a public registration page at `/register` that accepts
an invite token as a URL query parameter. A visitor with a valid, unexpired,
unconsumed token MUST be able to choose a username and password and create an
account. The invite code MUST be burned atomically with the account creation.

#### Scenario: Successful registration

- **WHEN** a visitor opens `/register?code=<valid-token>` and submits a username
  and password
- **THEN** a new user account is created, the invite code is burned, and the
  visitor is redirected to the login page

#### Scenario: Invalid token rejected

- **WHEN** a visitor opens `/register?code=<unknown-token>`
- **THEN** the page shows an error and the registration form is not displayed

#### Scenario: Expired token rejected

- **WHEN** a visitor opens `/register?code=<expired-token>`
- **THEN** the registration page shows an error and no user is created

#### Scenario: Already-consumed token rejected

- **WHEN** a visitor attempts to register with a token that has already been
  used
- **THEN** the registration page shows an error and no user is created

#### Scenario: Duplicate username rejected

- **WHEN** a visitor submits a registration with a username that already exists
- **THEN** the page shows a validation error and the invite code is NOT burned

#### Scenario: Registration requires minimum password length

- **WHEN** a visitor submits a password shorter than 8 characters
- **THEN** the form shows a validation error and no account is created

---

### Requirement: Invite route access control

The `/invites` management page MUST be accessible only to authenticated users.
The `/register` page MUST be publicly accessible (no session required) so that
new users can register.

#### Scenario: Unauthenticated access to /invites is redirected

- **WHEN** an unauthenticated visitor navigates to `/invites`
- **THEN** they are redirected to the login page

#### Scenario: /register is accessible without authentication

- **WHEN** an unauthenticated visitor navigates to `/register?code=<token>`
- **THEN** the page renders without redirecting to login
