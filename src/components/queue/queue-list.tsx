"use client";

import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import {
  ResourceTileGrid,
  queueJobToTileProps,
} from "@/components/media/resource-tile";
import { ResourceTileMenu } from "@/components/media/resource-tile-menu";
import { useJobEventSources } from "@/hooks/use-job-events";
import { useQueueJobs } from "@/hooks/use-queue";

export function QueueList() {
  const { data: jobs = [], isLoading, isFetching } = useQueueJobs();
  const jobTargets = useMemo(
    () =>
      jobs.map((job) => ({
        jobId: job.jobId,
        mediaAssetId: job.mediaAssetId,
      })),
    [jobs],
  );
  useJobEventSources(jobTargets);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Carregando fila...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="border-gold/20 bg-muted/20 rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhum item em processamento. Quando você enviar um MP3 ou MP4, ele
          aparecerá aqui até o worker concluir a conversão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {jobs.length} {jobs.length === 1 ? "item" : "itens"} na fila
        {isFetching ? " · atualizando..." : null}
      </p>
      <ResourceTileGrid>
        {jobs.map((job) => (
          <ResourceTileMenu
            key={job.jobId}
            tile={queueJobToTileProps(job)}
            resource={{
              id: job.mediaAssetId,
              title: job.title,
              status: "processing",
            }}
          />
        ))}
      </ResourceTileGrid>
    </div>
  );
}
