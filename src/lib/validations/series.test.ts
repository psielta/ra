import { describe, expect, it } from "vitest";

import {
  createSeriesSchema,
  slugifySeriesTitle,
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
