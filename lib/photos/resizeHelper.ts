export const MAX_LONG_EDGE = 1600;

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
