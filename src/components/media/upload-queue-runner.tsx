"use client";

import { useEffect, useRef } from "react";

import { useUploadMedia } from "@/hooks/use-resources";
import { deleteUploadFile, getUploadFile } from "@/lib/upload/upload-queue-db";
import { useUploadQueueStore } from "@/stores/upload-queue-store";

function getUploadErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha no upload";
}

function isRetryableUploadError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("abort") ||
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("cancel")
  );
}

function hasQueuedStoredUpload() {
  return useUploadQueueStore
    .getState()
    .items.some((item) => item.status === "queued" && item.storedFile);
}

export function UploadQueueRunner() {
  const uploadMedia = useUploadMedia();
  const queuedCount = useUploadQueueStore(
    (state) =>
      state.items.filter((item) => item.status === "queued" && item.storedFile)
        .length,
  );
  const markQueued = useUploadQueueStore((state) => state.markQueued);
  const markUploading = useUploadQueueStore((state) => state.markUploading);
  const markDone = useUploadQueueStore((state) => state.markDone);
  const markError = useUploadQueueStore((state) => state.markError);
  const resetInterruptedUploads = useUploadQueueStore(
    (state) => state.resetInterruptedUploads,
  );
  const runningRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    resetInterruptedUploads();
  }, [resetInterruptedUploads]);

  useEffect(() => {
    if (!queuedCount || runningRef.current) return;

    const run = async () => {
      runningRef.current = true;

      try {
        while (mountedRef.current) {
          const nextQueuedItem = useUploadQueueStore
            .getState()
            .items.find((item) => item.status === "queued" && item.storedFile);

          if (!nextQueuedItem) break;

          markUploading(nextQueuedItem.id);

          try {
            const file = await getUploadFile(nextQueuedItem.id);

            if (!file) {
              markError(
                nextQueuedItem.id,
                "Arquivo local nao encontrado. Remova e selecione novamente.",
              );
              continue;
            }

            const result = await uploadMedia.mutateAsync({
              file,
              seriesId: nextQueuedItem.seriesId ?? undefined,
            });

            await deleteUploadFile(nextQueuedItem.id);
            markDone(nextQueuedItem.id, result.mediaAssetId);
          } catch (error) {
            const message = getUploadErrorMessage(error);

            if (isRetryableUploadError(message)) {
              markQueued(nextQueuedItem.id);
              break;
            }

            markError(nextQueuedItem.id, message);
          }
        }
      } finally {
        runningRef.current = false;

        if (
          mountedRef.current &&
          document.visibilityState !== "hidden" &&
          hasQueuedStoredUpload()
        ) {
          window.setTimeout(() => {
            if (!runningRef.current && mountedRef.current) {
              void run();
            }
          }, 750);
        }
      }
    };

    void run();
  }, [
    markDone,
    markError,
    markQueued,
    markUploading,
    queuedCount,
    uploadMedia,
  ]);

  return null;
}
