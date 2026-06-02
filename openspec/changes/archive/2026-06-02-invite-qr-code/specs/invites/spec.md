## MODIFIED Requirements

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
