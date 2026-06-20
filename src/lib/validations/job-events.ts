import { z } from "zod";

import {
  JOB_COMPLETED_CHANNEL,
  JOB_FAILED_CHANNEL,
  JOB_PROGRESS_CHANNEL,
} from "@/lib/realtime/job-channels";

export const jobEventTypeSchema = z.enum([
  "snapshot",
  "progress",
  "completed",
  "failed",
]);

export const jobStatusSchema = z.enum(["processing", "ready", "error"]);

const baseJobEventSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1),
  mediaAssetId: z.string().min(1).optional(),
  status: jobStatusSchema.optional(),
  stage: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  progressPercentage: z.coerce.number().min(0).max(100).optional(),
  playbackUrl: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  timestamp: z.string().datetime().optional(),
});

export const jobRealtimeEventSchema = baseJobEventSchema.extend({
  type: jobEventTypeSchema,
  status: jobStatusSchema,
  progressPercentage: z.number().min(0).max(100),
  timestamp: z.string(),
});

export type JobRealtimeEvent = z.infer<typeof jobRealtimeEventSchema>;

function defaultStatusForType(type: JobRealtimeEvent["type"]) {
  switch (type) {
    case "completed":
      return "ready" as const;
    case "failed":
      return "error" as const;
    default:
      return "processing" as const;
  }
}

function defaultProgressForType(type: JobRealtimeEvent["type"]) {
  switch (type) {
    case "completed":
      return 100;
    case "failed":
      return 0;
    default:
      return 0;
  }
}

export function normalizeJobEvent(input: {
  type: JobRealtimeEvent["type"];
  payload: unknown;
}): JobRealtimeEvent | null {
  const parsed = baseJobEventSchema.safeParse(input.payload);

  if (!parsed.success) {
    return null;
  }

  const event = {
    ...parsed.data,
    type: input.type,
    status: parsed.data.status ?? defaultStatusForType(input.type),
    progressPercentage:
      parsed.data.progressPercentage ?? defaultProgressForType(input.type),
    timestamp: parsed.data.timestamp ?? new Date().toISOString(),
  };

  return jobRealtimeEventSchema.parse(event);
}

export function normalizeRedisJobEvent(
  channel: string,
  message: string,
): JobRealtimeEvent | null {
  const eventType =
    channel === JOB_PROGRESS_CHANNEL
      ? "progress"
      : channel === JOB_COMPLETED_CHANNEL
        ? "completed"
        : channel === JOB_FAILED_CHANNEL
          ? "failed"
          : null;

  if (!eventType) {
    return null;
  }

  try {
    return normalizeJobEvent({
      type: eventType,
      payload: JSON.parse(message) as unknown,
    });
  } catch {
    return null;
  }
}
