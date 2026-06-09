import { assert, assertEquals } from "@std/assert";

const CSS = await Deno.readTextFile(
  new URL("../../../static/styles.css", import.meta.url),
);

// Match a CSS block starting after `selector {` up to the matching `}`.
function extractBlock(css: string, selector: string): string {
  const idx = css.indexOf(selector);
  if (idx === -1) return "";
  const start = css.indexOf("{", idx);
  if (start === -1) return "";
  let depth = 1;
  for (let i = start + 1; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return css.slice(start + 1, i);
    }
  }
  return "";
}

// Theme-agnostic structural tokens live on :root.
Deno.test(":root defines theme-agnostic structural tokens", () => {
  const root = extractBlock(CSS, ":root");
  assert(root.length > 0, ":root block must exist");

  const structural = [
    "--servus-radius",
    "--servus-radius-pill",
    "--servus-type-display-family",
    "--servus-type-body-family",
    "--servus-space-1",
    "--servus-space-2",
    "--servus-space-3",
    "--servus-space-4",
    "--servus-space-5",
    "--servus-space-6",
    "--servus-space-7",
    "--servus-space-8",
  ];

  for (const t of structural) {
    assert(
      root.includes(`${t}:`),
      `:root must define ${t}`,
    );
  }
});

// Theme-specific palette lives inside html.theme-<name>.
const requiredPaletteTokens = [
  "--servus-bg",
  "--servus-surface",
  "--servus-surface-raised",
  "--servus-text",
  "--servus-text-muted",
  "--servus-border",
  "--servus-primary",
  "--servus-primary-hover",
  "--servus-accent",
  "--servus-danger",
  "--servus-nav-bg",
  "--servus-nav-active",
  "--servus-motif-stroke",
  "--servus-horizon-fill",
  "--servus-spark",
];

Deno.test("html.theme-raute defines the full palette", () => {
  const block = extractBlock(CSS, "html.theme-raute");
  assert(block.length > 0, "html.theme-raute block must exist");
  for (const t of requiredPaletteTokens) {
    assert(block.includes(`${t}:`), `theme-raute must define ${t}`);
  }
});

Deno.test("html.theme-sternenhimmel defines the full palette", () => {
  const block = extractBlock(CSS, "html.theme-sternenhimmel");
  assert(block.length > 0, "html.theme-sternenhimmel block must exist");
  for (const t of requiredPaletteTokens) {
    assert(block.includes(`${t}:`), `theme-sternenhimmel must define ${t}`);
  }
});

// Spec-pinned values for Raute (light theme).
Deno.test("theme-raute palette matches design-system spec", () => {
  const block = extractBlock(CSS, "html.theme-raute");
  const expected: Record<string, string> = {
    "--servus-bg": "#F4ECDA",
    "--servus-surface": "#FFFFFF",
    "--servus-surface-raised": "#FAF5E8",
    "--servus-text": "#0A1A2E",
    "--servus-text-muted": "#7B8B9E",
    "--servus-border": "#D5C9A8",
    "--servus-primary": "#0E4FA0",
    "--servus-primary-hover": "#093C7C",
    "--servus-accent": "#E5A82E",
    "--servus-danger": "#B4332D",
    "--servus-nav-bg": "#0E4FA0",
    "--servus-nav-active": "#E5A82E",
    "--servus-motif-stroke": "#FFFFFF",
    "--servus-horizon-fill": "#FFFFFF",
    "--servus-spark": "#E5A82E",
  };
  for (const [name, hex] of Object.entries(expected)) {
    // Match either uppercase or lowercase hex — author-friendly.
    const re = new RegExp(`${name}:\\s*${hex}`, "i");
    assert(re.test(block), `theme-raute ${name} must be ${hex}`);
  }
});

// Spec-pinned values for Sternenhimmel (dark theme).
Deno.test("theme-sternenhimmel palette matches design-system spec", () => {
  const block = extractBlock(CSS, "html.theme-sternenhimmel");
  const expected: Record<string, string> = {
    "--servus-bg": "#0E1830",
    "--servus-surface": "#161A23",
    "--servus-surface-raised": "#1C2230",
    "--servus-text": "#C5CFDC",
    "--servus-text-muted": "#8C97A9",
    "--servus-border": "#1A2942",
    "--servus-primary": "#F0D87A",
    "--servus-primary-hover": "#C9B452",
    "--servus-accent": "#F0D87A",
    "--servus-danger": "#B85050",
    "--servus-nav-bg": "#060C1A",
    "--servus-nav-active": "#F0D87A",
    "--servus-motif-stroke": "#2D5F8C",
    "--servus-horizon-fill": "#1A2942",
    "--servus-spark": "#D9772B",
  };
  for (const [name, hex] of Object.entries(expected)) {
    const re = new RegExp(`${name}:\\s*${hex}`, "i");
    assert(re.test(block), `theme-sternenhimmel ${name} must be ${hex}`);
  }
});

// Component CSS must not contain theme-name selectors — token references only.
Deno.test("component CSS does not contain theme-name selectors", () => {
  // Allowed: html.theme-raute / html.theme-sternenhimmel selectors that
  // ONLY appear as token declaration blocks. We forbid them anywhere else.
  const tokenBlockRe =
    /html\.theme-(raute|sternenhimmel)\s*\{[^}]*--servus-[^}]*\}/g;
  const remainder = CSS.replace(tokenBlockRe, "");

  assert(
    !/html\.theme-raute/i.test(remainder),
    "outside of token blocks, no rule may target html.theme-raute",
  );
  assert(
    !/html\.theme-sternenhimmel/i.test(remainder),
    "outside of token blocks, no rule may target html.theme-sternenhimmel",
  );
  // The legacy html.dark selector must be gone.
  assertEquals(
    /html\.dark\b/.test(CSS),
    false,
    "legacy html.dark must be removed",
  );
});
