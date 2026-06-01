## 1. Island — thumbnail strip and photo count

- [x] 1.1 Add a `capturedBlobs` signal (`useSignal<string[]>([])`) to
      `PhotoCapture`. After each successful upload (both create and append
      paths), push a `URL.createObjectURL(blob)` of the resized blob onto the
      signal array.
- [x] 1.2 In the `.photo-capture--multi` render branch, render the thumbnail
      strip above the action buttons: a `<div class="capture-preview-strip">`
      containing one `<img>` per blob URL (40×40 px, `object-fit: cover`,
      `alt=""`). Update the "Weiteres Foto" `<span>` to include the session
      count: `{t("items.addAnotherPhoto")} ({capturedBlobs.value.length})`.
- [x] 1.3 Add CSS to `static/styles.css` for `.capture-preview-strip`:
      `display: flex; gap: 0.25rem; overflow-x: auto; margin-bottom: 0.5rem` and
      `.capture-preview-strip img`:
      `width: 2.5rem; height: 2.5rem;
      object-fit: cover; border-radius: 4px; flex-shrink: 0`.

## 2. End-to-end Playwright

- [x] 2.1 Extend `tests/e2e/photos/multi-photo-capture.spec.ts`: after the first
      photo, assert that `.capture-preview-strip` is visible and contains
      exactly one `<img>`; after the second photo, assert it contains two
      `<img>` elements; assert the "Weiteres Foto" label includes "(2)".
