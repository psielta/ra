import { describe, expect, it, beforeEach } from "vitest";

import {
  createQueuedUploadItem,
  useUploadQueueStore,
} from "@/stores/upload-queue-store";

function createFile(name: string) {
  return new File(["content"], name, { type: "audio/mpeg" });
}

describe("useUploadQueueStore", () => {
  beforeEach(() => {
    useUploadQueueStore.setState({ items: [] });
  });

  it("mantem itens em fila e reseta uploads interrompidos", () => {
    const item = createQueuedUploadItem({ file: createFile("track.mp3") });

    useUploadQueueStore.getState().addItems([item]);
    useUploadQueueStore.getState().markUploading(item.id);

    expect(useUploadQueueStore.getState().items[0]).toMatchObject({
      id: item.id,
      status: "uploading",
      progress: 10,
    });

    useUploadQueueStore.getState().resetInterruptedUploads();

    expect(useUploadQueueStore.getState().items[0]).toMatchObject({
      id: item.id,
      status: "queued",
      progress: 0,
    });
  });

  it("recoloca erro retryable na fila", () => {
    const item = createQueuedUploadItem({ file: createFile("retry.mp3") });

    useUploadQueueStore.getState().addItems([item]);
    useUploadQueueStore.getState().markUploading(item.id);
    useUploadQueueStore.getState().markQueued(item.id);

    expect(useUploadQueueStore.getState().items[0]).toMatchObject({
      id: item.id,
      status: "queued",
      progress: 0,
      error: null,
    });
  });

  it("remove finalizados sem apagar uploads pendentes", () => {
    const first = createQueuedUploadItem({ file: createFile("first.mp3") });
    const second = createQueuedUploadItem({ file: createFile("second.mp3") });

    useUploadQueueStore.getState().addItems([first, second]);
    useUploadQueueStore.getState().markDone(first.id, "media-1");
    useUploadQueueStore.getState().clearFinished();

    expect(useUploadQueueStore.getState().items).toHaveLength(1);
    expect(useUploadQueueStore.getState().items[0]?.id).toBe(second.id);
  });
});
