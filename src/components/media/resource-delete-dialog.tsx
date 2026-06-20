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
import { useDeleteResource } from "@/hooks/use-resources";

type ResourceDeleteDialogProps = {
  resource: {
    id: string;
    title: string | null;
    status: "processing" | "ready" | "error";
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function ResourceDeleteDialog({
  resource,
  open,
  onOpenChange,
  onDeleted,
}: ResourceDeleteDialogProps) {
  const deleteResource = useDeleteResource();
  const displayTitle = resource.title ?? "Sem título";

  async function handleDelete() {
    try {
      await deleteResource.mutateAsync(resource.id);

      toast.success("Recurso excluído", {
        description: `${displayTitle} foi removido.`,
      });

      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error("Não foi possível excluir o recurso", {
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
            Excluir recurso
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                Tem certeza que deseja excluir{" "}
                <span className="text-foreground font-medium">
                  {displayTitle}
                </span>
                ?
              </p>
              <p>
                O arquivo será removido do storage permanentemente.
                {resource.status === "processing"
                  ? " Jobs em processamento serão cancelados na fila antes da exclusão."
                  : null}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteResource.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteResource.isPending}
          >
            {deleteResource.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Excluir recurso
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
