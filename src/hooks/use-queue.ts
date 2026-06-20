"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type { QueueJobDto } from "@/lib/validations/queue";

export const queueQueryKey = ["queue"] as const;

export function useQueueJobs() {
  return useQuery({
    queryKey: queueQueryKey,
    queryFn: async () => {
      const { data } = await api.get<QueueJobDto[]>("/queue");
      return data;
    },
    refetchInterval: (query) => (query.state.data?.length ? 5000 : 15000),
  });
}
