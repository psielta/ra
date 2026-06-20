import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ResourceDto } from "@/lib/validations/series";

interface UiState {
  sidebarCollapsed: boolean;
  uploadDrawerOpen: boolean;
  uploadDrawerSeriesId: string | null;
  persistentResource: ResourceDto | null;
  persistentCurrentTime: number;
  persistentDuration: number;
  persistentPlaying: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openUploadDrawer: (seriesId?: string | null) => void;
  closeUploadDrawer: () => void;
  setUploadDrawerOpen: (open: boolean) => void;
  startPersistentPlayback: (resource: ResourceDto) => void;
  updatePersistentPlayback: (
    resourceId: string,
    state: {
      currentTime?: number;
      duration?: number;
      playing?: boolean;
    },
  ) => void;
  closePersistentPlayback: () => void;
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
      startPersistentPlayback: (resource) =>
        set((state) => ({
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
        })),
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
      closePersistentPlayback: () =>
        set({
          persistentResource: null,
          persistentCurrentTime: 0,
          persistentDuration: 0,
          persistentPlaying: false,
        }),
    }),
    {
      name: "ra-ui",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
