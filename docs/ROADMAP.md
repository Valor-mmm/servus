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
  boxes during packing.
- `moving` — packed → delivered → unpack lifecycle; place items into rooms
  individually or all at once; standalone item capture for large items.
- `invites` — mint single-use codes that let an admin add a temporary helper
  without a code change.
- `item-classification` — async AI pipeline (Cloudflare Workers AI + ISBN
  lookup) classifies captured photos; swipe-to-review UI for curation.
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

### M2 — `add-inventory-core` ✓

Capability gained: **inventory**.

- Item entity: id, name, category, optional estimated value, room (nullable),
  box (nullable), photo key (nullable), status (`confirmed`), created/updated
  timestamps.
- Category entity: flat list, admin-managed.
- Room entity: flat list, admin-managed (matches rooms in new home).
- CRUD UI: create / edit / delete items, search by name, filter by category and
  by room.
- KV layout: primary `["item", id]`; indexes `["item-by-category", cat, id]`,
  `["item-by-room", room, id]`, `["item-by-box", box, id]`.
- Atomic writes keep indexes consistent.
- `boxId` and `roomId` are mutually exclusive: assigning a box clears the room
  and vice versa.

**Non-goals:** purchase history, invoices, warranty tracking, bulk import.

### M3 — `add-boxes-and-codes` ✓

Capability gained: **boxes**.

- Box entity: id, auto-incrementing short code (`B-001`, `B-002`, …), optional
  label, destination room (nullable), status (`empty` | `packed` | `delivered`).
- Status is tracked automatically: `empty` when no items, `packed` when ≥ 1
  item. Status never auto-downgrades once `delivered`.
- Printable label page: destination room name as dominant element with Unicode
  room icon, short code, optional label, item count badge, SVG QR code linking
  to the box detail view.
- Bulk-add: enter item names in a textarea (comma-separated or one-per-line);
  creates items immediately assigned to the box.
- Box list and detail views with item counts, per-item remove action, edit form.

**Non-goals:** weight/dimension tracking, photo-first bulk capture (future
M7/M8).

### M4 — `box-lifecycle-and-label` ✓

Capability gained: **moving flow**.

- Box status transitions: `empty ↔ packed` (automatic), `packed → delivered`
  (manual "Als geliefert markieren" button), `delivered` → tombstone-deleted via
  unpack flow.
- Per-item "Einlagern" form on delivered boxes: room select pre-filled to
  destination room. Placing the last item tombstone-deletes the box.
- "Alle entpacken nach [Raum]": assigns destination room to all remaining items,
  removes them from the box, tombstone-deletes the box in one flow.
- Inline assign-destination-room section shown when a delivered box has no room.
- Tombstone deletion: live box record and code index are removed atomically;
  `BoxTombstone` written so short codes are permanently retired and history
  preserved.

**Non-goals:** multi-truck logistics, mover assignments, scheduling, re-packing.

### M5 — `design-overhaul` ✓

Capability gained: **polished, mobile-ready UI**.

- Mobile-first layout with bottom navigation bar (thumb-reachable).
- Bavarian-inspired color palette: rich blue, warm parchment white background,
  lion-gold accent for primary CTAs.
- Lion mascot SVG used as app logo and empty-state illustration.
- CSS custom properties (design tokens) for consistent theming across the app.
- Dark mode via `@media (prefers-color-scheme: dark)` — same token names, dark
  values.
- Micro-animations: fade-up on list render, scale on button press, playful
  confetti on "Als geliefert markieren".
- Status badges with distinct colors (empty=gray, packed=blue, delivered=green).
- PWA: installable via `manifest.json` — app icon, splash screen, standalone
  display mode (no service worker / offline data in scope).

**Non-goals:** custom font loading, theming UI, service worker, offline data.

### M6 — `add-item-quantity` ✓

Capability gained: **quantity tracking** (extension of `inventory`).

- `Item` gains a `quantity` field: positive integer, default `1`, minimum `1`.
- Item creation and edit forms expose a quantity input with increment/decrement
  controls; server-side validation rejects values below `1`.
- Item list shows quantity next to each item name.
- Box detail shows per-item quantity so packers know how many units are packed.
- Inline `−` / `+` buttons on both the item list and box detail views allow
  one-tap quantity adjustment without navigating to the edit form; implemented
  as a Fresh 2 island for immediate feedback.

**Non-goals:** per-box quantity splits, fractional quantities, automatic
decrement on box transfer.

---

## Optional milestones

These are useful but the move works fine without them. Implement when time
allows.

### M7 — `add-item-photos`

Capability gained: **item photos**.

- One photo per item captured from mobile camera
  (`<input type="file" capture>`).
- Storage: Cloudflare R2 free tier; presigned PUT URL from server.
- Thumbnail generated server-side on upload (small WebP).
- Item view shows photo; list view shows thumbnail.

**Non-goals:** multiple photos per item, image search.

### M8 — `add-item-classification`

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

### M9 — `add-invite-codes`

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
- **D5.** Invite codes deferred to optional M9. Invite infrastructure is not
  needed until helpers are added during the move; the two primary users are
  seeded via env vars.
- **D6.** Photo-first capture and AI classification planned for M7/M8. Text
  bulk-add covers the packing workflow for MVP.
- **D7.** AI classification is optional (M8) and fully async — the move works
  with unnamed items. Classification enriches data after the fact.
- **D8.** Classification via Cloudflare Workers AI (LLaVA, free tier) + Google
  Books ISBN API (free, no auth). Stays within the free-forever constraint.
- **D9.** No `in-transit` box status. For a single-trip move the state adds
  friction with no benefit. `delivered` replaces the old `unpacked`/`in-transit`
  pair: it is set manually when the box arrives, which is the signal that
  triggers the unpack flow.
- **D10.** Design overhaul shipped as M5 ahead of item photos (M7). The design
  work was self-contained and immediately improved usability for the move.
  Item quantity (M6) was an in-flight extension to inventory rather than a
  pre-planned milestone; recorded here so the roadmap reflects what shipped.

## Beyond MVP

- Shopping list with two-person sync and "added by" attribution.
- Recipes that reference items / categories from inventory.
- Pantry view with expiry reminders.
- Lending tracker ("we lent the drill to X").
- Maintenance reminders (filters, batteries).
