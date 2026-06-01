import { assertEquals } from "@std/assert";
import { deleteObject } from "@/lib/photos/r2.ts";
import type { R2Config } from "@/lib/photos/config.ts";

const cfg: R2Config = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  publicUrl: "https://testaccount.r2.cloudflarestorage.com/test-bucket",
};

Deno.test("deleteObject returns ok:true on 204 response", async () => {
  const stubFetch = (
    _url: string | URL,
    _init?: RequestInit,
  ): Promise<Response> => Promise.resolve(new Response(null, { status: 204 }));

  const result = await deleteObject(cfg, "somekey", stubFetch);
  assertEquals(result.ok, true);
});

Deno.test("deleteObject returns ok:true on 200 response", async () => {
  const stubFetch = (
    _url: string | URL,
    _init?: RequestInit,
  ): Promise<Response> => Promise.resolve(new Response(null, { status: 200 }));

  const result = await deleteObject(cfg, "somekey", stubFetch);
  assertEquals(result.ok, true);
});

Deno.test("deleteObject returns ok:false on 500 response and never throws", async () => {
  const stubFetch = (
    _url: string | URL,
    _init?: RequestInit,
  ): Promise<Response> =>
    Promise.resolve(new Response("Internal Error", { status: 500 }));

  const result = await deleteObject(cfg, "somekey", stubFetch);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(typeof result.error, "string");
});

Deno.test("deleteObject returns ok:false when fetch rejects and never throws", async () => {
  const stubFetch = (
    _url: string | URL,
    _init?: RequestInit,
  ): Promise<Response> => Promise.reject(new Error("Network failure"));

  const result = await deleteObject(cfg, "somekey", stubFetch);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(typeof result.error, "string");
});

Deno.test("deleteObject returns ok:false on 403 response", async () => {
  const stubFetch = (
    _url: string | URL,
    _init?: RequestInit,
  ): Promise<Response> =>
    Promise.resolve(new Response("Forbidden", { status: 403 }));

  const result = await deleteObject(cfg, "somekey", stubFetch);
  assertEquals(result.ok, false);
});
