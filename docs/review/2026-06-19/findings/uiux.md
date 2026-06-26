# UI/UX consolidated report

Stage 3 (final) synthesis of the 2026-06-19 verification review. Combines the
independent UI pass (`findings/ui.md`, visual/clarity) and UX pass
(`findings/ux.md`, flow/friction), dedupes, reconciles, finds cross-cutting root
causes, and re-prioritizes against the move-day rubric (PLAN.md §6).

> **Reading the severities below:** each entry carries a _consolidated_ severity
> set with the full picture. Where I changed a source severity I say so and why.
> Source counts before merge: UI = 0 BLOCKER / 8 MAJOR / 16 MINOR / 3 NIT; UX =
> 1 BLOCKER / 13 MAJOR / 17 MINOR / 1 NIT (3 of UX's MAJORs are the "competing
> paths" restatements of other MAJORs and are deduped here).

## Grounding notes carried into synthesis

- **Theme system:** the app shipped a named-theme system (`Raute` light /
  `Sternenhimmel` dark). `design-system/spec.md` still describes the old
  `html.dark` + warm-oak `#1a1410` palette and a sun/moon toggle. Both shipped
  themes render coherently, so the redesign is **not** a defect — it is spec
  drift the **docs agent** owns. Findings below judge what renders.
- **Typed category schemas WORK end-to-end** (UX issued an explicit CORRECTION;
  UI independently confirmed Buch → Autor/ISBN fields render). The interim
  "schema type ignored" suspicion is **dropped** and is not a finding.
- **Pending/photo flow:** the UI agent structurally could not exercise photo
  upload (real R2 creds in local `.env`), so the broken photo→pending→confirm
  loop and the triage-list defects are **UX-only discoveries** and are weighted
  as first-class — they are invisible to a static visual pass, not
  low-confidence.
- **Spec check on the pending loop:** `inventory/spec.md` defines a
  `/items/pending` triage list (row MUST show thumbnail, display name, box,
  quantity — lines 282-285) and says editing MUST NOT transition status (line
  402), but defines **no action to leave `pending`**. So "no confirm action" is
  a real **spec-gap in the spec itself**, and the "(unbenannt) after naming" +
  "missing thumbnail/quantity" are real **spec-violations**.

---

## Step 1 — Catalog (every finding, both sources, with back-refs)

Raw inventory before merge. `UI-n` / `UX-n` are stable handles used by later
steps. Severities shown are the **source** severities.

### From findings/ui.md

- **UI-1** [MAJOR] Dashboard is three lines of static text, no content/actions —
  `/` (`routes/index.tsx`)
- **UI-2** [MAJOR] Mobile theme FAB overlaps page top-right action ("Zurück") —
  `/items/quick-add` + any header with top-right control
- **UI-3** [MAJOR] Bottom-nav shows two active items on `/items/quick-add`
  (prefix-match bug)
- **UI-4** [MINOR] Quick-add capture buttons touch each other and viewport edge
  — `/items/quick-add`
- **UI-5** [MINOR] Quick-add gives no hint of what it does — `/items/quick-add`
- **UI-6** [MINOR] Pending-items empty state is bare text, no lion illustration
  — `/items/pending`
- **UI-7** [MINOR] Search field cramped on mobile (~91px) — `/items` filter row
- **UI-8** [MINOR] Qty +/- buttons only ~29px wide on mobile — `/items` rows
- **UI-9** [NIT] Item name link has no visual affordance — `/items` rows
- **UI-10** [MINOR] "In Karton" box link is an unstyled raw hyperlink —
  `/items/[id]`
- **UI-11** [MINOR] Uneven vertical rhythm in detail card with a Gruppen chip —
  `/items/[id]`
- **UI-12** [MINOR] Container "Inhalt" is a dead end, no way to add contents —
  `/items/[id]` (container)
- **UI-13** [MAJOR] Schema-field group uses browser-default `groove` 3D border —
  `/items/new`, `/items/[id]/edit`
- **UI-14** [MINOR] "Abbrechen" is an unstyled raw hyperlink next to styled
  "Speichern" — item new/edit
- **UI-15** [MAJOR] Unstyled raw hyperlinks throughout the app (cross-cutting) —
  boxes, item/box/group links, Zurück/Abbrechen
- **UI-16** [MAJOR] Photo-capture buttons unstyled / edge-to-edge across pages —
  box detail, item new/edit, quick-add
- **UI-17** [MINOR] "1 Gegenstände" wrong plural for count of 1 — box label (+
  elsewhere)
- **UI-18** [MAJOR] 404 / not-found pages completely unstyled and in English —
  any not-found route
- **UI-19** [MAJOR] Category editor rows visually broken/cluttered on mobile —
  `/categories`
- **UI-20** [MINOR] Destructive "Löschen" is most prominent element in category
  rows — `/categories` (+ rooms)
- **UI-21** [MINOR] Schema list names unstyled links; header button clipped +
  FAB overlap — `/categories/schemas`
- **UI-22** [NIT] "Zurück" styling inconsistent across pages (some
  .btn-secondary, some raw)
- **UI-23** [MINOR] Room rows: Löschen dominates; name unstyled link; cards
  mostly empty — `/rooms`
- **UI-24** [MINOR] Import file input is browser default + English ("Choose
  file") — `/admin`
- **UI-25** [NIT] Invite-accept page gives no context about access granted —
  `/invite/<code>`
- **UI-26** [MINOR] Theme control in Mehr list has no visible label (lone moon)
  — `/mehr`
- **UI-27** [MINOR] Filter dropdowns have no associated label (a11y) — `/items`
  selects

### From findings/ux.md

- **UX-1** [MINOR] Login clears username after failed attempt — `/login`
- **UX-2** [NIT] Home page gives no orientation or primary action — `/`
  (post-login)
- **UX-3** [MAJOR] No "copy link" / "copy code" button on one-time invite banner
  — `/admin`
- **UX-4** [MAJOR] Logged-in user opening an invite link silently burns the
  invite, no feedback — `/invite/[code]`
- **UX-5** [BLOCKER] Invited helper account has full admin access (export +
  DELETE ALL DATA) — `/admin`, `/admin/delete-confirm`
- **UX-6** [MAJOR] Helper lands on blank welcome with no path to "pack a box" —
  `/` post-invite
- **UX-7** [MAJOR] Three overlapping placement controls (Behälter / Raum /
  Karton) — `/items/new`
- **UX-8** [MINOR] (RETRACTED via CORRECTION) "schema type ignored" — DROP, not
  a finding
- **UX-9** [MAJOR] "Schnellerfassung" nav tab is photo-only, no by-hand path —
  `/items/quick-add`
- **UX-10** [MAJOR] Pending triage shows "(unbenannt)" even after item named —
  `/items/pending`
- **UX-11** [MAJOR] No way to confirm / "mark done" a pending item — stays
  Ausstehend forever
- **UX-12** [MINOR] Pending row missing required thumbnail + quantity —
  `/items/pending`
- **UX-13** [MINOR] Empty filter result reuses "Noch keine Gegenstände" (looks
  like all data gone) — `/items`
- **UX-14** [MINOR] No one-tap way to clear active search/filter — `/items`
- **UX-15** [MINOR] Quantity-too-low rejection relies only on native browser
  tooltip — `/items/[id]/edit`
- **UX-16** [MAJOR] No box-side "add existing item" action — `/boxes/[id]`
- **UX-17** [MINOR] Item-count badge has no singular ("1 Gegenstände") — box
  label
- **UX-18** [MAJOR] "Alle entpacken" deletes the entire box with no
  confirmation/warning — `/boxes/[id]` delivered
- **UX-19** [MINOR] One-way "Als geliefert markieren" has no confirmation —
  `/boxes/[id]` packed
- **UX-20** [MINOR] Visiting a deleted/unpacked box URL shows bare "Seite nicht
  gefunden." — `/boxes/[id]` tombstone
- **UX-21** [MAJOR] New-type editor has five fixed field rows, no add/remove —
  `/categories/schemas/new`
- **UX-22** [MINOR] "Auswahlmöglichkeiten" textarea shown for every field type —
  `/categories/schemas/new`
- **UX-23** [MINOR] Category "Löschen" fires with no confirmation —
  `/categories`
- **UX-24** [MINOR] "Gruppe löschen" deletes immediately, no confirmation —
  `/groups/[id]`
- **UX-25** [MINOR] Group item count plural-only ("1 Gegenstände") — `/groups`
- **UX-26** [MINOR] Rooms list shows no item count per room — `/rooms`
- **UX-27** [MINOR] Room "Löschen" fires with no confirmation — `/rooms`
- **UX-28** [MINOR] Import error surfaces raw JS parser message — `/admin`
  import
- **UX-29** [MINOR] Custom schema types may not be in export (restore gap) —
  `/admin/export` (for db/backend to confirm)
- **UX-30** [MAJOR] (competing-paths restatement of UX-9/UI-1/UX-6) Add-item has
  3 entry points, none primary
- **UX-31** [MAJOR] (competing-paths restatement of UX-7) Placement: Behälter vs
  Raum vs Karton
- **UX-32** [MAJOR] (competing-paths restatement of UX-16) Packing: item-side
  only, no box-side add
- **UX-33** [theme] Cross-cutting: destructive config deletes have no
  confirmation (UX-18/19/23/24/27)

---

## Step 2 — Dedupe & merge

Merged groups (`M-n`). Each lists the source handles it absorbs and the single
merged statement. Handles NOT listed here remained standalone and carry forward
unchanged. UX-8 is dropped (retracted). UX-30/31/32 are the competing-paths
restatements and fold into M-2/M-3/M-9 — no new severity.

- **M-1 — Unstyled raw hyperlinks + raw back/cancel actions** ← UI-15, UI-10,
  UI-14, UI-21, UI-22, UI-23(link part), UI-9(affordance). One root cause:
  in-content `<a>` and "Zurück"/"Abbrechen" actions render as browser-default
  `#0000EE` (purple when visited), ignoring `--servus-primary`; back/cancel
  should be `.btn-secondary`. One shared CSS fix.
- **M-2 — Home is a dead landing with no primary action** ← UI-1, UX-2, UX-6. UI
  rated MAJOR; UX rated NIT then itself bumped to MAJOR via UX-6 (helper has no
  path to pack). Merged severity = MAJOR (see Step 4).
- **M-3 — "Schnellerfassung" is photo-only / add-item has no clear primary
  path** ← UX-9, UX-30, UI-5. The most prominent add button serves only the
  photo persona; manual entry is buried; UI's "no hint what it does" is the
  visual face of the same screen.
- **M-4 — Photo→pending→confirm loop is broken (no confirm) + triage list
  wrong** ← UX-11, UX-10, UX-12, UI-6(pending empty state). The pending workflow
  as a system: can't leave `pending`; row shows "(unbenannt)" after naming; row
  missing thumbnail/quantity; empty state lacks lion. UI could not see these (no
  photo upload).
- **M-5 — Photo-capture buttons unstyled / edge-to-edge** ← UI-16, UI-4. Same
  control across quick-add, item new/edit, box detail.
- **M-6 — Browser-default `groove` fieldset border on schema-driven fields** ←
  UI-13. (UI noted the schema-form instance is subtle; the item-form instance is
  the loud one.) Standalone visual.
- **M-7 — 404 / not-found is a bare unstyled English dead end** ← UI-18, UX-20.
  No styled `_404.tsx`; tombstoned-box URLs (and their printed QR labels) land
  here. UX adds the move-day QR-scan path.
- **M-8 — Editable list rows broken/over-prominent-delete on mobile** ← UI-19,
  UI-20, UI-23, UX-21, UX-22. Categories rows + schema-type editor + rooms rows:
  scattered grids, giant red Löschen dominating, rigid 5-row field editor,
  always-shown options textarea. The hand-config surfaces are the roughest area.
- **M-9 — Can only fill a container/box from the _other_ item's edit form** ←
  UX-16, UX-32, UI-12. No box-side "add existing item"; no container-side "add
  contents". Same missing pattern: "add contents from the thing you're looking
  at."
- **M-10 — Placement: three overlapping controls (Behälter / Raum / Karton)** ←
  UX-7, UX-31. One conceptual question, three controls.
- **M-11 — Destructive/irreversible actions lack confirmation** ← UX-33, UX-18,
  UX-19, UX-23, UX-24, UX-27, plus UI-20's "delete is the most prominent
  control" visual counterpart. UX-18 (Alle entpacken silently deletes the box)
  is the sharpest instance.
- **M-12 — Singular/plural count bug ("1 Gegenstände")** ← UI-17, UX-17, UX-25.
  Shared `t()` count helper; box label + groups + box list/detail.
- **M-13 — Invite redemption hazards** ← UX-5 (BLOCKER: helper has admin), UX-4
  (logged-in user silently burns invite), UX-3 (no copy button), UI-25 (no
  context on accept page). Grouped as the invite-flow theme; UX-5 stays the
  standalone BLOCKER.

### Standalone (carried forward, not merged)

UI-2 (FAB overlaps header action), UI-3 (double-active nav), UI-7 (search
cramped), UI-8 (qty buttons 29px wide), UI-11 (chip-row rhythm), UI-24 (file
input English), UI-26 (Mehr theme card unlabeled), UI-27 (filter selects
unlabeled a11y), UX-1 (login clears username), UX-13 (filter empty-state copy),
UX-14 (no clear-filter), UX-15 (qty native-tooltip only), UX-26 (rooms no item
count), UX-28 (raw import error), UX-29 (schema export gap — deferred to db).

---

## Step 3 — Reconcile UI ↔ UX disagreements

The two passes are complementary, not contradictory. UX explicitly recorded "no
disagreements"; UI's findings it touched, it concurred with. There are **no hard
contradictions** to settle. The reconciliations that matter are
_severity-weighting_ differences on shared issues, plus one factual claim I
verified against the spec rather than the app.

1. **Home landing (M-2): UI=MAJOR vs UX=NIT.** UI rated the empty dashboard
   MAJOR (spec-violation of the two-taps/prominent-primary contract); UX first
   filed it NIT, then itself raised the stakes with UX-6 (a panicked helper has
   no path to pack). **Resolution: MAJOR.** The design-system spec is explicit
   ("Primary actions MUST be the most visually prominent element"; reachable in
   two taps). A spec-violation that also strands the helper persona is MAJOR,
   not NIT. UX's own NIT was the weaker read; UI is correct.

2. **Quick-add (M-3): UI=MINOR ("no hint") vs UX=MAJOR ("photo-only, no manual
   path").** Same screen, two lenses. **Resolution: MAJOR.** A missing manual
   entry behind the single most prominent add button is a workflow defect for
   the wife (the daily by-hand user), not merely a clarity gap. The higher
   severity stands; UI's clarity point becomes part of the same fix.

3. **Pending triage (M-4): UX-only, UI blind.** UI flagged only the pending
   _empty-state_ (no lion, MINOR) because it could not upload a photo. UX found
   the loop is broken. **Resolution: I keep UX's MAJORs and do NOT discount them
   for being single-source** — they are invisible to a static pass by
   construction, and I confirmed against `inventory/spec.md` that the triage row
   contract (thumbnail/name/quantity, lines 282-285) is violated and that no
   confirm transition exists in the spec at all (real spec-gap). Confidence is
   high.

4. **Category/config rows (M-8): both MAJOR, different surfaces.** UI saw the
   `/categories` rows (visual breakage); UX saw `/categories/schemas/new` (rigid
   5-row editor). Not a disagreement — two faces of "hand-config is the roughest
   area." Merged; severity MAJOR stands.

5. **Destructive-delete prominence (M-11 / UI-20): UI=MINOR (visual) +
   UX=MINOR-each but a cross-cutting theme.** Neither alone is MAJOR, but UI's
   "delete is the most prominent control" AND UX's "delete fires with no
   confirm" describe the _same buttons_. **Resolution: the combination is
   MAJOR** for the one irreversible instance (UX-18, Alle entpacken = silent
   permanent box deletion); the config-delete confirmations
   (categories/rooms/groups) stay MINOR individually but ship as one batch.
   Justified in Step 4.

6. **Factual check — typed schemas.** UX's interim "schema type ignored" (UX-8)
   conflicted with UI's "Buch → Autor/ISBN fields render correctly." UX then
   retracted UX-8 via an explicit CORRECTION. **Resolution: both agents now
   agree typed schemas work; UX-8 is dropped.** No app spot-check needed — two
   independent confirmations plus the retraction.

**Did I need to boot the app?** No. There are no live contradictions; every
reconciliation resolves on spec text or on the two agents already agreeing. A
third full pass would add cost without changing a verdict, so per my brief I did
not spot-check. (Boot recipe remains available if the user wants any single
finding re-verified.)

---

## Step 4 — Cross-cutting root causes (the few real problems)

The 13 merged groups + 15 standalones collapse into **six systemic root
causes**. Fixing these six addresses the large majority of surface findings.
This is the main value of the synthesis: most "MAJORs" are not independent —
they share a cause, and the fix is shared too.

### R1 — No shared component library for the recurring UI atoms

The single biggest multiplier. The same primitives are reinvented (or skipped)
per page, so defects propagate:

- **Links/back-cancel** never got a token-driven style → M-1 (raw `#0000EE`
  everywhere, purple-on-visit), UI-22 (Zurück inconsistent), UI-9 (no
  affordance).
- **Photo-capture control** has no shared style → M-5 (edge-to-edge, no gap, no
  padding) on three screens.
- **Editable list row** has no shared component → M-8 (categories rows, schema
  editor, rooms rows all broken differently).
- **Fieldset/grouping** falls back to the browser `groove` → M-6.
- **Count strings** have no pluralization helper → M-12 ("1 Gegenstände").
- **Empty state** lion component isn't reused → M-4 (pending empty), and the
  filter empty-state is the wrong copy → UX-13.
- **Not-found** has no styled shell → M-7. **One library of styled atoms (link,
  btn-secondary, capture-control, list-row, fieldset, count(), empty-state, 404
  shell) closes M-1, M-5, M-6, M-7, M-8, M-12, UI-9, UI-22, UX-13 — roughly a
  third of the entire report.**

### R2 — The "primary action" contract is unmet from the home screen outward

The design-system spec demands a prominent primary action reachable in two taps;
the app's most prominent add button does the wrong thing for the daily user, and
the landing offers nothing:

- M-2 (home = three static lines), M-3 (Schnellerfassung is photo-only), UI-3
  (double-active nav muddies "where am I"), UI-2 (FAB sits on the only top-right
  action). Together: a user — especially a cold-start helper — cannot find the
  obvious next action, and the loudest button serves only one persona. **Root
  fix: make `/` a real dashboard with counts + a two-way primary CTA, and make
  Schnellerfassung a Foto/Manuell hub. That is the spec's contract, not a
  nicety.**

### R3 — Containment/packing is only editable from the "wrong" object

You can only put something into a box or a container by editing the _other_
object, never from the box/container you are looking at:

- M-9 (no box-side "add existing item"; container "Inhalt" is a dead end), M-10
  (placement = three overlapping controls on the item form). The whole "where
  does this live / what's in here" model is item-form-centric, which is
  backwards from the helper's "open the box, drop these in" instinct. **Root
  fix: add a destination-centric "add contents" picker on box AND container
  detail, and collapse the item-form placement to one "Standort" picker.**

### R4 — The photo→pending→confirm workflow has no closure

The app invested most design energy in photo capture, but the triage half is
unfinished:

- M-4 (can't leave `pending`; "(unbenannt)" after naming; missing
  thumbnail/quantity). The spec itself defines a triage list with no exit
  transition — so this is a **spec-gap that needs a spec change first**, then
  the row-rendering spec-violations fixed. This is the wife's stated daily job
  and it currently only accumulates cruft. **Root fix: add a `confirmed`
  transition (spec + UI confirm action) and render the triage row to its own
  spec.**

### R5 — Destructive & irreversible actions are inconsistently guarded

Only "Alle Daten löschen" is gated behind a confirm page. Everything else fires
instantly — and some of those are _permanent_:

- M-11: UX-18 (Alle entpacken silently tombstone-deletes the box, code retired
  forever), UX-19 (one-way deliver), UX-23/24/27 (category/room/group deletes),
  amplified by UI-20 (those deletes are also the most prominent control in their
  rows). The dangerous ones look the most clickable and warn the least. **Root
  fix: one shared confirm pattern on every destructive/irreversible action,
  scaled to blast radius (permanent box deletion gets an explicit "…und Karton
  B-001 löschen?"). De-emphasise the delete buttons visually at the same time.**

### R6 — Authorization is not enforced for the helper role (security)

Standalone and severe: the invite flow creates helpers but does not constrain
them.

- UX-5 (BLOCKER): a freshly-invited helper reaches `/admin`, can export the
  whole inventory and render the live "delete all data" button — a direct
  **spec-violation** of invites ("MUST NOT have admin privileges", "role:
  user"). Adjacent invite hazards: UX-4 (logged-in user silently burns a
  single-use code), UX-3 (no copy button at the one-moment-it-matters), UI-25
  (no context). **Root fix: server-side admin-role gate on every `/admin` route
  and dangerous POST handler; hide "Verwaltung" from non-admins; handle the
  already-authenticated invite case; add a copy button.** This is not a
  flow-polish item — it is the worst-case move-day outcome (a short-lived helper
  wipes or exfiltrates everything) and overrides everything else in priority.

### Themes that are real but lower-order

- **Filter ergonomics** (UX-13 filter-aware empty state, UX-14 reset link) —
  small, repeated friction for the wife.
- **a11y label gaps** (UI-27 filter selects, UI-26 Mehr theme card) — real but
  low blast radius.
- **Copy** (singular/plural M-12 is in R1; "Umzugskartons"/"Kartons", "Alle
  Kategorie" are taste → Observations).

---

## Step 5 — Re-prioritized severities (with the full picture)

Re-rated against move-day impact (PLAN.md §6), now that issues are grouped by
root cause. Each line notes any **change from the source** severity and why.

### BLOCKER

- **R6 / UX-5 — Helper has full admin (export + delete-all).** Unchanged from
  UX. Only BLOCKER in the set. Data loss/exfiltration by a short-lived helper;
  spec-violation. Everything else is subordinate to this.

### MAJOR

- **R4 / M-4 — Pending loop broken + triage list wrong** (UX-11, UX-10 MAJOR
  kept; UX-12 MINOR→**folded into the MAJOR group** as it co-breaks the same
  workflow). The wife's daily job has no closure.
- **R2 / M-2 — Home is a dead landing** (UI MAJOR kept; **UX NIT→MAJOR**, see
  Step 3.1). Spec-violation + cold-start helper.
- **R2 / M-3 — Schnellerfassung photo-only / no primary manual path** (UX MAJOR
  kept; **UI MINOR folded up**).
- **R5 / M-11 — Destructive actions unguarded**, anchored by **UX-18 (MAJOR
  kept)**: Alle entpacken silently + permanently deletes the box. The
  category/room/group confirms (UX-23/24/27) stay MINOR but ride the same fix;
  UI-20 (delete over-prominent) MINOR kept.
- **R3 / M-9 — No destination-side "add contents"** (UX-16 MAJOR kept; UI-12
  MINOR folded). The packing mental model is unsupported.
- **R3 / M-10 — Placement: three overlapping controls** (UX-7 MAJOR kept).
- **R1 / M-1 — Unstyled links + raw back/cancel** (UI MAJOR kept). Most
  pervasive "looks half-finished"; one CSS fix.
- **R1 / M-5 — Photo-capture buttons unstyled/edge-to-edge** (UI MAJOR kept).
- **R1 / M-7 — 404 unstyled English dead end** (UI MAJOR kept; UX-20 MINOR folds
  in — the tombstoned-box QR-scan path raises practical priority).
- **R1 / M-8 — Editable list rows broken on mobile** (UI-19 MAJOR + UX-21 MAJOR
  kept; UI-20/UI-23/UX-22 ride along).
- **R6 / UX-4 — Logged-in user silently burns an invite** (MAJOR kept). Invite
  is single-use and unrecoverable; wasting one on move day is real.
- **R6 / UX-3 — No copy button on the one-time invite banner** (MAJOR kept). The
  one moment copy must not fail relies on fiddly hand-selection.
- **R1 / M-6 — `groove` fieldset border** (UI MAJOR). **Downgrade candidate →
  MINOR:** purely cosmetic, no task impact; I keep UI's MAJOR only because it is
  on the wife's daily form and trivially fixed in the same R1 pass. Flagging the
  borderline; treat as "MAJOR-by-batch, MINOR-in-isolation."

### MINOR (kept as MINOR; batch under their root cause)

- M-12 plural bug (R1) · UI-2 FAB overlap (R2) · UI-3 double-active nav (R2) ·
  UI-7 search cramped · UI-8 qty buttons 29px wide · UI-11 chip rhythm · UI-24
  file input English · UI-26 Mehr theme label · UI-27 filter a11y label · UX-1
  login clears username · UX-13 filter empty-state copy · UX-14 no clear-filter
  · UX-15 qty native-tooltip · UX-19 deliver no confirm (R5) · UX-22 options
  textarea always shown (R1/R4 editor) · UX-23/24/27 config-delete confirms (R5)
  · UX-26 rooms no item count · UX-28 raw import error · UX-29 schema export gap
  (→ database agent).

### NIT

- UI-9 item-link affordance (subsumed by R1) · UI-22 Zurück inconsistency
  (subsumed by R1/M-1) · UI-25 invite-accept context (R6) · UX-2 (now folded
  into MAJOR M-2; the NIT label retired).

**Severity changes from sources, summarized:**

- UX-2 home NIT → **MAJOR** (merged into M-2; spec-violation + helper cold
  start).
- UX-12 pending thumbnail/qty MINOR → **MAJOR group** (co-breaks R4 workflow;
  individually still a MINOR spec-violation, but it ships inside the MAJOR fix).
- M-11 _as a theme_ is effectively MAJOR via UX-18, though most member deletes
  stay MINOR.
- M-6 flagged as borderline MAJOR/MINOR (kept MAJOR for batch convenience).
- No severity was _lowered_ below its source on a standalone basis except the
  M-6 caveat above.

---

## Step 6 — Ranked action list (the deliverable)

Ordered by move-day priority. Each action names its root cause, the source
findings it discharges, and a concrete fix. **Fixing items 1–6 closes the
BLOCKER plus most MAJORs and roughly a third of the whole report via shared
work.**

### 1. [BLOCKER · R6] Enforce the helper role server-side

- **Discharges:** UX-5 (BLOCKER), and reduces blast radius for the invite theme.
- **Why first:** worst-case move-day failure — a short-lived helper can export
  the entire private inventory and render the live delete-all button.
  Spec-violation of invites ("MUST NOT have admin privileges / role: user").
- **Fix:** add a server-side admin-role guard on every `/admin` route _and_ the
  dangerous POST handlers behind them (delete-all, export, import, invite
  create/revoke); 403/redirect non-admins. Hide "Verwaltung" from `/mehr` for
  non-admins. Add a regression test for "helper → /admin → 403". (Auth/authz
  work; backend agent should confirm the gate lives in the handler, not just the
  nav.)

### 2. [MAJOR · R4] Close the photo→pending→confirm loop and fix the triage list

- **Discharges:** M-4 = UX-11, UX-10, UX-12, UI-6.
- **Why:** the wife's stated daily job. Today a hand-corrected scan can never
  leave "Ausstehend", the triage row says "(unbenannt)" after naming, and it
  hides the photo that is the only clue to what the scan is.
- **Fix (spec first):** the inventory spec currently defines no exit from
  `pending` — add a `confirmed` transition requirement, then a "Fertig/
  Bestätigen" action on the triage row and item detail/edit. Render the triage
  row to spec: real name when present, primary-photo thumbnail, quantity, box.
  (Backend/frontend: check whether the list reads a stale projection for the
  name.)

### 3. [MAJOR · R2] Make `/` a real dashboard and Schnellerfassung a two-way hub

- **Discharges:** M-2 (UI-1, UX-2, UX-6) + M-3 (UX-9, UX-30, UI-5); pulls in
  UI-3 and UI-2 as same-area cleanups.
- **Why:** the design-system spec mandates a prominent primary action reachable
  in two taps; today the landing is three static lines and the loudest add
  button is photo-only — a cold start for the helper and a dead end for the
  by-hand wife.
- **Fix:** `/` gets item/box counts + packing progress + a clear primary CTA.
  Schnellerfassung becomes a small hub branching "Foto aufnehmen" and "Manuell
  erfassen" (→ /items/new). While here, fix the bottom-nav longest-prefix match
  so quick-add doesn't double-highlight, and clear the FAB off header actions.

### 4. [MAJOR · R5] One confirmation pattern for destructive/irreversible actions

- **Discharges:** M-11 = UX-18 (the MAJOR: silent permanent box deletion),
  UX-19, UX-23, UX-24, UX-27, and the visual half of UI-20.
- **Why:** only "Alle Daten löschen" is gated; "Alle entpacken" permanently
  tombstone-deletes the box (code retired forever) on a single tap with a label
  that reads like "move contents out."
- **Fix:** shared confirm scaled to blast radius — permanent ones name the
  consequence ("…und Karton B-001 löschen?"); config deletes get a light
  "Wirklich löschen?". De-emphasise the red Löschen buttons
  (secondary/danger-text, right-aligned) in the same pass.

### 5. [MAJOR · R3] Add destination-side packing + collapse placement

- **Discharges:** M-9 (UX-16, UX-32, UI-12) + M-10 (UX-7, UX-31).
- **Why:** the helper's instinct is "open the box, add these items"; today you
  can only pack by editing each _other_ item, and the item form stacks three
  overlapping "where does it live" controls.
- **Fix:** add an "Gegenstand hinzufügen / Vorhandene einpacken" multi-select
  picker on box detail (and a matching "add contents" on container detail).
  Collapse the item-form placement to one searchable "Standort" picker (room /
  box / container), or group the three under one heading with "only one applies"
  copy.

### 6. [MAJOR · R1] Build the shared styled-atom library

- **Discharges (one body of CSS/components):** M-1 (links + back/cancel), M-5
  (photo-capture buttons), M-6 (groove fieldset), M-7 (styled `_404.tsx` with
  lion + "Zur Startseite"; route tombstoned boxes through it), M-8 (editable
  list-row component for categories/rooms + dynamic add/remove field rows in the
  schema editor, UX-21/UX-22), M-12 (pluralizing `count()` helper), UI-9, UI-22,
  and the lion empty-state reuse (UI-6, UX-13).
- **Why:** the single biggest multiplier — the same missing atoms cause ~a third
  of all findings; styling them once removes the pervasive "half-finished" look
  that erodes trust in the wife's daily forms.
- **Fix:** define and apply: `a`/link token color, `.btn-secondary` for all
  Zurück/Abbrechen, `.photo-capture`/`.capture-btn`, a flat fieldset, an
  editable-list-row, a reusable lion empty-state, a `count()` pluralizer, and a
  styled 404 shell.

### 7. [MAJOR · R6] Harden the rest of the invite flow

- **Discharges:** UX-4 (logged-in user silently burns a single-use invite), UX-3
  (no copy button), UI-25 (no context on accept page).
- **Fix:** detect an existing session on `/invite/[code]` and either show "Du
  bist bereits angemeldet" without consuming, or require explicit "als neuer
  Helfer anmelden (du wirst abgemeldet)". Add a one-tap "Link kopieren" (+
  native share) on the invite banner. Add one context line on the accept page.

### 8. [MINOR batch] Filter & list ergonomics for the daily user

- **Discharges:** UX-13 (filter-aware empty state), UX-14 ("Filter
  zurücksetzen"), UX-26 (per-room item count), UI-7 (search field its own mobile
  row), UI-8 (qty buttons ~44px square), UX-15 (in-form qty error, not just
  native bubble).

### 9. [MINOR batch] a11y, copy & admin polish

- **Discharges:** UI-27 (label filter selects), UI-26 (label Mehr theme card),
  UI-11 (chip-row rhythm), UI-24 (styled German file input), UX-28 (friendly
  German import error), UX-1 (re-populate username on failed login).

### 10. [Deferred / other agents]

- **UX-29** custom schema types possibly missing from export → **database
  agent** to confirm the prefix list (restore-completeness risk).
- **design-system spec drift** (old html.dark/warm-oak vs shipped
  Raute/Sternenhimmel) → **docs agent** to update the spec to the shipped
  named-theme system.

---

## Summary

**Consolidated counts (after dedupe; competing-path restatements and the
retracted UX-8 removed):**

- **BLOCKER: 1** — helper has full admin access (UX-5).
- **MAJOR: 13** — M-4, M-2, M-3, M-11(anchor UX-18), M-9, M-10, M-1, M-5, M-7,
  M-8, UX-4, UX-3, M-6(borderline). (13 distinct issues; the source 8 UI + 13 UX
  MAJORs deduped down once the 3 competing-path restatements and the
  cross-source overlaps are merged.)
- **MINOR: ~21** — batched under their root cause (R1, R5, filter ergonomics,
  a11y/copy/admin polish, plus the export gap deferred to the database agent).
- **NIT: ~3** — all subsumed by R1/R6 fixes (UI-9, UI-22, UI-25).

The app is **fundamentally sound for the move**: every core task completes, and
several flows are genuinely strong — containment (place item in a container),
box create/label/deliver, export/import round-trip, quantity steppers, the
custom category-type editor, login/logout, and the admin/delete-confirm page.
The defects cluster exactly where the brief said to look: the **by-hand and
configuration flows**, the **photo→hand-correction handoff**, and **shared
visual polish**. Most of the long finding list traces back to **six root
causes**, four of which (R1, R2, R3, R5) are fixed largely by shared work.

**The three things to fix first:**

1. **Lock down the helper role (BLOCKER, R6).** A short-lived move-day helper
   can today export the whole inventory and hit a live delete-all button.
   Server-side admin gate on every `/admin` route + dangerous POST. Nothing else
   matters if this ships.
2. **Close the pending→confirm loop and fix the triage list (R4).** The wife's
   daily "correct my scans" job has no closure: items can't leave "Ausstehend",
   the triage row mislabels them "(unbenannt)" and hides their photo. Spec
   change
   - confirm action + spec-correct row rendering.
3. **Build the shared styled-atom library (R1).** One body of CSS/components
   (links, .btn-secondary, capture buttons, fieldset, editable row, lion empty
   state, count() pluralizer, styled 404) removes the pervasive "half-finished"
   look and closes roughly a third of the report in a single pass.

(Right behind these: make `/` a real dashboard + Schnellerfassung a Foto/Manuell
hub (R2), and add confirmations to destructive/permanent actions (R5) — both
high-leverage MAJOR clusters.)

## Observations (taste / ideas — not defects, kept out of the ranking)

- **Keep the Bavarian identity.** The gold Raute active-nav indicator (light),
  the Sternenhimmel starfield + gold (dark), the box-code pill, and the gold
  Raute divider on box detail all reinforce a charming, coherent identity.
- **Use the strong screens as templates.** The schema new/edit form and the
  admin/delete-confirm flow are the best-built surfaces; they are the obvious
  visual/interaction model for fixing the weaker editor screens (categories,
  rooms) under R1/R8.
- **Copy polish (via `t()`):** "Umzugskartons" (nav) vs "Kartons" (title); "Alle
  Kategorie" / "Alle Raum" read as singular; "50 neueste Gegenstände (0)" is
  awkward when empty. (The genuine plural _bug_ — "1 Gegenstände" — is a finding
  under R1/M-12, not taste.)
- **Item-detail redundancy:** "Standort: Wohnzimmer → Holzkiste" and "Enthalten
  in: Holzkiste" duplicate each other; one combined line could suffice.
- **Invite expiry presets:** the raw days spinbutton works; quick presets (1 / 7
  / 30 Tage) would be faster on a phone.
- **Drag-to-reorder in groups** over-promises on touch; the ↑/↓ fallback exists
  and is the reliable mobile path, so the feature is fine as-is — just consider
  toning down the drag hint on mobile.
- **Options textarea always shown** on the schema editor (Auswahlmöglichkeiten
  for non-Auswahl types) matches the deferred "category editor usability"
  backlog item in user memory; folded into the R1/M-8 editor fix as UX-22 rather
  than left purely as taste, since it actively confuses.

---

_End of consolidated report. Source passes: `findings/ui.md` (UI,
visual/clarity) and `findings/ux.md` (UX, flow/friction). This file is the
synthesis deliverable; spec-drift fixes belong to the docs agent and the
export-completeness check to the database agent, as noted in Step 6 item 10._
