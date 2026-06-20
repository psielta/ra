"use client";

import {
  ExternalLink,
  Headphones,
  ListMusic,
  SkipBack,
  SkipForward,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
  type SyntheticEvent,
} from "react";

import { FavoriteToggleButton } from "@/components/media/favorite-toggle-button";
import { Button } from "@/components/ui/button";
import type { ResourceDto } from "@/lib/validations/series";
import { useUiStore } from "@/stores/ui-store";

import { AudioVisualizer } from "./audio-visualizer";
import { useHlsSource } from "./resource-player";

function useMiniPlayerEvents<T extends HTMLMediaElement>(
  resource: ResourceDto,
  mediaRef: RefObject<T | null>,
) {
  const currentTime = useUiStore((state) => state.persistentCurrentTime);
  const shouldPlay = useUiStore((state) => state.persistentPlaying);
  const updatePersistentPlayback = useUiStore(
    (state) => state.updatePersistentPlayback,
  );
  const advancePersistentPlaylist = useUiStore(
    (state) => state.advancePersistentPlaylist,
  );
  const restoredRef = useRef(false);

  useEffect(() => {
    restoredRef.current = false;
  }, [resource.id]);

  const syncFromMedia = useCallback(
    (media: HTMLMediaElement, playing?: boolean) => {
      updatePersistentPlayback(resource.id, {
        currentTime: media.currentTime,
        duration: Number.isFinite(media.duration) ? media.duration : 0,
        playing,
      });
    },
    [resource.id, updatePersistentPlayback],
  );

  const restorePlayback = useCallback(() => {
    const media = mediaRef.current;
    if (!media || restoredRef.current) return;

    restoredRef.current = true;
    if (currentTime > 1 && Math.abs(media.currentTime - currentTime) > 1) {
      media.currentTime = currentTime;
    }

    if (shouldPlay) {
      void media.play().catch(() => {
        updatePersistentPlayback(resource.id, { playing: false });
      });
    }
  }, [
    currentTime,
    mediaRef,
    resource.id,
    shouldPlay,
    updatePersistentPlayback,
  ]);

  const handlePlay = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      syncFromMedia(event.currentTarget, true);
    },
    [syncFromMedia],
  );

  const handlePause = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      syncFromMedia(event.currentTarget, false);
    },
    [syncFromMedia],
  );

  const handleTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      syncFromMedia(event.currentTarget);
    },
    [syncFromMedia],
  );

  const handleEnded = useCallback(
    (event: SyntheticEvent<HTMLMediaElement>) => {
      syncFromMedia(event.currentTarget, false);
      advancePersistentPlaylist();
    },
    [advancePersistentPlaylist, syncFromMedia],
  );

  return {
    handleEnded,
    handleLoadedMetadata: restorePlayback,
    handlePause,
    handlePlay,
    handleTimeUpdate,
  };
}

function MiniAudioPlayer({
  resource,
  src,
}: {
  resource: ResourceDto;
  src: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useHlsSource(audioRef, src);
  const events = useMiniPlayerEvents(resource, audioRef);

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        controls
        crossOrigin="anonymous"
        preload="metadata"
        className="w-full"
        aria-label={resource.title ?? "Audio"}
        onEnded={events.handleEnded}
        onLoadedMetadata={events.handleLoadedMetadata}
        onPause={events.handlePause}
        onPlay={events.handlePlay}
        onTimeUpdate={events.handleTimeUpdate}
      />
      <AudioVisualizer mediaRef={audioRef} variant="compact" />
    </div>
  );
}

function MiniVideoPlayer({
  resource,
  src,
}: {
  resource: ResourceDto;
  src: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useHlsSource(videoRef, src);
  const events = useMiniPlayerEvents(resource, videoRef);

  return (
    <div className="space-y-2 p-2">
      <video
        ref={videoRef}
        controls
        crossOrigin="anonymous"
        preload="metadata"
        poster={resource.coverUrl ?? undefined}
        className="aspect-video w-full bg-black"
        aria-label={resource.title ?? "Video"}
        onEnded={events.handleEnded}
        onLoadedMetadata={events.handleLoadedMetadata}
        onPause={events.handlePause}
        onPlay={events.handlePlay}
        onTimeUpdate={events.handleTimeUpdate}
      />
      <AudioVisualizer mediaRef={videoRef} variant="compact" />
    </div>
  );
}

export function PersistentMediaPlayer() {
  const resource = useUiStore((state) => state.persistentResource);
  const playlist = useUiStore((state) => state.persistentPlaylist);
  const closePersistentPlayback = useUiStore(
    (state) => state.closePersistentPlayback,
  );
  const playPersistentPlaylistIndex = useUiStore(
    (state) => state.playPersistentPlaylistIndex,
  );
  const pathname = usePathname();

  if (!resource?.playbackUrl || resource.status !== "ready") {
    return null;
  }

  if (pathname === `/resources/${resource.id}`) {
    return null;
  }

  const Icon = resource.mediaType === "audio" ? Headphones : Video;
  const hasPlaylist = Boolean(playlist && playlist.resources.length > 1);
  const currentIndex = playlist?.currentIndex ?? 0;
  const canPlayPrevious = hasPlaylist && currentIndex > 0;
  const canPlayNext =
    hasPlaylist && currentIndex < (playlist?.resources.length ?? 0) - 1;

  return (
    <aside
      data-testid="persistent-media-player"
      className="border-gold/20 bg-background fixed right-4 bottom-4 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border shadow-2xl"
    >
      <div className="border-border space-y-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon className="text-gold size-4 shrink-0" />
          <Link
            href={`/resources/${resource.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
          >
            {resource.title ?? "Sem titulo"}
          </Link>
          <Button asChild type="button" size="icon" variant="ghost">
            <Link href={`/resources/${resource.id}`} aria-label="Abrir recurso">
              <ExternalLink className="size-4" />
            </Link>
          </Button>
          <FavoriteToggleButton resource={resource} />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Fechar player"
            onClick={closePersistentPlayback}
          >
            <X className="size-4" />
          </Button>
        </div>

        {playlist ? (
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
            <ListMusic className="text-gold size-3.5 shrink-0" />
            <span className="truncate">{playlist.title}</span>
            <span className="shrink-0">
              {playlist.currentIndex + 1}/{playlist.resources.length}
            </span>
          </div>
        ) : null}

        {hasPlaylist ? (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={!canPlayPrevious}
              aria-label="Faixa anterior"
              onClick={() => playPersistentPlaylistIndex(currentIndex - 1)}
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={!canPlayNext}
              aria-label="Proxima faixa"
              onClick={() => playPersistentPlaylistIndex(currentIndex + 1)}
            >
              <SkipForward className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {resource.mediaType === "video" ? (
        <MiniVideoPlayer resource={resource} src={resource.playbackUrl} />
      ) : (
        <div className="p-3">
          <MiniAudioPlayer resource={resource} src={resource.playbackUrl} />
        </div>
      )}
    </aside>
  );
}
