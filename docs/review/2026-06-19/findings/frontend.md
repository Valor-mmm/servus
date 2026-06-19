# Frontend findings

<!-- Area checkpoints appended as review progresses. Each area ticked in
     progress/frontend.md before moving on. -->

---

## Area: islands/ContainerField

### [NIT] ContainerField island is dead code — never imported
- **Where:** `islands/ContainerField.tsx` (entire file)
- **Relation:** quality
- **Evidence:** A codebase-wide grep for `ContainerField` finds zero imports outside the file itself. The functionally equivalent `islands/ItemLocationFields.tsx` is what routes use (new-item and edit-item forms). `ContainerField` handles only the simpler container+room case (no box), whereas `ItemLocationFields` covers all three placement axes. The dead island is still bundled by Fresh when the router discovers it.
- **Recommendation:** Delete `islands/ContainerField.tsx`. If the simpler 2-field layout is ever needed, extract a shared component rather than maintaining a parallel island.

---

## Area: islands/ContainerSelector

### [MINOR] No keyboard navigation in the container accordion / search list
- **Where:** `islands/ContainerSelector.tsx` lines 142–221
- **Relation:** quality
- **Evidence:** The search results and accordion body render `<button>` elements via `onMouseDown` (correct: prevents blur before click). However, the accordion headers and option buttons have no `aria-expanded`, `role="combobox"`, or other ARIA attributes. A keyboard user can Tab into the panel but has no indication of expanded state. On mobile (primary device) this is less critical, but it remains an a11y gap.
- **Recommendation:** Add `aria-expanded={expandedRoom.value === room.id}` to each accordion header button; add `role="listbox"` on the results container and `role="option"` on each option button, or keep the `<button>` pattern and add an `aria-label` on the surrounding `<div class="container-selector-panel">`.

### [NIT] `loading` signal is a string id, not a boolean — misleading type
- **Where:** `islands/ContainerSelector.tsx` line 28
- **Relation:** quality
- **Evidence:** `const loading = useSignal<string | null>(null)` uses the room id (or the literal `"search"`) as the loading token. This is a creative but non-obvious idiom; a new developer reading it will need to trace usages to understand it. A `loadingRoomId` name would make intent obvious.
- **Recommendation:** Rename `loading` to `loadingRoomId` (or extract a typed union) to communicate intent.

---

## Area: islands/GroupAutocomplete

