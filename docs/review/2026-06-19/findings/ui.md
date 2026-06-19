# UI findings

> Context note: The running app uses a named-theme system (`Raute` = light blue,
> `Sternenhimmel` = dark navy/gold with a starfield). `design-system/spec.md`
> still describes the older `html.dark` + warm-oak `#1a1410` palette. That
> spec-vs-implementation drift is the docs agent's call; this review judges what
> actually renders. The two shipped themes each render coherently, so the dark
> palette is NOT flagged as "wrong" — it is a deliberate redesign.

## Home / dashboard

### [MAJOR] Dashboard is three lines of static text with no content or actions
- **Where:** `/` (route `routes/index.tsx`); screenshots `home-mobile-dark-empty.png`, `home-desktop-dark-empty.png`
- **Relation:** spec-violation (design-system: "Every user-facing interaction MUST be reachable within two taps from the home screen"; "Primary actions MUST be the most visually prominent element")
- **Evidence:** The landing page renders only `servus` / `Haushaltsmanagement` / `Willkommen bei servus.` in the top-left, followed by a full screen of empty background. There is no CTA, no navigation cards, no move-progress summary, no item/box counts — nothing actionable. On desktop the emptiness is extreme (one short paragraph over ~1000px of void). A first-time user (or a helper during the move) lands here and has no idea what to do next; the only way forward is the nav bar, and there is zero "primary action" prominence as the spec requires.
- **Recommendation:** Make `/` a real dashboard: large primary CTAs (Gegenstand erfassen / Schnellerfassung, Kartons), quick counts (items, boxes packed/delivered), and recent activity. Even a minimal set of two big action cards would satisfy the "two taps + prominent primary action" contract. The design brief's F1 "packing progress widget" is the natural home for this.

## Quick-add & native photo capture

### [MAJOR] Mobile theme FAB overlaps the page's top-right action ("Zurück")
- **Where:** `/items/quick-add` on mobile (also any page whose header has a top-right control); screenshot `quickadd-mobile-light.png`
- **Relation:** quality (design-system: mobile FAB is "fixed top-right" but spec does not reserve header space for it)
- **Evidence:** Computed rects confirm overlap: the fixed theme toggle FAB occupies the top-right corner (≈top 10–46, right edge) and sits directly on top of the "Zurück" button (right edge ≈484). The moon icon visibly covers the right half of the "Zurück" text. `overlap: true` from `getBoundingClientRect` intersection test. Tapping in that corner is ambiguous — you may hit the theme toggle instead of going back.
- **Recommendation:** Either reserve right padding in page headers for the FAB, move the FAB to not collide with header actions, or right-align page header actions with a margin that clears the FAB zone.

