"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSeries } from "@/hooks/use-series";

export function SeriesForm({
  onCreated,
  onCancel,
}: {
  onCreated?: (id: string) => void;
  onCancel?: () => void;
}) {
  const createSeries = useCreateSeries();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      const series = await createSeries.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      toast.success("Série criada", {
        description: `"${series.title}" está pronta para receber mídias.`,
      });

      setTitle("");
      setDescription("");
      onCreated?.(series.id);
    } catch (error) {
      toast.error("Não foi possível criar a série", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="series-title">Título da série</Label>
        <Input
          id="series-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Coletânea 2026, Covers, Videoclipes"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="series-description">Descrição</Label>
        <textarea
          id="series-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Organize suas músicas e vídeos por tema ou projeto"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="submit"
          disabled={!title.trim() || createSeries.isPending}
        >
          {createSeries.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar série"
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
