# UX findings

## Flow: Login & session longevity

### [MINOR] Login form clears the username after a failed attempt
- **Where:** /login (POST error re-render)
- **Relation:** quality (auth spec covers constant-time + non-enumerating error, not field retention)
- **Evidence:** Entered testuser / wrongpass -> error "Benutzername oder Passwort falsch." renders, but both fields are emptied. On a phone the user must retype the username every time they fat-finger the password.
- **Recommendation:** Re-populate the username field on a failed login (never the password). Standard pattern; saves the daily user repeated typing on a touch keyboard.

### [NIT] Home page (/) gives no orientation or primary action
- **Where:** / (post-login landing)
- **Relation:** spec-gap
- **Evidence:** After login the landing is just heading "servus", "Haushaltsmanagement", "Willkommen bei servus." plus the bottom nav. No counts, no "what do I do next", no obvious primary CTA. A panicked helper who lands here has to guess that "Schnellerfassung" or "Umzugskartons" is where they start.
- **Recommendation:** Make / a light dashboard (box/item counts, a clear primary action like "Karton erfassen" / "Gegenstand hinzufügen"). Even one prominent CTA would orient a first-time helper.

### Notes (no defect)
- Wrong-password error is clear and does NOT enumerate (good, matches auth spec). Correct login redirects to / cleanly. Session longevity not directly measurable in this pass; cookie-based, no "stay logged in" toggle shown (acceptable for the helper model where sessions are short-lived).

## Flow: Manage invites (create / list / revoke)

### [MAJOR] No "copy link" / "copy code" button on the one-time invite banner
- **Where:** /admin, Einladungen section after creating an invite
- **Relation:** quality (invites spec requires showing the raw code once + QR; says nothing about a copy affordance)
- **Evidence:** The banner shows "Bitte kopiere diesen Code jetzt — er wird nicht erneut angezeigt." next to a long URL rendered as plain <code> text and a QR code. There is NO copy-to-clipboard button. The admin (on a phone) must long-press and hand-select a 50-char URL to send it to a helper. Because the code is shown exactly once and is unrecoverable, a botched manual selection means the invite is wasted and must be re-minted.
- **Recommendation:** Add a one-tap "Link kopieren" button next to the code (and ideally a native "Teilen" / share-sheet button on mobile). This is the single moment where copy must not fail, and right now it relies on fiddly manual selection. The QR helps device-to-device but not "send my spouse the link via WhatsApp".

### Notes (no defect)
- Invite creation matches spec: one-time banner with explicit "won't be shown again" warning, plain link, server-rendered QR, default 7-day expiry editable via a (Tage) spinbutton. List shows created + expiry dates with a "Widerrufen" button. Good.
- Expiry is entered as a raw number-of-days spinbutton; fine, but a few presets (1 / 7 / 30 Tage) would be faster than typing.

## Flow: Invite redemption (logged-in)

### [MAJOR] An already-logged-in user who opens an invite link silently burns the invite with no feedback
- **Where:** /invite/[code] when the visitor already has a session
- **Relation:** spec-gap (invites spec describes the helper-from-logged-out flow; it does not address an authenticated visitor opening the link)
- **Evidence:** While logged in as the admin (testuser), I navigated to a valid invite URL. The page showed the normal "Einladung — Klicke auf den Button, um deinen Zugang zu aktivieren" confirmation with NO hint that I'm already logged in. Clicking "Einladung annehmen" redirected to / and the invite then vanished from the admin list ("Keine offenen Einladungen") — i.e. it was consumed. My session stayed admin (/admin still fully accessible), so the new helper account was effectively created-and-orphaned and the invite was wasted. The user gets zero indication any of this happened.
- **Recommendation:** When an authenticated user opens /invite/[code], detect the existing session and either (a) show "Du bist bereits angemeldet" and do not consume the code, or (b) require explicit "als neuer Helfer anmelden (du wirst abgemeldet)" wording. The realistic real-world version of this: the admin tests their own link, or a helper who already has a session re-taps the link they were sent — and quietly destroys a single-use code.

### Notes (no defect)
- GET on a valid invite correctly shows the one-button confirmation and (per spec) does not consume on GET — confirmed it only consumed after the button press.

## Flow: Invite redemption (logged-out / panicked helper)

### [BLOCKER] Invited helper account has full admin access (can export everything and DELETE ALL DATA)
- **Where:** /admin and /admin/delete-confirm, reached as a freshly-invited helper
- **Relation:** spec-violation (invites: "The new account MUST NOT have admin privileges" / "role: user")
- **Evidence:** Cleared cookies, opened a valid invite URL, pressed "Einladung annehmen" -> logged in as a brand-new helper at /. Navigating to /admin renders the full admin hub. /admin/delete-confirm renders with a live "Ja, alle Daten unwiderruflich löschen" button ("Davon betroffen: 3 Einträge."). The helper can also reach "Daten exportieren" (download the entire private household inventory) and the invite-management section. (I did NOT press delete — access was already proven by the page rendering the active button.)
- **Recommendation:** Gate every /admin route (and the dangerous POST handlers behind them: delete-all, export, import, invite create/revoke) on the admin role server-side, and 403/redirect helpers. Also hide the "Verwaltung" entry from /mehr for non-admins. This is the worst-case move-day failure: a short-lived helper wipes or exfiltrates the whole inventory.

### [MAJOR] Helper lands on the blank welcome page with no path to "pack a box"
- **Where:** / immediately after accepting an invite
- **Relation:** spec-gap
- **Evidence:** Persona = panicked helper, never seen the app, told "pack and label that box". After accepting, they land on "Willkommen bei servus." with only the bottom nav. Nothing says "start here" or "scan a box". They must intuit that "Umzugskartons" (boxes) or "Schnellerfassung" is the entry, open it, and find the camera. No onboarding, no highlighted primary action.
- **Recommendation:** Give the post-invite landing a single obvious CTA aimed at helpers (e.g. "Karton scannen / Gegenstand erfassen"). The whole point of the helper flow is "one button press and go" — but the moment after that button it goes cold.

