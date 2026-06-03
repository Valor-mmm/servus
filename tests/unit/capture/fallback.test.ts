/**
 * Tests for the fallback path logic:
 * - Feature-detect: unsupported browser → PhotoCapture
 * - NotAllowedError → inline fallback with hint
 * - NotFoundError → inline fallback with hint
 */
import { assertEquals } from "@std/assert";
import {
  classifyGetUserMediaError,
  selectCaptureSurface,
} from "@/lib/capture/fallbackLogic.ts";

// ── Feature detection ─────────────────────────────────────────────────────

Deno.test("selectCaptureSurface: supported=false → file-input", () => {
  assertEquals(selectCaptureSurface(false), "file-input");
});

Deno.test("selectCaptureSurface: supported=true → continuous", () => {
  assertEquals(selectCaptureSurface(true), "continuous");
});

// ── Error classification ──────────────────────────────────────────────────

Deno.test("classifyGetUserMediaError: NotAllowedError → not-allowed", () => {
  const err = Object.assign(new DOMException("denied", "NotAllowedError"), {});
  assertEquals(classifyGetUserMediaError(err), "not-allowed");
});

Deno.test("classifyGetUserMediaError: NotFoundError → not-found", () => {
  const err = Object.assign(new DOMException("no camera", "NotFoundError"), {});
  assertEquals(classifyGetUserMediaError(err), "not-found");
});

Deno.test("classifyGetUserMediaError: other error → other", () => {
  assertEquals(classifyGetUserMediaError(new Error("network")), "other");
});

Deno.test("classifyGetUserMediaError: non-error value → other", () => {
  assertEquals(classifyGetUserMediaError("string error"), "other");
});
