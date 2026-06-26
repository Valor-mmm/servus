# servus verification review — consolidated final

Date: 2026-06-19 · Branch reviewed: `origin/main` (= post-PR#39, containment
merged) · Review branch: `review/verification-2026-06-19`

This is the single triage document for the whole pass. It combines all six
reviewers into one ranked action list. Source detail lives in
`findings/<agent>.md`; the Phase 1 experience synthesis is `findings/uiux.md`.

## Verdict

The app is **fundamentally sound for the move** — every core task completes and
several flows are genuinely strong (containment, box create/label/deliver,
quantity steppers, the custom category-type editor, login/logout, the
admin/delete-confirm page). Risk concentrates in exactly two places —
**authorization** and **data durability** — both small, well-localized fixes.
Everything else is friction and polish tracing back to a handful of root causes.

## Reviewer roster & counts

| Reviewer                                     | Phase | Model  | B / Ma / Mi / N       |
| -------------------------------------------- | ----- | ------ | --------------------- |
| UI (visual/clarity)                          | 1     | Opus   | 0 / 8 / 16 / 3        |
| UX (flow/friction)                           | 1     | Opus   | 1 / 13 / 17 / 1       |
| **UI/UX synthesis** (dedup of the two above) | 1     | Opus   | **1 / 13 / ~21 / ~3** |
| Frontend (islands/CSS/i18n)                  | 2     | Sonnet | 0 / 2 / 8 / 8         |
| Backend (auth/routes/KV access)              | 2     | Sonnet | 1 / 1 / 2 / 2         |
| Database (KV schema/integrity)               | 2     | Sonnet | 1 / 6 / 7 / 5         |
| Docs (spec drift/accuracy)                   | 2     | Sonnet | 0 / 3 / 9 / 6         |

Distinct BLOCKERs after cross-reviewer dedup: **2**.

---

## P0 — BLOCKERs (fix before relying on the app for the move)

### B1 — Helper accounts have full admin access

- **Found by:** UX (UX-5) · **confirmed in code by:** Backend.
- **Root cause:** there is no `role` field on `User` and no admin gate anywhere
  — access is controlled only by `requireAuth` + hiding the nav link.
- **Impact:** a short-lived invited helper can reach `/admin`, export the entire
  private inventory, and use the live "delete all data" button. Spec-violation
  of invites ("MUST NOT have admin privileges / role: user").
- **Fix:** add `role` to `User`; set it in seed and in `consumeInvite`; add a
  `requireAdmin()` middleware on every `/admin/*` route **and** the dangerous
  POST handlers behind them (delete-all, export, import, invite create/revoke);
  hide "Verwaltung" from non-admins. Add a regression test: helper → `/admin`
  → 403.

### B2 — Backups silently drop data (export is incomplete)

- **Found by:** Database (Area 7) · **confirmed independently by:** Docs.
- **Root cause:** `EXPORT_PREFIXES` in `lib/kv/export.ts` omits 5 prefixes:
  `["category-schema"]`, `["group"]`, `["group-item"]`, `["item-group"]`,
  `["item-by-container"]`.
- **Impact:** every backup taken today silently discards **custom category
  schemas and all groups** (and the containment index). A restore from a current
  backup would permanently lose the wife's schema configuration. The app is LIVE
  with real data, so this is the most dangerous gap in the review.
- **Fix:** add the 5 prefixes to `EXPORT_PREFIXES` (one-file change). Until
  then, treat no export as a valid restore point. Also make `deleteAllKv` clear
  the same prefixes for consistency.

---

## P1 — MAJOR, move-day risk (data correctness & the daily workflow)

These are mostly Phase-2 data-layer findings invisible to a UI/UX pass.

- **M1 — No optimistic locking on `updateItem`** (Database, Areas 2 & 4). Every
  quantity adjust and field edit is a lost-update race; acute when multiple
  helpers are active. Fix: capture the versionstamp in `findItem`'s `kv.get` and
  add `.check(...)` to the atomic commit in `updateItem`.
- **M2 — Pending → confirm loop is broken + triage row wrong** (UX M-4, Docs,
  inventory spec gap). Hand-corrected scans can never leave `pending`; the
  triage page shows "(unbenannt)" even after naming
  (`routes/items/pending.tsx:45`, one-line fix `{item.name || t(...)}`) and
  omits the spec-required thumbnail/quantity. **Needs a spec change first** (no
  `confirmed` transition exists), then a confirm action + spec-correct row
  rendering. This is the wife's daily job.
- **M3 — `importKv` has no try/catch around `JSON.parse`** (Database, Area 7). A
  malformed line partially commits then aborts — corrupt restore. Wrap parse +
  validate before commit; make import all-or-nothing.
- **M4 — Schema field-key rename silently orphans item metadata** (Database,
  Area 5). Irreversible on live data. Detect key changes in `updateSchema` and
  reject (or migrate affected items).
- **M5 — Destructive actions fire with no confirmation** (UX R5, Frontend). The
  `data-confirm` attribute exists but was never wired to any JS handler, so
  "Alle entpacken" (permanent box deletion), category/room/group deletes all
  fire instantly. Wire one shared confirm pattern scaled to blast radius;
  de-emphasise the red delete buttons.
