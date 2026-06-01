## 1. Island — post-create multi-photo state

- [x] 1.1 Update the `PhotoCapture` island: after a successful `create`, parse
      the response body to extract `itemId`, store in a `createdItemId` signal,
      and render "Weiteres Foto" + "Fertig" buttons instead of reloading.
      Subsequent captures while `createdItemId` is set go to `append-photo`.
- [x] 1.2 Update the unit test for `PhotoCapture` to cover the state transition:
      simulate a successful create, assert `createdItemId` is populated and the
      two buttons appear; simulate a second capture, assert `append-photo` is
      called with the stored id; simulate "Fertig" and assert reload is
      triggered.

## 2. i18n

- [x] 2.1 Add German copy to `lib/i18n/locales/de.ts`: `items.addAnotherPhoto`
      (`"Weiteres Foto"`), `items.captureFinished` (`"Fertig"`).

## 3. End-to-end Playwright

- [x] 3.1 `tests/e2e/photos/multi-photo-capture.spec.ts`: log in → open a box
      detail page → capture a photo → assert the "Weiteres Foto" and "Fertig"
      buttons appear → capture a second photo → tap "Fertig" → assert the box
      detail shows one item (not two) with two `<img class="item-photo">`
      elements visible on its edit page.