### [MAJOR] Bottom-nav shows two active items at once on /items/quick-add
- **Where:** bottom nav on `/items/quick-add`; screenshot `quickadd-mobile-light.png`
- **Relation:** spec-violation (design-system "Active navigation indicator": active determined by prefix matching the path against each link's href)
- **Evidence:** On `/items/quick-add`, BOTH "Gegenstände" (`aria-current="true"`, gold top border, opacity 1) and "Schnellerfassung" (`aria-current="page"`, gold border, opacity 1) render as active simultaneously. Because the path `/items/quick-add` prefix-matches the Items link href `/items`, the Items entry lights up spuriously. The user sees two highlighted tabs and cannot tell which section they are in.
- **Recommendation:** Make the active match exact for quick-add (or longest-prefix-wins): when on `/items/quick-add`, only the quick-add entry should be active, not the Items entry.

### [MINOR] Quick-add capture buttons touch each other and the viewport edge
- **Where:** `/items/quick-add` mobile; screenshot `quickadd-mobile-light.png`
- **Relation:** quality (design brief 1.6 lists `.photo-capture`/`.capture-btn` as classes needing definition)
- **Evidence:** The blue "Foto hinzufügen" button and white "Aus Galerie" button sit flush against each other with no gap, and the blue button's label begins at the very left viewport edge (no left padding). The two buttons also have mismatched heights and inconsistent styling (filled blue vs. bordered white).
- **Recommendation:** Add a gap between the two capture actions and align them to the page's horizontal padding; give them consistent height/styling.

### [MINOR] Quick-add gives no hint of what it does
- **Where:** `/items/quick-add`; screenshot `quickadd-mobile-light.png`
- **Relation:** quality (clarity)
- **Evidence:** The page shows only a title, a Zurück link, and two photo buttons over a screen of empty space. A first-time helper has no idea that this captures a photo now and fills in details later (the pending-photo flow). No explanatory line, no preview area placeholder.
- **Recommendation:** Add one short German hint under the title explaining that a photo is captured now and details added later, plus an empty-state illustration in the large blank area.

> Note: Could not exercise an actual photo upload — `NativePhotoCapture` presigns
> and PUTs to R2, and the local `.env` holds real R2 credentials. Per the hard
> rules I did not upload to real storage, so the populated pending list and a
> captured-photo item detail were not visually verified. Capture UI and the
> empty pending list were reviewed statically.

## Pending-photo list

### [MINOR] Pending-items empty state is bare text, no lion illustration
- **Where:** `/items/pending`; screenshot `pending-mobile-light-empty.png`
- **Relation:** quality (design-system "Empty states MUST display the lion illustration and a short German prompt")
- **Evidence:** The empty pending list shows only the centred grey line "Keine ausstehenden Gegenstände." with no lion SVG and a large blank area below. The items/boxes empty states are required to show the lion; the pending list (a sibling list view) is inconsistent with that pattern.
- **Recommendation:** Use the same lion empty-state component here for consistency.

## Items list & browse/filter

### [MINOR] Search field is cramped on mobile (≈91px wide), placeholder barely fits
- **Where:** `/items` filter row, mobile; screenshot `items-mobile-light.png`
- **Relation:** quality
- **Evidence:** The search `<input>` renders at ~91px wide because it shares one row with the search button and two full-width-ish dropdowns ("Alle Kategorie", "Alle Raum"). At that width the placeholder "Suchen …" only just fits and a typed query shows only a few characters. The row is visibly tight.
- **Recommendation:** On mobile, give the search input its own row (full width) above the two dropdowns, or let the dropdowns wrap to a second line so the search field can breathe.

### [MINOR] Qty +/- buttons are only ~29px wide on mobile
- **Where:** `/items` item rows, mobile
- **Relation:** quality (design-system mobile touch target — spec mandates ≥44px height, met; width is not specified)
- **Evidence:** Computed sizes: the − and + buttons are 44px tall (meets the height rule) but only 29px wide. 29px is below a comfortable thumb target horizontally; mis-taps on the wrong button are likely during fast packing.
- **Recommendation:** Widen the qty buttons toward ~44px square, or increase horizontal padding.

### [NIT] Item name is the only link to detail but has no visual affordance
- **Where:** `/items` rows (desktop & mobile)
- **Relation:** quality (clarity)
- **Evidence:** The item name links to `/items/<id>` but renders as plain bold text with no underline or color change, so it does not look tappable. A first-time user may not realize the row opens a detail view.
- **Recommendation:** Add a subtle affordance (hover/focus underline, chevron, or make the whole row a clickable target).

Note: items list otherwise matches the spec well — prominent blue "Gegenstand hinzufügen" primary CTA, two-line mobile card with ellipsis truncation working on the long name, single-line desktop rows, right-aligned qty controls, no horizontal overflow, gold Raute active-nav indicator on desktop.

## Item detail

### [MINOR] "In Karton" box link is an unstyled raw hyperlink (default browser blue/purple)
- **Where:** `/items/[id]` detail card, "IN KARTON" row; screenshot `item-detail-book-desktop.png`
- **Relation:** spec-violation (design-system "CSS design tokens": no hard-coded color outside tokens; this link uses the browser default, ignoring `--servus-primary`)
- **Evidence:** The box reference link computes to `color: rgb(0,0,238)` (browser default `#0000EE`), underlined, with NO class applied. Against the parchment Bavarian palette it reads as an unstyled, half-finished hyperlink and will show purple once visited.
- **Recommendation:** Style the box link with the app link/token color (`--servus-primary`) like other in-app links; add the appropriate link class.

### [MINOR] Uneven vertical rhythm in the detail card when a Gruppen chip is present
- **Where:** `/items/[id]` detail card (container item with a group); screenshot `item-detail-container-desktop.png`
- **Relation:** quality (spacing/rhythm)
- **Evidence:** Measured row tops: Kategorie→Raum +34px, Raum→Gruppen +34px, Gruppen→Erstellt +53px, Erstellt→Zuletzt +34px. The gap after the Gruppen (chip) row is ~19px larger than every other row gap, breaking the even rhythm of the card.
- **Recommendation:** Normalize the chip row's box-model so the gap matches the other rows (the chip's padding/margin is adding extra height).

