import { describe, expect, it } from "vitest";

import {
  createSeriesSchema,
  slugifySeriesTitle,
  updateResourceSchema,
} from "@/lib/validations/series";

describe("slugifySeriesTitle", () => {
  it("normaliza título para slug", () => {
    expect(slugifySeriesTitle("Minhas Músicas 2026")).toBe(
      "minhas-musicas-2026",
    );
    expect(slugifySeriesTitle("  Coletânea #1  ")).toBe("coletanea-1");
  });
});

describe("createSeriesSchema", () => {
  it("valida título obrigatório", () => {
    expect(createSeriesSchema.safeParse({ title: "" }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ title: "Rock" }).success).toBe(true);
  });
});

describe("updateResourceSchema", () => {
  it("normaliza descrição vazia para nulo", () => {
    const result = updateResourceSchema.safeParse({
      title: "Novo nome",
      description: "   ",
      seriesId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        title: "Novo nome",
        description: null,
        seriesId: null,
      });
    }
  });
});
