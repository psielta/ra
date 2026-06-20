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
  className?: string;
};

export function resourceToTileProps(resource: ResourceDto): ResourceTileProps {
  return {
    href: `/resources/${resource.id}`,
    title: resource.title,
    mediaType: resource.mediaType,
    status: resource.status,
    progress: resource.progress,
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
  className,
}: ResourceTileProps) {
  const Icon = mediaType === "audio" ? Headphones : Video;
  const displayTitle = title ?? "Sem título";

  return (
    <Link
      href={href}
      className={cn("group w-36 shrink-0", className)}
      title={displayTitle}
    >
      <div className="border-gold/15 bg-muted/30 group-hover:border-gold/35 relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border transition-colors">
        <Icon className="text-gold/80 size-10" />
        <div className="absolute top-2 right-2">
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
