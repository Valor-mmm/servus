## ADDED Requirements

### Requirement: Project builds cleanly
The system SHALL produce a deployable artifact when `cd web/app && npm ci && npm run build`
runs after `npx wrangler d1 migrations apply servus-db --local`.

#### Scenario: Clean build from a fresh checkout
- **WHEN** a developer runs `npm install` at the repo root followed by `cd web/app && npm ci && npm run build`
- **THEN** `web/app/dist/` is populated with the compiled SPA, and no TypeScript or build errors are emitted

#### Scenario: Biome reports no violations
- **WHEN** `biome check` runs from the repo root
- **THEN** it exits with code 0 and reports zero errors or warnings

#### Scenario: TypeScript is clean across the whole repo
- **WHEN** `npm run typecheck` runs from the repo root (backend) and `npm run typecheck` runs from `web/app/` (frontend)
- **THEN** both complete with exit code 0 and zero type errors

### Requirement: D1 migrations apply cleanly
The system SHALL apply all numbered SQL migrations in `migrations/` in order
when `wrangler d1 migrations apply` is invoked.

#### Scenario: Fresh local database receives all migrations
- **WHEN** `wrangler d1 migrations apply servus-db --local` runs against an empty local D1 instance
- **THEN** all migration files are applied in numeric order and the operation exits with code 0

#### Scenario: Re-running migrations is idempotent
- **WHEN** `wrangler d1 migrations apply servus-db --local` runs a second time against an already-migrated database
- **THEN** it reports that all migrations are already applied and exits with code 0

### Requirement: Vue SPA is served for all non-API routes
The system SHALL return `index.html` for any request path that does not begin
with `/api/`.

#### Scenario: Root path returns the app shell
- **WHEN** a browser requests `GET /`
- **THEN** the response is HTTP 200 with `Content-Type: text/html` containing the Vue app shell

#### Scenario: Unknown SPA route returns the app shell
- **WHEN** a browser requests `GET /inventory/items/123` (a Vue Router path that does not exist yet)
- **THEN** the response is HTTP 200 with `Content-Type: text/html` (SPA fallback, not 404)

#### Scenario: Non-existent API route returns JSON 404
- **WHEN** a client requests `GET /api/v1/nonexistent`
- **THEN** the response is HTTP 404 with `Content-Type: application/json` and body `{ "code": "NOT_FOUND" }`

### Requirement: API responses are always JSON
All routes under `/api/v1/` SHALL return `Content-Type: application/json`.
HTML is never returned from an API route.

#### Scenario: Error response shape is consistent
- **WHEN** an API handler returns an error
- **THEN** the response body is `{ "code": "<SCREAMING_SNAKE_CASE>" }` with an appropriate HTTP status code

### Requirement: CI passes on every PR to main
All CI jobs (typecheck, lint, build, test-backend, test-frontend, e2e, secrets,
deps, migrations) SHALL pass before a PR may be merged to main.

#### Scenario: A PR with a type error is blocked
- **WHEN** a PR introduces a TypeScript type error in any file
- **THEN** the `typecheck` CI job fails and merge is blocked

#### Scenario: A PR with a Biome violation is blocked
- **WHEN** a PR introduces a linting or formatting violation
- **THEN** the `lint` CI job fails and merge is blocked
