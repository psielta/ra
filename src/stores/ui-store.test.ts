import { beforeEach, describe, expect, it } from "vitest";

import type { ResourceDto } from "@/lib/validations/series";
import { useUiStore } from "@/stores/ui-store";

function resource(id: string, title: string): ResourceDto {
  return {
    id,
    title,
    description: null,
    mediaType: "audio",
    mimeType: "audio/mpeg",
    status: "ready",
    progress: 100,
    playbackUrl: `https://ra.local/${id}/index.m3u8`,
    coverUrl: null,
    jobId: null,
    errorMessage: null,
    series: { id: "series-1", title: "Serie", slug: "serie" },
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
  };
}

describe("useUiStore playlist playback", () => {
  beforeEach(() => {
    useUiStore.setState({
      persistentResource: null,
      persistentCurrentTime: 0,
      persistentDuration: 0,
      persistentPlaying: false,
      persistentPlaylist: null,
      hlsSegmentPulseId: 0,
      hlsLastSegmentFileName: null,
      hlsLastSegmentBytes: null,
      hlsLastSegmentReceivedAt: null,
    });
  });

  it("inicia playlist a partir de um recurso e avanca em sequencia", () => {
    const first = resource("resource-1", "Primeira");
    const second = resource("resource-2", "Segunda");

    useUiStore.getState().startPersistentPlaylist({
      seriesId: "series-1",
      title: "Serie",
      resources: [first, second],
      startResourceId: second.id,
    });

    expect(useUiStore.getState().persistentResource?.id).toBe(second.id);
    expect(useUiStore.getState().persistentPlaylist?.currentIndex).toBe(1);

    useUiStore.getState().playPersistentPlaylistIndex(0);

    expect(useUiStore.getState().persistentResource?.id).toBe(first.id);

    useUiStore.getState().advancePersistentPlaylist();

    expect(useUiStore.getState().persistentResource?.id).toBe(second.id);
    expect(useUiStore.getState().persistentPlaying).toBe(true);
  });

  it("registra pulsos de segmentos HLS recebidos", () => {
    useUiStore.getState().pulseHlsSegment({
      fileName: "segment_000.ts",
      bytes: 31_744,
    });

    useUiStore.getState().pulseHlsSegment({
      fileName: "segment_001.ts",
      bytes: null,
    });

    const state = useUiStore.getState();

    expect(state.hlsSegmentPulseId).toBe(2);
    expect(state.hlsLastSegmentFileName).toBe("segment_001.ts");
    expect(state.hlsLastSegmentBytes).toBeNull();
    expect(typeof state.hlsLastSegmentReceivedAt).toBe("number");
  });
});
