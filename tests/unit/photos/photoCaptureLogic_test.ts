/**
 * Unit tests for the PhotoCapture island's endpoint-selection logic.
 *
 * The island uses browser APIs that can't run in Deno, so we test the
 * branching rule in isolation: given the current mode and whether an item was
 * already created this session, which API endpoint is called?
 */
import { assertEquals } from "@std/assert";

// Mirror of the decision logic inside PhotoCapture.handleFileChange step 3.
function resolveEndpoint(opts: {
  mode: "create" | "append";
  createdItemId: string | null;
  propItemId?: string;
}): "create-from-photo" | "append-photo" {
  const existingId = opts.createdItemId ?? opts.propItemId;
  if (existingId && (opts.mode === "append" || opts.createdItemId !== null)) {
    return "append-photo";
  }
  return "create-from-photo";
}

Deno.test("resolveEndpoint: create mode, no prior item → create-from-photo", () => {
  assertEquals(
    resolveEndpoint({ mode: "create", createdItemId: null }),
    "create-from-photo",
  );
});

Deno.test("resolveEndpoint: create mode, item already created this session → append-photo", () => {
  assertEquals(
    resolveEndpoint({ mode: "create", createdItemId: "item-abc" }),
    "append-photo",
  );
});

Deno.test("resolveEndpoint: append mode with prop itemId → append-photo", () => {
  assertEquals(
    resolveEndpoint({
      mode: "append",
      createdItemId: null,
      propItemId: "item-xyz",
    }),
    "append-photo",
  );
});

Deno.test("resolveEndpoint: append mode with both createdItemId and propItemId → append-photo", () => {
  assertEquals(
    resolveEndpoint({
      mode: "append",
      createdItemId: "item-abc",
      propItemId: "item-xyz",
    }),
    "append-photo",
  );
});

Deno.test("resolveEndpoint: append mode, no itemId at all → create-from-photo (degenerate case)", () => {
  // This shouldn't happen in practice (append always has itemId), but the
  // logic falls through to create rather than producing a broken append call.
  assertEquals(
    resolveEndpoint({ mode: "append", createdItemId: null }),
    "create-from-photo",
  );
});
