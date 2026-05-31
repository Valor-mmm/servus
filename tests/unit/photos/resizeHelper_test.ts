import { assertEquals } from "@std/assert";
import {
  calculateTargetDimensions,
  MAX_LONG_EDGE,
} from "@/lib/photos/resizeHelper.ts";

Deno.test("calculateTargetDimensions: 4000x3000 → long edge 1600", () => {
  const { width, height } = calculateTargetDimensions(4000, 3000);
  const longEdge = Math.max(width, height);
  assertEquals(longEdge, MAX_LONG_EDGE);
});

Deno.test("calculateTargetDimensions: 4000x3000 preserves aspect ratio", () => {
  const { width, height } = calculateTargetDimensions(4000, 3000);
  const ratio = width / height;
  const expected = 4000 / 3000;
  assertEquals(Math.abs(ratio - expected) < 0.01, true);
});

Deno.test("calculateTargetDimensions: portrait 3000x4000 → long edge 1600", () => {
  const { width, height } = calculateTargetDimensions(3000, 4000);
  const longEdge = Math.max(width, height);
  assertEquals(longEdge, MAX_LONG_EDGE);
});

Deno.test("calculateTargetDimensions: already within limit is returned unchanged", () => {
  const { width, height } = calculateTargetDimensions(800, 600);
  assertEquals(width, 800);
  assertEquals(height, 600);
});

Deno.test("calculateTargetDimensions: exactly max edge is returned unchanged", () => {
  const { width, height } = calculateTargetDimensions(1600, 1200);
  assertEquals(width, 1600);
  assertEquals(height, 1200);
});

Deno.test("calculateTargetDimensions: square image → both sides equal 1600", () => {
  const { width, height } = calculateTargetDimensions(4000, 4000);
  assertEquals(width, MAX_LONG_EDGE);
  assertEquals(height, MAX_LONG_EDGE);
});

Deno.test("calculateTargetDimensions: wide panoramic preserves aspect ratio", () => {
  const { width, height } = calculateTargetDimensions(6000, 1000);
  assertEquals(width, MAX_LONG_EDGE);
  const ratio = height / width;
  const expected = 1000 / 6000;
  assertEquals(Math.abs(ratio - expected) < 0.01, true);
});

// Note: EXIF GPS stripping is a property of the canvas re-encode step
// (the browser decodes EXIF-oriented images and the canvas output has no EXIF).
// This behaviour is verified in tests/e2e/photos/ Playwright scenarios.
