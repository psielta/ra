import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { slugifyPlaylistTitle } from "@/lib/validations/playlists";

export const FAVORITES_PLAYLIST_TITLE = "Favoritas";
export const FAVORITES_PLAYLIST_DESCRIPTION = "Recursos marcados com estrela.";

export async function resolveUniquePlaylistSlug(userId: string, title: string) {
  const base = slugifyPlaylistTitle(title);
  let slug = base;
  let suffix = 2;

  while (
    await prisma.playlist.findUnique({
      where: { userId_slug: { userId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function findFavoritesPlaylist(userId: string) {
  return prisma.playlist.findFirst({
    where: { userId, isFavorites: true },
    select: { id: true, title: true, slug: true },
  });
}

export async function ensureFavoritesPlaylist(userId: string) {
  const existing = await findFavoritesPlaylist(userId);
  if (existing) return existing;

  try {
    return await prisma.playlist.create({
      data: {
        userId,
        title: FAVORITES_PLAYLIST_TITLE,
        slug: await resolveUniquePlaylistSlug(userId, FAVORITES_PLAYLIST_TITLE),
        description: FAVORITES_PLAYLIST_DESCRIPTION,
        isFavorites: true,
      },
      select: { id: true, title: true, slug: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const createdByRace = await findFavoritesPlaylist(userId);
      if (createdByRace) return createdByRace;
    }

    throw error;
  }
}
