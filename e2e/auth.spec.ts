import { expect, test } from "@playwright/test";

test.describe("Authentication pages", () => {
  test("sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(
      page.getByRole("heading", { name: "Entrar", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("sign-up page renders", async ({ page }) => {
    await page.goto("/sign-up");

    await expect(
      page.getByRole("heading", { name: "Criar conta", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Criar conta" }),
    ).toBeVisible();
  });

  test("redirects unauthenticated users from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });
});
