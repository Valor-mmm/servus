# Three directions — pick a temperament

Three genuinely distinct visual languages for servus. They share zero motifs.
None is the safe middle. Each commits to a point of view; the only way to choose
is to feel them.

For each direction below: concept → palette → typography → spatial logic → mood
→ what makes it different → where the mocks live.

---

## Direction A — **Raute** (Heraldic / Flag)

> A Bavarian flag, but as an interface.

### Concept

Lean directly into the most recognizable Bavarian visual asset on earth: the
blue-and-white lozenge (Raute). The lozenge is not decoration; it is the
**structural grid** of the app. Page backgrounds, card edges, empty states, even
the loading state read as fragments of the flag. Like Vitsoe-meets-FC Bayern —
confident, modernist, high-contrast, completely unafraid of being Bavarian.

This is the loudest of the three. It's the "yes, we are from Bayern, and we will
not be quiet about it" answer.

### Palette

| Token      | Light     | Dark      | Role                         |
| ---------- | --------- | --------- | ---------------------------- |
| Bayernblau | `#0E4FA0` | `#3B82C9` | Primary, structural lozenges |
| Schneeweiß | `#FFFFFF` | `#0A1320` | Alternating lozenge fill     |
| Tinte      | `#0A1A2E` | `#E8EEF7` | Body text, edges             |
| Pergament  | `#F4ECDA` | `#161A23` | Page ground                  |
| Löwengold  | `#E5A82E` | `#F2C24A` | Single accent — CTAs only    |
| Mörtel     | `#7B8B9E` | `#5C6B82` | Muted secondary text         |
| Signalrot  | `#B4332D` | `#D04A45` | Destructive (used sparingly) |

Body text on parchment: `#0A1A2E` on `#F4ECDA` → ~13.1:1 contrast. Pass.

### Typography

- **Display:** `"DIN 2014"` (system:
  `"DIN Alternate", "DIN Pro", "Roboto Condensed", system-ui`). German
  modernist, condensed caps for codes (`B-006`), full weight for headings.
- **Body:** `"Inter", system-ui` — neutral, clean. Lets DIN do the personality.
- **Numbers:** tabular nums for codes and counts.

### Spatial logic

- A diagonal 45° lozenge motif anchors the top of every page — sometimes a band
  of lozenges, sometimes a single one as a section break.
- Generous whitespace; high contrast edges. No drop shadows. Hard 1px hairlines.
- Cards are square-cornered or 2px radius max. No friendly rounding.
- Active nav state is a **full lozenge** of gold behind the label, not an
  underline.

### Mood

Civic. Confident. A municipal building in München. Print-design discipline
applied to a screen. You feel that someone with strong opinions made it.

### What makes it different

- The flag is structural, not garnish.
- Sharp corners, condensed type, no smooth shadows — anti "friendly SaaS."
- High-contrast color blocks instead of subtle surfaces.

### Risk

Can feel football-club loud if not restrained. The mock leans into restraint by
giving lozenges only at section breaks, not behind content.

### Mock files

- `mocks/direction-a/login.html`
- `mocks/direction-a/items.html`
- `mocks/direction-a/box-detail.html`

---

## Direction B — **Hütte** (Mountain cabin / paper & wood)

> Warmth, paper, wood, hand-folded. A field journal in a Bavarian mountain hut.

### Concept

Treat the app as a **physical inventory ledger** — the kind you'd keep in a
wooden cabinet in a cabin while taking stock of what's there. Not literal
skeuomorphism. Just enough material warmth — paper grain, oak edges, ink — to
make the screen feel like an object you could hold. Loden green replaces generic
action-blue. Bavarian blue appears only as a small detail, like a folded
handkerchief tucked into the design.

This is the warmest and most domestic of the three. Right for a household app.
It says "this is your home, not your office."

### Palette

| Token      | Light     | Dark      | Role                                 |
| ---------- | --------- | --------- | ------------------------------------ |
| Loden      | `#3D5A3E` | `#7CA37A` | Primary action, status accents       |
| Eiche      | `#7A4F2B` | `#3D2817` | Wood frame, dividers, headers        |
| Papier     | `#FAF5E8` | `#1C1812` | Page ground (warm paper)             |
| Tinte      | `#2A1F12` | `#F2E6CC` | Body text (sepia ink)                |
| Edelweiß   | `#FFFFFF` | `#2A241B` | Card / surface (clean snow)          |
| Bayernblau | `#1A5FA8` | `#5A92D0` | Detail accent only (badges, ribbons) |
| Enzian     | `#C4922A` | `#E5B95A` | Gentian/honey — secondary accent     |
| Granatrot  | `#8B2D2D` | `#B85050` | Destructive (rare; like wax seal)    |

Body: `#2A1F12` on `#FAF5E8` → ~12.5:1.

### Typography

- **Display:** `"Cormorant Garamond"` or `"EB Garamond"` — old-style serif with
  warmth. Used for headings, page titles, and box codes (treated like inventory
  tags written by hand).
- **UI / Body:** `"Inter"` for forms and labels, kept small and quiet.
- **Numerals:** tabular old-style for box codes (`B-006` reads as written).

The serif/sans pair gives the app two voices: the human one (headings, inventory
items) and the machine one (form labels, metadata).

### Spatial logic

- A subtle **paper-grain** background (very faint SVG noise) on the page.
- Cards have a 1px oak-brown border and a soft, hand-printed feel. Slight
  asymmetry permitted — a box code might sit tilted 1° like a label.
- Section dividers are thin double-rules (`= =`) like a ledger.
- Empty states show the lion **as a wood-block print** at large scale.
- Status badges look like wax seals or stamped tags, not Bootstrap pills.

