import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResourcePlayer } from "@/components/media/resource-player";
import type { ResourceDto } from "@/lib/validations/series";

const hlsMock = vi.hoisted(() => {
  type Listener = (event: string, data: unknown) => void;

  const Events = {
    FRAG_LOADING: "hlsFragLoading",
    FRAG_LOADED: "hlsFragLoaded",
    ERROR: "hlsError",
  } as const;

  class MockHls {
    static instances: MockHls[] = [];
    static isSupported = vi.fn(() => true);

    listeners = new Map<string, Listener[]>();
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();

    constructor() {
      MockHls.instances.push(this);
    }

    on = vi.fn((event: string, listener: Listener) => {
      this.listeners.set(event, [
        ...(this.listeners.get(event) ?? []),
        listener,
      ]);
    });

    off = vi.fn((event: string, listener: Listener) => {
      this.listeners.set(
        event,
        (this.listeners.get(event) ?? []).filter((item) => item !== listener),
      );
    });

    emit(event: string, data: unknown) {
      for (const listener of this.listeners.get(event) ?? []) {
        listener(event, data);
      }
    }
  }

  return { Events, MockHls };
});

vi.mock("hls.js", () => ({
  __esModule: true,
  default: hlsMock.MockHls,
  Events: hlsMock.Events,
}));

function readyVideoResource(): ResourceDto {
  return {
    id: "resource-1",
    title: "Video HLS",
    description: null,
    mediaType: "video",
    mimeType: "video/mp4",
    status: "ready",
    progress: 100,
    playbackUrl: "https://ra.local/ra-media/resource-1/index.m3u8",
    coverUrl: null,
    jobId: "job-1",
    errorMessage: null,
    series: null,
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
  };
}

describe("ResourcePlayer", () => {
  beforeEach(() => {
    hlsMock.MockHls.instances = [];
    hlsMock.MockHls.isSupported.mockReturnValue(true);
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows HLS segment monitor while waiting for the first segment", async () => {
    render(<ResourcePlayer resource={readyVideoResource()} />);

    await waitFor(() => expect(hlsMock.MockHls.instances).toHaveLength(1));

    expect(screen.getByText("Segmentos HLS")).toBeInTheDocument();
    expect(screen.getByText("hls.js")).toBeInTheDocument();
    expect(screen.getByText("0 recebidos")).toBeInTheDocument();
    expect(
      screen.getByText("Aguardando primeiro segmento .ts."),
    ).toBeInTheDocument();
    expect(hlsMock.MockHls.instances[0]?.loadSource).toHaveBeenCalledWith(
      "https://ra.local/ra-media/resource-1/index.m3u8",
    );
  });

  it("updates the monitor when hls.js receives a .ts segment", async () => {
    render(<ResourcePlayer resource={readyVideoResource()} />);

    await waitFor(() => expect(hlsMock.MockHls.instances).toHaveLength(1));

    act(() => {
      hlsMock.MockHls.instances[0]?.emit(hlsMock.Events.FRAG_LOADED, {
        frag: {
          url: "https://ra.local/ra-media/resource-1/segment-00001.ts?token=1",
          sn: 1,
          level: 0,
          duration: 4.2,
          stats: { loaded: 188416 },
        },
        part: null,
        payload: new ArrayBuffer(188416),
        networkDetails: null,
      });
    });

    expect(await screen.findByText("1 recebido")).toBeInTheDocument();
    expect(screen.getAllByText("segment-00001.ts")).toHaveLength(2);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("4.2s")).toBeInTheDocument();
    expect(screen.getByText("L0 - 184 KB")).toBeInTheDocument();
  });
});
