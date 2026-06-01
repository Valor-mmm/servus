# Design: multi-photo-capture

## No new API endpoints

`create-from-photo` already returns the full item JSON
(`Response.json(item, { status: 201 })`), so `item.id` is available after the
first capture. `append-photo` already accepts `{ itemId, photoKey }`. No backend
changes needed.

## Island state machine

```
idle
  → [photo selected] → uploading
uploading
  → [success, mode=create] → created(itemId)
  → [success, mode=append] → done → reload
  → [error] → idle (shows error)
created(itemId)
  → [user taps "Weiteres Foto"] → uploading (append to same itemId)
  → [user taps "Fertig"] → reload
```

A `createdItemId` signal (initially `null`) holds the item id after the first
create. When set, subsequent uploads call `append-photo` with that id regardless
of the outer `mode` prop.

## What does NOT change

- The `mode` prop API is unchanged; callers don't need to update.
- Existing `append` mode behaviour (e.g. on item edit page) is unchanged.
- No new routes, no new API endpoints, no KV schema changes.
