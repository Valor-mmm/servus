import { assertEquals, assertExists } from "@std/assert";
import {
  type CaptureUploadDeps,
  CaptureUploadSession,
} from "@/lib/inventory/captureUpload.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeDeps(
  overrides: Partial<CaptureUploadDeps> = {},
): CaptureUploadDeps {
  return {
    resize: (blob: Blob) => Promise.resolve(blob),
    getUploadUrl: (_blob: Blob) =>
      Promise.resolve({ key: "key-1", url: "https://r2.example/key-1" }),
    putToStorage: (_url: string, _blob: Blob) => Promise.resolve(),
    createItem: (_photoKey: string, _boxId: string | null) =>
      Promise.resolve({ id: "item-1" }),
    appendPhoto: (_itemId: string, _photoKey: string) => Promise.resolve(),
    removePhoto: (
      _itemId: string,
      _photoKey: string,
      _deleteIfEmpty: boolean,
    ) => Promise.resolve({ deleted: false }),
    ...overrides,
  };
}

const BLOB = new Blob(["fake"], { type: "image/jpeg" });

Deno.test("addPhoto immediately reflects an uploading status", () => {
  const deps = makeDeps();
  const session = new CaptureUploadSession({ mode: "attach-to-form" }, deps);
  session.addPhoto(BLOB);
  assertEquals(session.getPhotos().length, 1);
  assertEquals(session.getPhotos()[0].status, "uploading");
});

Deno.test("attach-to-form: resizes, presigns, PUTs, and holds the key without linking", async () => {
  const calls: string[] = [];
  const deps = makeDeps({
    resize: (blob) => {
      calls.push("resize");
      return Promise.resolve(blob);
    },
    getUploadUrl: (_blob) => {
      calls.push("getUploadUrl");
      return Promise.resolve({
        key: "form-key",
        url: "https://r2.example/form-key",
      });
    },
    putToStorage: (_url, _blob) => {
      calls.push("putToStorage");
      return Promise.resolve();
    },
    createItem: () => {
      calls.push("createItem");
      return Promise.resolve({ id: "should-not-be-called" });
    },
    appendPhoto: () => {
      calls.push("appendPhoto");
      return Promise.resolve();
    },
  });
  const session = new CaptureUploadSession({ mode: "attach-to-form" }, deps);
  const { id, done } = session.addPhoto(BLOB);
  await done;

  assertEquals(calls, ["resize", "getUploadUrl", "putToStorage"]);
  const photo = session.getPhotos().find((p) => p.id === id);
  assertExists(photo);
  assertEquals(photo.status, "done");
  assertEquals(photo.key, "form-key");
});

Deno.test("create-from-photo: first photo creates an item, second appends to it", async () => {
  let createCalls = 0;
  let appendCalls = 0;
  let appendedItemId: string | undefined;
  const deps = makeDeps({
    createItem: (photoKey, boxId) => {
      createCalls++;
      assertEquals(photoKey, "key-1");
      assertEquals(boxId, "box-9");
      return Promise.resolve({ id: "new-item" });
    },
    appendPhoto: (itemId, _photoKey) => {
      appendCalls++;
      appendedItemId = itemId;
      return Promise.resolve();
    },
  });
  const session = new CaptureUploadSession(
    { mode: "create-from-photo", boxId: "box-9" },
    deps,
  );

  await session.addPhoto(BLOB).done;
  await session.addPhoto(BLOB).done;

  assertEquals(createCalls, 1);
  assertEquals(appendCalls, 1);
  assertEquals(appendedItemId, "new-item");
  assertEquals(session.getItemId(), "new-item");
  const statuses = session.getPhotos().map((p) => p.status);
  assertEquals(statuses, ["done", "done"]);
  const itemIds = session.getPhotos().map((p) => p.itemId);
  assertEquals(itemIds, ["new-item", "new-item"]);
});

Deno.test("create-from-photo: a second capture started before the create resolves appends to the single created item", async () => {
  const createGate = deferred<{ id: string }>();
  let createCalls = 0;
  let appendCalls = 0;
  let appendedItemId: string | undefined;
  const deps = makeDeps({
    createItem: () => {
      createCalls++;
      return createGate.promise;
    },
    appendPhoto: (itemId, _photoKey) => {
      appendCalls++;
      appendedItemId = itemId;
      return Promise.resolve();
    },
  });
  const session = new CaptureUploadSession({ mode: "create-from-photo" }, deps);

  // Both captures start before the create request resolves.
  const first = session.addPhoto(BLOB);
  const second = session.addPhoto(BLOB);

  createGate.resolve({ id: "racy-item" });
  await Promise.all([first.done, second.done]);

  assertEquals(createCalls, 1);
  assertEquals(appendCalls, 1);
  assertEquals(appendedItemId, "racy-item");
  assertEquals(session.getItemId(), "racy-item");
  const itemIds = session.getPhotos().map((p) => p.itemId);
  assertEquals(itemIds, ["racy-item", "racy-item"]);
});

