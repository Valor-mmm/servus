# servus — Roadmap

This is the spec-driven roadmap. Each milestone corresponds to one OpenSpec
change and is shippable on its own. The ordering is deliberate: each change
builds on the capabilities of the previous one.

## North star

A private, free-to-run home management system that helps two people catalog what
they own, pack it into boxes, move it, and then continue to manage it
day-to-day.

## Capabilities

- `auth` — authenticate users, manage sessions, resist brute-force.
- `inventory` — catalog physical items with name, category, room, and optional
  photo.
- `boxes` — model physical containers with scannable QR codes; assign items to
  boxes during packing via photo-first bulk capture.
- `moving` — pack/unpack lifecycle; unpack a box into a room with per-item
  exceptions; standalone item capture for large items without a box.
- `item-classification` — async AI pipeline (Cloudflare Workers AI + ISBN
  lookup) classifies captured photos; swipe-to-review UI for curation.
- `invites` — mint single-use codes that let an admin add a temporary helper
  without a code change.
- (future) `shopping` — shopping list synced between two people.
- (future) `recipes` — recipe storage with ingredient links to inventory.
- (future) `pantry` — fridge / pantry items with expiry tracking.

---

## Required milestones

These are move-blocking. Must be done before the move.

### M0 — Project foundation ✓ _(not an OpenSpec change)_

Pure setup. Tracked in git and CI, not in OpenSpec.

- Deno + Fresh 2 skeleton, `deno.json` tasks.
- `lib/kv/` typed wrappers around `Deno.openKv()`.
- `lib/i18n/locales/de.ts` + `lib/i18n/t.ts` — static German locale, zero deps.
- GitHub Actions pipeline (lint, fmt, type, unit, integration, e2e).
- Deno Deploy project + custom domain `servus.valor.codes`.
- Playwright bootstrap with a "homepage loads" smoke test.
- `renovate.json` — Renovate Bot config (auto-merge patch/minor, flag majors).
  Requires Renovate GitHub App installed on the `Valor-mmm` account at
  `github.com/apps/renovate`.
- `README.md` and this `ROADMAP.md` committed.

### M1 — `add-authentication` ✓

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

### M2 — `add-inventory-core`

Capability gained: **inventory**.

- Item entity: id, name, category, optional estimated value, room (nullable),
  photo key (nullable), status (`pending` | `suggested` | `confirmed`),
  created/updated timestamps.
- Category entity: flat list, admin-managed.
- Room entity: flat list, admin-managed (matches rooms in new home).
- CRUD UI: create / edit / delete items, search by name, filter by category and
  by room.
- KV layout: primary `["item", id]`; indexes `["item-by-category", cat, id]`,
  `["item-by-room", room, id]`.
- Atomic writes keep indexes consistent.

**Non-goals:** purchase history, invoices, warranty tracking, bulk import.

### M3 — `add-boxes-and-codes`

Capability gained: **boxes**.

- Box entity: id, short human code (e.g. `B-042`), optional label,
  `destinationRoom` (nullable, editable at any phase), status (`empty` |
  `packed` | `in-transit` | `unpacked`).
- Item location model: `item.roomId` (explicit) takes precedence over
  `box.destinationRoom` (inherited). Items in a box without a direct room
  assignment inherit the box's destination when unpacked.
- Printable label page with a QR code linking to the box detail view. System
  camera on iOS/Android handles scanning natively — no in-app QR reader needed.
- QR scan shows a context-aware view based on box status:
  - `empty` → photo-first bulk-add view
  - `packed` → contents list + "Add more" + "Unpack here"
  - `in-transit` → prominent "Unpack here" button
  - `unpacked` → read-only contents list
- **Photo-first bulk-add**: set room once at the top, then tap to photograph
  items one by one. Each photo immediately creates an item assigned to the box
  and queues it for AI classification. No name or category required at capture
  time.

**Non-goals:** weight/dimension tracking, multiple photos per item.

### M4 — `add-moving-flow`

Capability gained: **moving**.

- Box status transitions: `empty → packed → in-transit → unpacked`.
- **Unpack with exceptions**: default destination room applies to all items, but
  individual items can be tapped to assign a different room before confirming.
  Committed as one atomic KV write.
- **Standalone item capture**: for large items that move without a box — photo +
  mandatory room picker. Item gets a direct `roomId`, no box involved.
- Box `destinationRoom` editable at any phase (plans change during a move).
- Reverse action: re-pack an item into a different box.
- Move dashboard: count of boxes by status, items packed vs. total.

**Non-goals:** multi-truck logistics, mover assignments, scheduling.

---

## Optional milestones

These are useful but the move works fine without them. Implement when time
allows.

### M5 — `add-item-classification`

Capability gained: **item-classification**.

- Async pipeline: after a photo is captured, a Deno KV queue job fetches the
  image from R2 and sends it to Cloudflare Workers AI (LLaVA vision-language
  model, free tier).
- ISBN/barcode detection path for books: if a barcode is found, a Google Books
  API lookup (free, no auth) returns title, author, publisher — richer than
  vision alone.
- Pipeline result updates the item: name, category, any extra fields; status →
  `suggested`.
- **Tinder-style review UI**: swipe or tap through `suggested` items. AI got it
  right → confirm in one tap. Wrong → edit modal pre-filled with the suggestion.
  No typing required for the common case.
- Items without a photo or with a failed classification remain `pending` and
  appear in a separate "needs review" list.

**Non-goals:** on-device classification, paid vision APIs, multiple photos.

### M6 — `add-invite-codes`

Capability gained: **invites**.

- Admin can mint single-use invite codes (random, ≥ 128 bits, stored hashed).
- Codes expire 7 days from issuance by default.
- Consuming a code creates a user with a chosen password; the code is burned
  atomically.
- Admin can list outstanding invites and revoke unused ones.

**Non-goals:** role granularity beyond admin/user, email delivery.

---

## Decision log

- **D1.** Database is Deno KV, not SQLite/Postgres. Native to Deno Deploy, free,
  atomic ops; our access patterns are prefix-scans not joins. Migration path to
  SQL exists if needed.
- **D2.** Framework is Fresh 2, not a SPA + separate API. Fewer moving parts,
  server-rendered = fast on mobile, islands cover interactive needs.
- **D3.** Custom auth, not third-party. A 2-user app does not need an identity
  platform; vendor risk and dependency churn outweigh the convenience.
- **D4.** No invoices / purchase history. Easy to add later as additional fields
  on `Item`.
- **D5.** Invite codes deferred to optional (M6). Helpers carry boxes physically
  and don't need app access for the move itself. Can be enabled later if family
  helps with packing.
- **D6.** Photo-first capture lives in M3 (boxes bulk-add) and M4 (standalone
  items), not as a separate milestone. The box workflow is the natural capture
  moment; photos are part of the flow, not an add-on.
- **D7.** AI classification is optional (M5) and fully async — the move works
  with unnamed items. Classification enriches data after the fact; it is never
  on the critical path.
- **D8.** Classification via Cloudflare Workers AI (LLaVA, free tier) + Google
  Books ISBN API (free). Stays within the free-forever constraint. ISBN path
  preferred for books (richer structured data); LLaVA fallback for everything
  else.

## Beyond MVP

- Shopping list with two-person sync and "added by" attribution.
- Recipes that reference items / categories from inventory.
- Pantry view with expiry reminders.
- Lending tracker ("we lent the drill to X").
- Maintenance reminders (filters, batteries).
