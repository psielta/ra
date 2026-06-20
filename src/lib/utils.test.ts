import { describe, expect, it } from "vitest";

import { truncateText } from "@/lib/utils";

describe("truncateText", () => {
  it("mantém texto curto intacto", () => {
    expect(truncateText("Música curta")).toBe("Música curta");
  });

  it("adiciona reticências após 20 caracteres", () => {
    const long = "Nome muito longo de arquivo de música";
    expect(truncateText(long)).toBe("Nome muito longo de ...");
    expect(truncateText(long).length).toBe(23);
  });

  it("respeita limite customizado", () => {
    expect(truncateText("abcdefghij", 5)).toBe("abcde...");
  });
});
