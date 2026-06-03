export const MAX_LONG_EDGE = 1600;
export const JPEG_QUALITY = 0.85;

/**
 * Calculates target canvas dimensions such that the longest edge is ≤ maxEdge,
 * preserving aspect ratio. Returns original dimensions if already within limits.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxEdge = MAX_LONG_EDGE,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** Resize a Blob (or File) to ≤1600px on the long edge and re-encode as JPEG. */
export function resizeBlobToJpeg(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const { width, height } = calculateTargetDimensions(
        img.naturalWidth,
        img.naturalHeight,
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas 2d context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("failed to load image"));
    };
    img.src = blobUrl;
  });
}
