import { MediaType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { toResourceDto } from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import { bulkUpdateResourcesSchema } from "@/lib/validations/series";

const resourcesLogger = createRequestLogger({ module: "resources" });

export async function GET(request: Request) {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get("seriesId");
  const mediaType = searchParams.get("mediaType");
  const q = searchParams.get("q")?.trim();

  const assets = await prisma.mediaAsset.findMany({
    where: {
      userId,
      ...(seriesId ? { seriesId } : {}),
      ...(mediaType === "audio"
        ? { mediaType: MediaType.AUDIO }
        : mediaType === "video"
          ? { mediaType: MediaType.VIDEO }
          : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
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
  });

  return NextResponse.json(assets.map(toResourceDto));
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  const log = resourcesLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;

  try {
    const body = await request.json();
    const parsed = bulkUpdateResourcesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsed.data.seriesId) {
      const series = await prisma.series.findFirst({
        where: { id: parsed.data.seriesId, userId },
        select: { id: true },
      });

      if (!series) {
        return NextResponse.json(
          { message: "Serie nao encontrada" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.mediaAsset.updateMany({
      where: {
        userId,
        id: { in: parsed.data.ids },
      },
      data: {
        seriesId: parsed.data.seriesId,
      },
    });

    log.info({
      event: "resources.bulk_updated",
      userId,
      count: updated.count,
      requestedCount: parsed.data.ids.length,
      seriesId: parsed.data.seriesId,
    });

    return NextResponse.json({ count: updated.count });
  } catch (error) {
    log.error({
      event: "resources.bulk_update_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
