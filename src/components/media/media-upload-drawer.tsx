"use client";

import { Upload } from "lucide-react";

import { MediaUploadForm } from "@/components/media/media-upload-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUiStore } from "@/stores/ui-store";

export function MediaUploadDrawer() {
  const open = useUiStore((state) => state.uploadDrawerOpen);
  const seriesId = useUiStore((state) => state.uploadDrawerSeriesId);
  const setOpen = useUiStore((state) => state.setUploadDrawerOpen);
  const closeUploadDrawer = useUiStore((state) => state.closeUploadDrawer);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="border-gold/15 w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader className="border-gold/10 border-b pr-10 pb-4">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Upload className="text-gold size-4" />
            Upload sem sair da pagina
          </div>
          <SheetTitle className="font-display text-lg tracking-wide">
            Enviar midia
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6">
          <MediaUploadForm
            key={seriesId ?? "no-series"}
            defaultSeriesId={seriesId ?? undefined}
            onSuccess={closeUploadDrawer}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
