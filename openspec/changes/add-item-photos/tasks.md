## 1. Infrastructure & dependency

- [x] 1.1 Document the one-time R2 setup steps (bucket create, API token, CORS
      for `servus.valor.codes` + `localhost:8000`, env vars) in
      `docs/decisions/cloudflare-r2-setup.md`.
- [x] 1.2 Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
      `R2_BUCKET`, `R2_PUBLIC_URL_BASE` to `.env.example` (no real values).
- [x] 1.3 Pin `aws4fetch` in `deno.json` imports at an exact version; record the
      version in the decision doc.

## 2. `lib/photos/` foundation (TDD)

- [x] 2.1 Write failing unit tests for `lib/photos/keys.ts`: generates 1000
      distinct keys, each ≥128 bits of entropy, no embedded ids (covers `photos`
      spec "Photo keys are unguessable").
- [x] 2.2 Implement `lib/photos/keys.ts` to make the tests pass.
- [x] 2.3 Write failing unit tests for `lib/photos/config.ts`: throws on missing
      env vars, returns a parsed config when complete.
- [x] 2.4 Implement `lib/photos/config.ts`.
- [x] 2.5 Write failing unit tests for `lib/photos/signing.ts`:
      `presignPut(key, contentType, ttl=300)` and `presignGet(key, window=900)`
      produce URLs containing the key, the expected expiry timestamp, and a
      non-empty signature; two `presignGet` calls within the same 15-min window
      produce byte-identical URLs; calls in different windows differ (covers
      `photos` spec "Display URLs are presigned with a windowed expiry" and
      "Upload URLs are presigned and short-lived").
