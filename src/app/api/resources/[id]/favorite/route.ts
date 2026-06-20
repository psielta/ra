import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import {
  ensureFavoritesPlaylist,
  findFavoritesPlaylist,
} from "@/lib/media/playlists";
import {
  resourceAssetInclude,
  toResourceDto,
} from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";

const favoriteLogger = createRequestLogger({ module: "resources.favorite" });

type RouteContext = { params: Promise<{ id: string }> };

async function findOwnedResource(userId: string, resourceId: string) {
  return prisma.mediaAsset.findFirst({
    where: { id: resourceId, userId },
    select: { id: true },
  });
}

async function findResourceDto(userId: string, resourceId: string) {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: resourceId, userId },
    include: resourceAssetInclude,
  });

  return asset ? toResourceDto(asset) : null;
}

export async function PUT(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = favoriteLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const resource = await findOwnedResource(userId, id);

    if (!resource) {
      return NextResponse.json(
        { message: "Recurso nao encontrado" },
        { status: 404 },
      );
    }

    const playlist = await ensureFavoritesPlaylist(userId);
    const maxPosition = await prisma.playlistItem.aggregate({
      where: { playlistId: playlist.id },
      _max: { position: true },
    });

    await prisma.playlistItem.createMany({
      data: [
        {
          playlistId: playlist.id,
          mediaAssetId: id,
          position: (maxPosition._max.position ?? -1) + 1,
        },
      ],
      skipDuplicates: true,
    });

    const dto = await findResourceDto(userId, id);
    if (!dto) {
      return NextResponse.json(
        { message: "Recurso nao encontrado" },
        { status: 404 },
      );
    }

    log.info({
      event: "resources.favorite_added",
      userId,
      resourceId: id,
      playlistId: playlist.id,
    });

    return NextResponse.json(dto);
  } catch (error) {
    log.error({
      event: "resources.favorite_add_error",
      userId,
      resourceId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = favoriteLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const resource = await findOwnedResource(userId, id);

    if (!resource) {
      return NextResponse.json(
        { message: "Recurso nao encontrado" },
        { status: 404 },
      );
    }

    const playlist = await findFavoritesPlaylist(userId);

    if (playlist) {
      await prisma.playlistItem.deleteMany({
        where: { playlistId: playlist.id, mediaAssetId: id },
      });
    }

    const dto = await findResourceDto(userId, id);
    if (!dto) {
      return NextResponse.json(
        { message: "Recurso nao encontrado" },
        { status: 404 },
      );
    }

    log.info({
      event: "resources.favorite_removed",
      userId,
      resourceId: id,
      playlistId: playlist?.id ?? null,
    });

    return NextResponse.json(dto);
  } catch (error) {
    log.error({
      event: "resources.favorite_remove_error",
      userId,
      resourceId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
