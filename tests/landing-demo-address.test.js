import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const html = readFileSync(
  fileURLToPath(new URL("../apps/landing/index.html", import.meta.url)),
  "utf8",
);

describe("landing demo address", () => {
  it("uses no address on a domain we do not own", () => {
    expect(html).not.toMatch(/@luz\.dev/);
  });

  it("shows ana@example.com in the typed code line and in both panes", () => {
    const typedLine = html.match(/<span class="tok-string">"ana@[^"]*"<\/span>/g) ?? [];
    expect(typedLine).toEqual(['<span class="tok-string">"ana@example.com"</span>']);

    const inputs = html.match(/<input type="email" value="[^"]*"/g) ?? [];
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).toBe('<input type="email" value="ana@example.com"');
  });
});
