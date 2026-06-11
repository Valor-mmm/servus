# Exploration: AI Classification + Typed Inventory

**Date:** 2026-06-11\
**Status:** exploration — not yet a formal proposal\
**Next step:** create OpenSpec changes for `item-classification` and
`typed-categories`

---

## Context

After M7 (item photos) ships, the move workflow is: scan everything fast with
photos, don't block on naming. Post-move, a background AI pipeline enriches the
items with names and structured metadata. This exploration captures the design
decisions made before writing those specs.

---

## The post-move enrichment framing

The pipeline does not need to be real-time. It runs as a background batch job
after the move — draining the `pending` queue day by day. Spread over days,
free-tier limits (Workers AI ~10k neurons/day) are not a concern.

Existing `pending` items (captured during the move) must be included — the
pipeline selects by status, not by creation time.

---

## Status lifecycle

```
pending ──► [AI pipeline] ──► suggested ──► [tinder review] ──► confirmed
                │                                  │
                │                                  └── edit modal ──► confirmed
                └──────────────► unresolvable ──► [manual edit] ──► confirmed
```

- `pending` — photo taken, not yet processed by AI
- `suggested` — AI has a suggestion, waiting for human triage
- `unresolvable` — AI tried and failed; human must type manually
- `confirmed` — human verified (existing state, no change)

`unresolvable` items appear at the back of the triage queue with a marker ("KI
konnte das nicht erkennen"). The tinder UI handles them by opening the edit
modal directly.

---

## Tinder review UI

Route: `/items/review`

- Full-screen card: photo + AI-suggested name + category
- Swipe right / tap ✓ → confirm (one gesture, status → `confirmed`)
- Swipe left / tap ✗ → edit modal pre-filled with suggestion
- Edit + save → `confirmed`
- Progress indicator: "3 von 12 zu überprüfen"
- Empty state when queue is drained
- Nav badge: "Zu überprüfen (N)" showing count of `suggested` items

---

## AI pipeline architecture

```
KV queue job triggered after photo upload
      │
      ├──► barcode detected?
      │         YES → Google Books API (ISBN lookup)
      │               returns: title, author, publisher, year, seriesInfo
      │         NO  → Workers AI / LLaVA (vision)
      │               prompt-engineered for JSON output
      │               { name, category, description, schema-specific fields }
      │
      └──► item updated: name_suggestion, category_suggestion,
                         schema-specific metadata, status → suggested
                         (or status → unresolvable on failure/timeout)
```

**Barcode detection:** client-side at capture time (ZXing.js in the island).
Immediate feedback; avoids storing the full image just for barcode detection.

**Workers AI output:** prompt-engineered to return JSON. Fallback: if parsing
fails, status → `unresolvable`.

**DVDs:** vision-only. No barcode-to-metadata API. LLaVA reads the cover.

**Series data from Google Books:** the ISBN lookup response includes
`seriesInfo.shortSeriesBookTitle` and `seriesInfo.bookDisplayNumber` at no extra
API cost. Use this to auto-assign series for books.

---

## Typed inventory (category schemas)

Categories gain a **schema type** that defines extra structured fields. The AI
pipeline uses the schema to know which fields to extract.

### Proposed hardcoded schemas

| Schema        | Extra fields                                                                         |
| ------------- | ------------------------------------------------------------------------------------ |
| `book`        | author, ISBN, publisher, year, series, volume                                        |
| `video`       | director/showrunner, year, format (DVD/Blu-ray/4K), genre, franchise, season         |
| `game`        | type (board/video/card), platform, publisher, min–max players, age rating, franchise |
| `clothing`    | type (shirt/pants/jacket…), brand, size, color, gender, season                       |
| `electronics` | brand, model, serial number, purchase year, device type                              |
| `appliance`   | brand, model, capacity, power (W), purchase year, warranty until                     |
| `tool`        | brand, tool type, power (manual/corded/cordless), voltage                            |
| `furniture`   | brand/manufacturer, material, color, article number                                  |
| `toy`         | brand, set name, set number, piece count, complete?, age range                       |
| `plant`       | species, common name, pot diameter (cm), indoor/outdoor/balcony                      |
| `instrument`  | instrument type, brand, model, year                                                  |
| `art`         | artist/maker, medium/material, dimensions, year                                      |

`generic` (null schema) covers everything else — no extra fields.

**Start hardcoded; extend to user-defined schemas if the fixed list proves
insufficient.**

Notable highlights:

- `game` covers both board games (min/max players) and video games (platform
  field distinguishes them). Both benefit from franchise grouping.
- `toy` covers LEGO: set number, piece count, theme/franchise, completeness.
- `appliance` vs `electronics` separated because extraction hints differ
  (serial + device type vs. capacity + warranty).
- `plant`: species identification from photo is something LLaVA does well.

### KV impact

Item gains a `metadata: Record<string, unknown>` field for schema-specific data.
Category gains a `schemaType: string | null` field. Existing items default to
`schemaType: null` (generic).

---

## Series / collections

A Series entity groups items that belong to the same sequence or franchise.

```
Series: "Harry Potter"  (schemaType: book)
  ├── Vol 1 ✓
  ├── Vol 2 ✓
  ├── Vol 3 ✗  ← gap (not in inventory)
  └── Vol 4 ✓

Series: "Marvel MCU"  (schemaType: video, unordered)
  ├── Iron Man ✓
  └── Thor ✓
```

### Series assignment

- **Books:** API-assisted. Google Books returns series info in the ISBN response
  at no extra cost. Pipeline auto-creates/matches the series and links the item.
- **Everything else:** manual. User assigns series in the edit modal. The AI may
  suggest a franchise name as free text but does not auto-link.

### Series entity fields

```
id, name, schemaType, totalCount (optional), createdAt
```

`totalCount` enables gap detection: if you know Harry Potter has 7 books and you
have 5, the series view shows which volumes are missing.

---

## Item list stays minimal

List view: photo thumbnail + name + category. All schema-specific fields go on
the detail/edit page only. This keeps the list fast and readable on mobile.

---

## Spec plan

Four specs needed to implement this vision:

| # | Spec name             | Depends on | Notes                                  |
| - | --------------------- | ---------- | -------------------------------------- |
| 1 | `item-classification` | photos     | Pipeline + statuses + tinder review UI |
| 2 | `typed-categories`    | inventory  | Schemas + metadata fields              |
| 3 | `series`              | typed-cat  | Series entity + membership + gap view  |
| — | `photos`              | —          | Already written, no changes needed     |

`item-classification` ships first and independently. The AI pipeline runs in
"guess-the-category" mode until `typed-categories` lands, then becomes
schema-aware in a follow-up pass.

---

## Open questions (for spec-writing time)

1. **User-defined schemas:** start hardcoded; revisit if the fixed list hits a
   wall. Decision deferred.
2. **Series for non-sequential items:** use `totalCount: null` to signal
   "unordered franchise." Gap detection only applies when `totalCount` is set.
3. **Retroactive processing:** pipeline selects all `pending` items (not just
   new ones). User confirms this is desired.
4. **LEGO:** tracked under `toy` schema with `setNumber` and `pieceCount`
   fields. Series = LEGO theme (e.g., "Technic", "Star Wars").
