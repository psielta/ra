"use client";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeletePlaylist } from "@/hooks/use-playlists";

type PlaylistDeleteDialogProps = {
  playlist: {
    id: string;
    title: string;
    itemCount: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function PlaylistDeleteDialog({
  playlist,
  open,
  onOpenChange,
  onDeleted,
}: PlaylistDeleteDialogProps) {
  const deletePlaylist = useDeletePlaylist();

  async function handleDelete() {
    try {
      await deletePlaylist.mutateAsync(playlist.id);

      toast.success("Playlist excluida", {
        description: `"${playlist.title}" foi removida.`,
      });

      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error("Nao foi possivel excluir a playlist", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gold/15 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">
            Excluir playlist
          </DialogTitle>
          <DialogDescription>
            Remover <span className="font-medium">{playlist.title}</span> tira{" "}
            {playlist.itemCount} item(ns) desta lista, mas nao exclui os
            arquivos da biblioteca.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deletePlaylist.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deletePlaylist.isPending}
          >
            {deletePlaylist.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Excluir playlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
