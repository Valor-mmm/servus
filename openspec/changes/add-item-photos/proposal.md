## Why

Photos are the central act of the upcoming move: an item exists, in practice,
when its picture has been taken. Today the only way to capture an item is to
type its name into a textarea, which is too slow when you are kneeling next to a
half-packed shelf with a phone in one hand. We need a workflow where pointing
the phone at a thing creates an inventory record, and where naming/categorising
that record can happen later (or automatically, once M8 lands).

The `Item.photoKey` field has existed in the type since M2 but has never been
written or read. This change finally wires storage, capture, and display
end-to-end, and replaces the single-photo placeholder with a multi-photo list so
that one item can carry context-rich pictures (front, back, serial number, the
ISBN on a book's back cover).

## What Changes

- **New `photos` capability** — Cloudflare R2 bucket, presigned PUT for upload,
  presigned GET (pinned to a 15-minute expiry window so browser caches work) for
  display, no public bucket access.
- **`Item` schema**: replace `photoKey: string | null` with `photos: string[]`
  (R2 keys, ordered, `photos[0]` is the primary/cover image). Legacy items
  without the field read back as `photos: []`.
- **Photo-first capture island** — a Fresh 2 island that opens the device
  camera, resizes the captured frame to max 1600px on the long edge as JPEG
  q≈0.85 on a `<canvas>`, uploads via presigned PUT directly to R2, and appends
  the resulting key to the item's `photos`. EXIF orientation is flattened into
  the canvas output. Uploads that fail are reported loudly — the user retakes
  the photo; no background retry queue.
- **Two capture entry points**:
  1. **Box-scoped fast path**: on box detail, a large camera button creates
     items already assigned to that box, one per shot. This **replaces** the M3
     text bulk-add textarea — going forward, every new item starts with a photo.
  2. **Global quick-add**: a `+` button in the bottom nav opens an unscoped
     capture; the resulting items land in an "unassigned" bucket (no box, no
     room) and can be assigned later.
- **`status: "pending"` is activated**: photo-first items are created with
  `status: "pending"`, name = `""`, category = `null`. **No transition to
  `confirmed` happens in this change** — pending is where they live until M8
  classifies them or the user edits the name. While pending, room, box, and
  quantity remain fully editable; only the item's identity (name/category) is
  unresolved.
- **"Needs review" list**: a new `/items/pending` route lists all `pending`
  items so the user can see at a glance what still lacks identity.
- **Item list & box detail rendering**: a thumbnail of `photos[0]` is shown for
  every item; pending items render with a placeholder name (`(unbenannt)`) and a
  `Pending`-tinted status badge.
- **Item detail page**: shows all photos in their order, lets the user add more
  and delete individual ones (deleting `photos[0]` promotes the next photo).
- **Orphan cleanup**: deleting an item issues best-effort `DELETE` calls to R2
  for each of its photo keys after the KV write commits; failures are logged but
  do not fail the request. Photo replacement / removal during edit cleans up the
  orphaned key the same way.
- **BREAKING** — the text-only bulk-add textarea on box detail is removed.
  Existing items are unaffected; only the affordance for creating _new_ items by
  typing names is gone.

## Capabilities

### New Capabilities

- `photos`: R2-backed photo storage. Owns the bucket configuration, the
  presigned-PUT / presigned-GET flow, the upload-side validation (size, MIME),
  the orphan-cleanup contract, and the URL-signing helper used by the inventory
  routes when rendering thumbnails / galleries.

### Modified Capabilities

- `inventory`: `Item.photoKey: string | null` becomes `Item.photos: string[]`;
  `status: "pending"` is activated for photo-first creations; legacy
  single-field records read back as `photos: []`; the item list and detail views
  grow photo affordances (thumbnail, gallery, add/delete).
- `boxes`: the text bulk-add requirement is **removed**; the box detail view
  gains a camera-button affordance whose captures create items assigned to the
  current box.

## Impact

- **Code**:
  - `lib/inventory/types.ts` — `Item` schema change.
  - `lib/inventory/itemRepo.ts` — read coercion for legacy records, `photos`
    mutation helpers, orphan-cleanup hook on delete/edit.
  - `lib/photos/` _(new)_ — R2 client wrapper, presigning, key generation,
    delete helper.
  - `routes/api/photos/upload-url.ts` _(new)_ — issues a presigned PUT for an
    authenticated session.
  - `routes/api/items/append-photo.ts` _(new)_ — appends a confirmed-uploaded
    key to an item's `photos` after sanity-checking it exists in R2.
  - `routes/api/items/create-from-photo.ts` _(new)_ — creates a `pending` item
    with the uploaded photo as `photos[0]`, optionally bound to a box.
  - `islands/PhotoCapture.tsx` _(new)_ — camera input, canvas resize, presigned
    PUT, append-to-item.
  - `routes/items/index.tsx`, `routes/items/[id]/index.tsx`,
    `routes/items/[id]/edit.tsx`, `routes/boxes/[id]/index.tsx` — show
    thumbnails, galleries, and the new capture button.
  - `routes/items/pending.tsx` _(new)_ — needs-review list.
  - `routes/boxes/[id]/index.tsx` — **remove** bulk-add textarea handler.
  - `lib/i18n/locales/de.ts` — new copy keys (placeholder name, capture button,
    upload errors, gallery actions).
- **Dependencies (new)**:
  - `aws4fetch` (single small file, vendor-quality, MIT) — for R2/S3 v4 request
    signing from Deno Deploy. R2's S3 API is the path of least resistance for
    presigned URLs and avoids pulling in the full AWS SDK. Justified because
    Deno stdlib does not offer SigV4 signing. (Alternative considered:
    hand-rolling SigV4 in `lib/photos/`; deferred because the crypto is fiddly
    and `aws4fetch` is ~10 KB with no transitive deps.)
- **Infrastructure** (one-time, user action required):
  - Create a Cloudflare R2 bucket (free tier).
  - Generate an R2 API token with object read/write on that bucket.
  - Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
    to Deno Deploy env vars and `.env.example`.
  - Bucket is private (no public access); CORS configured to allow PUT/GET from
    `servus.valor.codes` (and `localhost:8000` for dev).
- **KV migration**: read-side coercion only — legacy records missing `photos`
  are returned as `photos: []`. No write-side rewrite needed.
- **Tests**:
  - Unit: `lib/photos/` (key generation, signing wrapper behaviour with a fetch
    stub), item-repo `photos` mutations, legacy-record coercion.
  - Integration: create-from-photo → item lands in `pending`; append-photo grows
    the array; delete-item triggers R2 delete (R2 client mocked at the
    boundary).
  - E2E (Playwright): box detail → take a photo (simulated via
    `page.setInputFiles` with a fixture image) → item appears in the box as
    `pending` with a thumbnail → edit + name it → status stays `pending` until
    M8 (the test asserts that — `pending` is the expected state).
- **Out of scope (non-goals)**:
  - **No AI classification.** All photo-first items remain `pending`
    indefinitely until M8 (`add-item-classification`) ships. This change does
    not call any vision API, does not build a swipe-review UI, does not even
    introduce a `confirm` button.
  - **No background upload retry** / IndexedDB queue. Failed uploads are
    surfaced as errors; the user retakes the picture.
  - **No box-level photos.** Photos belong to items only.
  - **No image search, no reorder UI** within a single item's photo list (add
    - delete only; primary == first).
  - **No service worker / offline storage** — the M5 PWA scope is unchanged.
  - **No backfill of existing items** with auto-generated photos. Legacy items
    stay text-only until a user opens them and captures a photo.
