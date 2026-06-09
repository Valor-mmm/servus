import { assert } from "@std/assert";

const sw = await Deno.readTextFile(
  new URL("../../../static/sw.js", import.meta.url),
);

Deno.test("sw.js defines CACHE_VERSION", () => {
  assert(sw.includes("CACHE_VERSION"), "CACHE_VERSION constant not found");
});

Deno.test("sw.js pre-caches all required app-shell paths", () => {
  const paths = [
    "/styles.css",
    "/lion.svg",
    "/lion-maskable.svg",
    "/app-init.js",
    "/theme-init.js",
    "/offline.html",
  ];
  for (const path of paths) {
    assert(sw.includes(path), `App shell path missing: ${path}`);
  }
});

Deno.test("sw.js references offline.html as the offline fallback", () => {
  assert(sw.includes("offline.html"), "offline.html fallback not found");
});

Deno.test("sw.js detects navigation requests via request.mode", () => {
  assert(sw.includes("request.mode"), "request.mode check not found");
  assert(sw.includes('"navigate"'), "navigate string not found");
});
