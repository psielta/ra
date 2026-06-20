import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarCollapsed: boolean;
  uploadDrawerOpen: boolean;
  uploadDrawerSeriesId: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openUploadDrawer: (seriesId?: string | null) => void;
  closeUploadDrawer: () => void;
  setUploadDrawerOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      uploadDrawerOpen: false,
      uploadDrawerSeriesId: null,
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
    }),
    {
      name: "ra-ui",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
