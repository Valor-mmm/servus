/**
 * Tests for the activation path logic extracted from ContinuousCapture.
 * Tests the camera constraint shape and getUserMedia wiring without rendering.
 */
import { assertEquals } from "@std/assert";
import { CAMERA_CONSTRAINTS } from "@/lib/capture/activationLogic.ts";

Deno.test("CAMERA_CONSTRAINTS: uses environment-facing camera", () => {
  assertEquals(
    (CAMERA_CONSTRAINTS.video as MediaTrackConstraints | undefined)?.facingMode,
    { ideal: "environment" },
  );
});

Deno.test("activateCamera: calls getUserMedia with correct constraints once", async () => {
  const { activateCamera } = await import("@/lib/capture/activationLogic.ts");
  const calls: MediaStreamConstraints[] = [];
  const fakeStream = { getTracks: () => [] } as unknown as MediaStream;
  const fakeMediaDevices = {
    getUserMedia: (c: MediaStreamConstraints) => {
      calls.push(c);
      return Promise.resolve(fakeStream);
    },
  } as unknown as MediaDevices;
  const fakeVideo = { srcObject: null as MediaStream | null };

  const result = await activateCamera(
    fakeMediaDevices,
    fakeVideo as unknown as HTMLVideoElement,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0], CAMERA_CONSTRAINTS);
  assertEquals(fakeVideo.srcObject, fakeStream);
  assertEquals(result, fakeStream);
});

Deno.test("activateCamera: propagates getUserMedia rejection", async () => {
  const { activateCamera } = await import("@/lib/capture/activationLogic.ts");
  const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  const fakeMediaDevices = {
    getUserMedia: () => Promise.reject(err),
  } as unknown as MediaDevices;
  const fakeVideo = { srcObject: null };

  let caught: unknown;
  try {
    await activateCamera(
      fakeMediaDevices,
      fakeVideo as unknown as HTMLVideoElement,
    );
  } catch (e) {
    caught = e;
  }
  assertEquals((caught as DOMException)?.name, "NotAllowedError");
});
