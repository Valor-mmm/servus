interface CaptureAndUploadOptions {
  videoEl: Pick<HTMLVideoElement, "videoWidth" | "videoHeight">;
  createCanvas?: () => HTMLCanvasElement;
  resizeBlob?: (blob: Blob) => Promise<Blob>;
  csrfToken: string;
  fetchFn?: typeof fetch;
}

/**
 * Captures the current video frame, downscales via resizeBlobToJpeg,
 * POSTs to /api/photos/upload-url, PUTs the blob to R2.
 * Returns the photo key and the resized blob (for thumbnail preview).
 * Accepts injectable dependencies for unit testing.
 */
export async function captureAndUpload(
  opts: CaptureAndUploadOptions,
): Promise<{ key: string; blob: Blob }> {
  const {
    videoEl,
    createCanvas = () => document.createElement("canvas"),
    resizeBlob = (b) => Promise.resolve(b),
    csrfToken,
    fetchFn = fetch,
  } = opts;

  // Draw current video frame to canvas
  const canvas = createCanvas();
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(videoEl as unknown as CanvasImageSource, 0, 0);

  const raw = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("toBlob returned null"))),
      "image/jpeg",
      0.85,
    )
  );

  const blob = await resizeBlob(raw);

  // Get presigned upload URL
  const urlResp = await fetchFn("/api/photos/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ contentType: "image/jpeg", bytes: blob.size }),
  });
  if (!urlResp.ok) throw new Error("upload-url request failed");
  const { key, url } = (await urlResp.json()) as { key: string; url: string };

  // PUT blob to R2
  const putResp = await fetchFn(url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putResp.ok) throw new Error("R2 PUT failed");

  return { key, blob };
}
