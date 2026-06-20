import type { Channel } from "amqplib";

import { createRequestLogger } from "@/lib/logger";
import { MEDIA_TRANSCODE_QUEUE } from "@/lib/queue/constants";
import {
  type MediaTranscodeJobMessage,
  getRabbitChannel,
} from "@/lib/queue/rabbitmq";

const cancelLogger = createRequestLogger({ module: "rabbitmq" });

export function parseTranscodeJobMessage(
  content: Buffer | string,
): MediaTranscodeJobMessage | null {
  try {
    const raw =
      typeof content === "string" ? content : content.toString("utf8");
    const parsed = JSON.parse(raw) as Partial<MediaTranscodeJobMessage>;

    if (
      typeof parsed.jobId !== "string" ||
      typeof parsed.userId !== "string" ||
      (parsed.mediaType !== "audio" && parsed.mediaType !== "video") ||
      typeof parsed.storageKey !== "string" ||
      typeof parsed.mimeType !== "string"
    ) {
      return null;
    }

    return parsed as MediaTranscodeJobMessage;
  } catch {
    return null;
  }
}

export async function drainQueueMatchingJobIds(
  channel: Channel,
  jobIds: Set<string>,
): Promise<{ removed: number; scanned: number }> {
  if (jobIds.size === 0) {
    return { removed: 0, scanned: 0 };
  }

  let removed = 0;
  let scanned = 0;

  while (true) {
    const message = await channel.get(MEDIA_TRANSCODE_QUEUE, { noAck: false });
    if (!message) {
      break;
    }

    scanned += 1;

    const payload = parseTranscodeJobMessage(message.content);

    if (payload && jobIds.has(payload.jobId)) {
      channel.ack(message);
      removed += 1;
      continue;
    }

    channel.nack(message, false, true);
  }

  return { removed, scanned };
}

export async function cancelQueuedTranscodeJobs(jobIds: string[]) {
  if (jobIds.length === 0) {
    return { removed: 0, scanned: 0 };
  }

  const channel = await getRabbitChannel();
  const cancelSet = new Set(jobIds);

  const result = await drainQueueMatchingJobIds(channel, cancelSet);

  cancelLogger.info({
    event: "rabbitmq.jobs_cancelled",
    requested: jobIds.length,
    removed: result.removed,
    scanned: result.scanned,
  });

  return result;
}

export async function cancelQueuedTranscodeJobsSafely(jobIds: string[]) {
  if (jobIds.length === 0) {
    return 0;
  }

  try {
    const result = await cancelQueuedTranscodeJobs(jobIds);
    return result.removed;
  } catch (error) {
    cancelLogger.warn({
      event: "rabbitmq.cancel_failed",
      jobIds,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return 0;
  }
}
