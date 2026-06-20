"use client";

import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Play,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  ResourceTile,
  resourceToTileProps,
} from "@/components/media/resource-tile";
import { PlaylistDeleteDialog } from "@/components/playlists/playlist-delete-dialog";
import { PlaylistEditDrawer } from "@/components/playlists/playlist-edit-drawer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlaylistListDto } from "@/lib/validations/playlists";
import { cn, truncateText } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

function playablePlaylistResources(playlist: PlaylistListDto) {
  return playlist.resources.filter(
    (resource) => resource.status === "ready" && Boolean(resource.playbackUrl),
  );
}

export function PlaylistCard({ playlist }: { playlist: PlaylistListDto }) {
  const startPersistentPlaylist = useUiStore(
    (state) => state.startPersistentPlaylist,
  );
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const playableResources = playablePlaylistResources(playlist);
  const playbackPlaylist = {
    seriesId: playlist.id,
    title: playlist.title,
    resources: playableResources,
  };

  return (
    <>
      <section className="border-gold/15 overflow-hidden rounded-xl border">
        <div className="flex items-center gap-2 px-4 py-3 sm:gap-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
            aria-label={expanded ? "Recolher playlist" : "Expandir playlist"}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <Link
              href={`/playlists/${playlist.id}`}
              className="hover:text-gold font-medium transition-colors"
              title={playlist.title}
            >
              {truncateText(playlist.title, 44)}
            </Link>
          </div>

          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
            {playlist.itemCount}
          </span>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            aria-label="Reproduzir playlist"
            disabled={playableResources.length === 0}
            onClick={() =>
              startPersistentPlaylist({
                seriesId: playlist.id,
                title: playlist.title,
                resources: playableResources,
              })
            }
          >
            <Play className="size-4 fill-current" />
          </Button>

          {playlist.isFavorites ? (
            <Star className="text-gold size-4 shrink-0 fill-current" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label="Opcoes da playlist"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  Editar playlist
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Excluir playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button asChild size="sm" className="shrink-0">
            <Link href={`/playlists/${playlist.id}`}>Ver todos</Link>
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
              {playlist.resources.length > 0 ? (
                playlist.resources.map((resource) => (
                  <ResourceTile
                    key={resource.id}
                    {...resourceToTileProps(resource)}
                    playlist={playbackPlaylist}
                  />
                ))
              ) : (
                <p className="text-muted-foreground py-8 text-sm">
                  Nenhum item nesta playlist.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <PlaylistEditDrawer
        playlist={playlist}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <PlaylistDeleteDialog
        playlist={playlist}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
