## Context

The item list (`/items`) and box detail (`/boxes/:id`) pages show `+`/`−`
buttons for adjusting item quantity. Currently these are plain HTML
`<form method="post">` elements — clicking either button submits a POST and the
browser performs a full-page reload to render the result. This is noticeably
slow and disruptive to the scanning workflow.

Fresh 2 ships with islands: Preact components that hydrate on the client. Any
interactive behaviour that benefits from avoiding a page reload belongs in an
island. The `adjustQuantity` repo function already exists on the server; we just
need a thin JSON bridge so the island can call it.

## Goals / Non-Goals

**Goals:**

- `+`/`−` clicks update the quantity counter in-place with no visible page
  reload.
- Optimistic UI: the counter increments/decrements immediately; the server
  confirms and the displayed value is reconciled on response.
- CSRF protection is preserved — the island reads the token from the DOM and
  forwards it in the POST body.
- Delivered-box guard is preserved — island receives a `readonly` prop, renders
  plain text instead of buttons when `true`.
- No regression on keyboard/screen-reader accessibility — `aria-label`
  attributes are retained.

**Non-Goals:**

- Error UI for network failures (silent revert to server value is sufficient for
  a two-user app).
- Offline/service-worker support.
- Animation or visual effects beyond the instant counter update.

## Decisions

### 1. Fresh 2 island + dedicated JSON API route

**Decision:** Create `islands/QuantityControl.tsx` (Preact component with Preact
Signals for local state) and `routes/api/items/adjust-quantity.ts` (JSON
endpoint).

**Why over alternatives:**

- _Inline `<script>` tag_: fragile, hard to type, conflicts with CSP.
- _SPA-style fetch inside an existing route file_: Fresh 2 routes export an
  `handler` object and a JSX component; mixing fetch logic into the JSX side is
  unidiomatic and not how islands work.
- _Optimistic inline PATCH in the page component_: Page components in Fresh 2
  are server-rendered; they can't hold client-side state.

A dedicated `/api/items/adjust-quantity` route keeps the API contract explicit
and reusable.

### 2. Optimistic update with server reconciliation

**Decision:** The island increments/decrements its local `signal` immediately,
then POSTs to the API. On success it sets the signal to the server-returned
`quantity`. On fetch error it reverts to the pre-click value.

**Why:** The operation is idempotent-ish (adjust by ±1 and re-read), cheap to
reconcile, and virtually never fails in a LAN/single-user scenario. Full
optimistic updates feel snappy without being incorrect.

### 3. CSRF token via prop (SSR → island hand-off)

**Decision:** The server-rendered page passes `csrfToken` as a prop to the
island. Fresh 2 serialises island props into a
`<script type="application/json">` tag that the hydrated island reads at boot.
The token is never written into a cookie or a global.

**Why:** This is the idiomatic Fresh 2 pattern. The alternative (reading a
`<meta>` tag) works but is more fragile and less typed.

### 4. API request/response shape

```
POST /api/items/adjust-quantity
Content-Type: application/json

{ "itemId": "<uuid>", "delta": 1 | -1, "csrf_token": "<token>" }

→ 200 { "quantity": <number> }
→ 400 { "error": "invalid" }
→ 403 { "error": "forbidden" }   (CSRF mismatch or session missing)
```

**Why JSON (not FormData):** Islands use `fetch`; JSON is cleaner to construct
and parse. The endpoint is not reachable from a plain HTML form so FormData
interop is not needed.

## Risks / Trade-offs

- **JavaScript disabled**: Users without JS see nothing for `+`/`−` — the island
  renders empty when not hydrated. Acceptable: the app requires JS for
  authentication flows already. → Mitigation: Consider a `<noscript>` fallback
  form in the island if this ever becomes a concern (out of scope for this
  change).

- **Double-submit on slow network**: User clicks `+` twice before the first
  response arrives. Each click fires an independent fetch; the server processes
  them sequentially via KV atomic. The final displayed value reconciles to the
  server's last-returned quantity. → Mitigation: Debounce button with a
  `disabled` state while a request is in-flight (implemented in the island).

- **CSRF token expiry**: If the session is renewed mid-page (very unlikely), the
  island's prop contains a stale token. The API returns 403 and the counter
  silently reverts. → Mitigation: Acceptable for a two-user app. User can reload
  the page.

## Migration Plan

1. Add the JSON API route with its CSRF + session guard.
2. Build the island.
3. Replace `QtyButtons` in `routes/items/index.tsx` with `<QuantityControl …/>`.
4. Replace the inline forms in `routes/boxes/[id].tsx` with
   `<QuantityControl …/>`.
5. Delete the now-unused `QtyButtons` helper and remove the `qty_inc`/`qty_dec`
   POST branches from the item-list handler (the boxes handler still needs its
   other POST branches).
6. Update E2E tests: `waitForSelector` on the updated counter value (no
   navigation expected).

Rollback: revert commits 3–5; the API route can stay (it's additive).
