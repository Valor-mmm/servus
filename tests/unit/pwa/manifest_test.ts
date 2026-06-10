import { assertEquals, assertExists } from "@std/assert";

const manifest = JSON.parse(
  await Deno.readTextFile(
    new URL("../../../static/manifest.json", import.meta.url),
  ),
);

Deno.test("manifest icons has exactly four entries", () => {
  assertEquals(manifest.icons.length, 4);
});

Deno.test("manifest has a 192x192 PNG icon with purpose 'any'", () => {
  const icon = manifest.icons.find(
    (i: { src: string; type: string; sizes: string }) =>
      i.type === "image/png" && i.sizes === "192x192",
  );
  assertExists(icon);
  assertEquals(icon.src, "/icon-192.png");
  assertEquals(icon.purpose, "any");
});

Deno.test("manifest has a 512x512 PNG icon covering maskable purpose", () => {
  const icon = manifest.icons.find(
    (i: { src: string; type: string; sizes: string }) =>
      i.type === "image/png" && i.sizes === "512x512",
  );
  assertExists(icon);
  assertEquals(icon.src, "/icon-512.png");
  assertEquals(icon.purpose.includes("maskable"), true);
});

Deno.test(
  "manifest has an SVG icon with purpose 'any' pointing to /lion.svg",
  () => {
    const icon = manifest.icons.find(
      (i: { src: string; type: string }) =>
        i.type === "image/svg+xml" && i.src === "/lion.svg",
    );
    assertExists(icon);
  },
);

Deno.test(
  "manifest has an SVG icon with purpose 'maskable' pointing to /lion-maskable.svg",
  () => {
    const icon = manifest.icons.find((i: { src: string }) =>
      i.src === "/lion-maskable.svg"
    );
    assertExists(icon);
    assertEquals(icon.purpose, "maskable");
  },
);

Deno.test("manifest icons do not reference favicon.ico", () => {
  for (const icon of manifest.icons) {
    assertEquals(icon.src.includes("favicon"), false);
  }
});
