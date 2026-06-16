import { define } from "@/utils.ts";
import NativePhotoCapture from "@/islands/NativePhotoCapture.tsx";

// Dev-only harness for manually testing the NativePhotoCapture island on a
// real phone. Auth is enforced by the global requireAuth middleware; this
// page is only reachable by authenticated users.
export default define.page(function CaptureTestPage({ state }) {
  return (
    <main class="page">
      <h1>Photo Capture – Dev Harness</h1>
      <p>
        This page is for development testing only. Use a real phone to test the
        camera capture flow.
      </p>
      <h2>create-from-photo mode (no box)</h2>
      <NativePhotoCapture
        mode="create-from-photo"
        csrfToken={state.csrfToken ?? ""}
      />
      <h2>attach-to-form mode</h2>
      <NativePhotoCapture
        mode="attach-to-form"
        csrfToken={state.csrfToken ?? ""}
      />
      <h2>append-to-existing mode (dummy item id)</h2>
      <NativePhotoCapture
        mode="append-to-existing"
        itemId="__dev__"
        csrfToken={state.csrfToken ?? ""}
      />
    </main>
  );
});
