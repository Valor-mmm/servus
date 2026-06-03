import { assertEquals } from "@std/assert";
import {
  captureReducer,
  initialCaptureState,
} from "@/lib/capture/stateMachine.ts";
import type {
  CaptureAction,
  CaptureState,
} from "@/lib/capture/stateMachine.ts";

// Helper to apply one action
function apply(state: CaptureState, action: CaptureAction): CaptureState {
  return captureReducer(state, action);
}

// ── Initial state ─────────────────────────────────────────────────────────

Deno.test("initial state: phase is idle", () => {
  assertEquals(initialCaptureState.phase, "idle");
});

// ── idle → starting ───────────────────────────────────────────────────────

Deno.test("idle + CAMERA_READY → starting", () => {
  const s = apply(initialCaptureState, { type: "CAMERA_READY" });
  assertEquals(s.phase, "starting");
});

// ── starting → in-progress ────────────────────────────────────────────────

Deno.test("starting + ITEM_CREATED → in-progress with itemId and thumbnail", () => {
  const starting: CaptureState = { phase: "starting" };
  const s = apply(starting, {
    type: "ITEM_CREATED",
    itemId: "item-abc",
    thumbnailUrl: "blob:thumb1",
  });
  assertEquals(s.phase, "in-progress");
  if (s.phase === "in-progress") {
    assertEquals(s.itemId, "item-abc");
    assertEquals(s.thumbnails, ["blob:thumb1"]);
  }
});

// ── in-progress + PHOTO_ADDED ─────────────────────────────────────────────

Deno.test("in-progress + PHOTO_ADDED → stays in-progress, appends thumbnail", () => {
  const inProgress: CaptureState = {
    phase: "in-progress",
    itemId: "item-abc",
    thumbnails: ["blob:thumb1"],
  };
  const s = apply(inProgress, {
    type: "PHOTO_ADDED",
    thumbnailUrl: "blob:thumb2",
  });
  assertEquals(s.phase, "in-progress");
  if (s.phase === "in-progress") {
    assertEquals(s.itemId, "item-abc");
    assertEquals(s.thumbnails, ["blob:thumb1", "blob:thumb2"]);
  }
});

// ── CONFIRM ───────────────────────────────────────────────────────────────

Deno.test("in-progress + CONFIRM → starting, clears itemId and thumbnails", () => {
  const inProgress: CaptureState = {
    phase: "in-progress",
    itemId: "item-abc",
    thumbnails: ["blob:thumb1", "blob:thumb2"],
  };
  const s = apply(inProgress, { type: "CONFIRM" });
  assertEquals(s.phase, "starting");
});

// ── CLOSE ─────────────────────────────────────────────────────────────────

Deno.test("starting + CLOSE → closed", () => {
  const starting: CaptureState = { phase: "starting" };
  assertEquals(apply(starting, { type: "CLOSE" }).phase, "closed");
});

Deno.test("in-progress + CLOSE → closed", () => {
  const inProgress: CaptureState = {
    phase: "in-progress",
    itemId: "item-abc",
    thumbnails: [],
  };
  assertEquals(apply(inProgress, { type: "CLOSE" }).phase, "closed");
});

Deno.test("idle + CLOSE → closed", () => {
  assertEquals(apply(initialCaptureState, { type: "CLOSE" }).phase, "closed");
});
