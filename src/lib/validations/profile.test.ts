import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "./profile";

describe("updateProfileSchema", () => {
  it("accepts a valid name", () => {
    const parsed = updateProfileSchema.parse({ name: "Ramsés II" });
    expect(parsed.name).toBe("Ramsés II");
  });

  it("trims whitespace", () => {
    const parsed = updateProfileSchema.parse({ name: "  Ra  " });
    expect(parsed.name).toBe("Ra");
  });

  it("rejects short names", () => {
    const parsed = updateProfileSchema.safeParse({ name: "A" });
    expect(parsed.success).toBe(false);
  });
});
