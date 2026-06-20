"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { PlaylistCreateDrawer } from "@/components/playlists/playlist-create-drawer";
import { PlaylistList } from "@/components/playlists/playlist-list";
import { Button } from "@/components/ui/button";

export function PlaylistsPageClient() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-wide">Playlists</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Listas de reproducao para ouvir musicas e videos em sequencia.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova playlist
        </Button>
      </div>

      <PlaylistList />

      <PlaylistCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
