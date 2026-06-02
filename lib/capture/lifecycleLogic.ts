import { stopStream } from "@/lib/camera/stream.ts";

interface Ref<T> {
  current: T;
}

/**
 * Returns a cleanup function that stops the stream and clears the video element.
 * Both refs are read at call time, so the cleanup always operates on the latest values.
 * The cleanup is idempotent: calling it twice is safe.
 */
export function createCleanup(
  streamRef: Ref<MediaStream | null>,
  videoRef: Ref<HTMLVideoElement | null>,
): () => void {
  return function cleanup() {
    stopStream(streamRef.current, videoRef.current);
    streamRef.current = null;
  };
}
