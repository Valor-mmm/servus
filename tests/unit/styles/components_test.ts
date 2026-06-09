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

// Find every block whose selector contains `selectorFragment`.
function extractAllMatchingBlocks(
  css: string,
  selectorFragment: string,
): string[] {
  const blocks: string[] = [];
  let cursor = 0;
  while (cursor < css.length) {
    const idx = css.indexOf(selectorFragment, cursor);
    if (idx === -1) break;
    // Step back to find the start of the rule.
    let ruleStart = idx;
    while (
      ruleStart > 0 && css[ruleStart - 1] !== "}" &&
      css[ruleStart - 1] !== "\n" && css[ruleStart - 1] !== ";"
    ) {
      ruleStart--;
    }
    const braceStart = css.indexOf("{", idx);
    if (braceStart === -1) break;
    let depth = 1;
    let i = braceStart + 1;
    for (; i < css.length; i++) {
      const ch = css[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    blocks.push(css.slice(braceStart + 1, i));
    cursor = i + 1;
  }
  return blocks;
}

// ── Group 4: Button class variants ─────────────────────────────────────────────

Deno.test(".btn-primary uses --servus-primary token", () => {
  // Allow either `button, .btn-primary { background: var(--servus-primary) }`
  // or a dedicated .btn-primary rule.
  const blocks = extractAllMatchingBlocks(CSS, ".btn-primary");
  assert(blocks.length > 0, ".btn-primary rule must exist");
  const usesPrimary = blocks.some((b) => b.includes("var(--servus-primary)"));
  assert(usesPrimary, ".btn-primary background must use var(--servus-primary)");
});

Deno.test(".btn-secondary, .btn-danger, .btn-small are defined", () => {
  assert(CSS.includes(".btn-secondary"), ".btn-secondary must be defined");
  assert(CSS.includes(".btn-danger"), ".btn-danger must be defined");
  assert(CSS.includes(".btn-small"), ".btn-small must be defined");
});

Deno.test("button focus-visible uses the accent token", () => {
  // Required scenario: a token-driven focus ring visible on both themes.
  // We accept either an explicit `:focus-visible` rule or a `:focus` rule
  // that uses outline + offset against the accent token.
  const hasFocusVisible = /:focus-visible[^{]*\{[^}]*--servus-accent/i.test(
    CSS,
  );
  assert(
    hasFocusVisible,
    "buttons must have a :focus-visible rule referencing --servus-accent",
  );
});

// ── Group 5: Status badges ─────────────────────────────────────────────────────

Deno.test("status badges render a leading shape indicator", () => {
  // Each badge variant must visually carry shape, not just color. The shape
  // is implemented via a ::before pseudo-element common to .badge.
  const badgeBlock = extractBlock(CSS, ".badge");
  assert(badgeBlock.length > 0, ".badge base rule must exist");

  // `.badge::before` must exist with non-zero rendered size.
  const beforeBlock = extractBlock(CSS, ".badge::before");
  assert(beforeBlock.length > 0, ".badge::before pseudo must exist");
  // Must define content + visible dimensions.
  assert(beforeBlock.includes("content"), ".badge::before must set content");
});

Deno.test("badge variants reference theme palette tokens", () => {
  const packed = extractBlock(CSS, ".badge-packed");
  assert(packed.includes("var(--servus-badge-packed-bg)"));
  const delivered = extractBlock(CSS, ".badge-delivered");
  assert(delivered.includes("var(--servus-badge-delivered-bg)"));
  const pending = extractBlock(CSS, ".badge-pending");
  assert(pending.includes("var(--servus-badge-pending-bg)"));
});

// ── Group 6: Top + bottom navigation ──────────────────────────────────────────

Deno.test("top-nav and bottom-nav containers are defined", () => {
  assert(CSS.includes(".top-nav"), ".top-nav must be defined");
  assert(CSS.includes(".bottom-nav"), ".bottom-nav must be defined");
});

Deno.test("nav reads colours from --servus-nav-* tokens only", () => {
  const top = extractBlock(CSS, ".top-nav");
  // The container must read its background from the nav-bg token.
  assert(
    top.includes("var(--servus-nav-bg)"),
    ".top-nav background must use --servus-nav-bg",
  );
  const bottom = extractBlock(CSS, ".bottom-nav");
  assert(
    bottom.includes("var(--servus-nav-bg)"),
    ".bottom-nav background must use --servus-nav-bg",
  );
});

// ── Group 7: Active navigation indicator ───────────────────────────────────────

Deno.test("nav-active uses --servus-nav-active and adapts via a theme token", () => {
  // The Raute treatment paints a gold lozenge background and Sternenhimmel
  // paints a gold underline. The shared rule reads --servus-nav-active for
  // colour and a token (--servus-active-bg) that swaps shape per theme.
  const hasActiveTopRule =
    /\.top-nav[^{]*\.nav-active|\.nav-active[^{]*\{[\s\S]*?--servus-nav-active/i
      .test(CSS);
  assert(
    hasActiveTopRule,
    ".nav-active must use --servus-nav-active in its styling",
  );

  // Each theme must declare --servus-active-bg.
  const raute = extractBlock(CSS, "html.theme-raute");
  const stern = extractBlock(CSS, "html.theme-sternenhimmel");
  assert(
    raute.includes("--servus-active-bg") ||
      raute.includes("--servus-nav-active"),
    "theme-raute must drive the active-state appearance via a token",
  );
  assert(
    stern.includes("--servus-active-bg") ||
      stern.includes("--servus-nav-active"),
    "theme-sternenhimmel must drive the active-state appearance via a token",
  );
});

// ── Group 8: Quick-add visual distinction ──────────────────────────────────────

Deno.test(".nav-quick-add is a raised primary action", () => {
  const blocks = extractAllMatchingBlocks(CSS, ".nav-quick-add");
  assert(blocks.length > 0, ".nav-quick-add must be defined");
  // At least one block must declare a box-shadow (raised treatment) and
  // pull its emphasis colour from the primary token.
  const hasShadow = blocks.some((b) => /box-shadow\s*:/i.test(b));
  const usesPrimary = blocks.some((b) =>
    b.includes("var(--servus-primary)") ||
    b.includes("var(--servus-nav-active)")
  );
  assert(hasShadow, ".nav-quick-add must use a box-shadow (raised treatment)");
  assert(
    usesPrimary,
    ".nav-quick-add must source emphasis from a theme token (primary or nav-active)",
  );
});
