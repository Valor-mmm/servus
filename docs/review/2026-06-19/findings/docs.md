# Documentation findings

<!-- Appended per-area. Format per PLAN.md §6. -->

## Area: README accuracy + env/setup

### [MINOR] README deployment section claims auto-deploy that doesn't exist
- **Where:** README.md line 66 ("Pushes to `main` trigger CI → if green → auto-deploy")
- **Relation:** quality (stale claim)
- **Evidence:** `.github/workflows/ci.yml` has three jobs — `check`, `test`, `e2e` — but no deploy step. No `deployctl` action or Deno Deploy step anywhere. The prior review pass (pre-launch-2026-06-03) flagged the same claim; it has not been fixed.
- **Recommendation:** Either add a deploy job to ci.yml or update the README to say "deploy is manual via deployctl / Deno Deploy dashboard."

### [MINOR] README env var table is incomplete — omits R2 variables
- **Where:** README.md "Environment variables" table
- **Relation:** quality
- **Evidence:** `.env.example` includes `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_URL` as required for photo features. The README table only lists `SERVUS_SESSION_KEY` and `SERVUS_SEED_USERS`. A new contributor setting up the app will not know about R2 vars.
- **Recommendation:** Add the three R2 variables to the env var table with their descriptions and a note that they are required when photo features are enabled.

## Area: Spec vs impl — auth

### [MINOR] Login rate-limit returns 200 with error HTML instead of HTTP 429 + Retry-After header
- **Where:** `routes/login.tsx` lines 68–76; auth spec "Login resists brute force per IP/per username"
- **Relation:** spec-violation (auth spec)
- **Evidence:** When `result.limited` is true, the handler calls `ctx.render(<LoginForm error={...} />)` which produces HTTP 200. The auth spec requires "the endpoint MUST respond with HTTP 429 and a `Retry-After` header." No `Retry-After` header is set in the response; the `retryAfterSeconds` value is only used in the error message string.
- **Recommendation:** Change the rate-limited branch to return `new Response(..., { status: 429, headers: { "Retry-After": String(secs) } })` with the error page as the body, so HTTP semantics match the spec. Same issue applies to the invite route.

## Area: Spec vs impl — boxes

Boxes spec: all key requirements appear implemented. The bulk-add textarea is correctly absent (removed in M7). Box label page toolbar, QR code, room icon, item count badge all present. Box tombstone deletion implemented. No spec violations found.

## Area: Spec vs impl — containment

Containment spec: implementation looks complete and correct. Accordion with lazy loading matches spec. Cycle protection, mutual exclusion of boxId/containerId, root-owns-room invariant, container deletion flow all present. Label page at `/items/[id]/label.tsx` exists. No spec violations found.

## Area: Spec vs impl — inventory

### [MAJOR] Pending-items triage page shows placeholder name for all items, ignoring actual name
- **Where:** `routes/items/pending.tsx` line 45; inventory spec "Pending-items triage list"
- **Relation:** spec-violation (inventory spec)
- **Evidence:** The pending page renders `{t("items.placeholderName")}` unconditionally for every item's name field. The spec requires: "the display name (`(unbenannt)` if `name` is empty)". If a pending item has had its name edited (e.g., the user gave it a name via the edit form), the pending list should show that name, not the placeholder.
- **Recommendation:** Change line 45 to `{item.name || t("items.placeholderName")}` to mirror the conditional used elsewhere in the codebase.

### [MINOR] Pending items have no path to `confirmed` status via the UI
- **Where:** `routes/items/pending.tsx`, inventory spec "Pending-items triage list" + "Pending status for photo-first items"
- **Relation:** spec-gap
- **Evidence:** The spec defines `pending` as a permanent state when edited via the standard form. No UI mechanism exists to transition `pending → confirmed` without M8 (AI classification). This is the gap flagged in the Phase 1 review. The triage page links to the edit form but the edit form cannot change status. A user who wants to "confirm" a photo-first item has no affordance to do so.
- **Recommendation:** Add a "Bestätigen" (confirm) action on the pending triage page and/or the item edit page that sets `status: "confirmed"`. Spec must be updated first to define the transition.

## Area: ROADMAP.md

