"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type {
  ResourceDto,
  UpdateResourceInput,
} from "@/lib/validations/series";

export const resourcesQueryKey = ["resources"] as const;

type ResourceFilters = {
  seriesId?: string;
  mediaType?: "audio" | "video";
  q?: string;
};

export function useResources(
  filters?: ResourceFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...resourcesQueryKey, filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.seriesId) params.set("seriesId", filters.seriesId);
      if (filters?.mediaType) params.set("mediaType", filters.mediaType);
      if (filters?.q) params.set("q", filters.q);

      const query = params.toString();
      const { data } = await api.get<ResourceDto[]>(
        `/resources${query ? `?${query}` : ""}`,
      );
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: [...resourcesQueryKey, id],
    queryFn: async () => {
      const { data } = await api.get<ResourceDto>(`/resources/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateResource(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateResourceInput) => {
      const { data } = await api.patch<ResourceDto>(`/resources/${id}`, input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...resourcesQueryKey, id],
      });
      void queryClient.invalidateQueries({ queryKey: ["series"] });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resources/${id}`);
      return id;
    },
    onSuccess: (_id, resourceId) => {
      void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
      void queryClient.removeQueries({
        queryKey: [...resourcesQueryKey, resourceId],
      });
      void queryClient.invalidateQueries({ queryKey: ["series"] });
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "recent"] });
    },
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      file: File;
      title?: string;
      description?: string;
      seriesId?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      if (input.title) formData.append("title", input.title);
      if (input.description) formData.append("description", input.description);
      if (input.seriesId) formData.append("seriesId", input.seriesId);

      const { data } = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["series"] });
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
