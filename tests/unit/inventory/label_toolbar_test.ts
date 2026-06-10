import { assertEquals, assertStringIncludes } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createBox } from "@/lib/inventory/boxRepo.ts";
import { createRoom } from "@/lib/inventory/roomRepo.ts";
import { handler } from "@/routes/boxes/[id]/label.tsx";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("label page: toolbar has print button and back link", async () => {
  await withKv(async () => {
    const room = await createRoom("Küche");
    const box = await createBox({ destinationRoomId: room.id });

    const ctx = {
      params: { id: box.id },
      url: new URL("http://localhost"),
    };

    // deno-lint-ignore no-explicit-any
    const response = await handler.GET!(ctx as any);
    const body = await response.text();

    assertStringIncludes(body, 'id="print-btn"');
    assertStringIncludes(body, `href="/boxes/${box.id}"`);
    assertStringIncludes(body, 'class="toolbar"');
    assertEquals(
      body.includes("onclick="),
      false,
      "should not use onclick attributes",
    );
  });
});

Deno.test("label page: toolbar is hidden in print media CSS", async () => {
  await withKv(async () => {
    const room = await createRoom("Wohnzimmer");
    const box = await createBox({ destinationRoomId: room.id });

    const ctx = {
      params: { id: box.id },
      url: new URL("http://localhost"),
    };

    // deno-lint-ignore no-explicit-any
    const response = await handler.GET!(ctx as any);
    const body = await response.text();

    assertStringIncludes(body, "@media print");
    assertStringIncludes(body, ".toolbar");
    assertStringIncludes(body, "display: none");
  });
});
