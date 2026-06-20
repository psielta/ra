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
import type { QueueJobDto } from "@/lib/validations/queue";
import { truncateText } from "@/lib/utils";

function formatQueuedAt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function QueueItemCard({ job }: { job: QueueJobDto }) {
  const Icon = job.mediaType === "audio" ? Headphones : Video;
  const title = job.title ?? "Sem título";

  return (
    <Card className="border-gold/15 overflow-hidden transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-base">
              <Link
                href={`/resources/${job.mediaAssetId}`}
                className="hover:text-gold transition-colors"
                title={title}
              >
                {truncateText(title)}
              </Link>
            </CardTitle>
            <CardDescription className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5 shrink-0" />
                {job.mediaType === "audio" ? "Música" : "Vídeo"}
              </span>
              <span className="text-muted-foreground/70">·</span>
              <span>Na fila desde {formatQueuedAt(job.createdAt)}</span>
              {job.series ? (
                <>
                  <span className="text-muted-foreground/70">·</span>
                  <Link
                    href={`/series/${job.series.id}`}
                    className="hover:text-gold"
                    title={job.series.title}
                  >
                    {truncateText(job.series.title)}
                  </Link>
                </>
              ) : null}
            </CardDescription>
          </div>
          <ResourceStatusBadge
            status="processing"
            progress={job.progress}
            className="shrink-0"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="bg-gold h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          {job.progress > 0
            ? `${Math.round(job.progress)}% concluído`
            : "Aguardando worker FFmpeg — progresso em tempo real na próxima fase (Redis/SSE)."}
        </p>
      </CardContent>
    </Card>
  );
}
