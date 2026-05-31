# Photos Specification

## Requirements

### Requirement: R2 bucket is private

The R2 bucket backing item photos MUST NOT be configured for public access. All
read access MUST require a presigned URL produced by the application.

#### Scenario: Direct unauthenticated GET to bucket origin is rejected

- **WHEN** an unauthenticated HTTP client requests `<R2_PUBLIC_URL>/<any-key>`
  without a signed query string
- **THEN** the response is `4xx` (Cloudflare R2 returns `400` in practice) from
  R2 and no object bytes are returned

#### Scenario: Direct unauthenticated PUT to bucket origin is rejected

- **WHEN** an unauthenticated HTTP client attempts to PUT to
  `<R2_PUBLIC_URL>/<any-key>` without a signed query string
- **THEN** the response is `401` or `403` from R2 and no object is written

---

### Requirement: Upload URLs are presigned and short-lived

The system MUST issue presigned PUT URLs that are valid for at most 5 minutes
and are bound to a single, server-chosen object key. The URL MUST be issued only
to an authenticated session that has passed CSRF verification.

#### Scenario: Authenticated user receives upload URL

- **WHEN** an authenticated user POSTs `/api/photos/upload-url` with a valid
  CSRF token and a body specifying `contentType: "image/jpeg"`
- **THEN** the response includes a fresh random object key and a presigned PUT
  URL valid for 5 minutes

#### Scenario: Unauthenticated request is rejected

- **WHEN** an unauthenticated client POSTs `/api/photos/upload-url`
- **THEN** the response is `401` and no key or URL is issued

#### Scenario: Missing CSRF token is rejected

- **WHEN** an authenticated user POSTs `/api/photos/upload-url` without a valid
  CSRF token
- **THEN** the response is `403` and no key or URL is issued

---

### Requirement: Photo keys are unguessable

The system MUST generate object keys with at least 128 bits of entropy sourced
from `crypto.getRandomValues`. Keys MUST NOT encode any user identifier, item
identifier, or timestamp that would allow enumeration of the bucket.

#### Scenario: Key generation entropy

- **WHEN** the system generates 1000 photo keys in a row
- **THEN** every key is distinct and each key is at least a 32-character
  representation of ≥128 random bits

---

### Requirement: Display URLs are presigned with a windowed expiry

The system MUST issue presigned GET URLs whose expiry is rounded to the start of
the current 15-minute wall-clock window. Two renders of the same key within the
same 15-minute window MUST produce byte-identical URLs to support browser
caching.

#### Scenario: Same window produces identical URL

- **WHEN** the system signs a GET URL for key `K` twice within the same
  15-minute window
- **THEN** both URLs are byte-identical strings

#### Scenario: Different windows produce different URLs

- **WHEN** the system signs a GET URL for key `K` once in one 15-minute window
  and once in the next
- **THEN** the two URLs differ in their expiry timestamp and signature

---

### Requirement: Photo deletion is best-effort and never blocks the caller

The system MUST issue an R2 DELETE for every affected key after the KV write
commits, whenever an item is deleted or a photo key is removed from an item's
`photos` array. Failures to delete from R2 MUST be logged but MUST NOT cause the
user-facing operation to fail.

#### Scenario: Item delete fires R2 deletes for all photos

- **WHEN** an authenticated user deletes an item with three photo keys
- **THEN** the KV record and indexes are removed, and three R2 DELETE requests
  are issued for the three keys

#### Scenario: R2 delete failure does not fail the request

- **WHEN** an item with one photo is deleted and the R2 DELETE request fails
- **THEN** the user-facing response is success, the failure is logged, and the
  item record remains deleted in KV

---

### Requirement: Upload size and content-type are bounded

The presigned URL request handler MUST reject uploads whose declared
`contentType` is not in an allowlist (`image/jpeg`, `image/png`, `image/webp`)
and whose declared byte length exceeds 4 MiB.

#### Scenario: Disallowed content type is rejected at issuance

- **WHEN** an authenticated user requests an upload URL for
  `contentType: "application/pdf"`
- **THEN** the response is `400` and no presigned URL is issued

#### Scenario: Oversized declared length is rejected at issuance

- **WHEN** an authenticated user requests an upload URL declaring a body size of
  8 MiB
- **THEN** the response is `400` and no presigned URL is issued
