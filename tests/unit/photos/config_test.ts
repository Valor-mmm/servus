import { assertEquals, assertThrows } from "@std/assert";
import { getR2Config } from "@/lib/photos/config.ts";

const REQUIRED_VARS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_URL",
] as const;

function withEnv(
  vars: Record<string, string>,
  fn: () => void,
): void {
  for (const [k, v] of Object.entries(vars)) {
    Deno.env.set(k, v);
  }
  try {
    fn();
  } finally {
    for (const v of REQUIRED_VARS) {
      Deno.env.delete(v);
    }
  }
}

const FULL_ENV = {
  R2_ACCESS_KEY_ID: "key456",
  R2_SECRET_ACCESS_KEY: "secret789",
  R2_PUBLIC_URL: "https://acc123.r2.cloudflarestorage.com/my-bucket",
};

Deno.test("getR2Config returns parsed config when all vars present", () => {
  withEnv(FULL_ENV, () => {
    const cfg = getR2Config();
    assertEquals(cfg.accessKeyId, "key456");
    assertEquals(cfg.secretAccessKey, "secret789");
    assertEquals(
      cfg.publicUrl,
      "https://acc123.r2.cloudflarestorage.com/my-bucket",
    );
  });
});

Deno.test("getR2Config throws when R2_ACCESS_KEY_ID is missing", () => {
  const env = { ...FULL_ENV };
  delete (env as Record<string, string>)["R2_ACCESS_KEY_ID"];
  withEnv(env, () => {
    assertThrows(() => getR2Config(), Error, "R2_ACCESS_KEY_ID");
  });
});

Deno.test("getR2Config throws when R2_SECRET_ACCESS_KEY is missing", () => {
  const env = { ...FULL_ENV };
  delete (env as Record<string, string>)["R2_SECRET_ACCESS_KEY"];
  withEnv(env, () => {
    assertThrows(() => getR2Config(), Error, "R2_SECRET_ACCESS_KEY");
  });
});

Deno.test("getR2Config throws when R2_PUBLIC_URL is missing", () => {
  const env = { ...FULL_ENV };
  delete (env as Record<string, string>)["R2_PUBLIC_URL"];
  withEnv(env, () => {
    assertThrows(() => getR2Config(), Error, "R2_PUBLIC_URL");
  });
});
