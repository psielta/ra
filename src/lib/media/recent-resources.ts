import { toResourceDto } from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import type { RecentResourceDto } from "@/lib/validations/dashboard";

export const RECENT_RESOURCES_DEFAULT_LIMIT = 12;

export async function getRecentResources(
  userId: string,
  limit = RECENT_RESOURCES_DEFAULT_LIMIT,
): Promise<RecentResourceDto[]> {
  const accesses = await prisma.mediaAccess.findMany({
    where: { userId },
    orderBy: { accessedAt: "desc" },
    take: limit,
    include: {
      mediaAsset: {
        include: {
          series: { select: { id: true, title: true, slug: true } },
          jobs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              progress: true,
              errorMessage: true,
            },
          },
        },
      },
    },
  });

  return accesses.map((access) => ({
    ...toResourceDto(access.mediaAsset),
    accessedAt: access.accessedAt.toISOString(),
  }));
}
