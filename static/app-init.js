(function () {
  /* ── Theme toggle ── */
  const isDark = document.documentElement.classList.contains("dark");
  function syncIcons(d) {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.textContent = d ? "☀️" : "🌙";
    });
  }
  syncIcons(isDark);
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const d = document.documentElement.classList.toggle("dark");
      localStorage.setItem("servus-theme", d ? "dark" : "light");
      syncIcons(d);
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
})();
