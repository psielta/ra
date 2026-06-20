import { expect, test } from "@playwright/test";

const MP3_FIXTURE =
  "D:\\_DownloadsChrome\\YTDown_YouTube_Imagine-Dragons-Next-To-Me-Audio_Media_-C_rvt0SwLE_009_128k.mp3";
const MP4_FIXTURE =
  "D:\\_DownloadsChrome\\YTDown_YouTube_SAD-_-XO-TOUR-LIFE-XXXTENTACION-_-Lil-Uz_Media_JpP5FC-flyo_002_720p.mp4";

test.describe.configure({ mode: "serial" });

async function signUp(page: import("@playwright/test").Page) {
  const suffix = Date.now();
  const email = `media-${suffix}@ra.local`;
  const password = "TestSenha123!";

  await page.goto("/sign-up");
  await page.getByLabel("Nome").fill("Media Tester");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#confirmPassword").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

async function uploadAndWaitReady(
  page: import("@playwright/test").Page,
  input: { filePath: string; title: string; expectedPlayer: string },
) {
  await page.goto("/dashboard/upload");
  await page.getByLabel("Titulo (opcional)").fill(input.title);
  await page.locator("#media-file-input").setInputFiles(input.filePath);
  await page.waitForURL(/\/resources\/[^/]+$/, { timeout: 30_000 });

  await expect(
    page.getByText("Conversao em andamento").or(page.getByText("Pronto")),
  ).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText("Pronto")).toBeVisible({ timeout: 240_000 });
  await expect(page.getByText(input.expectedPlayer)).toBeVisible();

  const resourceId = page.url().split("/").pop();
  expect(resourceId).toBeTruthy();

  const response = await page.request.get(`/api/resources/${resourceId}`);
  expect(
    response.ok(),
    `resource API status ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  const resource = (await response.json()) as {
    title: string | null;
    status: string;
    playbackUrl: string | null;
    coverUrl: string | null;
  };

  expect(resource.status).toBe("ready");
  expect(resource.playbackUrl).toContain("http://localhost:14009/outputs/");
  expect(resource.playbackUrl).toContain("index.m3u8");

  if (input.expectedPlayer.includes("video")) {
    expect(resource.coverUrl).toContain("http://localhost:14009/outputs/");
    expect(resource.coverUrl).toContain("cover.jpg");
  }

  const updatedTitle = `${input.title} renomeado`;
  await page.getByLabel("Título").fill(updatedTitle);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Recurso atualizado")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible({
    timeout: 15_000,
  });

  const updatedResponse = await page.request.get(
    `/api/resources/${resourceId}`,
  );
  expect(
    updatedResponse.ok(),
    `updated resource API status ${updatedResponse.status()}: ${await updatedResponse.text()}`,
  ).toBeTruthy();

  const updatedResource = (await updatedResponse.json()) as {
    title: string | null;
  };

  expect(updatedResource.title).toBe(updatedTitle);
}

test("processa MP3 e MP4 ate playback", async ({ page }) => {
  test.setTimeout(600_000);

  await signUp(page);

  await uploadAndWaitReady(page, {
    filePath: MP3_FIXTURE,
    title: "E2E audio MP3",
    expectedPlayer: "Player HLS de audio",
  });

  await uploadAndWaitReady(page, {
    filePath: MP4_FIXTURE,
    title: "E2E video MP4",
    expectedPlayer: "Player HLS de video",
  });
});
