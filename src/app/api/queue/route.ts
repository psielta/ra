import { TranscodeJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { toQueueJobDto } from "@/lib/media/queue-mapper";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;

  const jobs = await prisma.transcodeJob.findMany({
    where: {
      userId,
      status: TranscodeJobStatus.PROCESSING,
    },
    orderBy: { createdAt: "asc" },
    include: {
      mediaAsset: {
        include: {
          series: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });

  return NextResponse.json(jobs.map(toQueueJobDto));
}
