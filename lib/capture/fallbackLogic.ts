export type CaptureSurfaceChoice = "continuous" | "file-input";
export type GetUserMediaErrorKind = "not-allowed" | "not-found" | "other";

/**
 * Returns which capture surface to render based on browser support.
 * Used by CaptureSurface to pick between ContinuousCapture and PhotoCapture.
 */
export function selectCaptureSurface(
  supported: boolean,
): CaptureSurfaceChoice {
  return supported ? "continuous" : "file-input";
}

/**
 * Classifies a getUserMedia rejection into one of three cases:
 * - "not-allowed": permission denied (NotAllowedError)
 * - "not-found": no camera device (NotFoundError)
 * - "other": anything else (network, hardware, etc.)
 */
export function classifyGetUserMediaError(
  err: unknown,
): GetUserMediaErrorKind {
  if (err instanceof DOMException || (err as DOMException)?.name) {
    const name = (err as DOMException).name;
    if (name === "NotAllowedError") return "not-allowed";
    if (name === "NotFoundError") return "not-found";
  }
  return "other";
}