### [MINOR] ROADMAP.md does not reflect shipped milestones since M7
- **Where:** `docs/ROADMAP.md`
- **Relation:** quality
- **Evidence:** Fourteen changes have been archived since the ROADMAP was last updated. The following shipped capabilities have no ROADMAP entry at all: `groups` (item grouping feature — routes/groups/, lib/inventory/groups); `containment` (items inside container items — explore/boxes-contain-items branch); `custom-category-schemas` / `typed-categories`; `add-import-export` (data-export spec exists); `add-box-label-print-toolbar`, `add-pwa-install-support`, `consolidate-admin-nav`, `mobile-item-list-layout`, `nav-overflow-menu`, `add-persistent-session-cookie`, `add-continuous-capture`. Additionally, M9 (`add-invite-codes`) is listed as optional/not-done, but invite codes shipped in June 2026 (three archived changes: `short-term-invite-codes`, `invite-qr-code`, `invite-token-auth`).
- **Recommendation:** Add a new set of entries (M10–M1x or sub-bullets under existing milestones) for each shipped change not yet reflected. Mark M9 as `✓`. Consider adding a decision entry for groups and containment, and add a `data-export` entry since that spec exists and shipped.

### [MINOR] ROADMAP.md M5 design-overhaul describes stale dark mode implementation
- **Where:** `docs/ROADMAP.md`, M5 section: "Dark mode via `@media (prefers-color-scheme: dark)` — same token names, dark values."
- **Relation:** quality (also overlaps with design-system spec drift flagged by Phase 1)
- **Evidence:** The named-theme system (Raute light / Sternenhimmel dark) shipped as `2026-06-02-ui-design-polish`. The current implementation uses CSS class-based theming with a user-selectable toggle, not purely media-query-based dark mode.
- **Recommendation:** Update the M5 non-goals / description to note that the shipped design uses named themes with a toggle, superseding the media-query-only approach.

## Area: docs/decisions/*

### [NIT] No decision record for groups, containment, named-theme system, or data-export
- **Where:** `docs/decisions/` — contains only `argon2-library.md` and `cloudflare-r2-setup.md`
- **Relation:** quality
- **Evidence:** CLAUDE.md §14 says "document briefly in the PR or in `docs/decisions/`" for non-obvious implementation choices. Groups (a new entity type), item containment, the switch from media-query dark mode to named themes, and the data-export format are all non-obvious architectural calls that have no decision record. The ROADMAP D-series log has entries through D12 covering M7, but nothing for post-M7 changes.
- **Recommendation:** Add decision records (or ROADMAP D-entries) for: the groups entity model, item containment design, named-theme architecture, and data-export format/schema.

## Area: Feature-without-spec sweep

All user-visible routes were cross-checked against the 14 canonical specs in `openspec/specs/`. No unspecced user-visible feature was found. Specific verifications:

- `routes/categories/*` and `routes/rooms/*` are covered by the inventory spec (categories with schema types, rooms as flat admin-managed lists).
- `routes/groups/*` is covered by the groups spec.
- `routes/invite/*` and `routes/admin/invites/*` are covered by the invites spec.
- `routes/api/items/containers.ts` is covered by the containment spec's "container selector" requirement.
- `routes/dev/capture-test.tsx` is a developer harness behind `requireAuth`; no spec needed.
- `routes/mehr.tsx` is covered by the design-system spec ("Mehr" secondary navigation menu requirement).

### [MINOR] Three archived changes have no `specs/` delta directory — canonical specs may be incomplete
- **Where:** `openspec/changes/archive/2026-06-10-add-box-label-print-toolbar/`, `openspec/changes/archive/2026-06-10-add-pwa-install-support/`, `openspec/changes/archive/2026-06-10-consolidate-admin-nav/`
- **Relation:** quality (CLAUDE.md §6 "Archive — update the canonical specs in openspec/specs/")
- **Evidence:** These three archived changes contain only `proposal.md`, `design.md`, and `tasks.md` — no `specs/` subdirectory with canonical spec updates. By comparison, all other archived changes (groups, containment, photos, etc.) include a `specs/` delta. The PWA installability and box-label print toolbar features are coincidentally covered by the design-system and boxes specs respectively, but through unrelated updates — not because these changes contributed spec text. The admin-nav consolidation is not clearly documented anywhere in the canonical specs.
- **Recommendation:** Add the missing `specs/` deltas to these three archived changes, or confirm that the canonical specs already cover the shipped behavior and add a note to the archive proposal explaining which spec already addresses it.

