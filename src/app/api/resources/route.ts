import { MediaType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { toResourceDto } from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get("seriesId");
  const mediaType = searchParams.get("mediaType");

  const assets = await prisma.mediaAsset.findMany({
    where: {
      userId,
      ...(seriesId ? { seriesId } : {}),
      ...(mediaType === "audio"
        ? { mediaType: MediaType.AUDIO }
        : mediaType === "video"
          ? { mediaType: MediaType.VIDEO }
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
