import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { deleteMediaResource } from "@/lib/media/delete-resource";
import { toResourceDto } from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import { updateResourceSchema } from "@/lib/validations/series";

const resourceLogger = createRequestLogger({ module: "resources" });

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id, userId },
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

  if (!asset) {
    return NextResponse.json(
      { message: "Recurso não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(toResourceDto(asset));
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = resourceLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const existing = await prisma.mediaAsset.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Recurso não encontrado" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
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
          { message: "Série não encontrada" },
          { status: 400 },
        );
      }
    }

    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        seriesId: parsed.data.seriesId,
      },
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

    log.info({ event: "resources.updated", userId, resourceId: id });

    return NextResponse.json(toResourceDto(asset));
  } catch (error) {
    log.error({
      event: "resources.update_error",
      userId,
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
  const log = resourceLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const result = await deleteMediaResource(userId, id);

    if (!result) {
      return NextResponse.json(
        { message: "Recurso não encontrado" },
        { status: 404 },
      );
    }

    log.info({
      event: "resources.deleted",
      userId,
      resourceId: id,
      seriesId: result.seriesId,
      deletedStorageKeys: result.deletedStorageKeys,
      cancelledJobCount: result.cancelledJobCount,
      processingJobCount: result.processingJobCount,
    });

    return NextResponse.json({
      message: "Recurso removido.",
      cancelledJobCount: result.cancelledJobCount,
    });
  } catch (error) {
    log.error({
      event: "resources.delete_error",
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