### Notes (no defect)
- The logged-out redemption itself is exactly one button press and is fast (good, matches the invites spec intent). The friction is entirely *after* landing.

## Flow: Add item manually (full field entry by hand)

### [MAJOR] Three overlapping "where does it live" controls on the manual item form (Behälter / Raum / Karton)
- **Where:** /items/new — the placement block
- **Relation:** quality (inventory spec defines roomId, boxId, and containment parentId as distinct fields, but does not mandate three separate UI controls; this is a UI-composition problem)
- **Evidence:** The new-item form stacks three placement pickers in a row: "Behälter (optional)" (a button that opens a searchable tree picker drilling rooms -> container items), "Raum (optional)" (a plain room select), and "Karton (optional)" (a plain box select). The Behälter tree picker itself lists rooms ("Wohnzimmer ▸", "Kein Raum ▸"), so it visually overlaps the Raum select. For the wife entering items by hand dozens of times a day, it is not obvious which control to use, whether they conflict (can I set both a Raum and a Karton?), or what wins. Three controls for one conceptual question ("where is this thing?") is exactly the redundant-paths problem this review targets.
- **Recommendation:** Collapse to one primary placement affordance. Most manual items just need a room OR a box OR a parent container — make it a single picker that offers all three destinations in one searchable list ("Raum", "Karton", "Behälter") and hide the others, or at minimum visually group them under one "Standort" heading with clear copy that only one applies. The current three-in-a-row layout makes the most-used manual flow think harder than it should.

### [MINOR] Selected category schema type is ignored by the create form / no typed fields appear
- **Where:** /categories create form -> /items/new
- **Relation:** spec-violation (inventory "Create a category with a schema type": the chosen schemaType must be stored; typed schemas are meant to drive per-type fields)
- **Evidence:** When creating a category, choosing a Typ other than "Allgemein" in the create row did not visibly take effect — the new "Bücher" category landed as Typ "Allgemein" in the list (the type combobox in the create row appears decorative until you re-set it on the inline list editor). Consequently the item form for a "Bücher" item shows only generic fields; no Buch-specific fields (author/ISBN etc.) ever surface. The wife who wants typed metadata by hand gets no payoff from picking a schema type. (Worth a closer look by the backend/frontend agents on whether the create-row Typ select is wired up at all.)
- **Recommendation:** Ensure the create-row schemaType is persisted on first create, and surface the schema's extra fields on /items/new when a typed category is selected, so manual typed entry is actually possible.

### Notes (no defect)
- Manual save works and is reliable: filled Name, Kategorie, Anzahl=2, Wert=150, Raum=Wohnzimmer -> Speichern redirects to /items with the item visible ("Roter Sessel — Bücher · Wohnzimmer ×2") and inline quantity steppers. Field order is sensible (Name, Kategorie, placement, Anzahl, Wert, Garantie, Gruppe, Fotos). Anzahl defaults to 1. No required-field markers beyond Name, which is fine.
- No explicit success toast after save; the redirect-with-item-present is acceptable feedback.
- Minor copy nits (see Observations): heading "50 neueste Gegenstände (0)" when empty; filter labels "Alle Kategorie" / "Alle Raum" read as singular.

## Flow: Quick-add (Schnellerfassung)

### [MAJOR] The prominent "Schnellerfassung" nav tab is photo-only — no by-hand quick path
- **Where:** /items/quick-add (bottom nav "➕ Schnellerfassung")
- **Relation:** spec-gap (capture-preview/photos specs define the photo-first capture; nothing requires a manual quick path, but CLAUDE.md §1 and the review brief make manual entry first-class)
- **Evidence:** "Schnellerfassung" is the most prominent add affordance (center bottom-nav, "➕"). Opening it shows only two photo controls: "Foto hinzufügen" (camera) and "Aus Galerie". There is no text field, no "manuell erfassen" link, no way to type a name and save. The wife, who frequently adds items by hand and explicitly will not wait for the future AI-analysis workflow, gets the photo flow forced on her by the app's primary button. Her actual by-hand path (Gegenstände -> Gegenstand hinzufügen) is one level down and less prominent, so the most-used quick action and the most-prominent button are mismatched.
- **Recommendation:** Add a "Manuell erfassen" / "Ohne Foto" affordance on the Schnellerfassung screen that jumps straight to /items/new (or an inline name-only quick form that saves immediately). The prominent add button should serve both the photo-first and by-hand users, not just photo-first.

### Notes (no defect)
- For the photo-first persona this screen is appropriately minimal: two large tap targets, camera + gallery. A "Zurück" link is present. As a *photo* quick-add it is fine; the issue is purely that it is the only thing behind the most prominent "add" entry point.

## Flow: Fill / correct fields of a scanned (pending) item by hand

### [MAJOR] Pending triage list shows "(unbenannt)" even after the item has been named
- **Where:** /items/pending (Ausstehende Gegenstände)
- **Relation:** spec-violation (inventory "Pending-items triage list": each row MUST show the display name, and `(unbenannt)` only when `name` is empty)
- **Evidence:** I captured a photo (created a pending item), opened it, set Name = "Kaffeemaschine" and Kategorie = "Bücher", saved. The detail page correctly reads "Gegenstand: Kaffeemaschine". But /items/pending still lists the row as "(unbenannt)". The name is clearly not empty, so the triage list is rendering the placeholder incorrectly (or reading a stale value). For the wife, the triage screen is exactly where she works through scanned items — if every corrected item still says "(unbenannt)", she can't tell which ones she has already handled.
- **Recommendation:** Render the actual `name` in the pending list when present; fall back to "(unbenannt)" only when `name` is empty. (Backend/frontend agents should check whether the list query reads a stale projection.)

