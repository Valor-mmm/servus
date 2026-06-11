import { assertEquals } from "@std/assert";
import { createPinchHandler } from "@/lib/camera/controls.ts";

function makePointerEvent(
  pointerId: number,
  clientX: number,
  clientY: number,
): PointerEvent {
  return { pointerId, clientX, clientY } as unknown as PointerEvent;
}

Deno.test("createPinchHandler: single pointer does not trigger onZoom", () => {
  const calls: number[] = [];
  const handler = createPinchHandler({
    onZoom: (v) => calls.push(v),
    zoomCap: { min: 1, max: 5, step: 0.1 },
    getCurrentZoom: () => 1,
  });

  handler.onPointerDown(makePointerEvent(1, 100, 100));
  handler.onPointerMove(makePointerEvent(1, 150, 100));

  assertEquals(calls.length, 0);
});

Deno.test("createPinchHandler: two pointers moving apart calls onZoom with clamped value", () => {
  const calls: number[] = [];
  const handler = createPinchHandler({
    onZoom: (v) => calls.push(v),
    zoomCap: { min: 1, max: 5, step: 0.1 },
    getCurrentZoom: () => 1,
  });

  // Two fingers start 100px apart
  handler.onPointerDown(makePointerEvent(1, 0, 0));
  handler.onPointerDown(makePointerEvent(2, 100, 0));

  // Move finger 2 to 200px apart (2x distance) — should call onZoom with 2.0
  handler.onPointerMove(makePointerEvent(2, 200, 0));

  assertEquals(calls.length > 0, true);
  // Zoom should be ~2.0, clamped between 1 and 5
  const zoom = calls[calls.length - 1];
  assertEquals(zoom >= 1 && zoom <= 5, true);
  assertEquals(Math.abs(zoom - 2.0) < 0.05, true);
});

Deno.test("createPinchHandler: zoom is clamped to max", () => {
  const calls: number[] = [];
  const handler = createPinchHandler({
    onZoom: (v) => calls.push(v),
    zoomCap: { min: 1, max: 3, step: 0.1 },
    getCurrentZoom: () => 3,
  });

  handler.onPointerDown(makePointerEvent(1, 0, 0));
  handler.onPointerDown(makePointerEvent(2, 100, 0));
  handler.onPointerMove(makePointerEvent(2, 500, 0)); // very wide pinch

  const zoom = calls[calls.length - 1];
  assertEquals(zoom <= 3, true);
});

Deno.test("createPinchHandler: zoom is clamped to min", () => {
  const calls: number[] = [];
  const handler = createPinchHandler({
    onZoom: (v) => calls.push(v),
    zoomCap: { min: 1, max: 5, step: 0.1 },
    getCurrentZoom: () => 1,
  });

  handler.onPointerDown(makePointerEvent(1, 0, 0));
  handler.onPointerDown(makePointerEvent(2, 100, 0));
  handler.onPointerMove(makePointerEvent(2, 10, 0)); // pinching in past min

  const zoom = calls[calls.length - 1];
  assertEquals(zoom >= 1, true);
});

Deno.test("createPinchHandler: isPinching returns true with 2 pointers, false with 1", () => {
  const handler = createPinchHandler({
    onZoom: () => {},
    zoomCap: { min: 1, max: 5, step: 0.1 },
    getCurrentZoom: () => 1,
  });

  assertEquals(handler.isPinching(), false);
  handler.onPointerDown(makePointerEvent(1, 0, 0));
  assertEquals(handler.isPinching(), false);
  handler.onPointerDown(makePointerEvent(2, 100, 0));
  assertEquals(handler.isPinching(), true);
  handler.onPointerUp(makePointerEvent(2, 100, 0));
  assertEquals(handler.isPinching(), false);
});
