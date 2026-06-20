import { describe, expect, it } from "vitest";

import { toQueueJobDto } from "@/lib/media/queue-mapper";

describe("toQueueJobDto", () => {
  it("mapeia job em processamento com série", () => {
    const dto = toQueueJobDto({
      id: "job-1",
      userId: "user-1",
      mediaAssetId: "asset-1",
      status: "PROCESSING",
      storageKey: "uploads/user-1/job-1/source.mp3",
      errorMessage: null,
      progress: 42.5,
      createdAt: new Date("2026-06-20T12:00:00.000Z"),
      updatedAt: new Date("2026-06-20T12:01:00.000Z"),
      completedAt: null,
      mediaAsset: {
        id: "asset-1",
        userId: "user-1",
        seriesId: "series-1",
        title: "Minha faixa",
        description: null,
        mediaType: "AUDIO",
        mimeType: "audio/mpeg",
        originalKey: "uploads/user-1/job-1/source.mp3",
        playbackUrl: null,
        coverUrl: null,
        durationSec: null,
        createdAt: new Date("2026-06-20T12:00:00.000Z"),
        updatedAt: new Date("2026-06-20T12:00:00.000Z"),
        series: {
          id: "series-1",
          title: "Coletânea",
          slug: "colecao",
        },
      },
    });

    expect(dto).toEqual({
      jobId: "job-1",
      mediaAssetId: "asset-1",
      title: "Minha faixa",
      mediaType: "audio",
      progress: 42.5,
      series: {
        id: "series-1",
        title: "Coletânea",
        slug: "colecao",
      },
      createdAt: "2026-06-20T12:00:00.000Z",
      updatedAt: "2026-06-20T12:01:00.000Z",
    });
  });
});
