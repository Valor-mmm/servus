## Context

`routes/boxes/[id]/label.tsx` renders a raw HTML `Response` (not a Fresh JSX
page). The full HTML string is assembled in the GET handler and returned
directly. The inline `<style>` block already contains an `@media print` section
that removes padding and tightens the border. The page is auth-gated by Fresh
middleware.

## Goals / Non-Goals

**Goals:**

- Add a screen-only toolbar above the label card with a Drucken button and a
  Zurück link.
- Keep the printed output identical to what it is today.
- Use `t()` for all copy.

**Non-Goals:**

- Batch printing, PDF export, or server-side print.
- Changing the label card layout.

## Decisions

### 1. Print trigger: inline script vs. `onclick` attribute

**Decision:** Add a small `<script>` block at the bottom of `<body>` that
registers a `click` listener on the print button by ID.

**Why not `onclick="window.print()"` attribute:** Inline event handlers are
marginally cleaner to avoid in new code, even though the label page already uses
inline `<style>`. Using a script block keeps the HTML attribute-free and is
consistent with the `app-init.js` pattern already in the codebase.

**Why not a separate `.js` file / island:** The label page is a raw HTML
response, not a Fresh page. Adding a static asset for three lines of JS would
require a separate file under `static/` and a cache-busting strategy — not worth
it for this scope.

**CSP note:** The label page already requires `style-src: 'unsafe-inline'` for
its inline `<style>` block (pre-existing Minor finding
`csp-style-src-unsafe-inline`). Adding a single `<script>` block adds
`script-src: 'unsafe-inline'` to the same page. This is acceptable for this
isolated, auth-gated page and is noted explicitly here so it is not forgotten
when the CSP hardening pass happens.

### 2. Toolbar placement: above or below the label card

**Decision:** Above the label card.

**Why:** The owner opens the page, glances at the label to verify it's the right
box, then immediately wants to print. Having Drucken at the top avoids scrolling
on small screens. The Zurück link is secondary but logically paired with
Drucken.

### 3. i18n: new key vs. reuse

**Decision:** Add `boxes.action.print` = "Drucken". Reuse the existing
`action.back` = "Zurück".

**Why a new key:** `boxes.action.print` is more semantically specific than a
generic "print" key and keeps box-related copy namespaced consistently.

## Implementation Shape

### CSS additions to `STYLES`

```css
@media screen {
  .toolbar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    align-items: center;
  }
  .toolbar-btn {
    padding: 0.5rem 1.25rem;
    font-size: 1rem;
    cursor: pointer;
    border: 2px solid #111;
    background: #111;
    color: #fff;
    border-radius: 4px;
  }
  .toolbar-link {
    font-size: 1rem;
    color: #333;
    text-decoration: underline;
  }
}
@media print {
  .toolbar {
    display: none;
  }
}
```

### HTML additions

Above the `.label-card` div:

```html
<div class="toolbar">
  <button id="print-btn" class="toolbar-btn">
    ${esc(t("boxes.action.print"))}
  </button>
  <a class="toolbar-link" href="/boxes/${esc(box.id)}"
  >${esc(t("action.back"))}</a>
</div>
```

Before `</body>`:

```html
<script>
document.getElementById("print-btn").addEventListener("click", function () {
  window.print();
});
</script>
```

### i18n additions (`lib/i18n/locales/de.ts`)

```ts
"boxes.action.print": "Drucken",
```

### Spec delta (`openspec/specs/boxes/spec.md`)

Append to the `Box label page` requirement section:

```
The label page MUST also render a screen-only toolbar (hidden in `@media print`)
containing a print trigger and a back link to the box detail page.
```

And one new scenario:

```
#### Scenario: Toolbar is visible on screen but hidden when printing

- **WHEN** an authenticated user opens the label page in a browser
- **THEN** a "Drucken" button and a "Zurück" link are visible above the label card
- **AND** the toolbar is absent from the printed output
```

## Risks / Trade-offs

- **CSP: inline script**: see Decision 1. Contained to this page; tracked as a
  known pre-existing gap.
- **Print button on old iOS WebKit**: `window.print()` is supported on all
  modern browsers including Safari on iOS 13+. No polyfill needed.
