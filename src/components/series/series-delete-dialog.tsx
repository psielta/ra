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
import { useDeleteSeries } from "@/hooks/use-series";

type SeriesDeleteDialogProps = {
  series: {
    id: string;
    title: string;
    resourceCount: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function SeriesDeleteDialog({
  series,
  open,
  onOpenChange,
  onDeleted,
}: SeriesDeleteDialogProps) {
  const deleteSeries = useDeleteSeries();

  async function handleDelete() {
    try {
      await deleteSeries.mutateAsync(series.id);

      toast.success("Série excluída", {
        description:
          series.resourceCount > 0
            ? `A série e ${series.resourceCount} ${
                series.resourceCount === 1 ? "recurso foi" : "recursos foram"
              } removidos.`
            : "A série foi removida.",
      });

      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error("Não foi possível excluir a série", {
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
            Excluir série
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                Tem certeza que deseja excluir{" "}
                <span className="text-foreground font-medium">
                  {series.title}
                </span>
                ?
              </p>
              {series.resourceCount > 0 ? (
                <p>
                  Isso remove em cascata{" "}
                  <span className="text-foreground font-medium">
                    {series.resourceCount}{" "}
                    {series.resourceCount === 1 ? "recurso" : "recursos"}
                  </span>{" "}
                  desta coleção, incluindo arquivos no storage. Jobs em
                  processamento serão cancelados na fila antes da exclusão.
                </p>
              ) : (
                <p>Esta coleção não tem recursos vinculados.</p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteSeries.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteSeries.isPending}
          >
            {deleteSeries.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Excluir série
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
