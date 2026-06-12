import { assertEquals } from "@std/assert";
import { initCameraControls } from "@/lib/camera/controls.ts";

interface TrackSpy {
  lastConstraints: unknown;
  getCapabilities(): Record<string, unknown>;
  applyConstraints(c: unknown): Promise<void>;
}

function makeTrackWithZoomAndFocus(): TrackSpy & MediaStreamTrack {
  const t: TrackSpy = {
    lastConstraints: null,
    getCapabilities() {
      return {
        zoom: { min: 1, max: 5, step: 0.5 },
        focusMode: ["continuous", "manual"],
      };
    },
    applyConstraints(c: unknown) {
      t.lastConstraints = c;
      return Promise.resolve();
    },
  };
  return t as unknown as TrackSpy & MediaStreamTrack;
}

function makeTrackNoControls() {
  return {
    getCapabilities() {
      return {};
    },
    async applyConstraints() {},
  } as unknown as MediaStreamTrack;
}

function makeStream(
  tracks: MediaStreamTrack[],
): MediaStream {
  return {
    getVideoTracks: () => tracks,
  } as unknown as MediaStream;
}

Deno.test("initCameraControls: returns correct zoomCap and focusSupported", async () => {
  const track = makeTrackWithZoomAndFocus();
  const stream = makeStream([track]);
  const state = await initCameraControls(stream);
  assertEquals(state.zoomCap, { min: 1, max: 5, step: 0.5 });
  assertEquals(state.focusSupported, true);
});

Deno.test("initCameraControls: calls applyContinuousFocus on init when focus supported", async () => {
  const track = makeTrackWithZoomAndFocus();
  const stream = makeStream([track]);
  await initCameraControls(stream);
  assertEquals(track.lastConstraints, {
    advanced: [{ focusMode: "continuous" }],
  });
});

Deno.test("initCameraControls: returns nulls when no controls supported", async () => {
  const track = makeTrackNoControls();
  const stream = makeStream([track]);
  const state = await initCameraControls(stream);
  assertEquals(state.zoomCap, null);
  assertEquals(state.focusSupported, false);
});

Deno.test("initCameraControls: returns nulls when stream has no video tracks", async () => {
  const stream = makeStream([]);
  const state = await initCameraControls(stream);
  assertEquals(state.zoomCap, null);
  assertEquals(state.focusSupported, false);
});
