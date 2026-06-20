export type QueueJobDto = {
  jobId: string;
  mediaAssetId: string;
  title: string | null;
  mediaType: "audio" | "video";
  progress: number;
  series: { id: string; title: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
};
