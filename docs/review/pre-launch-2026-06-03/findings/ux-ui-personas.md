# UX + UI + Personas + i18n — findings

Append findings here as you discover them. Never delete. Format per finding:

### <id-short-slug>

- **Severity:** Blocker | Critical | Major | Minor | Nit
- **Evidence:** file:line refs, or repro steps (note which browser tool used)
- **Why it matters:** one sentence
- **Suggested fix direction:** the shape, not the diff
- **Spec impact:** bug against existing spec | gap in spec | new behavior, needs
  proposal | no spec needed

---

## Findings

### login-clears-username-on-error

- **Severity:** Minor
- **Evidence:** Playwright MCP. Navigated to /login, submitted username
  `monster` + wrong password. After error, the Benutzername field is empty and
  must be retyped.
- **Why it matters:** Typing your password wrong on a phone keyboard already
  stings; having to retype the username too is friction every wife/owner login
  mishap will hit.
- **Suggested fix direction:** Preserve the submitted username (never password)
  on render after a failed login; keep autofocus on the password field.
- **Spec impact:** no spec needed (UX polish)

### login-error-message-is-non-actionable

- **Severity:** Nit
- **Evidence:** Playwright MCP. Wrong password → "Benutzername oder Passwort
  falsch." Identical for unknown user (correct for security).
- **Why it matters:** Two seed users + helpers; never offers a "Passwort
  vergessen?" path. If the wife forgets her password, there is no self-serve
  recovery hint and no contact-the-owner CTA.
