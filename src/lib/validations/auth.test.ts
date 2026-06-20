import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "@/lib/validations/auth";

describe("signInSchema", () => {
  it("accepts valid credentials", () => {
    const result = signInSchema.safeParse({
      email: "pharaoh@memphis.eg",
      password: "secret",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({
      email: "invalid",
      password: "secret",
    });

    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts valid registration data", () => {
    const result = signUpSchema.safeParse({
      name: "Ramsés II",
      email: "pharaoh@memphis.eg",
      password: "Pharaoh123",
      confirmPassword: "Pharaoh123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signUpSchema.safeParse({
      name: "Ramsés II",
      email: "pharaoh@memphis.eg",
      password: "Pharaoh123",
      confirmPassword: "Different123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects weak passwords", () => {
    const result = signUpSchema.safeParse({
      name: "Ramsés II",
      email: "pharaoh@memphis.eg",
      password: "weakpass",
      confirmPassword: "weakpass",
    });

    expect(result.success).toBe(false);
  });
});
