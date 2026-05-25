## ADDED Requirements

### Requirement: Health endpoint reports system liveness
The system SHALL expose `GET /api/v1/health` as a liveness probe. The endpoint
SHALL return HTTP 200 when the Worker is running and the D1 binding is
reachable. It is used by post-deploy smoke tests and external monitoring.

#### Scenario: Healthy system returns 200
- **WHEN** `GET /api/v1/health` is called and the Worker and D1 binding are operational
- **THEN** the response is HTTP 200 with body `{ "status": "ok" }`

#### Scenario: Response is always JSON
- **WHEN** `GET /api/v1/health` is called
- **THEN** `Content-Type: application/json` is set regardless of the `Accept` header

#### Scenario: No authentication required
- **WHEN** `GET /api/v1/health` is called without any session cookie or auth header
- **THEN** the response is HTTP 200 (the health endpoint is public)

#### Scenario: Health endpoint verifies D1 reachability
- **WHEN** `GET /api/v1/health` is called
- **THEN** the handler executes a trivial D1 query (e.g. `SELECT 1`) to confirm the binding is functional before returning `{ "status": "ok" }`
