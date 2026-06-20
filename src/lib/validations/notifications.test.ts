import { describe, expect, it } from "vitest";

import {
  notificationListQuerySchema,
  publishNotificationSchema,
} from "./notifications";

describe("notificationListQuerySchema", () => {
  it("applies defaults", () => {
    const parsed = notificationListQuerySchema.parse({});

    expect(parsed.limit).toBe(20);
    expect(parsed.unreadOnly).toBeUndefined();
  });

  it("parses unreadOnly flag", () => {
    const parsed = notificationListQuerySchema.parse({ unreadOnly: "true" });

    expect(parsed.unreadOnly).toBe(true);
  });
});

describe("publishNotificationSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = publishNotificationSchema.parse({
      title: "Job concluído",
      message: "Seu vídeo está pronto para assistir.",
      type: "JOB",
      category: "MEDIA",
    });

    expect(parsed.type).toBe("JOB");
    expect(parsed.category).toBe("MEDIA");
  });

  it("rejects empty title", () => {
    const parsed = publishNotificationSchema.safeParse({
      title: "",
      message: "teste",
    });

    expect(parsed.success).toBe(false);
  });
});
