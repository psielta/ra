import { expect, test } from "@playwright/test";

const MP3_FIXTURE =
  "D:\\_DownloadsChrome\\YTDown_YouTube_Imagine-Dragons-Next-To-Me-Audio_Media_-C_rvt0SwLE_009_128k.mp3";
const MP4_FIXTURE =
  "D:\\_DownloadsChrome\\YTDown_YouTube_SAD-_-XO-TOUR-LIFE-XXXTENTACION-_-Lil-Uz_Media_JpP5FC-flyo_002_720p.mp4";

test.describe.configure({ mode: "serial" });

type E2EResource = {
  id: string;
  title: string | null;
  mediaType: "audio" | "video";
  status: string;
  playbackUrl: string | null;
  coverUrl: string | null;
  series: { id: string; title: string } | null;
};

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

async function fetchResources(page: import("@playwright/test").Page) {
  const response = await page.request.get("/api/resources");
  expect(
    response.ok(),
    `resources API status ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  return (await response.json()) as E2EResource[];
}

async function uploadFiles(page: import("@playwright/test").Page) {
  await page.goto("/dashboard/upload");
  const input = page.locator('input[type="file"]');

  await expect(input).toHaveJSProperty("multiple", true);
  await page.waitForTimeout(1000);
  await input.setInputFiles([MP3_FIXTURE, MP4_FIXTURE]);

  await expect(page.getByText("Fila de upload")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Enviado para processamento")).toHaveCount(2, {
    timeout: 60_000,
  });
}

async function waitUntilReady(
  page: import("@playwright/test").Page,
  expectedCount: number,
) {
  await expect
    .poll(
      async () => {
        const resources = await fetchResources(page);
        return resources.filter((resource) => resource.status === "ready")
          .length;
      },
      { timeout: 300_000 },
    )
    .toBe(expectedCount);

  return (await fetchResources(page)).filter(
    (resource) => resource.status === "ready",
  );
}

function assertReadyMedia(resource: E2EResource) {
  expect(resource.status).toBe("ready");
  expect(resource.playbackUrl).toContain("http://localhost:14009/outputs/");
  expect(resource.playbackUrl).toContain("index.m3u8");

  if (resource.mediaType === "video") {
    expect(resource.coverUrl).toContain("http://localhost:14009/outputs/");
    expect(resource.coverUrl).toContain("cover.jpg");
  }
}

async function assertPlayback(
  page: import("@playwright/test").Page,
  resource: E2EResource,
  expectedPlayer: string,
) {
  await page.goto(`/resources/${resource.id}`);
  await expect(page.getByText(expectedPlayer)).toBeVisible({
    timeout: 15_000,
  });
}

async function renameResource(
  page: import("@playwright/test").Page,
  resource: E2EResource,
  updatedTitle: string,
) {
  await page.goto(`/resources/${resource.id}`);
  await page.locator("#resource-title").fill(updatedTitle);
  await page.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByText("Recurso atualizado")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible({
    timeout: 15_000,
  });

  const response = await page.request.get(`/api/resources/${resource.id}`);
  expect(
    response.ok(),
    `resource API status ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  const updatedResource = (await response.json()) as { title: string | null };
  expect(updatedResource.title).toBe(updatedTitle);
}

async function organizeInSeries(
  page: import("@playwright/test").Page,
  expectedCount: number,
) {
  const seriesResponse = await page.request.post("/api/series", {
    data: { title: "E2E playlist em lote" },
  });
  expect(
    seriesResponse.ok(),
    `series API status ${seriesResponse.status()}: ${await seriesResponse.text()}`,
  ).toBeTruthy();

  const series = (await seriesResponse.json()) as { id: string; title: string };

  await page.goto("/resources");
  await page.getByLabel("Selecionar todos os recursos").check();
  await expect(page.getByText(`${expectedCount} selecionado(s)`)).toBeVisible();
  await page
    .getByLabel("Serie para aplicar aos selecionados")
    .selectOption(series.id);
  await page.getByRole("button", { name: /Aplicar/ }).click();
  await expect(page.getByText("Recursos atualizados")).toBeVisible({
    timeout: 15_000,
  });

  await expect
    .poll(
      async () => {
        const resources = await fetchResources(page);
        return (
          resources.length === expectedCount &&
          resources.every((resource) => resource.series?.id === series.id)
        );
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

async function assertPersistentMiniPlayer(
  page: import("@playwright/test").Page,
  resource: E2EResource,
  title: string,
) {
  await page.goto(`/resources/${resource.id}`);
  await expect(page.getByText("Player HLS de video")).toBeVisible({
    timeout: 15_000,
  });

  await page
    .locator("video")
    .first()
    .evaluate((element) => {
      const video = element as HTMLVideoElement;
      Object.defineProperty(video, "duration", {
        configurable: true,
        value: 120,
      });
      video.currentTime = 12;
      video.dispatchEvent(new Event("play", { bubbles: true }));
      video.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    });

  await page.locator('a[href="/resources"]').first().click();
  await expect(page.locator("aside").filter({ hasText: title })).toBeVisible({
    timeout: 15_000,
  });
}

test("processa MP3 e MP4 ate playback com lote e mini-player", async ({
  page,
}) => {
  test.setTimeout(600_000);

  await signUp(page);
  await uploadFiles(page);

  const resources = await waitUntilReady(page, 2);
  const audio = resources.find((resource) => resource.mediaType === "audio");
  const video = resources.find((resource) => resource.mediaType === "video");
  expect(audio).toBeTruthy();
  expect(video).toBeTruthy();

  assertReadyMedia(audio as E2EResource);
  assertReadyMedia(video as E2EResource);

  await assertPlayback(page, audio as E2EResource, "Player HLS de audio");
  await assertPlayback(page, video as E2EResource, "Player HLS de video");

  await renameResource(page, audio as E2EResource, "E2E audio MP3 renomeado");
  await renameResource(page, video as E2EResource, "E2E video MP4 renomeado");
  await organizeInSeries(page, 2);
  await assertPersistentMiniPlayer(
    page,
    video as E2EResource,
    "E2E video MP4 renomeado",
  );
});
