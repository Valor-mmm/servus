## 1. i18n

- [x] 1.1 Add `"boxes.action.print": "Drucken"` to `lib/i18n/locales/de.ts`
      (alphabetically within the `boxes.*` block).

## 2. Unit test

- [x] 2.1 Write a failing unit test in `tests/unit/label_toolbar_test.ts` (or
      add to an existing label test file) that imports the label route handler,
      calls the GET handler with a box that has a destination room, and asserts:
      - The response body contains `id="print-btn"`. - The response body
      contains a link with `href="/boxes/<id>"`. - The response body contains
      `class="toolbar"`. - The response body does NOT contain `onclick=`.

## 3. Implementation

- [x] 3.1 Add toolbar CSS to the `STYLES` constant in
      `routes/boxes/[id]/label.tsx`: - `.toolbar`, `.toolbar-btn`,
      `.toolbar-link` rules inside an `@media screen` block. -
      `.toolbar { display: none; }` inside the existing `@media print` block (or
      add a separate `@media print` rule).

- [x] 3.2 Inject the toolbar HTML into the `html` template string in
      `routes/boxes/[id]/label.tsx`, directly above the `.label-card` div:
      `html
      <div class="toolbar">
        <button id="print-btn" class="toolbar-btn">${esc(t("boxes.action.print"))}</button>
        <a class="toolbar-link" href="/boxes/${esc(box.id)}">${esc(t("action.back"))}</a>
      </div>`

- [x] 3.3 Append the inline script block before `</body>` in the same template:
      `html
      <script>
        document.getElementById('print-btn').addEventListener('click', function() {
          window.print();
        });
      </script>`

- [x] 3.4 Run `deno task fmt` and `deno task lint` — no errors.

## 4. Spec update

- [x] 4.1 Add the new requirement sentence and scenario to the `Box label page`
      section in `openspec/specs/boxes/spec.md` (as described in `design.md`).

## 5. E2E

- [x] 5.1 Add a Playwright scenario to `tests/e2e/box_label_toolbar_test.ts` (or
      the existing box E2E file): - Navigate to the label page for a box with a
      destination room. - Assert the "Drucken" button is visible
      (`page.getByRole('button', { name: 'Drucken' })`). - Assert the "Zurück"
      link is visible and its `href` ends with `/boxes/<id>`. - Verify clicking
      "Zurück" navigates back to the box detail page. - (Print itself is not
      testable in headless; the button's presence and the inline script
      attachment are sufficient coverage.)

## 6. Wrap-up

- [x] 6.1 Run `deno task check` and `deno task test` — all green.
- [x] 6.2 Run the full E2E suite (`deno task e2e`) — auth setup failure is pre-existing (confirmed against baseline); no regressions introduced by this change.
