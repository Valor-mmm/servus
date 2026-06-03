import { assertEquals } from "@std/assert";
import { stopStream } from "@/lib/camera/stream.ts";

interface FakeTrack extends MediaStreamTrack {
  stopCount: number;
}

function makeFakeTrack(): FakeTrack {
  const t: FakeTrack = {
    stopCount: 0,
    stop() {
      t.stopCount++;
    },
  } as unknown as FakeTrack;
  return t;
}

function makeFakeStream(trackCount: number) {
  const tracks = Array.from({ length: trackCount }, makeFakeTrack);
  const stream = {
    getTracks: () => tracks,
  } as unknown as MediaStream;
  return { stream, tracks };
}

Deno.test("stopStream: calls stop() on every track exactly once", () => {
  const { stream, tracks } = makeFakeStream(3);
  const videoEl = { srcObject: stream as MediaStream | null };
  stopStream(stream, videoEl as unknown as HTMLVideoElement);
  for (const t of tracks) {
    assertEquals(t.stopCount, 1);
  }
});

Deno.test("stopStream: clears video.srcObject", () => {
  const { stream } = makeFakeStream(1);
  const videoEl = { srcObject: stream as MediaStream | null };
  stopStream(stream, videoEl as unknown as HTMLVideoElement);
  assertEquals(videoEl.srcObject, null);
});

Deno.test("stopStream: idempotent — second call does nothing", () => {
  const { stream, tracks } = makeFakeStream(3);
  const videoEl = { srcObject: stream as MediaStream | null };
  stopStream(stream, videoEl as unknown as HTMLVideoElement);
  stopStream(stream, videoEl as unknown as HTMLVideoElement);
  for (const t of tracks) {
    assertEquals(t.stopCount, 1);
  }
});

Deno.test("stopStream: handles null stream gracefully", () => {
  const videoEl = { srcObject: null as MediaStream | null };
  stopStream(null, videoEl as unknown as HTMLVideoElement);
  assertEquals(videoEl.srcObject, null);
});
