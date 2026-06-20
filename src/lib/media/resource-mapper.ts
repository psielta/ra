import type { MediaAsset, Prisma, Series } from "@prisma/client";

import type {
  ResourceDto,
  ResourceStatus,
  SeriesDto,
  SeriesListDto,
} from "@/lib/validations/series";

export const resourceAssetInclude = {
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
  playlistItems: {
    where: { playlist: { isFavorites: true } },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.MediaAssetInclude;

export type AssetWithRelations = Prisma.MediaAssetGetPayload<{
  include: typeof resourceAssetInclude;
}>;

function toResourceStatus(
  status: AssetWithRelations["jobs"][number]["status"] | undefined,
): ResourceStatus {
  switch (status) {
    case "READY":
      return "ready";
    case "ERROR":
      return "error";
    default:
      return "processing";
  }
}

function toMediaTypeKind(type: MediaAsset["mediaType"]): "audio" | "video" {
  return type === "AUDIO" ? "audio" : "video";
}

export function toResourceDto(asset: AssetWithRelations): ResourceDto {
  const latestJob = asset.jobs[0];

  return {
    id: asset.id,
    title: asset.title,
    description: asset.description,
    mediaType: toMediaTypeKind(asset.mediaType),
    mimeType: asset.mimeType,
    status: toResourceStatus(latestJob?.status),
    progress: latestJob?.progress ?? 0,
    playbackUrl: asset.playbackUrl,
    coverUrl: asset.coverUrl,
    jobId: latestJob?.id ?? null,
    errorMessage: latestJob?.errorMessage ?? null,
    series: asset.series,
    isFavorite: asset.playlistItems.length > 0,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export function toSeriesDto(
  series: Series & { _count?: { resources: number } },
  resourceCount?: number,
): SeriesDto {
  return {
    id: series.id,
    title: series.title,
    slug: series.slug,
    description: series.description,
    resourceCount: resourceCount ?? series._count?.resources ?? 0,
    createdAt: series.createdAt.toISOString(),
    updatedAt: series.updatedAt.toISOString(),
  };
}

export function toSeriesListDto(
  series: Series & {
    _count?: { resources: number };
    resources: AssetWithRelations[];
  },
): SeriesListDto {
  return {
    ...toSeriesDto(series),
    resources: series.resources.map(toResourceDto),
  };
}
