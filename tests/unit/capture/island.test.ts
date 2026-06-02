import { assertEquals } from "@std/assert";
// @ts-ignore - dynamic import to check module shape without running browser code
const mod = await import("@/islands/ContinuousCapture.tsx");

Deno.test("ContinuousCapture: default export is a function component", () => {
  assertEquals(typeof mod.default, "function");
});
