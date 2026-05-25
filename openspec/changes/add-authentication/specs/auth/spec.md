## ADDED Requirements

### Requirement: Seeded user provisioning

On every application boot, the system MUST read the `SERVUS_SEED_USERS`
environment variable (a JSON array of `{username, password}` pairs) and create
any users that do not yet exist in the data store. The system MUST NOT overwrite
the password of an existing user, regardless of seed contents.

_Threat mitigated:_ accidental credential rotation on every deploy, which would
either lock real users out or silently allow attackers who steal the seed env
var to keep an existing username's hash refreshed under their chosen password.

#### Scenario: First boot with two seeded users

- **WHEN** the app starts with
  `SERVUS_SEED_USERS='[{"username":"a","password":"p1"},{"username":"b","password":"p2"}]'`
  and the data store contains no users
- **THEN** two user records are created with passwords hashed via Argon2id
- **AND** a log line records `seeded 2 user(s), skipped 0 existing`

#### Scenario: Reboot with an unchanged seed

- **WHEN** the app starts and both seed usernames already exist
- **THEN** no user records are modified
- **AND** a log line records `seeded 0 user(s), skipped 2 existing`

#### Scenario: Reboot after a real password change

- **GIVEN** user `a` exists with a hash for password `p1-rotated`
- **WHEN** the app starts with seed `[{"username":"a","password":"p1"}]`
- **THEN** the stored hash for `a` is unchanged
- **AND** logging in with `p1-rotated` succeeds and `p1` fails

#### Scenario: Empty seed

- **WHEN** the app starts with `SERVUS_SEED_USERS` unset or set to `[]`
- **THEN** no users are created and the boot succeeds

### Requirement: Password storage uses Argon2id

The system MUST hash passwords with Argon2id before storing them. The hash MUST
include the algorithm identifier, version, cost parameters, and salt encoded in
the standard PHC string format. The system MUST NOT store, log, or transmit any
password in plaintext form after the request boundary.

_Threat mitigated:_ offline brute-force of a leaked password database; memory
disclosure via logs.

#### Scenario: New user creation

- **WHEN** a user is provisioned with password `correct horse battery staple`
- **THEN** the stored password field starts with `$argon2id$v=19$`
- **AND** the plaintext password does not appear in any log output

#### Scenario: Password verification

- **GIVEN** a stored Argon2id hash for password `p1`
- **WHEN** the system verifies the candidate password `p1`
- **THEN** verification returns true
- **AND** verifying `p1-wrong` returns false

### Requirement: Login issues a signed session cookie

When a login attempt succeeds, the system MUST create a server-side session
record keyed by a random 32-byte session ID and return a cookie containing the
session ID together with an HMAC-SHA256 signature derived from
`SERVUS_SESSION_KEY`. The cookie MUST be marked `HttpOnly`, `Secure`,
`SameSite=Strict`, and `Path=/`.

_Threat mitigated:_ session hijacking via XSS (HttpOnly), MITM on plain HTTP
(Secure), top-level CSRF (SameSite=Strict), and cookie tampering (signature).

#### Scenario: Successful login sets a session cookie

- **GIVEN** a user `alice` with password `p1` exists
- **WHEN** a POST `/login` is submitted with `username=alice` and `password=p1`
- **THEN** the response sets a cookie named `servus_session` with attributes
  `HttpOnly; Secure; SameSite=Strict; Path=/`
- **AND** the response redirects to `/`
- **AND** a session record exists at `["session", <id>]` with
  `username = "alice"`

#### Scenario: Cookie signature mismatch is rejected

- **GIVEN** a valid `servus_session` cookie
- **WHEN** the cookie value is tampered with (a byte in the ID is flipped
  without re-signing)
- **THEN** the request is treated as unauthenticated
- **AND** the malformed cookie is cleared from the response

### Requirement: Logout invalidates the session

A POST to `/logout` from an authenticated session MUST delete the session record
from the data store and clear the session cookie on the response. After logout,
the same session ID MUST NOT authenticate any subsequent request.

#### Scenario: Logout clears server-side state

- **GIVEN** an authenticated session with id `S`
- **WHEN** POST `/logout` is submitted with a valid CSRF token
- **THEN** the record at `["session", S]` no longer exists
- **AND** the response clears the `servus_session` cookie
- **AND** a subsequent request reusing the old cookie is treated as
  unauthenticated

### Requirement: Session lifetime

A session MUST be considered invalid if its `lastSeen` is older than the idle
timeout (14 days) or its `createdAt` is older than the absolute timeout (60
days). The system MUST update `lastSeen` on authenticated requests, but SHOULD
throttle that update to at most once per hour per session.

_Threat mitigated:_ indefinite session persistence on a stolen cookie.

#### Scenario: Idle session expires

- **GIVEN** a session whose `lastSeen` was 15 days ago
- **WHEN** an authenticated request arrives with that session's cookie
- **THEN** the request is treated as unauthenticated
- **AND** the session record is removed (lazily on access)

#### Scenario: Absolute timeout

- **GIVEN** a session whose `createdAt` was 61 days ago and `lastSeen` is
  current
- **WHEN** an authenticated request arrives
- **THEN** the request is treated as unauthenticated

#### Scenario: lastSeen throttling

- **GIVEN** a session with `lastSeen` updated 10 minutes ago
- **WHEN** an authenticated request arrives
- **THEN** the `lastSeen` value in storage is unchanged

### Requirement: Login resists brute force per IP

The login endpoint MUST track failed attempts per source IP in a sliding
15-minute window. After 10 failed attempts from the same IP within the window,
the endpoint MUST respond with HTTP 429 and a `Retry-After` header for any
further attempts from that IP until the window expires.

