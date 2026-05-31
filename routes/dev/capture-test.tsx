import { define } from "@/utils.ts";
import PhotoCapture from "@/islands/PhotoCapture.tsx";

// Dev-only harness for manually testing the PhotoCapture island on a real phone.
// Auth is enforced by the global requireAuth middleware; this page is only
// reachable by authenticated users.
export default define.page(function CaptureTestPage({ state }) {
  return (
    <main class="page">
      <h1>Photo Capture – Dev Harness</h1>
      <p>
        This page is for development testing only. Use a real phone to test the
        camera capture flow.
      </p>
      <h2>Create mode (no box)</h2>
      <PhotoCapture
        mode="create"
        csrfToken={state.csrfToken ?? ""}
      />
      <h2>Append mode (dummy item id)</h2>
      <PhotoCapture
        mode="append"
        itemId="__dev__"
        csrfToken={state.csrfToken ?? ""}
      />
    </main>
  );
});
