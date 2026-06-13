# Exploration: Typed Categories + Groups (+ Tags)

**Date:** 2026-06-13\
**Status:** exploration — not yet a formal proposal\
**Relation:** prerequisite work split out of
`exploration-classification-typed-inventory.md` (AI classification is now parked
until this lands).

---

## Why this came first

The AI exploration assumed AI would invent structure on the fly. We flipped
that: **build the data model first, then let AI fill it in.** Get typed
categories and grouping right, and the AI pipeline just populates known fields
("book database before AI").

---

## Sequencing

```
A. Typed categories     ← explore next
B. Groups               ← consensus reached 2026-06-13 (below)
C. Tags / attributes    ← meta-exploration; re-decide necessity AFTER B
D. AI classification    ← parked doc resumes last
```

A is the foundation (gives AI a schema to fill). B is independent. C is a
deliberate checkpoint — decide if attribute-tagging is still needed once we know
how groups actually feel.

---

## The three axes (the framing that unblocked us)

An item answers three _different_ questions. Don't conflate them.

```
WHAT is it?      →  Category   (book, tool, shirt)   → drives typed fields + AI
WHERE is it?     →  Room / Box (Keller, Box 14)      → already built
WHAT's it WITH?  →  Group      ("Campingkram", set)  → new
```

---

## Groups — consensus (2026-06-13)

A **Gruppe** is a named set of items that belong together.

- **One concept only.** Series is _not_ a separate entity — it's a group with
  two optional extras (`position`, `expectedTotal`). Tags-feel is the same
  entity with cheap creation. We never build a "Series" concept.
- **Cardinality:** one category per item; **many groups per item**
  (many-to-many). The "one category isn't enough" itch is satisfied by groups,
  not by multi-category — multi-category would break "category = one clean field
  schema".
- **Mixed categories allowed.** A group can hold items of different categories
  (drill + boxes + lamp = "Kellerkram"). No constraint, including for ordered
  groups — ordered sets will be single-category in practice without a rule.
- **Cheap creation = the tag feel.** On the item edit page, a free-text "add to
  group" input autocompletes existing groups or creates one on the fly. Type
  "Camping" → done. A throwaway group can later grow up (add a note, order it)
  with no migration.
- **Series emerges, never chosen.** The user never picks "series vs group":

  ```
  Add items                → it's a collection
  Drag to reorder          → gains order (feels like a series)
  Set "expected: 7"        → shows "5 von 7" (gap detection)
  ```

- **Scope for MVP:** membership + cheap creation. `position` / `expectedTotal`
  live in the data model but the **gap-detection UI is deferred** (post-move
  library-curation polish, not move-critical).

### Sketch model (not final)

```
Group {
  id, name, note?
  expectedTotal?   ← set → enables "5 of 7" gap view (UI later)
}
GroupMembership {
  groupId, itemId
  position?        ← set → ordered/series view
}
```

---

## Tags / attributes — parked for a later checkpoint (C)

Distinct from groups: a tag/flag describes a _single item_ rather than linking a
_set_.

```
Gruppe = "these things belong together"  (Camping, Harry Potter)
Flag   = "this item is X"                (fragile, wichtig, "Marias Sachen")
```

Candidate needs: fragile/handle-with-care, ownership (mine vs Maria's),
importance, "Garantie". **Open question:** do groups already cover enough that
flags aren't worth a separate feature? Decide after Groups (B) ships — we'll
know how the group UI feels by then. Included in the plan deliberately; not
designed yet.

---

## Typed categories — consensus (2026-06-13)

**Decision: hardcoded-but-data-_shaped_ now, editor later.**

The expensive jump is not fixed-vs-flexible — it's **schema-as-code vs
schema-as-data**. The cost (form-builder UI, dynamic rendering, runtime AI
prompts) is paid once when crossing to "data". Once crossed, built-in schemas
are just seeded rows — so the hybrid (defaults + customization) is nearly free.

So:

```
  NOW:   schema = { schemaType, fields: [{ key, label, type }] }
         seeded in code, READ as if it were data
         → AI reads the field list; UI renders from the field list
         → hardcoded list, but field-list-driven everywhere

  LATER: an editor that writes those same objects to KV
         → "user-defined" becomes additive, not a rewrite
         → built-ins remain as seed defaults  = the hybrid, for free
```

**Why phase it:** the _move_ doesn't need typed fields (you pack with flat
categories); typed fields are post-move curation, no deadline. And the editor's
real driver is confirmed: **Maria does most item-entry and will need to add/edit
categories herself.** For now the owner edits the seed data when she asks —
fewer moving parts that can fail during the move. The editor lands once things
settle.

Carried over as raw material (book: author/ISBN/...; tool: brand/voltage/...;
etc. — full draft table in the parked AI doc). Item gains a `metadata` bag for
schema-specific values. List view stays minimal (photo + name + category); typed
fields live on the detail page.

### Open threads (next session)

- Which schemas to seed for launch (book + a few, or the full ~12-schema table)?
- Field `type` set to support (text / number / enum / date / boolean?).
- Where `metadata` and schema definitions live in KV.
- How a schema's field list maps into the AI extraction prompt.

---

## Current baseline (grounding)

Today `Item` has a single `categoryId: string | null`; `Category` is just
`{ id, name, createdAt }` with no fields. Items also carry `roomId`, `boxId`,
`quantity`, `estimatedValue`, `photos`, `status`. Everything above is additive.
