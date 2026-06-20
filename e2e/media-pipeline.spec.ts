import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const AUDIO_FIXTURE_CANDIDATES = [
  process.env.RA_E2E_AUDIO_FIXTURE,
  "D:\\_DownloadsChrome\\YTDown_YouTube_Imagine-Dragons-Next-To-Me-Audio_Media_-C_rvt0SwLE_009_128k.mp3",
  "D:\\_DownloadsChrome\\Next To Me.mp3",
].filter(Boolean) as string[];

const VIDEO_FIXTURE_CANDIDATES = [
  process.env.RA_E2E_VIDEO_FIXTURE,
  "D:\\_DownloadsChrome\\YTDown_YouTube_SAD-_-XO-TOUR-LIFE-XXXTENTACION-_-Lil-Uz_Media_JpP5FC-flyo_002_720p.mp4",
].filter(Boolean) as string[];
const GENERATED_FIXTURE_DIR = path.join(process.cwd(), ".tmp", "e2e-media");

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

type E2EPlaylist = {
  id: string;
  title: string;
  itemCount: number;
  resources: E2EResource[];
};

function firstExistingPath(candidates: string[]) {
  return candidates.find((candidate) => existsSync(candidate));
}

function writeGeneratedFixture(fileName: string, base64: string) {
  mkdirSync(GENERATED_FIXTURE_DIR, { recursive: true });
  const filePath = path.join(GENERATED_FIXTURE_DIR, fileName);
  writeFileSync(filePath, Buffer.from(base64, "base64"));

  return filePath;
}

async function generateAudioPath(page: Page) {
  const base64 = await page.evaluate(async () => {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const recorder = new MediaRecorder(destination.stream, { mimeType });
    const chunks: BlobPart[] = [];

    gain.gain.value = 0.12;
    oscillator.frequency.value = 440;
    oscillator.connect(gain).connect(destination);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Falha ao gerar audio E2E"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: "audio/webm" }));
    });

    recorder.start();
    await audioContext.resume();
    oscillator.start();
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    oscillator.stop();
    recorder.stop();
    destination.stream.getTracks().forEach((track) => track.stop());
    await audioContext.close();

    const blob = await done;
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let offset = 0; offset < bytes.length; offset += 32_768) {
      binary += String.fromCharCode(...bytes.slice(offset, offset + 32_768));
    }

    return btoa(binary);
  });

  return writeGeneratedFixture("e2e-audio.webm", base64);
}

async function generateVideoPath(page: Page) {
  const base64 = await page.evaluate(async () => {
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas indisponivel para fixture E2E");
    }

    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    const startedAt = performance.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Falha ao gerar video E2E"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    const draw = () => {
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(1, elapsed / 1800);
      const x = 48 + progress * 420;

      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#d4a64a";
      context.fillRect(x, 120, 140, 92);
      context.fillStyle = "#f8fafc";
      context.font = "36px sans-serif";
      context.fillText("RA E2E HLS", 48, 72);

      if (elapsed < 1800) {
        window.requestAnimationFrame(draw);
      } else {
        recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
      }
    };

    recorder.start();
    draw();

    const blob = await done;
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let offset = 0; offset < bytes.length; offset += 32_768) {
      binary += String.fromCharCode(...bytes.slice(offset, offset + 32_768));
    }

    return btoa(binary);
  });

  return writeGeneratedFixture("e2e-video.webm", base64);
}

async function resolveUploadPaths(page: Page) {
  const audioPath = firstExistingPath(AUDIO_FIXTURE_CANDIDATES);
  const videoPath = firstExistingPath(VIDEO_FIXTURE_CANDIDATES);

  return [
    audioPath ?? (await generateAudioPath(page)),
    videoPath ?? (await generateVideoPath(page)),
  ];
}

async function signUp(page: Page) {
  const suffix = Date.now();
  const email = `media-${suffix}@ra.local`;
  const password = "TestSenha123!";

  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      name: "Media Tester",
      email,
      password,
      confirmPassword: password,
    },
  });
  expect(
    registerResponse.ok(),
    `register API status ${registerResponse.status()}: ${await registerResponse.text()}`,
  ).toBeTruthy();

  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(
    csrfResponse.ok(),
    `csrf API status ${csrfResponse.status()}: ${await csrfResponse.text()}`,
  ).toBeTruthy();
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const signInResponse = await page.request.post(
    "/api/auth/callback/credentials",
    {
      form: {
        csrfToken,
        email,
        password,
        callbackUrl: "http://localhost:14001/dashboard",
        json: "true",
      },
    },
  );
  expect(
    signInResponse.ok(),
    `sign-in API status ${signInResponse.status()}: ${await signInResponse.text()}`,
  ).toBeTruthy();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 20_000,
  });
}

