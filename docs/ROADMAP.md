# servus — Roadmap

This is the spec-driven roadmap. Each MVP milestone corresponds to one OpenSpec
change. The ordering is deliberate: each change builds on the capabilities of
the previous one and is shippable on its own.

## North star

A private, free-to-run home management system that helps two people catalog what
they own, pack it into boxes, move it, and then continue to manage it
day-to-day. The MVP must be **usable for the imminent move** within 1–2 weeks.

## MVP timeline (target)

| Week | Days | Milestone                                               |
| ---- | ---- | ------------------------------------------------------- |
| 1    | 1    | M0: Foundation (Fresh app, KV, deploy pipeline, domain) |
| 1    | 2–3  | M1: Authentication + sessions + brute-force protection  |
| 1    | 3    | M2: Invite codes                                        |
| 1    | 4–7  | M3: Inventory core (items, categories, rooms)           |
| 2    | 1–3  | M4: Boxes + short codes (QR labels)                     |
| 2    | 3–5  | M5: Moving flow (pack/unpack + bulk box→room)           |
| 2    | 6–7  | M6 (stretch): Item photos via Cloudflare R2             |

Stretch is droppable without affecting the move's usability.

## Capabilities

Long-term capability list (what the system _will_ be able to do, not just MVP):

- `auth` — authenticate users, manage sessions, resist brute-force.
- `invites` — mint single-use codes that let an admin add a temporary user
  without a code change.
- `inventory` — catalog physical items with name, category, room, and optional
  estimated value.
- `boxes` — model physical containers with scannable codes; assign items to
  boxes during packing.
- `moving` — pack/unpack lifecycle, bulk-reassign a whole box to a destination
  room.
- `item-photos` — attach images to items.
- (future) `shopping` — shopping list synced between two people.
- (future) `recipes` — recipe storage with ingredient links to inventory.
- (future) `pantry` — fridge / pantry items with expiry tracking.

## MVP changes (ordered)

### M0 — Project foundation (not an OpenSpec change)

Pure setup. Tracked in git and CI, not in OpenSpec, because it doesn't add a
user-visible capability.

- Deno + Fresh 2 skeleton, `deno.json` tasks.
- `lib/kv/` typed wrappers around `Deno.openKv()`.
- `lib/i18n/locales/de.ts` + `lib/i18n/t.ts` — static German locale, zero deps.
- GitHub Actions pipeline (lint, fmt, type, unit, integration, e2e).
- Deno Deploy project + custom domain `servus.valor.codes`.
- Playwright bootstrap with a "homepage loads" smoke test.
- `renovate.json` — Renovate Bot config (auto-merge patch/minor, flag majors).
  Requires Renovate GitHub App installed on the `Valor-mmm` account.
- `README.md` and this `ROADMAP.md` committed.

**Exit criteria:** a hello-world page is live on `servus.valor.codes`, green CI
on main, Playwright smoke test passes, Renovate Bot opens its first
dependency-dashboard issue.

### M1 — `add-authentication`

Capability gained: **auth**.

- Seeded admin account(s) created from env vars on first boot.
- Password hashing: Argon2id, salt per password, cost params encoded in the hash
  string.
- Session: opaque ID in signed HttpOnly cookie, server-side record in KV with
  idle + absolute expiry.
- Login rate-limit: per-IP and per-username; constant-time response.
- Account lockout after N failed attempts with exponential backoff.
- CSRF token bound to session, required on every mutation.
- Security headers middleware applied globally.

**Non-goals:** password reset, MFA, OAuth, email verification.

### M2 — `add-invite-codes`

Capability gained: **invites**.

- Admin can mint single-use invite codes (random, ≥ 128 bits, stored hashed).
- Codes expire 7 days from issuance by default.
- Consuming a code creates a user with a chosen password; the code is burned
  atomically.
- Admin can list outstanding invites and revoke unused ones.

**Non-goals:** role granularity beyond admin/user, email delivery.

### M3 — `add-inventory-core`

Capability gained: **inventory**.

- Item entity: id, name, category, optional estimated value, room (nullable),
  created/updated timestamps.
- Category entity: flat list, admin-managed.
- Room entity: flat list, admin-managed (matches rooms in new home).
- CRUD UI: create / edit / delete items, search by name, filter by category and
  by room.
- KV layout: primary `["item", id]`; indexes `["item-by-category", cat, id]`,
  `["item-by-room", room, id]`.
- Atomic writes keep indexes consistent.

**Non-goals:** purchase history, invoices, warranty tracking, photos (M6
stretch), bulk import.

### M4 — `add-boxes-and-codes`

Capability gained: **boxes**.

- Box entity: id, short human code (e.g. `B-042`), optional label, status
  (`empty` | `packed` | `in-transit` | `unpacked`).
- Items can be assigned to a box; assigning to a box clears any direct room
  assignment. (Box owns location until unpacked.)
- Printable label page with a QR code that links to the box's detail view.
  Scanning opens the contents list on a phone.
- Bulk-add: from a box's detail page, quickly add many items in one go (single
  input, comma-separated or one-per-line).

**Non-goals:** weight/dimension tracking, photo of box contents.

### M5 — `add-moving-flow`

Capability gained: **moving**.

- Box status transitions: `empty → packed → in-transit → unpacked`.
- "Unpack" action on a box: pick a destination room; all items in the box
  atomically get that room and the box becomes `unpacked`.
- Reverse action: re-pack into a different box (rare, but supported).
- Move dashboard: count of boxes by status, items packed vs. total, next room to
  unpack.

**Non-goals:** multi-truck logistics, mover assignments, scheduling.

### M6 — `add-item-photos` (stretch)

Capability gained: **item-photos**.

- One photo per item (sufficient for visual recognition).
- Upload from mobile camera via the standard `<input type="file" capture>`.
- Storage: Cloudflare R2 free tier; presigned PUT URL from server.
- Thumbnail generated server-side on upload (small WebP).
- Item view shows photo; list view shows thumbnail.

**Non-goals:** multiple photos, image search, OCR.

## Decision log (will move to `docs/decisions/`)

- **D1.** Database is Deno KV, not SQLite/Postgres. Rationale: native to Deno
  Deploy, free, atomic ops, our access patterns are prefix-scans not joins.
  Migration path to SQL exists if needed.
- **D2.** Framework is Fresh 2, not a SPA + separate API. Rationale: fewer
  moving parts, server-rendered = fast on mobile, islands cover our interactive
  needs (search, bulk add, QR scanning).
- **D3.** Custom auth, not third-party. Rationale: a 2-user app does not need an
  identity platform; vendor risk and dependency churn outweigh the convenience.
- **D4.** No invoices / purchase history in MVP. Rationale: speed. Easy to add
  later as additional fields on `Item`.
- **D5.** Photos are a stretch goal, not MVP-critical. Rationale: the move
  benefits more from box/room workflow than from photos.

## Open questions to resolve before M0

- Exact subdomain — confirm `servus.valor.codes` and DNS access for it.
- Whether to print physical QR labels via a separate tool or render print-ready
  PDF in-app (probably in-app for self-containment).
- Whether to track move-day notes (e.g. "fragile") as a free-text field on Box
  or Item. Likely Item.

## Beyond MVP (sketched, not committed)

- Shopping list with two-person sync and "added by" attribution.
- Recipes that reference items / categories from inventory.
- Pantry view with expiry reminders.
- Lending tracker ("we lent the drill to X").
- Maintenance reminders (filters, batteries).