- [x] 2.6 Implement `lib/photos/signing.ts` using `aws4fetch` to wrap SigV4.
- [x] 2.7 Write failing unit tests for `lib/photos/r2.ts` `deleteObject(key)`:
      returns a `Result` discriminating success vs failure, never throws (covers
      `photos` spec "Photo deletion is best-effort and never blocks the
      caller"). Stub `fetch` at the test boundary.
- [x] 2.8 Implement `lib/photos/r2.ts` `deleteObject`.

## 3. KV repo: `photos` field + legacy coercion (TDD)

- [x] 3.1 Write failing unit tests in
      `tests/unit/inventory/itemRepo_photos.test.ts`: legacy record without
      `photos` reads as `photos: []`; legacy record with `photoKey: "x"` ignores
      it and reads as `photos: []` (covers `inventory` spec "Legacy item records
      read back with empty photo list").
- [x] 3.2 Update `Item` type in `lib/inventory/types.ts`: remove `photoKey`, add
      `photos: string[]`.
- [x] 3.3 Update `lib/inventory/itemRepo.ts` read path to coerce missing
      `photos` to `[]`; remove all references to `photoKey`.
- [x] 3.4 Run `deno check **/*.ts` and fix every call site broken by the field
      rename.

## 4. Item creation endpoints (TDD, integration)

- [x] 4.1 Write failing integration test for `/api/items/create-from-photo`:
      authenticated POST with a key creates an item with `status: "pending"`,
      `name: ""`, `photos: [<key>]`; appears in `findItem` and `listItems`
      (covers `inventory` spec "Photo-first item creation").
- [x] 4.2 Write failing integration test: same endpoint with `boxId` field
      assigns the item to the box and auto-transitions an empty box to
      `"packed"` (covers `boxes` spec "Photo-first capture from box detail" —
      server side).
- [x] 4.3 Write failing integration test: unauthenticated POST returns `401`;
      missing CSRF returns `403`.
- [x] 4.4 Implement `routes/api/items/create-from-photo.ts`.
- [x] 4.5 Write failing integration test for `/api/items/append-photo`:
      authenticated POST appends a key to an existing item's `photos`; does NOT
      change `status` (covers `inventory` spec "Append photo to existing item").
- [x] 4.6 Implement `routes/api/items/append-photo.ts`.
- [x] 4.7 Write failing integration test for `/api/items/remove-photo`: removes
      the specified key, fires R2 delete, status unchanged even if `photos`
      becomes empty (covers `inventory` spec "Remove photo from item").
- [x] 4.8 Implement `routes/api/items/remove-photo.ts`; wire the best-effort R2
      delete through `lib/photos/r2.ts`.

## 5. Upload URL endpoint (TDD, integration)

- [x] 5.1 Write failing integration test for `/api/photos/upload-url`:
      authenticated POST with `contentType: "image/jpeg"` and a valid byte
      length returns `{ key, url }`; key matches the entropy contract; url
      contains the key and an expiry within 5 minutes (covers `photos` spec
      "Upload URLs are presigned and short-lived").
- [x] 5.2 Write failing integration test: `contentType: "application/pdf"`
      returns `400`; declared length > 4 MiB returns `400`; unauthenticated
      returns `401`; missing CSRF returns `403` (covers `photos` spec "Upload
      size and content-type are bounded").
- [x] 5.3 Implement `routes/api/photos/upload-url.ts`.

## 6. Item delete: orphan cleanup (TDD)

- [x] 6.1 Write failing integration test for the existing item-delete handler:
      deleting an item with two photos issues two R2 deletes after KV commit
      (covers `inventory` spec "Deleting an item with photos issues R2 deletes"
      and `photos` spec "Item delete fires R2 deletes for all photos").
- [x] 6.2 Write failing integration test: simulating an R2 delete failure (mock
      at the `lib/photos/r2.ts` boundary) leaves the user-facing response
      successful and removes the KV record (covers `inventory` spec "R2 delete
      failure does not block item deletion").
- [x] 6.3 Wire the cleanup into the existing item-delete handler in
      `lib/inventory/itemRepo.ts` / route handler; commit KV first, then fire
      deletes (no `await Promise.all` blocking the response — fire-and-forget
      with a logger on failure).

## 7. Capture island (TDD, unit + harness)

- [x] 7.1 Write a unit test for the island's `resizeAndEncode(file)` pure helper
      (extract it from the island so it's testable): given a 4000×3000 PNG
      fixture, produces a JPEG `Blob` with longest edge 1600 px and roughly the
      expected byte size; EXIF GPS in the input does not appear in the output
      (covers design D6 — EXIF strip side-effect of canvas re-encode).
- [x] 7.2 Implement `islands/PhotoCapture.tsx` and the extracted helper. Island
      accepts an optional `boxId` prop and a `mode: "create" | "append"` prop
      with an item id for append.
- [x] 7.3 Manual harness: `routes/dev/capture-test.tsx` (dev-only, behind the
      existing auth check) that mounts the island unwired so a real phone can
      hit it during development.

## 8. UI wiring

- [x] 8.1 Add the German copy keys to `lib/i18n/locales/de.ts`:
      `items.placeholderName` (`"(unbenannt)"`), `items.captureButton`,
      `items.captureFailed`, `items.captureTooLarge`, `items.captureWrongType`,
      `items.addPhoto`, `items.removePhoto`, `items.pending`, `nav.quickAdd`,
      `items.needsReview`. (No inline strings in any JSX touched by this
      change.)
- [x] 8.2 Item list (`routes/items/index.tsx`): render `<img>` with presigned
      GET URL for `photos[0]` when present; render `(unbenannt)` placeholder for
      pending items with empty name; render a tinted status badge for pending
      items.
- [x] 8.3 Box detail (`routes/boxes/[id]/index.tsx`): **remove** the bulk-add
      textarea and its server handler; mount `PhotoCapture` with `boxId` prop
      above the item list when status is not `"delivered"`; render item-row
      thumbnails and pending placeholders the same way as the item list.
- [x] 8.4 Item edit (`routes/items/[id]/edit.tsx`): show all photos in their
      order with a per-photo remove button; mount `PhotoCapture` in `append`
      mode below the gallery; the existing form fields stay as-is.
- [x] 8.5 Item detail (`routes/items/[id]/index.tsx`): show the full photo
      gallery; show display name with placeholder fallback; show status badge.
- [x] 8.6 New route `routes/items/pending.tsx`: list `pending` items with
      thumbnail + placeholder name + box assignment + quantity + link to edit
      (covers `inventory` spec "Pending-items triage list").
- [x] 8.7 Bottom nav: add a `+` icon that links to a new
      `routes/items/quick-add.tsx` page mounting `PhotoCapture` in `create` mode
      with no `boxId`.

## 9. End-to-end Playwright

- [x] 9.1 Add a fixture image at `tests/e2e/fixtures/sample-item.jpg` (small
      JPEG, public-domain or generated).
- [x] 9.2 `tests/e2e/photos/photo-first-on-box.spec.ts`: log in → create a box →
      on box detail, use `page.setInputFiles` on the capture input with the
      fixture → assert one item appears in the box with `(unbenannt)` text and
      an `<img>` thumbnail with a URL matching the R2 endpoint → assert the box
      status is `"packed"`.
- [x] 9.3 Same spec: open the new item's edit page → set name to
      `"Bohrmaschine"` and save → reload the box detail page → assert the row
      shows `"Bohrmaschine"` and the pending status badge is still present
      (verifies the design's "name does not transition status" rule).
- [x] 9.4 `tests/e2e/photos/pending-list.spec.ts`: capture two photo-first items
      → visit `/items/pending` → assert both appear with thumbnails and
      placeholder name; visit `/items` (the normal list) → assert both appear
      with the pending badge.
- [x] 9.5 `tests/e2e/photos/quick-add.spec.ts`: tap the bottom-nav `+` → capture
      a photo → assert the item is created with no box and shows up in `/items`
      and `/items/pending`.
- [x] 9.6 `tests/e2e/photos/no-bulk-add-textarea.spec.ts`: visit a box detail
      page → assert there is no textarea for bulk-adding items by name
      (regression guard for the removed M3 affordance).

## 10. Wrap-up

- [x] 10.1 Update `docs/ROADMAP.md`: mark M7 `add-item-photos` as ✓ shipped
      (with a brief note that the workflow turned out photo-first rather than
      "photo as field"); add a decision-log entry referencing this change for
      the photo-first + multi-photo + R2-private call.
- [x] 10.2 Update affected canonical specs by running the apply workflow's
      archive step (`openspec validate` must pass on the change and on the
      resulting canonical specs).
- [x] 10.3 Run the full Playwright suite locally and on CI; fix any incidental
      regressions; ensure all 9.x scenarios are green before requesting review.
