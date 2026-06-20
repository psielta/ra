import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { toSeriesDto, toSeriesListDto } from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import {
  createSeriesSchema,
  SERIES_PREVIEW_LIMIT,
  slugifySeriesTitle,
} from "@/lib/validations/series";

const seriesLogger = createRequestLogger({ module: "series" });

async function resolveUniqueSlug(userId: string, title: string) {
  const base = slugifySeriesTitle(title);
  let slug = base;
  let suffix = 2;

  while (
    await prisma.series.findUnique({
      where: { userId_slug: { userId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function GET() {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;

  const items = await prisma.series.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { resources: true } },
      resources: {
        orderBy: { createdAt: "desc" },
        take: SERIES_PREVIEW_LIMIT,
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

  return NextResponse.json(items.map((item) => toSeriesListDto(item)));
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = seriesLogger.child({ requestId });
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;

  try {
    const body = await request.json();
    const parsed = createSeriesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const slug = await resolveUniqueSlug(userId, parsed.data.title);

    const series = await prisma.series.create({
      data: {
        userId,
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
      },
      include: { _count: { select: { resources: true } } },
    });

    log.info({ event: "series.created", userId, seriesId: series.id });

    return NextResponse.json(toSeriesDto(series), { status: 201 });
  } catch (error) {
    log.error({
      event: "series.create_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
