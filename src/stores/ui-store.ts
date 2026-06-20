import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ResourceDto } from "@/lib/validations/series";

export type PersistentPlaylist = {
  seriesId: string;
  title: string;
  resources: ResourceDto[];
  currentIndex: number;
};

interface UiState {
  sidebarCollapsed: boolean;
  uploadDrawerOpen: boolean;
  uploadDrawerSeriesId: string | null;
  persistentResource: ResourceDto | null;
  persistentCurrentTime: number;
  persistentDuration: number;
  persistentPlaying: boolean;
  persistentPlaylist: PersistentPlaylist | null;
  hlsSegmentPulseId: number;
  hlsLastSegmentFileName: string | null;
  hlsLastSegmentBytes: number | null;
  hlsLastSegmentReceivedAt: number | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openUploadDrawer: (seriesId?: string | null) => void;
  closeUploadDrawer: () => void;
  setUploadDrawerOpen: (open: boolean) => void;
  startPersistentPlayback: (
    resource: ResourceDto,
    playlist?: Omit<PersistentPlaylist, "currentIndex"> | null,
  ) => void;
  startPersistentPlaylist: (input: {
    seriesId: string;
    title: string;
    resources: ResourceDto[];
    startResourceId?: string;
  }) => void;
  updatePersistentPlayback: (
    resourceId: string,
    state: {
      currentTime?: number;
      duration?: number;
      playing?: boolean;
    },
  ) => void;
  advancePersistentPlaylist: () => void;
  playPersistentPlaylistIndex: (index: number) => void;
  closePersistentPlayback: () => void;
  pulseHlsSegment: (segment: {
    fileName: string;
    bytes: number | null;
  }) => void;
}

function playableResources(resources: ResourceDto[]) {
  return resources.filter(
    (resource) => resource.status === "ready" && Boolean(resource.playbackUrl),
  );
}

function playlistForResource(
  resource: ResourceDto,
  playlist: Omit<PersistentPlaylist, "currentIndex">,
): PersistentPlaylist {
  const resources = playableResources(playlist.resources);
  const currentIndex = Math.max(
    0,
    resources.findIndex((item) => item.id === resource.id),
  );

  return {
    ...playlist,
    resources,
    currentIndex,
  };
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      uploadDrawerOpen: false,
      uploadDrawerSeriesId: null,
      persistentResource: null,
      persistentCurrentTime: 0,
      persistentDuration: 0,
      persistentPlaying: false,
      persistentPlaylist: null,
      hlsSegmentPulseId: 0,
      hlsLastSegmentFileName: null,
      hlsLastSegmentBytes: null,
      hlsLastSegmentReceivedAt: null,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      openUploadDrawer: (seriesId) =>
        set({
          uploadDrawerOpen: true,
          uploadDrawerSeriesId: seriesId ?? null,
        }),
      closeUploadDrawer: () =>
        set({ uploadDrawerOpen: false, uploadDrawerSeriesId: null }),
      setUploadDrawerOpen: (open) =>
        set((state) => ({
          uploadDrawerOpen: open,
          uploadDrawerSeriesId: open ? state.uploadDrawerSeriesId : null,
        })),
      startPersistentPlayback: (resource, playlist) =>
        set((state) => {
          const currentPlaylist =
            playlist === undefined
              ? state.persistentPlaylist
              : playlist
                ? playlistForResource(resource, playlist)
                : null;
          const playlistIndex = currentPlaylist?.resources.findIndex(
            (item) => item.id === resource.id,
          );

          return {
            persistentResource: resource,
            persistentCurrentTime:
              state.persistentResource?.id === resource.id
                ? state.persistentCurrentTime
                : 0,
            persistentDuration:
              state.persistentResource?.id === resource.id
                ? state.persistentDuration
                : 0,
            persistentPlaying: true,
            persistentPlaylist:
              currentPlaylist &&
              playlistIndex !== undefined &&
              playlistIndex >= 0
                ? { ...currentPlaylist, currentIndex: playlistIndex }
                : null,
          };
        }),
      startPersistentPlaylist: (input) =>
        set(() => {
          const resources = playableResources(input.resources);
          const currentIndex = Math.max(
            0,
            resources.findIndex((item) => item.id === input.startResourceId),
          );
          const resource = resources[currentIndex];

          if (!resource) {
            return {};
          }

          return {
            persistentResource: resource,
            persistentCurrentTime: 0,
            persistentDuration: 0,
            persistentPlaying: true,
            persistentPlaylist: {
              seriesId: input.seriesId,
              title: input.title,
              resources,
              currentIndex,
            },
          };
        }),
      updatePersistentPlayback: (resourceId, playback) =>
        set((state) => {
          if (state.persistentResource?.id !== resourceId) {
            return {};
          }

          return {
            persistentCurrentTime:
              playback.currentTime ?? state.persistentCurrentTime,
            persistentDuration: playback.duration ?? state.persistentDuration,
            persistentPlaying: playback.playing ?? state.persistentPlaying,
          };
        }),
      advancePersistentPlaylist: () =>
        set((state) => {
          if (!state.persistentPlaylist) {
            return { persistentPlaying: false };
          }

          const currentIndex = state.persistentPlaylist.resources.findIndex(
            (resource) => resource.id === state.persistentResource?.id,
          );
          const nextIndex =
            (currentIndex >= 0
              ? currentIndex
              : state.persistentPlaylist.currentIndex) + 1;
          const nextResource = state.persistentPlaylist.resources[nextIndex];

          if (!nextResource) {
            return {
              persistentPlaying: false,
              persistentCurrentTime: 0,
              persistentDuration: 0,
              persistentPlaylist: {
                ...state.persistentPlaylist,
                currentIndex: Math.max(
                  0,
                  state.persistentPlaylist.resources.length - 1,
                ),
              },
            };
          }

          return {
            persistentResource: nextResource,
            persistentCurrentTime: 0,
            persistentDuration: 0,
            persistentPlaying: true,
            persistentPlaylist: {
              ...state.persistentPlaylist,
              currentIndex: nextIndex,
            },
          };
        }),
      playPersistentPlaylistIndex: (index) =>
        set((state) => {
          const resource = state.persistentPlaylist?.resources[index];

          if (!state.persistentPlaylist || !resource) {
            return {};
          }

          return {
            persistentResource: resource,
            persistentCurrentTime: 0,
            persistentDuration: 0,
            persistentPlaying: true,
            persistentPlaylist: {
              ...state.persistentPlaylist,
              currentIndex: index,
            },
          };
        }),
      closePersistentPlayback: () =>
        set({
          persistentResource: null,
          persistentCurrentTime: 0,
          persistentDuration: 0,
          persistentPlaying: false,
          persistentPlaylist: null,
        }),
      pulseHlsSegment: (segment) =>
        set((state) => ({
          hlsSegmentPulseId: state.hlsSegmentPulseId + 1,
          hlsLastSegmentFileName: segment.fileName,
          hlsLastSegmentBytes: segment.bytes,
          hlsLastSegmentReceivedAt: Date.now(),
        })),
    }),
    {
      name: "ra-ui",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
