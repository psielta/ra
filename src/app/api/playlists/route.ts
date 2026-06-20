import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { toPlaylistDto, toPlaylistListDto } from "@/lib/media/playlist-mapper";
import { resolveUniquePlaylistSlug } from "@/lib/media/playlists";
import { resourceAssetInclude } from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import {
  createPlaylistSchema,
  PLAYLIST_PREVIEW_LIMIT,
} from "@/lib/validations/playlists";

const playlistLogger = createRequestLogger({ module: "playlists" });

export async function GET() {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;

  const playlists = await prisma.playlist.findMany({
    where: { userId },
    orderBy: [{ isFavorites: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { items: true } },
      items: {
        orderBy: { position: "asc" },
        take: PLAYLIST_PREVIEW_LIMIT,
        include: {
          mediaAsset: { include: resourceAssetInclude },
        },
      },
    },
  });

  return NextResponse.json(playlists.map(toPlaylistListDto));
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = playlistLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;

  try {
    const body = await request.json();
    const parsed = createPlaylistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const slug = await resolveUniquePlaylistSlug(userId, parsed.data.title);

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
      },
      include: { _count: { select: { items: true } } },
    });

    log.info({ event: "playlists.created", userId, playlistId: playlist.id });

    return NextResponse.json(toPlaylistDto(playlist), { status: 201 });
  } catch (error) {
    log.error({
      event: "playlists.create_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
