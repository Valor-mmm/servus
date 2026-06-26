## MODIFIED Requirements

### Requirement: Seeded user provisioning

On every application boot, the system MUST read the `SERVUS_SEED_USERS`
environment variable (a JSON array of `{username, password}` pairs) and create
any users that do not yet exist in the data store. The system MUST NOT overwrite
the password of an existing user, regardless of seed contents. Every seeded user
MUST be written with `role: "admin"`.

_Threat mitigated:_ accidental credential rotation on every deploy, which would
either lock real users out or silently allow attackers who steal the seed env
var to keep an existing username's hash refreshed under their chosen password.

#### Scenario: First boot with two seeded users

- **WHEN** the app starts with
  `SERVUS_SEED_USERS='[{"username":"a","password":"p1"},{"username":"b","password":"p2"}]'`
  and the data store contains no users
- **THEN** two user records are created with passwords hashed via Argon2id and
  `role: "admin"`
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

#### Local development

For local development, copy `.env.example` to `.env` and fill in both variables.
The `deno task dev` command loads `.env` automatically via `--env-file=.env`.
Without a `SERVUS_SEED_USERS` entry the app boots with no users and login is
impossible, so local `.env` must include at least one seed entry. Because the
value is a JSON array, it must be wrapped in single quotes in the `.env` file:

```
SERVUS_SEED_USERS='[{"username":"monster","password":"..."}]'
```
