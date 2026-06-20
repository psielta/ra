import { describe, expect, it } from "vitest";

import { parseTranscodeJobMessage } from "@/lib/queue/cancel-transcode-jobs";

describe("parseTranscodeJobMessage", () => {
  it("parseia payload válido", () => {
    const payload = parseTranscodeJobMessage(
      JSON.stringify({
        jobId: "job-1",
        userId: "user-1",
        mediaType: "video",
        storageKey: "uploads/user/job-1/source.mp4",
        mimeType: "video/mp4",
      }),
    );

    expect(payload).toEqual({
      jobId: "job-1",
      userId: "user-1",
      mediaType: "video",
      storageKey: "uploads/user/job-1/source.mp4",
      mimeType: "video/mp4",
    });
  });

  it("retorna null para JSON inválido ou campos ausentes", () => {
    expect(parseTranscodeJobMessage("{ invalid")).toBeNull();
    expect(
      parseTranscodeJobMessage(JSON.stringify({ jobId: "job-1" })),
    ).toBeNull();
    expect(
      parseTranscodeJobMessage(
        JSON.stringify({
          jobId: "job-1",
          userId: "user-1",
          mediaType: "image",
          storageKey: "x",
          mimeType: "image/png",
        }),
      ),
    ).toBeNull();
  });
});
