# Argon2id library choice: hash-wasm

**Library:** `npm:hash-wasm@4.12.0`

**Why:** `hash-wasm` ships a single pre-compiled WASM binary with zero npm
dependencies. It supports Argon2id natively with full control over cost
parameters (memory, iterations, parallelism), works in Deno Deploy's edge
runtime without any native-code permissions, and is actively maintained with
millions of weekly downloads. Alternatives considered:

- `npm:argon2` — native bindings, cannot run on Deno Deploy without
  `--allow-ffi`.
- `https://deno.land/x/argon2/` — Deno-specific WASM wrapper, last published in
  2021; not safe to depend on for security-critical code.
- `jsr:@felix/argon2` — smaller community, less audit surface confidence.

**Fallback plan:** The WASM binary is small enough to vendor into `lib/auth/` if
`hash-wasm` goes unmaintained. The API surface we use (`argon2id`,
`argon2Verify`) is two functions — easy to swap behind a thin wrapper in
`lib/auth/password.ts`.
