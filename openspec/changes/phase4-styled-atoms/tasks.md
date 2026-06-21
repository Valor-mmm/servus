## 1. EmptyState component

- [x] 1.1 Create `components/EmptyState.tsx` with `{ message: string }` props,
      renders `.empty-state` div with lion SVG and message paragraph
- [x] 1.2 Add `.empty-state` and `.empty-state-icon` CSS rules to
      `static/styles.css`
- [x] 1.3 Replace every ad-hoc empty-state `<p class="empty">` / `<div>` in
      routes with `<EmptyState message={t("...")} />` — audit: items/index,
      boxes/index, rooms/index, categories/index, groups/index, admin/index
      invite list, items/incomplete

## 2. count() pluralization helper

- [x] 2.1 Add
      `export function count(n: number, singular: string, plural: string): string`
      to `lib/i18n/t.ts`
- [x] 2.2 Add i18n key pairs for item and box singulars: `"items.singular"` /
      `"items.plural"`, `"boxes.singular"` / `"boxes.plural"` in `de.ts`
- [x] 2.3 Apply `count()` wherever item or box counts are displayed in
      routes/components
- [x] 2.4 Unit test: `count(1, "Gegenstand", "Gegenstände") === "1 Gegenstand"`
      and `count(3, ...) === "3 Gegenstände"`

## 3. .btn-secondary audit

- [x] 3.1 Grep all routes for `<a href=` back/cancel links and ensure
      `.btn-secondary` is present; fix any missing
- [x] 3.2 Verify `styles.css` has a consistent `.btn-secondary` rule (no visual
      change needed if already correct)

## 4. BottomNav prefix-match fix

- [x] 4.1 Read `components/BottomNav.tsx` active-tab logic; change to
      `current === href || current.startsWith(href + "/")` to match `_app.tsx`
      pattern
- [x] 4.2 Unit test: `navActive("/items/incomplete", "/items")` returns active;
      `navActive("/items-extra", "/items")` does not

## 5. Tests and E2E

- [x] 5.1 Run `deno task test` — all pass
- [x] 5.2 E2E: navigate to `/items` with no items → `EmptyState` visible;
      navigate to `/boxes` with no boxes → `EmptyState` visible
- [ ] 5.3 Run `deno task e2e` — all pass
