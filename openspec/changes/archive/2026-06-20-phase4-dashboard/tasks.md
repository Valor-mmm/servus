## 1. Server-side data fetch

- [x] 1.1 In `routes/index.tsx` GET handler: call `listItems()` and
      `listBoxes()`; derive `totalItems`, `incompleteItems`, `packedBoxes`,
      `totalBoxes`, `recentItems` (last 5 by `createdAt` desc)
- [x] 1.2 Presign thumbnail URLs for the 5 recent items that have photos (use
      `presignGet`); pass `thumbnailUrls` map to page props

## 2. Dashboard page component

- [x] 2.1 Replace static page component with `DashboardPage` accepting the
      derived metrics as props
- [x] 2.2 Render four `.dashboard-tile` stat elements: total items, incomplete
      items (linked to `/items/incomplete`), packed boxes ratio, box count
- [x] 2.3 Render "Letzte Gegenstände" section: list of up to 5 recent items with
      lazy `data-src` thumbnails, item name, link to detail
- [x] 2.4 Render prominent "Erfassen" CTA button (links to `/items/new` or
      quick-add flow)
- [x] 2.5 Use `<EmptyState>` (from R1) when no items exist yet

## 3. Styles

- [x] 3.1 Add `.dashboard-tile`, `.dashboard-tiles`, `.dashboard-recent` CSS
      rules to `static/styles.css`; mobile: 2-column grid; desktop: 4-column row

## 4. i18n

- [x] 4.1 Add German keys: `"dashboard.totalItems"`,
      `"dashboard.incompleteItems"`, `"dashboard.packedBoxes"`,
      `"dashboard.recent"`, `"dashboard.cta"` to `de.ts`

## 5. Tests and E2E

- [x] 5.1 Run `deno task test` — all pass
- [x] 5.2 E2E: log in → `/` shows stat tiles with counts; incomplete-items tile
      links to `/items/incomplete`
- [x] 5.3 Run `deno task e2e` — all pass
