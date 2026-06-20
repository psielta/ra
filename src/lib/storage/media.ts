import { deleteMinioObject, putMinioObject } from "@/lib/storage/minio";
import {
  mediaObjectKey,
  validateMediaFile,
  type MediaFileKind,
} from "@/lib/validations/media";

export async function uploadMediaSource(input: {
  userId: string;
  jobId: string;
  file: File;
}) {
  const validation = validateMediaFile(input.file);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const storageKey = mediaObjectKey(
    input.userId,
    input.jobId,
    validation.extension,
  );
  const buffer = Buffer.from(await input.file.arrayBuffer());

  await putMinioObject(storageKey, buffer, validation.mimeType);

  return {
    storageKey,
    mediaType: validation.kind as MediaFileKind,
    mimeType: validation.mimeType,
  };
}

export async function deleteMediaSource(storageKey: string) {
  await deleteMinioObject(storageKey).catch(() => undefined);
}
