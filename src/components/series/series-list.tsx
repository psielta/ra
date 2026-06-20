"use client";

import { Loader2 } from "lucide-react";

import { SeriesCard } from "@/components/series/series-card";
import { useSeriesList } from "@/hooks/use-series";

export function SeriesList() {
  const { data: series = [], isLoading } = useSeriesList();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Carregando séries...
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="border-gold/20 bg-muted/20 rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhuma série criada ainda. Use o formulário ao lado para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {series.map((item) => (
        <SeriesCard key={item.id} series={item} />
      ))}
    </div>
  );
}
