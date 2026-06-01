## Context

Today every `Item` is created from typed text. The roadmap (M7) sketched a photo
capability as "one photo per item via Cloudflare R2," but conversation with the
product owner clarified that:

- Photos are the _primary_ identity of an item during the move, not a
  decoration. The user's mental model is "I see a thing → I photograph it → it
  exists." Names come after.
- One photo is often not enough — for a book, the **back cover** carries the
  ISBN that M8's classification pipeline will read; for an appliance, the
  serial-number plate; for fragile items, side angles.
- M8 (Cloudflare Workers AI + Google Books ISBN lookup) is _not_ part of this
  change. Until M8 ships, photo-first items live in `status: "pending"` with
  empty name/category, and the user accepts that.

`Item.photoKey: string | null` has existed since M2 (`add-inventory-core`) but
is dead code — never written, never read. We are repurposing the field, not
adding alongside it, because nothing depends on its current shape.

R2 was the only realistic free-tier store identified during the M7 roadmap work;
the prior reasoning still holds (10 GB free forever, S3 API, zero-egress to
Cloudflare's own network) and the user re-confirmed it.

## Goals / Non-Goals

**Goals:**

- A photo taken on a phone in a hallway becomes a persisted `Item` record inside
  ~2 s on a decent cellular connection, with the picture viewable immediately on
  the box detail page.
- Multiple photos per item, ordered, first = primary. ISBN/back-of-book capture
  works without per-photo role metadata.
- Photo bytes never travel through Deno Deploy on the display path. Photos are
  private (not enumerable, not eternally cacheable, only readable by an
  authenticated session) without paying the bandwidth cost of proxying.
- Replacing the M3 text bulk-add textarea does not break any existing item —
  only the typed-creation path is removed.
- Existing inventory items (which all have `photoKey: null`) read back as
  `photos: []` and render without error.
- Schema and storage shape are _ready_ for M8 to consume without further
  migration — the pending pipeline exists, photos are addressable by key, and
  the classification pipeline will only need to read photos and write back
  `name` / `categoryId` / `status: "confirmed"`.

**Non-Goals:**

- No AI calls of any kind. No classification queue. No swipe-to-review UI.
- No background / offline upload queue. No IndexedDB persistence of pending
  captures. A blown upload is the user's problem, signalled with a toast.
- No box-level photos. No photo grid / search across items.
- No per-photo `label` / `role` metadata in this change. The shape is `string[]`
  (just keys); evolving to `{ key, label? }[]` later is an additive migration we
  can do when M8 reveals an actual need.
- No reorder UI for an item's photo list. Add and delete are sufficient; the
  order of insertion is the order shown.
- No service worker, no offline data — M5's PWA scope is unchanged.

## Decisions

### D1. Storage: Cloudflare R2 via the S3 API, presigned URLs end-to-end.

**Rationale.** R2 has a 10 GB-forever free tier, zero egress fees, and an
S3-compatible API which means we can use plain SigV4 presigned URLs for both
upload (PUT) and display (GET). There is no Cloudflare-specific SDK required and
no vendor lock at the data-format layer: every byte we store is a JPEG, and the
keys are 32 random bytes — both portable to Backblaze B2 or any other S3 store
with a credentials swap.

**Alternative considered: Deno KV blob storage.** Rejected — KV values are
capped at 64 KiB, total free-tier KV is 1 GiB, and storing ~6000 photos (2000
items × 3 photos × ~150 KB each, after client resize) would blow that cap
several times over. KV is the database, not the object store.

**Alternative considered: hand-rolled R2 PUT via the Workers binding.** Rejected
— would require Cloudflare Workers in front of Deno Deploy. We stay on Deno
Deploy and call R2 over the public S3 endpoint.

### D2. Upload protocol: presigned PUT direct from browser to R2.

The browser island POSTs `/api/photos/upload-url` with `{ contentType,
bytes }`.
The server validates the session, generates a random 32-byte key, signs a PUT
URL with 5-minute expiry, and returns `{ key, url }`. The island then PUTs the
resized JPEG straight to R2 — bytes never touch our origin.

A second small POST to `/api/items/create-from-photo` (or
`/api/items/append-photo`) commits the key to KV after the upload returned 200.
The server **does not** verify the object exists in R2 before linking — that
would cost an extra round trip per upload and buys little in our threat model
(worst case, an item points at a missing key; render layer shows a broken-image
placeholder; user re-captures).

**Why not upload-through-origin?** Cheaper for the user's data plan (direct
upload avoids the Deno Deploy hop) and cheaper for our origin CPU. The PUT URL
is short-lived and bound to the exact key, so it isn't a useful credential for
anything else.

