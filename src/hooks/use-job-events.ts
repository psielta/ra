"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { queueQueryKey } from "@/hooks/use-queue";
import { resourcesQueryKey } from "@/hooks/use-resources";
import {
  jobRealtimeEventSchema,
  type JobRealtimeEvent,
} from "@/lib/validations/job-events";
import type { QueueJobDto } from "@/lib/validations/queue";
import type { ResourceDto } from "@/lib/validations/series";

export type JobEventTarget = {
  jobId: string;
  mediaAssetId?: string | null;
};

function shouldApplyEvent(
  resource: ResourceDto,
  event: JobRealtimeEvent,
  target?: JobEventTarget,
) {
  return (
    resource.jobId === event.jobId ||
    resource.id === event.mediaAssetId ||
    (target?.mediaAssetId ? resource.id === target.mediaAssetId : false)
  );
}

function applyEventToResource(
  resource: ResourceDto,
  event: JobRealtimeEvent,
  target?: JobEventTarget,
): ResourceDto {
  if (!shouldApplyEvent(resource, event, target)) {
    return resource;
  }

  return {
    ...resource,
    status: event.status,
    progress: event.progressPercentage,
    playbackUrl:
      event.playbackUrl !== undefined
        ? event.playbackUrl
        : resource.playbackUrl,
    coverUrl: event.coverUrl !== undefined ? event.coverUrl : resource.coverUrl,
    errorMessage:
      event.errorMessage !== undefined
        ? event.errorMessage
        : resource.errorMessage,
    updatedAt: event.timestamp,
  };
}

function applyEventToQueue(jobs: QueueJobDto[], event: JobRealtimeEvent) {
  if (event.type === "completed" || event.type === "failed") {
    return jobs.filter((job) => job.jobId !== event.jobId);
  }

  return jobs.map((job) =>
    job.jobId === event.jobId
      ? {
          ...job,
          progress: event.progressPercentage,
          updatedAt: event.timestamp,
        }
      : job,
  );
}

export function useJobEventSources(targets: JobEventTarget[]) {
  const queryClient = useQueryClient();
  const targetKey = targets
    .map((target) => `${target.jobId}:${target.mediaAssetId ?? ""}`)
    .sort()
    .join("|");

  useEffect(() => {
    const activeTargets = targetKey
      ? targetKey.split("|").map((entry) => {
          const [jobId, mediaAssetId] = entry.split(":");
          return { jobId, mediaAssetId: mediaAssetId || null };
        })
      : [];

    if (activeTargets.length === 0) {
      return;
    }

    const sources = activeTargets.map((target) => {
      const source = new EventSource(`/api/media/jobs/${target.jobId}/events`);

      source.addEventListener("job", (message) => {
        let payload: unknown;

        try {
          payload = JSON.parse(
            (message as MessageEvent<string>).data,
          ) as unknown;
        } catch {
          return;
        }

        const parsed = jobRealtimeEventSchema.safeParse(payload);

        if (!parsed.success) {
          return;
        }

        const event = parsed.data;

        queryClient.setQueriesData<ResourceDto[] | ResourceDto>(
          { queryKey: resourcesQueryKey },
          (oldData) => {
            if (!oldData) return oldData;

            if (Array.isArray(oldData)) {
              return oldData.map((resource) =>
                applyEventToResource(resource, event, target),
              );
            }

            return applyEventToResource(oldData, event, target);
          },
        );

        queryClient.setQueryData<QueueJobDto[]>(queueQueryKey, (oldData = []) =>
          applyEventToQueue(oldData, event),
        );

        if (event.type === "completed" || event.type === "failed") {
          void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
          void queryClient.invalidateQueries({ queryKey: queueQueryKey });
          void queryClient.invalidateQueries({
            queryKey: ["dashboard", "recent"],
          });
        }
      });

      source.onerror = () => {
        source.close();
      };

      return source;
    });

    return () => {
      for (const source of sources) {
        source.close();
      }
    };
  }, [queryClient, targetKey]);
}