## Area: Spec vs impl — lazy-thumbnails / items-browse-performance / quantity-island

### [NIT] Lazy-thumbnail error banner uses inline German, bypassing the i18n helper
- **Where:** `static/app-init.js` line 65; CLAUDE.md §11 ("No inline German (or English) strings in JSX/TSX components")
- **Relation:** quality (CLAUDE.md §11 violation, though the file is `.js` not `.tsx`)
- **Evidence:** The error banner text `"Einige Bilder konnten nicht geladen werden. "` and `"Seite neu laden →"` and `"Schließen"` are embedded directly in the static JS file. Since this is a compiled plain-JS script, it cannot call `t()`. All other visible copy in the app goes through the German locale file. These strings are invisible to `de.ts` and would be missed in any future i18n audit.
- **Recommendation:** Add data attributes or a `<template>` element to the server-rendered layout so the error banner text can be read from the DOM (where it was output via `t()`), rather than hard-coded in JS.

## Area: Spec vs impl — design-system

### [MAJOR] Design-system spec describes the old html.dark + #1a1410 theming, not the shipped named-theme system
- **Where:** `openspec/specs/design-system/spec.md` "Dark mode via user toggle and system preference"; `static/styles.css`; `lib/styles/theme.ts`
- **Relation:** spec-violation (design-system spec)
- **Evidence:** The shipped implementation uses a named-theme system with two themes, "Raute" (light) and "Sternenhimmel" (dark), applied as CSS classes `html.theme-raute` and `html.theme-sternenhimmel`. The localStorage key `servus-theme` stores values `"raute"` or `"sternenhimmel"`. The spec mandates: (1) the class `html.dark`; (2) the localStorage key `servus-theme` with values `"dark"` / `"light"`; (3) a `@media (prefers-color-scheme: dark)` block adding `html.dark` without JS; (4) dark background `--servus-bg: #1a1410` (warm oak). The implementation instead: (1) uses `html.theme-sternenhimmel`; (2) stores `"sternenhimmel"`; (3) resolves OS preference in an inline JS script (no CSS-only fallback); (4) uses `--servus-bg: #0e1830` (navy blue). The `#0e1830` value is a cold navy, which directly contradicts the spec's "warm Bavarian tones rather than cold gray" requirement.
- **Recommendation:** The implementation is better than the spec (named themes are more extensible). The spec should be updated to describe the actual named-theme architecture: the CSS class scheme, the storage key values, the JS-driven OS preference resolution, and the Sternenhimmel dark palette. The warm-tones requirement may need revisiting if the navy is intentional branding.

## Area: Spec vs impl — data-export

### [MAJOR] Export/import does not cover groups data — full cycle loses all group assignments
- **Where:** `lib/kv/export.ts` (EXPORT_PREFIXES list); data-export spec "Export produces NDJSON covering all in-scope KV prefixes"
- **Relation:** spec-gap (groups feature has no export coverage)
- **Evidence:** The groups feature introduced four KV prefix namespaces: `["group"]`, `["group-by-name"]`, `["group-item"]`, `["item-group"]`. None appear in `EXPORT_PREFIXES`. A full export-import cycle silently drops all group records and all membership entries. Users who have organized items into groups would lose that organization entirely after restoring from a backup. The data-export spec was written before groups shipped, so this is a gap, not a violation of the existing spec text.
- **Recommendation:** Add `["group"]`, `["group-by-name"]`, `["group-item"]`, `["item-group"]` to `EXPORT_PREFIXES` in `lib/kv/export.ts` and update the spec to list these prefixes.

### [MINOR] Export/import does not cover the containment index — post-import containment may be inconsistent
- **Where:** `lib/kv/export.ts` (EXPORT_PREFIXES); `lib/inventory/itemRepo.ts` line 33–34 (`["item-by-container", ...]` key)
- **Relation:** spec-gap
- **Evidence:** The containment feature stores a secondary index at `["item-by-container", containerId, itemId]`. This prefix is not in `EXPORT_PREFIXES`. After an import, item records (which contain `containerId`) are restored, but the `["item-by-container"]` index is missing. Any page that lists items inside a container (e.g., the containment accordion) uses `listItemsByContainer()`, which queries this index — the items would appear to have no children after import. The `containerId` field on the child item is intact, but the index is not.
- **Recommendation:** Add `["item-by-container"]` to `EXPORT_PREFIXES`. Alternatively, rebuild indexes on import (more complex).