_Threat mitigated:_ distributed-username credential-stuffing from a single host.

#### Scenario: IP lockout after 10 failures

- **WHEN** 10 POST `/login` requests with invalid credentials arrive from IP
  `203.0.113.5` within 15 minutes
- **THEN** the 11th request from the same IP receives HTTP 429 with a
  `Retry-After` header
- **AND** valid credentials from a different IP still succeed

### Requirement: Login resists brute force per username

The login endpoint MUST track failed attempts per username in a sliding 1-hour
window. After 5 failed attempts for the same username within the window, the
endpoint MUST apply exponential backoff before processing further attempts for
that username, communicated to the client as HTTP 429 with `Retry-After`. A
successful login MUST reset the failure counter for that username.

_Threat mitigated:_ targeted brute-force of a known account from many IPs.

#### Scenario: Username lockout backoff

- **WHEN** 5 POST `/login` requests with invalid passwords arrive for username
  `alice` within 1 hour
- **THEN** the 6th request for `alice` receives HTTP 429 with a non-zero
  `Retry-After`
- **AND** each subsequent failed attempt at least doubles the `Retry-After`
  value

#### Scenario: Successful login resets the counter

- **GIVEN** 4 prior failed attempts for `alice`
- **WHEN** a successful login for `alice` occurs
- **THEN** the per-username failure counter for `alice` is cleared

### Requirement: Login response is constant-time

The login endpoint MUST take indistinguishable time to respond whether the
submitted username exists, does not exist, has an invalid password, or matches.
The endpoint MUST always perform a password hash comparison (against a fixed
dummy hash if needed) and complete the same set of side-effects (rate counter
increments) before returning.

_Threat mitigated:_ username enumeration via timing differences.

#### Scenario: Unknown username takes the same path

- **WHEN** POST `/login` is submitted with username `nobody` and password
  `anything`
- **THEN** the response includes the same error template and similar response
  time as a real-user wrong-password attempt
- **AND** the per-IP failure counter is incremented

### Requirement: CSRF token required on mutations

For every authenticated session, the system MUST generate a 32-byte random CSRF
token stored alongside the session record. All state-changing endpoints (HTTP
methods POST, PUT, PATCH, DELETE) MUST verify a matching CSRF token supplied via
the `x-csrf-token` header or a form field named `csrf_token`. A mismatch or
missing token MUST cause the request to be rejected with HTTP 403.

_Threat mitigated:_ cross-site request forgery beyond what `SameSite=Strict`
already prevents.

#### Scenario: Missing CSRF token on a POST

- **GIVEN** an authenticated session
- **WHEN** a POST to any mutation endpoint is submitted without `x-csrf-token`
  and without a `csrf_token` form field
- **THEN** the response status is 403
- **AND** the state change does not occur

#### Scenario: Wrong CSRF token

- **GIVEN** an authenticated session with CSRF token `T`
- **WHEN** a POST is submitted with `x-csrf-token: T-tampered`
- **THEN** the response status is 403

#### Scenario: Logout is also protected

- **WHEN** POST `/logout` is submitted without a valid CSRF token
- **THEN** the response status is 403
- **AND** the session remains valid

### Requirement: Unauthenticated requests are redirected to login

Any HTTP GET to a non-public route from an unauthenticated client MUST respond
with a 302 redirect to `/login?next=<original-path>`. Non-GET requests from
unauthenticated clients to protected routes MUST receive HTTP 401. The set of
public routes for this change is exactly `/login`, `/logout` (POST only), static
assets under `/static/*`, and `/healthz`.

#### Scenario: Unauthenticated GET to a protected page

- **WHEN** an unauthenticated client requests GET `/items`
- **THEN** the response is a 302 to `/login?next=%2Fitems`

#### Scenario: Authenticated GET passes through

- **GIVEN** a valid session cookie
- **WHEN** an authenticated client requests GET `/items`
- **THEN** the auth middleware does not redirect (downstream may still 404)

#### Scenario: Healthz is public

- **WHEN** an unauthenticated client requests GET `/healthz`
- **THEN** the response is 200 with body `ok`

### Requirement: Global security headers

Every HTTP response from the application MUST include the following headers with
at least the listed values:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: same-origin`
- `Content-Security-Policy` restricting `default-src` to `'self'`, disallowing
  `object-src`, restricting `frame-ancestors` to `'none'`, and restricting
  `form-action` to `'self'`
- `Permissions-Policy` denying `geolocation` and `microphone` and allowing
  `camera=(self)`

_Threat mitigated:_ protocol downgrade (HSTS), MIME-sniffing (nosniff), referer
leakage, clickjacking (frame-ancestors), open redirects via forms.

#### Scenario: Headers on a successful page

- **WHEN** any successful response (including 302 and 4xx) is returned
- **THEN** all five headers listed above are present on the response

### Requirement: Sensitive values are never logged

The system MUST NOT log plaintext passwords, password hashes, session IDs, CSRF
tokens, signed cookie values, or the `SERVUS_SESSION_KEY`. Structured log calls
that accept arbitrary objects MUST redact fields named `password`,
`passwordHash`, `sessionId`, `csrfToken`, `cookie`, and `sessionKey`.

_Threat mitigated:_ credential exposure via aggregated log shipping or
accidental console capture.

#### Scenario: Login attempt does not log the password

- **WHEN** a POST `/login` is submitted with username `alice` and password
  `secret`
- **THEN** no log line emitted during request handling contains the substring
  `secret`

#### Scenario: Session creation does not log the session id

- **WHEN** a session is created with id `S`
- **THEN** no log line emitted during the creating request contains the string
  `S`
