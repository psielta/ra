import {
  cancelAndFailProcessingJobs,
  collectProcessingJobIds,
  collectResourceStorageKeys,
  deleteStorageKeys,
} from "@/lib/media/delete-helpers";
import { prisma } from "@/lib/prisma";

export async function deleteMediaResource(userId: string, resourceId: string) {
  const resource = await prisma.mediaAsset.findFirst({
    where: { id: resourceId, userId },
    include: {
      jobs: {
        select: { id: true, status: true, storageKey: true },
      },
    },
  });

  if (!resource) {
    return null;
  }

  const processingJobIds = collectProcessingJobIds([resource]);
  const cancelledJobCount = await cancelAndFailProcessingJobs(
    processingJobIds,
    "Cancelado: recurso excluído",
  );
  const storageKeys = collectResourceStorageKeys(resource);

  await deleteStorageKeys(storageKeys);

  await prisma.mediaAsset.delete({
    where: { id: resourceId },
  });

  return {
    resourceId,
    seriesId: resource.seriesId,
    deletedStorageKeys: storageKeys.length,
    cancelledJobCount,
    processingJobCount: processingJobIds.length,
  };
}
