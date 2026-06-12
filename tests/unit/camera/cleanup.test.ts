import { assertEquals } from "@std/assert";
import { resetCameraControlSignals } from "@/lib/camera/controls.ts";

Deno.test("resetCameraControlSignals: resets all control state to initial values", () => {
  const state = {
    zoomCap: { min: 1, max: 5, step: 0.1 } as unknown,
    zoomLevel: 3,
    focusSupported: true,
    focusMode: "manual" as string,
    focusRing: { x: 100, y: 200 } as unknown,
  };

  resetCameraControlSignals(state);

  assertEquals(state.zoomCap, null);
  assertEquals(state.zoomLevel, 1);
  assertEquals(state.focusSupported, false);
  assertEquals(state.focusMode, "continuous");
  assertEquals(state.focusRing, null);
});
