// Source of truth for the design-system theme. The static
// theme-init.js and app-init.js scripts duplicate these constants by
// design (they run before the JS bundle and cannot import TS); a unit
// test asserts the duplicated literals stay in sync.

export const THEME_RAUTE = "raute" as const;
export const THEME_STERNENHIMMEL = "sternenhimmel" as const;

export const THEMES = [THEME_RAUTE, THEME_STERNENHIMMEL] as const;
export type ThemeName = typeof THEMES[number];

export const THEME_CLASS_PREFIX = "theme-";
export const THEME_STORAGE_KEY = "servus-theme";

// Browser <meta name="theme-color"> values per theme.
export const THEME_COLOR: Record<ThemeName, string> = {
  [THEME_RAUTE]: "#0E4FA0",
  [THEME_STERNENHIMMEL]: "#0E1830",
};

// True if the given string is one of the known theme names.
export function isThemeName(v: unknown): v is ThemeName {
  return typeof v === "string" &&
    (v === THEME_RAUTE || v === THEME_STERNENHIMMEL);
}

// Resolve which theme to apply at first paint.
//  - A valid stored value wins.
//  - Otherwise the OS preference (dark → Sternenhimmel) is used live; the
//    default is intentionally NOT written to storage so a later OS change
//    still flips the theme.
//  - If everything is missing or invalid, default to Raute.
export function resolveInitialTheme(
  storedValue: unknown,
  systemPrefersDark: boolean,
): ThemeName {
  if (isThemeName(storedValue)) return storedValue;
  return systemPrefersDark ? THEME_STERNENHIMMEL : THEME_RAUTE;
}

export function classNameFor(theme: ThemeName): string {
  return `${THEME_CLASS_PREFIX}${theme}`;
}
