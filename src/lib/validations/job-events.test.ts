import { describe, expect, it } from "vitest";

import {
  normalizeJobEvent,
  normalizeRedisJobEvent,
} from "@/lib/validations/job-events";

describe("normalizeJobEvent", () => {
  it("normaliza evento de progresso com defaults seguros", () => {
    const event = normalizeJobEvent({
      type: "progress",
      payload: {
        jobId: "job-1",
        userId: "user-1",
        progressPercentage: "42.5",
        stage: "transcoding",
      },
    });

    expect(event).toMatchObject({
      type: "progress",
      jobId: "job-1",
      userId: "user-1",
      status: "processing",
      progressPercentage: 42.5,
      stage: "transcoding",
    });
  });

  it("mapeia canais Redis para eventos finais", () => {
    const completed = normalizeRedisJobEvent(
      "job.completed",
      JSON.stringify({
        jobId: "job-1",
        userId: "user-1",
        playbackUrl: "http://localhost:14009/outputs/user-1/job-1/index.m3u8",
        coverUrl: "http://localhost:14009/outputs/user-1/job-1/cover.jpg",
      }),
    );

    expect(completed).toMatchObject({
      type: "completed",
      status: "ready",
      progressPercentage: 100,
      coverUrl: "http://localhost:14009/outputs/user-1/job-1/cover.jpg",
    });

    expect(normalizeRedisJobEvent("unknown", "{}")).toBeNull();
    expect(normalizeRedisJobEvent("job.progress", "{")).toBeNull();
  });
});
