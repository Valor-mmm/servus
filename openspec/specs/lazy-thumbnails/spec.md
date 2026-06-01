# Lazy Thumbnails Specification

### Requirement: Deferred thumbnail loading

Item thumbnail images in list views MUST use deferred loading via
`IntersectionObserver`. The server MUST render thumbnails with a `data-src`
attribute (not `src`) containing the presigned R2 URL. A client-side script MUST
observe all `[data-src]` images and swap `data-src` → `src` only when the image
enters the viewport. Images that are never scrolled into view MUST NOT trigger
any R2 GET request.

#### Scenario: Off-screen thumbnail is not fetched

- **WHEN** the items list page is loaded and an item with a thumbnail is below
  the fold
- **THEN** no network request is made for that thumbnail's R2 URL until the user
  scrolls it into view

#### Scenario: Visible thumbnail loads on scroll

- **WHEN** a user scrolls an item with a thumbnail into the viewport
- **THEN** the thumbnail image loads within one IntersectionObserver tick and
  replaces the placeholder

#### Scenario: Filter-hidden thumbnail is not fetched

- **WHEN** a client-side or server-side filter hides an item row
- **THEN** if the thumbnail was not yet loaded, no R2 request is made for it

---

### Requirement: Thumbnail loading placeholder

While a thumbnail's `src` has not yet been set (image not yet loaded), the image
slot MUST display a styled placeholder of the same dimensions as the thumbnail.
The placeholder MUST use a shimmer animation on devices that do not have
`prefers-reduced-motion: reduce` set. On devices with reduced-motion preference,
the placeholder MUST be a static muted color with no animation.

#### Scenario: Placeholder visible before scroll

- **WHEN** the items list renders and a thumbnail has not yet entered the
  viewport
- **THEN** a fixed-size placeholder in the thumbnail slot is visible, matching
  the thumbnail dimensions

#### Scenario: Shimmer respects reduced-motion preference

- **WHEN** the device has `prefers-reduced-motion: reduce` set
- **THEN** the placeholder is a static color with no shimmer animation

---

### Requirement: Presigned URL error handling

If a thumbnail image fails to load (network error, 403 expired URL, or any other
error), the app MUST:

1. Replace the broken image slot with a static placeholder icon.
2. Display a single dismissable banner at the top of the page the first time any
   image on that page fails.

The banner MUST contain a prompt to reload the page. Only one banner MUST be
shown per page load regardless of how many images fail.

#### Scenario: First image failure shows banner

- **WHEN** a thumbnail image fires an `error` event on the items list page
- **THEN** a dismissable banner appears at the top of the page content area with
  a German prompt to reload

#### Scenario: Subsequent failures do not add more banners

- **WHEN** two or more thumbnails fail to load on the same page
- **THEN** only one error banner is shown

#### Scenario: Failed image slot shows placeholder icon

- **WHEN** a thumbnail image fires an `error` event
- **THEN** the broken image is replaced by a static placeholder that does not
  show the browser's default broken-image icon