### [MINOR] Container "Inhalt" section is a dead end with no way to add contents
- **Where:** `/items/[id]` for a container-capable item; screenshot `item-detail-container-desktop.png`
- **Relation:** quality (clarity; relates to containment spec)
- **Evidence:** A container item shows an "Inhalt" heading and "Dieser Behälter ist leer." but offers no action to put items into the container. Items are only added to a container via the *other* item's edit form (Behälter field), which is not discoverable from here. A user looking at an empty container has no next step.
- **Recommendation:** Add an "Gegenstand hinzufügen" / "Gegenstand in Behälter legen" affordance in the empty Inhalt section, or a short hint explaining how items get placed inside.

## Item new / edit

### [MAJOR] Schema-field group uses the browser-default `groove` 3D border — looks unstyled
- **Where:** `/items/new` and `/items/[id]/edit`, the category schema fields block (Autor/ISBN/Jahr/…); screenshot `item-edit-mobile-light.png`
- **Relation:** quality (design-system flat-card aesthetic; spec forbids unstyled defaults)
- **Evidence:** The schema fields are wrapped in a `<fieldset>` whose computed border is `1.6px groove` — the inset/outset 3D border the browser draws by default. Against the app's flat parchment cards this reads as a raw, half-finished "form within a form." It is the most visually out-of-place element on the create/edit screen.
- **Recommendation:** Give the fieldset the app's surface/border tokens (`--servus-border`, flat 1px) and a subtle radius, or drop the border entirely and group the schema fields with a heading/spacing.

### [MINOR] "Abbrechen" is an unstyled raw hyperlink next to the styled "Speichern" button
- **Where:** `/items/new` and `/items/[id]/edit` action row; screenshot `item-edit-mobile-light.png`
- **Relation:** spec-violation (design-system tokens / button variants — should be a `.btn-secondary`, not a default link)
- **Evidence:** "Abbrechen" computes to `color: rgb(0,0,238)` (browser default blue), underlined, no class, sitting immediately next to the solid blue "Speichern" button. The two primary form actions have wildly mismatched styling; Abbrechen looks like a leftover plain link. (The design brief 1.8 already fixed the analogous detail-page "Zurück" to `.btn-secondary`; this one was missed.)
- **Recommendation:** Make "Abbrechen" a `.btn-secondary` to pair with "Speichern".

Note: the form structure itself is good — schema-driven fields appear correctly when a category with a custom type is selected (Buch → Autor/ISBN/Verlag/…), the box/room/group selectors prefill on edit, and the date field works.

## Boxes list & box detail

### [MAJOR] Unstyled raw hyperlinks throughout the app (browser default blue/purple)
- **Where:** Cross-cutting. Confirmed on: box list `/boxes` (B-001/B-002 title links), item detail "IN KARTON" box link, box detail "Zurück", item edit "Abbrechen", box-detail item links. Screenshots `boxes-desktop-light.png`, `box-detail-desktop.png`, `item-detail-book-desktop.png`, `item-edit-mobile-light.png`
- **Relation:** spec-violation (design-system "CSS design tokens": no hard-coded/default colors outside tokens; "button variants" for actions)
- **Evidence:** All of these `<a>` elements compute to `color: rgb(0,0,238)` (browser default `#0000EE`) with no class — they ignore `--servus-primary` and will turn purple once visited. The most impactful instance is the box list, where the box title links are the primary navigation into each box yet look like raw 1996-style hyperlinks against the parchment palette.
- **Recommendation:** Apply the app link token color to in-content links and convert action links ("Zurück", "Abbrechen") to `.btn-secondary`. A single shared link style would fix the whole class at once (cross-cutting root cause).

