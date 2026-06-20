import { MediaType, TranscodeJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { publishMediaTranscodeJob } from "@/lib/queue/rabbitmq";
import { publishNotification } from "@/lib/realtime/notifications";
import { deleteMediaSource, uploadMediaSource } from "@/lib/storage/media";
import {
  mediaUploadMetadataSchema,
  toMediaUploadResponse,
  validateMediaFile,
} from "@/lib/validations/media";

const uploadLogger = createRequestLogger({ module: "media.upload" });

export const runtime = "nodejs";
export const maxDuration = 120;

function toPrismaMediaType(mediaType: "audio" | "video"): MediaType {
  return mediaType === "audio" ? MediaType.AUDIO : MediaType.VIDEO;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = uploadLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;
  let storageKey: string | null = null;
  let jobId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const titleRaw = formData.get("title");
    const seriesIdRaw = formData.get("seriesId");
    const descriptionRaw = formData.get("description");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Envie um arquivo no campo file." },
        { status: 400 },
      );
    }

    const fileValidation = validateMediaFile(file);

    if (!fileValidation.ok) {
      return NextResponse.json(
        { message: fileValidation.message },
        { status: 400 },
      );
    }

    const metadata = mediaUploadMetadataSchema.safeParse({
      title: typeof titleRaw === "string" ? titleRaw : undefined,
      seriesId: typeof seriesIdRaw === "string" ? seriesIdRaw : undefined,
      description:
        typeof descriptionRaw === "string" ? descriptionRaw : undefined,
    });

    if (!metadata.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: metadata.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (metadata.data.seriesId) {
      const series = await prisma.series.findFirst({
        where: { id: metadata.data.seriesId, userId },
        select: { id: true },
      });

      if (!series) {
        return NextResponse.json(
          { message: "Série não encontrada" },
          { status: 400 },
        );
      }
    }

    const title = metadata.data.title ?? file.name;

    const job = await prisma.$transaction(async (tx) => {
      const mediaAsset = await tx.mediaAsset.create({
        data: {
          userId,
          seriesId: metadata.data.seriesId,
          title,
          description: metadata.data.description,
          mediaType: toPrismaMediaType(fileValidation.kind),
          mimeType: fileValidation.mimeType,
          originalKey: "pending",
        },
      });

      return tx.transcodeJob.create({
        data: {
          userId,
          mediaAssetId: mediaAsset.id,
          status: TranscodeJobStatus.PROCESSING,
          storageKey: "pending",
        },
        include: { mediaAsset: true },
      });
    });

    jobId = job.id;

    const uploaded = await uploadMediaSource({
      userId,
      jobId: job.id,
      file,
    });

    storageKey = uploaded.storageKey;

    await prisma.$transaction([
      prisma.mediaAsset.update({
        where: { id: job.mediaAssetId },
        data: { originalKey: uploaded.storageKey },
      }),
      prisma.transcodeJob.update({
        where: { id: job.id },
        data: { storageKey: uploaded.storageKey },
      }),
    ]);

    await publishMediaTranscodeJob({
      jobId: job.id,
      userId,
      mediaType: uploaded.mediaType,
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
    });

    void publishNotification({
      userId,
      type: "JOB",
      category: "MEDIA",
      title: "Upload recebido",
      message: "Sua midia entrou na fila de conversao HLS.",
      metadata: { jobId: job.id, mediaAssetId: job.mediaAssetId },
    }).catch(() => undefined);

    log.info({
      event: "media.upload.enqueued",
      userId,
      jobId: job.id,
      mediaAssetId: job.mediaAssetId,
      mediaType: uploaded.mediaType,
      storageKey: uploaded.storageKey,
    });

    return NextResponse.json(
      toMediaUploadResponse({
        jobId: job.id,
        mediaAssetId: job.mediaAssetId,
        mediaType: uploaded.mediaType,
        title: job.mediaAsset.title,
        storageKey: uploaded.storageKey,
      }),
      { status: 201 },
    );
  } catch (error) {
    if (storageKey) {
      await deleteMediaSource(storageKey);
    }

    if (jobId) {
      await prisma.transcodeJob
        .update({
          where: { id: jobId },
          data: {
            status: TranscodeJobStatus.ERROR,
            errorMessage:
              error instanceof Error ? error.message : "Falha no upload",
            completedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }

    log.error({
      event: "media.upload.error",
      userId,
      jobId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    const status = message.includes("RabbitMQ") ? 503 : 500;

    return NextResponse.json({ message }, { status });
  }
}