- **M6 — Login IP rate-limit widened to 30/15min and never restored** (Backend).
  Was relaxed for the E2E suite. Restore to ≤10 with proper test isolation
  (CLAUDE.md §8).

---

## P2 — MAJOR, experience (root causes from the Phase 1 synthesis)

- **R1 — Build the shared styled-atom library** (UI, Frontend-confirmed). One
  body of CSS/components — link color, `.btn-secondary` for Zurück/Abbrechen,
  photo-capture button, flat fieldset, editable list-row, reusable lion
  empty-state, a pluralizing `count()` helper, a styled 404 shell — closes
  roughly a third of the whole report and removes the pervasive "half-finished"
  look. Frontend also pinned the BottomNav prefix-match bug
  (`BottomNav.tsx:3-6`).
- **R2 — Make `/` a real dashboard + Schnellerfassung a Foto/Manuell hub.**
  Today the landing is three static lines and the loudest add button is
  photo-only — a cold start for the helper and a dead end for the by-hand wife.
  Spec mandates a prominent primary action in two taps.
- **R3 — Destination-side packing + collapse placement.** Add "Vorhandene
  einpacken" on box detail and "add contents" on container detail; collapse the
  item-form's three overlapping placement controls (Behälter/Raum/Karton) to one
  "Standort" picker.
- **R6b — Harden the rest of the invite flow.** Logged-in user opening an invite
  silently burns the single-use code; no copy button on the one-time banner; no
  context on the accept page.

---

## P3 — Docs, specs & housekeeping

- **Update the design-system spec** to the shipped named-theme system
  (Raute/Sternenhimmel, `#0e1830`, JS OS-preference resolution) — it still
  describes the old `html.dark` + `#1a1410` + localStorage toggle (Docs, MAJOR).
- **Add a `confirmed` transition to the inventory spec** (prerequisite for M2).
- **CLAUDE.md drift** (Docs): §5 lists a `lib/moving/` that doesn't exist (logic
  is in `lib/inventory/`); §10 CI pipeline lists 8 steps but `ci.yml` has 3
  jobs; §15 points local dev at `deno task start` (production build) instead of
  `deno task dev`.
- **ROADMAP** stale since M7 (~14 shipped capabilities unreflected); **README**
  claims an auto-deploy that doesn't exist and omits R2 env vars; two specs
  (groups, data-export) have unfilled "Purpose" placeholders; three archived
  changes lack `specs/` deltas.
- Add decision records for groups, containment, named-theme, data-export.

---

## P4 — MINOR batches (polish; group under their root cause)

- **Filter/list ergonomics:** filter-aware empty state, "Filter zurücksetzen",
  per-room item count, search field on its own mobile row, 44px qty buttons,
  in-form qty error (not just native bubble).
- **a11y/copy:** label the filter selects + Mehr theme card; pluralization bug
  "1 Gegenstände" (in R1); friendly German import error; styled German file
  input; re-populate username after failed login; rate-limit responses should
  return HTTP 429 + Retry-After, not 200 + error HTML.
- **Data-layer minors:** non-atomic group reorder/membership-cleanup loops
  (crash-safety), `assertNoCycle` unbounded depth, migration script missing
  `--allow-write` in its shebang.

---

## Strengths (verified, keep these)

- **Security fundamentals are solid** (Backend Observations): Argon2id params
  correct, session cookie flags correct **and the prior Max-Age mobile-logout
  bug is confirmed fixed**, constant-time login, CSRF (CSPRNG, session-bound,
  constant-time compare), invite entropy/hashing, comprehensive security
  headers, correct open-redirect guard. The only auth gap is **authorization**
  (B1).
- **Typed category schemas work end-to-end** (UX correction + UI confirmation) —
  not a defect.
- **Well-built code** worth using as templates: `QuantityControl` island, the
  two-theme CSS token system, the schema new/edit form, the admin/delete-confirm
  flow.
- **Strong flows:** containment placement, box create/label/deliver,
  export/import round-trip (mechanically; the prefix gap B2 is separate),
  quantity steppers, search/filter, login/logout.

---

## Suggested sequencing

1. **B1 + B2** — the two BLOCKERs (authorization + export completeness). Small,
   urgent, independent.
2. **M1–M6** — data-correctness and the pending workflow (M2 needs a spec
   change).
3. **R1** — the shared styled-atom library (one pass, outsized polish payoff).
4. **R2, R3, R6b** — experience MAJORs.
5. **P3/P4** — specs, housekeeping, polish batches.

Per CLAUDE.md §6, each behavior change ships via an OpenSpec proposal first. B1,
B2, and M2 all touch behavior/specs and are the natural first proposals.

---

_Source files: `findings/ui.md`, `findings/ux.md`, `findings/uiux.md`,
`findings/frontend.md`, `findings/backend.md`, `findings/database.md`,
`findings/docs.md`. Orchestration log: `PLAN.md`. Screenshots: `screenshots/`
(32 PNGs)._
