import { MediaType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { purgeResources } from "@/lib/media/delete-helpers";
import {
  resourceAssetInclude,
  toResourceDto,
} from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import {
  bulkDeleteResourcesSchema,
  bulkUpdateResourcesSchema,
} from "@/lib/validations/series";

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
    include: resourceAssetInclude,
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

export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID();
  const log = resourcesLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;

  try {
    const body = await request.json();
    const parsed = bulkDeleteResourcesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const resources = await prisma.mediaAsset.findMany({
      where: {
        userId,
        id: { in: parsed.data.ids },
      },
      include: {
        jobs: {
          select: { id: true, status: true, storageKey: true },
        },
      },
    });

    if (resources.length === 0) {
      return NextResponse.json(
        { message: "Nenhum recurso encontrado" },
        { status: 404 },
      );
    }

    const purgeResult = await purgeResources(
      resources,
      "Cancelado: recursos excluidos em lote",
    );

    const deleted = await prisma.mediaAsset.deleteMany({
      where: {
        userId,
        id: { in: resources.map((resource) => resource.id) },
      },
    });

    log.info({
      event: "resources.bulk_deleted",
      userId,
      requestedCount: parsed.data.ids.length,
      deletedCount: deleted.count,
      deletedStorageKeys: purgeResult.deletedStorageKeys,
      cancelledJobCount: purgeResult.cancelledJobCount,
      processingJobCount: purgeResult.processingJobCount,
    });

    return NextResponse.json({
      count: deleted.count,
      deletedStorageKeys: purgeResult.deletedStorageKeys,
      cancelledJobCount: purgeResult.cancelledJobCount,
    });
  } catch (error) {
    log.error({
      event: "resources.bulk_delete_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
