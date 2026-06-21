"use client";

import type { AxiosProgressEvent } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type { RecentResourceDto } from "@/lib/validations/dashboard";
import type { MediaUploadResponse } from "@/lib/validations/media";
import type {
  BulkUpdateResourcesInput,
  BulkDeleteResourcesInput,
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
    onSuccess: (resource) => {
      queryClient.setQueryData([...resourcesQueryKey, id], resource);
      void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...resourcesQueryKey, id],
      });
      void queryClient.invalidateQueries({ queryKey: ["series"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "recent"] });
    },
  });
}

function replaceResource<T extends ResourceDto>(
  resource: T,
  updated: ResourceDto,
) {
  return resource.id === updated.id
    ? ({ ...resource, ...updated } as T)
    : resource;
}

function replaceResourceCache(
  oldData: ResourceDto[] | ResourceDto | undefined,
  updated: ResourceDto,
) {
  if (!oldData) return oldData;

  if (Array.isArray(oldData)) {
    return oldData.map((resource) => replaceResource(resource, updated));
  }

  return replaceResource(oldData, updated);
}

export function useSetResourceFavorite(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isFavorite: boolean) => {
      const { data } = isFavorite
        ? await api.put<ResourceDto>(`/resources/${id}/favorite`)
        : await api.delete<ResourceDto>(`/resources/${id}/favorite`);

      return data;
    },
    onSuccess: (resource) => {
      queryClient.setQueriesData<ResourceDto[] | ResourceDto>(
        { queryKey: resourcesQueryKey },
        (oldData) => replaceResourceCache(oldData, resource),
      );
      queryClient.setQueriesData<RecentResourceDto[]>(
        { queryKey: ["dashboard", "recent"] },
        (oldData) =>
          oldData?.map((item) => replaceResource(item, resource)) ?? oldData,
      );
      void queryClient.invalidateQueries({ queryKey: ["series"] });
      void queryClient.invalidateQueries({ queryKey: ["playlists"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "recent"] });
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

export function useBulkUpdateResources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkUpdateResourcesInput) => {
      const { data } = await api.patch<{ count: number }>("/resources", input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["series"] });
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "recent"] });
    },
  });
}

export function useBulkDeleteResources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkDeleteResourcesInput) => {
      const { data } = await api.delete<{
        count: number;
        deletedStorageKeys: number;
        cancelledJobCount: number;
      }>("/resources", { data: input });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["series"] });
      void queryClient.invalidateQueries({ queryKey: ["playlists"] });
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
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      if (input.title) formData.append("title", input.title);
      if (input.description) formData.append("description", input.description);
      if (input.seriesId) formData.append("seriesId", input.seriesId);

      const handleProgress = (event: AxiosProgressEvent) => {
        if (event.total) {
          input.onProgress?.((100 * event.loaded) / event.total);
          return;
        }

        if (typeof event.progress === "number") {
          input.onProgress?.(event.progress * 100);
        }
      };

      const { data } = await api.post<MediaUploadResponse>(
        "/media/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: handleProgress,
        },
      );

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["series"] });
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
