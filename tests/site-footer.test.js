/**
 * The footer of the home page and of the docs, as text (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4). The browser half
 * (the radios, the icons, the cycle button, the stored key) is
 * tests/site-footer.spec.js.
 *
 *   - The home page's Auto label is a key of the catalogs, so /es/ and /ar/
 *     say it in their own language (in the three catalogs, and in Arabic not
 *     in Latin letters); the docs are English and write it as text.
 *   - The 404 page keeps its promise of no script, so it has no colour mode
 *     switcher and no <luz-mode>: its footer is the links alone.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));

/** The label of the radio with value="auto" in a footer. */
const autoLabel = (html) => html.match(/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*?\bvalue="auto"[\s\S]*?<\/label>/)?.[0] ?? "";

describe("the footer has no Auto (2026-10-18): the light follows the hour, or the hour the home's globe pinned, until a mode is chosen", () => {
  const radios = (html) => [...html.matchAll(/<input\b[^>]*type="radio"[^>]*name="luz-theme"[^>]*>/g)].map((m) => m[0]);
  for (const file of ["apps/landing/index.html", "apps/site/_partials/footer.html"]) {
    it(`${file}: Light, Dark and High contrast, none checked in the markup`, () => {
      const all = radios(read(file));
      expect(all.map((r) => r.match(/value="([^"]+)"/)?.[1])).toEqual(["light", "dark", "high-contrast"]);
      expect(all.filter((r) => /\schecked\b/.test(r))).toEqual([]);
      expect(autoLabel(read(file)), "no label for an auto radio").toBe("");
    });

    it(`${file}: the cycle button carries an icon per state, Auto's for no radio checked`, () => {
      const button = read(file).match(/<button class="luz-mode-cycle"[\s\S]*?<\/button>/)?.[0] ?? "";
      expect([...button.matchAll(/data-mode-icon="([^"]+)"/g)].map((m) => m[1])).toEqual(["auto", "light", "dark", "high-contrast"]);
    });
  }

  it("no catalog keeps footer.auto", () => {
    for (const code of ["en", "es", "ar"]) expect(Object.keys(catalog(code))).not.toContain("footer.auto");
  });
});

describe("the 404 page has no switcher: its button would need the script", () => {
  it("is the links alone: no <luz-mode>, no mode radios, no cycle button, no script", () => {
    const html = read("apps/docs/_layouts/not-found.html");
    expect(html.includes("<luz-mode")).toBe(false);
    expect(html.includes('name="luz-theme"')).toBe(false);
    expect(html.includes("luz-mode-cycle")).toBe(false);
    expect(/<script/.test(html)).toBe(false);
    expect(html).toContain("footer-links");
  });
});
