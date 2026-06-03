const stopped = new WeakSet<MediaStream>();

/**
 * Stops all tracks on the stream and clears the video element's srcObject.
 * Idempotent: a second call on the same stream is a no-op.
 */
export function stopStream(
  stream: MediaStream | null,
  videoEl: HTMLVideoElement | null,
): void {
  if (videoEl) videoEl.srcObject = null;
  if (!stream || stopped.has(stream)) return;
  stopped.add(stream);
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
