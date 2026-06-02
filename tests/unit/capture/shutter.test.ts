/**
 * Tests for the shutter capture→upload pipeline extracted from ContinuousCapture.
 */
import { assertEquals } from "@std/assert";
import { captureAndUpload } from "@/lib/capture/shutterLogic.ts";

const R2_URL = "https://r2-test.example.com/photo-key";

function makeFakeVideo(w = 1920, h = 1080) {
  return {
    videoWidth: w,
    videoHeight: h,
  } as unknown as HTMLVideoElement;
}

function makeFakeFetch(photoKey = "test-key") {
  const log: {
    url: string;
    method: string;
    headers: Record<string, string>;
  }[] = [];
  const fakeFetch = (
    url: string,
    init: RequestInit,
  ): Promise<Response> => {
    log.push({
      url: String(url),
      method: init.method ?? "GET",
      headers: Object.fromEntries(
        new Headers(init.headers as HeadersInit).entries(),
      ),
    });
    if (String(url).endsWith("upload-url")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ key: photoKey, url: R2_URL }),
          { status: 200 },
        ),
      );
    }
    return Promise.resolve(new Response(null, { status: 200 }));
  };
  return { fakeFetch, log };
}

function makeResizeSpy() {
  let called = 0;
  const spy = (blob: Blob): Promise<Blob> => {
    called++;
    return Promise.resolve(blob);
  };
  return {
    spy,
    get called() {
      return called;
    },
  };
}

function makeFakeCanvas(w: number, h: number) {
  let capturedW = 0;
  let capturedH = 0;
  const ctx = { drawImage() {} };
  const canvas = {
    get width() {
      return capturedW;
    },
    set width(v: number) {
      capturedW = v;
    },
    get height() {
      return capturedH;
    },
    set height(v: number) {
      capturedH = v;
    },
    getContext() {
      return ctx;
    },
    toBlob(cb: (b: Blob | null) => void) {
      cb(new Blob(["frame"], { type: "image/jpeg" }));
    },
    get capturedW() {
      return capturedW;
    },
    get capturedH() {
      return capturedH;
    },
  };
  // pre-size to match video dimensions
  capturedW = w;
  capturedH = h;
  return canvas;
}

Deno.test("captureAndUpload: draws frame to canvas sized to videoWidth×videoHeight", async () => {
  const video = makeFakeVideo(1920, 1080);
  const fakeCanvas = makeFakeCanvas(1920, 1080);
  const { fakeFetch } = makeFakeFetch();
  const { spy } = makeResizeSpy();

  await captureAndUpload({
    videoEl: video,
    createCanvas: () => fakeCanvas as unknown as HTMLCanvasElement,
    resizeBlob: spy,
    csrfToken: "token",
    fetchFn: fakeFetch as typeof fetch,
  });

  assertEquals(fakeCanvas.capturedW, 1920);
  assertEquals(fakeCanvas.capturedH, 1080);
});

Deno.test("captureAndUpload: calls resizeBlobToJpeg on the raw frame", async () => {
  const video = makeFakeVideo();
  const fakeCanvas = makeFakeCanvas(1920, 1080);
  const { fakeFetch } = makeFakeFetch();
  let resizeCalled = 0;
  const spyResize = (blob: Blob): Promise<Blob> => {
    resizeCalled++;
    return Promise.resolve(blob);
  };

  const { key } = await captureAndUpload({
    videoEl: video,
    createCanvas: () => fakeCanvas as unknown as HTMLCanvasElement,
    resizeBlob: spyResize,
    csrfToken: "token",
    fetchFn: fakeFetch as typeof fetch,
  });

  assertEquals(resizeCalled, 1);
  assertEquals(typeof key, "string");
});

Deno.test("captureAndUpload: POSTs to /api/photos/upload-url with CSRF token", async () => {
  const video = makeFakeVideo();
  const fakeCanvas = makeFakeCanvas(1920, 1080);
  const { fakeFetch, log } = makeFakeFetch();
  const { spy } = makeResizeSpy();

  await captureAndUpload({
    videoEl: video,
    createCanvas: () => fakeCanvas as unknown as HTMLCanvasElement,
    resizeBlob: spy,
    csrfToken: "my-csrf",
    fetchFn: fakeFetch as typeof fetch,
  });

  const uploadCall = log.find((r) => r.url.endsWith("upload-url"));
  assertEquals(uploadCall?.method, "POST");
  assertEquals(uploadCall?.headers["x-csrf-token"], "my-csrf");
});

Deno.test("captureAndUpload: PUTs the blob to the returned R2 URL", async () => {
  const video = makeFakeVideo();
  const fakeCanvas = makeFakeCanvas(1920, 1080);
  const { fakeFetch, log } = makeFakeFetch();
  const { spy } = makeResizeSpy();

  await captureAndUpload({
    videoEl: video,
    createCanvas: () => fakeCanvas as unknown as HTMLCanvasElement,
    resizeBlob: spy,
    csrfToken: "token",
    fetchFn: fakeFetch as typeof fetch,
  });

  const putCall = log.find((r) => r.url === R2_URL);
  assertEquals(putCall?.method, "PUT");
});

Deno.test("captureAndUpload: returns the photo key", async () => {
  const video = makeFakeVideo();
  const fakeCanvas = makeFakeCanvas(1920, 1080);
  const { fakeFetch } = makeFakeFetch("my-photo-key");
  const { spy } = makeResizeSpy();

  const { key } = await captureAndUpload({
    videoEl: video,
    createCanvas: () => fakeCanvas as unknown as HTMLCanvasElement,
    resizeBlob: spy,
    csrfToken: "token",
    fetchFn: fakeFetch as typeof fetch,
  });

  assertEquals(key, "my-photo-key");
});
