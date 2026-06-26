## MODIFIED Requirements

### Requirement: Invite code consumption (token-based session)

The system SHALL provide a public confirmation route at `/invite/[code]`. A
visitor who navigates to a valid, unused, non-expired invite URL MUST be
presented with a single confirmation button ("Einladung annehmen") and no
credential form. Upon confirmation, the system MUST:

1. Validate and atomically consume the invite code.
2. Create a helper user account with a system-generated username, an unknowable
   password hash (the system MUST discard the hash preimage immediately — the
   account MUST NOT be accessible via username/password login), and
   `role: "user"`.
3. Create a session for the new account and issue a session cookie.
4. Redirect the helper to `/`.

The helper is authenticated immediately after one button press. The new account
MUST have `role: "user"` and MUST NOT have admin privileges.

If a helper's session cookie is lost (browser cleared, device change, expiry),
the admin MUST mint a new invite; there is no password-based fallback.

#### Scenario: Valid code — helper is logged in immediately

- **WHEN** a helper navigates to a valid invite URL and confirms
- **THEN** the system consumes the invite code atomically
- **AND** creates a helper account with `role: "user"`, a system-generated
  username, and no usable password
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
