import { Headphones, Video } from "lucide-react";
import Link from "next/link";

import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import type { ResourceDto } from "@/lib/validations/series";
import { truncateText } from "@/lib/utils";

export function SeriesResourceTile({ resource }: { resource: ResourceDto }) {
  const Icon = resource.mediaType === "audio" ? Headphones : Video;
  const title = resource.title ?? "Sem título";

  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group w-36 shrink-0"
      title={title}
    >
      <div className="border-gold/15 bg-muted/30 group-hover:border-gold/35 relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border transition-colors">
        <Icon className="text-gold/80 size-10" />
        <div className="absolute top-2 right-2">
          <ResourceStatusBadge
            status={resource.status}
            progress={resource.progress}
            className="scale-90"
          />
        </div>
      </div>
      <p className="group-hover:text-gold mt-2 text-sm leading-snug font-medium transition-colors">
        {truncateText(title)}
      </p>
      <p className="text-muted-foreground text-xs">
        {resource.mediaType === "audio" ? "Música" : "Vídeo"}
      </p>
    </Link>
  );
}
