(function () {
  const s = localStorage.getItem("servus-theme");
  if (
    s === "dark" ||
    (s === null && matchMedia("(prefers-color-scheme:dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  }
})();
