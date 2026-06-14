# Design — nav-overflow-menu

## Current state

`routes/_app.tsx` renders two navs for authenticated users:

- **Desktop** `nav.top-nav`: logo, Items, Boxes, Categories, Rooms, Admin, theme
  toggle, Logout — has horizontal room, untouched here.
- **Mobile** `nav.bottom-nav`: Items, Boxes, ➕ Quick-add, Categories, Rooms,
  Logout — six entries, overflows; Logout clips on phones / PWA.

A separate mobile theme FAB exists below the bottom nav (unchanged).

## Target bottom bar

```
┌────────┬────────┬────────┬────────┐
│ 📦     │ 🗃️     │ ➕     │ ☰      │
│ Items  │ Boxes  │ Quick  │ Mehr   │
└────────┴────────┴────────┴────────┘
```

Four slots. Quick-add keeps its existing distinct styling (`nav-quick-add` — see
the design-system "Quick-add visual distinction" requirement, which still
holds). "Mehr" is a normal nav link to `/mehr`.

**Decision: keep ➕ Quick-add in the bar.** The owner noted capture mostly
happens via Boxes, but Quick-add is a fast, one-tap capture worth a primary
slot, and it already has bespoke styling. If it later proves unused it can move
into Mehr with no structural change. (Alternative considered: Items · Boxes ·
Mehr — three slots — rejected as too sparse and losing the quick capture
affordance.)

## The Mehr page (`routes/mehr.tsx`)

A plain authenticated route — same `define.handlers` + `ctx.state` pattern as
existing pages — rendering a vertical list:

```
Mehr
─────────────
🏷️  Kategorien        → /categories
🏠  Räume             → /rooms
🛠️  Verwaltung        → /admin
🎨  Design            → theme control (reuse data-theme-toggle button)
🚪  Abmelden          → POST /logout (CSRF form)
```

- **Island-free.** Just links + the logout `<form>` + the existing
  `data-theme-toggle` button (the theme script is already global). No
  bottom-sheet, no new island.
- **Logout** keeps `state.csrfToken` in a hidden input, exactly as today.
- Future secondary destinations (**Gruppen**, **Kategorietypen** at
  `/categories/schemas`) are added here as one-line links when they ship — this
  page is their home, so future changes touch only this file, not the bar.
- Auth: the route renders only for `state.user`; like other pages it relies on
  the existing auth middleware to redirect anonymous requests to login.

## i18n

Add `nav.more` ("Mehr") and a page title `menu.title` ("Mehr"). Reuse existing
keys for the destinations (`nav.categories`, `nav.rooms`, `admin.nav`,
`auth.logout`, `nav.toggleTheme`). No literal copy in the component.

## Active-state

The existing `navActive(path, href)` helper styles the current tab. `/mehr` gets
the same treatment so the Mehr tab highlights when on the menu page. (Optional
nicety: also highlight Mehr when on a secondary page like `/categories`;
deferred — not worth the path-matching complexity for v1.)

## Out of scope / deferred

- Desktop top nav restructure (has room).
- Animated slide-up sheet (plain page is the MVP).
- Moving Quick-add into Mehr (kept in the bar for now).
- Highlighting Mehr for descendant secondary routes.

## Testing

- **Unit/render**: render the app shell (or the bottom-nav fragment) and assert
  it contains `/items`, `/boxes`, quick-add, and `/mehr`, and does _not_ contain
  `/categories`, `/rooms`, or a logout form. Render `/mehr` and assert it lists
  the secondary links + logout form.
- **E2E**: on a mobile viewport, the bottom bar shows the four entries; tapping
  Mehr opens the menu; the secondary destinations are present; logout from Mehr
  returns to the login screen.
