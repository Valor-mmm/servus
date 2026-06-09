# Design exploration — pick the temperament for servus

You said the app feels "improved but not proud of it" and that you want a full
visual reset with a real Bavarian theme. This folder is the answer to "what
could it look like?" — three genuinely different directions, each with mocked
screens you can open in a browser.

## How to walk through this

1. **Start with `critique.md`** (5 min) A fresh-observer reading of the app as
   it stands today. Don't argue with it yet — just read it. Useful so we share a
   vocabulary about what's wrong before you look at what could be right.

2. **Read `directions.md`** (10 min) The three concepts side by side. Each
   direction has a name, a one-line pitch, a palette, a typography choice, and a
   paragraph about mood. The table at the bottom lets you compare them at a
   glance.

3. **Open the mocks in a browser** (the important part)
   ```
   open mocks/direction-a/login.html
   open mocks/direction-a/items.html
   open mocks/direction-a/box-detail.html
   ```
   …same for `direction-b/` and `direction-c/`. They open as static files, no
   server needed. Resize the window down to ~375 px to see the mobile treatment
   of each.

   **Look in this order**: login → items list → box detail. The first impression
   matters; the items list is where you'll live during the move; the box detail
   is the most data-dense screen and the truest test of the language.

4. **Reference back to `screenshots/`** (optional) The `screenshots/` folder has
   the current app captured at the same screen sizes, so you can put "before"
   next to "after" if it helps.

## The three directions in one breath each

- **A — Raute (Heraldic / Flag)** — the Bavarian flag _is_ the interface. Bold,
  modernist, condensed type, lozenge motif as structure. Loud and confident.
- **B — Hütte (Mountain cabin)** — warm paper, wood frame, loden green, serif
  type, hand-feeling tags. Warmest. A household, not an office.
- **C — Bergsteiger (Alpine technical)** — slate, glacier, mono numerics,
  topographic background. Cool, modern, instrument-like. Bavarian via geography.

They are not three versions of the same idea. They are three different opinions
about what servus should feel like. The right answer is the one that makes you
feel something specific when you open the mock.

## How to react

You don't have to pick one cleanly. Useful reactions include:

- "B is right, but the wood is too much — keep the loden and the serif."
- "A is too loud for daily use, but the lozenge as an active-nav shape is
  brilliant — steal that for whichever we choose."
- "C feels like a workplace, not a home. Drop it."
- "Take the headers of A, the body of B, and the data table of C."

Anything along those lines is gold. Concrete reactions to concrete mocks are
much more productive than abstract opinions about "Bavarian feel."

## What this folder does NOT do

- It does NOT change any source code. The current app is untouched.
- It does NOT propose a new design system. Once you pick a direction (or a
  combination), the next step is an OpenSpec proposal that replaces the current
  `design-system` spec — that's a separate session.
- It does NOT include every screen. Login, items list, and box detail are enough
  to feel each direction. Lists, forms, and admin pages will follow the chosen
  language naturally.

## Files

```
design-exploration/
├── README.md                   ← you are here
├── critique.md                 ← fresh-observer reading of the current app
├── directions.md               ← the three concepts in detail
├── screenshots/                ← current app, desktop + mobile
│   ├── desktop-login.png
│   ├── desktop-items.png
│   ├── desktop-item-detail.png
│   ├── desktop-boxes.png
│   ├── desktop-box-detail.png
│   ├── desktop-box-label.png
│   ├── desktop-invites.png
│   ├── desktop-item-new.png
│   ├── mobile-login.png
│   ├── mobile-items.png
│   ├── mobile-item-detail.png
│   ├── mobile-boxes.png
│   ├── mobile-box-detail.png
│   ├── mobile-box-label.png
│   ├── mobile-invites.png
│   └── mobile-item-new.png
└── mocks/
    ├── direction-a/            ← Raute (flag/heraldic)
    │   ├── login.html
    │   ├── items.html
    │   └── box-detail.html
    ├── direction-b/            ← Hütte (cabin/paper)
    │   ├── login.html
    │   ├── items.html
    │   └── box-detail.html
    └── direction-c/            ← Bergsteiger (alpine technical)
        ├── login.html
        ├── items.html
        └── box-detail.html
```

## A word on copy

The mocks use real German strings from `lib/i18n/locales/de.ts`. Where the
locale didn't have copy for a new element (e.g. a packing progress widget), the
mocks invent natural German labels — those are placeholders for the real `t()`
keys we'd add in implementation.

## What happens after you pick

Once you have a reaction:

1. Tell me which direction (or mash-up) lands.
2. I open `/openspec-propose` for a new change that replaces the current
   `openspec/specs/design-system/spec.md`.
3. Spec covers tokens, type pairings, button/badge variants, navigation
   treatment, lion usage rules, dark-mode mapping — everything needed to make
   the chosen language reproducible in the real CSS.
4. Implementation is the easy part. The spec is what we discuss.

No rush — but the longer you sit with a direction without picking, the more
you've already chosen.
