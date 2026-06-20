"use client";

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileAudio,
  FileVideo,
  Loader2,
  Mic,
  Square,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useUploadMedia } from "@/hooks/use-resources";
import { cn } from "@/lib/utils";
import { validateMediaFile } from "@/lib/validations/media";

type MediaUploadFormProps = {
  defaultSeriesId?: string;
  onSuccess?: (mediaAssetId: string) => void;
};

type RecordingMode = "audio" | "video";
type UploadStatus = "queued" | "uploading" | "done" | "error";

type UploadQueueItem = {
  id: number;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  mediaAssetId?: string;
};

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

function formatFileSize(bytes: number) {
  if (!bytes) return "-";

  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function statusIcon(status: UploadStatus) {
  if (status === "done") return CheckCircle2;
  if (status === "error") return AlertCircle;
  if (status === "uploading") return Loader2;
  return Upload;
}

function fileIcon(file: File) {
  return file.type.startsWith("video/") ? FileVideo : FileAudio;
}

export function MediaUploadForm({
  defaultSeriesId,
  onSuccess,
}: MediaUploadFormProps) {
  const uploadMedia = useUploadMedia();
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
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
  const queueSeqRef = useRef(0);
  const pendingRef = useRef<UploadQueueItem[]>([]);
  const runningRef = useRef(false);
  const defaultSeriesIdRef = useRef(defaultSeriesId);
  const onSuccessRef = useRef(onSuccess);
  const formId = useId();
  const fileInputId = `${formId}-media-files`;

  useEffect(() => {
    defaultSeriesIdRef.current = defaultSeriesId;
  }, [defaultSeriesId]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

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

  const patchQueueItem = useCallback(
    (id: number, changes: Partial<UploadQueueItem>) => {
      setQueue((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      );
    },
    [],
  );

  async function pumpQueue() {
    if (runningRef.current) return;

    const next = pendingRef.current.shift();
    if (!next) return;

    runningRef.current = true;
    patchQueueItem(next.id, { status: "uploading", progress: 10 });

    try {
      const result = await uploadMedia.mutateAsync({
        file: next.file,
        seriesId: defaultSeriesIdRef.current || undefined,
      });

      patchQueueItem(next.id, {
        status: "done",
        progress: 100,
        mediaAssetId: result.mediaAssetId,
      });
      onSuccessRef.current?.(result.mediaAssetId);
    } catch (error) {
      patchQueueItem(next.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Falha no upload",
      });
    } finally {
      runningRef.current = false;
      void pumpQueue();
    }
  }

  function enqueueFiles(files: FileList | File[]) {
    const additions: UploadQueueItem[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(files)) {
      const validation = validateMediaFile(file);
      const item: UploadQueueItem = {
        id: ++queueSeqRef.current,
        file,
        status: validation.ok ? "queued" : "error",
        progress: 0,
        error: validation.ok ? undefined : validation.message,
      };

      additions.push(item);
      if (validation.ok) {
        pendingRef.current.push(item);
      } else {
        rejected.push(file.name);
      }
    }

    if (!additions.length) return;

    setQueue((current) => [...current, ...additions]);

    if (rejected.length) {
      toast.error("Alguns arquivos foram recusados", {
        description: rejected.slice(0, 3).join(", "),
      });
    }

    void pumpQueue();
  }

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

  function uploadRecorded() {
    if (!recordedFile) return;

    enqueueFiles([recordedFile]);
    clearRecording();
  }

  const removeQueued = useCallback((id: number) => {
    pendingRef.current = pendingRef.current.filter((item) => item.id !== id);
    setQueue((current) =>
      current.filter(
        (item) => !(item.id === id && item.status !== "uploading"),
      ),
    );
  }, []);

  const clearFinished = useCallback(() => {
    setQueue((current) =>
      current.filter(
        (item) => item.status === "queued" || item.status === "uploading",
      ),
    );
  }, []);

  const hasFinished = queue.some(
    (item) => item.status === "done" || item.status === "error",
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-input bg-muted/20 flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 transition-colors",
          dragOver && "border-gold/50 bg-gold/5",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          enqueueFiles(event.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="text-muted-foreground size-8" />
        <div className="text-center">
          <p className="font-medium">Arraste musicas e videos aqui</p>
          <p className="text-muted-foreground text-sm">
            ou clique para selecionar varios arquivos MP3, MP4 ou WebM
          </p>
        </div>
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/mpeg,video/mp4,audio/webm,video/webm,.mp3,.mp4,.webm"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) enqueueFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {queue.length ? (
        <div className="border-gold/15 overflow-hidden rounded-lg border">
          <div className="bg-muted/30 flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-medium">Fila de upload</p>
            {hasFinished ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFinished}
              >
                Limpar finalizados
              </Button>
            ) : null}
          </div>
          <ul className="divide-border divide-y">
            {queue.map((item) => {
              const StatusIcon = statusIcon(item.status);
              const FileIcon = fileIcon(item.file);

              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <span className="bg-gold/10 text-gold flex size-9 items-center justify-center rounded-md">
                    <FileIcon className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {item.file.name}
                    </p>
                    {item.status === "uploading" ? (
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-gold h-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    ) : item.status === "error" ? (
                      <p className="text-destructive truncate text-xs">
                        {item.error}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        {item.status === "done"
                          ? "Enviado para processamento"
                          : formatFileSize(item.file.size)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      className={cn(
                        "size-4",
                        item.status === "uploading" && "text-gold animate-spin",
                        item.status === "done" && "text-emerald-500",
                        item.status === "error" && "text-destructive",
                        item.status === "queued" && "text-muted-foreground",
                      )}
                    />
                    {item.status !== "uploading" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => removeQueued(item.id)}
                        aria-label="Remover da fila"
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

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
              <FileVideo className="size-4" />
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
              <Button type="button" variant="outline" onClick={startRecording}>
                <Circle className="fill-destructive text-destructive size-4" />
                Gravar
              </Button>
            )}

            {recordedFile ? (
              <>
                <Button type="button" onClick={uploadRecorded}>
                  <Upload className="size-4" />
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
    </div>
  );
}