### D3. Display: presigned GET URLs pinned to a 15-minute expiry window.

Server-rendered pages embed `<img src>` URLs that are presigned with a GET
expiry rounded up to the next 15-minute boundary (wall-clock quantisation). Two
consecutive renders within the same window produce **identical** URLs, so the
browser cache works normally. URLs expire within ≤30 minutes of issuance
regardless, so a leaked URL has a short lifespan.

**Why not public-bucket + unguessable keys?** It satisfies "private" only in the
weak sense of "not enumerable." The owner explicitly wanted private. Signed-URL
with expiry adds defence in depth at near-zero CPU (HMAC-SHA256 on a ~150-byte
string).

**Why not proxy through Deno Deploy?** It works, but costs us bandwidth per view
(1 TB free is plenty, but presigned URLs make it free-er and faster). The
session check happens at page render time anyway — by the time the browser has
the URL, the user has already proved they belong.

**Why 15 minutes?** A balance between cache hit rate (longer = better caching)
and leak window (shorter = safer). 15 minutes also fits the typical session
length when actively packing.

### D4. New dependency: `aws4fetch`.

A single-file, MIT-licensed, ~10 KB SigV4 implementation maintained by the
author of Cloudflare's R2 docs. No transitive dependencies, no build step. Used
purely as a signing helper — we drive `fetch()` ourselves for the actual
PUT/GET.

**Alternative considered: hand-rolled SigV4 in `lib/photos/sign.ts`.** SigV4 is
a ~100-line ceremony of canonical-request construction and HMAC chaining;
getting it wrong silently produces "SignatureDoesNotMatch" errors with no
helpful trace. The cost of vendoring `aws4fetch` is negligible; the cost of
debugging a misimplemented SigV4 is high. If `aws4fetch` ever becomes
unmaintained we can in-line it — it's a single file and we'd already understand
it.

**Alternative considered: full AWS SDK (`@aws-sdk/client-s3`).** Rejected —
huge, frequent major bumps, exactly the dependency profile CLAUDE.md tells us to
avoid.

### D5. Schema: `photos: string[]`, ordered, first is primary.

```ts
interface Item {
  // ...existing fields, minus `photoKey`...
  photos: string[]; // R2 keys; photos[0] is the cover image
}
```

- Add: append to the end of the array.
- Delete: filter out the key; if it was `photos[0]`, the next photo silently
  becomes primary.
- Reorder: not exposed in UI this change. If we ever need it, the data shape
  already supports an arbitrary swap.

**Why not a separate `Photo { id, itemId, key, order, createdAt }` entity?**
Asked and answered with the owner: extra entity = extra indexes, extra mutation
paths, extra UI for order — for the move-phase value of one ordered list per
item. The future "photo roles for ISBN / serial / etc." concern is solved by
M8's classifier scanning **all** photos, not by us labelling them up front.

**Migration.** Read-side coercion only. `findItem` / `listItems` apply
`{ photos: [], ...record }` so any KV record missing the field reads as empty.
There is no write-side migration step — the next mutation on an old item will
save it with the new shape.

### D6. Capture island: client-side resize, no server-side image processing.

`islands/PhotoCapture.tsx`:

1. Renders `<input type="file" accept="image/*" capture="environment">` plus a
   styled trigger.
2. On `change`, loads the file into an `Image`, draws it to a `<canvas>` sized
   so the long edge is ≤1600 px, exports `toBlob('image/jpeg', 0.85)`. EXIF
   orientation is normalised by the canvas step (the browser respects EXIF when
   decoding into `Image`).
3. POSTs `{ contentType: 'image/jpeg', bytes: <length> }` to
   `/api/photos/upload-url`, gets back `{ key, url }`.
4. PUTs the blob to `url`. Asserts `response.ok`.
5. POSTs `{ photoKey: key, boxId?, replace? }` to either
   `/api/items/create-from-photo` (no item yet) or `/api/items/append-photo`
   (adding to an existing item).
6. On any failure: a German error toast, the captured photo is discarded, the
   user retakes. **No retry, no localStorage.**

