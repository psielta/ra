"use client";

import { useMemo, useState } from "react";

import {
  ResourceTileGrid,
  resourceToTileProps,
} from "@/components/media/resource-tile";
import { ResourceTileMenu } from "@/components/media/resource-tile-menu";
import { useResources } from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";

export function ResourcesBrowser() {
  const [mediaType, setMediaType] = useState<"" | "audio" | "video">("");
  const [seriesId, setSeriesId] = useState("");

  const filters = useMemo(
    () => ({
      ...(mediaType ? { mediaType } : {}),
      ...(seriesId ? { seriesId } : {}),
    }),
    [mediaType, seriesId],
  );

  const { data: resources = [], isLoading } = useResources(filters);
  const { data: seriesList = [] } = useSeriesList();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={mediaType}
          onChange={(event) =>
            setMediaType(event.target.value as "" | "audio" | "video")
          }
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="audio">Músicas</option>
          <option value="video">Vídeos</option>
        </select>

        <select
          value={seriesId}
          onChange={(event) => setSeriesId(event.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Todas as séries</option>
          {seriesList.map((series) => (
            <option key={series.id} value={series.id}>
              {series.title}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando recursos...</p>
      ) : resources.length === 0 ? (
        <div className="border-gold/20 bg-muted/20 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum recurso encontrado. Envie um MP3 ou MP4 para começar.
          </p>
        </div>
      ) : (
        <ResourceTileGrid>
          {resources.map((resource) => (
            <ResourceTileMenu
              key={resource.id}
              tile={resourceToTileProps(resource)}
              resource={resource}
            />
          ))}
        </ResourceTileGrid>
      )}
    </div>
  );
}