### [NIT] Data-export spec "Purpose" field was never filled after archive
- **Where:** `openspec/specs/data-export/spec.md` line 4 ("TBD - created by archiving change add-import-export.")
- **Relation:** quality
- **Evidence:** Same archiving placeholder as in groups spec — the Purpose was never written.
- **Recommendation:** Add a one-paragraph Purpose describing the export/import/delete-all feature.

## Area: Spec vs impl — photos / capture-preview / native-photo-capture

### [NIT] presignGet uses current window end instead of "next 15-min wall-clock boundary"
- **Where:** `lib/photos/signing.ts` lines 51–57; photos spec "Display URLs are presigned with a windowed expiry"
- **Relation:** quality
- **Evidence:** The spec says "expiry is rounded up to the next 15-minute wall-clock boundary." For a render at 14:32, the next boundary is 15:00 (28 minutes ahead), but the implementation computes `windowStart = floor(14:32/15min) * 15min = 14:30` and `expiresAt = 14:30 + 15min = 14:45` — i.e. the end of the CURRENT window, not the NEXT boundary. The URL expires in 13 minutes, not 28. The same-window caching invariant (byte-identical URLs within a window) is correctly honored. The "maximum 30 minutes" safety cap is not violated since the actual max is 15 minutes. Only the specific "next boundary" wording is not implemented.
- **Recommendation:** To match the spec exactly, use `windowEnd + GET_WINDOW_SECONDS` (i.e., add one full window beyond the current boundary). This extends display URL lifetime up to 30 minutes while still ensuring same-window idempotency. Alternately, update the spec wording to say "current window end."

## Area: Spec vs impl — groups

### [MINOR] Groups autocomplete island requires JavaScript — contradicts "without client-side scripting" requirement
- **Where:** `islands/GroupAutocomplete.tsx`; groups spec "Create-or-reuse a group from an item" → "The input MUST offer autocomplete over existing group names without requiring client-side JavaScript"
- **Relation:** spec-violation (groups spec)
- **Evidence:** The `ItemGroupsEditor` component renders `<GroupAutocomplete>`, which is a Preact island using `useSignal`. With JavaScript disabled, the input degrades to a plain text field — no autocomplete suggestions are shown. The component comment in `ItemGroupsEditor.tsx` line 7 mentions "native `<datalist>`" but the actual implementation replaced that with the JS island. The core form submission (typing a name and POSTing) still works without JS, but the spec's autocomplete requirement is not met.
- **Recommendation:** Add a `<noscript>` fallback with a `<datalist>` element listing all group names, or restructure the component to render a `<datalist>` server-side as the baseline and enhance with the island.

### [MINOR] Group deletion cascade is not fully atomic — orphaned membership keys possible on crash
- **Where:** `lib/inventory/itemRepo.ts` lines 493–505; groups spec "Cascade cleanup on deletion" → "Neither operation MUST leave orphaned membership entries"
- **Relation:** spec-violation (groups spec)
- **Evidence:** `deleteItem()` calls `op.commit()` at line 493 to delete the item KV record, then removes group memberships in a separate loop (lines 497–505) with individual `kv.atomic()` calls. If the process terminates between the main commit and the group membership cleanup, the `["group-item", groupId, itemId]` entries remain but the item they reference is gone — orphaned. The group cascade in `deleteGroup()` has the same pattern (item loop is sequential, not one atomic).
- **Recommendation:** Batch the group membership cleanup into the same atomic commit as the item deletion, or use a transactional helper that retries the cleanup. Note: the database reviewer may already have this finding.

### [NIT] Groups spec "Purpose" field was never filled after archive
- **Where:** `openspec/specs/groups/spec.md` line 4 ("TBD - created by archiving change groups. Update Purpose after archive.")
- **Relation:** quality
- **Evidence:** The archiving placeholder was never replaced with a real purpose statement. All other spec files have a meaningful Purpose section.
- **Recommendation:** Add a one-paragraph Purpose describing the groups feature.

