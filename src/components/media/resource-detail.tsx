"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ResourceDeleteDialog } from "@/components/media/resource-delete-dialog";
import { ResourcePlayer } from "@/components/media/resource-player";
import { ResourceStatusBadge } from "@/components/media/resource-status-badge";
import {
  ResourceTile,
  resourceToTileProps,
} from "@/components/media/resource-tile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJobEventSources } from "@/hooks/use-job-events";
import {
  useResource,
  useResources,
  useUpdateResource,
} from "@/hooks/use-resources";
import { useSeriesList } from "@/hooks/use-series";

export function ResourceDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: resource, isLoading, isError } = useResource(id);
  const { data: seriesList = [] } = useSeriesList();
  const updateResource = useUpdateResource(id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!resource) return;

    setTitle(resource.title ?? "");
    setDescription(resource.description ?? "");
    setSeriesId(resource.series?.id ?? "");
  }, [resource]);

  const jobTargets = useMemo(
    () =>
      resource?.status === "processing" && resource.jobId
        ? [{ jobId: resource.jobId, mediaAssetId: resource.id }]
        : [],
    [resource],
  );
  useJobEventSources(jobTargets);

  const relatedSeriesId = resource?.series?.id;
  const relatedFilters = useMemo(
    () =>
      relatedSeriesId
        ? { seriesId: relatedSeriesId, mediaType: "video" as const }
        : undefined,
    [relatedSeriesId],
  );
  const { data: relatedVideos = [], isLoading: isLoadingRelatedVideos } =
    useResources(relatedFilters, { enabled: Boolean(relatedSeriesId) });
  const suggestedVideos = useMemo(
    () => relatedVideos.filter((item) => item.id !== resource?.id),
    [relatedVideos, resource?.id],
  );

  const titleValue = title.trim();
  const descriptionValue = description.trim();
  const hasMetadataChanges = Boolean(
    resource &&
    (titleValue !== (resource.title ?? "") ||
      descriptionValue !== (resource.description ?? "") ||
      seriesId !== (resource.series?.id ?? "")),
  );

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
                -{" "}
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
            Edite o nome, a descrição e a série deste recurso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resource-title">Título</Label>
              <Input
                id="resource-title"
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nome do recurso"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-series">Série</Label>
              <select
                id="resource-series"
                value={seriesId}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-description">Descrição</Label>
            <textarea
              id="resource-description"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição opcional"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              O nome aparece na biblioteca, nas séries e nas sugestões.
            </p>
            <Button
              disabled={
                updateResource.isPending || !hasMetadataChanges || !titleValue
              }
              onClick={async () => {
                try {
                  await updateResource.mutateAsync({
                    title: titleValue,
                    description: descriptionValue || null,
                    seriesId: seriesId || null,
                  });
                  toast.success("Recurso atualizado");
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
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      {resource.series &&
      (isLoadingRelatedVideos || suggestedVideos.length > 0) ? (
        <section className="space-y-3">
          <div>
            <h3 className="font-display text-lg tracking-wide">
              Vídeos da mesma série
            </h3>
            <p className="text-muted-foreground text-sm">
              Sugestões relacionadas a {resource.series.title}.
            </p>
          </div>

          {isLoadingRelatedVideos ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Carregando sugestões...
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {suggestedVideos.map((video) => (
                <ResourceTile key={video.id} {...resourceToTileProps(video)} />
              ))}
            </div>
          )}
        </section>
      ) : null}

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
