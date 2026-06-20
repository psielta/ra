import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  addPlaylistItemsSchema,
  reorderPlaylistItemsSchema,
} from "@/lib/validations/playlists";

const playlistItemsLogger = createRequestLogger({ module: "playlist.items" });

type RouteContext = { params: Promise<{ id: string }> };

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

export async function POST(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = playlistItemsLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = addPlaylistItemsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

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

    const resourceIds = uniqueIds(parsed.data.resourceIds);
    const ownedResources = await prisma.mediaAsset.findMany({
      where: { userId, id: { in: resourceIds } },
      select: { id: true },
    });
    const ownedResourceIds = new Set(ownedResources.map((item) => item.id));

    if (ownedResourceIds.size !== resourceIds.length) {
      return NextResponse.json(
        { message: "Um ou mais recursos nao pertencem ao usuario." },
        { status: 400 },
      );
    }

    const existingItems = await prisma.playlistItem.findMany({
      where: { playlistId: id, mediaAssetId: { in: resourceIds } },
      select: { mediaAssetId: true },
    });
    const existingIds = new Set(existingItems.map((item) => item.mediaAssetId));
    const idsToAdd = resourceIds.filter(
      (resourceId) => !existingIds.has(resourceId),
    );

    const maxPosition = await prisma.playlistItem.aggregate({
      where: { playlistId: id },
      _max: { position: true },
    });
    const startPosition = maxPosition._max.position ?? -1;

    if (idsToAdd.length > 0) {
      await prisma.playlistItem.createMany({
        data: idsToAdd.map((resourceId, index) => ({
          playlistId: id,
          mediaAssetId: resourceId,
          position: startPosition + index + 1,
        })),
        skipDuplicates: true,
      });
    }

    const itemCount = await prisma.playlistItem.count({
      where: { playlistId: id },
    });

    log.info({
      event: "playlist.items_added",
      userId,
      playlistId: id,
      requestedCount: resourceIds.length,
      addedCount: idsToAdd.length,
    });

    return NextResponse.json({
      addedCount: idsToAdd.length,
      skippedCount: resourceIds.length - idsToAdd.length,
      itemCount,
    });
  } catch (error) {
    log.error({
      event: "playlist.items_add_error",
      userId,
      playlistId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = playlistItemsLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = reorderPlaylistItemsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

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

    const resourceIds = parsed.data.resourceIds;
    const uniqueResourceIds = uniqueIds(resourceIds);

    if (uniqueResourceIds.length !== resourceIds.length) {
      return NextResponse.json(
        { message: "A ordem nao pode conter recursos duplicados." },
        { status: 400 },
      );
    }

    const currentItems = await prisma.playlistItem.findMany({
      where: { playlistId: id },
      select: { mediaAssetId: true },
      orderBy: { position: "asc" },
    });
    const currentIds = new Set(currentItems.map((item) => item.mediaAssetId));
    const hasSameItems =
      currentIds.size === resourceIds.length &&
      resourceIds.every((resourceId) => currentIds.has(resourceId));

    if (!hasSameItems) {
      return NextResponse.json(
        { message: "A ordem deve conter todos os itens atuais da playlist." },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      resourceIds.map((resourceId, position) =>
        prisma.playlistItem.update({
          where: {
            playlistId_mediaAssetId: {
              playlistId: id,
              mediaAssetId: resourceId,
            },
          },
          data: { position },
        }),
      ),
    );

    log.info({
      event: "playlist.items_reordered",
      userId,
      playlistId: id,
      itemCount: resourceIds.length,
    });

    return NextResponse.json({ count: resourceIds.length });
  } catch (error) {
    log.error({
      event: "playlist.items_reorder_error",
      userId,
      playlistId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