**Why not generate a separate small WebP thumbnail server-side?** Deno Deploy
doesn't have a great native image library; the realistic options are
`imagescript` (pure-TS, slow on large inputs) or a WASM `image-rs` binding
(works but adds bundle weight). Once the client has already resized to 1600 px /
~500 KB / q=0.85 JPEG, the size win from making a second, smaller WebP is not
worth a Deno-Deploy-side image pipeline. The list/grid pages will use the same
JPEG with browser-side sizing; the bandwidth-per-thumbnail in practice is ~150
KB rather than ~30 KB — acceptable at our scale.

If this proves wrong in production (slow list pages on cellular), the escape
hatch is for the island to also produce a 400 px JPEG and upload **both**, with
the thumbnail key stored as `photos[i]` adjacent. This keeps `string[]` as the
shape.

### D7. `status: "pending"` is activated, but only as a state, not a workflow.

Photo-first items are created with:

```ts
{ name: "", categoryId: null, status: "pending", photos: [<key>], ... }
```

- `roomId`, `boxId`, `quantity`, `estimatedValue`: editable as normal.
- `name`, `categoryId`: editable, but **changing them does not transition
  status**. Status only changes when M8 ships (which will introduce the
  classification pipeline that flips `pending` → `suggested` → `confirmed`).
- Item list, box detail: pending items render with a placeholder name
  (`(unbenannt)` — German) and a tinted status badge so they're visually
  distinct.
- New `/items/pending` route: lists every pending item with a thumbnail, for
  triage / "what do I still need to deal with."

**Why not auto-confirm when the user names an item?** The owner's explicit ask:
don't ship an intermediate workflow that has no real value over waiting for M8.
A `pending` item with a name is still a perfectly useful inventory record (you
can pack it, you can place it); the `pending` tag merely says "AI hasn't /
nobody hasn't decisively classified this yet."

**Pre-existing items.** All existing `Item` records were created with
`status: "confirmed"` by the M2 default. They remain `confirmed`. There is no
backfill to `pending` and no audit story for "was this auto-classified or
human-confirmed" in this change.

### D8. Box detail: camera replaces textarea.

The M3 text bulk-add textarea on `/boxes/:id` is **removed** in this change. Its
replacement is the same camera affordance used by the global quick-add island,
but pre-bound to the current `boxId`. Each shot creates one item assigned to the
box; the box's `packed` status auto-tracks as today.

**Why remove rather than coexist?** The owner's choice. Two affordances for "add
an item to this box" with different defaults (one creates named-confirmed items,
the other creates nameless-pending items) is a worse UX than one. The user said:
photos-only going forward.

**What about existing un-photographed items?** They're untouched. You can still
add them to a box via the existing `/items/[id]/edit` form which sets `boxId`.
The change only removes the _creation_ affordance on the box page, not the
_assignment_ affordance elsewhere.

### D9. Global quick-add: bottom-nav `+`.

Adds a `+` icon to the M5 bottom navigation. Tapping it opens the same capture
island with no `boxId` binding; the resulting `pending` items land in an
"unassigned" bucket (no box, no room, no name). They appear on the item list and
on `/items/pending`. The user assigns them later via the existing edit form.

This affordance shares 100% of its code with the box-scoped flow — the island
takes an optional `boxId` prop and the `/api/items/create-from-photo` endpoint
takes an optional `boxId` body field.

### D10. Orphan cleanup: best-effort, in-request, never blocks.

When an item is deleted (existing flow) or a photo is removed during edit, the
handler:

1. Commits the KV change first.
2. Fires `DELETE` requests to R2 for each affected key.
3. Logs failures, but **always** returns success to the user.

R2 has no versioning enabled, so a successful DELETE is final. Failed deletes
leave orphans, but at our scale (~6000 lifetime photos, 1 % failure budget = 60
orphans = ~9 MB of waste) this is operationally invisible. If orphans ever
become a real concern, M9+ can introduce a sweep job; the data shape (we know
every key from `Item.photos` and can prefix-scan R2) supports that without
rework.

**Why not write a tombstone like we do for boxes?** Boxes need tombstones to
preserve short-code uniqueness for printed labels. Photos have no
human-meaningful identifier and no analogous concern.

### D11. CORS, secrets, and env wiring.

R2 bucket configured with:

- Public access: **off**.
- CORS allowed origins: `https://servus.valor.codes`, `http://localhost:8000`.
- CORS allowed methods: `GET`, `PUT`. Allowed headers: `content-type`.

