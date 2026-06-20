"use client";

import { Circle, Loader2, Mic, Square, Upload, Video, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadMedia } from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";
import { cn } from "@/lib/utils";

type MediaUploadFormProps = {
  defaultSeriesId?: string;
  onSuccess?: (mediaAssetId: string) => void;
};

type RecordingMode = "audio" | "video";

function resolveRecordingMimeType(mode: RecordingMode) {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates =
    mode === "video"
      ? [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ]
      : ["audio/webm;codecs=opus", "audio/webm"];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function defaultMimeType(mode: RecordingMode) {
  return mode === "video" ? "video/webm" : "audio/webm";
}

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
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("audio");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordedUrlRef = useRef<string | null>(null);
  const formId = useId();
  const fileInputId = `${formId}-media-file`;
  const titleInputId = `${formId}-title`;
  const seriesInputId = `${formId}-series`;
  const descriptionInputId = `${formId}-description`;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }

    setRecordedFile(null);
    setRecordedUrl(null);
  }, []);

  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      stopStream();
      clearRecording();
    },
    [clearRecording, stopStream],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files)[0];
      if (!file) return false;

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
        return true;
      } catch (error) {
        toast.error("Falha no upload", {
          description:
            error instanceof Error ? error.message : "Tente novamente.",
        });
        return false;
      }
    },
    [description, onSuccess, seriesId, title, uploadMedia],
  );

  const startRecording = useCallback(async () => {
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      toast.error("Gravacao indisponivel neste navegador");
      return;
    }

    try {
      clearRecording();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          recordingMode === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
      });

      streamRef.current = stream;

      if (previewVideoRef.current && recordingMode === "video") {
        previewVideoRef.current.srcObject = stream;
      }

      const preferredMimeType = resolveRecordingMimeType(recordingMode);
      const recorder = new MediaRecorder(
        stream,
        preferredMimeType ? { mimeType: preferredMimeType } : undefined,
      );

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType =
          recorder.mimeType ||
          preferredMimeType ||
          defaultMimeType(recordingMode);
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size === 0) {
          toast.error("A gravacao ficou vazia");
          stopStream();
          setIsRecording(false);
          return;
        }

        const extension = mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File(
          [blob],
          `gravacao-${recordingMode}-${Date.now()}.${extension}`,
          { type: mimeType },
        );
        const url = URL.createObjectURL(blob);

        if (recordedUrlRef.current) {
          URL.revokeObjectURL(recordedUrlRef.current);
        }

        recordedUrlRef.current = url;
        setRecordedFile(file);
        setRecordedUrl(url);
        stopStream();
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      stopStream();
      setIsRecording(false);
      toast.error("Nao foi possivel iniciar a gravacao", {
        description:
          error instanceof Error ? error.message : "Verifique as permissoes.",
      });
    }
  }, [clearRecording, recordingMode, stopStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const uploadRecorded = useCallback(async () => {
    if (!recordedFile) return;

    const uploaded = await handleFiles([recordedFile]);
    if (uploaded) {
      clearRecording();
    }
  }, [clearRecording, handleFiles, recordedFile]);

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
        onClick={() => fileInputRef.current?.click()}
      >
        {uploadMedia.isPending ? (
          <Loader2 className="text-gold size-8 animate-spin" />
        ) : (
          <Upload className="text-muted-foreground size-8" />
        )}
        <div className="text-center">
          <p className="font-medium">Arraste MP3 ou MP4 aqui</p>
          <p className="text-muted-foreground text-sm">
            ou clique para selecionar arquivos de audio e video
          </p>
        </div>
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,video/mp4,audio/webm,video/webm,.mp3,.mp4,.webm"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="border-gold/15 bg-muted/10 space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="border-input bg-background inline-flex rounded-md border p-1">
            <Button
              type="button"
              size="sm"
              variant={recordingMode === "audio" ? "default" : "ghost"}
              onClick={() => setRecordingMode("audio")}
              disabled={isRecording}
            >
              <Mic className="size-4" />
              Audio
            </Button>
            <Button
              type="button"
              size="sm"
              variant={recordingMode === "video" ? "default" : "ghost"}
              onClick={() => setRecordingMode("video")}
              disabled={isRecording}
            >
              <Video className="size-4" />
              Video
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {isRecording ? (
              <Button
                type="button"
                variant="destructive"
                onClick={stopRecording}
              >
                <Square className="size-4" />
                Parar
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={startRecording}
                disabled={uploadMedia.isPending}
              >
                <Circle className="fill-destructive text-destructive size-4" />
                Gravar
              </Button>
            )}

            {recordedFile ? (
              <>
                <Button
                  type="button"
                  onClick={uploadRecorded}
                  disabled={uploadMedia.isPending}
                >
                  {uploadMedia.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Enviar gravacao
                </Button>
                <Button type="button" variant="ghost" onClick={clearRecording}>
                  <X className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {isRecording ? (
          recordingMode === "video" ? (
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full rounded-md bg-black"
            />
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="bg-destructive size-2 animate-pulse rounded-full" />
              Gravando audio
            </div>
          )
        ) : null}

        {recordedFile && recordedUrl ? (
          recordedFile.type.startsWith("video/") ? (
            <video
              controls
              src={recordedUrl}
              className="aspect-video w-full rounded-md bg-black"
            />
          ) : (
            <audio controls src={recordedUrl} className="w-full" />
          )
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={titleInputId}>Titulo (opcional)</Label>
          <Input
            id={titleInputId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nome da faixa ou video"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={seriesInputId}>Serie (categoria)</Label>
          <select
            id={seriesInputId}
            value={seriesId}
            onChange={(event) => setSeriesId(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          >
            <option value="">Sem serie</option>
            {seriesList.map((series) => (
              <option key={series.id} value={series.id}>
                {series.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={descriptionInputId}>Descricao (opcional)</Label>
        <textarea
          id={descriptionInputId}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Notas sobre esta midia"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>
    </div>
  );
}
