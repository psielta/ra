import { z } from "zod";

export const MEDIA_AUDIO_MIME = "audio/mpeg" as const;
export const MEDIA_VIDEO_MIME = "video/mp4" as const;

export const MEDIA_AUDIO_MAX_BYTES = 50 * 1024 * 1024;
export const MEDIA_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export const mediaUploadMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .max(120, "Título deve ter no máximo 120 caracteres")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  seriesId: z
    .string()
    .cuid("Série inválida")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
  description: z
    .string()
    .trim()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type MediaUploadMetadataInput = z.infer<
  typeof mediaUploadMetadataSchema
>;

export type MediaFileKind = "audio" | "video";

const mediaMimeConfig = {
  [MEDIA_AUDIO_MIME]: {
    kind: "audio" as const,
    extension: "mp3",
    maxBytes: MEDIA_AUDIO_MAX_BYTES,
    label: "MP3",
  },
  [MEDIA_VIDEO_MIME]: {
    kind: "video" as const,
    extension: "mp4",
    maxBytes: MEDIA_VIDEO_MAX_BYTES,
    label: "MP4",
  },
} as const;

export function resolveMediaMime(mimeType: string) {
  return mediaMimeConfig[mimeType as keyof typeof mediaMimeConfig] ?? null;
}

export function validateMediaFile(file: File) {
  const config = resolveMediaMime(file.type);

  if (!config) {
    return {
      ok: false as const,
      message: "Envie um arquivo MP3 (audio/mpeg) ou MP4 (video/mp4).",
    };
  }

  if (file.size === 0) {
    return {
      ok: false as const,
      message: "O arquivo está vazio.",
    };
  }

  if (file.size > config.maxBytes) {
    const maxMb = Math.round(config.maxBytes / (1024 * 1024));
    return {
      ok: false as const,
      message: `${config.label} deve ter no máximo ${maxMb} MB.`,
    };
  }

  return {
    ok: true as const,
    kind: config.kind,
    extension: config.extension,
    mimeType: file.type,
  };
}

export function mediaObjectKey(
  userId: string,
  jobId: string,
  extension: "mp3" | "mp4",
) {
  return `uploads/${userId}/${jobId}/source.${extension}`;
}

export const mediaUploadResponseSchema = z.object({
  jobId: z.string(),
  mediaAssetId: z.string(),
  status: z.literal("processing"),
  mediaType: z.enum(["audio", "video"]),
  title: z.string().nullable(),
  storageKey: z.string(),
});

export type MediaUploadResponse = z.infer<typeof mediaUploadResponseSchema>;

export function toMediaUploadResponse(input: {
  jobId: string;
  mediaAssetId: string;
  mediaType: MediaFileKind;
  title: string | null;
  storageKey: string;
}): MediaUploadResponse {
  return {
    jobId: input.jobId,
    mediaAssetId: input.mediaAssetId,
    status: "processing",
    mediaType: input.mediaType,
    title: input.title,
    storageKey: input.storageKey,
  };
}
