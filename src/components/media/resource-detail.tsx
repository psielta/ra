"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/media/resource-delete-dialog";
import { ResourcePlayer } from "@/components/media/resource-player";
import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useResource, useUpdateResource } from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";
import { useState } from "react";
import { toast } from "sonner";

export function ResourceDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: resource, isLoading, isError } = useResource(id);
  const { data: seriesList = [] } = useSeriesList();
  const updateResource = useUpdateResource(id);
  const [seriesId, setSeriesId] = useState<string>("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Carregando recurso...
      </div>
    );
  }

  if (isError || !resource) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">Recurso não encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/resources">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const currentSeriesId = seriesId || resource.series?.id || "";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/resources">
          <ArrowLeft className="size-4" />
          Recursos
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide">
            {resource.title ?? "Sem título"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {resource.mediaType === "audio" ? "Música" : "Vídeo"}
            {resource.series ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href={`/series/${resource.series.id}`}
                  className="text-gold hover:underline"
                >
                  {resource.series.title}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ResourceStatusBadge
            status={resource.status}
            progress={resource.progress}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Excluir
          </Button>
        </div>
      </div>

      <ResourcePlayer resource={resource} />

      <Card className="border-gold/15">
        <CardHeader>
          <CardTitle className="text-lg">Detalhes</CardTitle>
          <CardDescription>
            Classifique este recurso em uma série (categoria).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">
            {resource.description ?? "Sem descrição."}
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 space-y-2">
              <label className="text-sm font-medium" htmlFor="resource-series">
                Série
              </label>
              <select
                id="resource-series"
                value={currentSeriesId}
                onChange={(event) => setSeriesId(event.target.value)}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Sem série</option>
                {seriesList.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.title}
                  </option>
                ))}
              </select>
            </div>

            <Button
              disabled={updateResource.isPending}
              onClick={async () => {
                try {
                  await updateResource.mutateAsync({
                    seriesId: currentSeriesId || null,
                  });
                  toast.success("Série atualizada");
                } catch (error) {
                  toast.error("Não foi possível atualizar", {
                    description:
                      error instanceof Error
                        ? error.message
                        : "Tente novamente.",
                  });
                }
              }}
            >
              Salvar classificação
            </Button>
          </div>
        </CardContent>
      </Card>

      <ResourceDeleteDialog
        resource={resource}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          if (resource.series) {
            router.push(`/series/${resource.series.id}`);
            return;
          }

          router.push("/resources");
        }}
      />
    </div>
  );
}
