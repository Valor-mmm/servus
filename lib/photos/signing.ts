import { AwsClient } from "aws4fetch";
import type { R2Config } from "@/lib/photos/config.ts";

const GET_WINDOW_SECONDS = 900; // 15-minute cache window for presigned GET URLs

function _makeClient(cfg: R2Config): AwsClient {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

export function presignPut(
  cfg: R2Config,
  key: string,
  contentType: string,
  ttl = 300,
): string {
  const url = new URL(`${cfg.publicUrlBase}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(ttl));
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dateShort = dateStr.slice(0, 8);
  const region = "auto";
  const service = "s3";

  url.searchParams.set(
    "X-Amz-Algorithm",
    "AWS4-HMAC-SHA256",
  );
  url.searchParams.set(
    "X-Amz-Credential",
    `${cfg.accessKeyId}/${dateShort}/${region}/${service}/aws4_request`,
  );
  url.searchParams.set("X-Amz-Date", dateStr);
  url.searchParams.set("X-Amz-SignedHeaders", "content-type;host");
  url.searchParams.set(
    "X-Amz-Signature",
    _signManual(cfg, "PUT", url, dateStr, contentType),
  );
  return url.toString();
}

export function presignGet(
  cfg: R2Config,
  key: string,
  nowSeconds?: number,
): string {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  // Pin to the start of the current 15-min window — same window = same expiry
  const windowStart = Math.floor(now / GET_WINDOW_SECONDS) * GET_WINDOW_SECONDS;
  const expiresAt = windowStart + GET_WINDOW_SECONDS;
  const ttl = expiresAt - windowStart;

  const url = new URL(`${cfg.publicUrlBase}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(ttl));
  const dateObj = new Date(windowStart * 1000);
  const dateStr = dateObj.toISOString().replace(/[-:]/g, "").split(".")[0] +
    "Z";
  const dateShort = dateStr.slice(0, 8);
  const region = "auto";
  const service = "s3";

  url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  url.searchParams.set(
    "X-Amz-Credential",
    `${cfg.accessKeyId}/${dateShort}/${region}/${service}/aws4_request`,
  );
  url.searchParams.set("X-Amz-Date", dateStr);
  url.searchParams.set("X-Amz-SignedHeaders", "host");
  url.searchParams.set(
    "X-Amz-Signature",
    _signManual(cfg, "GET", url, dateStr, null),
  );
  return url.toString();
}

// Minimal SigV4 presign implementation.
// We drive the crypto ourselves rather than using AwsClient.sign() because
// AwsClient.sign() requires a live fetch and doesn't expose the presign path.
// The algorithm follows the AWS SigV4 spec exactly.
function _signManual(
  cfg: R2Config,
  method: string,
  url: URL,
  dateStr: string, // ISO8601 basic: 20240101T120000Z
  contentType: string | null,
): string {
  // Build canonical request
  const host = url.hostname;
  const path = url.pathname;
  const dateShort = dateStr.slice(0, 8);
  const region = "auto";
  const service = "s3";

  // Sort query params for canonical form (must exclude X-Amz-Signature itself)
  const params = new URLSearchParams(url.searchParams);
  params.delete("X-Amz-Signature");
  const sortedParams = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const signedHeaders = contentType ? "content-type;host" : "host";
  const canonicalHeaders = contentType
    ? `content-type:${contentType}\nhost:${host}\n`
    : `host:${host}\n`;

  const canonicalRequest = [
    method,
    path,
    sortedParams,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  // Build string to sign
  const scope = `${dateShort}/${region}/${service}/aws4_request`;
  const encoder = new TextEncoder();
  const hash = _hexHash(encoder.encode(canonicalRequest));
  const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${scope}\n${hash}`;

  // Derive signing key
  const signingKey = _deriveKey(
    cfg.secretAccessKey,
    dateShort,
    region,
    service,
  );

  // Sign
  return _hexHmac(signingKey, encoder.encode(stringToSign));
}

function _hexHash(data: Uint8Array): string {
  // SHA-256 via sync approach using subtle — but subtle is async only.
  // We use a deterministic workaround: build a HMAC-SHA256 over an empty key
  // which is just SHA-256(data). Since we're in a sync context we must use the
  // Web Crypto subtle API synchronously — impossible in standard JS.
  //
  // Instead, we inline a pure-JS SHA-256 implementation to keep everything sync.
  return sha256Hex(data);
}

function _hexHmac(key: Uint8Array, data: Uint8Array): string {
  return hmacSha256Hex(key, data);
}

function _deriveKey(
  secret: string,
  date: string,
  region: string,
  service: string,
): Uint8Array {
  const enc = new TextEncoder();
  const kDate = hmacSha256Raw(enc.encode("AWS4" + secret), enc.encode(date));
  const kRegion = hmacSha256Raw(kDate, enc.encode(region));
  const kService = hmacSha256Raw(kRegion, enc.encode(service));
  return hmacSha256Raw(kService, enc.encode("aws4_request"));
}

// ── Pure-JS SHA-256 ──────────────────────────────────────────────────────────
// Adapted from the public-domain SHA-256 algorithm (FIPS 180-4).

const K = new Uint32Array([
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
]);

function sha256(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a,
    h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  const bitLen = data.length * 8;
  // Pad
  const padLen = data.length % 64 < 56
    ? 56 - (data.length % 64)
    : 120 - (data.length % 64);
  const msg = new Uint8Array(data.length + padLen + 8);
  msg.set(data);
  msg[data.length] = 0x80;
  // Append bit length as 64-bit big-endian
  const dv = new DataView(msg.buffer);
  dv.setUint32(msg.length - 4, bitLen & 0xffffffff, false);
  dv.setUint32(msg.length - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  for (let i = 0; i < msg.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = dv.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, h0, false);
  odv.setUint32(4, h1, false);
  odv.setUint32(8, h2, false);
  odv.setUint32(12, h3, false);
  odv.setUint32(16, h4, false);
  odv.setUint32(20, h5, false);
  odv.setUint32(24, h6, false);
  odv.setUint32(28, h7, false);
  return out;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sha256Hex(data: Uint8Array): string {
  return toHex(sha256(data));
}

function hmacSha256Raw(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key.length > blockSize ? sha256(key) : key;
  if (k.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(k);
    k = padded;
  }
  const ipad = new Uint8Array(blockSize + data.length);
  const opad = new Uint8Array(blockSize + 32);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = k[i] ^ 0x36;
    opad[i] = k[i] ^ 0x5c;
  }
  ipad.set(data, blockSize);
  const inner = sha256(ipad);
  opad.set(inner, blockSize);
  return sha256(opad);
}

function hmacSha256Hex(key: Uint8Array, data: Uint8Array): string {
  return toHex(hmacSha256Raw(key, data));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Re-export AwsClient for use in r2.ts and route handlers that need real fetch
export { AwsClient };
