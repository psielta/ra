import type { MediaAsset, Series, TranscodeJob } from "@prisma/client";

import type {
  ResourceDto,
  ResourceStatus,
  SeriesDto,
  SeriesListDto,
} from "@/lib/validations/series";

type AssetWithRelations = MediaAsset & {
  series: Pick<Series, "id" | "title" | "slug"> | null;
  jobs: Pick<TranscodeJob, "id" | "status" | "progress" | "errorMessage">[];
};

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
