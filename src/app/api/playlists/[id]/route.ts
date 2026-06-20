import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import {
  toPlaylistDetailDto,
  toPlaylistDto,
} from "@/lib/media/playlist-mapper";
import { prisma } from "@/lib/prisma";
import { updatePlaylistSchema } from "@/lib/validations/playlists";

const playlistLogger = createRequestLogger({ module: "playlists" });

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  const playlist = await prisma.playlist.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { items: true } },
      items: {
        orderBy: { position: "asc" },
        include: {
          mediaAsset: {
            include: {
              series: { select: { id: true, title: true, slug: true } },
              jobs: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  progress: true,
                  errorMessage: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!playlist) {
    return NextResponse.json(
      { message: "Playlist nao encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json(toPlaylistDetailDto(playlist));
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = playlistLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const existing = await prisma.playlist.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Playlist nao encontrada" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updatePlaylistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const playlist = await prisma.playlist.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { items: true } } },
    });

    log.info({ event: "playlists.updated", userId, playlistId: id });

    return NextResponse.json(toPlaylistDto(playlist));
  } catch (error) {
    log.error({
      event: "playlists.update_error",
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

export async function DELETE(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = playlistLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const deleted = await prisma.playlist.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { message: "Playlist nao encontrada" },
        { status: 404 },
      );
    }

    log.info({ event: "playlists.deleted", userId, playlistId: id });

    return NextResponse.json({ message: "Playlist removida." });
  } catch (error) {
    log.error({
      event: "playlists.delete_error",
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
