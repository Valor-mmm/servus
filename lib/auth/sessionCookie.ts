export const COOKIE_NAME = "servus_session";

// Cookie format: "<sessionId>.<base64url-hmac-sha256>"

async function getSigningKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(
    hexKey.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
  );
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

export async function signSessionId(
  sessionId: string,
  hexKey: string,
): Promise<string> {
  const key = await getSigningKey(hexKey);
  const data = new TextEncoder().encode(sessionId);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return `${sessionId}.${toBase64Url(sig)}`;
}

export async function verifySessionCookie(
  cookie: string,
  hexKey: string,
): Promise<string | null> {
  const dotIdx = cookie.indexOf(".");
  if (dotIdx === -1) return null;

  const sessionId = cookie.slice(0, dotIdx);
  const sigB64 = cookie.slice(dotIdx + 1);

  if (!sessionId || !sigB64) return null;

  try {
    const key = await getSigningKey(hexKey);
    const data = new TextEncoder().encode(sessionId);
    const sigBytes = fromBase64Url(sigB64);
    const sig = new Uint8Array(sigBytes).buffer as ArrayBuffer;
    const valid = await crypto.subtle.verify("HMAC", key, sig, data);
    return valid ? sessionId : null;
  } catch {
    return null;
  }
}
