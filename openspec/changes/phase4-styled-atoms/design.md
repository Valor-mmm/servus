## Context

The app has four distinct rough-edge categories identified in the 2026-06-19
review: inconsistent back-link styling, hand-rolled empty states, broken
pluralization, and an over-eager BottomNav active indicator.

## Goals / Non-Goals

**Goals:**

- One consistent visual treatment for all secondary/back actions
- A single reusable `EmptyState` component with icon + message props
- A `count()` helper that produces correct German singular/plural
- BottomNav active tab fires only on exact route match or strict prefix

**Non-Goals:**

- Redesigning button colors or layout beyond standardizing existing classes
- Adding new islands or client-side interactivity
- Changing any KV schema or data model

## Decisions

**`.btn-secondary` audit**: All Zurück / Abbrechen links already have the class
in some routes; this pass applies it uniformly. No CSS changes needed — the
class already exists in `styles.css`.

**`EmptyState` component** (`components/EmptyState.tsx`):

```tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div class="empty-state">
      <img src="/lion.svg" alt="" aria-hidden="true" class="empty-state-icon" />
      <p>{message}</p>
    </div>
  );
}
```

Routes replace their ad-hoc empty paragraphs/divs with
`<EmptyState message={t("...")} />`.

**`count()` helper** in `lib/i18n/t.ts`:

```ts
export function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
```

Apply to item-count and box-count display strings. German pairs e.g.:

- `count(n, "Gegenstand", "Gegenstände")`
- `count(n, "Karton", "Kartons")`

**BottomNav fix** (`components/BottomNav.tsx`): Change active logic from
`current.startsWith(href)` to
`current === href || current.startsWith(href + "/")`. This means `/items` only
highlights on `/items` and `/items/123`, not `/items/incomplete` (because
`"/items/incomplete".startsWith("/items/")` is true, which is correct —
`/items/incomplete` IS under `/items`). Actually the fix is already correct in
`_app.tsx`; `BottomNav.tsx` needs the same treatment.

## Risks / Trade-offs

Low risk — purely additive styling changes. Empty-state replacement is
mechanical. The `count()` helper has no side effects.
