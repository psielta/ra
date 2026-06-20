import { z } from "zod";

export const workerJobUpdateSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    playbackUrl: z.string().min(1, "URL de playback obrigatoria"),
    coverUrl: z.string().min(1).nullable().optional(),
    durationSec: z.number().int().nonnegative().nullable().optional(),
    progress: z.number().min(0).max(100).optional().default(100),
  }),
  z.object({
    status: z.literal("error"),
    errorMessage: z.string().min(1, "Mensagem de erro obrigatoria"),
    progress: z.number().min(0).max(100).optional().default(0),
  }),
]);

export type WorkerJobUpdateInput = z.infer<typeof workerJobUpdateSchema>;
