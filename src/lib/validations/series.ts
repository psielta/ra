import { z } from "zod";

export function slugifySeriesTitle(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "serie"
  );
}

export const createSeriesSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Título é obrigatório")
    .max(80, "Título deve ter no máximo 80 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const updateSeriesSchema = createSeriesSchema
  .partial()
  .refine(
    (data) => data.title !== undefined || data.description !== undefined,
    { message: "Informe ao menos um campo para atualizar" },
  );

export const updateResourceSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  seriesId: z.string().cuid().nullable().optional(),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export const SERIES_PREVIEW_LIMIT = 12;

export type SeriesDto = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  resourceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SeriesListDto = SeriesDto & {
  resources: ResourceDto[];
};

export type ResourceStatus = "processing" | "ready" | "error";

export type ResourceDto = {
  id: string;
  title: string | null;
  description: string | null;
  mediaType: "audio" | "video";
  mimeType: string;
  status: ResourceStatus;
  progress: number;
  playbackUrl: string | null;
  coverUrl: string | null;
  jobId: string | null;
  errorMessage: string | null;
  series: { id: string; title: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
};
