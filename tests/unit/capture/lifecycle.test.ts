/**
 * Tests for stream lifecycle: every exit path must call stopStream.
 * Verifies the extracted cleanup logic, not the full Preact component.
 */
import { assertEquals } from "@std/assert";
import { createCleanup } from "@/lib/capture/lifecycleLogic.ts";

interface FakeTrack {
  stopped: boolean;
  stop(): void;
}

function makeTrack(): FakeTrack {
  const t: FakeTrack = {
    stopped: false,
    stop() {
      t.stopped = true;
    },
  };
  return t;
}

function makeStream(trackCount = 2): {
  stream: MediaStream;
  tracks: FakeTrack[];
} {
  const tracks = Array.from({ length: trackCount }, makeTrack);
  const stream = {
    getTracks: () => tracks,
  } as unknown as MediaStream;
  return { stream, tracks };
}

Deno.test("cleanup: stops all tracks", () => {
  const { stream, tracks } = makeStream(2);
  const videoEl = { srcObject: stream as MediaStream | null };
  const cleanup = createCleanup(
    { current: stream },
    { current: videoEl as unknown as HTMLVideoElement },
  );
  cleanup();
  for (const t of tracks) {
    assertEquals(t.stopped, true);
  }
});

Deno.test("cleanup: clears video srcObject", () => {
  const { stream } = makeStream(1);
  const videoEl = { srcObject: stream as MediaStream | null };
  const cleanup = createCleanup(
    { current: stream },
    { current: videoEl as unknown as HTMLVideoElement },
  );
  cleanup();
  assertEquals(videoEl.srcObject, null);
});

Deno.test("cleanup: idempotent — second call does not double-stop tracks", () => {
  const { stream, tracks } = makeStream(2);
  let stopCallCount = 0;
  for (const t of tracks) {
    const orig = t.stop.bind(t);
    t.stop = () => {
      stopCallCount++;
      orig();
    };
  }
  const videoEl = { srcObject: stream as MediaStream | null };
  const cleanup = createCleanup(
    { current: stream },
    { current: videoEl as unknown as HTMLVideoElement },
  );
  cleanup();
  cleanup();
  assertEquals(stopCallCount, 2); // 2 tracks, each stopped once
});

Deno.test("cleanup: handles null stream", () => {
  const videoEl = { srcObject: null as MediaStream | null };
  const cleanup = createCleanup(
    { current: null },
    { current: videoEl as unknown as HTMLVideoElement },
  );
  cleanup(); // must not throw
  assertEquals(videoEl.srcObject, null);
});