Deno.test("append-to-existing: every photo appends to the provided item id, never creates", async () => {
  let createCalls = 0;
  let appendCalls = 0;
  const deps = makeDeps({
    createItem: () => {
      createCalls++;
      return Promise.resolve({ id: "nope" });
    },
    appendPhoto: (itemId, photoKey) => {
      appendCalls++;
      assertEquals(itemId, "existing-item");
      assertEquals(photoKey, "key-1");
      return Promise.resolve();
    },
  });
  const session = new CaptureUploadSession(
    { mode: "append-to-existing", itemId: "existing-item" },
    deps,
  );

  const { id, done } = session.addPhoto(BLOB);
  await done;

  assertEquals(createCalls, 0);
  assertEquals(appendCalls, 1);
  const photo = session.getPhotos().find((p) => p.id === id);
  assertEquals(photo?.status, "done");
  assertEquals(photo?.itemId, "existing-item");
});

Deno.test("a failed upload is marked failed and does not throw", async () => {
  const deps = makeDeps({
    putToStorage: () => Promise.reject(new Error("network down")),
  });
  const session = new CaptureUploadSession({ mode: "attach-to-form" }, deps);
  const { id, done } = session.addPhoto(BLOB);
  await done;

  const photo = session.getPhotos().find((p) => p.id === id);
  assertExists(photo);
  assertEquals(photo.status, "failed");
});

Deno.test("retryEntry re-runs the pipeline for a failed photo", async () => {
  let attempt = 0;
  const deps = makeDeps({
    putToStorage: () => {
      attempt++;
      if (attempt === 1) return Promise.reject(new Error("flaky"));
      return Promise.resolve();
    },
  });
  const session = new CaptureUploadSession({ mode: "attach-to-form" }, deps);
  const { id, done } = session.addPhoto(BLOB);
  await done;
  assertEquals(session.getPhotos()[0].status, "failed");

  await session.retryEntry(id);
  assertEquals(session.getPhotos()[0].status, "done");
  assertEquals(attempt, 2);
});

Deno.test("removeEntry in attach-to-form mode drops the key without calling removePhoto", async () => {
  let removeCalls = 0;
  const deps = makeDeps({
    removePhoto: () => {
      removeCalls++;
      return Promise.resolve({ deleted: false });
    },
  });
  const session = new CaptureUploadSession({ mode: "attach-to-form" }, deps);
  const { id, done } = session.addPhoto(BLOB);
  await done;

  await session.removeEntry(id);

  assertEquals(removeCalls, 0);
  assertEquals(session.getPhotos().length, 0);
});

Deno.test("removeEntry in append-to-existing mode unlinks via removePhoto without deleteIfEmpty", async () => {
  let receivedDeleteIfEmpty: boolean | undefined;
  const deps = makeDeps({
    removePhoto: (_itemId, _photoKey, deleteIfEmpty) => {
      receivedDeleteIfEmpty = deleteIfEmpty;
      return Promise.resolve({ deleted: false });
    },
  });
  const session = new CaptureUploadSession(
    { mode: "append-to-existing", itemId: "existing-item" },
    deps,
  );
  const { id, done } = session.addPhoto(BLOB);
  await done;

  await session.removeEntry(id);

  assertEquals(receivedDeleteIfEmpty, false);
  assertEquals(session.getPhotos().length, 0);
});

Deno.test("removeEntry in create-from-photo mode passes deleteIfEmpty:true and resets the session item on deletion", async () => {
  let createCalls = 0;
  const deps = makeDeps({
    createItem: () => {
      createCalls++;
      return Promise.resolve({ id: `item-${createCalls}` });
    },
    removePhoto: (_itemId, _photoKey, deleteIfEmpty) => {
      assertEquals(deleteIfEmpty, true);
      return Promise.resolve({ deleted: true });
    },
  });
  const session = new CaptureUploadSession({ mode: "create-from-photo" }, deps);
  const { id, done } = session.addPhoto(BLOB);
  await done;
  assertEquals(session.getItemId(), "item-1");

  await session.removeEntry(id);

  assertEquals(session.getItemId(), null);

  // A later capture creates a fresh item rather than appending to the deleted one.
  await session.addPhoto(BLOB).done;
  assertEquals(createCalls, 2);
  assertEquals(session.getItemId(), "item-2");
});
