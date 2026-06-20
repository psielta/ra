import { expect, test } from "@playwright/test";

const MP3_FIXTURE =
  "D:\\_DownloadsChrome\\YTDown_YouTube_Imagine-Dragons-Next-To-Me-Audio_Media_-C_rvt0SwLE_009_128k.mp3";

type E2EResource = {
  id: string;
  title: string | null;
  status: string;
};

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

async function waitForFirstReadyResource(
  page: import("@playwright/test").Page,
) {
  await page.goto("/dashboard/upload");
  const input = page.locator('input[type="file"]');

  await expect(input).toHaveJSProperty("multiple", true);
  await page.waitForTimeout(1000);
  await input.setInputFiles(MP3_FIXTURE);
  await expect(page.getByText("Enviado para processamento")).toBeVisible({
    timeout: 60_000,
  });

  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/resources");
        expect(
          response.ok(),
          `resources API status ${response.status()}: ${await response.text()}`,
        ).toBeTruthy();
        const resources = (await response.json()) as E2EResource[];
        return resources.find((resource) => resource.status === "ready")?.id;
      },
      { timeout: 180_000 },
    )
    .toBeTruthy();

  const response = await page.request.get("/api/resources");
  const resources = (await response.json()) as E2EResource[];
  const resource = resources.find((item) => item.status === "ready");
  expect(resource).toBeTruthy();

  return resource as E2EResource;
}

async function renameResource(
  page: import("@playwright/test").Page,
  resourceId: string,
  title: string,
) {
  await page.goto(`/resources/${resourceId}`);
  await page.locator("#resource-title").fill(title);
  await page.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Dashboard recent feed", () => {
  test("registra acesso ao abrir recurso e exibe no feed", async ({ page }) => {
    test.setTimeout(240_000);

    await signUp(page);

    const resource = await waitForFirstReadyResource(page);
    await renameResource(page, resource.id, "Recent feed audio");

    await expect
      .poll(
        async () => {
          const apiRecent = await page.request.get("/api/dashboard/recent");
          expect(
            apiRecent.ok(),
            `recent API status ${apiRecent.status()}: ${await apiRecent.text()}`,
          ).toBeTruthy();
          const recent = (await apiRecent.json()) as Array<{ id: string }>;
          return recent.some((item) => item.id === resource.id);
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