- **Suggested fix direction:** Leave the message alone for security, but add a
  static help line under it (e.g. "Frage den Eigentümer, um dein Passwort
  zurückzusetzen."). Decide if any reset path is in MVP scope.
- **Spec impact:** gap in spec (no password-reset/help-text behavior captured)

### items-list-heading-misleading-when-recent-is-short

- **Severity:** Major
- **Evidence:** Playwright MCP, /items as monster. Heading reads "50 neueste
  Gegenstände (21)" but only 4 cards render. Code: `routes/items/index.tsx:60`
  always emits the literal `RECENT_LIMIT` (50) in the heading, regardless of how
  many rows came back. The fallback at line 192 only fires when
  `listItemsRecent` returns 0; if it returns 1–49 the older items are silently
  absent from the default view until the user clicks "Alle laden".
- **Why it matters:** The wife sees 4 items, knows she added more, and has no
  idea why most are hidden. Heading lies about quantity ("50" + "(21)"). This is
  the default landing page after login — confidence-shattering.
- **Suggested fix direction:** Either (a) widen the fallback to "if returned <
  totalCount, fall back to listItems()" with a sensible cap, or (b) make the
  heading honest ("Neueste 4 von 21 Gegenständen — alle laden"). Long-term,
  time-index backfill so /items can rely on it.
- **Spec impact:** bug against existing spec (items-browse-performance assumes
  the recent view is meaningful)

### items-filter-placeholders-ungrammatical-german

- **Severity:** Minor
- **Evidence:** Playwright MCP, /items. Selects render "Alle Kategorie" and
  "Alle Raum". Source: `routes/items/index.tsx:83-94` concatenates
  `t("items.filter_all")` ("Alle") + singular noun keys. German requires plural
  here ("Alle Kategorien", "Alle Räume").
- **Why it matters:** This is the first thing a German user reads above the
  inventory; it screams "machine-translated app." Violates CLAUDE.md §11 (locale
  file is the contract).
- **Suggested fix direction:** Add explicit composed keys
  `items.filter_all_categories` / `items.filter_all_rooms` (or
  `items.filter_all.categories` etc.) and use them directly; do not build German
  strings by string concatenation.
- **Spec impact:** no spec needed

### items-filter-selects-lack-labels

- **Severity:** Minor
- **Evidence:** Playwright MCP. Inspected DOM: `select[name="cat"]` and
  `select[name="room"]` have no `<label>`, no aria-label, no surrounding label
  element. Screen reader will announce only the selected option text.
- **Why it matters:** Accessibility, and on mobile the selects are visually
  identifiable only by the placeholder option — once you change the filter,
  there's no persistent affordance saying which dimension you're filtering by.
- **Suggested fix direction:** Add visually-hidden labels (or
  `aria-label="Kategorie"` / `aria-label="Raum"`) bound to each select.
- **Spec impact:** no spec needed

### orphan-locale-keys-bulk-add

- **Severity:** Minor
- **Evidence:** `lib/i18n/locales/de.ts:186-190` defines `boxes.bulk_add_label`,
  `boxes.bulk_add_placeholder`, `boxes.bulk_add_submit`,
  `boxes.bulk_add_result`. `grep` across `routes/`, `islands/`, `components/`
  finds no usage.
- **Why it matters:** Dead translations bloat the locale and (more importantly)
  hint that a removed feature is missing. Confirms the gap raised in
  box-detail-has-no-way-to-pack-existing-items.
- **Suggested fix direction:** Either re-introduce the bulk-add UI on box
  detail, or remove the dead keys.
- **Spec impact:** no spec needed for cleanup; see
  box-detail-has-no-way-to-pack-existing-items for the bigger question.

### box-detail-has-no-way-to-pack-existing-items

- **Severity:** Critical
- **Evidence:** Playwright MCP, /boxes/<id>. Actions on the box detail are:
  Bearbeiten, Karton-Etikett, Löschen, Zurück, Kamera aktivieren. There is no
  "Gegenstand auswählen" picker. Source: `routes/boxes/[id].tsx` — only
  `CaptureSurface` creates items into the box. To pack an existing item you must
  navigate to /items/<id>/edit and change `boxId` in a dropdown.
- **Why it matters:** A core MVP scenario: "I'm standing at a box, I want to
  pack the books from the shelf into B-006." Today: open the box page, decide
  there's no add-to-box, go to each item page, edit, save. With dozens of items
  that's painful. This drives the wife and helpers away from the box-centric
  flow and back to per-item edits.
- **Suggested fix direction:** On the box detail, add either a search/typeahead
  "Bestehenden Gegenstand hinzufügen" or a checkbox list of unpacked items in
  the same destination room. Alternatively, expose a barcode/QR scan for an item
  label. Whichever, this fills a hole in the box-centric move workflow.
- **Spec impact:** new behavior, needs proposal (the existing inventory/moving
  specs don't cover an add-existing-item flow from the box surface)

### box-label-page-has-no-navigation-or-print-cta

- **Severity:** Major
- **Evidence:** Playwright MCP, /boxes/<id>/label. The page contains only the
  label tile (B-010, name, count, QR). No "Zurück", no "Drucken", no nav bar.
  The only escape is the browser back button. Source:
  `routes/boxes/[id]/label.tsx`.
- **Why it matters:** Owner generates labels in batches before/during the move
  and needs to print each. Without an explicit "Drucken" button on desktop
  (where labels are most likely printed), and with no way back without the
  browser chrome, this is a friction point on every single label. The wife will
  reach for a print button and not find one.
- **Suggested fix direction:** Add a small toolbar `screen`-only (hidden via
  existing print CSS) containing "Drucken" (calls `window.print()`) and "Zurück
  zum Karton". Keep the label area itself unchanged for the print view.
- **Spec impact:** gap in spec (label page navigation/print affordances)

### box-label-count-snapshot-misleading

- **Severity:** Minor
- **Evidence:** Playwright MCP. New box B-010 label shows "0 Gegenstände".
  Printed and stuck to a box that later contains 8 items, the count becomes a
  permanent lie.
- **Why it matters:** The count contradicts reality the moment items are added;
  better to either omit it from print or replace with a "Stand: <date>" stamp.
- **Suggested fix direction:** Move "X Gegenstände" into a screen-only badge;
  print only the box code + name + QR.
- **Spec impact:** no spec needed

### items-empty-state-conflates-no-data-with-no-results

- **Severity:** Minor
- **Evidence:** Playwright MCP. /items?q=zzznoresult renders "Noch keine
  Gegenstände vorhanden." Same message would appear for an actually-empty
  database. Source: `routes/items/index.tsx:108` uses `t("items.empty")` for
  both.
- **Why it matters:** A user who searches and gets "no items exist" panics ("did
  the data disappear?"). The wife in particular would interpret this as data
  loss.
- **Suggested fix direction:** Split into two keys: `items.empty` (truly empty)
  and `items.no_results` (filter/search returned nothing); choose based on
  whether filter params are present.
- **Spec impact:** no spec needed

### items-thumbnails-are-full-size-images

- **Severity:** Major
- **Evidence:** Playwright MCP, /items. Inspected images: `naturalWidth: 640`
  for 40×40 CSS thumbnails. URL points to the original R2 object with no
  thumbnail variant. Each first item-photo triggers a 15-minute presigned URL to
  a full image.
- **Why it matters:** During the move from mobile data, 21 items × ~100KB/image
  = 2MB+ on what should be a thumbnail page; 1000 items would mean ~100MB. Even
  the "free forever" R2 egress isn't infinite, and this is the most-visited list
  page.
- **Suggested fix direction:** Generate a thumbnail variant (`-thumb.webp` or
  similar) on upload; presign that key for `/items`. Keep full-size for the item
  detail page only.
- **Spec impact:** new behavior, needs proposal (thumbnail generation isn't in
  any spec I read)

### items-thumbnail-presign-expires-after-15-min

- **Severity:** Minor
- **Evidence:** Source: `routes/items/index.tsx:203-213` calls
  `presignGet(r2cfg, item.photos[0], nowSec)`. Defaults look like the 15-minute
  presigned URLs typical for R2/S3.
- **Why it matters:** If the wife opens the list, gets a phone call, returns 20
  minutes later, scrolls — the lazy-loaded thumbnails for not-yet-visible rows
  will 403 and trip the "Bilder konnten nicht geladen werden" banner.
  False-positive errors are confidence-eroding.
- **Suggested fix direction:** Either (a) lengthen the presign TTL for
  thumbnails to something like 6h, or (b) make the lazy loader silently refetch
  a fresh presigned URL on 403 (requires a small server endpoint).
- **Spec impact:** new behavior, needs proposal

### items-thumbnail-empty-alt-when-unnamed

- **Severity:** Minor
- **Evidence:** Playwright MCP. Thumbnails on /items have `alt=""` (decorative).
  The accompanying text is often "(unbenannt)" so the image is the only
  identifier; a screen-reader user gets no label.
- **Why it matters:** Inventory entries created via continuous-capture have no
  name yet — the photo IS the identity. Empty alt makes those rows
  indistinguishable for AT users.
- **Suggested fix direction:** Compute alt from name when present; for unnamed
  pending items, use the German equivalent of "photo of pending item" or set
  `role="img"` + aria-label including createdAt.
- **Spec impact:** no spec needed

### item-detail-omits-quantity-value-box-and-photos

- **Severity:** Major
- **Evidence:** Playwright MCP, /items/<id>. Detail view shows only: Name (in
  heading), Kategorie, Raum, Erstellt, Zuletzt geändert. The form has Anzahl,
  Geschätzter Wert, Karton — none rendered. No photos even though
  `item.photos[]` exists. Source: `routes/items/[id].tsx` (DD list above).
- **Why it matters:** The owner clicks an item to "see all info"; quantity and
  photos are core attributes. The wife can't tell how many of a thing exist
  without going back to the list. Photos are invisible after capture.
- **Suggested fix direction:** Render quantity, value (if present), box
  assignment (link), status badge, and a small photo strip. Mirror the form
  fields in display order so the data model surface is consistent.
- **Spec impact:** gap in spec (item detail view shape is implicit)

### item-detail-label-says-optional

- **Severity:** Nit
- **Evidence:** Playwright MCP, /items/<id>. Renders "Raum (optional)" as the
  term label in the read-only detail view. "(optional)" belongs to forms, not
  displays.
- **Why it matters:** Confusing copy when the value is already chosen ("Kein
  Raum" with the parenthetical "optional" overhead).
- **Suggested fix direction:** Separate display labels from form labels in the
  locale (e.g. `items.field_room_label` for forms, `items.field_room` for
  read-only).
- **Spec impact:** no spec needed

### item-delete-button-no-confirmation

- **Severity:** Major
- **Evidence:** Playwright MCP, /items/<id>. The "Löschen" form is a
  single-click POST with no `confirm()`. Same anti-pattern as rooms/categories.
- **Why it matters:** Items represent real packed objects during a move. One
  stray tap on a phone deletes the item along with its photos. No undo. The wife
  and any helper are at high risk.
- **Suggested fix direction:** Same as
  rooms-categories-delete-without-confirmation — add a confirm step. For items
  with photos, mention the cascade ("3 Fotos werden ebenfalls entfernt").
- **Spec impact:** gap in spec

### quantity-decrement-at-1-is-silent-no-op

- **Severity:** Minor
- **Evidence:** Playwright MCP. Item at quantity 1, clicked "−" — visible
  quantity stays at 1, no toast, no shake, no disabled state on the button.
  Behavior matches the floor-at-1 spec (quantity-island), but UI provides no
  signal.
- **Why it matters:** Looks broken to a non-technical user ("the button doesn't
  work"). Especially confusing for the wife on a phone.
- **Suggested fix direction:** Disable the `−` button when initialQuantity is 1
  (mirror existing in-flight disable). Re-enable on next increment. This is a
  UI-only addition; spec already allows for it.
- **Spec impact:** no spec needed (the spec allows button-disable; only the UI
  needs to be updated)

### rooms-categories-delete-without-confirmation

- **Severity:** Major
- **Evidence:** Playwright MCP, /rooms. Created "Wohnzimmer", clicked the
  adjacent "Löschen" button — gone immediately, no confirm dialog, no undo, no
  toast. Same form pattern is reused for /categories (visible in DOM).
- **Why it matters:** A misclick by the wife or a helper on the move day wipes a
  room that may be referenced by dozens of items. There is no undo and no
  client-side confirmation. The "Löschen" button is right next to the row text
  with no visual separation.
- **Suggested fix direction:** Add a `confirm()` dialog (or a small modal)
  before destructive POST; or two-step delete (button reveals "Wirklich
  löschen?"). Also report what happens to items pointing at the deleted room —
  empty foreign key? hidden? — and surface that to the user.
- **Spec impact:** gap in spec (no destructive-action confirmation policy
  defined)

### items-search-input-lacks-label

- **Severity:** Nit
- **Evidence:** Playwright MCP. `input[name="q"]` on /items has only
  `placeholder="Suchen …"` and no label or aria-label. The neighbouring 🔍
  button has `aria-label`, but the field itself does not.
- **Why it matters:** Placeholder text disappears once you type; an unlabeled
  input is an accessibility miss and on a stressful move day "what was this
  field for?" is friction.
- **Suggested fix direction:** Add `aria-label={t("action.search")}` on the
  input or a visually-hidden label.
- **Spec impact:** no spec needed

### capture-activation-no-escape-while-permission-pending

- **Severity:** Major
- **Evidence:** Playwright MCP, /items/new. Clicked "Kamera aktivieren". Button
  became disabled showing "…". `islands/ContinuousCapture.tsx:67-95` — during
  phase==="idle" with busy.value===true (the in-flight getUserMedia call), the
  close (✕) button is not rendered (only rendered in starting/in-progress). If
  the OS permission prompt is dismissed without a choice, or the user changes
  their mind mid-prompt, there is no in-app way to abort — the button stays "…"
  until the promise resolves.
- **Why it matters:** On a phone the OS prompt is modal-ish, but if a user taps
  "Block" they're returned to a hung-looking surface (until error path actually
  fires). On desktop/test browsers the activation can stay pending indefinitely.
  There is also no timeout fallback.
- **Suggested fix direction:** Render the close (✕) button also in idle+busy
  state, so the user can always abandon. Optionally add a `setTimeout` of ~30s
  that flips to error with a "Erneut versuchen" CTA.
- **Spec impact:** gap in spec (the state-machine spec covers transitions but
  not the busy-idle limbo)

### items-lazy-loader-uses-200px-margin-but-no-native-fallback

- **Severity:** Minor
- **Evidence:** `static/app-init.js:48-65`. Lazy thumbnails are implemented via
  IntersectionObserver with rootMargin "200px". The fallback for missing IO
  ("else" branch) loads ALL images immediately. `<img>` lacks native
  `loading="lazy"` and `decoding="async"`.
- **Why it matters:** IO is universally supported, but adding the native
  attributes is belt-and-suspenders. More importantly, the 200px rootMargin in a
  fast-scroll mobile context means almost the entire viewport's worth of images
  is prefetched as the user scrolls; combined with
  items-thumbnails-are-full-size-images, scroll triggers many full-size image
  fetches. Without observability you can't tell if a 403 is just an expired
  presign vs an R2 hiccup.
- **Suggested fix direction:** Also add `loading="lazy"` and `decoding="async"`
  to `<img data-src=…>` (they're harmless once JS sets `src`). The bigger win is
  the thumbnail variant.
- **Spec impact:** no spec needed

### capture-error-banner-not-dismissable-no-retry-cta

- **Severity:** Major
- **Evidence:** Code review of `islands/ContinuousCapture.tsx:266` and
  `islands/PhotoCapture.tsx:190,208`. On any upload/network failure (upload-url,
  r2-put, create-from-photo, append-photo), the error is rendered as
  `<p class="capture-error">…</p>`. There is no Retry button, no dismiss
  control, and no offline detection. The next shutter tap will simply re-run the
  same code path; nothing tells the user "Sie sind offline" vs "Server hat 500
  zurückgegeben" — only the HTTP status code is shown (after recent
  improvement).
- **Why it matters:** During the move, mobile signal drops. The user captures a
  photo, sees "Bild konnte nicht hochgeladen werden (0)" and has no obvious "Tap
  to retry" affordance; they re-tap the shutter, which on continuous-capture
  grabs a _new_ frame from the (now-different) viewfinder. The first capture is
  gone forever.
- **Suggested fix direction:** When the upload fails, keep the blob in memory
  and surface "Erneut hochladen" CTA that re-tries the same blob. Listen to
  `navigator.onLine`/`offline` events to swap the error copy to a
  network-specific one. Optionally queue failed uploads for later.
- **Spec impact:** gap in spec (continuous-capture spec covers happy path but
  not error recovery)

### invite-mint-page-has-no-copy-button

- **Severity:** Major
- **Evidence:** Playwright MCP, /admin/invites. After clicking "Neue Einladung
  erstellen", the invite URL is rendered inside a
  `<code class="invite-url">…</code>` element with no Copy button, no share
  intent, no "send to WhatsApp" link, and the page warns "Bitte kopiere diesen
  Code jetzt — er wird nicht erneut angezeigt." Source:
  `routes/admin/invites/index.tsx:37`.
- **Why it matters:** Owner mints the invite on phone right before the helper
  arrives. Selecting a long pseudo-random URL inside a `<code>` block on a
  mobile browser is awkward (touch-select on monospaced text). One slip and the
  warning means a new invite must be minted. The QR is good for in-person, but
  for remote helpers (text message) the copy ergonomics matter.
- **Suggested fix direction:** Add a "Kopieren" island button using
  `navigator.clipboard.writeText(inviteUrl)` with a "Kopiert" toast. Optionally
  render a `mailto:`/`sms:` share helper. Persist the secret server-side hashed
  but with an "explicitly revealed" flag so the user can re-view it within the
  session in case of mistake (acceptable per existing model since the page
  already shows it on POST).
- **Spec impact:** gap in spec (no copy/share affordance defined)

### invite-redemption-while-logged-in-hijacks-session-silently

- **Severity:** Critical
- **Evidence:** Playwright MCP. Logged in as `monster`. In the same browser
  opened the invite link `/invite/<code>`. The page rendered "Einladung
  annehmen" with no warning that the current session would be replaced. After
  clicking, `monster`'s session was overwritten by an auto-generated
  `helper-XXXX` account; subsequent navigation to /items showed that user.
  Source: `routes/invite/[code].tsx:10-19` — `ConfirmPage` has no session-state
  check.
- **Why it matters:** Owner casually scans/taps the QR they minted (to "preview"
  it), accepting overwrites their own login. Worse, the owner could send the
  link to themselves to test and lose admin access to their own session until
  they re-login. Helpers visiting the link from a shared device hijack each
  other's sessions.
- **Suggested fix direction:** In the GET handler for /invite/[code], if
  `ctx.state.session` exists, render a guard page: "Du bist bereits angemeldet
  als <username>. Diese Einladung erstellt einen neuen Benutzer und beendet die
  aktuelle Sitzung. Bist du sicher?" Require an explicit "Sitzung wechseln"
  confirmation. Better: if already logged in, refuse to consume the invite and
  link back to /items.
- **Spec impact:** gap in spec (no "redeem while authenticated" behavior)

### invite-redemption-creates-full-admin-user

- **Severity:** Critical
- **Evidence:** Playwright MCP + code review (`lib/invites/index.ts:47-109`).
  `consumeInvite()` creates a regular user entry with `["user", username]` keys
  — no role/scope flag. After redemption, the helper user sees every nav link
  the owner does — including "Einladungen" (admin), "Räume", "Kategorien",
  "Löschen" buttons on every item. The progress note "short-term invite: redeem
  as helper, verify scoped capabilities" — there are no scoped capabilities.
- **Why it matters:** This contradicts CLAUDE.md §1 ("plus a small number of
  short-lived invited helpers") and CLAUDE.md §8 (custom-auth ownership). A
  one-day helper currently has god-mode: can delete the entire inventory, mint
  indefinite-expiry invites for strangers, revoke owner's sessions. This is the
  single biggest persona risk for the move.
- **Suggested fix direction:** Add a `role: "owner" | "helper"` (or
  `capabilities: string[]`) to the user record. consumeInvite creates `helper`;
  helper UI hides Einladungen, Rooms-edit, Categories-edit, delete buttons.
  Middleware enforces role on admin endpoints (`/admin/*`, DELETE handlers).
  Default to "scan items into boxes" only.
- **Spec impact:** new behavior, needs proposal (helper-scope spec)

### invite-qr-png-not-downloadable

- **Severity:** Minor
- **Evidence:** Playwright MCP, /admin/invites. The QR is an inline SVG `data:`
  URL `<img>`. There is no "Download" link. The owner can long-press the image
  to save in some mobile browsers, but desktop has no obvious way to print the
  QR onto a small card.
- **Why it matters:** During the move you want a printed QR taped to the
  doorway: "scan this to help". Today only the URL and a screen-only image; no
  PDF/PNG download or print page for the QR.
- **Suggested fix direction:** Provide a `/invite/<id>/qr.png` (or just a
  print-friendly route) plus a "Drucken" button on the mint result, similar to
  box labels.
- **Spec impact:** gap in spec

### invite-link-warning-shown-once-but-not-truly-one-shot

- **Severity:** Nit
- **Evidence:** Code review of `routes/admin/invites/index.tsx`. The "Bitte
  kopiere diesen Code jetzt — er wird nicht erneut angezeigt." warning is
  technically truthful (POST response only). But reloading /admin/invites
  afterwards still shows the invite in the list (by id) — the user might expect
  to retrieve the URL again and panic when they can't.
- **Why it matters:** Mismatch between mental model ("the invite still exists;
  can I get its link?") and reality ("the raw code is gone — only the hash is
  stored"). A more direct copy would help: e.g. "Der Einladungslink wird aus
  Sicherheitsgründen nicht gespeichert. Wenn du ihn verlierst, widerrufe diese
  Einladung und erstelle eine neue."
- **Suggested fix direction:** Rewrite the warning to mention recovery path; on
  subsequent visits to /admin/invites, the existing invite row could carry a
  "Link verloren? Widerrufen und neu erstellen." inline hint.
- **Spec impact:** no spec needed

### mobile-bottom-nav-overflows-and-omits-invites

- **Severity:** Critical
- **Evidence:** Playwright MCP, viewport 375×812, /items. Top nav is
  `display:none`. Bottom nav contains: Gegenstände (75), Umzugskartons (87),
  Schnellerfassung (95), Kategorien (62), Räume (42), Abmelden (59) — total
  420px width vs 375px viewport. Abmelden's right edge sits at x=420, off-screen
  by ~45px. Crucially, "Einladungen" (admin/invites) is not in the bottom nav at
  all — only the hidden top nav has it. (Screenshot:
  /home/valor/projects/v2/servus/items-mobile.png)
- **Why it matters:** On mobile the owner has no UI path to mint invites — they
  must remember and type `/admin/invites`. The whole MVP helper flow starts
  here. Also: Abmelden is partially off-screen, which is annoying but not
  blocking.
- **Suggested fix direction:** Bottom nav must include Einladungen, or expose an
  "Admin/Mehr" menu (3-dot kebab) collecting Räume + Kategorien + Einladungen +
  Abmelden. Move primary "Schnellerfassung" to a centered FAB. At minimum:
  ensure the active set fits 375px without horizontal scroll.
- **Spec impact:** gap in spec (mobile nav inventory not specified)

### mobile-item-row-truncates-name-to-three-chars

- **Severity:** Critical
- **Evidence:** Playwright MCP, viewport 375×812, /items. Item names render as
  "(uN…" because the row layout (thumbnail + name + badge + quantity − ×1 +) is
  laid out in a single horizontal flow with the QuantityControl taking ~150px.
  Computed: item-name link rect is 4×26 px. Screenshot shows "(uN…" for 4 items
  in a row.
- **Why it matters:** Even an item _with_ a real name (e.g. "Sofa") would be
  hidden by the quantity controls in this layout. The wife browses /items and
  cannot read any name — the list is unusable as a list. This is the primary
  discovery surface.
- **Suggested fix direction:** Stack the row on narrow viewports — first line:
  thumbnail + name + badge, second line: meta + quantity control right-aligned.
  Or hide the inline quantity control on mobile and surface it on the detail
  page. Or move quantity to a secondary "long-press" interaction.
- **Spec impact:** bug against existing spec (quantity-island spec assumes the
  row is readable)

### mobile-tap-targets-below-44px

- **Severity:** Major
- **Evidence:** Playwright MCP, viewport 375×812, /items. Measured: theme toggle
  🌙 = 36×36, search button 🔍 = 39×43, quantity − = 29×44 (width), quantity + =
  29×44 (width), item-name link = 4×26, Räume nav link = 42×64 (width below 44,
  vertical OK). Apple HIG and Material both recommend ≥ 44×44 CSS px for primary
  touch targets.
- **Why it matters:** During a move, hands are dirty/sweaty; small targets cause
  mis-taps. The quantity decrement at 29px wide already triggers misclicks → may
  delete instead of decrement on adjacent rows.
- **Suggested fix direction:** Bump all `.btn-icon` / `.qty-btn` to min 44×44
  CSS px. Set `min-height: 44px` on bottom-nav links. Increase hit area for
  theme toggle.
- **Spec impact:** gap in spec (no accessibility tap-target policy)

### mobile-filter-selects-stack-but-search-row-cramped

- **Severity:** Minor
- **Evidence:** Playwright MCP screenshot. Search input (Suchen…) + 🔍 button
  sit on the same row as the Kategorie select; that row is 50% width each.
  Search box has very little room for a meaningful query, and the search button
  is only ~39px wide.
- **Why it matters:** Tight horizontal space on mobile makes the search field
  nearly unusable.
- **Suggested fix direction:** Stack the filters vertically below 480px;
  full-width search input.
- **Spec impact:** no spec needed

### i18n-orphan-keys-29-defined-but-unused

- **Severity:** Minor
- **Evidence:** Diff of `t("…")` calls vs keys in `lib/i18n/locales/de.ts`.
  Orphans include `auth.locked_out`, `categories.delete_confirm`,
  `rooms.delete_confirm`, `items.delete_confirm`, `boxes.delete_confirm`,
  `boxes.remove_item_confirm`, `invites.revoke_confirm`, `boxes.bulk_add_*`,
  `boxes.status.{empty,packed,delivered}`, `items.addPhoto`,
  `items.needsReview`, `nav.home`, `nav.inventory`, `nav.logout`,
  `error.{forbidden,server,unauthorized}`, `home.subtitle`,
  `action.{add,confirm,filter}`, `boxes.code_label`, `boxes.no_label`,
  `boxes.new_title`.
- **Why it matters:** Most of these confirm features the locale designer
  expected to exist but the UI never wired (delete-confirmation across all
  domain types, bulk_add for boxes, status badges, generic error pages).
  Indicates broken contracts — flagged already as separate findings. The dead
  translations also bloat the bundle.
- **Suggested fix direction:** Either implement the missing UI (preferred for
  delete_confirm + status badges + error pages) or remove the dead keys.
- **Spec impact:** see related findings (item-delete-button-no-confirmation,
  rooms-categories-delete-without-confirmation,
  box-detail-has-no-way-to-pack-existing-items)

### i18n-app-init-has-inline-german

- **Severity:** Major
- **Evidence:** `static/app-init.js:27-30` contains inline German:
  `"Einige Bilder konnten nicht geladen werden. "`, `"Seite neu laden →"`,
  `aria-label="Schließen"`. None go through `t()`. Violates CLAUDE.md §11.
- **Why it matters:** Future English (or other locale) support breaks here
  silently. The locale file lies — these strings aren't actually centralized.
- **Suggested fix direction:** Either expose i18n values into a
  `globalThis.__t = {...}` injected from the Fresh shell and read by
  app-init.js, or migrate the lazy-loader/banner to a Preact island that uses
  `t()` directly.
- **Spec impact:** bug against existing spec (CLAUDE.md §11 contract)

### i18n-auth-locked-out-defined-but-no-per-username-lockout

- **Severity:** Major
- **Evidence:** `lib/i18n/locales/de.ts:23` defines
  `"auth.locked_out": "Konto vorübergehend gesperrt. Bitte warte {seconds} Sekunden."`.
  `grep` shows no usage. `routes/login.tsx` only uses `auth.rate_limited` for IP
  rate-limit. CLAUDE.md §8 requires BOTH "per-IP rate limit AND per-username
  lockout with exponential backoff".
- **Why it matters:** The IP rate-limit alone is bypassable from any new IP.
  Per-username lockout is missing. A drive-by attacker can throw 1 attempt/IP
  against the wife's username across many IPs and never hit the limit.
- **Suggested fix direction:** Implement per-username failed-attempts counter
  with exponential backoff, surface via the existing `auth.locked_out` key. This
  is a security spec gap, not just i18n.
- **Spec impact:** bug against existing spec (auth security requirement in
  CLAUDE.md §8)

### i18n-no-singular-plural-handling

- **Severity:** Minor
- **Evidence:** `lib/i18n/locales/de.ts:190` defines
  `"boxes.bulk_add_result": "{count} Gegenstand/Gegenstände hinzugefügt."` —
  manual "/Plural" hack. `212` defines
  `"boxes.label_item_count": "{count} Gegenstände"` which is always plural even
  at count=1. `routes/items/index.tsx` builds the heading "50 neueste
  Gegenstände (21)" with no singular form when count=1.
- **Why it matters:** "1 Gegenstände" is grammatically wrong; "1
  Gegenstand/Gegenstände" is just lazy. German plural rules are simple (singular
  vs other) but the t() helper has no plural support.
- **Suggested fix direction:** Add `t.plural(key, n, vars)` that picks `key.one`
  vs `key.other` based on n. Migrate count-bearing strings.
- **Spec impact:** new behavior, needs proposal (i18n plural API)

### a11y-login-keyboard-and-focus-ok

- **Severity:** Nit
- **Evidence:** Playwright MCP, /login. Tab sequence: username → password →
  Anmelden (3 tabs). Each focused element has `outline: 2.4px solid` +
  `box-shadow: 0 0 0 3px rgba(26,95,168,0.2)`. Forms have `<label>` siblings. No
  accessibility issues on login.
- **Why it matters:** Confirms the security-critical entry point is
  keyboard-accessible.
- **Suggested fix direction:** None. This is the baseline; preserve it.
- **Spec impact:** no spec needed (positive finding)

### a11y-items-new-form-labels-ok

- **Severity:** Nit
- **Evidence:** Playwright MCP, /items/new. All 6 visible inputs (name,
  categoryId, roomId, boxId, quantity, estimatedValue) report
  `labels.length === 1`. Hidden CSRF inputs unlabeled (expected).
- **Why it matters:** Form accessibility on the primary create flow is OK.
- **Suggested fix direction:** None. (The filter selects on /items still lack
  labels — see items-filter-selects-lack-labels.)
- **Spec impact:** no spec needed

### invite-invalid-page-is-dead-end

- **Severity:** Major
- **Evidence:** Playwright MCP, /invite/<consumed-code>. Page body is exactly
  one paragraph: "Ungültiger oder abgelaufener Einladungscode." No nav, no link
  to /login, no "Erneut versuchen" or "Frag den Eigentümer um eine neue
  Einladung". Source: `routes/invite/[code].tsx:22-28` `InvalidInvitePage`.
- **Why it matters:** The helper who clicks an expired link is stranded — no
  obvious next step. The owner who is testing a flow with a consumed code sees
  the same dead end on browser-back navigation (browser back after redeeming →
  consent page reposts → consumed → invalid page). The wife would assume the app
  is broken.
- **Suggested fix direction:** Add a "Zur Anmeldung" link, or a single-line
  hint: "Bitte den Eigentümer um eine neue Einladung." Optionally a "Konto
  bereits aktiviert? Jetzt anmelden" CTA pointing to /login.
- **Spec impact:** gap in spec (no error-page navigation defined)

### invite-back-navigation-after-redemption-reposts

- **Severity:** Minor
- **Evidence:** Code review of `routes/invite/[code].tsx`. Browser back after a
  successful POST returns the user to the consent page; pressing "Einladung
  annehmen" again sends a second POST against the now-consumed code (which
  silently 404s via InvalidInvitePage). No idempotency hint.
- **Why it matters:** Helper goes back to "check the URL" by accident; sees the
  consent page; taps "annehmen" again; lands on dead-end error page.
  Confidence-eroding.
- **Suggested fix direction:** Either (a) the GET handler should detect a
  recently-consumed lookup and show "Bereits eingelöst — jetzt anmelden" page,
  or (b) the POST 303 redirect should set `Cache-Control: no-store` and a
  `history.replaceState` after redirect so back-button skips the consent page.
  Option (a) is simpler.
- **Spec impact:** gap in spec

### persona-owner-friction-points

- **Severity:** Major (composite)
- **Evidence:** Playwright MCP walkthrough as `monster` on desktop + mobile
  (375×812). Five-minute simulated session: login → /items → "Gegenstand
  hinzufügen" → fill form → save → adjust quantity on list → /boxes/<id> →
  packing a known item.
- **Why it matters (composite friction list):**
  - Default /items shows only 4 of 21 items behind a "50 neueste" heading
    (items-list-heading-misleading-when-recent-is-short). Owner has to click
    "Alle Gegenstände laden" every session.
  - To pack an existing item into a known box the owner must: open item → edit →
    change boxId → save (box-detail-has-no-way-to-pack-existing-items). No bulk
    add. No QR scan into box.
  - Capturing photos works but the in-flight "…" state on activation gives no
    escape (capture-activation-no-escape-while-permission-pending).
  - Box label page has no "Drucken" button
    (box-label-page-has-no-navigation-or-print-cta) — owner generates labels in
    batches and prints them, every batch needs ctrl-P + back.
  - Item detail page hides quantity, value, photos
    (item-detail-omits-quantity-value-box-and-photos) — owner can't "see all
    info" without entering edit mode.
  - On mobile, no path to /admin/invites
    (mobile-bottom-nav-overflows-and-omits-invites). Owner provisions helper
    invites from phone the day of the move — must type URL.
- **Suggested fix direction:** Treat each linked finding. Priority for owner UX:
  items-list-heading bug, box-detail-pack-existing-items, box-label print CTA.
- **Spec impact:** see per-finding entries.

### persona-wife-confusion-points

- **Severity:** Critical (composite)
- **Evidence:** Same walkthrough through a non-technical lens (does not know the
  code, just uses the UI).
- **Why it matters (composite confusion list):**
  - Lands on /items, sees 4 items, knows she added more, panics ("did data
    disappear?") — items-list-heading-misleading-when-recent-is-short.
  - Filters say "Alle Kategorie" / "Alle Raum" — looks broken
    (items-filter-placeholders-ungrammatical-german).
  - Searches a typo, sees "Noch keine Gegenstände vorhanden." — interprets as
    data loss (items-empty-state-conflates-no-data-with-no-results).
  - Wants to delete a duplicate room, taps Löschen, room is gone instantly with
    no confirm (rooms-categories-delete-without-confirmation). Same for items
    (item-delete-button-no-confirmation).
  - On mobile, every item card shows "(uN…" — list unusable
    (mobile-item-row-truncates-name-to-three-chars).
  - Quantity − at qty=1 silently does nothing
    (quantity-decrement-at-1-is-silent-no-op) — "the button is broken".
  - Item detail omits quantity/value/photos
    (item-detail-omits-quantity-value-box-and-photos) — "the data is gone".
  - Invite link on /admin/invites: no copy button; the URL warning says "wird
    nicht erneut angezeigt" but the URL itself is hard to select on mobile
    (invite-mint-page-has-no-copy-button).
  - If she accidentally taps the invite QR while logged in, her session is
    hijacked silently
    (invite-redemption-while-logged-in-hijacks-session-silently).
- **Suggested fix direction:** The wife persona is the persona most affected by
  the silent-failure / confusing-state defaults. Prioritize: confirmation
  dialogs (rooms/categories/items), honest heading on /items, mobile row layout,
  copy-button on invites, guard against self-hijacking.
- **Spec impact:** several gaps in spec (see per-finding entries).

### persona-helper-blockers

- **Severity:** Blocker (composite)
- **Evidence:** Same walkthrough simulating a one-day helper who redeemed an
  invite and is told "scan items into boxes". Tested as `helper-<random>` after
  invite redemption on the desktop browser, then verified mobile layout.
- **Why it matters (composite blocker list):**
  - **No restricted UI.** After redemption the helper sees the full admin nav —
    Einladungen included. They can delete the wife's entire inventory by
    accident (invite-redemption-creates-full-admin-user). This is the single
    biggest persona-blocker for the MVP.
  - **No "scan into box" core flow.** The MVP scenario is "open box, scan item,
    repeat". There is no scan flow. Helper would need to: navigate /boxes → find
    the box (no search/filter on /boxes) → open detail → tap "Kamera aktivieren"
    → capture a NEW item per photo. To pack EXISTING inventory into a box, see
    box-detail-has-no-way-to-pack-existing-items — there is no scan/lookup.
  - **No onboarding.** After invite-redemption the user lands at `/` (home) with
    no tour, no "Wie helfe ich?" hint. The persona expectation "obvious within
    ~30 seconds with no training" is not met.
  - **No identity.** Helper is `helper-xxxxxxxx` with a random password they
    don't know. They can't log back in if their session expires. If they tap
    Abmelden by accident, they're permanently locked out.
  - On mobile: the bottom nav shows Schnellerfassung but capture-from-box
    requires opening a specific box. No "Welcher Karton?" prompt.
- **Suggested fix direction:**
  - Implement helper role with restricted UI (hide everything except a single
    "Karton scannen" entrypoint) — see
    invite-redemption-creates-full-admin-user.
  - Define and build the "scan existing item into box" flow (camera reads
    QR/barcode on item label → confirm → add to current box).
  - Helper landing page: full-screen "Wähle einen Karton" picker → bound state.
    Bonus: "Wenn du fertig bist, schließe einfach den Tab."
  - Persist helper credentials: show username + display "Du wirst eingeloggt
    bleiben, bis dein Sitzung abläuft (24h)". Add a "Mein Code" view that
    re-shows the redemption URL bound to this account for re-auth.
- **Spec impact:** new behavior, needs proposal (helper persona spec)

### dev-capture-test-route-is-reachable-and-untranslated

- **Severity:** Major
- **Evidence:** Read `routes/dev/capture-test.tsx`. The route is in the routes
  tree with no `Deno.env`/production guard. Contains inline English copy ("Photo
  Capture – Dev Harness", "This page is for development testing only. Use a real
  phone…") in violation of CLAUDE.md §11. It also renders
  `PhotoCapture mode="append" itemId="__dev__"` — uploading a photo here POSTs
  append-photo with a bogus item id.
- **Why it matters:** Any logged-in user (including the one-day helper) can
  stumble on /dev/capture-test, see English copy that breaks the German-only
  contract, and trigger a server error or pollute R2 with orphan uploads. Also a
  confusing surface for non-technical users.
- **Suggested fix direction:** Gate the route behind
  `Deno.env.get("DENO_DEPLOYMENT_ID") === undefined` (or an explicit
  `SERVUS_DEV=1`) and return 404 in prod; or move the file out of `routes/`.
  Either way, translate the copy or mark it explicitly dev-only.
- **Spec impact:** gap in spec (no policy for dev-only routes)

---

## Deferred (post-MVP ideas)

- Autosave / draft-state preservation for partially-filled item-create form
  (refresh wipes today).
- "Mein Konto" page that lets a user change their own password (currently
  impossible).
- Bulk-move feature for boxes between rooms (no UI exists; locale already has
  `boxes.bulk_add_*` orphans).
- Mark item as packed via barcode/QR scan of item label.
- Thumbnail variants on upload (compose with
  items-thumbnails-are-full-size-images for a real win).
- Plural-aware `t.plural(key, n)` helper.
- Print-friendly route for bulk QR-code label sheets (e.g. 8 per A4).
- "Letzte Aktivität" feed on home for owner/wife to see what helpers did during
  the move.
- Service worker / offline queue for capture uploads when mobile signal drops.
- Long-press to multi-select items for batch box-assignment.
