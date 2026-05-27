import { argon2id, argon2Verify } from "hash-wasm";

// OWASP recommended minimum: m=64MiB, t=3, p=1
const MEMORY_COST = 65536; // 64 MiB in KiB
const TIME_COST = 3;
const PARALLELISM = 1;
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);

  return await argon2id({
    password,
    salt,
    iterations: TIME_COST,
    parallelism: PARALLELISM,
    memorySize: MEMORY_COST,
    hashLength: HASH_LENGTH,
    outputType: "encoded",
  });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return await argon2Verify({ hash, password });
}
