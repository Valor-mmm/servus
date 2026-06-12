import { assertEquals } from "@std/assert";
import { handleTapToFocus } from "@/lib/camera/controls.ts";

interface TrackSpy {
  lastConstraints: unknown;
  applyConstraints(c: unknown): Promise<void>;
}

function makeTrackSpy(): TrackSpy & MediaStreamTrack {
  const t: TrackSpy = {
    lastConstraints: null,
    applyConstraints(c: unknown) {
      t.lastConstraints = c;
      return Promise.resolve();
    },
  };
  return t as unknown as TrackSpy & MediaStreamTrack;
}

Deno.test("handleTapToFocus: continuous→manual calls applyFocus and returns manual", async () => {
  const track = makeTrackSpy();
  const newMode = await handleTapToFocus(track, "continuous", 0.3, 0.7);
  assertEquals(newMode, "manual");
  assertEquals(track.lastConstraints, {
    advanced: [{ focusMode: "manual", pointOfInterest: { x: 0.3, y: 0.7 } }],
  });
});

Deno.test("handleTapToFocus: manual→continuous calls applyContinuousFocus and returns continuous", async () => {
  const track = makeTrackSpy();
  const newMode = await handleTapToFocus(track, "manual", 0.5, 0.5);
  assertEquals(newMode, "continuous");
  assertEquals(track.lastConstraints, {
    advanced: [{ focusMode: "continuous" }],
  });
});
