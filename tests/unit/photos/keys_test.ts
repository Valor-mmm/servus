import { assertEquals, assertNotEquals } from "@std/assert";
import { generatePhotoKey } from "@/lib/photos/keys.ts";

Deno.test("generatePhotoKey produces 1000 distinct keys", () => {
  const keys = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    keys.add(generatePhotoKey());
  }
  assertEquals(keys.size, 1000);
});

Deno.test("generatePhotoKey produces key with ≥32 hex chars (≥128 bits)", () => {
  const key = generatePhotoKey();
  // 32 hex chars = 128 bits
  assertEquals(key.length >= 32, true);
});

Deno.test("generatePhotoKey produces keys that look like hex strings", () => {
  for (let i = 0; i < 20; i++) {
    const key = generatePhotoKey();
    assertEquals(/^[0-9a-f]+$/.test(key), true);
  }
});

Deno.test("generatePhotoKey does not embed any given item or user id", () => {
  const itemId = "item-abc123";
  const userId = "user-xyz789";
  for (let i = 0; i < 50; i++) {
    const key = generatePhotoKey();
    assertEquals(key.includes("abc123"), false);
    assertEquals(key.includes("xyz789"), false);
    assertNotEquals(key, itemId);
    assertNotEquals(key, userId);
  }
});
