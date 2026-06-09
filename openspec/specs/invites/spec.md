# invites Specification

## Purpose

Single-use invite codes allow an admin to grant temporary access to helpers
(e.g. house-move assistants). A helper scans or opens the invite URL, confirms
with one button press, and is immediately authenticated with a system-generated
account. No credentials are chosen or remembered.

## Requirements

### Requirement: Invite management location

The invite management UI (create, list, revoke) MUST be accessible at `/admin`
as a section of the admin hub. Requests to `/admin/invites` MUST redirect to
`/admin`.

### Requirement: Invite code generation

The system SHALL allow an authenticated admin to generate a single-use invite
code. The code MUST be generated using a cryptographically secure random source
with at least 128 bits of entropy. The raw code MUST be displayed to the admin
exactly once at creation time and MUST NOT be retrievable afterwards. The stored
record MUST contain only the hashed form of the code (Argon2id). The default
expiry MUST be 7 days from creation; the admin MAY select a different expiry.

The one-time code-display banner MUST also include a QR code encoding the full
invite URL, rendered server-side. The QR code MUST be scannable on a mobile
device and MUST be generated from the same invite URL shown as plain text.

#### Scenario: Admin creates an invite code

- **WHEN** an admin submits the invite-creation form
- **THEN** the system creates an invite record (hashed code, expiry, status:
  unused)
- **AND** displays the raw code once with a clear "copy now" warning
- **AND** displays a scannable QR code for the invite URL in the same banner

#### Scenario: Raw code is not re-displayable

- **WHEN** an admin revisits the invite list after creation
- **THEN** the raw code is not shown (only a masked placeholder and the expiry
  date)
- **AND** no QR code is shown

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

### Requirement: Invite code consumption (token-based session)

The system SHALL provide a public confirmation route at `/invite/[code]`. A
visitor who navigates to a valid, unused, non-expired invite URL MUST be
presented with a single confirmation button ("Einladung annehmen") and no
credential form. Upon confirmation, the system MUST:

1. Validate and atomically consume the invite code.
2. Create a helper user account with a system-generated username and an
   unknowable password hash (the system MUST discard the hash preimage
   immediately — the account MUST NOT be accessible via username/password
   login).
3. Create a session for the new account and issue a session cookie.
4. Redirect the helper to `/`.

The helper is authenticated immediately after one button press. The new account
MUST NOT have admin privileges.

If a helper's session cookie is lost (browser cleared, device change, expiry),
the admin MUST mint a new invite; there is no password-based fallback.

#### Scenario: Valid code — helper is logged in immediately

- **WHEN** a helper navigates to a valid invite URL and confirms
- **THEN** the system consumes the invite code atomically
- **AND** creates a helper account (role: user, system-generated username, no
  usable password)
- **AND** issues a session cookie
- **AND** redirects to `/`
- **AND** the helper is authenticated (app content is accessible)

#### Scenario: Valid code shown as confirmation page on GET

- **WHEN** a helper navigates to a valid invite URL (GET request)
- **THEN** the system displays a confirmation page with a single button
- **AND** does NOT consume the invite or create an account on the GET request

#### Scenario: Expired code rejected

- **WHEN** a helper navigates to a URL whose invite code has expired
- **THEN** the system shows an error page
- **AND** no account or session is created

#### Scenario: Already-used code rejected

- **WHEN** a helper navigates to a URL whose invite code has already been
  consumed
- **THEN** the system shows an error page

#### Scenario: Revoked code rejected

- **WHEN** a helper navigates to a URL whose invite code has been revoked
- **THEN** the system shows an error page

#### Scenario: Concurrent consumption — only one succeeds

- **WHEN** two requests attempt to consume the same valid code simultaneously
- **THEN** exactly one account and session is created
- **AND** the other request receives an error

### Requirement: Invite route rate-limiting

Both GET and POST requests to `/invite/[code]` MUST be rate-limited per IP
address. Threats mitigated: brute-force enumeration of invite codes (GET oracle)
and mass session-creation attempts (POST).

#### Scenario: Excessive GET probes from one IP are throttled

- **WHEN** a single IP address makes more than the allowed number of GET
  requests to `/invite/[code]` within the rate-limit window
- **THEN** subsequent requests within that window receive a rate-limit error
- **AND** no invite validity information is disclosed

#### Scenario: Excessive confirmation attempts from one IP are throttled

- **WHEN** a single IP address submits more than the allowed number of POST
  requests within the rate-limit window
- **THEN** subsequent requests within that window receive a rate-limit error
- **AND** no account or session is created

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
