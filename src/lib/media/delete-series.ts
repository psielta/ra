import { prisma } from "@/lib/prisma";

import { purgeResources } from "@/lib/media/delete-helpers";

export {
  collectProcessingJobIds,
  collectResourcesStorageKeys,
  collectSeriesStorageKeys,
} from "@/lib/media/delete-helpers";

export async function deleteSeriesWithResources(
  userId: string,
  seriesId: string,
) {
  const series = await prisma.series.findFirst({
    where: { id: seriesId, userId },
    include: {
      resources: {
        include: {
          jobs: {
            select: { id: true, status: true, storageKey: true },
          },
        },
      },
    },
  });

  if (!series) {
    return null;
  }

  const purgeResult = await purgeResources(
    series.resources,
    "Cancelado: série excluída",
  );

  await prisma.series.delete({
    where: { id: seriesId },
  });

  return {
    seriesId,
    deletedResourceCount: series.resources.length,
    ...purgeResult,
  };
}
