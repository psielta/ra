import { describe, expect, it } from "vitest";

import {
  MEDIA_AUDIO_MAX_BYTES,
  MEDIA_VIDEO_MAX_BYTES,
  mediaUploadMetadataSchema,
  validateMediaFile,
} from "@/lib/validations/media";

function createFile(name: string, type: string, size: number) {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe("mediaUploadMetadataSchema", () => {
  it("aceita titulo opcional e normaliza vazio", () => {
    expect(mediaUploadMetadataSchema.parse({})).toEqual({});
    expect(mediaUploadMetadataSchema.parse({ title: "" })).toEqual({});
    expect(mediaUploadMetadataSchema.parse({ title: "Minha faixa" })).toEqual({
      title: "Minha faixa",
    });
  });
});

describe("validateMediaFile", () => {
  it("aceita mp3, mp4 e webm validos", () => {
    const mp3 = createFile("track.mp3", "audio/mpeg", 1024);
    const mp4 = createFile("clip.mp4", "video/mp4", 2048);
    const audioWebm = createFile("recording.webm", "audio/webm", 1024);
    const videoWebm = createFile("recording.webm", "video/webm", 2048);

    expect(validateMediaFile(mp3)).toMatchObject({
      ok: true,
      kind: "audio",
      extension: "mp3",
    });
    expect(validateMediaFile(mp4)).toMatchObject({
      ok: true,
      kind: "video",
      extension: "mp4",
    });
    expect(validateMediaFile(audioWebm)).toMatchObject({
      ok: true,
      kind: "audio",
      extension: "webm",
    });
    expect(validateMediaFile(videoWebm)).toMatchObject({
      ok: true,
      kind: "video",
      extension: "webm",
    });
  });

  it("rejeita mime e tamanho invalidos", () => {
    expect(validateMediaFile(createFile("x.wav", "audio/wav", 100))).toEqual({
      ok: false,
      message: "Envie um arquivo MP3, MP4 ou uma gravacao WebM do navegador.",
    });

    expect(
      validateMediaFile(
        createFile("big.mp4", "video/mp4", MEDIA_VIDEO_MAX_BYTES + 1),
      ),
    ).toMatchObject({ ok: false });

    expect(
      validateMediaFile(
        createFile("big.mp3", "audio/mpeg", MEDIA_AUDIO_MAX_BYTES + 1),
      ),
    ).toMatchObject({ ok: false });
  });
});
