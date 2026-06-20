import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { subscribeToJobEvents } from "@/lib/realtime/job-events";
import type { JobRealtimeEvent } from "@/lib/validations/job-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const streamLogger = createRequestLogger({ module: "media.job-events" });
const encoder = new TextEncoder();
const PING_INTERVAL_MS = 30_000;

type RouteContext = { params: Promise<{ id: string }> };

function toJobStatus(status: "PROCESSING" | "READY" | "ERROR") {
  switch (status) {
    case "READY":
      return "ready" as const;
    case "ERROR":
      return "error" as const;
    default:
      return "processing" as const;
  }
}

function formatSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const log = streamLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;
  const { id: jobId } = await context.params;

  const job = await prisma.transcodeJob.findFirst({
    where: { id: jobId, userId },
    include: {
      mediaAsset: {
        select: {
          id: true,
          playbackUrl: true,
          coverUrl: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json(
      { message: "Job nao encontrado" },
      { status: 404 },
    );
  }

  let unsubscribe: (() => void | Promise<void>) | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const cleanup = async () => {
        if (closed) return;
        closed = true;

        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }

        if (unsubscribe) {
          await unsubscribe();
          unsubscribe = null;
        }

        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };

      try {
        const snapshot: JobRealtimeEvent = {
          type: "snapshot",
          jobId,
          userId,
          mediaAssetId: job.mediaAssetId,
          status: toJobStatus(job.status),
          progressPercentage: job.progress,
          playbackUrl: job.mediaAsset.playbackUrl,
          coverUrl: job.mediaAsset.coverUrl,
          errorMessage: job.errorMessage,
          stage: null,
          message: null,
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(formatSse("connected", { jobId }));
        controller.enqueue(formatSse("job", snapshot));

        unsubscribe = await subscribeToJobEvents({ jobId, userId }, (event) => {
          if (closed) return;

          try {
            controller.enqueue(formatSse("job", event));
          } catch {
            void cleanup();
          }
        });

        pingTimer = setInterval(() => {
          if (closed) return;

          try {
            controller.enqueue(formatSse("ping", { ts: Date.now() }));
          } catch {
            void cleanup();
          }
        }, PING_INTERVAL_MS);

        request.signal.addEventListener("abort", () => {
          void cleanup();
        });

        log.info({ event: "media.job_events.connected", userId, jobId });
      } catch (error) {
        log.error({
          event: "media.job_events.error",
          userId,
          jobId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        await cleanup();
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