### [MAJOR] Photo-capture buttons are unstyled / edge-to-edge across pages
- **Where:** box detail, item new/edit, quick-add — every place the photo-capture island appears; screenshots `box-detail-desktop.png`, `item-edit-mobile-light.png`, `quickadd-mobile-light.png`
- **Relation:** quality (design brief 1.6 explicitly lists `.photo-capture`/`.capture-btn` as classes needing CSS definitions; design brief calls these "mobile-critical")
- **Evidence:** The "Foto hinzufügen" (solid blue) and "Aus Galerie" (white) buttons render with no gap between them, the blue button's label sits flush at the left content edge with no padding, and on desktop the blue button stretches ~70% of the page width while "Aus Galerie" is a small box — a visibly unbalanced, half-finished control. Consistent on box detail, item edit, and quick-add.
- **Recommendation:** Define/repair the photo-capture button styles: equal sizing, a gap between the two actions, normal button padding, and a sensible max width on desktop.

Note: status badges are correct — gray LEER, blue GEPACKT, green GELIEFERT, matching the spec. The B-001 code pill, the gold Raute divider on box detail, the auto-pack-on-add behavior, and the delivered→unpack ("Einlagern" / "Alle entpacken nach …") flow all render well. The "Umzugskartons" (nav) vs "Kartons" (page title) wording differs but that is copy via `t()`.

## Box edit

Clean and correct — code in the title, "Beschriftung" and "Zielraum" prefill, Speichern + Abbrechen. The only defect is the unstyled "Abbrechen" link, already captured in the cross-cutting unstyled-hyperlinks finding above. No box-edit-specific defects.

## Box label & item label (print)

Both label pages render correctly as standalone print pages (no app chrome): box label shows the room icon, room name, code, description, item-count badge, and a QR code; container item label shows the item name (wraps) and a QR code. Print/screen CSS is handled (`@media print` hides the toolbar). These pass.

### [MINOR] "1 Gegenstände" — wrong plural for count of 1
- **Where:** box label; screenshot `box-label-desktop.png`
- **Relation:** quality (copy correctness, not "untranslated")
- **Evidence:** A box with one item shows "1 Gegenstände" (plural) instead of "1 Gegenstand" (singular). Same likely applies to other count strings.
- **Recommendation:** Add singular/plural handling in the `t()` count strings.

### [NOTE] Item label is intentionally container-only (non-container item label 404s by design)
- Navigating `/items/<non-container-id>/label` returns 404 because the route requires `category.canContain`. The item detail correctly only shows the "Etikett drucken" button for container items, so this is by design — not a defect. (The 404 page it lands on, however, is — see below.)

## Error states

### [MAJOR] 404 / not-found pages are completely unstyled and in English
- **Where:** any not-found route, e.g. `/this-route-does-not-exist` and `/items/<id>/label` for a non-container item; screenshots `404-generic-desktop.png`, `item-label-desktop.png`
- **Relation:** spec-gap (no spec covers the error page; the design-system empty-state/lion contract implies styled fallbacks)
- **Evidence:** The generic 404 is a bare black screen with the English text "Not Found" in monospace in the top-left corner — no German, no theme, no navigation, no lion, no way back. The label route's own 404 is similarly a single line of unstyled white text on black ("Seite nicht gefunden."). There is no `routes/_404.tsx`. During the move, a helper or the wife hitting a stale link or mistyping a URL would see what looks like a crashed app.
- **Recommendation:** Add a styled `routes/_404.tsx` (and ideally `_500.tsx`) using the app shell, German copy via `t()`, the lion illustration, and a "Zur Startseite" link. Also wrap the label route's 404 in the same styled page instead of returning bare text.

> Tooling caveat: the chrome-devtools window reports `innerWidth = 500` even
> after `resize_page(390, 844)`, so `getBoundingClientRect`-based overflow checks
> ran at ~500px and understate mobile crowding. Screenshots (scaled to 390) are
> the reliable signal for mobile layout judgments below.

## Categories list

