import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const playlistItemsLogger = createRequestLogger({ module: "playlist.items" });

type RouteContext = { params: Promise<{ id: string; resourceId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = playlistItemsLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id, resourceId } = await context.params;

  try {
    const playlist = await prisma.playlist.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!playlist) {
      return NextResponse.json(
        { message: "Playlist nao encontrada" },
        { status: 404 },
      );
    }

    const deleted = await prisma.playlistItem.deleteMany({
      where: { playlistId: id, mediaAssetId: resourceId },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { message: "Item nao encontrado na playlist" },
        { status: 404 },
      );
    }

    const remaining = await prisma.playlistItem.findMany({
      where: { playlistId: id },
      select: { mediaAssetId: true },
      orderBy: { position: "asc" },
    });

    if (remaining.length > 0) {
      await prisma.$transaction(
        remaining.map((item, position) =>
          prisma.playlistItem.update({
            where: {
              playlistId_mediaAssetId: {
                playlistId: id,
                mediaAssetId: item.mediaAssetId,
              },
            },
            data: { position },
          }),
        ),
      );
    }

    log.info({
      event: "playlist.item_removed",
      userId,
      playlistId: id,
      mediaAssetId: resourceId,
    });

    return NextResponse.json({ message: "Item removido da playlist." });
  } catch (error) {
    log.error({
      event: "playlist.item_remove_error",
      userId,
      playlistId: id,
      mediaAssetId: resourceId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
