"use client";

import Hls, {
  Events,
  type ErrorData,
  type FragLoadedData,
  type FragLoadingData,
} from "hls.js";
import { Activity, Headphones, Loader2, Video } from "lucide-react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type RefObject,
  type SyntheticEvent,
} from "react";

import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import type { ResourceDto } from "@/lib/validations/series";
import { useUiStore } from "@/stores/ui-store";

const MAX_SEGMENT_HISTORY = 6;

type HlsSourceMode = "idle" | "native" | "hlsjs" | "fallback";
type HlsSegmentStatus = "loading" | "loaded";

type HlsSegmentTrace = {
  id: string;
  status: HlsSegmentStatus;
  sequence: string;
  level: number;
  durationSeconds: number;
  bytes: number | null;
  url: string;
  fileName: string;
  receivedAtLabel: string;
};

type HlsDiagnostics = {
  mode: HlsSourceMode;
  loadedCount: number;
  currentSegment: HlsSegmentTrace | null;
  segments: HlsSegmentTrace[];
  errorMessage: string | null;
};

type HlsDiagnosticsAction =
  | { type: "reset" }
  | { type: "mode"; mode: HlsSourceMode }
  | { type: "segment"; segment: HlsSegmentTrace }
  | { type: "error"; message: string };

function createInitialHlsDiagnostics(): HlsDiagnostics {
  return {
    mode: "idle",
    loadedCount: 0,
    currentSegment: null,
    segments: [],
    errorMessage: null,
  };
}

function hlsDiagnosticsReducer(
  state: HlsDiagnostics,
  action: HlsDiagnosticsAction,
): HlsDiagnostics {
  if (action.type === "reset") {
    return createInitialHlsDiagnostics();
  }

  if (action.type === "mode") {
    return { ...state, mode: action.mode };
  }

  if (action.type === "error") {
    return { ...state, errorMessage: action.message };
  }

  const { segment } = action;
  const withoutPendingDuplicate = state.segments.filter(
    (item) =>
      !(
        item.status === "loading" &&
        item.url === segment.url &&
        item.sequence === segment.sequence
      ),
  );

  return {
    ...state,
    loadedCount:
      segment.status === "loaded" ? state.loadedCount + 1 : state.loadedCount,
    currentSegment: segment,
    errorMessage: null,
    segments: [segment, ...withoutPendingDuplicate].slice(
      0,
      MAX_SEGMENT_HISTORY,
    ),
  };
}

