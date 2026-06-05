## ADDED Requirements

### Requirement: Session cookies persist across browser process restarts

The system MUST emit every `Set-Cookie` header for the `servus_session` cookie
with a `Max-Age` attribute equal to the absolute session timeout expressed in
seconds (60 days = 5184000). The cookie MUST therefore survive browser process
termination, OS-level tab eviction, and user-initiated browser restarts up to
the absolute timeout.

This requirement applies to every code path that issues a session cookie,
including but not limited to interactive login and invite redemption.

_Threat mitigated:_ user-perceived "silent logout" on mobile when iOS Safari is
evicted from memory between sessions of use. Without `Max-Age` the cookie is a
"session cookie" that the browser discards on process exit, even when the
server-side session is still valid.

_Threat NOT mitigated by this change:_ a leaked cookie remains valid until the
server-side absolute timeout (60 days) or explicit `/logout`. This envelope is
unchanged — the server already maintained the same 60-day session window; the
client cookie is now aligned with it.

#### Scenario: Login emits a persistent cookie

- **GIVEN** a user `alice` with password `p1` exists
- **WHEN** POST `/login` is submitted with `username=alice` and `password=p1`
- **THEN** the response's `Set-Cookie` header for `servus_session` contains
  `Max-Age=5184000`
- **AND** the cookie retains its existing
  `HttpOnly; Secure; SameSite=Strict; Path=/` attributes

#### Scenario: Invite redemption emits a persistent cookie

- **GIVEN** a valid, unconsumed invite code
- **WHEN** the helper confirms redemption
- **THEN** the response's `Set-Cookie` header for `servus_session` contains
  `Max-Age=5184000`

#### Scenario: Cookie persists across simulated browser restart

- **GIVEN** an authenticated session whose cookie was issued less than the
  absolute timeout ago
- **WHEN** the browser process is restarted while the cookie jar is preserved
  (matching real-world OS-level tab eviction behavior)
- **AND** the next request is made to a protected route
- **THEN** the request is treated as authenticated and the route renders

## MODIFIED Requirements

### Requirement: Session lifetime

A session MUST be considered invalid if its `lastSeen` is older than the idle
timeout (14 days) or its `createdAt` is older than the absolute timeout (60
days). The system MUST update `lastSeen` on authenticated requests, but SHOULD
throttle that update to at most once per hour per session. The update MUST be
called on every successful authenticated request path; a missing call site is a
defect against this requirement.

_Threat mitigated:_ indefinite session persistence on a stolen cookie; silent
absolute expiry of an actively-used session.

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

#### Scenario: lastSeen renews after the throttle window

- **GIVEN** a session with `lastSeen` updated more than one hour ago
- **WHEN** an authenticated request arrives and is accepted by the middleware
- **THEN** the `lastSeen` value in storage is updated to the current time
- **AND** the underlying KV row's remaining absolute TTL is preserved

#### Scenario: Active session stays alive across the idle window

- **GIVEN** a session created 20 days ago whose owner has used the app at least
  once every day
- **WHEN** an authenticated request arrives on day 20
- **THEN** the request is treated as authenticated
