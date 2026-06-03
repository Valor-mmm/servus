/**
 * Unit tests for resizeBlobToJpeg.
 * Browser globals (Image, canvas, URL) are stubbed so this runs in Deno.
 */
import { assertEquals } from "@std/assert";
import { resizeBlobToJpeg } from "@/lib/photos/resizeHelper.ts";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

let lastCanvasWidth = 0;
let lastCanvasHeight = 0;

class FakeImage {
  naturalWidth = 1920;
  naturalHeight = 1080;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  set src(_: string) {
    // Simulate async load in next microtask
    queueMicrotask(() => this.onload?.());
  }
}

function makeFakeCanvas() {
  return {
    get width() {
      return lastCanvasWidth;
    },
    set width(v: number) {
      lastCanvasWidth = v;
    },
    get height() {
      return lastCanvasHeight;
    },
    set height(v: number) {
      lastCanvasHeight = v;
    },
    getContext() {
      return { drawImage() {} };
    },
    toBlob(cb: (b: Blob | null) => void) {
      cb(new Blob(["fake-jpeg"], { type: "image/jpeg" }));
    },
  };
}

function installStubs() {
  const saved = {
    Image: (globalThis as Record<string, unknown>)["Image"],
    document: (globalThis as Record<string, unknown>)["document"],
    URL: (globalThis as Record<string, unknown>)["URL"],
  };

  (globalThis as Record<string, unknown>)["Image"] = FakeImage;
  (globalThis as Record<string, unknown>)["document"] = {
    createElement(_tag: string) {
      return makeFakeCanvas();
    },
  };
  (globalThis as Record<string, unknown>)["URL"] = {
    createObjectURL: () => "blob:fake",
    revokeObjectURL: () => {},
  };

  return () => {
    (globalThis as Record<string, unknown>)["Image"] = saved.Image;
    (globalThis as Record<string, unknown>)["document"] = saved.document;
    (globalThis as Record<string, unknown>)["URL"] = saved.URL;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test(
  "resizeBlobToJpeg: 1920×1080 blob → canvas long edge ≤ 1600",
  async () => {
    const restore = installStubs();
    try {
      const input = new Blob(["fake-image-data"], { type: "image/jpeg" });
      const result = await resizeBlobToJpeg(input);
      assertEquals(result.type, "image/jpeg");
      // Canvas was set to 1600×900 (scaled from 1920×1080)
      assertEquals(lastCanvasWidth <= 1600, true);
      assertEquals(lastCanvasHeight <= 1600, true);
      const longEdge = Math.max(lastCanvasWidth, lastCanvasHeight);
      assertEquals(longEdge <= 1600, true);
    } finally {
      restore();
    }
  },
);

Deno.test(
  "resizeBlobToJpeg: small blob (800×600) → canvas unchanged",
  async () => {
    class SmallFakeImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      set src(_: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    const restore = installStubs();
    (globalThis as Record<string, unknown>)["Image"] = SmallFakeImage;
    try {
      const input = new Blob(["fake"], { type: "image/jpeg" });
      await resizeBlobToJpeg(input);
      assertEquals(lastCanvasWidth, 800);
      assertEquals(lastCanvasHeight, 600);
    } finally {
      restore();
    }
  },
);
