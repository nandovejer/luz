/**
 * The hero of the home puts the AI button first on a phone with CSS `order: -1` while the source keeps "Get started"
 * first (owner, 2026-10-30). That deviates from PRINCIPLES.md section 7 ("Works without CSS: source order is reading
 * order") and from WCAG 2.4.3 (Focus Order) and 1.3.2 (Meaningful Sequence), so it is written down: a note in the
 * principle, and a known issue in the accessibility statement, in English and in Spanish. The behaviour is in
 * tests/landing-hero-buttons.spec.js.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const text = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf-8");

/** The Known issues section of the statement: from its h2 to the next h2. */
const known = (html) => {
  const start = html.search(/id="h-a11y-known"/);
  if (start === -1) return "";
  const next = html.indexOf("<h2", start + 10);
  return html.slice(start, next === -1 ? undefined : next);
};

describe("the deviation of the home's hero is written", () => {
  it("PRINCIPLES.md notes, next to 'source order is reading order', that the hero of the home deviates on phones", () => {
    const lines = text("PRINCIPLES.md").split("\n");
    const at = lines.findIndex((l) => /source order is reading order/i.test(l));
    expect(at, "the 'source order is reading order' line").toBeGreaterThan(-1);
    const near = lines.slice(at, at + 6).join(" ");
    expect(near).toMatch(/hero/i);
    expect(near).toMatch(/phone|mobile|small screen|640/i);
  });

  for (const file of ["apps/docs/pages/accessibility.html", "apps/docs/i18n/es/pages/accessibility.html"]) {
    it(`${file}: the known issues name the hero buttons, WCAG 2.4.3 and 1.3.2`, () => {
      const section = known(text(file));
      expect(section, "a Known issues section").not.toBe("");
      expect(section).toMatch(/hero/i);
      expect(section).toMatch(/\b2\.4\.3\b/);
      expect(section).toMatch(/\b1\.3\.2\b/);
    });
  }
});
