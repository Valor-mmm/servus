export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: "environment" } },
};

/**
 * Calls getUserMedia with the standard camera constraints, attaches the
 * stream to the video element, and returns the stream.
 */
export async function activateCamera(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
  videoEl: Pick<HTMLVideoElement, "srcObject">,
): Promise<MediaStream> {
  const stream = await mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
  videoEl.srcObject = stream;
  return stream;
}
