# servus

Private home management system. Bavarian for "hello/goodbye". den Built with
[Deno](https://deno.com) + [Fresh 2](https://fresh.deno.dev) +
[Deno KV](https://deno.com/kv). Deployed to
[servus.valor.codes](https://servus.valor.codes).

## Features

- **Inventory** — catalog items by category and room
- **Moving workflow** — pack items into boxes, bulk-assign boxes to destination
  rooms
- _(planned)_ Shopping list, recipes, pantry tracking

## Local development

### Prerequisites

- [Deno 2.x](https://docs.deno.com/runtime/getting_started/installation)
- Chromium for E2E tests: `deno run -A npm:playwright install chromium`

### Setup

```bash
cp .env.example .env
# Fill in the values in .env
deno task dev
```

The app runs at http://localhost:8000.

### Environment variables

| Variable             | Description                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `SERVUS_SESSION_KEY` | 32-byte hex string for signing session cookies. Generate with: `openssl rand -hex 32`                         |
| `SERVUS_SEED_USERS`  | JSON array of initial users: `[{"username":"monster","password":"..."},{"username":"maus","password":"..."}]` |

### Commands

```bash
deno task dev     # hot-reload dev server
deno task build   # production build → _fresh/
deno task start   # serve the production build
deno task test    # unit + integration tests
deno task e2e     # build + Playwright E2E
deno task check   # fmt + lint + typecheck
deno task fmt     # format
deno task lint    # lint
```

## Deployment

Hosted on [Deno Deploy](https://deno.com/deploy) (free tier).

### First-time setup

1. Create a project named `servus` at https://dash.deno.com
2. Add a CNAME record: `servus.valor.codes → servus.deno.dev`
3. Add secrets in GitHub → Settings → Secrets:
   - `DENO_DEPLOY_TOKEN` — from https://dash.deno.com/account#access-tokens
4. Set environment variables in the Deno Deploy project dashboard:
   - `SERVUS_SESSION_KEY`
   - `SERVUS_SEED_USERS`

Pushes to `main` trigger CI → if green → auto-deploy.

## Architecture

See [`CLAUDE.md`](CLAUDE.md) for implementation guidelines and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for the spec-driven development roadmap.

- **Runtime**: Deno 2
- **Framework**: Fresh 2 (server-rendered, islands for interactivity)
- **Database**: Deno KV (native, free, atomic transactions)
- **Auth**: Custom — Argon2id + signed session cookies + rate limiting
- **CI/CD**: GitHub Actions → Deno Deploy
- **Tests**: Deno built-in (unit/integration) + Playwright (E2E)
- **i18n**: German UI via `lib/i18n/t()`
- **Deps**: Automatically updated by [Renovate](https://renovatebot.com)
