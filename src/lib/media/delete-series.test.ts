import { describe, expect, it } from "vitest";

import {
  collectProcessingJobIds,
  collectResourcesStorageKeys,
} from "@/lib/media/delete-helpers";

describe("collectResourcesStorageKeys", () => {
  it("coleta original e storage dos jobs ignorando pending", () => {
    const keys = collectResourcesStorageKeys([
      {
        originalKey: "uploads/user/job-1/source.mp3",
        jobs: [
          { storageKey: "pending" },
          { storageKey: "uploads/user/job-1/source.mp3" },
        ],
      },
      {
        originalKey: "pending",
        jobs: [{ storageKey: "uploads/user/job-2/source.mp4" }],
      },
    ]);

    expect(keys).toEqual([
      "uploads/user/job-1/source.mp3",
      "uploads/user/job-2/source.mp4",
    ]);
  });
});

describe("collectProcessingJobIds", () => {
  it("coleta apenas jobs em PROCESSING", () => {
    const jobIds = collectProcessingJobIds([
      {
        jobs: [
          { id: "job-1", status: "PROCESSING" },
          { id: "job-2", status: "READY" },
        ],
      },
      {
        jobs: [
          { id: "job-3", status: "PROCESSING" },
          { id: "job-1", status: "PROCESSING" },
        ],
      },
    ]);

    expect(jobIds).toEqual(["job-1", "job-3"]);
  });
});
