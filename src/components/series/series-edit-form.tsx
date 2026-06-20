"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSeries } from "@/hooks/use-series";
import type { SeriesDto } from "@/lib/validations/series";

type SeriesEditFormProps = {
  series: SeriesDto;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function SeriesEditForm({
  series,
  onSuccess,
  onCancel,
}: SeriesEditFormProps) {
  const updateSeries = useUpdateSeries(series.id);
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      await updateSeries.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      toast.success("Série atualizada", {
        description: "As alterações foram salvas.",
      });

      onSuccess?.();
    } catch (error) {
      toast.error("Não foi possível atualizar a série", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`series-edit-title-${series.id}`}>
          Título da série
        </Label>
        <Input
          id={`series-edit-title-${series.id}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Coletânea 2026, Covers, Videoclipes"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`series-edit-description-${series.id}`}>
          Descrição
        </Label>
        <textarea
          id={`series-edit-description-${series.id}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Organize suas músicas e vídeos por tema ou projeto"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Slug atual: <span className="text-foreground">{series.slug}</span>
      </p>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="submit"
          disabled={!title.trim() || updateSeries.isPending}
        >
          {updateSeries.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar alterações"
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