### [MAJOR] Category editor rows are visually broken/cluttered on mobile
- **Where:** `/categories` on mobile; screenshot `categories-mobile-light.png`
- **Relation:** quality (spacing/alignment; the "category editor usability" item is a known deferred area in user memory)
- **Evidence:** Each category row is a scattered grid with no clear alignment: the name sits far left, the Typ dropdown floats at the top, a lone checkbox sits centred, the "Kann Gegenstände enthalten" label wraps to 2–3 lines on the right, the red "Löschen" button runs to / past the right edge, and "Speichern" sits below. There is no visual grouping of the control with its label, and the whole row reads as broken rather than as a coherent editable item. The add-form above has the same disconnected checkbox/label problem. "Typen verwalten" in the header and the "Löschen" buttons are clipped at the right edge (the moon FAB also overlaps "Typen verwalten").
- **Recommendation:** Redesign category rows as a clean vertical stack on mobile (name as a heading; Typ select full-width; a single checkbox+label control on one line; Speichern/Löschen as a right-aligned button pair, Löschen de-emphasised). Ensure the header and row buttons stay within the viewport.

### [MINOR] Destructive "Löschen" is the most prominent element in category rows
- **Where:** `/categories` rows; screenshot `categories-mobile-light.png`
- **Relation:** quality (design-system: primary actions should be most prominent; delete is not primary)
- **Evidence:** The solid red "Löschen" button is the largest, highest-contrast element in each category row, dominating the actual content (the category name and its settings). Same pattern noted on the Rooms page.
- **Recommendation:** Make Löschen a smaller/secondary/danger-text control; keep the category name and Speichern as the prominent elements.

## Schema list / new / edit

### [MINOR] Schema list names are unstyled raw hyperlinks; header button clipped + FAB overlap
- **Where:** `/categories/schemas` on mobile; screenshot `schemas-list-mobile.png`
- **Relation:** spec-violation (design-system tokens — default link color) + quality (header overflow)
- **Evidence:** Every schema name ("Allgemein", "Buch", …) is a default blue/purple underlined `<a>` (same unstyled-link root cause as elsewhere). The "Neuen Typ erstellen" button is clipped at the right viewport edge and the moon FAB overlaps it.
- **Recommendation:** Apply the shared link style (token color) and keep the header button + FAB clear of each other / the edge (same fixes as the cross-cutting link finding and the FAB-overlap finding).

## Groups list & detail

Both pages are clean and clear: groups list has an add form and a group card with item count; group detail has a rename form, an "Gegenstände" reorder list (drag-to-sort with up/down arrow fallback — a nice accessible touch), "Reihenfolge speichern", Zurück, and a red "Gruppe löschen". The only defects are shared, already-captured ones:
- Group name links and item links are unstyled raw hyperlinks (cross-cutting link finding).
- "1 Gegenstände" plural-for-one bug (same as box label; tracked there).
- Note an internal inconsistency worth flagging:

### [NIT] "Zurück" styling is inconsistent across pages
- **Where:** group detail "Zurück" is a styled `.btn-secondary`; box detail / item edit / box edit / pending / quick-add "Zurück"/"Abbrechen" are unstyled links
- **Relation:** quality (consistency)
- **Evidence:** The same back/cancel action is a proper secondary button on some pages and a raw default-blue link on others. Inconsistent treatment of an identical action.
- **Recommendation:** Standardize all "Zurück"/"Abbrechen" actions to `.btn-secondary` (resolves part of the cross-cutting link finding too).

## Schema list / new / edit (cont.)

Note: the schema **new/edit form is the cleanest editor in the app** — clear "Name des Typs", a "Felder" section with well-spaced field blocks (Bezeichnung / Feldtyp / Auswahlmöglichkeiten), full-width inputs, good rhythm. The field-block `<fieldset>` does use the browser-default `groove` border (same root cause as the item-form finding above), but here it is subtle. Schema field-driven rendering on the item form was already verified to work.

## Rooms

### [MINOR] Room rows: destructive "Löschen" dominates; name is an unstyled link; cards mostly empty
- **Where:** `/rooms`; screenshots `rooms-mobile.png`, `rooms-desktop-light.png`
- **Relation:** quality (design-system prominence + tokens)
- **Evidence:** Each room is a large white card whose dominant element is a big red "Löschen" button; the room name is a small unstyled purple/blue link beside it, and ~60% of each card (especially on desktop) is empty space. The destructive action is the most prominent thing per row, and the name (the actual content/primary tap target) is the least.
- **Recommendation:** Make the room name the prominent element (and a proper styled link/heading), de-emphasise Löschen (secondary/danger-text, right-aligned), and tighten the card so it is not mostly empty. Same row-design issue as the categories editor — a shared "editable list row" component would fix both.

