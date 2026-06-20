import type { Playlist, PlaylistItem } from "@prisma/client";

import {
  type AssetWithRelations,
  toResourceDto,
} from "@/lib/media/resource-mapper";
import type {
  PlaylistDetailDto,
  PlaylistDto,
  PlaylistListDto,
} from "@/lib/validations/playlists";

type PlaylistWithItems = Playlist & {
  _count?: { items: number };
  items: Array<PlaylistItem & { mediaAsset: AssetWithRelations }>;
};

export function toPlaylistDto(
  playlist: Playlist & { _count?: { items: number } },
  itemCount?: number,
): PlaylistDto {
  return {
    id: playlist.id,
    title: playlist.title,
    slug: playlist.slug,
    description: playlist.description,
    isFavorites: playlist.isFavorites,
    itemCount: itemCount ?? playlist._count?.items ?? 0,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
  };
}

export function toPlaylistListDto(
  playlist: PlaylistWithItems,
): PlaylistListDto {
  return {
    ...toPlaylistDto(playlist),
    resources: playlist.items.map((item) => toResourceDto(item.mediaAsset)),
  };
}

export function toPlaylistDetailDto(
  playlist: PlaylistWithItems,
): PlaylistDetailDto {
  return {
    ...toPlaylistDto(playlist),
    resources: playlist.items.map((item) => toResourceDto(item.mediaAsset)),
  };
}
