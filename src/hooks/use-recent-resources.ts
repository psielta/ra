"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type { RecentResourceDto } from "@/lib/validations/dashboard";

export const recentResourcesQueryKey = ["dashboard", "recent"] as const;

export function useRecentResources() {
  return useQuery({
    queryKey: recentResourcesQueryKey,
    queryFn: async () => {
      const { data } = await api.get<RecentResourceDto[]>("/dashboard/recent");
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}
