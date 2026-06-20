"use client";

import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SeriesAddContentTile } from "@/components/series/series-add-content-tile";
import { SeriesDeleteDialog } from "@/components/series/series-delete-dialog";
import { SeriesEditDrawer } from "@/components/series/series-edit-drawer";
import { resourceToTileProps } from "@/components/media/resource-tile";
import { ResourceTileMenu } from "@/components/media/resource-tile-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SeriesListDto } from "@/lib/validations/series";
import { cn, truncateText } from "@/lib/utils";

export function SeriesCard({ series }: { series: SeriesListDto }) {
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <section className="border-gold/15 overflow-hidden rounded-xl border">
        <div className="flex items-center gap-2 px-4 py-3 sm:gap-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
            aria-label={expanded ? "Recolher série" : "Expandir série"}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <Link
              href={`/series/${series.id}`}
              className="hover:text-gold font-medium transition-colors"
              title={series.title}
            >
              {truncateText(series.title, 40)}
            </Link>
          </div>

          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
            {series.resourceCount}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Opções da série"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Editar série
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Excluir série
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild size="sm" className="shrink-0">
            <Link href={`/series/${series.id}`}>Ver todos</Link>
          </Button>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex gap-4 overflow-x-auto px-4 pt-1 pb-4">
              {series.resources.map((resource) => (
                <ResourceTileMenu
                  key={resource.id}
                  tile={resourceToTileProps(resource)}
                  resource={resource}
                />
              ))}
              <SeriesAddContentTile seriesId={series.id} />
            </div>
          </div>
        </div>
      </section>

      <SeriesEditDrawer
        series={series}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <SeriesDeleteDialog
        series={series}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