### Mood

A spring afternoon in a cabin. Sun through wood-framed windows. You wouldn't
shout in this room. The app supports the move because it loves the things being
moved.

### What makes it different

- Texture and material warmth — paper, wood, ink, wax. Not flat.
- Serif display type — warmth and slowness instead of tech efficiency.
- Loden green, not blue, as the primary. Bavarian blue used as a small ribbon
  detail.
- The lion is a recurring character, not a logo.

### Risk

Can drift into folkloric/twee territory. The mock keeps it under control by
using restraint: no fraktur, no edelweiss icons, no scrollwork. The cabin
feeling comes from typography, color temperature, and a single paper-grain SVG —
not from heavy ornament.

### Mock files

- `mocks/direction-b/login.html`
- `mocks/direction-b/items.html`
- `mocks/direction-b/box-detail.html`

---

## Direction C — **Bergsteiger** (Alpine technical / topographic)

> A modern climbing-guide field interface. Slate, sky, snow, charts.

### Concept

Imagine the visual language of a contemporary alpine climbing topo or a Swiss
trail-mapping app — but applied to your house, your boxes, your inventory. The
house is a route. The boxes are pitches. The items are gear. Information-dense,
calm, sharp grid, mountain-cool palette, technical typography. Bavarian via
geography (Alpine), not via heraldry.

This is the calmest, most modern, most "tool that handles a real job" of the
three. It's the one that scales best if the app ever takes on more domain
(shopping, recipes, fridge).

### Palette

| Token      | Light     | Dark      | Role                                              |
| ---------- | --------- | --------- | ------------------------------------------------- |
| Schiefer   | `#1F2A35` | `#E2E8EF` | Body text, headers, structure                     |
| Gletscher  | `#3FA1B8` | `#5DC4DA` | Primary action (glacier blue)                     |
| Himmel     | `#DCE9F0` | `#1A2733` | Page background (cold sky)                        |
| Firn       | `#F7FAFC` | `#0E1620` | Card/surface (compacted snow)                     |
| Granit     | `#4A5567` | `#A4B0C0` | Secondary text, muted UI                          |
| Föhn       | `#E8A540` | `#F0B255` | Accent (warm wind) — used for status & highlights |
| Enzianblau | `#1F4E8C` | `#4A82C4` | Deep blue for emphasis (rare)                     |
| Almrot     | `#A04545` | `#C46868` | Destructive (alpine sunset)                       |

Body text: `#1F2A35` on `#DCE9F0` → ~12.7:1.

### Typography

- **Display + UI:** `"Söhne", "Inter Tight", system-ui` — used at multiple
  weights. Tight tracking. Display sizes are bold but never decorative.
- **Numerics:** **`"JetBrains Mono"`** for box codes and quantities. Mono
  numerics give the app a "field instrument" feel — like reading a depth gauge.
- A small all-caps eyebrow label above every section title, with tight letter
  spacing (`PACKEN` / `INVENTAR`). Reads like a map legend.

### Spatial logic

- Grid-first. A consistent 4-column gutter on mobile, 12-column on desktop.
- Data tables instead of cards for lists. Lines, not boxes.
- Status uses **shaped chips** rather than colored pills: a triangle for
  "packed," a circle for "delivered," a hollow square for "empty." Color
  reinforces shape but doesn't replace it. (Accessibility win for colorblind
  users.)
- Subtle 1px topographic-contour SVG decoration in the page header (very faint,
  like a watermark).
- Charts are first-class. The packing-progress widget is visible at the top of
  items/boxes pages — a horizontal stacked bar showing "verpackt / geliefert /
  offen."

### Mood

A pre-dawn alpine start. Cold, clear, focused. Map open on a slate-grey table.
The app does its job and gets out of your way. Bayern is in the air (the peaks,
the sky, the föhn wind) but never in the chrome.

### What makes it different

- Technical typography (mono numerics).
- Geometric status shapes — color is not the only signal.
- Information density: data tables, charts, contour watermarks.
- Cool palette (not warm). Bavarian via Alpine geography.
- No nostalgia. No paper. No heraldry. Just the mountains.

### Risk

Can read as "developer tool" rather than "household app." The mock counters this
by including soft typographic details (eyebrow labels, generous line height) and
using glacier-cyan rather than corporate blue.

### Mock files

- `mocks/direction-c/login.html`
- `mocks/direction-c/items.html`
- `mocks/direction-c/box-detail.html`

---

## How they differ at a glance

|                  | A — Raute            | B — Hütte                  | C — Bergsteiger            |
| ---------------- | -------------------- | -------------------------- | -------------------------- |
| Temperature      | Cool, neutral        | Warm                       | Cold, crisp                |
| Primary          | Bayernblau           | Loden green                | Glacier cyan               |
| Background       | Parchment + lozenges | Paper grain                | Cold sky / firn            |
| Type personality | Modernist sans (DIN) | Old-style serif (Garamond) | Tight grotesque + mono     |
| Corner radius    | 0–2 px               | 4 px, soft                 | 0 px (sharp grid)          |
| Texture          | Color blocks         | Paper grain, wood          | Contour lines, charts      |
| Loudness         | High (graphic)       | Medium (intimate)          | Low (instrument)           |
| Lion as          | Heraldic monogram    | Wood-cut illustration      | Topographic mark           |
| Best mode        | Owner shows it off   | Owner relaxes into it      | Owner gets work done in it |

If you can't choose: pick the one that surprises you most when you open the
mock. The right answer is the one that makes you feel **something specific**.
