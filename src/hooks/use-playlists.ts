"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type {
  AddPlaylistItemsInput,
  CreatePlaylistInput,
  PlaylistDetailDto,
  PlaylistDto,
  PlaylistListDto,
  ReorderPlaylistItemsInput,
  UpdatePlaylistInput,
} from "@/lib/validations/playlists";

export const playlistsQueryKey = ["playlists"] as const;

export function usePlaylistList() {
  return useQuery({
    queryKey: playlistsQueryKey,
    queryFn: async () => {
      const { data } = await api.get<PlaylistListDto[]>("/playlists");
      return data;
    },
  });
}

export function usePlaylistDetail(id: string) {
  return useQuery({
    queryKey: [...playlistsQueryKey, id],
    queryFn: async () => {
      const { data } = await api.get<PlaylistDetailDto>(`/playlists/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePlaylistInput) => {
      const { data } = await api.post<PlaylistDto>("/playlists", input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playlistsQueryKey });
    },
  });
}

export function useUpdatePlaylist(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePlaylistInput) => {
      const { data } = await api.patch<PlaylistDto>(`/playlists/${id}`, input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playlistsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...playlistsQueryKey, id],
      });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/playlists/${id}`);
      return id;
    },
    onSuccess: (_id, playlistId) => {
      void queryClient.invalidateQueries({ queryKey: playlistsQueryKey });
      void queryClient.removeQueries({
        queryKey: [...playlistsQueryKey, playlistId],
      });
    },
  });
}

export function useAddPlaylistItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playlistId,
      input,
    }: {
      playlistId: string;
      input: AddPlaylistItemsInput;
    }) => {
      const { data } = await api.post<{
        addedCount: number;
        skippedCount: number;
        itemCount: number;
      }>(`/playlists/${playlistId}/items`, input);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: playlistsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...playlistsQueryKey, variables.playlistId],
      });
    },
  });
}

export function useReorderPlaylistItems(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderPlaylistItemsInput) => {
      const { data } = await api.patch<{ count: number }>(
        `/playlists/${id}/items`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playlistsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...playlistsQueryKey, id],
      });
    },
  });
}

export function useRemovePlaylistItem(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resourceId: string) => {
      await api.delete(`/playlists/${id}/items/${resourceId}`);
      return resourceId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: playlistsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...playlistsQueryKey, id],
      });
    },
  });
}
