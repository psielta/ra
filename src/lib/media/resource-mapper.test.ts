import { describe, expect, it } from "vitest";

import { toResourceDto, toSeriesListDto } from "@/lib/media/resource-mapper";

describe("toSeriesListDto", () => {
  it("inclui preview de recursos na listagem de séries", () => {
    const dto = toSeriesListDto({
      id: "series-1",
      userId: "user-1",
      title: "Mecânica",
      slug: "mecanica",
      description: "Ensino médio",
      createdAt: new Date("2026-06-20T10:00:00.000Z"),
      updatedAt: new Date("2026-06-20T10:00:00.000Z"),
      _count: { resources: 2 },
      resources: [
        {
          id: "asset-1",
          userId: "user-1",
          seriesId: "series-1",
          title: "Física Volume I",
          description: null,
          mediaType: "VIDEO",
          mimeType: "video/mp4",
          originalKey: "uploads/user-1/job-1/source.mp4",
          playbackUrl: null,
          coverUrl: null,
          durationSec: null,
          createdAt: new Date("2026-06-20T11:00:00.000Z"),
          updatedAt: new Date("2026-06-20T11:00:00.000Z"),
          series: {
            id: "series-1",
            title: "Mecânica",
            slug: "mecanica",
          },
          jobs: [
            {
              id: "job-1",
              status: "PROCESSING",
              progress: 0,
              errorMessage: null,
            },
          ],
          playlistItems: [],
        },
      ],
    });

    expect(dto.resourceCount).toBe(2);
    expect(dto.resources).toHaveLength(1);
    expect(dto.resources[0]?.title).toBe("Física Volume I");
    expect(dto.resources[0]?.mediaType).toBe("video");
    expect(dto.resources[0]?.isFavorite).toBe(false);
  });
});

describe("toResourceDto", () => {
  it("marca recurso favorito quando ele esta na playlist especial", () => {
    const dto = toResourceDto({
      id: "asset-1",
      userId: "user-1",
      seriesId: null,
      title: "Faixa favorita",
      description: null,
      mediaType: "AUDIO",
      mimeType: "audio/mpeg",
      originalKey: "uploads/user-1/job-1/source.mp3",
      playbackUrl: "https://ra.local/asset-1/index.m3u8",
      coverUrl: null,
      durationSec: null,
      createdAt: new Date("2026-06-20T11:00:00.000Z"),
      updatedAt: new Date("2026-06-20T11:00:00.000Z"),
      series: null,
      jobs: [
        {
          id: "job-1",
          status: "READY",
          progress: 100,
          errorMessage: null,
        },
      ],
      playlistItems: [{ id: "favorite-item-1" }],
    });

    expect(dto.isFavorite).toBe(true);
  });
});