## Area: Spec vs impl — invites

### [NIT] Rate-limited invite responses return HTTP 200 instead of a proper error status
- **Where:** `routes/invite/[code].tsx` lines 49 and 70; invites spec "Invite route rate-limiting"
- **Relation:** quality
- **Evidence:** When an IP is rate-limited, both GET and POST handlers call `ctx.render(<RateLimitedPage .../>)` which returns HTTP 200. The invites spec does not explicitly mandate HTTP 429 (unlike the auth spec), but the response is semantically incorrect and inconsistent with the auth rate-limit handling. No `Retry-After` header is set.
- **Recommendation:** Return HTTP 429 with a `Retry-After` header when rate-limited, consistent with the auth spec's behavior.

## Summary

**Counts:** 0 BLOCKER · 3 MAJOR · 9 MINOR · 6 NIT

### Top 3 to fix

1. **[MAJOR] Export/import silently loses all group data** (`lib/kv/export.ts`). A backup-restore cycle drops every group record and membership entry. The fix is a one-liner: add four prefixes to `EXPORT_PREFIXES`. Also add `["item-by-container"]` for containment index completeness.

2. **[MAJOR] Pending-items triage page always shows "(unbenannt)" placeholder** (`routes/items/pending.tsx` line 45). Items that have been given names still show the placeholder. One-line fix: `{item.name || t("items.placeholderName")}`.

3. **[MAJOR] Design-system spec is significantly out of date** (`openspec/specs/design-system/spec.md`). The spec still describes `html.dark` + `#1a1410` + `localStorage "dark"/"light"`, but the shipped system uses `html.theme-raute`/`html.theme-sternenhimmel`, `#0e1830` background, and JS-driven OS preference resolution. Any new contributor reading the spec would build the wrong thing.

### Notable patterns

- Two TBD Purpose placeholders in specs (groups, data-export) were never replaced after archiving.
- The ROADMAP has not been updated since M7; fourteen shipped capabilities are not reflected.
- Three archived changes (box-label-toolbar, PWA, admin-nav consolidation) lack the required `specs/` delta, potentially meaning canonical specs don't fully capture those features.
- The groups cascade-deletion atomicity issue (item KV record deleted then group memberships cleaned up in a separate loop) is a crash-safety gap that the database reviewer may also have flagged.

## Area: CLAUDE.md drift

### [MINOR] CLAUDE.md §5 repo layout documents lib/moving/ which does not exist
- **Where:** CLAUDE.md §5 "Repository layout", line `moving/ — packing, unpacking, bulk move`
- **Relation:** quality
- **Evidence:** `ls lib/` shows: `auth  i18n  inventory  invites  kv  log.ts  photos  styles`. There is no `lib/moving/` directory. The moving-workflow logic was merged into `lib/inventory/` (box-related functions).
- **Recommendation:** Remove `lib/moving/` from the layout diagram and add the directories that do exist but are undocumented: `lib/photos/`, `lib/i18n/`, `lib/styles/`, `lib/log.ts`.

### [MINOR] CLAUDE.md §10 CI pipeline lists steps that don't exist in ci.yml
- **Where:** CLAUDE.md §10, steps 7 and 8
- **Relation:** quality
- **Evidence:** §10 lists "Dep audit — `deno info` + a simple deny-list check" and "Deploy (main only) — pushes to Deno Deploy via `deployctl`". Neither exists in `.github/workflows/ci.yml`. The actual pipeline has lint/fmt/typecheck, unit+integration tests, and Playwright E2E — three jobs, not eight steps.
- **Recommendation:** Rewrite §10 to reflect the three actual CI jobs.

### [NIT] CLAUDE.md §15 lists `deno task start` as the local dev command
- **Where:** CLAUDE.md §15, first command block
- **Relation:** quality
- **Evidence:** `deno task start` runs `deno serve -A _fresh/server.js` (the production build). The correct local dev command is `deno task dev`. This is the same command listed in §10 setup steps. A new developer following §15 would have a confusing experience.
- **Recommendation:** Change the comment "# Local dev" to point to `deno task dev` rather than `deno task start`.
