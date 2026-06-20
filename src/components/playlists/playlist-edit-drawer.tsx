"use client";

import { PlaylistForm } from "@/components/playlists/playlist-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PlaylistDto } from "@/lib/validations/playlists";

type PlaylistEditDrawerProps = {
  playlist: PlaylistDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PlaylistEditDrawer({
  playlist,
  open,
  onOpenChange,
}: PlaylistEditDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-gold/15 w-full sm:max-w-md">
        <SheetHeader className="border-gold/10 border-b pb-4">
          <SheetTitle className="font-display text-lg tracking-wide">
            Editar playlist
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PlaylistForm
            key={playlist.id}
            playlist={playlist}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
