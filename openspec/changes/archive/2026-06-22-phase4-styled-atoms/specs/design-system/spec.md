## ADDED Requirements

### Requirement: Consistent empty states

Every list page MUST use the shared `EmptyState` component (icon + message) when
no records exist. Ad-hoc empty paragraphs or divs are not permitted.

#### Scenario: Empty list shows EmptyState

- **WHEN** an authenticated user visits any list page (items, boxes, rooms,
  categories, groups) and the list is empty
- **THEN** the `EmptyState` component is rendered with the lion SVG and a German
  prompt

---

### Requirement: Correct German pluralization

Count strings (item counts, box counts) MUST use the
`count(n, singular, plural)` helper and produce grammatically correct German for
both n=1 and n≠1.

#### Scenario: Singular item count

- **WHEN** exactly 1 item or box is counted
- **THEN** the display reads "1 Gegenstand" / "1 Karton" (not "1 Gegenstände")

---

### Requirement: Consistent secondary-action styling

All Zurück and Abbrechen links/buttons MUST use the `.btn-secondary` class.

---

### Requirement: BottomNav exact active-tab matching

The active tab indicator in the bottom navigation MUST fire only when the
current path equals the tab's href exactly or starts with `href + "/"`. It MUST
NOT fire for unrelated sibling paths that happen to share a prefix.

#### Scenario: /items tab active on sub-routes

- **WHEN** the current path is `/items/123` or `/items/incomplete`
- **THEN** the Items tab is marked active

#### Scenario: /items tab not active on /items-related-but-different path

- **WHEN** the current path is a route that does not start with `/items/` and is
  not `/items`
- **THEN** the Items tab is NOT marked active
