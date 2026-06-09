import { assert, assertEquals } from "@std/assert";
import {
  classNameFor,
  isThemeName,
  resolveInitialTheme,
  THEME_CLASS_PREFIX,
  THEME_COLOR,
  THEME_RAUTE,
  THEME_STERNENHIMMEL,
  THEME_STORAGE_KEY,
  THEMES,
} from "@/lib/styles/theme.ts";

Deno.test("THEMES exposes raute and sternenhimmel", () => {
  assertEquals([...THEMES], ["raute", "sternenhimmel"]);
});

Deno.test("isThemeName accepts only known themes", () => {
  assert(isThemeName(THEME_RAUTE));
  assert(isThemeName(THEME_STERNENHIMMEL));
  assert(!isThemeName("dark"));
  assert(!isThemeName("light"));
  assert(!isThemeName("laerchenholz"));
  assert(!isThemeName(undefined));
  assert(!isThemeName(null));
});

Deno.test("resolveInitialTheme prefers a valid stored value", () => {
  assertEquals(resolveInitialTheme(THEME_RAUTE, true), THEME_RAUTE);
  assertEquals(
    resolveInitialTheme(THEME_STERNENHIMMEL, false),
    THEME_STERNENHIMMEL,
  );
});

Deno.test("resolveInitialTheme falls through invalid stored values", () => {
  assertEquals(resolveInitialTheme("dark", true), THEME_STERNENHIMMEL);
  assertEquals(resolveInitialTheme("dark", false), THEME_RAUTE);
  assertEquals(resolveInitialTheme(undefined, true), THEME_STERNENHIMMEL);
  assertEquals(resolveInitialTheme(null, false), THEME_RAUTE);
  assertEquals(resolveInitialTheme(42, false), THEME_RAUTE);
});

Deno.test("resolveInitialTheme uses system pref when no stored value", () => {
  assertEquals(resolveInitialTheme(null, true), THEME_STERNENHIMMEL);
  assertEquals(resolveInitialTheme(null, false), THEME_RAUTE);
});

Deno.test("classNameFor prefixes with theme-", () => {
  assertEquals(classNameFor(THEME_RAUTE), "theme-raute");
  assertEquals(classNameFor(THEME_STERNENHIMMEL), "theme-sternenhimmel");
  assertEquals(THEME_CLASS_PREFIX, "theme-");
});

Deno.test("THEME_STORAGE_KEY is stable", () => {
  // Changing this key abandons every existing user preference; keep stable.
  assertEquals(THEME_STORAGE_KEY, "servus-theme");
});

Deno.test("THEME_COLOR matches design-system spec", () => {
  assertEquals(THEME_COLOR[THEME_RAUTE], "#0E4FA0");
  assertEquals(THEME_COLOR[THEME_STERNENHIMMEL], "#0E1830");
});

// Cross-file sync: the static init scripts duplicate these literals
// because they run before the bundle. If the constants ever change,
// these tests catch the drift.

Deno.test("theme-init.js stays in sync with theme.ts", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../static/theme-init.js", import.meta.url),
  );
  assert(
    src.includes(`"${THEME_STORAGE_KEY}"`),
    "theme-init.js must reference the same localStorage key",
  );
  assert(
    src.includes(`"theme-raute"`),
    "theme-init.js must apply theme-raute class",
  );
  assert(
    src.includes(`"theme-sternenhimmel"`),
    "theme-init.js must apply theme-sternenhimmel class",
  );
  assert(
    src.includes("prefers-color-scheme"),
    "theme-init.js must consult system preference",
  );
});

Deno.test("app-init.js stays in sync with theme.ts", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../static/app-init.js", import.meta.url),
  );
  assert(
    src.includes(`"${THEME_STORAGE_KEY}"`),
    "app-init.js must write the same localStorage key",
  );
  assert(
    src.includes(`"theme-raute"`),
    "app-init.js must toggle to theme-raute",
  );
  assert(
    src.includes(`"theme-sternenhimmel"`),
    "app-init.js must toggle to theme-sternenhimmel",
  );
  // Toggle must update the meta theme-color tag.
  assert(
    src.includes("theme-color"),
    "app-init.js must update the meta theme-color on toggle",
  );
});