Secrets:

- `R2_ACCOUNT_ID` — Cloudflare account id.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — R2 API token credentials scoped
  to read+write on this bucket.
- `R2_BUCKET` — bucket name (the deployment can swap buckets per env).
- `R2_PUBLIC_URL_BASE` — base URL used to construct signed URLs
  (`https://<account>.r2.cloudflarestorage.com/<bucket>`).

All five are added to `.env.example` (without real values) and required at boot
via `lib/photos/config.ts` (throws if any is missing — fail loud, no silent
fallback).

**Local dev** without R2 access? Implementers run against a `.env` with real R2
creds (a "dev" bucket they create themselves). We do not ship a mock store — the
test suite uses a fake at the `lib/photos/` boundary.

### D12. CSRF on the photo endpoints.

`/api/photos/upload-url`, `/api/items/create-from-photo`,
`/api/items/append-photo` are all state-changing and require the existing CSRF
token check that ships with every mutating route since M1. The capture island
reads the CSRF token from the page render and sends it in a header. No new CSRF
infra; just the same middleware.

## Risks / Trade-offs

- **[Risk] R2 outage on move day.** Capture would fail; the user can't add items
  photo-first. → **Mitigation:** The existing `/items/[id]/edit` form still lets
  you create or modify items by name. This change _adds_ a fast path; it doesn't
  remove the slow path. Acceptable degradation.

- **[Risk] Signed URLs leak via screen-share / browser history.** Anyone with a
  leaked URL can see the photo for up to ~30 minutes. → A house inventory photo
  is not a high-value secret; the app already requires login to access anything
  else. The 15-min cache window + 30-min hard ceiling bounds the blast radius
  and matches what e.g. S3-backed SaaS apps do.

- **[Risk] EXIF leaks (GPS coordinates of the home).** The canvas re-encode in
  D6 strips EXIF in the round-trip, including GPS. → No additional code needed;
  this is a free property of the resize step. Verified in implementation tests
  by feeding a fixture with GPS EXIF and asserting the output has none.

- **[Risk] Phone-camera JPEGs after canvas decode lose orientation if the
  browser doesn't honour EXIF orientation flags during `Image` decoding.** All
  modern browsers (Safari iOS 13.4+, Chrome 81+) do, but a particularly old
  phone might not. → If a user reports sideways photos, the fix is to read EXIF
  orientation explicitly in JS and rotate the canvas accordingly (~20 lines).
  Deferred until reported.

- **[Risk] Replacing the text bulk-add textarea is a breaking UX change for the
  existing M3 workflow.** Users who memorised that flow will be surprised. → Two
  users. Both will be told. The replacement is strictly better for the workflow
  we actually want.

- **[Risk] No retry on upload failure means flaky cellular wastes time on move
  day.** → User explicitly chose this trade-off ("fail loud"). Mitigation is
  operational: stand near the WiFi when uploading the hard cases. If this proves
  intolerable, swapping in IndexedDB retry is an island-only change — no schema
  or server impact.

- **[Risk] Pending items pile up without M8, polluting lists.** → The
  `/items/pending` route gives a dedicated triage view; the main item list shows
  pending items but with a clear visual treatment so they don't blend in. The
  user gets the "needs review" affordance for free.

- **[Risk] `aws4fetch` becomes unmaintained.** → Vendor in-line. It's a single
  file and the SigV4 algorithm is a stable AWS-published spec.

## Migration Plan

1. **R2 setup (one-time, user action):** create bucket, create API token, set
   CORS, add the five env vars to Deno Deploy. Document the exact steps in
   `docs/decisions/cloudflare-r2-setup.md`. This is a blocking pre-req before
   the change can be merged to main.
2. **Schema change** is read-side only. Deploy is safe to roll out ahead of any
   item being photographed; legacy items keep working.
3. **Box detail change** (removing textarea) is deployed atomically with the new
   capture island. No two-phase migration needed.
4. **Rollback strategy:** revert the deploy. R2 objects created between deploy
   and rollback become orphans; the next deploy of this change picks them up
   again (the keys remain in the items' `photos`). No data loss; only orphan
   accounting.

## Open Questions

None remaining. The owner has answered every blocking decision (storage,
delivery, capture flow, multi-photo shape, pending workflow, bulk-add fate,
orphan handling). M8's classification spec will be drafted as a separate
OpenSpec change once this one ships.
