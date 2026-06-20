"use client";

import { Loader2 } from "lucide-react";

import { PlaylistCard } from "@/components/playlists/playlist-card";
import { usePlaylistList } from "@/hooks/use-playlists";

export function PlaylistList() {
  const { data: playlists = [], isLoading } = usePlaylistList();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Carregando playlists...
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="border-gold/20 bg-muted/20 rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhuma playlist criada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {playlists.map((playlist) => (
        <PlaylistCard key={playlist.id} playlist={playlist} />
      ))}
    </div>
  );
}