async function fetchResources(page: Page) {
  const response = await page.request.get("/api/resources");
  expect(
    response.ok(),
    `resources API status ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  return (await response.json()) as E2EResource[];
}

async function uploadFiles(page: Page) {
  await page.goto("/dashboard/upload");
  const input = page.locator('input[type="file"]');
  const uploadPaths = await resolveUploadPaths(page);

  await expect(input).toHaveJSProperty("multiple", true);
  await page.waitForTimeout(1000);
  await input.setInputFiles(uploadPaths);

  await expect(page.getByText("Fila de upload")).toBeVisible({
    timeout: 15_000,
  });
  for (const uploadPath of uploadPaths) {
    await expect(page.getByText(path.basename(uploadPath))).toBeVisible({
      timeout: 15_000,
    });
  }
  await page.locator('a[href="/resources"]').first().click();
  await expect(page.getByRole("heading", { name: "Recursos" })).toBeVisible({
    timeout: 15_000,
  });
}

async function waitUntilReady(page: Page, expectedCount: number) {
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

function miniPlayer(page: Page) {
  return page.getByTestId("persistent-media-player");
}

async function assertPlayback(
  page: Page,
  resource: E2EResource,
  expectedPlayer: string,
) {
  await page.goto(`/resources/${resource.id}`);
  await expect(page.getByText(expectedPlayer)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Visualizador de audio")).toBeVisible({
    timeout: 15_000,
  });
}

async function renameResource(
  page: Page,
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

async function organizeInSeries(page: Page, expectedCount: number) {
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

  return series;
}

async function createPlaylistWithBulkAdd(page: Page, resources: E2EResource[]) {
  const playlistResponse = await page.request.post("/api/playlists", {
    data: { title: "E2E favoritas" },
  });
  expect(
    playlistResponse.ok(),
    `playlist API status ${playlistResponse.status()}: ${await playlistResponse.text()}`,
  ).toBeTruthy();

  const playlist = (await playlistResponse.json()) as E2EPlaylist;

  await page.goto("/resources");
  await page.getByLabel("Selecionar todos os recursos").check();
  await expect(
    page.getByText(`${resources.length} selecionado(s)`),
  ).toBeVisible();
  await page
    .getByLabel("Playlist para adicionar os selecionados")
    .selectOption(playlist.id);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Playlist atualizada")).toBeVisible({
    timeout: 15_000,
  });

  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/playlists/${playlist.id}`,
        );
        expect(
          response.ok(),
          `playlist detail API status ${response.status()}: ${await response.text()}`,
        ).toBeTruthy();
        const detail = (await response.json()) as E2EPlaylist;

        return detail.itemCount;
      },
      { timeout: 15_000 },
    )
    .toBe(resources.length);

  const detailResponse = await page.request.get(
    `/api/playlists/${playlist.id}`,
  );
  expect(
    detailResponse.ok(),
    `playlist detail API status ${detailResponse.status()}: ${await detailResponse.text()}`,
  ).toBeTruthy();

  return (await detailResponse.json()) as E2EPlaylist;
}

async function assertPersistentMiniPlayer(
  page: Page,
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
  await expect(miniPlayer(page).filter({ hasText: title })).toBeVisible({
    timeout: 15_000,
  });
}

async function assertPlayFromResources(page: Page, title: string) {
  await page.goto("/resources");
  await page
    .getByRole("row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Play" })
    .click();
  await expect(miniPlayer(page).filter({ hasText: title })).toBeVisible({
    timeout: 15_000,
  });
}

async function assertSeriesPlayback(
  page: Page,
  series: { id: string; title: string },
  firstTitle: string,
  secondTitle: string,
) {
  await page.goto("/series");
  await page.getByRole("button", { name: "Reproduzir serie" }).first().click();
  await expect(miniPlayer(page).filter({ hasText: series.title })).toBeVisible({
    timeout: 15_000,
  });

  await page.goto(`/series/${series.id}`);
  await page.getByRole("button", { name: "Reproduzir serie" }).click();
  await expect(miniPlayer(page).filter({ hasText: firstTitle })).toBeVisible({
    timeout: 15_000,
  });
  await expect(miniPlayer(page).filter({ hasText: "1/2" })).toBeVisible();

  await miniPlayer(page).locator("audio, video").dispatchEvent("ended");
  await expect(miniPlayer(page).filter({ hasText: secondTitle })).toBeVisible({
    timeout: 15_000,
  });
}

async function assertPlaylistPlayback(page: Page, playlist: E2EPlaylist) {
  const first = playlist.resources[0];
  const second = playlist.resources[1];
  expect(first).toBeTruthy();
  expect(second).toBeTruthy();

  await page.goto("/playlists");
  await page
    .getByRole("button", { name: "Reproduzir playlist" })
    .first()
    .click();
  await expect(
    miniPlayer(page).filter({ hasText: playlist.title }),
  ).toBeVisible({ timeout: 15_000 });

  await page.goto(`/playlists/${playlist.id}`);
  await page.getByRole("button", { name: "Reproduzir playlist" }).click();
  await expect(
    miniPlayer(page).filter({ hasText: first.title ?? "Sem titulo" }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(miniPlayer(page).filter({ hasText: "1/2" })).toBeVisible();

  await miniPlayer(page).locator("audio, video").dispatchEvent("ended");
  await expect(
    miniPlayer(page).filter({ hasText: second.title ?? "Sem titulo" }),
  ).toBeVisible({
    timeout: 15_000,
  });
}

async function assertBulkDelete(page: Page, expectedCount: number) {
  await page.goto("/resources");
  await page.getByLabel("Selecionar todos os recursos").check();
  await expect(page.getByText(`${expectedCount} selecionado(s)`)).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain(`${expectedCount} recurso(s)`);
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Excluir selecionados" }).click();
  await expect(page.getByText("Recursos excluidos")).toBeVisible({
    timeout: 15_000,
  });

  await expect
    .poll(async () => (await fetchResources(page)).length, {
      timeout: 15_000,
    })
    .toBe(0);
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
  const series = await organizeInSeries(page, 2);
  const playlist = await createPlaylistWithBulkAdd(
    page,
    await fetchResources(page),
  );
  await assertPlayFromResources(page, "E2E audio MP3 renomeado");
  await assertPersistentMiniPlayer(
    page,
    video as E2EResource,
    "E2E video MP4 renomeado",
  );
  await assertSeriesPlayback(
    page,
    series,
    "E2E audio MP3 renomeado",
    "E2E video MP4 renomeado",
  );
  await assertPlaylistPlayback(page, playlist);
  await assertBulkDelete(page, 2);
});
