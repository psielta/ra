"use client";

import { Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadMedia } from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";
import { cn } from "@/lib/utils";

type MediaUploadFormProps = {
  defaultSeriesId?: string;
  onSuccess?: (mediaAssetId: string) => void;
};

export function MediaUploadForm({
  defaultSeriesId,
  onSuccess,
}: MediaUploadFormProps) {
  const uploadMedia = useUploadMedia();
  const { data: seriesList = [] } = useSeriesList();
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seriesId, setSeriesId] = useState(defaultSeriesId ?? "");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files)[0];
      if (!file) return;

      try {
        const result = await uploadMedia.mutateAsync({
          file,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          seriesId: seriesId || undefined,
        });

        toast.success("Upload enviado", {
          description: "O arquivo entrou na fila de processamento.",
        });

        setTitle("");
        setDescription("");
        onSuccess?.(result.mediaAssetId);
      } catch (error) {
        toast.error("Falha no upload", {
          description:
            error instanceof Error ? error.message : "Tente novamente.",
        });
      }
    },
    [description, onSuccess, seriesId, title, uploadMedia],
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-input bg-muted/20 flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 transition-colors",
          dragOver && "border-gold/50 bg-gold/5",
          uploadMedia.isPending && "pointer-events-none opacity-70",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onClick={() => document.getElementById("media-file-input")?.click()}
      >
        {uploadMedia.isPending ? (
          <Loader2 className="text-gold size-8 animate-spin" />
        ) : (
          <Upload className="text-muted-foreground size-8" />
        )}
        <div className="text-center">
          <p className="font-medium">Arraste MP3 ou MP4 aqui</p>
          <p className="text-muted-foreground text-sm">
            ou clique para selecionar · até 50 MB (áudio) / 500 MB (vídeo)
          </p>
        </div>
        <input
          id="media-file-input"
          type="file"
          accept="audio/mpeg,video/mp4,.mp3,.mp4"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="upload-title">Título (opcional)</Label>
          <Input
            id="upload-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nome da faixa ou vídeo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="upload-series">Série (categoria)</Label>
          <select
            id="upload-series"
            value={seriesId}
            onChange={(event) => setSeriesId(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          >
            <option value="">Sem série</option>
            {seriesList.map((series) => (
              <option key={series.id} value={series.id}>
                {series.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-description">Descrição (opcional)</Label>
        <textarea
          id="upload-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Notas sobre esta mídia"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>
    </div>
  );
}
