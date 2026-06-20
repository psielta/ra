"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { SeriesCard } from "@/components/series/series-card";
import { useSeriesList } from "@/hooks/use-series";

export function SeriesList() {
  const [seriesId, setSeriesId] = useState("");
  const { data: series = [], isLoading } = useSeriesList();

  const filteredSeries = useMemo(
    () => (seriesId ? series.filter((item) => item.id === seriesId) : series),
    [series, seriesId],
  );

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
          Nenhuma série criada ainda. Clique em &quot;Nova série&quot; para
          começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={seriesId}
          onChange={(event) => setSeriesId(event.target.value)}
          className="border-input bg-background h-9 min-w-48 rounded-md border px-3 text-sm"
          aria-label="Filtrar por série"
        >
          <option value="">Todas as séries</option>
          {series.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </div>

      {filteredSeries.length === 0 ? (
        <div className="border-gold/20 bg-muted/20 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma série encontrada com o filtro selecionado.
          </p>
        </div>
      ) : (
        filteredSeries.map((item) => <SeriesCard key={item.id} series={item} />)
      )}
    </div>
  );
}
