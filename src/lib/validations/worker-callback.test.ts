import { describe, expect, it } from "vitest";

import { workerJobUpdateSchema } from "@/lib/validations/worker-callback";

describe("workerJobUpdateSchema", () => {
  it("aceita finalizacao pronta", () => {
    const parsed = workerJobUpdateSchema.parse({
      status: "ready",
      playbackUrl: "http://localhost:14009/outputs/user/job/index.m3u8",
      coverUrl: "http://localhost:14009/outputs/user/job/cover.jpg",
    });

    expect(parsed).toEqual({
      status: "ready",
      playbackUrl: "http://localhost:14009/outputs/user/job/index.m3u8",
      coverUrl: "http://localhost:14009/outputs/user/job/cover.jpg",
      progress: 100,
    });
  });

  it("exige mensagem para erro", () => {
    expect(() =>
      workerJobUpdateSchema.parse({
        status: "error",
      }),
    ).toThrow();
  });
});
