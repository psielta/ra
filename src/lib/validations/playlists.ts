import { z } from "zod";

import type { ResourceDto } from "@/lib/validations/series";

export const PLAYLIST_PREVIEW_LIMIT = 12;

export function slugifyPlaylistTitle(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "playlist"
  );
}

export const createPlaylistSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Titulo e obrigatorio")
    .max(80, "Titulo deve ter no maximo 80 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "Descricao deve ter no maximo 500 caracteres")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const updatePlaylistSchema = createPlaylistSchema
  .partial()
  .refine(
    (data) => data.title !== undefined || data.description !== undefined,
    { message: "Informe ao menos um campo para atualizar" },
  );

export const addPlaylistItemsSchema = z.object({
  resourceIds: z
    .array(z.string().cuid())
    .min(1, "Selecione ao menos um recurso")
    .max(100, "Adicione no maximo 100 recursos por vez"),
});

export const reorderPlaylistItemsSchema = z.object({
  resourceIds: z
    .array(z.string().cuid())
    .min(1, "Informe a ordem da playlist")
    .max(500, "Reordene no maximo 500 recursos por vez"),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type AddPlaylistItemsInput = z.infer<typeof addPlaylistItemsSchema>;
export type ReorderPlaylistItemsInput = z.infer<
  typeof reorderPlaylistItemsSchema
>;

export type PlaylistDto = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlaylistListDto = PlaylistDto & {
  resources: ResourceDto[];
};

export type PlaylistDetailDto = PlaylistDto & {
  resources: ResourceDto[];
};
