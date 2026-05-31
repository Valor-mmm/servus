export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getR2Config(): R2Config {
  return {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    publicUrl: requireEnv("R2_PUBLIC_URL"),
  };
}
