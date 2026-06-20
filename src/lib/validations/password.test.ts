import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./password";

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const parsed = forgotPasswordSchema.parse({ email: "user@test.com" });
    expect(parsed.email).toBe("user@test.com");
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    const parsed = resetPasswordSchema.parse({
      token: "abc",
      password: "SenhaForte1",
      confirmPassword: "SenhaForte1",
    });
    expect(parsed.password).toBe("SenhaForte1");
  });

  it("rejects mismatched passwords", () => {
    const parsed = resetPasswordSchema.safeParse({
      token: "abc",
      password: "SenhaForte1",
      confirmPassword: "OutraSenha1",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("rejects when new password equals current", () => {
    const parsed = changePasswordSchema.safeParse({
      currentPassword: "SenhaForte1",
      newPassword: "SenhaForte1",
      confirmPassword: "SenhaForte1",
    });
    expect(parsed.success).toBe(false);
  });
});
