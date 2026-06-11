import { assertEquals } from "@std/assert";
import { initCameraControls } from "@/lib/camera/controls.ts";

interface TrackSpy {
  lastConstraints: unknown;
  constraintCallCount: number;
  getCapabilities(): Record<string, unknown>;
  applyConstraints(c: unknown): Promise<void>;
}

function makeFullCapTrack(): TrackSpy & MediaStreamTrack {
  const t: TrackSpy = {
    lastConstraints: null,
    constraintCallCount: 0,
    getCapabilities() {
      return {
        zoom: { min: 1, max: 5, step: 0.5 },
        focusMode: ["continuous", "manual"],
      };
    },
    applyConstraints(c: unknown) {
      t.lastConstraints = c;
      t.constraintCallCount++;
      return Promise.resolve();
    },
  };
  return t as unknown as TrackSpy & MediaStreamTrack;
}

function makeStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getVideoTracks: () => tracks,
  } as unknown as MediaStream;
}

Deno.test("initCameraControls integration: zoomCap reflects capability range", async () => {
  const track = makeFullCapTrack();
  const state = await initCameraControls(makeStream([track]));
  assertEquals(state.zoomCap, { min: 1, max: 5, step: 0.5 });
});

Deno.test("initCameraControls integration: focusSupported is true when manual available", async () => {
  const track = makeFullCapTrack();
  const state = await initCameraControls(makeStream([track]));
  assertEquals(state.focusSupported, true);
});

Deno.test("initCameraControls integration: applyContinuousFocus called once on init", async () => {
  const track = makeFullCapTrack();
  await initCameraControls(makeStream([track]));
  assertEquals(track.constraintCallCount, 1);
  assertEquals(track.lastConstraints, {
    advanced: [{ focusMode: "continuous" }],
  });
});
