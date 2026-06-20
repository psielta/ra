import { z } from "zod";

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().cuid().optional(),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const publishNotificationSchema = z.object({
  userId: z.string().cuid().optional(),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "JOB"]).default("INFO"),
  category: z.enum(["SYSTEM", "MEDIA", "ACCOUNT"]).default("SYSTEM"),
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).optional(),
});

export type PublishNotificationInput = z.infer<
  typeof publishNotificationSchema
>;
