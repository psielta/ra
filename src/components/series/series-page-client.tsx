"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { SeriesCreateDrawer } from "@/components/series/series-create-drawer";
import { SeriesList } from "@/components/series/series-list";
import { Button } from "@/components/ui/button";

export function SeriesPageClient() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-wide">Séries</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Organize músicas e vídeos em categorias — coletâneas, projetos,
            playlists temáticas ou qualquer agrupamento que fizer sentido.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova série
        </Button>
      </div>

      <SeriesList />

      <SeriesCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
