"use client";

import { Headphones, Play, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import type { QueueJobDto } from "@/lib/validations/queue";
import type { ResourceDto } from "@/lib/validations/series";
import { cn, truncateText } from "@/lib/utils";
import { useUiStore, type PersistentPlaylist } from "@/stores/ui-store";

type ResourceTilePlaylist = Omit<PersistentPlaylist, "currentIndex">;

export type ResourceTileProps = {
  href: string;
  title: string | null;
  mediaType: "audio" | "video";
  status: ResourceDto["status"];
  progress: number;
  coverUrl?: string | null;
  className?: string;
  resource?: ResourceDto;
  playlist?: ResourceTilePlaylist;
};

export function resourceToTileProps(resource: ResourceDto): ResourceTileProps {
  return {
    href: `/resources/${resource.id}`,
    title: resource.title,
    mediaType: resource.mediaType,
    status: resource.status,
    progress: resource.progress,
    coverUrl: resource.coverUrl,
    resource,
  };
}

export function queueJobToTileProps(job: QueueJobDto): ResourceTileProps {
  return {
    href: `/resources/${job.mediaAssetId}`,
    title: job.title,
    mediaType: job.mediaType,
    status: "processing",
    progress: job.progress,
  };
}

export function ResourceTile({
  href,
  title,
  mediaType,
  status,
  progress,
  coverUrl,
  className,
  resource,
  playlist,
}: ResourceTileProps) {
  const startPersistentPlayback = useUiStore(
    (state) => state.startPersistentPlayback,
  );
  const Icon = mediaType === "audio" ? Headphones : Video;
  const showCover = mediaType === "video" && Boolean(coverUrl);
  const displayTitle = title ?? "Sem titulo";
  const canPlay = resource?.status === "ready" && Boolean(resource.playbackUrl);

  function handlePlay() {
    if (!resource || !canPlay) return;

    startPersistentPlayback(resource, playlist ?? null);
  }

  return (
    <div className={cn("group w-36 shrink-0", className)} title={displayTitle}>
      <div className="relative">
        <Link href={href} className="block" aria-label={displayTitle}>
          <div className="border-gold/15 bg-muted/30 group-hover:border-gold/35 relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border transition-colors">
            {showCover ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${coverUrl}")` }}
                />
                <span className="absolute inset-0 bg-black/25" />
              </>
            ) : null}
            <Icon
              className={cn(
                "text-gold/80 relative z-10 size-10",
                showCover && "text-papyrus drop-shadow",
              )}
            />
            <div className="absolute top-2 right-2 z-20">
              <ResourceStatusBadge
                status={status}
                progress={progress}
                className="scale-90"
              />
            </div>
          </div>
        </Link>

        {canPlay ? (
          <button
            type="button"
            className="bg-background/95 text-gold border-gold/20 hover:bg-gold hover:text-background focus-visible:ring-ring absolute bottom-2 left-2 z-30 flex size-8 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label={`Reproduzir ${displayTitle}`}
            onClick={handlePlay}
          >
            <Play className="size-4 fill-current" />
          </button>
        ) : null}
      </div>

      <Link href={href} className="block">
        <p className="group-hover:text-gold mt-2 text-sm leading-snug font-medium transition-colors">
          {truncateText(displayTitle)}
        </p>
        <p className="text-muted-foreground text-xs">
          {mediaType === "audio" ? "Musica" : "Video"}
        </p>
      </Link>
    </div>
  );
}

export function ResourceTileGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>{children}</div>
  );
}
