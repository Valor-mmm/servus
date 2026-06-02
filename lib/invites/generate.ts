import { argon2id } from "hash-wasm";

const MEMORY_COST = 65536; // 64 MiB in KiB
const TIME_COST = 3;
const PARALLELISM = 1;
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;
const CODE_BYTES = 20;

function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/,
    "",
  );
}

export async function computeLookup(rawCode: string): Promise<string> {
  const data = new TextEncoder().encode(rawCode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

export interface GeneratedCode {
  rawCode: string;
  hashedCode: string;
  codeLookup: string;
}

export async function generateInviteCode(): Promise<GeneratedCode> {
  const rawBytes = new Uint8Array(CODE_BYTES);
  crypto.getRandomValues(rawBytes);
  const rawCode = toBase64url(rawBytes);

  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);

  const hashedCode = await argon2id({
    password: rawCode,
    salt,
    iterations: TIME_COST,
    parallelism: PARALLELISM,
    memorySize: MEMORY_COST,
    hashLength: HASH_LENGTH,
    outputType: "encoded",
  });

  const codeLookup = await computeLookup(rawCode);

  return { rawCode, hashedCode, codeLookup };
}
