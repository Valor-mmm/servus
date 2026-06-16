## 1. Unified native capture island

- [x] 1.1 Write a failing unit test for the upload-orchestration logic
      (extracted to a pure module): given a captured blob it resizes, presigns,
      PUTs, and links per mode (`create-from-photo` first→create then append,
      `attach-to-form` collect key, `append-to-existing` append), and surfaces a
      per-photo `uploading`/`done`/`failed` status.
- [x] 1.2 Write a failing unit test that a second capture in `create-from-photo`
      mode, started before the create resolves, appends to the single created
      item (no second item).
- [x] 1.3 Implement the upload-orchestration module to make 1.1–1.2 pass
      (reusing `lib/photos/resizeHelper.ts` and the existing upload/link APIs).
- [x] 1.4 Write a failing unit test for the per-mode last-photo removal rule:
      attach-to-form drops the key only; append-to-existing keeps the item;
      create-from-photo deletes the pending item when its last photo is removed.
- [x] 1.5 Add a small authenticated delete-pending-item endpoint (or reuse the
      item-detail DELETE handler) wrapping `deleteItem`, used by
      create-from-photo mode; make 1.4 pass.
- [x] 1.6 Create the unified `NativePhotoCapture` island: a primary camera-only
      control (`<input accept="image/*" capture="environment">`) and a secondary
      gallery control (`<input accept="image/*" multiple>`, no `capture`) both
      feeding one loop; a streaming thumbnail strip with per-photo status, a
      count on the label, per-photo remove/retry, and a finish action. Takes a
      `mode` prop (`create-from-photo` | `attach-to-form` |
      `append-to-existing`), optional `boxId`, optional `itemId`, and
      `csrfToken`. All copy via `t()`.
- [x] 1.7 Add the new German keys to `lib/i18n/locales/de.ts` (add-photo,
      from-gallery, count, finish, remove, retry, errors); ensure no inline
      literals remain in the island.

## 2. Wire entry points

- [x] 2.1 Quick-add (`routes/items/quick-add.tsx`): render `NativePhotoCapture`
      in `create-from-photo` mode, no box id.
- [x] 2.2 Box detail (`routes/boxes/[id].tsx`): render in `create-from-photo`
      mode passing the page's `boxId`.
- [x] 2.3 Manual create form (`routes/items/new.tsx`): render in
      `attach-to-form` mode; replace `PhotoAttach`; keep the hidden `photoKey`
      inputs feeding the create handler.
- [x] 2.4 Edit page (`routes/items/[id]/edit.tsx`): render in
      `append-to-existing` mode for the item; replace `PhotoCapture`.

## 3. Remove the in-app viewfinder stack

- [x] 3.1 Delete `islands/ContinuousCapture.tsx`, `islands/PhotoCapture.tsx`,
      `islands/PhotoAttach.tsx`, and `components/CaptureSurface.tsx` (or repoint
      `CaptureSurface` to the new island if any importer is cleaner that way).
- [x] 3.2 Delete `lib/camera/*` (`controls.ts`, `stream.ts`, `support.ts`) and
      `lib/capture/*` (`activationLogic.ts`, `shutterLogic.ts`,
      `lifecycleLogic.ts`, `fallbackLogic.ts`, `stateMachine.ts`, and any
      siblings).
- [x] 3.3 Delete the now-dead unit/integration tests for `lib/camera` and
      `lib/capture`.
- [x] 3.4 Remove the viewfinder/zoom/focus-ring/zoom-slider CSS from
      `static/styles.css`; keep/relocate the thumbnail-strip styles still used
      by the new island.
- [x] 3.5 Remove obsolete viewfinder/zoom/focus i18n keys from
      `lib/i18n/locales/de.ts`.
- [x] 3.6 Remove or update the `/dev/capture-test` harness
      (`routes/dev/capture-test.tsx`) to drive the new island.

## 4. Verify the build is clean

- [x] 4.1 `deno check`, `deno lint`, and `deno fmt --check` all pass; no
      dangling imports of the deleted modules.
- [x] 4.2 `deno task test` (unit + integration) passes.

## 5. End-to-end

- [x] 5.1 Write a Playwright E2E driving the native input via `setInputFiles`:
      add two photos in `create-from-photo` mode, assert both thumbnails appear
      and the count updates without a page reload between them, remove one, and
      finish — asserting the resulting item reflects the kept photo(s). Also
      assert that removing the last photo in quick-add leaves no blank item.
- [x] 5.2 Run `deno task e2e` and confirm the scenario passes.
