import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { toResourceDto, toSeriesDto } from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import { updateSeriesSchema } from "@/lib/validations/series";

const seriesLogger = createRequestLogger({ module: "series" });

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  const series = await prisma.series.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { resources: true } },
      resources: {
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
      },
    },
  });

  if (!series) {
    return NextResponse.json(
      { message: "Série não encontrada" },
      { status: 404 },
    );
  }

  const { resources, ...seriesData } = series;

  return NextResponse.json({
    ...toSeriesDto(seriesData),
    resources: resources.map(toResourceDto),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = seriesLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const existing = await prisma.series.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Série não encontrada" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateSeriesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const series = await prisma.series.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { resources: true } } },
    });

    log.info({ event: "series.updated", userId, seriesId: id });

    return NextResponse.json(toSeriesDto(series));
  } catch (error) {
    log.error({
      event: "series.update_error",
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
  const log = seriesLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const existing = await prisma.series.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Série não encontrada" },
        { status: 404 },
      );
    }

    await prisma.series.delete({ where: { id } });

    log.info({ event: "series.deleted", userId, seriesId: id });

    return NextResponse.json({ message: "Série removida." });
  } catch (error) {
    log.error({
      event: "series.delete_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