### [MINOR] `onBlur` closes list with a 120ms timeout — touch-tap race on slow devices
- **Where:** `islands/GroupAutocomplete.tsx` line 48
- **Relation:** quality
- **Evidence:** `onBlur={() => setTimeout(() => (open.value = false), 120)}` combined with `onMouseDown` `e.preventDefault()` on option buttons is the standard pattern to let a click fire before blur closes the list. 120ms is the typical safe window on desktop. On Android WebView (which the wife's phone likely uses) the composite delay between touchstart and mousedown can exceed 100ms under load, meaning the list may close before the tap registers as `onMouseDown`, causing the pick to fail silently.
- **Recommendation:** Replace the timeout with a `pointerdown` + `e.preventDefault()` guard on each option (already done via `onMouseDown`) — the current approach is close but the timeout value could be raised to 200ms for safety, or replaced with a `mousedown` + `blur` flag pattern.

---

## Area: islands/GroupReorder

### [NIT] Arrow aria-labels are raw Unicode symbols, not i18n keys
- **Where:** `islands/GroupReorder.tsx` lines 59, 67
- **Relation:** quality (i18n contract, CLAUDE.md §11)
- **Evidence:** `aria-label="↑"` and `aria-label="↓"` are passed directly without `t()`. Screen readers may announce these as "up arrow" / "down arrow" (VoiceOver) or speak the Unicode codepoint name (TalkBack). The i18n contract requires all accessible text to go through `t()`.
- **Recommendation:** Add `"groups.reorder_up": "Nach oben"` and `"groups.reorder_down": "Nach unten"` to `de.ts`, then use `aria-label={t("groups.reorder_up")}` / `t("groups.reorder_down")`.

---

## Area: islands/ItemCategoryFields

No defects found.

- `useSignal` for the selected category id is minimal and correct.
- `SchemaFields` is a pure server-renderable component embedded inside the island — the island exists precisely to update the schema fields live on category change, which is a valid interactive requirement.
- Props are typed, all copy goes through `t()`, markup is clean.

---

## Area: islands/ItemLocationFields

### [MINOR] Spec requires hiding container field when box is selected, but it is hidden not disabled — no hidden-input sentinel clears containerId on submission
- **Where:** `islands/ItemLocationFields.tsx` lines 71–83
- **Relation:** spec-violation (containment/spec.md — "Selecting a box MUST clear and disable the container assignment field")
- **Evidence:** When `boxId.value !== null` (containerLocked), the `ContainerSelector` block is not rendered at all (`!containerLocked` guard). The `containerId` hidden input on line 71 submits `""` regardless, which is correct — it will send an empty string to the server. However the spec says "clear **and disable**" — the intent is to show the field in a disabled state so the user sees the mutual-exclusion relationship. The current implementation just hides the container field, which is functionally safe but fails the UX of "disable" (the field disappears entirely rather than being visually locked).
- **Recommendation:** When `containerLocked`, render `ContainerSelector` in a read-only/disabled state (or a plain text label) instead of hiding it, so the user can see the mutual exclusion. Alternatively, update the spec to say "clear and hide" if hide is the intended UX.

### [NIT] Dead `if (v)` block comment with no code path
- **Where:** `islands/ItemLocationFields.tsx` lines 106–109
- **Relation:** quality
- **Evidence:** The `onChange` handler for the room select has `if (v) { // selecting a room is compatible… }` with no code inside the block — the comment is noise, the block does nothing.
- **Recommendation:** Remove the empty `if (v)` block.

---

## Area: islands/NativePhotoCapture

### [MINOR] `handleFinish` calls `globalThis.location?.reload()` — blunt page reload discards unsaved form state
- **Where:** `islands/NativePhotoCapture.tsx` line 177
- **Relation:** spec-gap
- **Evidence:** In `mode !== "attach-to-form"` (quick-add / append), after photos upload, "Fertig" triggers a full page reload. If the island is embedded on a page with other unsaved form fields, those fields are lost. On quick-add (`/items/quick-add`) this is the only action so it is safe; on item edit (`/items/[id]/edit`) the `mode` prop passed is `"append-to-item"`, so it fires. If an edit page had a partial form fill when the user clicks Fertig, data is discarded silently.
- **Recommendation:** Check the calling route's mode. For `append-to-item` on the edit page, emit a custom event instead of reloading, letting the page decide. Or, verify that `NativePhotoCapture` on the edit page is always in `"attach-to-form"` mode (which does not show the Fertig button) and document the invariant.

### [NIT] Preview alt text is empty string — correct for decorative, but screen reader gets no context
- **Where:** `islands/NativePhotoCapture.tsx` line 192
- **Relation:** quality
- **Evidence:** `<img src={previews.value[p.id]} alt="" class="capture-preview-thumb" />` — `alt=""` marks the image as decorative, but in context it is a thumbnail of the item the user just photographed. The upload status (uploading/failed/done) is conveyed by the wrapper class but not announced to screen readers.
- **Recommendation:** Set `alt={t("items.capturedPhotoAlt")}` (add key) or at minimum describe the upload state: `alt={t(`items.photoStatus_${p.status}`)}`.

---

## Area: islands/QuantityControl

No defects found.

- Optimistic update + server rollback on failure is correct.
- `busy` guard prevents double-submit.
- `Math.max(1, prev + delta)` enforces minimum quantity client-side (server enforces on its side too).
- All copy via `t()`. aria-labels present.
- The `readonly` prop correctly renders a static label instead of controls, avoiding an island for list-view contexts.

---

## Area: components/BottomNav

### [MAJOR] Prefix-match bug: `/items/quick-add` activates both "Gegenstände" and "Schnellerfassung" nav tabs simultaneously
- **Where:** `components/BottomNav.tsx` lines 3–6, 15–28
- **Relation:** spec-gap (confirmed root cause of UI-3 in uiux.md)
- **Evidence:** The `active()` helper checks `current.startsWith(href + "/")`. When path is `/items/quick-add`:
  - Items tab: `"/items/quick-add".startsWith("/items/")` → `true` → `nav-active` applied
  - Quick-add: exact match `/items/quick-add === /items/quick-add` → `nav-quick-add` + `active()` → both active simultaneously
  A user sees two highlighted tabs, breaking the invariant that exactly one tab is active at a time.
- **Recommendation:** Exclude explicit child-route overrides in the `active()` function, or check most-specific-first. The simplest fix: in the Items tab, check `current.startsWith("/items/") && !current.startsWith("/items/quick-add") && !current.startsWith("/items/pending")` — or restructure quick-add to live under `/quick-add` to avoid the prefix collision.

### [MINOR] BottomNav `active()` returns a string with a leading space — `.trim()` workaround is fragile
- **Where:** `components/BottomNav.tsx` lines 3–6, 16–17
- **Relation:** quality
- **Evidence:** `active()` returns `" nav-active"` (leading space) or `""`. Callers do `.trim() || undefined` to avoid setting `class=" nav-active"`. The quick-add link uses template literal `` `nav-quick-add${active(...)}` `` which produces `"nav-quick-add nav-active"` correctly, but the trim-or-undefined pattern for other links is inconsistent and fragile (a caller that forgets `.trim()` would get an extra leading space in `class`). The same pattern also exists in `routes/_app.tsx` line 7-8 for the top nav.
- **Recommendation:** Change `active()` to return `"nav-active"` (no leading space) and change callers to `class={["items", active(path, "/items")].filter(Boolean).join(" ") || undefined}`, or return the full merged class string from the helper.

---

## Area: components/ItemGroupsEditor

No defects found.

- Correctly a server-rendered **component** (not an island) — the only interactive child is `GroupAutocomplete`, which is an island imported correctly.
- Remove-group forms POST directly; the island handles the autocomplete; all correct.
- i18n: all copy via `t()`.
- The comment "island-free find-or-create" in the JSDoc is slightly misleading (it does use `GroupAutocomplete` island) but not a user-visible defect.

---

## Area: components/SchemaEditorForm

### [MAJOR] `data-confirm` attribute on the delete form has no JavaScript handler wired up
- **Where:** `components/SchemaEditorForm.tsx` line 113; `static/app-init.js` (entire file)
- **Relation:** spec-gap
- **Evidence:** The delete form uses `data-confirm={t("schemas.delete_confirm", ...)}` but `app-init.js` contains no listener for `data-confirm` on form submit. A codebase-wide search finds no event delegation for this attribute. The delete button therefore submits immediately without confirmation — identical to the category/room delete UX noted in UX-23/UX-27. This is the only place in the codebase where `data-confirm` is used, making it a spec-gap (the guard was intended but never wired).
- **Recommendation:** Either add a form `submit` event listener in `app-init.js` that reads `data-confirm` and calls `window.confirm()`, or replace `data-confirm` with a POST-to-confirmation-page pattern consistent with the rest of the app (boxes and items use server-side confirmation pages).

### [MINOR] Schema editor shows `options` textarea for every field type, including `text`, `number`, `date`, `boolean` — confirmed root cause of UX-22
- **Where:** `components/SchemaEditorForm.tsx` lines 47–53 (`FieldRow` component)
- **Relation:** quality (UX-22 root cause)
- **Evidence:** `FieldRow` always renders the "Auswahlmöglichkeiten" textarea regardless of `type`. The textarea is only meaningful for `type === "enum"`. For other types it is confusing (the label says "Auswahlmöglichkeiten" but those values are meaningless for a text or date field) and wastes vertical space. Because `SchemaEditorForm` is a pure server-rendered component with no island, it cannot toggle the textarea dynamically based on type selection — this would require converting the form (or the field row) to an island.
- **Recommendation:** Convert `FieldRow` into an island so it can hide/show the options textarea when `type` changes, or at minimum gray-out and `disabled` the options textarea for non-enum types server-side.

### [MINOR] Spare blank rows make it impossible to remove an existing field — confirmed root cause of UX-21
- **Where:** `components/SchemaEditorForm.tsx` lines 71–104
- **Relation:** quality (UX-21 root cause)
- **Evidence:** The form renders `existing.length + spareRows` rows (default 5 spare). Existing fields appear first; blank rows follow. There is no delete/remove button per row, and no way to clear an existing field (submitting a blank label leaves the field in place server-side — not confirmed here, but the UI offers no mechanism). The only way to grow fields is by filling the blank rows. This is the root cause of the "five fixed field rows, no add/remove" finding from UX.
- **Recommendation:** Add a remove button (or a "delete" checkbox) to each existing field row; convert the add-field UX to a client-side island that appends rows dynamically.

---

## Area: components/SchemaFields

No defects found.

- `SchemaFields` (editable) and `SchemaFieldsDisplay` (read-only) are clean, well-typed server-rendered components.
- `readMetadataFromForm` correctly scopes submitted values with the `meta.` prefix.
- `td()` (runtime-key translation) is used correctly for field labels and enum options — this is the right choice since keys come from the database schema, not compile-time constants.
- The boolean display uses a `✓` / `–` symbol — not through `t()`, but these are presentational glyphs, not translatable prose, so this is fine.

### [NIT] `SchemaFieldsDisplay` assigns `key` to fragment children rather than the outer fragment
- **Where:** `components/SchemaFields.tsx` lines 104–109
- **Relation:** quality
- **Evidence:** The `dt`/`dd` pair is returned inside an anonymous `<>...</>` fragment. The `key` props are on the inner elements (`dt key={${field.key}-dt}`, `dd key={${field.key}-dd}`) rather than on the outer fragment. Preact requires keys on the iterated element — the fragment — to reconcile the list. Keys on inner elements inside an un-keyed fragment are ignored by the reconciler, making list-diffing O(n) for updates.
- **Recommendation:** Change to `<Fragment key={field.key}><dt>…</dt><dd>…</dd></Fragment>` (import `Fragment` from `preact`).

---

## Area: lib/styles + _app.tsx CSS architecture

### [MINOR] `app-init.js` contains hardcoded German strings that bypass the i18n system
- **Where:** `static/app-init.js` lines 65–68
- **Relation:** spec-violation (CLAUDE.md §11 — all user-visible copy must go through `t()`)
- **Evidence:** The lazy-thumbnail error banner is built with raw JavaScript string concatenation:
  ```js
  b.innerHTML = "Einige Bilder konnten nicht geladen werden. " +
    '<a href="" ...>Seite neu laden →</a>' +
    '<button ... aria-label="Schließen" ...>✕</button>';
  ```
  Three German strings bypass `de.ts` entirely: the banner message, the reload link text, and the dismiss button's `aria-label`. Because `app-init.js` is a plain `.js` file loaded before hydration, it cannot import `t()`. This is a structural gap.
- **Recommendation:** Options in order of preference: (a) Move the error-banner responsibility to a Preact island that can use `t()` and accept a trigger from app-init; (b) Read the strings from the DOM (inject them as `data-` attributes from the server in `_app.tsx`); (c) Create a parallel `app-strings.js` generated from `de.ts` at build time. Option (a) is the cleanest long-term.

### [NIT] `.btn-small` has a 44px `min-height` mobile floor but the CSS comment says "44px per iOS HIG" — WCAG requirement is 24×24 CSS px, iOS HIG is 44pt
- **Where:** `static/styles.css` lines 809–813
- **Relation:** quality
- **Evidence:** The 44px value is correct and beneficial. The comment is slightly inaccurate — WCAG 2.5.5 (AAA) specifies 44×44 CSS px, but it's AAA, not AA. iOS HIG recommends 44pt logical pixels (same value). The floor is good; the comment misleads future maintainers about the normative source.
- **Recommendation:** Correct comment to `/* 44px touch target floor — iOS HIG / WCAG 2.5.5 (AAA) */`.

### [NIT] `capture-preview-thumb` border-radius uses a hard-coded `4px` instead of the `--servus-radius-sm` token
- **Where:** `static/styles.css` line 973
- **Relation:** quality
- **Evidence:** `border-radius: 4px` while the token `--servus-radius-sm: 0.25rem` (= 4px at 16px base) is available. Minor inconsistency — the values happen to be equal but a future token change would not propagate.
- **Recommendation:** Replace with `border-radius: var(--servus-radius-sm)`.

### Overall CSS architecture: no major issues
The CSS is well-structured: a single `styles.css` with a clear design-token preamble, two named themes via `html.theme-*` classes, consistent variable usage throughout, responsive breakpoints at 768px, `prefers-reduced-motion` guards on animations, and `sr-only` for accessibility. No dead or duplicated rule sets detected at a glance. Token coverage is high — only the one `4px` hard-code noted above slipped through.

---

## Area: i18n sweep (routes + islands + components)

### [MINOR] `static/app-init.js` contains three German strings outside the i18n system (see CSS architecture area above — same finding, cross-referenced)
- **Where:** `static/app-init.js` lines 65–68
- **Relation:** spec-violation (CLAUDE.md §11)
- (Duplicate reference; full details in the CSS architecture section above.)

### [NIT] `/routes/dev/capture-test.tsx` contains English strings with no i18n wiring
- **Where:** `routes/dev/capture-test.tsx` lines ~11–26
- **Relation:** quality (CLAUDE.md §11 — technically in scope since authenticated users can reach the route)
- **Evidence:** `"Photo Capture – Dev Harness"`, `"This page is for development testing only…"`, and three `<h2>` mode labels are hardcoded English in JSX.
- **Recommendation:** Since this is a dev-only harness page, either gate it behind a `DENO_ENV !== "production"` check so it is not reachable in production, or add a comment acknowledging the intentional i18n bypass. If it ships to production it is a spec violation.

### [NIT] `islands/GroupReorder.tsx` uses `aria-label="↑"` / `aria-label="↓"` (see GroupReorder area above)
- (Duplicate reference — already documented.)

### All other routes/islands/components: clean
Every user-visible string in JSX/TSX across all 27 source files reviewed goes through `t()` or `td()`. No inline German prose or English user-visible text found outside the three items above.

---

## Area: Islands-vs-components hydration audit

### [MINOR] `islands/ContainerField.tsx` is an island that is never mounted — unnecessary hydration budget allocation
- **Where:** `islands/ContainerField.tsx`
- **Relation:** quality
- **Evidence:** Fresh 2 discovers all files in `islands/` and includes them in the hydration manifest, even if no route ever renders them. The dead island wastes bundle space and contributes to the initial JS payload. (Already documented as a NIT in the ContainerField area above — severity raised to MINOR here because of the hydration cost angle.)
- **Recommendation:** Delete `islands/ContainerField.tsx`.

### Correct island placement confirmed for all live islands:

| Island | Interactive requirement | Verdict |
|---|---|---|
| `ContainerSelector` | Fetches containers on demand, manages accordion/search state | Needs island ✓ |
| `GroupAutocomplete` | Filters suggestions live, manages dropdown open/close | Needs island ✓ |
| `GroupReorder` | Client-side drag-free reorder via up/down buttons | Needs island ✓ |
| `ItemCategoryFields` | Updates schema fields live on category change | Needs island ✓ |
| `ItemLocationFields` | Mutual-exclusion of container/room/box signals | Needs island ✓ |
| `NativePhotoCapture` | File input, fetch uploads, live preview | Needs island ✓ |
| `QuantityControl` | Live +/– with optimistic update | Needs island ✓ |

### Correct component placement (server-rendered only):

| Component | Has interactive child | Verdict |
|---|---|---|
| `BottomNav` | No | Correctly a component ✓ |
| `ItemGroupsEditor` | Yes — embeds `GroupAutocomplete` island | Correctly a component (island inside is fine) ✓ |
| `SchemaEditorForm` | No client interaction currently | Correctly a component; field-type toggling would need an island if added ✓ |
| `SchemaFields` | No — used inside `ItemCategoryFields` island | Correctly a component ✓ |

No server-only code leaks into island files found (no KV imports, no Deno server APIs). No client-only Web APIs in component files found.

---

## Summary

**Findings count: 2 MAJOR / 8 MINOR / 8 NIT**

### Top 3 to fix (by move-day impact)

1. **[MAJOR] BottomNav prefix-match bug** (`components/BottomNav.tsx` lines 3–6): Two nav tabs light up simultaneously on `/items/quick-add`. Every user sees this on every quick-add session. One-line fix.

2. **[MAJOR] `data-confirm` delete form has no JS handler** (`components/SchemaEditorForm.tsx` line 113 / `static/app-init.js`): Schema type deletion fires immediately with no confirmation — identical to the unconfirmed category/room deletes reported in UX-23/UX-27. The `data-confirm` attribute was intended as a guard but was never wired. Add a form-submit listener to `app-init.js`.

3. **[MINOR] `app-init.js` German strings bypass i18n** (`static/app-init.js` lines 65–68): Three user-visible German strings (error banner, reload link, close button) live outside `de.ts`. Not move-day critical but violates the i18n contract and would break if a second locale were ever added.

---

## Observations

- The CSS token system is genuinely well-designed — two themes sharing a single component stylesheet via `html.theme-*` class swaps is a clean pattern with low future maintenance cost.
- `QuantityControl` is a textbook example of a well-scoped island: tiny state, optimistic update, clean rollback. It is the best-written island in the codebase.
- `ItemLocationFields` correctly handles the three-way mutual exclusion (container/room/box) with Preact signals. The logic is non-trivial and correct. The only gap is the "disable vs hide" distinction for the container field when a box is selected.
- The `t()` / `td()` split (compile-time key-check vs runtime fallback) is a good design decision for handling database-driven schema field labels.
- Fresh 2 idioms are used consistently: route handlers are thin, business logic is in `lib/`, islands are islands and components are components. No server-only KV or Deno APIs leak into island files.
