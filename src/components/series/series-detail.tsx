"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { useState } from "react";

import { ResourceCard } from "@/components/media/resource-card";
import { SeriesEditDrawer } from "@/components/series/series-edit-drawer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSeriesDetail } from "@/hooks/use-series";
import { truncateText } from "@/lib/utils";

export function SeriesDetail({ id }: { id: string }) {
  const { data: series, isLoading, isError } = useSeriesDetail(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Carregando série...
      </div>
    );
  }

  if (isError || !series) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">Série não encontrada.</p>
        <Button asChild variant="outline">
          <Link href="/series">
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
        <Link href="/series">
          <ArrowLeft className="size-4" />
          Séries
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2
            className="font-display text-2xl tracking-wide"
            title={series.title}
          >
            {truncateText(series.title)}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {series.resourceCount}{" "}
            {series.resourceCount === 1 ? "recurso" : "recursos"} nesta série
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            Editar série
          </Button>
          <Button asChild>
            <Link href={`/dashboard/upload?seriesId=${series.id}`}>
              Enviar para esta série
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-gold/15 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Sobre a série</CardTitle>
          <CardDescription title={series.slug}>
            Slug: {truncateText(series.slug)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {series.description ?? "Sem descrição."}
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-display mb-4 text-lg tracking-wide">Recursos</h3>
        {series.resources.length === 0 ? (
          <div className="border-gold/20 bg-muted/20 rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">
              Esta série ainda não tem recursos. Envie uma mídia e classifique-a
              aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {series.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} hideSeries />
            ))}
          </div>
        )}
      </div>

      <SeriesEditDrawer
        series={series}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