### [MAJOR] No way to confirm / "mark done" a pending item — it stays "Ausstehend" forever
- **Where:** /items/pending rows, /items/[id] detail, /items/[id]/edit
- **Relation:** spec-gap (the inventory spec deliberately says editing MUST NOT transition status, and defines a pending triage list, but defines no action to leave the pending state; capture-preview likewise has none)
- **Evidence:** After fully filling in a captured item by hand (name + category + saved), it remains badged "Ausstehend" on the detail page, in the items list, and in the triage list. There is no "Bestätigen" / "Fertig" / "als erledigt markieren" button anywhere — the triage row only offers "Bearbeiten". So a perfectly completed item is indistinguishable from an un-triaged one, and the "Ausstehende Gegenstände" list never empties through normal hand-correction. The whole point of a triage list is to work it down to zero; here it can't be.
- **Recommendation:** Add an explicit confirm action (a "Fertig"/"Bestätigen" button on the pending triage row and on the item detail/edit screen) that flips `status` from `pending` to `confirmed`. This is the missing closure step for the hand-correction workflow the wife relies on. (If the intended design is that the spec needs a confirm requirement, that is itself the gap.)

### [MINOR] Pending triage row is missing the thumbnail and quantity the spec requires
- **Where:** /items/pending rows
- **Relation:** spec-violation (inventory "Pending-items triage list": each row MUST show the primary photo thumbnail, box assignment if any, and the quantity)
- **Evidence:** The pending row shows only the name placeholder, the "Ausstehend" badge, and a "Bearbeiten" link. No photo thumbnail (even though the item has a captured photo), no quantity, no box. Without the thumbnail the wife can't visually recognise a scanned item to correct it — the photo is the only clue to what an unnamed scan actually is.
- **Recommendation:** Add the primary-photo thumbnail, quantity, and box assignment to each pending row as the spec requires.

### Notes (no defect)
- The edit form for a pending item is the full standard form with the captured photo shown at top ("Foto entfernen") — good, the photo carries over. Saving name+category works and persists (detail page shows them).
- Reaching the edit form takes two taps from the triage list is fine, but see the "(unbenannt)" + missing-thumbnail findings: the wife can't tell what she's about to edit before tapping.

## Flow: Add item by photo (capture -> pending -> confirm)

### Notes (no defect)
- Capture works end-to-end: choosing a photo immediately shows a thumbnail with a "Foto entfernen ×" control and a live count ("Foto hinzufügen (1)"), matching the capture-preview spec (inline preview + count). A pending item is created from the first photo (create-from-photo mode).
- Remove-last-photo correctly deletes the orphan pending item: I captured a photo (created a pending item), removed it, and /items/pending did NOT gain a blank row — only the previously-named item remained. Matches capture-preview "Removing the last photo in quick-add deletes the pending item".
- "Fertig" finishes the session and returns the capture surface to its empty state; the pending item is then triaged via /items/pending.

### Cross-reference (defects already filed under "Fill / correct fields of a scanned (pending) item")
- The "confirm" leg of this flow is effectively missing: a captured item, once filled in by hand, never leaves "Ausstehend" because there is no confirm action (see the MAJOR spec-gap above). So "capture -> pending -> confirm" cannot reach the final state through the UI. This is the most important issue for the photo flow.

## Flow: Search & browse / filter items

### [MINOR] Empty filter result says "Noch keine Gegenstände vorhanden" (looks like the whole inventory is empty)
- **Where:** /items when a search/category/room filter matches nothing
- **Relation:** quality (inventory list spec covers search/filter behavior, not the empty-state copy)
- **Evidence:** Searching "Sessel" + filtering category "Kiste" (no overlap) shows the same empty state as a brand-new install: an illustration + "Noch keine Gegenstände vorhanden." For a user with a full inventory who just filtered, this reads as "all your items are gone," which is alarming, and gives no hint that a filter is hiding results.
- **Recommendation:** Use a filter-aware empty state, e.g. "Keine Treffer für diese Filter" plus a "Filter zurücksetzen" link, distinct from the true-empty "Noch keine Gegenstände vorhanden."

### [MINOR] No one-tap way to clear an active search/filter
- **Where:** /items filter bar
- **Relation:** quality (spec-gap on UX affordance)
- **Evidence:** After filtering, the only way back to the full list is to manually re-select "Alle Kategorie"/"Alle Raum" and clear the search box (or edit the URL). There is no "Zurücksetzen"/"Alle anzeigen" control. For the wife who filters constantly this is repeated fiddling.
- **Recommendation:** Add a "Filter zurücksetzen" link that appears whenever any of q/cat/room is set, returning to /items.

### Notes (no defect)
- Search works (q=Sessel returns only "Roter Sessel"). Category and room filters auto-apply on change (no extra submit tap) and combine with the search query via querystring — good, fast, and shareable/bookmarkable.
- Heading sensibly switches from "50 neueste Gegenstände (N)" (default) to "Gegenstände" when filtered. The "Alle Gegenstände laden" / "?all=1" affordance handles the >50 case.
- Copy nit (Observations): "Alle Kategorie" / "Alle Raum" read as singular German; "50 neueste Gegenstände (0)" is awkward when empty.

## Flow: Edit item & adjust quantity

### [MINOR] Quantity-too-low rejection relies only on the native browser tooltip
- **Where:** /items/[id]/edit, Anzahl field on submit
- **Relation:** spec-violation-adjacent (inventory "Quantity below 1 is rejected on edit" — the rejection happens, but the feedback is browser-native only)
- **Evidence:** Setting Anzahl=0 and pressing Speichern does not submit; the field is focused and the browser shows its native "value must be >= 1" bubble. No in-app message, and on some mobile browsers the native bubble is easy to miss. The behavior is spec-correct (0 is rejected, nothing saved), but the wife on a phone may just see "nothing happened" if the native bubble doesn't render prominently.
- **Recommendation:** Keep the native min=1 guard but also surface an in-form error message near the field on failed submit, consistent with how other validation errors are shown.

