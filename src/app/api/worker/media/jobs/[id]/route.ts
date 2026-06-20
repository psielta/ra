import { timingSafeEqual } from "crypto";

import { TranscodeJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { createRequestLogger } from "@/lib/logger";
import {
  resourceAssetInclude,
  toResourceDto,
} from "@/lib/media/resource-mapper";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/realtime/notifications";
import { workerJobUpdateSchema } from "@/lib/validations/worker-callback";

export const runtime = "nodejs";

const workerLogger = createRequestLogger({ module: "worker.media-jobs" });

type RouteContext = { params: Promise<{ id: string }> };

function readWorkerToken(request: Request) {
  const headerToken = request.headers.get("x-worker-token");
  if (headerToken) return headerToken;

  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return null;
}

function isValidWorkerToken(request: Request) {
  const expected = process.env.WORKER_API_TOKEN?.trim();
  const provided = readWorkerToken(request);

  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = workerLogger.child({ requestId });

  if (!isValidWorkerToken(request)) {
    return NextResponse.json({ message: "Nao autorizado" }, { status: 401 });
  }

  const { id: jobId } = await context.params;

  try {
    const body = await request.json();
    const parsed = workerJobUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.transcodeJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        userId: true,
        mediaAssetId: true,
        mediaAsset: {
          select: {
            title: true,
            mediaType: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Job nao encontrado" },
        { status: 404 },
      );
    }

    const update = parsed.data;
    const isReady = update.status === "ready";

    const [job, asset] = isReady
      ? await prisma.$transaction([
          prisma.transcodeJob.update({
            where: { id: jobId },
            data: {
              status: TranscodeJobStatus.READY,
              progress: update.progress,
              errorMessage: null,
              completedAt: new Date(),
            },
          }),
          prisma.mediaAsset.update({
            where: { id: existing.mediaAssetId },
            data: {
              playbackUrl: update.playbackUrl,
              coverUrl: update.coverUrl,
              durationSec: update.durationSec,
            },
            include: resourceAssetInclude,
          }),
        ])
      : [
          await prisma.transcodeJob.update({
            where: { id: jobId },
            data: {
              status: TranscodeJobStatus.ERROR,
              progress: update.progress,
              errorMessage: update.errorMessage,
              completedAt: new Date(),
            },
          }),
          await prisma.mediaAsset.findUniqueOrThrow({
            where: { id: existing.mediaAssetId },
            include: resourceAssetInclude,
          }),
        ];

    void publishNotification({
      userId: existing.userId,
      type: isReady ? "SUCCESS" : "ERROR",
      category: "MEDIA",
      title: isReady ? "Midia pronta" : "Falha no processamento",
      message: isReady
        ? `${existing.mediaAsset.title ?? "Sua midia"} esta pronta para reproducao.`
        : update.errorMessage,
      metadata: { jobId, mediaAssetId: existing.mediaAssetId },
    }).catch(() => undefined);

    log.info({
      event: "worker.media_job_updated",
      jobId,
      mediaAssetId: existing.mediaAssetId,
      status: job.status,
    });

    return NextResponse.json(toResourceDto(asset));
  } catch (error) {
    log.error({
      event: "worker.media_job_update_error",
      jobId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
