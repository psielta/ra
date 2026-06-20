"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  ResourceTileGrid,
  resourceToTileProps,
} from "@/components/media/resource-tile";
import { ResourceTileMenu } from "@/components/media/resource-tile-menu";
import { Input } from "@/components/ui/input";
import { useResources } from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";

export function ResourcesBrowser() {
  const [mediaType, setMediaType] = useState<"" | "audio" | "video">("");
  const [seriesId, setSeriesId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const filters = useMemo(
    () => ({
      ...(mediaType ? { mediaType } : {}),
      ...(seriesId ? { seriesId } : {}),
      ...(debouncedQuery ? { q: debouncedQuery } : {}),
    }),
    [mediaType, seriesId, debouncedQuery],
  );

  const hasActiveFilters = Boolean(debouncedQuery || seriesId || mediaType);

  const { data: resources = [], isLoading } = useResources(filters);
  const { data: seriesList = [] } = useSeriesList();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar recurso..."
            className="pl-9"
            aria-label="Buscar recurso"
          />
        </div>

        <select
          value={mediaType}
          onChange={(event) =>
            setMediaType(event.target.value as "" | "audio" | "video")
          }
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos os tipos</option>
          <option value="audio">Músicas</option>
          <option value="video">Vídeos</option>
        </select>

        <select
          value={seriesId}
          onChange={(event) => setSeriesId(event.target.value)}
          className="border-input bg-background h-9 min-w-48 rounded-md border px-3 text-sm"
          aria-label="Filtrar por série"
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
            {hasActiveFilters
              ? "Nenhum recurso encontrado com os filtros selecionados."
              : "Nenhum recurso encontrado. Envie um MP3 ou MP4 para começar."}
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
