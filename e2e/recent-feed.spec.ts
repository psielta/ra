import { expect, test } from "@playwright/test";

const RESOURCE_ID = "cmqmded510001v8h4qpnlvby3";
const TEST_EMAIL = "psielta@gmail.com";
const TEST_PASSWORD = "TestSenha123!";

test.describe("Dashboard recent feed", () => {
  test("registra acesso ao abrir recurso e exibe no feed", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Senha").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    const resourceResponse = await page.goto(`/resources/${RESOURCE_ID}`);
    expect(resourceResponse?.status()).toBe(200);
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.waitForTimeout(1_000);

    const apiRecent = await page.request.get("/api/dashboard/recent");
    expect(
      apiRecent.ok(),
      `recent API status ${apiRecent.status()}: ${await apiRecent.text()}`,
    ).toBeTruthy();
    const recent = (await apiRecent.json()) as Array<{ id: string }>;
    expect(recent.some((item) => item.id === RESOURCE_ID)).toBeTruthy();

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Acessados recentemente" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/há .* minuto|há .* segundo|há menos de/i),
    ).toBeVisible();
  });
});
