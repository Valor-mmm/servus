## ADDED Requirements

### Requirement: Invite code generation

The system SHALL allow an authenticated admin to generate a single-use invite
code. The code MUST be generated using a cryptographically secure random source
with at least 128 bits of entropy. The raw code MUST be displayed to the admin
exactly once at creation time and MUST NOT be retrievable afterwards. The stored
record MUST contain only the hashed form of the code (Argon2id). The default
expiry MUST be 7 days from creation; the admin MAY select a different expiry.

#### Scenario: Admin creates an invite code

- **WHEN** an admin submits the invite-creation form
- **THEN** the system creates an invite record (hashed code, expiry, status:
  unused)
- **AND** displays the raw code once with a clear "copy now" warning

#### Scenario: Raw code is not re-displayable

- **WHEN** an admin revisits the invite list after creation
- **THEN** the raw code is not shown (only a masked placeholder and the expiry
  date)

### Requirement: Invite code listing and revocation

The system SHALL allow an authenticated admin to view all outstanding (unused
and not-yet-expired) invite codes. The admin MUST be able to revoke any
outstanding code before it is consumed. Revoking a code MUST permanently
invalidate it; it MUST NOT be consumable after revocation. Expired codes MUST be
omitted from the list.

#### Scenario: Admin views outstanding invites

- **WHEN** an admin navigates to the invite management page
- **THEN** the system displays all unused, non-expired invite codes with their
  expiry dates and creation timestamps

#### Scenario: Admin revokes an invite

- **WHEN** an admin revokes an outstanding invite
- **THEN** the invite record is deleted from KV
- **AND** any subsequent attempt to consume that code returns an error

#### Scenario: Expired invites are excluded from the list

- **WHEN** an invite's expiry timestamp is in the past
- **THEN** it does not appear in the admin invite list

### Requirement: Invite code consumption (self-registration)

The system SHALL provide a public registration route at `/invite/[code]`. A
visitor who presents a valid, unused, non-expired code MUST be able to choose a
username and password, creating a new regular-user account. The code MUST be
burned atomically with account creation so that concurrent requests cannot
create two accounts from one code. The new account MUST NOT have admin
privileges.

#### Scenario: Valid code used to register

- **WHEN** a visitor submits the registration form with a valid unused code, a
  chosen username, and a valid password
- **THEN** a new user account is created (role: user)
- **AND** the invite code is deleted atomically
- **AND** the visitor is redirected to the login page

#### Scenario: Expired code rejected

- **WHEN** a visitor submits a registration form with a code whose expiry is in
  the past
- **THEN** the system rejects the request with an appropriate error
- **AND** no account is created

#### Scenario: Already-used code rejected

- **WHEN** a visitor attempts to use a code that has already been consumed
- **THEN** the system rejects the request with an appropriate error

#### Scenario: Revoked code rejected

- **WHEN** a visitor attempts to use a code that has been revoked by an admin
- **THEN** the system rejects the request with an appropriate error

#### Scenario: Concurrent consumption — only one succeeds

- **WHEN** two requests attempt to consume the same valid code simultaneously
- **THEN** exactly one account is created
- **AND** the other request receives an error

### Requirement: Invite route rate-limiting

The public registration route MUST be rate-limited per IP address. Threats
mitigated: brute-force enumeration of invite codes and mass account creation.

#### Scenario: Excessive registration attempts from one IP are throttled

- **WHEN** a single IP address submits more than the allowed number of
  registration attempts within the rate-limit window
- **THEN** subsequent requests within that window receive a rate-limit error and
  no account is created

### Requirement: Invite code security properties

Invite codes MUST satisfy the following security constraints (threat: KV data
exposure should not yield usable codes):

- Stored representation MUST be an Argon2id hash with the same cost parameters
  used for passwords (memory ≥ 64 MB, time ≥ 3, parallelism = 1).
- The raw code MUST NOT appear in server logs, KV records, or error messages.

#### Scenario: KV record does not contain raw code

- **WHEN** an invite record is written to KV
- **THEN** the record contains only the hashed code, expiry, and metadata
- **AND** the raw code cannot be derived from the stored record
