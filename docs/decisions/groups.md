# Decision: item groups

**Date:** 2026-01  
**Change:** `groups`

## Context

After the inventory core was live, users needed a way to associate items that
belong together logically but live in different rooms or boxes (e.g. all kitchen
accessories scattered across multiple boxes). Categories did not serve this
because a category is a classification, not an association — one item can only
have one category, and the category applies app-wide.

## Decision

Add a first-class `Group` entity: a named, ordered set of items. An item can
belong to zero or more groups (many-to-many). Groups are flat (no nesting).
Groups are shown in the admin hub and on each item's detail page.

KV layout: `["group", id]` primary; `["group-item", groupId, itemId]` stores
membership + position; `["item-group", itemId, groupId]` is the reverse index
for cascade delete.

## Alternatives considered

- **Tags** — simpler but unordered and harder to display as a unit.
- **Smart lists** (filter presets) — would not solve the "cluster for packing"
  use case because items in the same group may have different categories.

## Consequences

Groups are append-only for helpers; only admins can create/delete. This keeps
the helper UX simple while giving the primary users the power to curate.
