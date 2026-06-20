import type { ResourceDto } from "@/lib/validations/series";

export type RecentResourceDto = ResourceDto & {
  accessedAt: string;
};
