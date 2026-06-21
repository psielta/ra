"use client";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SeriesCommandMenuProvider } from "@/components/admin/series-command-menu";
import { MediaUploadDrawer } from "@/components/media/media-upload-drawer";
import { PersistentMediaPlayer } from "@/components/media/persistent-media-player";
import { UploadQueueRunner } from "@/components/media/upload-queue-runner";
import { RealtimeProvider } from "@/components/notifications/realtime-provider";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AdminShell({ children, title }: AdminShellProps) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <RealtimeProvider>
      <SeriesCommandMenuProvider>
        <div className="bg-background flex min-h-svh">
          <div className="hidden lg:block">
            <AdminSidebar className="fixed inset-y-0 left-0 z-30" />
          </div>

          <div
            className={cn(
              "flex min-h-svh min-w-0 flex-1 flex-col transition-all duration-300",
              sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-64",
            )}
          >
            <AdminHeader title={title} />
            <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>

          <MediaUploadDrawer />
          <PersistentMediaPlayer />
          <UploadQueueRunner />
        </div>
      </SeriesCommandMenuProvider>
    </RealtimeProvider>
  );
}
