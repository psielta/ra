import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type UploadQueueStatus = "queued" | "uploading" | "done" | "error";

export type UploadQueueItem = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  seriesId: string | null;
  status: UploadQueueStatus;
  progress: number;
  error: string | null;
  mediaAssetId: string | null;
  storedFile: boolean;
  createdAt: string;
  updatedAt: string;
};

type UploadQueueStore = {
  items: UploadQueueItem[];
  addItems: (items: UploadQueueItem[]) => void;
  markQueued: (id: string) => void;
  markUploading: (id: string) => void;
  setUploadProgress: (id: string, progress: number) => void;
  markDone: (id: string, mediaAssetId: string) => void;
  markError: (id: string, error: string) => void;
  removeItem: (id: string) => void;
  clearFinished: () => void;
  resetInterruptedUploads: () => void;
};

function nowIso() {
  return new Date().toISOString();
}

function createUploadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function patchItem(
  items: UploadQueueItem[],
  id: string,
  patch: Partial<UploadQueueItem>,
) {
  return items.map((item) =>
    item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
  );
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function createQueuedUploadItem(input: {
  file: File;
  seriesId?: string | null;
}) {
  const timestamp = nowIso();

  return {
    id: createUploadId(),
    fileName: input.file.name,
    fileSize: input.file.size,
    fileType: input.file.type,
    seriesId: input.seriesId ?? null,
    status: "queued",
    progress: 0,
    error: null,
    mediaAssetId: null,
    storedFile: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies UploadQueueItem;
}

export function createRejectedUploadItem(input: {
  file: File;
  error: string;
  seriesId?: string | null;
}) {
  const timestamp = nowIso();

  return {
    id: createUploadId(),
    fileName: input.file.name,
    fileSize: input.file.size,
    fileType: input.file.type,
    seriesId: input.seriesId ?? null,
    status: "error",
    progress: 0,
    error: input.error,
    mediaAssetId: null,
    storedFile: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies UploadQueueItem;
}

export const useUploadQueueStore = create<UploadQueueStore>()(
  persist(
    (set) => ({
      items: [],
      addItems: (items) =>
        set((state) => ({ items: [...state.items, ...items] })),
      markQueued: (id) =>
        set((state) => ({
          items: patchItem(state.items, id, {
            status: "queued",
            progress: 0,
            error: null,
          }),
        })),
      markUploading: (id) =>
        set((state) => ({
          items: patchItem(state.items, id, {
            status: "uploading",
            progress: 0,
            error: null,
          }),
        })),
      setUploadProgress: (id, progress) =>
        set((state) => ({
          items: patchItem(state.items, id, {
            progress: clampProgress(progress),
          }),
        })),
      markDone: (id, mediaAssetId) =>
        set((state) => ({
          items: patchItem(state.items, id, {
            status: "done",
            progress: 100,
            mediaAssetId,
            error: null,
            storedFile: false,
          }),
        })),
      markError: (id, error) =>
        set((state) => ({
          items: patchItem(state.items, id, {
            status: "error",
            progress: 0,
            error,
          }),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearFinished: () =>
        set((state) => ({
          items: state.items.filter(
            (item) => item.status !== "done" && item.status !== "error",
          ),
        })),
      resetInterruptedUploads: () =>
        set((state) => ({
          items: state.items.map((item) =>
            item.status === "uploading"
              ? {
                  ...item,
                  status: "queued",
                  progress: 0,
                  updatedAt: nowIso(),
                }
              : item,
          ),
        })),
    }),
    {
      name: "ra-upload-queue",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items
          .filter((item) => item.status !== "done")
          .map((item) =>
            item.status === "uploading"
              ? { ...item, status: "queued" as const, progress: 0 }
              : item,
          ),
      }),
    },
  ),
);
