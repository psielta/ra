import { TranscodeJobStatus } from "@prisma/client";

import { cancelQueuedTranscodeJobsSafely } from "@/lib/queue/cancel-transcode-jobs";
import { deleteMediaSource } from "@/lib/storage/media";
import { prisma } from "@/lib/prisma";

type ResourceWithJobs = {
  originalKey: string;
  jobs: Array<{ id: string; status: TranscodeJobStatus; storageKey: string }>;
};

export function collectResourceStorageKeys(resource: {
  originalKey: string;
  jobs: Array<{ storageKey: string }>;
}) {
  const keys = new Set<string>();

  if (resource.originalKey && resource.originalKey !== "pending") {
    keys.add(resource.originalKey);
  }

  for (const job of resource.jobs) {
    if (job.storageKey && job.storageKey !== "pending") {
      keys.add(job.storageKey);
    }
  }

  return [...keys];
}

export function collectResourcesStorageKeys(
  resources: Array<{
    originalKey: string;
    jobs: Array<{ storageKey: string }>;
  }>,
) {
  const keys = new Set<string>();

  for (const resource of resources) {
    for (const key of collectResourceStorageKeys(resource)) {
      keys.add(key);
    }
  }

  return [...keys];
}

/** @deprecated Use collectResourcesStorageKeys */
export const collectSeriesStorageKeys = collectResourcesStorageKeys;

export function collectProcessingJobIds(
  resources: Array<{
    jobs: Array<{ id: string; status: TranscodeJobStatus }>;
  }>,
) {
  const jobIds = new Set<string>();

  for (const resource of resources) {
    for (const job of resource.jobs) {
      if (job.status === TranscodeJobStatus.PROCESSING) {
        jobIds.add(job.id);
      }
    }
  }

  return [...jobIds];
}

export async function cancelAndFailProcessingJobs(
  jobIds: string[],
  errorMessage: string,
) {
  const cancelledJobCount = await cancelQueuedTranscodeJobsSafely(jobIds);

  if (jobIds.length > 0) {
    await prisma.transcodeJob.updateMany({
      where: {
        id: { in: jobIds },
        status: TranscodeJobStatus.PROCESSING,
      },
      data: {
        status: TranscodeJobStatus.ERROR,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  return cancelledJobCount;
}

export async function deleteStorageKeys(keys: string[]) {
  await Promise.all(keys.map((key) => deleteMediaSource(key)));
}

export async function purgeResources(
  resources: ResourceWithJobs[],
  cancelMessage: string,
) {
  const processingJobIds = collectProcessingJobIds(resources);
  const cancelledJobCount = await cancelAndFailProcessingJobs(
    processingJobIds,
    cancelMessage,
  );
  const storageKeys = collectResourcesStorageKeys(resources);

  await deleteStorageKeys(storageKeys);

  return {
    cancelledJobCount,
    processingJobCount: processingJobIds.length,
    deletedStorageKeys: storageKeys.length,
  };
}
