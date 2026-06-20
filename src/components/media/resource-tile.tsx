import { Headphones, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import type { QueueJobDto } from "@/lib/validations/queue";
import type { ResourceDto } from "@/lib/validations/series";
import { cn, truncateText } from "@/lib/utils";

export type ResourceTileProps = {
  href: string;
  title: string | null;
  mediaType: "audio" | "video";
  status: ResourceDto["status"];
  progress: number;
  coverUrl?: string | null;
  className?: string;
};

export function resourceToTileProps(resource: ResourceDto): ResourceTileProps {
  return {
    href: `/resources/${resource.id}`,
    title: resource.title,
    mediaType: resource.mediaType,
    status: resource.status,
    progress: resource.progress,
    coverUrl: resource.coverUrl,
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
}: ResourceTileProps) {
  const Icon = mediaType === "audio" ? Headphones : Video;
  const showCover = mediaType === "video" && Boolean(coverUrl);
  const displayTitle = title ?? "Sem título";

  return (
    <Link
      href={href}
      className={cn("group w-36 shrink-0", className)}
      title={displayTitle}
    >
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
      <p className="group-hover:text-gold mt-2 text-sm leading-snug font-medium transition-colors">
        {truncateText(displayTitle)}
      </p>
      <p className="text-muted-foreground text-xs">
        {mediaType === "audio" ? "Música" : "Vídeo"}
      </p>
    </Link>
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
