import { assertEquals, assertExists } from "@std/assert";

const manifest = JSON.parse(
  await Deno.readTextFile(
    new URL("../../../static/manifest.json", import.meta.url),
  ),
);

Deno.test("manifest icons has exactly two entries", () => {
  assertEquals(manifest.icons.length, 2);
});

Deno.test("manifest icons all use image/svg+xml type", () => {
  for (const icon of manifest.icons) {
    assertEquals(icon.type, "image/svg+xml");
  }
});

Deno.test("manifest has an icon with purpose 'any' pointing to /lion.svg", () => {
  const icon = manifest.icons.find((i: { purpose: string }) =>
    i.purpose === "any"
  );
  assertExists(icon);
  assertEquals(icon.src, "/lion.svg");
});

Deno.test(
  "manifest has an icon with purpose 'maskable' pointing to /lion-maskable.svg",
  () => {
    const icon = manifest.icons.find((i: { purpose: string }) =>
      i.purpose === "maskable"
    );
    assertExists(icon);
    assertEquals(icon.src, "/lion-maskable.svg");
  },
);

Deno.test("manifest icons do not reference favicon.ico", () => {
  for (const icon of manifest.icons) {
    assertEquals(icon.src.includes("favicon"), false);
  }
});
