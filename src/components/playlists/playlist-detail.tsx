"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Loader2,
  Music,
  Pencil,
  Play,
  Plus,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FavoriteToggleButton } from "@/components/media/favorite-toggle-button";
import { PlaylistDeleteDialog } from "@/components/playlists/playlist-delete-dialog";
import { PlaylistEditDrawer } from "@/components/playlists/playlist-edit-drawer";
import { Button } from "@/components/ui/button";
import {
  useAddPlaylistItems,
  usePlaylistDetail,
  useRemovePlaylistItem,
  useReorderPlaylistItems,
} from "@/hooks/use-playlists";
import { useResources } from "@/hooks/use-resources";
import type { ResourceDto } from "@/lib/validations/series";
import { truncateText } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

function playableResources(resources: ResourceDto[]) {
  return resources.filter(
    (resource) => resource.status === "ready" && Boolean(resource.playbackUrl),
  );
}

function ResourceIcon({ resource }: { resource: ResourceDto }) {
  const Icon = resource.mediaType === "audio" ? Music : Video;

  return (
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
  );
}

export function PlaylistDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: playlist, isLoading, isError } = usePlaylistDetail(id);
  const { data: resources = [] } = useResources();
  const startPersistentPlaylist = useUiStore(
    (state) => state.startPersistentPlaylist,
  );
  const reorderItems = useReorderPlaylistItems(id);
  const removeItem = useRemovePlaylistItem(id);
  const addItems = useAddPlaylistItems();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const playlistResourceIds = useMemo(
    () => new Set(playlist?.resources.map((resource) => resource.id) ?? []),
    [playlist?.resources],
  );
  const availableResources = useMemo(
    () =>
      playableResources(resources)
        .filter((resource) => !playlistResourceIds.has(resource.id))
        .slice(0, 12),
    [playlistResourceIds, resources],
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Carregando playlist...
      </div>
    );
  }

  if (isError || !playlist) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">Playlist nao encontrada.</p>
        <Button asChild variant="outline">
          <Link href="/playlists">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const currentPlaylist = playlist;
  const playable = playableResources(currentPlaylist.resources);

  async function moveResource(resourceId: string, direction: -1 | 1) {
    const index = currentPlaylist.resources.findIndex(
      (resource) => resource.id === resourceId,
    );
    const nextIndex = index + direction;

    if (
      index < 0 ||
      nextIndex < 0 ||
      nextIndex >= currentPlaylist.resources.length
    ) {
      return;
    }

    const nextResources = [...currentPlaylist.resources];
    const [resource] = nextResources.splice(index, 1);
    if (!resource) return;
    nextResources.splice(nextIndex, 0, resource);

    try {
      await reorderItems.mutateAsync({
        resourceIds: nextResources.map((item) => item.id),
      });
    } catch (error) {
      toast.error("Nao foi possivel reordenar a playlist", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  async function handleRemove(resource: ResourceDto) {
    try {
      await removeItem.mutateAsync(resource.id);
      toast.success("Item removido", {
        description: `"${resource.title ?? "Sem titulo"}" saiu da playlist.`,
      });
    } catch (error) {
      toast.error("Nao foi possivel remover o item", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  async function handleAdd(resource: ResourceDto) {
    try {
      await addItems.mutateAsync({
        playlistId: currentPlaylist.id,
        input: { resourceIds: [resource.id] },
      });
      toast.success("Item adicionado", {
        description: `"${resource.title ?? "Sem titulo"}" entrou na playlist.`,
      });
    } catch (error) {
      toast.error("Nao foi possivel adicionar o item", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/playlists">
          <ArrowLeft className="size-4" />
          Playlists
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {playlist.isFavorites ? (
              <Star className="text-gold size-5 shrink-0 fill-current" />
            ) : null}
            <h2
              className="font-display text-2xl tracking-wide"
              title={playlist.title}
            >
              {truncateText(playlist.title)}
            </h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {playlist.itemCount} {playlist.itemCount === 1 ? "item" : "itens"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              startPersistentPlaylist({
                seriesId: playlist.id,
                title: playlist.title,
                resources: playable,
              })
            }
            disabled={playable.length === 0}
          >
            <Play className="size-4 fill-current" />
            Reproduzir playlist
          </Button>
          {!playlist.isFavorites ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Excluir
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {playlist.resources.length === 0 ? (
        <div className="border-gold/20 bg-muted/20 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum item nesta playlist.
          </p>
        </div>
      ) : (
        <div className="border-gold/15 overflow-hidden rounded-md border">
          <div className="bg-muted/40 text-muted-foreground grid grid-cols-[1fr_auto] gap-3 px-4 py-2 text-xs font-medium">
            <span>Item</span>
            <span>Acoes</span>
          </div>
          <div className="divide-border divide-y">
            {playlist.resources.map((resource, index) => (
              <div
                key={resource.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ResourceIcon resource={resource} />
                  <div className="min-w-0">
                    <Link
                      href={`/resources/${resource.id}`}
                      className="font-medium hover:underline"
                    >
                      {resource.title ?? "Sem titulo"}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {resource.mediaType === "audio" ? "Musica" : "Video"} -{" "}
                      {formatDistanceToNow(new Date(resource.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <FavoriteToggleButton resource={resource} />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={index === 0 || reorderItems.isPending}
                    aria-label="Mover item para cima"
                    onClick={() => void moveResource(resource.id, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={
                      index === playlist.resources.length - 1 ||
                      reorderItems.isPending
                    }
                    aria-label="Mover item para baixo"
                    onClick={() => void moveResource(resource.id, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="size-8"
                  >
                    <Link
                      href={`/resources/${resource.id}`}
                      aria-label="Abrir recurso"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={removeItem.isPending}
                    aria-label="Remover da playlist"
                    onClick={() => void handleRemove(resource)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableResources.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-display text-lg tracking-wide">Adicionar</h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {availableResources.map((resource) => (
              <div
                key={resource.id}
                className="border-gold/15 flex items-center gap-3 rounded-md border p-3"
              >
                <ResourceIcon resource={resource} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {resource.title ?? "Sem titulo"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {resource.mediaType === "audio" ? "Musica" : "Video"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={addItems.isPending}
                  onClick={() => void handleAdd(resource)}
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
                <FavoriteToggleButton resource={resource} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <PlaylistEditDrawer
        playlist={playlist}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <PlaylistDeleteDialog
        playlist={playlist}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/playlists")}
      />
    </div>
  );
}
