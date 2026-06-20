"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePlaylist, useUpdatePlaylist } from "@/hooks/use-playlists";
import type { PlaylistDto } from "@/lib/validations/playlists";

export function PlaylistForm({
  playlist,
  onSaved,
  onCancel,
}: {
  playlist?: PlaylistDto;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}) {
  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist(playlist?.id ?? "");
  const [title, setTitle] = useState(playlist?.title ?? "");
  const [description, setDescription] = useState(playlist?.description ?? "");
  const isEditing = Boolean(playlist);
  const isPending = createPlaylist.isPending || updatePlaylist.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      const input = {
        title: title.trim(),
        description: description.trim() || undefined,
      };
      const saved = isEditing
        ? await updatePlaylist.mutateAsync(input)
        : await createPlaylist.mutateAsync(input);

      toast.success(isEditing ? "Playlist atualizada" : "Playlist criada", {
        description: `"${saved.title}" esta pronta.`,
      });

      if (!isEditing) {
        setTitle("");
        setDescription("");
      }

      onSaved?.(saved.id);
    } catch (error) {
      toast.error(
        isEditing
          ? "Nao foi possivel atualizar a playlist"
          : "Nao foi possivel criar a playlist",
        {
          description:
            error instanceof Error ? error.message : "Tente novamente.",
        },
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={isEditing ? "playlist-title-edit" : "playlist-title"}>
          Nome da playlist
        </Label>
        <Input
          id={isEditing ? "playlist-title-edit" : "playlist-title"}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Favoritas, Treino, Videoclipes"
          required
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor={
            isEditing ? "playlist-description-edit" : "playlist-description"
          }
        >
          Descricao
        </Label>
        <textarea
          id={isEditing ? "playlist-description-edit" : "playlist-description"}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Opcional"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={!title.trim() || isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando...
            </>
          ) : isEditing ? (
            "Salvar playlist"
          ) : (
            "Criar playlist"
          )}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
