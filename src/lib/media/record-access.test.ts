import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mediaAsset: {
      findFirst: vi.fn(),
    },
    mediaAccess: {
      upsert: vi.fn(),
    },
  },
}));

import { recordMediaAccess } from "@/lib/media/record-access";
import { prisma } from "@/lib/prisma";

describe("recordMediaAccess", () => {
  it("não registra acesso quando o recurso não pertence ao usuário", async () => {
    vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue(null);

    const result = await recordMediaAccess("user-1", "asset-1");

    expect(result).toBe(false);
    expect(prisma.mediaAccess.upsert).not.toHaveBeenCalled();
  });

  it("faz upsert quando o recurso existe", async () => {
    vi.mocked(prisma.mediaAsset.findFirst).mockResolvedValue({
      id: "asset-1",
    } as never);
    vi.mocked(prisma.mediaAccess.upsert).mockResolvedValue({
      id: "access-1",
      userId: "user-1",
      mediaAssetId: "asset-1",
      accessedAt: new Date(),
    });

    const result = await recordMediaAccess("user-1", "asset-1");

    expect(result).toBe(true);
    expect(prisma.mediaAccess.upsert).toHaveBeenCalledWith({
      where: {
        userId_mediaAssetId: { userId: "user-1", mediaAssetId: "asset-1" },
      },
      create: { userId: "user-1", mediaAssetId: "asset-1" },
      update: { accessedAt: expect.any(Date) },
    });
  });
});
