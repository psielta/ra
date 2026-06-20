import type { MediaAsset, Series, TranscodeJob } from "@prisma/client";

import type { QueueJobDto } from "@/lib/validations/queue";

type QueueJobWithAsset = TranscodeJob & {
  mediaAsset: MediaAsset & {
    series: Pick<Series, "id" | "title" | "slug"> | null;
  };
};

function toMediaTypeKind(type: MediaAsset["mediaType"]): "audio" | "video" {
  return type === "AUDIO" ? "audio" : "video";
}

export function toQueueJobDto(job: QueueJobWithAsset): QueueJobDto {
  return {
    jobId: job.id,
    mediaAssetId: job.mediaAssetId,
    title: job.mediaAsset.title,
    mediaType: toMediaTypeKind(job.mediaAsset.mediaType),
    progress: job.progress,
    series: job.mediaAsset.series,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
