"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type {
  CreateSeriesInput,
  SeriesDto,
  SeriesListDto,
  UpdateSeriesInput,
} from "@/lib/validations/series";

export const seriesQueryKey = ["series"] as const;

export type SeriesDetailDto = SeriesDto & {
  resources: import("@/lib/validations/series").ResourceDto[];
};

export function useSeriesList() {
  return useQuery({
    queryKey: seriesQueryKey,
    queryFn: async () => {
      const { data } = await api.get<SeriesListDto[]>("/series");
      return data;
    },
  });
}

export function useSeriesDetail(id: string) {
  return useQuery({
    queryKey: [...seriesQueryKey, id],
    queryFn: async () => {
      const { data } = await api.get<SeriesDetailDto>(`/series/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSeriesInput) => {
      const { data } = await api.post<SeriesDto>("/series", input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: seriesQueryKey });
    },
  });
}

export function useUpdateSeries(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSeriesInput) => {
      const { data } = await api.patch<SeriesDto>(`/series/${id}`, input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: seriesQueryKey });
      void queryClient.invalidateQueries({ queryKey: [...seriesQueryKey, id] });
    },
  });
}

export function useDeleteSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/series/${id}`);
      return id;
    },
    onSuccess: (_id, seriesId) => {
      void queryClient.invalidateQueries({ queryKey: seriesQueryKey });
      void queryClient.removeQueries({
        queryKey: [...seriesQueryKey, seriesId],
      });
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
