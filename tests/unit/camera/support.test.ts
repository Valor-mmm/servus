import { assertEquals } from "@std/assert";
import { isContinuousCaptureSupported } from "@/lib/camera/support.ts";

Deno.test("isContinuousCaptureSupported: returns false when navigator is undefined", () => {
  assertEquals(isContinuousCaptureSupported(undefined), false);
});

Deno.test("isContinuousCaptureSupported: returns false when mediaDevices is absent", () => {
  assertEquals(isContinuousCaptureSupported({}), false);
});

Deno.test("isContinuousCaptureSupported: returns false when getUserMedia is absent", () => {
  assertEquals(isContinuousCaptureSupported({ mediaDevices: {} }), false);
});

Deno.test("isContinuousCaptureSupported: returns true when getUserMedia is present", () => {
  assertEquals(
    isContinuousCaptureSupported({
      mediaDevices: { getUserMedia: () => Promise.resolve(null) },
    }),
    true,
  );
});
