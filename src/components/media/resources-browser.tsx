"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Music, Search, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobEventSources } from "@/hooks/use-job-events";
import { useResources } from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";
import type { ResourceDto } from "@/lib/validations/series";

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
  const jobTargets = useMemo(
    () =>
      resources
        .filter(
          (resource) => resource.status === "processing" && resource.jobId,
        )
        .map((resource) => ({
          jobId: resource.jobId as string,
          mediaAssetId: resource.id,
        })),
    [resources],
  );
  useJobEventSources(jobTargets);

  const columns = useMemo<ColumnDef<ResourceDto>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Recurso",
        cell: ({ row }) => {
          const resource = row.original;
          const Icon = resource.mediaType === "audio" ? Music : Video;

          return (
            <div className="flex min-w-56 items-center gap-3">
              <span
                className="bg-gold/10 text-gold relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-cover bg-center"
                style={
                  resource.mediaType === "video" && resource.coverUrl
                    ? { backgroundImage: `url("${resource.coverUrl}")` }
                    : undefined
                }
              >
                {resource.mediaType === "video" && resource.coverUrl ? (
                  <span className="absolute inset-0 bg-black/25" />
                ) : null}
                <Icon className="relative z-10 size-4" />
              </span>
              <div className="min-w-0">
                <Link
                  href={`/resources/${resource.id}`}
                  className="font-medium hover:underline"
                >
                  {resource.title ?? "Sem titulo"}
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {resource.mediaType === "audio" ? "Musica" : "Video"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "series",
        header: "Serie",
        cell: ({ row }) =>
          row.original.series ? (
            <Link
              href={`/series/${row.original.series.id}`}
              className="text-gold hover:underline"
            >
              {row.original.series.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">Sem serie</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <ResourceStatusBadge
            status={row.original.status}
            progress={row.original.progress}
          />
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Criado",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/resources/${row.original.id}`}>
              <ExternalLink className="size-4" />
              Abrir
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

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
          <option value="audio">Musicas</option>
          <option value="video">Videos</option>
        </select>

        <select
          value={seriesId}
          onChange={(event) => setSeriesId(event.target.value)}
          className="border-input bg-background h-9 min-w-48 rounded-md border px-3 text-sm"
          aria-label="Filtrar por serie"
        >
          <option value="">Todas as series</option>
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
              : "Nenhum recurso encontrado. Envie um MP3 ou MP4 para comecar."}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={resources}
          emptyMessage="Nenhum recurso encontrado."
        />
      )}
    </div>
  );
}
