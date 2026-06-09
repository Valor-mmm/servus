import { assert } from "@std/assert";

const CSS = await Deno.readTextFile(
  new URL("../../../static/styles.css", import.meta.url),
);

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

// ── Group 9: Raute lozenge motif ───────────────────────────────────────────────

Deno.test(".section-break is defined and uses motif tokens", () => {
  // The reusable section-break carries the lozenge under Raute and the peak
  // silhouette under Sternenhimmel. Both versions live in a single rule
  // whose visual treatment is driven by --servus-motif-bg.
  assert(CSS.includes(".section-break"), ".section-break must be defined");
  const block = extractBlock(CSS, ".section-break");
  assert(block.length > 0, ".section-break block must exist");
  // The shared rule pulls its visible pattern from a token.
  assert(
    block.includes("var(--servus-motif-bg)") ||
      block.includes("var(--servus-active-bg)"),
    ".section-break must source its background from a theme token",
  );
});

Deno.test("Raute lozenge motif is defined via theme tokens", () => {
  const raute = extractBlock(CSS, "html.theme-raute");
  // Raute provides the gold lozenge pattern as a token value.
  assert(
    raute.includes("--servus-motif-bg") || raute.includes("--servus-active-bg"),
    "theme-raute must declare a motif background token",
  );
});

// ── Group 10: Sternenhimmel night-sky motif ────────────────────────────────────

Deno.test("body star scatter is token-driven, scoped to Sternenhimmel", () => {
  // Per design D7 the body background is a theme-distinct compositional
  // surface, but it's still expressed through a token so component CSS
  // doesn't enumerate theme names. Sternenhimmel sets the token to a
  // radial-gradient stack; Raute resolves it to `none`.
  const stern = extractBlock(CSS, "html.theme-sternenhimmel");
  const starRule = /--servus-body-bg-image:[\s\S]*?radial-gradient/i;
  assert(
    starRule.test(stern),
    "theme-sternenhimmel must set --servus-body-bg-image to a radial-gradient stack",
  );

  const raute = extractBlock(CSS, "html.theme-raute");
  assert(
    /--servus-body-bg-image:\s*none/.test(raute),
    "theme-raute must set --servus-body-bg-image to none",
  );

  // The body rule consumes the token (so adding a third theme is purely
  // additive).
  const body = extractBlock(CSS, "\nbody ");
  assert(
    body.includes("var(--servus-body-bg-image)"),
    "body must consume var(--servus-body-bg-image)",
  );
});

Deno.test("peak silhouette uses --servus-horizon-fill", () => {
  // The .peak-silhouette helper paints the horizon band at the bottom of
  // hero surfaces. It fills with the theme horizon-fill token.
  const block = extractBlock(CSS, ".peak-silhouette");
  assert(block.length > 0, ".peak-silhouette must be defined");
  assert(
    block.includes("var(--servus-horizon-fill)") ||
      block.includes("--servus-horizon-fill"),
    ".peak-silhouette must use --servus-horizon-fill",
  );
});

Deno.test("Fensterlicht spark element uses --servus-spark", () => {
  // The single warm-orange "lit window" point. One element per surface,
  // colour pulled from the spark token.
  const block = extractBlock(CSS, ".horizon-spark");
  assert(block.length > 0, ".horizon-spark must be defined");
  assert(
    block.includes("var(--servus-spark)"),
    ".horizon-spark must use --servus-spark",
  );
});

// ── Group 11: Display typography per theme ─────────────────────────────────────

Deno.test("h1/h2/h3 use --servus-type-display-family", () => {
  // Headings switch font family per theme via the shared token.
  const h1 = extractBlock(CSS, "\nh1 ");
  const h2 = extractBlock(CSS, "\nh2 ");
  const h3 = extractBlock(CSS, "\nh3 ");
  for (const [name, block] of [["h1", h1], ["h2", h2], ["h3", h3]] as const) {
    assert(
      block.includes("var(--servus-type-display-family)"),
      `${name} must use var(--servus-type-display-family)`,
    );
  }
});

Deno.test("Raute display family is the DIN system stack", () => {
  // Token defined on :root with the DIN-family fallback chain.
  const root = extractBlock(CSS, ":root");
  assert(
    /--servus-type-display-family:[\s\S]*?DIN Alternate[\s\S]*?DIN Pro[\s\S]*?Roboto Condensed/i
      .test(root),
    ":root must set --servus-type-display-family to the DIN stack",
  );
});

Deno.test("Sternenhimmel display family switches to Roboto Condensed", () => {
  const stern = extractBlock(CSS, "html.theme-sternenhimmel");
  assert(
    /--servus-type-display-family:[\s\S]*?Roboto Condensed/i.test(stern),
    "theme-sternenhimmel must override --servus-type-display-family to Roboto Condensed",
  );
});

Deno.test("body uses --servus-type-body-family", () => {
  const root = extractBlock(CSS, ":root");
  assert(
    root.includes("--servus-type-body-family"),
    ":root must declare --servus-type-body-family",
  );
  // html element should consume the body family token.
  const htmlBlock = extractBlock(CSS, "\nhtml ");
  assert(
    htmlBlock.includes("var(--servus-type-body-family)"),
    "html must consume var(--servus-type-body-family) as its font-family",
  );
});