## Admin (index / invites / export-import / delete)

The admin area is the most polished part of the app. Export/import/delete/invites are grouped in tinted cards; the "Alle Daten löschen" section has a red-bordered danger card; creating an invite shows a one-time warning, the link, a QR code, expiry dates, and a "Widerrufen" button; the delete-confirm page shows a red warning banner, an affected-count ("Davon betroffen: 33 Einträge."), and explicit red-confirm + styled Abbrechen buttons. These pass.

### [MINOR] Import file input is the browser default and shows English ("Choose file" / "No file chosen")
- **Where:** `/admin` import section; screenshot `admin-index-desktop.png`
- **Relation:** quality (i18n/styling — native file input)
- **Evidence:** The NDJSON import uses a bare `<input type="file">` rendering the OS/browser default control with English labels "Choose file" / "No file chosen", inside an otherwise fully German, styled page. It looks unstyled and untranslated.
- **Recommendation:** Wrap the file input with a styled label/button (German) and hide the native control, or at least style it to match the form.

## Login

Clean and correct in both themes — centered card, "servus" wordmark, Benutzername + Passwort, full-width primary CTA (Bavarian blue in light/Raute, gold-accent in dark/Sternenhimmel, consistent with each theme). Screenshots `login-mobile.png` (dark), `login-desktop-light.png`. No defects.

## Invite redeem

Clean centered page (no app chrome): "Einladung" heading, an instruction line, and a full-width blue "Einladung annehmen" CTA in a card. Screenshot `invite-redeem-desktop.png`. No layout defects.

### [NIT] Invite-accept page gives no context about what access is granted
- **Where:** `/invite/<code>`; screenshot `invite-redeem-desktop.png`
- **Relation:** quality (clarity) — flow specifics are the UX agent's call
- **Evidence:** A first-time helper sees only "Klicke auf den Button, um deinen Zugang zu aktivieren" with no indication of who invited them, what the app is, or whether they will need to set a password. (Did not click "annehmen" to avoid mutating the session.)
- **Recommendation:** Add a one-line context ("Du wurdest zu servus eingeladen …") and, if applicable, clarify the next step (set credentials).

## "Mehr" page

The Mehr page meets the spec: it lists Kategorien, Räume, Gruppen, Verwaltung as labeled cards, plus a theme control and a logout (POST) form; "Mehr" shows the active bottom-nav indicator. Screenshot `mehr-mobile-light.png`.

### [MINOR] Theme control in the Mehr list has no visible label (lone moon icon)
- **Where:** `/mehr`, the Design/theme card; screenshot `mehr-mobile-light.png`
- **Relation:** quality (clarity; design-system says the Mehr page provides "access to the theme (Design) control")
- **Evidence:** Every card in the Mehr list has icon + German label except the theme card, which renders only a centered "🌙" with no text. (It does carry `aria-label="Design umschalten"`, so screen readers are fine — the gap is the missing *visible* label.) A sighted first-time user cannot tell what the lone moon card does, and it looks unfinished next to the labeled cards.
- **Recommendation:** Add a visible label (e.g. "Design" / "Erscheinungsbild") next to the icon to match the other cards.

## Bottom nav (mobile)

Mostly correct and spec-compliant: 4 entries (Gegenstände, Umzugskartons, Schnellerfassung, Mehr); the quick-add item has the gold accent pill; active item gets the gold top border + full opacity (others at 0.75); 64px-tall tap targets; bottom nav shows < 768px and is replaced by the top nav ≥ 768px (verified at 1280px: bottom hidden, top shown). The one real defect is the **double-active highlight on `/items/quick-add`**, already recorded as MAJOR under "Quick-add & native photo capture".

## Global theme switch (Raute / Sternenhimmel)

