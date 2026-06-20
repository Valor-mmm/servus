import { assert, assertEquals } from "@std/assert";

const CSS = await Deno.readTextFile(
  new URL("../../../static/styles.css", import.meta.url),
);

const MANIFEST = JSON.parse(
  await Deno.readTextFile(
    new URL("../../../static/manifest.json", import.meta.url),
  ),
);

// ── Group 12: Complete CSS class coverage ──────────────────────────────────────
// Every CSS class referenced from existing TSX components MUST be defined in
// the stylesheet. The classes below were historically referenced from
// components but not declared in CSS, breaking those pages silently.

const requiredClasses = [
  ".auth-page",
  ".photo-gallery",
  ".photo-gallery-img",
  ".qty-controls",
  ".qty-label",
  ".badge-incomplete",
  ".photo-capture",
  ".photo-capture--multi",
  ".capture-btn",
  ".capture-error",
];

for (const cls of requiredClasses) {
  Deno.test(`${cls} is defined in the stylesheet`, () => {
    const present = CSS.includes(`${cls} `) ||
      CSS.includes(`${cls},`) ||
      CSS.includes(`${cls}{`) ||
      CSS.includes(`${cls}:`) ||
      CSS.includes(`${cls}.`) ||
      CSS.includes(`${cls}\n`);
    assert(
      present,
      `${cls} is referenced by components but missing from styles.css`,
    );
  });
}

// ── Group 14: PWA manifest theme_color matches Raute primary ──────────────────

Deno.test("manifest.json theme_color matches Raute primary", () => {
  assertEquals(
    MANIFEST.theme_color.toUpperCase(),
    "#0E4FA0",
    "manifest theme_color should equal Raute --servus-primary",
  );
});

Deno.test("manifest.json background_color matches Raute page ground", () => {
  assertEquals(
    MANIFEST.background_color.toUpperCase(),
    "#F4ECDA",
    "manifest background_color should equal Raute --servus-bg",
  );
});

Deno.test("manifest declares required PWA fields", () => {
  for (
    const field of ["name", "short_name", "display", "theme_color", "icons"]
  ) {
    assert(field in MANIFEST, `manifest must include ${field}`);
  }
  assertEquals(MANIFEST.display, "standalone");
  assert(Array.isArray(MANIFEST.icons) && MANIFEST.icons.length >= 1);
});
