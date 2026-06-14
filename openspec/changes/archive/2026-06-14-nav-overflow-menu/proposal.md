## Why

The mobile bottom navigation crams six entries — Items, Boxes, Quick-add,
Categories, Rooms, and Logout. On a phone (and especially when installed as a
PWA) they no longer fit: the Logout action is clipped off the edge. There is no
room to add the upcoming Groups destination, and Categories/Rooms don't earn
prime tab space anyway — they're rarely used day to day.

This change shrinks the bottom bar to the genuinely primary destinations and
moves everything else behind a single **"Mehr"** (More) entry that opens a
secondary menu. It fixes the clipped logout and unblocks future nav additions.

## What Changes

User-visible:

- The mobile bottom bar is reduced to four slots: **Items**, **Boxes**, **➕
  Quick-add**, and **Mehr**. Quick-add keeps its distinct styling.
- A new **"Mehr" menu** (a server-rendered page at `/mehr`) collects the
  secondary destinations: **Kategorien**, **Räume**, **Verwaltung** (admin), the
  **Design** (theme) control, and **Abmelden** (logout). It is the home for
  future secondary destinations such as **Gruppen** and the existing
  **Kategorietypen** schema editor (`/categories/schemas`).
- Logout is no longer clipped — it lives on the Mehr page as a normal,
  full-width action (still a CSRF-protected POST form).
- The desktop top navigation is unchanged.

Internal:

- The bottom-nav markup in `routes/_app.tsx` drops the Categories/Rooms/Logout
  links and gains a single `/mehr` link.
- A new `routes/mehr.tsx` renders the secondary menu (links + logout form +
  theme control), all copy via `t()`.

## Non-goals

- **The Groups feature.** This only makes room for it; Groups ships separately.
- **Desktop nav redesign.** The top nav has space and is left as-is.
- **An animated JS bottom-sheet.** A plain server-rendered menu page is the MVP;
  a slide-up sheet can come later if desired.
- **Changing the theme-toggle mechanism.** The existing toggle is reused on the
  Mehr page (and the mobile theme FAB, if kept, is untouched).
- **KV / schema / auth changes.** This is presentation only — the app is live
  with real data, and nothing about storage or sessions changes.

## Capabilities

### Modified Capabilities

- `design-system`: the bottom-navigation requirement changes (primary links +
  Mehr instead of the six-item bar), and a new requirement covers the secondary
  "Mehr" menu page and its contents.

## Impact

Code:

- `routes/_app.tsx` — restructure the `nav.bottom-nav` markup.
- `routes/mehr.tsx` (new) — the secondary menu page (links, logout form, theme
  control).
- `lib/i18n/locales/de.ts` — add `nav.more` and any menu-page copy.
- `static/styles.css` (or equivalent) — minor styling for the menu page / the
  4-slot bar if needed.
- `tests/unit` — render test asserting the bottom bar's primary entries + Mehr,
  and that secondary links are absent from the bar.
- `tests/e2e` — Playwright: bottom bar shows the primary entries + Mehr; the
  Mehr page lists the secondary destinations; logout works from there.

Dependencies: none.

Risk: low — presentation-only. The main risk is a destination becoming harder to
reach (one extra tap for Categories/Rooms/Admin); acceptable given how rarely
they're used, and they remain one tap from "Mehr".