### Notes (no defect)
- Inline quantity steppers on /items work well: ± updates instantly without a full reload (optimistic), persists across reload (verified ×2 -> ×3 survived navigation), and the minimum is enforced (decrementing at ×1 stays ×1, never 0). This is exactly the fast, low-friction adjust the wife needs.
- The edit form round-trips all fields correctly (Name, Kategorie, Raum, Anzahl, Wert all preserved). "Abbrechen" returns to the item detail. Editing a pending item keeps status pending (spec-correct; see the missing-confirm finding).
- The minus stepper is not visually disabled at the minimum (it's a harmless no-op); a disabled state would be marginally clearer but is not a defect.

## Flow: Place item inside a container item

### Notes (no defect)
- This flow is well executed and matches the containment spec. Steps: edit item -> open "Behälter (optional)" picker -> accordion panels per room appear collapsed -> expand "Wohnzimmer" lazily loads container-capable items -> only "Holzkiste" (canContain category) is offered (non-container items are correctly excluded) -> select it.
- On selection the UI does the right thing: the Raum field locks and shows "Raum wird automatisch vom Behälter übernommen." and the Karton select disables, enforcing the root-owns-room invariant in the UI (the earlier three-controls concern resolves once a container is picked). A "✕" clears the container.
- After save, the item detail shows a clear chain: "Standort: Wohnzimmer → Holzkiste" and "Enthalten in: Holzkiste" (both linked). Effective room is correctly derived from the container even though the item's own roomId is cleared.
- The container picker's search box and collapsible room panels match the containment spec's "searchable and grouped by room with lazy loading" requirement.

### Observation (taste, not a defect)
- "Standort: Wohnzimmer → Holzkiste" and "Enthalten in: Holzkiste" are somewhat redundant on the detail page; one combined line could suffice. Filed as taste, not a finding.

## Flow: Create a box

### Notes (no defect)
- Box creation is fast and clean (matches boxes spec): /boxes shows an inline form (Name + optional "Zielraum"), "Karton hinzufügen" creates it and navigates straight to the box detail. The box gets an auto-assigned human code ("B-001"), status defaults to "Leer", and the detail page surfaces Bearbeiten / Karton-Etikett (label) / Löschen / Zurück plus a per-box photo capture and an items list. One-tap create, sensible defaults, no friction. A panicked helper could create a box without thinking.

## Flow: Pack items into a box

### [MAJOR] No "add existing item" action from the box — packing an existing item requires going to the item and editing it
- **Where:** /boxes/[id] detail page vs /items/[id]/edit (Karton select)
- **Relation:** spec-gap (boxes spec defines camera-capture-into-box and item-side box assignment; it does not provide a box-side "add existing item" path)
- **Evidence:** On the box detail page the only way to put something in the box is "Foto hinzufügen / Aus Galerie" (which creates a NEW pending item). To pack an *existing* item you must leave the box, open the item, tap Bearbeiten, scroll to "Karton (optional)", select the box, and Speichern — then navigate back to the box to confirm. The mental model "open the box, add these items to it" (the helper's instinct during a move) is not supported from the box side. This is a competing-paths problem: capture makes a new item, but there's no symmetric "pick existing items to add."
- **Recommendation:** Add an "Gegenstand hinzufügen" / "Vorhandene Gegenstände einpacken" action on the box detail that opens an item picker (searchable, multi-select) and assigns the chosen items to the box in one step. This is the box-centric pack flow a helper expects and would cut packing one item from ~5 taps + two navigations to ~2 taps.

### Notes (no defect)
- Item-side packing works and auto-tracks box status: assigning Kaffeemaschine to "B-001" via the item edit form flipped the box from "Leer" to "Gepackt" automatically (matches boxes spec "Status becomes packed when first item added").
- The box detail lists packed items with name, category, a quantity stepper, and an "Entfernen" (unpack) button per item — good. Once packed, the box's "Löschen" is replaced by "Als geliefert markieren", which correctly prevents deleting a non-empty box.
- A pending item (Kaffeemaschine still "Ausstehend") packs fine and counts toward "Gepackt" (matches "Pending item counts toward box packed status").

## Flow: Print / use a box label

### [MINOR] Item-count badge has no singular form ("1 Gegenstände")
- **Where:** /boxes/[id]/label (and box list / detail count text)
- **Relation:** quality (the boxes spec's own example uses "5 Gegenstände"; pluralization for count=1 is a copy detail the spec doesn't pin down)
- **Evidence:** A box with one item shows "1 Gegenstände" on the label. German should read "1 Gegenstand". On a printed move-day label this looks unpolished and slightly confusing.
- **Recommendation:** Add a singular/plural rule to the `t()` count string ("1 Gegenstand" / "N Gegenstände").

### Notes (no defect)
- The label page matches the boxes spec: dominant destination-room name with a derived Unicode icon (🛋️ Wohnzimmer), the short code (B-001), the label text ("Küche – Geschirr"), an item-count badge, and an SVG QR code. It renders without app navigation chrome and provides a screen-only toolbar with "Drucken" + "Zurück" (would be hidden under @media print). This is a clean, scannable label suitable for move day.
- The only console error on this page is a generic favicon.ico 404 (not label-related).

## Flow: Mark box delivered / unpack-all

### [MAJOR] "Alle entpacken" deletes the entire box with no confirmation and no warning that it will be deleted
- **Where:** /boxes/[id] detail, delivered state, "Alle entpacken nach [Raum]" button
- **Relation:** quality (the deletion itself is spec-correct — boxes spec "Unpack all remaining items" tombstone-deletes the box; the missing confirmation/undo is the UX gap)
- **Evidence:** On a delivered box I clicked "Alle entpacken nach Wohnzimmer". It immediately reassigned the item to the room AND tombstone-deleted the box, redirecting to /boxes with no confirmation dialog, no "are you sure", and no undo. The button label gives no hint the box will cease to exist (it reads like "move the contents out", not "destroy this box"). Per spec the deletion is permanent (tombstone, short code never reused). On move day a mis-tap permanently removes a box record; if the helper expected the empty box to remain for re-use, it's gone and its code is burned forever.
- **Recommendation:** Add a confirmation step for "Alle entpacken" that states the box will be emptied AND deleted (code retired), e.g. "Alle Gegenstände nach Wohnzimmer einlagern und Karton B-001 löschen?". Same applies to the per-item "Einlagern" when it removes the last item (also silently deletes the box).

### [MINOR] One-way "Als geliefert markieren" has no confirmation
- **Where:** /boxes/[id] detail, packed state
- **Relation:** quality (boxes spec: the delivered transition is intentionally one-way with no revert button)
- **Evidence:** Clicking "Als geliefert markieren" flips the box to "Geliefert" instantly with no confirmation. Because the spec makes this one-way (no UI to revert to "packed"), an accidental tap is not easily undoable — the only escape is to unpack everything and re-pack into a new box.
- **Recommendation:** Either add a light confirmation ("Karton als geliefert markieren? Das lässt sich nicht rückgängig machen.") or provide a discreet revert affordance. Given the spec deliberately forbids revert, the confirmation is the safer choice.

### [MINOR] Visiting a deleted/unpacked box URL shows a bare "Seite nicht gefunden." with no navigation back
- **Where:** /boxes/[id] for a tombstoned box
- **Relation:** quality (spec-gap on the not-found experience)
- **Evidence:** After unpack-all deleted the box, navigating to its URL renders only "Seite nicht gefunden." with no app chrome, no bottom nav, and no link back to /boxes. A stale bookmark, a printed label's QR code, or the browser back button after delivery lands the user in a dead end. (Printed labels of delivered-then-unpacked boxes will scan to this page.)
- **Recommendation:** Render the 404 with normal navigation chrome and a "Zurück zu den Kartons" link; ideally detect a tombstone and show "Dieser Karton wurde ausgepackt" with a link to the destination room.

### Notes (no defect)
- The delivered state correctly hides destructive/irrelevant controls per spec: camera capture, per-item quantity steppers, and per-item "Entfernen" all disappear; no revert-to-packed button is shown (one-way by design). The per-item "In Raum einlagern" select + "Einlagern" and the bulk "Alle entpacken" appear only after delivery. The unpack flow does reassign items to the room as specified.
- Note there is no separate "unpack-all on a packed box" — unpacking is only offered after marking delivered, which is the intended sequencing.

## Flow: Configure categories & create a new category type / schema (manual config)

### CORRECTION to earlier finding
- My earlier MINOR "Selected category schema type is ignored by the create form" (under "Add item manually") was WRONG and should be disregarded. On retest: creating a category with Typ "Werkzeug" selected in the create row DID persist (the new "Werkzeuge" category shows Typ "Werkzeug"), and selecting that category on /items/new correctly revealed the type-specific fields (Marke, Werkzeugart, Antrieb dropdown). My "Bücher" earlier landed as "Allgemein" only because I never changed its type. Typed schemas work end-to-end. Apologies for the noise — flagging so the synthesis agent drops that item.

### [MAJOR] New-type editor has five fixed field rows — no add/remove field control
- **Where:** /categories/schemas/new (and presumably the edit-type page)
- **Relation:** quality (inventory category-schema is admin-configurable; the spec doesn't prescribe the editor's row mechanics)
- **Evidence:** The "Neuer Typ" form renders exactly five empty field rows (Bezeichnung / Feldtyp / Auswahlmöglichkeiten) with no "+ Feld hinzufügen" or per-row remove. A type needing one field forces the wife past four blank rows; a type needing six fields is impossible. Blank rows are silently ignored on save (good), but the form is long and rigid for someone configuring types by hand. This is the kind of fiddly manual-config friction the review weights heavily.
- **Recommendation:** Make fields dynamic: start with one row, an "+ Feld hinzufügen" button to add more, and a remove (✕) per row. Cap at a sane max if needed. This matches how the wife actually thinks about a type ("it has these N attributes").

### [MINOR] "Auswahlmöglichkeiten" (options) textarea is shown for every field row regardless of field type
- **Where:** /categories/schemas/new field rows
- **Relation:** quality
- **Evidence:** Each field row always shows the "Auswahlmöglichkeiten (eine pro Zeile)" textarea, even when Feldtyp is Text, Zahl, Datum, or Ja/Nein — where options are meaningless. This clutters the form and invites confusion ("do I need to fill this for a text field?").
- **Recommendation:** Show the options textarea only when Feldtyp = "Auswahl"; hide it for the other types (reactively on the type select).

### [MINOR] "Löschen" on a category fires with no confirmation
- **Where:** /categories list, per-category "Löschen"
- **Relation:** quality
- **Evidence:** Tapping "Löschen" attempts deletion immediately with no "are you sure". The referential guard correctly blocked deleting an in-use category ("Kategorie wird noch verwendet und kann nicht gelöscht werden."), but an UNUSED category would be deleted instantly on a single mis-tap, with no undo. Categories are shared config the whole household depends on.
- **Recommendation:** Add a confirmation to category delete (and ideally to type delete), consistent with the destructive-action guidance elsewhere.

### Notes (no defect)
- Category create is otherwise smooth: Name + Typ select (16 built-in types + any custom) + "Kann Gegenstände enthalten" checkbox, one-tap add. The can-contain flag persists and is shown checked on the inline editor.
- The referential-integrity guard on delete works and gives a clear German message (spec "Delete a referenced category is rejected").
- The custom-type flow works end-to-end: "Neuen Typ erstellen" -> name + fields -> Speichern -> the type appears in the schema list without an "Eingebaut" badge (i.e. user-created) and immediately shows up in every category Typ dropdown. The Auswahl field type with newline-separated options saved without error. This is a genuinely powerful feature for hand-driven configuration.
- Built-in types are correctly marked "Eingebaut" and the page states they can be extended but not deleted.

## Flow: Create & manage groups

### [MINOR] "Gruppe löschen" deletes immediately with no confirmation
- **Where:** /groups/[id] detail
- **Relation:** quality (groups spec: deleting a group removes memberships but keeps items — behavior is correct; the missing confirm is the UX gap)
- **Evidence:** "Gruppe löschen" removes the group and redirects with no "are you sure". Deleting the group correctly keeps its items (verified Roter Sessel survived), so the blast radius is limited to losing the grouping — but a group representing "everything for the first car load" being wiped by a mis-tap, with no undo, is still annoying on move day.
- **Recommendation:** Add a confirmation to group delete, consistent with other destructive actions.

### [MINOR] Group item count uses the plural-only "N Gegenstände" form ("1 Gegenstände")
- **Where:** /groups overview list
- **Relation:** quality (same pluralization gap as the box label)
- **Evidence:** A group with one item shows "1 Gegenstände". Should be "1 Gegenstand".
- **Recommendation:** Same singular/plural fix as the box-label count (shared helper).

### Notes (no defect)
- Add-to-group from the item edit form works and matches the groups spec: typing a new name ("Erstes Auto") created the group and added the item, shown as a chip with a link and an "Entfernen ✕". (I did not separately verify the autocomplete-of-existing-names requirement; the input is a plain textbox here — worth the frontend agent confirming the datalist exists.)
- /groups offers a "Neue Gruppe" create form and lists groups with their item counts. The group detail supports rename ("Umbenennen"), a reorderable member list with ↑/↓ buttons + "Reihenfolge speichern" and a drag hint, and delete. Good coverage.
- Deleting a group keeps its items (verified) — spec-correct.

### Observation (taste)
- Drag-to-reorder ("Zum Sortieren ziehen") is awkward on a touch phone; the ↑/↓ buttons are the reliable mobile path and are present, so this is fine — just noting the drag hint may over-promise on mobile.

## Flow: Rooms overview

### [MINOR] Rooms list shows no item count per room (inconsistent with groups/boxes)
- **Where:** /rooms
- **Relation:** quality (inventory room-management spec covers CRUD, not the overview's per-room metrics)
- **Evidence:** /rooms is a flat list of room names with a "Löschen" each; tapping a room drills into /items?room=<id>. But unlike the groups overview ("N Gegenstände") and the boxes list (item counts), rooms show no count, so the wife can't see at a glance how full each room is or which rooms are empty/safe to delete.
- **Recommendation:** Show an item count badge per room (containment-aware, matching the filtered view), consistent with groups and boxes.

### [MINOR] "Löschen" on a room fires with no confirmation
- **Where:** /rooms per-room "Löschen"
- **Relation:** quality
- **Evidence:** Same destructive-action pattern as categories/groups: "Löschen" attempts deletion with no confirm. The referential guard correctly blocked deleting an in-use room ("Raum wird noch verwendet und kann nicht gelöscht werden."), but an unused room would vanish on a single mis-tap.
- **Recommendation:** Add a confirmation to room delete (covered by the cross-cutting "no confirm on destructive config deletes" theme).

### Notes (no defect)
- Room drill-in is correct and containment-aware: /items?room=Wohnzimmer lists Holzkiste, Kaffeemaschine, AND Roter Sessel — the last via its container (its own roomId is null but its effective room is derived through Holzkiste). Good.
- Room delete referential guard works with a clear message (spec "Delete a room directly assigned to an item is rejected").
- Room create is the same fast inline pattern as boxes/groups.

## Flow: Export then re-import via /admin

### [MINOR] Import error surfaces a raw JS parser message ("Unexpected token 'h' ... is not valid JSON")
- **Where:** /admin import, on malformed file
- **Relation:** quality (data-export spec: "malformed or empty file shows error" — an error IS shown, but the message is a raw exception)
- **Evidence:** Uploading a malformed file shows "Import fehlgeschlagen: Unexpected token 'h', \"this is not\"... is not valid JSON" (and the raw message is also passed through the URL ?error=...). It doesn't crash and does indicate failure, but the technical JSON.parse text is meaningless to a non-technical user and exposes internals.
- **Recommendation:** Catch parse failures and show a friendly German message, e.g. "Die Datei ist keine gültige servus-Sicherung (.ndjson)." Keep the technical detail in server logs only, not the URL.

### [MINOR] Custom category schema types may not be covered by export (possible restore gap)
- **Where:** /admin/export NDJSON contents
- **Relation:** spec-gap (data-export "Export produces NDJSON covering all in-scope KV prefixes" — needs confirmation that user-created schema types are in-scope)
- **Evidence:** The export I inspected includes items, item indices, rooms, categories (with schemaType), the box-code-counter, a box tombstone, and the user — but no line for the custom "Pflanze" schema type I created earlier under /categories/schemas/new. If user-defined schema types live under a KV prefix not included in the export, then restoring from a backup would leave any category referencing a custom type pointing at a missing schema. (I'm flagging for the database/backend agents to confirm the prefix list; I could not see a schema record in the dump.)
- **Recommendation:** Verify custom schema types are an in-scope export prefix; if not, add them so backups are complete.

### Notes (no defect)
- Export works to spec: GET /admin/export returns 200 with content-type application/x-ndjson, Content-Disposition attachment, filename "servus-export-2026-06-19.ndjson", one JSON object per KV entry. Sensitive prefixes (sessions) are excluded; the user record (with argon2id hash) is included, which is expected for a full backup.
- Import round-trips: uploading a valid NDJSON file showed "3 Einträge importiert, 0 übersprungen." (matches spec "displays imported and skipped counts"). The box tombstone and box-code-counter are preserved in the export so short codes won't be reused after restore.
- The /admin "Alle Daten löschen" action correctly routes through a separate /admin/delete-confirm page rather than firing inline — good gating for the most destructive action.

## Flow: Logout

### Notes (no defect)
- Logout works correctly and matches the auth model: "Abmelden" on /mehr redirects to /login, and the session is genuinely destroyed — attempting to reopen /items afterward redirects to /login?next=%2Fitems (with the intended destination preserved via ?next for a clean re-login). No confirmation is needed for logout (non-destructive, easily reversible). Good.

## Redundant / competing paths audit (name the primary)

This is a core goal of the review: where the app offers more than one way to the same outcome, decide whether it helps and which should be the obvious primary path.

### [MAJOR] Adding an item — at least three entry points, none clearly primary
- **Paths observed:**
  1. Bottom-nav "➕ Schnellerfassung" -> /items/quick-add (photo-only; creates a pending item).
  2. /items -> "Gegenstand hinzufügen" -> /items/new (full by-hand form).
  3. Box detail -> "Foto hinzufügen" (photo capture that creates a pending item already assigned to the box).
- **Problem:** The MOST prominent entry (the center "➕" tab) is photo-only and gives the by-hand user (the wife) nothing; the by-hand form is one level down and less prominent; and a third capture path lives on the box. A new helper and the daily power user pull toward different buttons with no guidance.
- **Recommended primary:** Make the "➕" Schnellerfassung screen a small hub that branches to "Foto aufnehmen" (photo-first) and "Manuell erfassen" (-> /items/new). That single prominent button then serves both personas, and the box-detail capture remains a convenience shortcut for the in-box case.

### [MAJOR] Placing an item somewhere — Behälter vs Raum vs Karton on one form
- **Paths observed:** On /items/new and /items/[id]/edit, three side-by-side controls (Behälter tree picker, Raum select, Karton select) all answer "where does this live?", and the Behälter picker even lists rooms, overlapping the Raum control. (Detailed under "Add item manually".)
- **Problem:** For the daily manual flow it is unclear which to use or whether they conflict; the locking only kicks in AFTER a Behälter is chosen.
- **Recommended primary:** One combined "Standort" picker (room / box / container in a single searchable list), or group the three under one heading with copy that makes clear only one applies.

### [MAJOR] Packing an item into a box — item-side only; no box-side "add existing"
- **Paths observed:** Capture-into-box (new item) on the box detail vs setting "Karton" on the item edit form. There is NO box-side way to add an EXISTING item. (Detailed under "Pack items into a box".)
- **Problem:** The two existing paths are asymmetric (one makes a new item, the other edits an item), and the natural "open the box, add these items" flow is missing — the most likely helper mental model.
- **Recommended primary:** Add a box-side multi-select item picker as the primary pack path; keep capture-into-box as the photo shortcut and the item-edit "Karton" select as the secondary.

### Minor / acceptable duplications (not defects)
- Theme toggle appears twice (floating button + a row in /mehr) — harmless, both reach the same toggle.
- Create forms for rooms/boxes/groups/categories share one consistent inline "Name + Hinzufügen" pattern — this is good consistency, not redundancy.
- Add-to-group exists both from the item edit form and from the /groups area — these are genuinely different directions (item->group vs group->items) and both are reasonable.

### Cross-cutting theme: destructive config deletes have no confirmation
- Category, room, and group "Löschen" all fire immediately with no confirm (only referential guards save in-use records). "Als geliefert markieren" and "Alle entpacken" (which deletes the box) also have no confirm. By contrast, "Alle Daten löschen" is correctly gated behind a confirm page. Recommend a consistent lightweight confirm on all destructive/irreversible actions.

## Cross-reference with UI findings (read after independent pass)

Reconciling my flow findings against findings/ui.md. UI ran a visual/clarity pass; I ran flows. We overlap on several items — noting agree/disagree and the UX (task-completion) consequence of UI's relevant visual findings.

### Strong agreement (same issue, both lenses)
- **Home dashboard is a dead landing** — UI [MAJOR] "Dashboard is three lines of static text"; I filed [NIT] "Home gives no orientation/primary action" and [MAJOR] "Helper lands on blank welcome with no path to pack a box." UI is right to rate the empty home higher than my NIT. UX consequence: the panicked helper's very first screen has no entry point — this compounds my "Schnellerfassung is photo-only" and "no box-side pack" findings into a cold start. Net: treat as MAJOR. UI owns the visual fix; I own the "what's the primary action" answer (a clear "erfassen" CTA + counts).
- **Quick-add screen is unclear / no manual path** — UI [MINOR] "Quick-add gives no hint of what it does"; I filed [MAJOR] "Schnellerfassung is photo-only, no by-hand path." We agree it's underexplained; I rate it higher because the *missing manual entry* is a workflow blocker for the wife, not just a clarity gap. Both fixes belong together.
- **"1 Gegenstände" plural bug** — UI [MINOR] (box label) and I filed it on the box label AND the groups overview. Same root cause (shared count string). Consolidate.
- **Category editor rows broken/cluttered on mobile** — UI [MAJOR] (visual: scattered grid, overflow) ; I filed [MAJOR] "five fixed field rows, no add/remove" (schema editor) and [MINOR] "options textarea always shown." Different surfaces (UI = /categories rows; mine = /categories/schemas/new), but the same theme: the configuration UIs the wife uses by hand are the roughest in the app. Together these make "configuring categories by hand" the most friction-laden area — high priority given the review's weighting.
- **Destructive "Löschen" prominence** — UI [MINOR] (categories/rooms: red delete dominates the row visually); I filed the behavioral counterpart: those same deletes fire with NO confirmation. Combined: the most visually prominent control in each config row is also an unconfirmed destructive action — a genuinely risky combination. Fix both: de-emphasise visually AND add a confirm.

### Items UI flagged that have a real UX consequence (I concur)
- **Bottom nav double-active on /items/quick-add** (UI MAJOR): UX consequence — the user can't tell which section they're in; minor disorientation reinforcing the "where am I / what do I do" weakness of the add flow.
- **Container "Inhalt" is a dead end with no add affordance** (UI MINOR): this is the containment-flow counterpart to my "no box-side add existing item" finding — the same missing pattern (you can only fill a container/box from the *other* item's edit form, never from the container/box itself). Worth treating as one cross-cutting fix: "add contents from the container/box you're looking at."
- **Schema/item fieldset uses browser `groove` border; Abbrechen is an unstyled link; photo-capture buttons unstyled** (UI MAJOR/MINOR): purely visual, but they make the by-hand create/edit form — the wife's daily workhorse — look unfinished, which erodes trust in a form she relies on. I defer the pixel fixes to UI; the UX point is that the most-used manual form deserves the most polish.
- **404 is a bare English dead end** (UI MAJOR): directly reinforces my [MINOR] "deleted/unpacked box URL shows bare 'Seite nicht gefunden.' with no nav." Same root cause (no styled `_404.tsx`). A printed label QR for a delivered+unpacked box scans into this dead end — a real move-day trap. Recommend bumping the practical priority because of the QR-scan path.

### Where I add what UI could not see (UI noted it didn't exercise capture/pending)
- UI explicitly could not upload a photo (R2), so it did not see: the **pending item never leaves "Ausstehend"** (no confirm action) and the **pending triage list shows "(unbenannt)" after naming** + **missing thumbnail/quantity**. These are my most important new findings (two MAJORs) and are invisible to a static visual pass. They should carry into the synthesis as the top correctness-of-flow issues for the photo→manual-correction workflow.
- UI's visual note that "schema-driven fields appear correctly (Buch → Autor/ISBN…)" independently confirms my CORRECTION that typed schemas work — good, two agents agree the earlier "schema type ignored" suspicion was wrong.

### No disagreements
- I found nothing that contradicts a UI finding. Where severities differ (home dashboard, quick-add), UI and I are weighting the same defect from visual vs flow angles; the higher of the two should stand.

## Summary

**Severity counts (this UX pass):** BLOCKER 1 · MAJOR 13 · MINOR 17 · NIT 1.
(Three of the MAJORs are in the "Redundant/competing paths" section and deliberately restate the add-item / placement / pack findings from a competing-paths angle — the synthesis agent should dedupe those into ~10 distinct MAJOR issues.)

The core move-day tasks are completable and several flows are genuinely strong: containment (place item in a container) is excellent and fully spec-compliant; box create/label/deliver, the export/import round-trip, quantity steppers, search/filter, and logout all work well. The custom category-type editor is powerful and works end-to-end. The trouble is concentrated where the review said to look hardest: the by-hand and configuration flows, and the photo→hand-correction handoff.

**Top 3 fixes:**

1. **Close the photo→pending→confirm loop and fix the triage list.** There is no action to confirm a pending item, so a hand-corrected scan stays "Ausstehend" forever and the triage list never empties; worse, the triage list shows "(unbenannt)" even after naming and omits the required thumbnail/quantity, so the wife can't tell items apart. Two MAJOR spec-violations + one spec-gap that together break the daily "correct my scans" workflow. (Invisible to the UI agent, which couldn't upload photos.)

2. **Give the by-hand user a real primary path and stop the competing-paths confusion.** The prominent "➕ Schnellerfassung" is photo-only; the manual form is buried; placement offers three overlapping controls (Behälter/Raum/Karton); and packing an existing item has no box-side path. Make Schnellerfassung a two-way hub (Foto / Manuell), collapse placement to one "Standort" picker, and add a box-side "add existing items" picker.

3. **Add confirmation to destructive/irreversible actions.** "Alle entpacken" silently deletes the whole box (permanent, code retired); "Als geliefert markieren" is one-way; category/room/group "Löschen" all fire with no confirm. Only "Alle Daten löschen" is properly gated. One shared confirm pattern fixes the lot — and UI independently flags that these same delete buttons are also the most visually prominent element in their rows, so the risk is real.

**The flow that worried me most:** the **pending-item correction workflow** (capture → triage → fill by hand). It's the wife's stated everyday job, it's where the app invested the most design energy, and it's currently a one-way street: items go in, get a name, and can never be marked done; the triage screen mislabels them and hides the photo that's the only clue to what they are. Everything else has workarounds; this one quietly accumulates "Ausstehend" cruft until the inventory feels untrustworthy.

(The standing BLOCKER from the prior session — an invited helper account has full /admin access including export and delete-all — remains the single most urgent item overall, but it is an auth/authorization defect rather than a flow-design one; carried forward unchanged.)

## Observations (taste / ideas, not defects)

- The bottom-nav labels "Umzugskartons" vs the page title "Kartons" differ; harmless copy variation via `t()`.
- Filter dropdown labels "Alle Kategorie" / "Alle Raum" read as singular German; "50 neueste Gegenstände (0)" is awkward when the list is empty. Copy polish.
- "Standort: Wohnzimmer → Holzkiste" and "Enthalten in: Holzkiste" on the item detail are slightly redundant; could combine.
- Invite expiry is a raw days spinbutton; presets (1/7/30 Tage) would be faster (carried from the prior session's invite finding).
- Drag-to-reorder in groups is awkward on touch, but the ↑/↓ fallback exists, so it's fine.
- The schema-type editor and the admin/delete-confirm pages are the strongest flows and make good templates for fixing the weaker config screens.
