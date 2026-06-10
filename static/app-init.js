(function () {
  /* ── Theme toggle (Raute light ↔ Sternenhimmel dark) ── */
  const KEY = "servus-theme";
  const RAUTE_CLS = "theme-raute";
  const STERN_CLS = "theme-sternenhimmel";
  const META_COLOR = {
    "theme-raute": "#0E4FA0",
    "theme-sternenhimmel": "#0E1830",
  };
  const html = document.documentElement;

  function currentTheme() {
    return html.classList.contains(STERN_CLS) ? "sternenhimmel" : "raute";
  }
  function icon(theme) {
    return theme === "sternenhimmel" ? "☀️" : "🌙";
  }
  function syncIcons() {
    const t = currentTheme();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.textContent = icon(t);
    });
  }
  function ensureStarFont() {
    if (document.getElementById("servus-font-roboto-condensed")) return;
    const link = document.createElement("link");
    link.id = "servus-font-roboto-condensed";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@500;700;900&display=swap";
    document.head.appendChild(link);
  }
  function applyTheme(name) {
    const cls = name === "sternenhimmel" ? STERN_CLS : RAUTE_CLS;
    html.classList.remove(RAUTE_CLS, STERN_CLS, "dark");
    html.classList.add(cls);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", META_COLOR[cls]);
    if (name === "sternenhimmel") ensureStarFont();
    try {
      localStorage.setItem(KEY, name);
    } catch (_e) { /* private mode */ }
    syncIcons();
  }

  syncIcons();
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const next = currentTheme() === "sternenhimmel"
        ? "raute"
        : "sternenhimmel";
      applyTheme(next);
    });
  });

  /* ── Lazy thumbnails ── */
  let bannerShown = false;
  function showErrorBanner() {
    if (bannerShown) return;
    bannerShown = true;
    const page = document.querySelector(".page");
    if (!page) return;
    const b = document.createElement("div");
    b.className = "photo-error-banner";
    b.innerHTML = "Einige Bilder konnten nicht geladen werden. " +
      '<a href="" onclick="location.reload();return false;">Seite neu laden →</a>' +
      '<button class="photo-error-banner-dismiss" aria-label="Schlie\xdfen" ' +
      'onclick="this.parentElement.remove()">✕</button>';
    page.insertBefore(b, page.firstChild);
  }
  function loadImg(img) {
    const src = img.dataset.src;
    if (!src) return;
    img.src = src;
    img.addEventListener(
      "error",
      function () {
        img.removeAttribute("src");
        img.alt = "🖼️";
        showErrorBanner();
      },
      { once: true },
    );
  }
  let obs;
  if ("IntersectionObserver" in window) {
    obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            loadImg(e.target);
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: "200px" },
    );
    document.querySelectorAll("img[data-src]").forEach(function (img) {
      obs.observe(img);
    });
  } else {
    document.querySelectorAll("img[data-src]").forEach(loadImg);
  }

  /* ── Auto-submit filter dropdowns ── */
  document.querySelectorAll("select[data-autosubmit]").forEach(function (sel) {
    sel.addEventListener("change", function () {
      const form = sel.closest("form");
      if (form) form.requestSubmit();
    });
  });
})();

if ("serviceWorker" in navigator) {
  globalThis.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js");
  });
}
