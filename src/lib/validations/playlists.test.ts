import { describe, expect, it } from "vitest";

import {
  addPlaylistItemsSchema,
  createPlaylistSchema,
  reorderPlaylistItemsSchema,
  slugifyPlaylistTitle,
} from "@/lib/validations/playlists";

describe("slugifyPlaylistTitle", () => {
  it("normaliza nomes de playlists", () => {
    expect(slugifyPlaylistTitle("Favoritas 2026")).toBe("favoritas-2026");
    expect(slugifyPlaylistTitle("  Musica & Video #1  ")).toBe(
      "musica-video-1",
    );
  });
});

describe("createPlaylistSchema", () => {
  it("valida dados principais da playlist", () => {
    expect(createPlaylistSchema.safeParse({ title: "" }).success).toBe(false);
    expect(createPlaylistSchema.safeParse({ title: "Favoritas" }).success).toBe(
      true,
    );
  });
});

describe("playlist item schemas", () => {
  it("exigem ao menos um recurso", () => {
    expect(addPlaylistItemsSchema.safeParse({ resourceIds: [] }).success).toBe(
      false,
    );
    expect(
      reorderPlaylistItemsSchema.safeParse({
        resourceIds: ["cmqmf8c3a0005v83ormd1u0ad"],
      }).success,
    ).toBe(true);
  });
});
