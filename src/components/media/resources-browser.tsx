"use client";

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ExternalLink,
  FolderInput,
  ListPlus,
  Loader2,
  Music,
  Play,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
} from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { FavoriteToggleButton } from "@/components/media/favorite-toggle-button";
import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobEventSources } from "@/hooks/use-job-events";
import { useAddPlaylistItems, usePlaylistList } from "@/hooks/use-playlists";
import {
  useBulkDeleteResources,
  useBulkUpdateResources,
  useResources,
} from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";
import type { ResourceDto } from "@/lib/validations/series";
import { useUiStore } from "@/stores/ui-store";

function IndeterminateCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate && !checked);
    }
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
      className="border-input accent-gold size-4 rounded"
    />
  );
}

export function ResourcesBrowser() {
  const [mediaType, setMediaType] = useState<"" | "audio" | "video">("");
  const [seriesId, setSeriesId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkSeriesId, setBulkSeriesId] = useState("");
  const [bulkPlaylistId, setBulkPlaylistId] = useState("");
  const bulkUpdateResources = useBulkUpdateResources();
  const bulkDeleteResources = useBulkDeleteResources();
  const addPlaylistItems = useAddPlaylistItems();
  const startPersistentPlayback = useUiStore(
    (state) => state.startPersistentPlayback,
  );

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
  const { data: playlistList = [] } = usePlaylistList();
  const selectedResources = useMemo(
    () => resources.filter((resource) => rowSelection[resource.id]),
    [resources, rowSelection],
  );
  const selectedCount = selectedResources.length;
  const selectedIds = useMemo(
    () => selectedResources.map((resource) => resource.id),
    [selectedResources],
  );
  const playableFilteredResources = useMemo(
    () =>
      resources
        .filter(
          (resource) =>
            resource.status === "ready" && Boolean(resource.playbackUrl),
        )
        .sort(
          (first, second) =>
            new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime(),
        ),
    [resources],
  );
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

  const playResource = useCallback(
    (resource: ResourceDto) => {
      if (resource.status !== "ready" || !resource.playbackUrl) return;

      const canUseSeriesPlaylist =
        Boolean(seriesId) &&
        Boolean(resource.series) &&
        resource.series?.id === seriesId;

      startPersistentPlayback(
        resource,
        canUseSeriesPlaylist && resource.series
          ? {
              seriesId: resource.series.id,
              title: resource.series.title,
              resources: playableFilteredResources,
            }
          : null,
      );
    },
    [playableFilteredResources, seriesId, startPersistentPlayback],
  );

  const columns = useMemo<ColumnDef<ResourceDto>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <IndeterminateCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            ariaLabel="Selecionar todos os recursos"
          />
        ),
        cell: ({ row }) => (
          <IndeterminateCheckbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            ariaLabel={`Selecionar ${row.original.title ?? "recurso"}`}
          />
        ),
      },
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
        cell: ({ row }) => {
          const resource = row.original;
          const canPlay =
            resource.status === "ready" && Boolean(resource.playbackUrl);

          return (
            <div className="flex justify-end gap-2">
              <FavoriteToggleButton resource={resource} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canPlay}
                onClick={() => playResource(resource)}
              >
                <Play className="size-4 fill-current" />
                Play
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/resources/${resource.id}`}>
                  <ExternalLink className="size-4" />
                  Abrir
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [playResource],
  );

  async function handleBulkSeriesUpdate() {
    if (!selectedIds.length || !bulkSeriesId) return;

    try {
      const result = await bulkUpdateResources.mutateAsync({
        ids: selectedIds,
        seriesId: bulkSeriesId === "__none" ? null : bulkSeriesId,
      });

      toast.success("Recursos atualizados", {
        description: `${result.count} item(ns) reorganizado(s).`,
      });
      setRowSelection({});
      setBulkSeriesId("");
    } catch (error) {
      toast.error("Nao foi possivel organizar os recursos", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  async function handleBulkPlaylistAdd() {
    if (!selectedIds.length || !bulkPlaylistId) return;

    const playlist = playlistList.find((item) => item.id === bulkPlaylistId);

    try {
      const result = await addPlaylistItems.mutateAsync({
        playlistId: bulkPlaylistId,
        input: { resourceIds: selectedIds },
      });

      toast.success("Playlist atualizada", {
        description: playlist
          ? `${result.addedCount} item(ns) adicionados a "${playlist.title}".`
          : `${result.addedCount} item(ns) adicionados.`,
      });
      setRowSelection({});
      setBulkPlaylistId("");
    } catch (error) {
      toast.error("Nao foi possivel adicionar a playlist", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;

    const confirmed = window.confirm(
      `Excluir ${selectedIds.length} recurso(s) selecionado(s)? Os arquivos tambem serao removidos do storage.`,
    );

    if (!confirmed) return;

    try {
      const result = await bulkDeleteResources.mutateAsync({
        ids: selectedIds,
      });

      toast.success("Recursos excluidos", {
        description: `${result.count} item(ns) removidos.`,
      });
      setRowSelection({});
      setBulkSeriesId("");
      setBulkPlaylistId("");
    } catch (error) {
      toast.error("Nao foi possivel excluir os recursos", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

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
        <div className="space-y-3">
          {selectedCount > 0 ? (
            <div className="border-gold/15 bg-muted/20 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3">
              <div className="text-sm">
                <span className="font-medium">{selectedCount}</span>{" "}
                selecionado(s)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkSeriesId}
                  onChange={(event) => setBulkSeriesId(event.target.value)}
                  className="border-input bg-background h-9 min-w-56 rounded-md border px-3 text-sm"
                  aria-label="Serie para aplicar aos selecionados"
                >
                  <option value="">Escolher serie</option>
                  <option value="__none">Remover da serie</option>
                  {seriesList.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.title}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    !bulkSeriesId ||
                    bulkUpdateResources.isPending ||
                    selectedIds.length === 0
                  }
                  onClick={() => void handleBulkSeriesUpdate()}
                >
                  {bulkUpdateResources.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FolderInput className="size-4" />
                  )}
                  Aplicar
                </Button>
                <select
                  value={bulkPlaylistId}
                  onChange={(event) => setBulkPlaylistId(event.target.value)}
                  className="border-input bg-background h-9 min-w-56 rounded-md border px-3 text-sm"
                  aria-label="Playlist para adicionar os selecionados"
                >
                  <option value="">Escolher playlist</option>
                  {playlistList.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.title}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    !bulkPlaylistId ||
                    addPlaylistItems.isPending ||
                    selectedIds.length === 0
                  }
                  onClick={() => void handleBulkPlaylistAdd()}
                >
                  {addPlaylistItems.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ListPlus className="size-4" />
                  )}
                  Adicionar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRowSelection({});
                    setBulkSeriesId("");
                    setBulkPlaylistId("");
                  }}
                >
                  Limpar selecao
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={
                    bulkDeleteResources.isPending || selectedIds.length === 0
                  }
                  onClick={() => void handleBulkDelete()}
                >
                  {bulkDeleteResources.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Excluir selecionados
                </Button>
              </div>
            </div>
          ) : null}

          <DataTable
            columns={columns}
            data={resources}
            emptyMessage="Nenhum recurso encontrado."
            getRowId={(resource) => resource.id}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        </div>
      )}
    </div>
  );
}
