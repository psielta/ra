"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Loader2 } from "lucide-react";
import Link from "next/link";

import {
  ResourceTile,
  resourceToTileProps,
} from "@/components/media/resource-tile";
import { Button } from "@/components/ui/button";
import { useRecentResources } from "@/hooks/use-recent-resources";

export function RecentFeed() {
  const { data: items = [], isLoading } = useRecentResources();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Carregando acessos recentes...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="border-gold/20 bg-muted/20 rounded-xl border border-dashed p-8 text-center">
        <Clock className="text-muted-foreground mx-auto mb-3 size-8" />
        <h3 className="font-display text-lg tracking-wide">
          Nada por aqui ainda
        </h3>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Quando você abrir músicas ou vídeos em Recursos, eles aparecerão aqui
          para você continuar de onde parou.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/resources">Explorar recursos</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg tracking-wide">
            Acessados recentemente
          </h3>
          <p className="text-muted-foreground text-sm">
            Continue de onde parou — seus últimos recursos abertos.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-gold">
          <Link href="/resources">Ver todos</Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <div key={item.id} className="w-36 shrink-0">
            <ResourceTile {...resourceToTileProps(item)} />
            <p className="text-muted-foreground mt-1.5 text-xs">
              {formatDistanceToNow(new Date(item.accessedAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
