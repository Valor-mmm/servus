// Pre-paint theme application. Runs synchronously in <head> before the
// stylesheet link so users never see the wrong theme flash. Keep in sync
// with lib/styles/theme.ts; a unit test enforces the cross-file invariants.
(function () {
  const KEY = "servus-theme";
  const RAUTE = "theme-raute";
  const STERN = "theme-sternenhimmel";
  const META_COLOR = {
    "theme-raute": "#0E4FA0",
    "theme-sternenhimmel": "#0E1830",
  };

  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (_e) { /* private mode */ }

  let cls = RAUTE;
  if (stored === "raute") cls = RAUTE;
  else if (stored === "sternenhimmel") cls = STERN;
  else if (matchMedia("(prefers-color-scheme: dark)").matches) cls = STERN;

  const html = document.documentElement;
  html.classList.remove(RAUTE, STERN, "dark");
  html.classList.add(cls);

  // Sync <meta name="theme-color"> so the browser chrome blends.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", META_COLOR[cls]);

  // Sternenhimmel display type uses Roboto Condensed — load it conditionally
  // so light-theme-only sessions don't pay the font cost.
  if (
    cls === STERN && !document.getElementById("servus-font-roboto-condensed")
  ) {
    const link = document.createElement("link");
    link.id = "servus-font-roboto-condensed";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@500;700;900&display=swap";
    document.head.appendChild(link);
  }
})();
