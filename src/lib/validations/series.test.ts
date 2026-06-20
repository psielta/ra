import { describe, expect, it } from "vitest";

import {
  bulkDeleteResourcesSchema,
  bulkUpdateResourcesSchema,
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

describe("bulkUpdateResourcesSchema", () => {
  it("valida organizacao em lote de recursos", () => {
    const assignResult = bulkUpdateResourcesSchema.safeParse({
      ids: ["cmqmded510001v8h4qpnlvby3", "cmqmf16pz0003v83o50b8gnw2"],
      seriesId: "cmqmf8c3a0005v83ormd1u0ad",
    });
    const removeResult = bulkUpdateResourcesSchema.safeParse({
      ids: ["cmqmded510001v8h4qpnlvby3"],
      seriesId: null,
    });
    const emptyResult = bulkUpdateResourcesSchema.safeParse({
      ids: [],
      seriesId: null,
    });

    expect(assignResult.success).toBe(true);
    expect(removeResult.success).toBe(true);
    expect(emptyResult.success).toBe(false);
  });
});

describe("bulkDeleteResourcesSchema", () => {
  it("valida exclusao em lote de recursos", () => {
    const result = bulkDeleteResourcesSchema.safeParse({
      ids: ["cmqmded510001v8h4qpnlvby3", "cmqmf16pz0003v83o50b8gnw2"],
    });
    const emptyResult = bulkDeleteResourcesSchema.safeParse({
      ids: [],
    });

    expect(result.success).toBe(true);
    expect(emptyResult.success).toBe(false);
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
