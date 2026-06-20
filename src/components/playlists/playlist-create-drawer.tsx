"use client";

import { PlaylistForm } from "@/components/playlists/playlist-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PlaylistCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

export function PlaylistCreateDrawer({
  open,
  onOpenChange,
  onCreated,
}: PlaylistCreateDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-gold/15 w-full sm:max-w-md">
        <SheetHeader className="border-gold/10 border-b pb-4">
          <SheetTitle className="font-display text-lg tracking-wide">
            Nova playlist
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PlaylistForm
            onSaved={(id) => {
              onOpenChange(false);
              onCreated?.(id);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
