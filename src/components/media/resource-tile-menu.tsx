"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

import { ResourceDeleteDialog } from "@/components/media/resource-delete-dialog";
import {
  ResourceTile,
  type ResourceTileProps,
} from "@/components/media/resource-tile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResourceDto } from "@/lib/validations/series";

type ResourceTileMenuProps = {
  tile: ResourceTileProps;
  resource: Pick<ResourceDto, "id" | "title" | "status">;
  onDeleted?: () => void;
};

export function ResourceTileMenu({
  tile,
  resource,
  onDeleted,
}: ResourceTileMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="group/tile relative w-36 shrink-0">
        <ResourceTile {...tile} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 left-2 z-10 size-7 opacity-0 shadow-sm transition-opacity group-hover/tile:opacity-100 focus:opacity-100"
              aria-label="Opções do recurso"
              onClick={(event) => event.preventDefault()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Excluir recurso
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ResourceDeleteDialog
        resource={resource}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}