function formatBytes(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted = size >= 10 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toFixed(1)}s`;
}

function formatLoadedCount(value: number) {
  return value === 1 ? "1 recebido" : `${value} recebidos`;
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function getSegmentFileName(url: string) {
  const [withoutHash] = url.split("#");
  const [path] = withoutHash.split("?");
  const fallback = path.split("/").filter(Boolean).pop() ?? url;

  try {
    return decodeURIComponent(fallback);
  } catch {
    return fallback;
  }
}

function getLoadedBytes(data: FragLoadedData) {
  const loaded = data.frag.stats?.loaded;

  if (typeof loaded === "number" && Number.isFinite(loaded) && loaded > 0) {
    return loaded;
  }

  return data.payload.byteLength;
}

function toSegmentTrace(
  data: FragLoadedData | FragLoadingData,
  status: HlsSegmentStatus,
  id: string,
) {
  const segment = data.part ?? data.frag;
  const sequence =
    data.part && data.frag.sn !== "initSegment"
      ? `${data.frag.sn}.${data.part.index}`
      : String(data.frag.sn);
  const bytes =
    status === "loaded" ? getLoadedBytes(data as FragLoadedData) : null;

  return {
    id,
    status,
    sequence,
    level: data.frag.level,
    durationSeconds: segment.duration,
    bytes,
    url: segment.url,
    fileName: getSegmentFileName(segment.url),
    receivedAtLabel: formatClock(new Date()),
  };
}

export function useHlsSource<T extends HTMLMediaElement>(
  mediaRef: RefObject<T | null>,
  src: string,
) {
  const [diagnostics, dispatchDiagnostics] = useReducer(
    hlsDiagnosticsReducer,
    createInitialHlsDiagnostics(),
  );
  const segmentCounterRef = useRef(0);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    segmentCounterRef.current = 0;
    dispatchDiagnostics({ type: "reset" });

    if (media.canPlayType("application/vnd.apple.mpegurl")) {
      media.src = src;
      dispatchDiagnostics({ type: "mode", mode: "native" });
      return;
    }

    if (!Hls.isSupported()) {
      media.src = src;
      dispatchDiagnostics({ type: "mode", mode: "fallback" });
      return;
    }

    const hls = new Hls({ enableWorker: true });

    const pushSegment = (segment: HlsSegmentTrace) => {
      dispatchDiagnostics({ type: "segment", segment });
    };

    const nextSegmentId = (status: HlsSegmentStatus) => {
      segmentCounterRef.current += 1;
      return `${status}-${segmentCounterRef.current}`;
    };

    const handleFragLoading = (
      _event: Events.FRAG_LOADING,
      data: FragLoadingData,
    ) => {
      pushSegment(toSegmentTrace(data, "loading", nextSegmentId("loading")));
    };

    const handleFragLoaded = (
      _event: Events.FRAG_LOADED,
      data: FragLoadedData,
    ) => {
      pushSegment(toSegmentTrace(data, "loaded", nextSegmentId("loaded")));
    };

    const handleError = (_event: Events.ERROR, data: ErrorData) => {
      dispatchDiagnostics({
        type: "error",
        message: data.details ?? data.type ?? "Erro HLS",
      });
    };

    dispatchDiagnostics({ type: "mode", mode: "hlsjs" });
    hls.on(Events.FRAG_LOADING, handleFragLoading);
    hls.on(Events.FRAG_LOADED, handleFragLoaded);
    hls.on(Events.ERROR, handleError);
    hls.loadSource(src);
    hls.attachMedia(media);

    return () => {
      hls.off(Events.FRAG_LOADING, handleFragLoading);
      hls.off(Events.FRAG_LOADED, handleFragLoaded);
      hls.off(Events.ERROR, handleError);
      hls.destroy();
    };
  }, [mediaRef, src]);

  return diagnostics;
}

function usePersistentPlaybackEvents(resource: ResourceDto) {
  const startPersistentPlayback = useUiStore(
    (state) => state.startPersistentPlayback,
  );
  const updatePersistentPlayback = useUiStore(
    (state) => state.updatePersistentPlayback,
  );
  const pauseTimerRef = useRef<number | null>(null);

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPauseTimer, [clearPauseTimer]);

  const updateFromMedia = useCallback(
    (media: HTMLMediaElement, playing?: boolean) => {
      updatePersistentPlayback(resource.id, {
        currentTime: media.currentTime,
        duration: Number.isFinite(media.duration) ? media.duration : 0,
        playing,
      });
    },
    [resource.id, updatePersistentPlayback],
  );

  const handlePlay = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      clearPauseTimer();
      startPersistentPlayback(resource);
      updateFromMedia(event.currentTarget, true);
    },
    [clearPauseTimer, resource, startPersistentPlayback, updateFromMedia],
  );

  const handlePause = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      const media = event.currentTarget;
      clearPauseTimer();
      pauseTimerRef.current = window.setTimeout(() => {
        updateFromMedia(media, false);
      }, 200);
    },
    [clearPauseTimer, updateFromMedia],
  );

  const handleTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      updateFromMedia(event.currentTarget);
    },
    [updateFromMedia],
  );

  const handleEnded = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      clearPauseTimer();
      updateFromMedia(event.currentTarget, false);
    },
    [clearPauseTimer, updateFromMedia],
  );

  return {
    handlePlay,
    handlePause,
    handleTimeUpdate,
    handleEnded,
  };
}

function HlsSegmentMonitor({ diagnostics }: { diagnostics: HlsDiagnostics }) {
  const modeLabel =
    diagnostics.mode === "hlsjs"
      ? "hls.js"
      : diagnostics.mode === "native"
        ? "HLS nativo"
        : diagnostics.mode === "fallback"
          ? "URL direta"
          : "preparando";
  const current = diagnostics.currentSegment;

  return (
    <div
      className="border-gold/10 bg-muted/20 space-y-3 rounded-md border p-3 text-sm"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex min-w-0 items-center gap-2">
          <Activity className="text-gold size-4 shrink-0" />
          <span className="text-foreground font-medium">Segmentos HLS</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="border-gold/20 bg-gold/10 text-gold rounded-full border px-2 py-1">
            {modeLabel}
          </span>
          <span className="text-muted-foreground">
            {formatLoadedCount(diagnostics.loadedCount)}
          </span>
        </div>
      </div>

      {current ? (
        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
          <div className="min-w-0 sm:col-span-2 lg:col-span-2">
            <p className="text-muted-foreground">Segmento atual</p>
            <p className="truncate font-mono text-[11px]" title={current.url}>
              {current.fileName}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Seq.</p>
            <p className="font-medium">{current.sequence}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duracao</p>
            <p className="font-medium">
              {formatSeconds(current.durationSeconds)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tamanho</p>
            <p className="font-medium">{formatBytes(current.bytes)}</p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          {diagnostics.mode === "native"
            ? "Segmentos controlados pelo navegador."
            : "Aguardando primeiro segmento .ts."}
        </p>
      )}

      {diagnostics.errorMessage ? (
        <p className="text-destructive text-xs">{diagnostics.errorMessage}</p>
      ) : null}

      {diagnostics.segments.length > 0 ? (
        <ul className="max-h-36 overflow-y-auto pr-1 text-xs">
          {diagnostics.segments.map((segment) => (
            <li
              key={segment.id}
              className="border-border/60 grid gap-2 border-t py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
            >
              <span
                className="min-w-0 truncate font-mono text-[11px]"
                title={segment.url}
              >
                {segment.fileName}
              </span>
              <span className="text-muted-foreground">#{segment.sequence}</span>
              <span className="text-muted-foreground">
                L{segment.level} - {formatBytes(segment.bytes)}
              </span>
              <span
                className={
                  segment.status === "loaded"
                    ? "text-gold"
                    : "text-muted-foreground"
                }
              >
                {segment.status === "loaded"
                  ? segment.receivedAtLabel
                  : "recebendo"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function HlsAudioPlayer({
  resource,
  src,
  title,
}: {
  resource: ResourceDto;
  src: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const diagnostics = useHlsSource(audioRef, src);
  const playbackEvents = usePersistentPlaybackEvents(resource);

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        className="w-full"
        aria-label={title}
        onPlay={playbackEvents.handlePlay}
        onPause={playbackEvents.handlePause}
        onTimeUpdate={playbackEvents.handleTimeUpdate}
        onEnded={playbackEvents.handleEnded}
      >
        Seu navegador nao suporta reproducao de audio HLS.
      </audio>
      <HlsSegmentMonitor diagnostics={diagnostics} />
    </div>
  );
}

function HlsVideoPlayer({
  resource,
  src,
  title,
}: {
  resource: ResourceDto;
  src: string;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const diagnostics = useHlsSource(videoRef, src);
  const playbackEvents = usePersistentPlaybackEvents(resource);

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        controls
        preload="metadata"
        className="aspect-video w-full rounded-md bg-black"
        aria-label={title}
        onPlay={playbackEvents.handlePlay}
        onPause={playbackEvents.handlePause}
        onTimeUpdate={playbackEvents.handleTimeUpdate}
        onEnded={playbackEvents.handleEnded}
      />
      <HlsSegmentMonitor diagnostics={diagnostics} />
    </div>
  );
}

export function ResourcePlayer({ resource }: { resource: ResourceDto }) {
  if (resource.status === "processing") {
    const progress = Math.min(Math.max(resource.progress, 0), 100);

    return (
      <div className="border-gold/15 bg-muted/20 flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
        <Loader2 className="text-gold size-10 animate-spin" />
        <p className="font-medium">Conversao em andamento</p>
        <p className="text-muted-foreground max-w-md text-sm">
          O worker .NET esta processando este arquivo. O progresso chega em
          tempo real via Redis/SSE.
        </p>
        <ResourceStatusBadge
          status={resource.status}
          progress={resource.progress}
        />
        <div className="bg-muted h-2 w-full max-w-md overflow-hidden rounded-full">
          <div
            className="bg-gold h-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (resource.status === "error") {
    return (
      <div className="border-destructive/25 bg-destructive/5 flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
        <p className="text-destructive font-medium">Falha no processamento</p>
        <p className="text-muted-foreground max-w-md text-sm">
          {resource.errorMessage ?? "Erro desconhecido durante a conversao."}
        </p>
        <ResourceStatusBadge status={resource.status} />
      </div>
    );
  }

  if (resource.mediaType === "audio" && resource.playbackUrl) {
    return (
      <div className="border-gold/15 space-y-3 rounded-lg border p-5">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Headphones className="text-gold size-4" />
          Player HLS de audio
        </div>
        <HlsAudioPlayer
          resource={resource}
          src={resource.playbackUrl}
          title={resource.title ?? "Audio"}
        />
      </div>
    );
  }

  if (resource.mediaType === "video" && resource.playbackUrl) {
    return (
      <div className="border-gold/15 space-y-3 rounded-lg border p-5">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Video className="text-gold size-4" />
          Player HLS de video
        </div>
        <HlsVideoPlayer
          resource={resource}
          src={resource.playbackUrl}
          title={resource.title ?? "Video"}
        />
      </div>
    );
  }

  if (resource.mediaType === "video") {
    return (
      <div className="border-gold/15 bg-muted/20 flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
        <Video className="text-gold size-10" />
        <p className="font-medium">Streaming HLS</p>
        <p className="text-muted-foreground max-w-md text-sm">
          URL de playback ainda nao disponivel.
        </p>
        <ResourceStatusBadge status={resource.status} />
      </div>
    );
  }

  return (
    <div className="border-gold/15 text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border p-6 text-sm">
      Arquivo pronto, aguardando URL de reproducao do worker.
    </div>
  );
}
