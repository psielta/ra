import { describe, expect, it } from "vitest";

import { escapeHtml } from "@/lib/email/templates/escape-html";

describe("escapeHtml", () => {
  it("escapa caracteres perigosos em HTML", () => {
    expect(escapeHtml(`<script>"'&"</script>`)).toBe(
      "&lt;script&gt;&quot;&#39;&amp;&quot;&lt;/script&gt;",
    );
  });
});
