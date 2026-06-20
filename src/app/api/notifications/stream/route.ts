import { createRequestLogger } from "@/lib/logger";
import { requireSession } from "@/lib/api-auth";
import { subscribeToNotifications } from "@/lib/realtime/notification-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const streamLogger = createRequestLogger({ module: "notifications.stream" });

const encoder = new TextEncoder();
const PING_INTERVAL_MS = 30_000;

function formatSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const log = streamLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;

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
        controller.enqueue(formatSse("connected", { userId }));

        unsubscribe = await subscribeToNotifications(userId, (notification) => {
          if (closed) return;

          try {
            controller.enqueue(formatSse("notification", notification));
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

        log.info({ event: "notifications.stream.connected", userId });
      } catch (error) {
        log.error({
          event: "notifications.stream.error",
          userId,
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
