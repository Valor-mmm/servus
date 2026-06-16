## 1. i18n strings

- [x] 1.1 Add `nav.more` ("Mehr") and `menu.title` ("Mehr") to
      `lib/i18n/locales/de.ts`; reuse existing keys for the secondary
      destinations and logout

## 2. The Mehr menu page

- [x] 2.1 Add a failing render test asserting `/mehr` lists links to
      `/categories`, `/rooms`, `/admin`, includes the theme control, and renders
      a logout POST form with a CSRF token field
- [x] 2.2 Implement `routes/mehr.tsx`: authenticated server-rendered page with
      the secondary links, the `data-theme-toggle` control, and the logout form
      (CSRF), all copy via `t()`

## 3. Restructure the mobile bottom nav

- [x] 3.1 Add a failing render test for the bottom nav: contains `/items`,
      `/boxes`, the quick-add action, and `/mehr`; does NOT contain
      `/categories`, `/rooms`, or a logout form
- [x] 3.2 Update `routes/_app.tsx` `nav.bottom-nav` to the four-slot layout
      (Items, Boxes, Quick-add, Mehr); remove the Categories, Rooms, and logout
      entries from the bar
- [x] 3.3 Adjust bottom-nav styling if needed so four slots lay out evenly and
      the Mehr entry matches the others; keep the quick-add distinction

## 4. Spec sync and E2E

- [x] 4.1 Update affected specs and run
      `openspec validate nav-overflow-menu
      --strict` (CLI at
      `~/.nvm/versions/node/v20.12.2/bin/openspec`)
- [x] 4.2 Add a Playwright E2E on a mobile viewport: the bottom bar shows Items,
      Boxes, Quick-add, and Mehr; tapping Mehr opens the menu listing the
      secondary destinations; logging out from Mehr returns to the login screen
