import {
  deleteMinioObject,
  extractObjectKeyFromUrl,
  putMinioObject,
} from "@/lib/storage/minio";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const avatarMimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function avatarObjectKey(userId: string, mimeType: string) {
  const extension = avatarMimeToExtension[mimeType];

  if (!extension) {
    throw new Error("Formato de imagem não suportado");
  }

  return `avatars/${userId}/profile.${extension}`;
}

export function validateAvatarFile(file: File) {
  if (!avatarMimeToExtension[file.type]) {
    return {
      ok: false as const,
      message: "Use uma imagem JPEG, PNG ou WebP.",
    };
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return {
      ok: false as const,
      message: "A imagem deve ter no máximo 2 MB.",
    };
  }

  return { ok: true as const };
}

export async function uploadUserAvatar(
  userId: string,
  file: File,
  currentImageUrl?: string | null,
) {
  const validation = validateAvatarFile(file);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectKey = avatarObjectKey(userId, file.type);
  const publicUrl = await putMinioObject(objectKey, buffer, file.type);

  const previousKey = extractObjectKeyFromUrl(currentImageUrl);

  if (previousKey && previousKey !== objectKey) {
    await deleteMinioObject(previousKey).catch(() => undefined);
  }

  return publicUrl;
}

export async function deleteUserAvatar(currentImageUrl?: string | null) {
  const objectKey = extractObjectKeyFromUrl(currentImageUrl);

  if (!objectKey) {
    return;
  }

  await deleteMinioObject(objectKey);
}
