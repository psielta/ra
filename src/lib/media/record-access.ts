import { prisma } from "@/lib/prisma";

export async function recordMediaAccess(userId: string, mediaAssetId: string) {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: mediaAssetId, userId },
    select: { id: true },
  });

  if (!asset) {
    return false;
  }

  await prisma.mediaAccess.upsert({
    where: {
      userId_mediaAssetId: { userId, mediaAssetId },
    },
    create: { userId, mediaAssetId },
    update: { accessedAt: new Date() },
  });

  return true;
}
