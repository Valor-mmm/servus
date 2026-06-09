## Why

The box label page (`/boxes/:id/label`) is designed for printing, but has no
print button and no way to navigate back. The owner prints labels in batches
during the move — today they must use the browser's native print menu (buried
under a hamburger or three-dot menu on mobile) and use the hardware back button
or swipe gesture to return. Adding a visible "Drucken" button and a "Zurück"
link removes two friction points from an action that happens repeatedly on move
day.

The toolbar is screen-only: it is hidden in `@media print` so it never appears
on the printed label itself.

## What Changes

- **Drucken button**: a button that triggers `window.print()` is shown above the
  label card on screen. Hidden in print media.
- **Zurück link**: a link back to `/boxes/:id` (the box detail page) is shown
  alongside the Drucken button. Hidden in print media.
- **i18n**: one new key `boxes.action.print` ("Drucken"). The back link reuses
  the existing `action.back` key.
- **Spec delta**: the `Box label page` requirement in `openspec/specs/boxes/`
  gains a new sentence and scenario covering the screen-only toolbar.

## Non-Goals

- No server-side print endpoint or PDF generation.
- No batch-print UI (print multiple labels in one browser dialog) — the owner
  opens each label in a new tab.
- No change to the label card layout or content.
- No new dependencies.

## Capabilities

### Modified Capabilities

- `boxes`: label page gains a screen-only print toolbar (Drucken + Zurück).
