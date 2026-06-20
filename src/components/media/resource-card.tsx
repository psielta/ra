import { Headphones, Video } from "lucide-react";
import Link from "next/link";

import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResourceDto } from "@/lib/validations/series";
import { truncateText } from "@/lib/utils";

export function ResourceCard({
  resource,
  hideSeries = false,
}: {
  resource: ResourceDto;
  hideSeries?: boolean;
}) {
  const Icon = resource.mediaType === "audio" ? Headphones : Video;

  const title = resource.title ?? "Sem título";
  const displayTitle = truncateText(title);

  return (
    <Card className="border-gold/15 hover:border-gold/30 overflow-hidden transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-base">
              <Link
                href={`/resources/${resource.id}`}
                className="hover:text-gold transition-colors"
                title={title}
              >
                {displayTitle}
              </Link>
            </CardTitle>
            <CardDescription className="flex min-w-0 items-center gap-2">
              <Icon className="size-3.5 shrink-0" />
              <span className="shrink-0">
                {resource.mediaType === "audio" ? "Música" : "Vídeo"}
              </span>
              {!hideSeries && resource.series ? (
                <>
                  <span className="shrink-0">·</span>
                  <Link
                    href={`/series/${resource.series.id}`}
                    className="hover:text-gold min-w-0"
                    title={resource.series.title}
                  >
                    {truncateText(resource.series.title)}
                  </Link>
                </>
              ) : null}
            </CardDescription>
          </div>
          <ResourceStatusBadge
            status={resource.status}
            progress={resource.progress}
            className="shrink-0"
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {resource.description ?? "Sem descrição."}
        </p>
      </CardContent>
    </Card>
  );
}
