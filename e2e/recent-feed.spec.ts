import { expect, test } from "@playwright/test";

const MP3_FIXTURE =
  "D:\\_DownloadsChrome\\YTDown_YouTube_Imagine-Dragons-Next-To-Me-Audio_Media_-C_rvt0SwLE_009_128k.mp3";

async function signUp(page: import("@playwright/test").Page) {
  const suffix = Date.now();
  const email = `recent-${suffix}@ra.local`;
  const password = "TestSenha123!";

  await page.goto("/sign-up");
  await page.getByLabel("Nome").fill("Recent Tester");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#confirmPassword").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe("Dashboard recent feed", () => {
  test("registra acesso ao abrir recurso e exibe no feed", async ({ page }) => {
    test.setTimeout(180_000);

    await signUp(page);

    await page.goto("/dashboard/upload");
    await page.getByLabel("Titulo (opcional)").fill("Recent feed audio");
    await page.locator("#media-file-input").setInputFiles(MP3_FIXTURE);
    await page.waitForURL(/\/resources\/[^/]+$/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Recent feed audio" }),
    ).toBeVisible({
      timeout: 15_000,
    });

    const resourceId = page.url().split("/").pop();
    expect(resourceId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const apiRecent = await page.request.get("/api/dashboard/recent");
          expect(
            apiRecent.ok(),
            `recent API status ${apiRecent.status()}: ${await apiRecent.text()}`,
          ).toBeTruthy();
          const recent = (await apiRecent.json()) as Array<{ id: string }>;
          return recent.some((item) => item.id === resourceId);
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Acessados recentemente" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Recent feed audio")).toBeVisible();
  });
});
