"use client";

import { ListPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAddPlaylistItems, usePlaylistList } from "@/hooks/use-playlists";

export function AddToPlaylistMenuItems({
  resourceIds,
  disabled,
  onAdded,
}: {
  resourceIds: string[];
  disabled?: boolean;
  onAdded?: () => void;
}) {
  const { data: playlists = [], isLoading } = usePlaylistList();
  const addItems = useAddPlaylistItems();

  async function handleAdd(playlistId: string, playlistTitle: string) {
    if (resourceIds.length === 0 || disabled) return;

    try {
      const result = await addItems.mutateAsync({
        playlistId,
        input: { resourceIds },
      });

      toast.success("Playlist atualizada", {
        description:
          result.addedCount > 0
            ? `${result.addedCount} item(ns) adicionados a "${playlistTitle}".`
            : `Todos os itens selecionados ja estavam em "${playlistTitle}".`,
      });

      onAdded?.();
    } catch (error) {
      toast.error("Nao foi possivel adicionar a playlist", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  if (isLoading) {
    return (
      <DropdownMenuItem disabled>
        <Loader2 className="size-4 animate-spin" />
        Carregando playlists...
      </DropdownMenuItem>
    );
  }

  if (playlists.length === 0) {
    return (
      <DropdownMenuItem disabled>
        <ListPlus className="size-4" />
        Nenhuma playlist criada
      </DropdownMenuItem>
    );
  }

  return playlists.map((playlist) => (
    <DropdownMenuItem
      key={playlist.id}
      disabled={disabled || addItems.isPending}
      onSelect={() => void handleAdd(playlist.id, playlist.title)}
    >
      <ListPlus className="size-4" />
      Adicionar a {playlist.title}
    </DropdownMenuItem>
  ));
}
