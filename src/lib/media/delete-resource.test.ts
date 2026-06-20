import { describe, expect, it } from "vitest";

import { collectResourceStorageKeys } from "@/lib/media/delete-helpers";

describe("collectResourceStorageKeys", () => {
  it("coleta original e storage dos jobs ignorando pending", () => {
    const keys = collectResourceStorageKeys({
      originalKey: "uploads/user/job-1/source.mp3",
      jobs: [
        { storageKey: "pending" },
        { storageKey: "uploads/user/job-1/source.mp3" },
      ],
    });

    expect(keys).toEqual(["uploads/user/job-1/source.mp3"]);
  });
});
