"use client";

import { Headphones, Loader2, Video } from "lucide-react";

import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import type { ResourceDto } from "@/lib/validations/series";

export function ResourcePlayer({ resource }: { resource: ResourceDto }) {
  if (resource.status === "processing") {
    return (
      <div className="border-gold/15 bg-muted/20 flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
        <Loader2 className="text-gold size-10 animate-spin" />
        <p className="font-medium">Conversão em andamento</p>
        <p className="text-muted-foreground max-w-md text-sm">
          O worker .NET está processando este arquivo. O progresso em tempo real
          chegará na próxima fase via Redis/SSE.
        </p>
        <ResourceStatusBadge
          status={resource.status}
          progress={resource.progress}
        />
      </div>
    );
  }

  if (resource.status === "error") {
    return (
      <div className="border-destructive/25 bg-destructive/5 flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
        <p className="text-destructive font-medium">Falha no processamento</p>
        <p className="text-muted-foreground max-w-md text-sm">
          {resource.errorMessage ?? "Erro desconhecido durante a conversão."}
        </p>
        <ResourceStatusBadge status={resource.status} />
      </div>
    );
  }

  if (resource.mediaType === "audio" && resource.playbackUrl) {
    return (
      <div className="border-gold/15 space-y-3 rounded-lg border p-5">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Headphones className="text-gold size-4" />
          Player de áudio
        </div>
        <audio controls className="w-full" src={resource.playbackUrl}>
          Seu navegador não suporta reprodução de áudio.
        </audio>
      </div>
    );
  }

  if (resource.mediaType === "video") {
    return (
      <div className="border-gold/15 bg-muted/20 flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
        <Video className="text-gold size-10" />
        <p className="font-medium">Streaming HLS</p>
        <p className="text-muted-foreground max-w-md text-sm">
          {resource.playbackUrl
            ? "Player hls.js será integrado na próxima fase do pipeline."
            : "URL de playback ainda não disponível."}
        </p>
        <ResourceStatusBadge status={resource.status} />
      </div>
    );
  }

  return (
    <div className="border-gold/15 text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border p-6 text-sm">
      Arquivo pronto, aguardando URL de reprodução do worker.
    </div>
  );
}
