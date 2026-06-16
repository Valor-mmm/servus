export type CaptureMode =
  | "create-from-photo"
  | "attach-to-form"
  | "append-to-existing";

export type PhotoStatus = "uploading" | "done" | "failed";

export interface CapturedPhoto {
  id: string;
  status: PhotoStatus;
  key?: string;
  itemId?: string;
  error?: unknown;
}

export interface CaptureUploadDeps {
  resize(blob: Blob): Promise<Blob>;
  getUploadUrl(blob: Blob): Promise<{ key: string; url: string }>;
  putToStorage(url: string, blob: Blob): Promise<void>;
  createItem(
    photoKey: string,
    boxId: string | null,
  ): Promise<{ id: string }>;
  appendPhoto(itemId: string, photoKey: string): Promise<void>;
  removePhoto(
    itemId: string,
    photoKey: string,
    deleteIfEmpty: boolean,
  ): Promise<{ deleted: boolean }>;
}

export interface CaptureSessionOptions {
  mode: CaptureMode;
  boxId?: string | null;
  itemId?: string | null;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Orchestrates resize -> presign -> PUT -> link for one capture session.
 * Pure (no DOM/network of its own; all I/O is injected via `deps`) so it can
 * be unit-tested and reused unchanged by the capture island.
 */
export class CaptureUploadSession {
  readonly mode: CaptureMode;
  private boxId: string | null;
  private itemId: string | null;
  private createDeferred: Deferred<string> | null = null;
  private blobs = new Map<string, Blob>();
  private photos: CapturedPhoto[] = [];
  private deps: CaptureUploadDeps;
  private onChange: (photos: CapturedPhoto[]) => void;

  constructor(
    options: CaptureSessionOptions,
    deps: CaptureUploadDeps,
    onChange: (photos: CapturedPhoto[]) => void = () => {},
  ) {
    this.mode = options.mode;
    this.boxId = options.boxId ?? null;
    this.itemId = options.itemId ?? null;
    this.deps = deps;
    this.onChange = onChange;
  }

  getPhotos(): CapturedPhoto[] {
    return this.photos.map((p) => ({ ...p }));
  }

  getItemId(): string | null {
    return this.itemId;
  }

  addPhoto(blob: Blob): { id: string; done: Promise<void> } {
    const id = crypto.randomUUID();
    this.blobs.set(id, blob);
    this.photos.push({ id, status: "uploading" });
    this.emit();
    const done = this.beginUpload(id, blob);
    return { id, done };
  }

  retryEntry(id: string): Promise<void> {
    const entry = this.photos.find((p) => p.id === id);
    const blob = this.blobs.get(id);
    if (!entry || entry.status !== "failed" || !blob) {
      return Promise.resolve();
    }
    entry.status = "uploading";
    entry.error = undefined;
    this.emit();
    return this.beginUpload(id, blob);
  }

  async removeEntry(id: string): Promise<void> {
    const idx = this.photos.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const entry = this.photos[idx];

    if (
      this.mode !== "attach-to-form" && entry.status === "done" &&
      entry.key && entry.itemId
    ) {
      const deleteIfEmpty = this.mode === "create-from-photo";
      const result = await this.deps.removePhoto(
        entry.itemId,
        entry.key,
        deleteIfEmpty,
      );
      if (result.deleted) {
        this.itemId = null;
        this.createDeferred = null;
      }
    }

    this.photos.splice(idx, 1);
    this.blobs.delete(id);
    this.emit();
  }

  private beginUpload(id: string, blob: Blob): Promise<void> {
    let claimedCreate: Deferred<string> | null = null;
    if (
      this.mode === "create-from-photo" && this.itemId === null &&
      this.createDeferred === null
    ) {
      claimedCreate = createDeferred<string>();
      this.createDeferred = claimedCreate;
    }
    return this.run(id, blob, claimedCreate);
  }

  private async run(
    id: string,
    blob: Blob,
    claimedCreate: Deferred<string> | null,
  ): Promise<void> {
    const entry = this.photos.find((p) => p.id === id)!;
    try {
      const resized = await this.deps.resize(blob);
      const { key, url } = await this.deps.getUploadUrl(resized);
      await this.deps.putToStorage(url, resized);
      entry.key = key;
      this.emit();

      const itemId = await this.link(key, claimedCreate);
      entry.itemId = itemId;
      entry.status = "done";
      this.emit();
    } catch (err) {
      entry.status = "failed";
      entry.error = err;
      this.emit();
    }
  }

  /** Resolves the item a photo's key should be (or was) linked to, per mode. */
  private async link(
    key: string,
    claimedCreate: Deferred<string> | null,
  ): Promise<string | undefined> {
    if (this.mode === "attach-to-form") {
      return undefined;
    }

    if (this.mode === "append-to-existing") {
      await this.deps.appendPhoto(this.itemId!, key);
      return this.itemId!;
    }

    // create-from-photo
    if (claimedCreate) {
      try {
        const item = await this.deps.createItem(key, this.boxId);
        this.itemId = item.id;
        claimedCreate.resolve(item.id);
        return item.id;
      } catch (err) {
        if (this.createDeferred === claimedCreate) this.createDeferred = null;
        claimedCreate.reject(err);
        throw err;
      }
    }

    if (this.itemId !== null) {
      await this.deps.appendPhoto(this.itemId, key);
      return this.itemId;
    }

    if (this.createDeferred) {
      const itemId = await this.createDeferred.promise;
      await this.deps.appendPhoto(itemId, key);
      return itemId;
    }

    // No creator in flight (it failed and reset the claim) — become it.
    const item = await this.deps.createItem(key, this.boxId);
    this.itemId = item.id;
    return item.id;
  }

  private emit(): void {
    this.onChange(this.getPhotos());
  }
}
