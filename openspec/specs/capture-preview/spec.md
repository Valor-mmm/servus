# Capture Preview Specification

## Requirements

### Requirement: Captured photos are previewed inline during multi-photo session

After the first photo is successfully uploaded and an item is created, the
capture island MUST display a horizontal strip of thumbnail images representing
every photo captured in the current session. Thumbnails MUST be rendered from
in-memory blob URLs (no additional network requests). The strip MUST be visible
before the user taps "Weiteres Foto" or "Fertig".

#### Scenario: First photo shows one thumbnail in the strip

- **WHEN** a user captures the first photo in create mode
- **THEN** the island switches to the multi-photo state and a thumbnail strip
  containing exactly one image is visible

#### Scenario: Each additional photo adds a thumbnail

- **WHEN** a user captures a second (or subsequent) photo in the same session
- **THEN** the thumbnail strip grows by one image, showing all photos captured
  so far in the order they were taken

#### Scenario: Strip is not visible before any photo is captured

- **WHEN** the island is in its initial idle state
- **THEN** no thumbnail strip is rendered

---

### Requirement: Photo count is shown next to the "add another" button

The capture island MUST display the number of photos already captured in the
current session alongside the "Weiteres Foto" label (e.g. "Weiteres Foto (2)").
The count MUST update after each successful capture.

#### Scenario: Count reflects photos taken so far

- **WHEN** the user has captured N photos and the multi-photo state is active
- **THEN** the "Weiteres Foto" label shows the count N in parentheses

#### Scenario: Count is not shown before first capture

- **WHEN** the island is in its initial idle or single-capture state
- **THEN** no count is rendered next to the capture button label
