type NavLike = { mediaDevices?: { getUserMedia?: unknown } } | undefined;

/**
 * Returns true if the browser supports getUserMedia (continuous capture).
 * Accepts an optional navigator-like object to support unit testing.
 */
export function isContinuousCaptureSupported(
  nav: NavLike = navigator,
): boolean {
  return typeof nav?.mediaDevices?.getUserMedia === "function";
}
