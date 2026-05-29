export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison to avoid timing attacks. */
export function verifyCsrfToken(a: string, b: string): boolean {
  if (!a || !b) return false;

  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);

  // Pad the shorter one to the length of the longer so we always iterate
  const len = Math.max(aBuf.length, bBuf.length);
  const aPad = new Uint8Array(len);
  const bPad = new Uint8Array(len);
  aPad.set(aBuf);
  bPad.set(bBuf);

  let diff = aBuf.length ^ bBuf.length; // non-zero if lengths differ
  for (let i = 0; i < len; i++) {
    diff |= aPad[i] ^ bPad[i];
  }
  return diff === 0;
}