The two-theme system works well: toggling swaps the `<html>` class instantly without reload (`theme-raute` ↔ `theme-sternenhimmel`), the choice persists in `localStorage` under `servus-theme`, and there is no flash of the wrong theme on navigation (verified: set dark, navigated to `/items`, stayed dark). Light/Raute = parchment + Bavarian blue + gold Raute active indicator; dark/Sternenhimmel = navy + gold + starfield + gold underline active indicator. Both render coherently with readable contrast (no Lighthouse contrast failures in dark mode). Screenshots `items-desktop-dark.png` (dark), `items-desktop-light.png` (light).

### [MINOR] Filter dropdowns have no associated label (a11y)
- **Where:** `/items` filter `<select name="cat">` and `<select name="room">` (both themes); Lighthouse a11y audit (score 94, fail: `select-name`)
- **Relation:** spec-gap (a11y; no spec mandates it but it is a real defect)
- **Evidence:** Lighthouse "Select elements do not have associated label elements" for the category and room filters. They rely on a placeholder first option ("Alle Kategorie"/"Alle Raum") for sighted users but expose no programmatic name to assistive tech.
- **Recommendation:** Add a visually-hidden `<label>` (or `aria-label`) for each filter select.

> Spec drift reminder (docs agent's call, not flagged here): `design-system/spec.md`
> still documents `html.dark` + warm-oak `#1a1410` dark tokens and a sun/moon
> toggle; the implementation shipped two named themes (Raute/Sternenhimmel) with
> a starfield dark theme and a single "Design umschalten" cycle button. Behaviour
> is coherent; the spec text is stale.

## Summary

**Severity counts:** BLOCKER 0 · MAJOR 8 · MINOR 16 · NIT 3.

No blockers: every core move-day task (create/edit items, pack/label boxes,
print labels, invite a helper, export/import) is completable, and the
label/print pages, status badges, and admin flows are genuinely well built. The
problems are concentrated in **polish and consistency**, and several share a
single root cause.

**Top 3 to fix (highest leverage):**

1. **Unstyled raw hyperlinks everywhere** (MAJOR). Box-list titles, schema-list
   names, item/box/group links, and the "Zurück"/"Abbrechen" actions render as
   browser-default `#0000EE` underlined links (purple once visited), ignoring the
   design tokens. The single most pervasive "looks half-finished" defect — one
   shared CSS fix (style `<a>` + convert back/cancel to `.btn-secondary`).
2. **Editable list rows + photo-capture controls broken on mobile** (MAJOR). The
   categories editor is a scattered, overflowing grid; rooms rows are dominated by
   a giant red "Löschen"; the photo-capture buttons (quick-add, item edit, box
   detail — the mobile-critical capture flow) sit edge-to-edge with no gap or
   padding. A shared "editable row" component plus the missing
   `.photo-capture`/`.capture-btn` styles (design brief 1.6) fix a whole cluster.
3. **Dead-end / unfinished screens** (MAJOR). The home dashboard is three lines of
   static text with no actions or counts (violates the "two taps + prominent
   primary action" contract), and the 404 page is a bare black screen reading
   "Not Found" in English. Both are the first/last things a lost helper sees —
   give home a real action/summary dashboard and add a styled German
   `routes/_404.tsx` with the lion and a way home.

Also worth batching: the mobile theme **FAB overlaps top-right header actions**
(quick-add "Zurück"), the **bottom nav highlights two tabs on `/items/quick-add`**
(prefix-match bug), the **schema/item fieldsets use the browser `groove` border**,
and small a11y/label gaps (filter selects unlabeled, Mehr theme card unlabeled).

## Observations (taste / ideas, not defects)

- The Bavarian theming is genuinely charming: the gold Raute (diamond) active-nav
  indicator in light mode, the Sternenhimmel starfield + gold in dark mode, the
  box-code pill, and the gold Raute divider on box detail all reinforce identity.
  Keep these.
- The schema new/edit form and the admin/delete-confirm flows are the strongest
  screens in the app and make good visual templates for fixing the weaker editor
  screens (categories/rooms).
- The "Auswahlmöglichkeiten (eine pro Zeile)" textarea on the schema form is
  always shown even when Feldtyp = Text — matches the deferred "category editor
  usability" backlog item in user memory; left as an observation per that
  deferral.
- "Umzugskartons" (nav) vs "Kartons" (page title) and singular/plural count
  strings ("1 Gegenstände") are copy questions for the `t()` locale — noted, not
  central.
