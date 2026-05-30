# Auth Specification — Delta

## ADDED Requirements

### Requirement: User creation via invite code

The system MUST support creating a new user account by consuming a valid invite
code. This is a second user-creation path alongside seeded provisioning. The
account created via invite MUST be stored in the same KV schema as seeded users
and MUST be able to log in with the same login flow immediately after
registration.

#### Scenario: Invited user can log in after registration

- **WHEN** a user registers via a valid invite code with username "helper" and a
  valid password
- **THEN** they can immediately log in at `/login` with those credentials and
  receive a valid session

#### Scenario: Invited user is indistinguishable from seeded user in KV

- **WHEN** an invited user account is created
- **THEN** the KV record at `["user", username]` has the same shape as a seeded
  user record (`username`, `passwordHash`, `createdAt`)
