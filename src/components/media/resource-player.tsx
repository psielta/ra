"use client";

import Hls from "hls.js";
import { Headphones, Loader2, Video } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";

import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import type { ResourceDto } from "@/lib/validations/series";

function useHlsSource<T extends HTMLMediaElement>(
  mediaRef: RefObject<T | null>,
  src: string,
) {
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (media.canPlayType("application/vnd.apple.mpegurl")) {
      media.src = src;
      return;
    }

    if (!Hls.isSupported()) {
      media.src = src;
      return;
    }

    const hls = new Hls({ enableWorker: true });
    hls.loadSource(src);
    hls.attachMedia(media);

    return () => {
      hls.destroy();
    };
  }, [mediaRef, src]);
}

function HlsAudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useHlsSource(audioRef, src);

  return (
    <audio
      ref={audioRef}
      controls
      preload="metadata"
      className="w-full"
      aria-label={title}
    >
      Seu navegador nao suporta reproducao de audio HLS.
    </audio>
  );
}

function HlsVideoPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useHlsSource(videoRef, src);

  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      className="aspect-video w-full rounded-md bg-black"
      aria-label={title}
    />
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
