"use client";

import { ExternalLink, Headphones, Video, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
  type SyntheticEvent,
} from "react";

import { Button } from "@/components/ui/button";
import type { ResourceDto } from "@/lib/validations/series";
import { useUiStore } from "@/stores/ui-store";

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
    },
    [syncFromMedia],
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
    <audio
      ref={audioRef}
      controls
      preload="metadata"
      className="w-full"
      aria-label={resource.title ?? "Audio"}
      onEnded={events.handleEnded}
      onLoadedMetadata={events.handleLoadedMetadata}
      onPause={events.handlePause}
      onPlay={events.handlePlay}
      onTimeUpdate={events.handleTimeUpdate}
    />
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
    <video
      ref={videoRef}
      controls
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
  );
}

export function PersistentMediaPlayer() {
  const resource = useUiStore((state) => state.persistentResource);
  const closePersistentPlayback = useUiStore(
    (state) => state.closePersistentPlayback,
  );
  const pathname = usePathname();

  if (!resource?.playbackUrl || resource.status !== "ready") {
    return null;
  }

  if (pathname === `/resources/${resource.id}`) {
    return null;
  }

  const Icon = resource.mediaType === "audio" ? Headphones : Video;

  return (
    <aside className="border-gold/20 bg-background fixed right-4 bottom-4 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border shadow-2xl">
      <div className="border-border flex items-center gap-2 border-b px-3 py-2">
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
