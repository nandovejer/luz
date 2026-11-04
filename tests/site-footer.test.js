/**
 * The footer of the home page and of the docs, as text (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4). The browser half
 * (the radios, the icons, the round button, the stored key) is
 * tests/site-footer.spec.js.
 *
 *   - The home page's Auto label is a key of the catalogs, so /es/ and /ar/
 *     say it in their own language (in the three catalogs, and in Arabic not
 *     in Latin letters); the docs are English and write it as text.
 *   - The 404 page keeps its promise of no script, so it has no colour mode
 *     switcher and no <luz-theme-mode>: its footer is the links alone.
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

describe("the footer has Auto first (2026-10-29): <luz-theme-time> around core's <luz-theme-mode>, Auto is the system's and no radio is checked in the markup", () => {
  const radios = (html) => [...html.matchAll(/<input\b[^>]*type="radio"[^>]*name="luz-theme-mode"[^>]*>/g)].map((m) => m[0]);
  for (const file of ["apps/landing/index.html", "apps/site/_partials/footer.html"]) {
    it(`${file}: Auto, Light, Dark and High contrast in that order, no radio checked: without JavaScript the page follows the system`, () => {
      const all = radios(read(file));
      expect(all.map((r) => r.match(/value="([^"]+)"/)?.[1])).toEqual(["auto", "light", "dark", "high-contrast"]);
      // Auto is first and not checked, so none is: the page follows the system until a radio is picked
      expect(all.filter((r) => /\schecked\b/.test(r)).map((r) => r.match(/value="([^"]+)"/)?.[1])).toEqual([]);
      expect(autoLabel(read(file)), "a label for the auto radio").toContain("{{t:footer.auto}}");
    });

    it(`${file}: every label carries an icon (the button shows the one of the checked radio), and the moments follow core's element inside <luz-theme-time>`, () => {
      const html = read(file);
      const labels = [...html.matchAll(/<label\b[^>]*luz-theme-mode__option[^>]*>[\s\S]*?<\/label>/g)].map((m) => m[0]);
      expect(labels).toHaveLength(4);
      for (const label of labels) expect(label, label.slice(0, 80)).toMatch(/<svg\b[^>]*luz-theme-mode__icon[^>]*aria-hidden="true"/);
      // The home's comments name the elements in words, so the tags are the ones that open a line
      const time = html.search(/^\s*<luz-theme-time[\s>]/m);
      const mode = html.search(/^\s*<luz-theme-mode>/m);
      const moments = html.indexOf("luz-theme-time__moments");
      expect(time, "<luz-theme-time>").toBeGreaterThanOrEqual(0);
      expect(mode, "core's element inside it").toBeGreaterThan(time);
      expect(moments, "the moments after core's element").toBeGreaterThan(html.indexOf("</luz-theme-mode>"));
      expect([...html.matchAll(/class="luz-theme-time__input"[^>]*data-from="/g)]).toHaveLength(6);
    });
  }

  it("the catalogs of the home keep footer.auto, in each language and not in Latin letters in Arabic, and no catalog keeps footer.mode-change", () => {
    for (const code of ["en", "es", "ar"]) {
      const keys = catalog(code);
      expect(Object.keys(keys), code).toContain("footer.auto");
      expect(Object.keys(keys), code).not.toContain("footer.mode-change");
    }
    expect(catalog("en")["footer.auto"]).toBe("Auto");
    expect(catalog("es")["footer.auto"]).not.toBe("Auto");
    expect(catalog("ar")["footer.auto"]).toMatch(/^[\u0600-\u06FF\s]+$/);
  });
});

describe("the templates do not name light on <html>: the page is Vejer light only when the system is light", () => {
  const htmlTag = (rel) => read(rel).match(/<html\b[^>]*>/)?.[0] ?? "";
  it.each(["apps/landing/index.html", "apps/docs/_layouts/page.html"])("%s has no data-theme and no data-mode on <html>", (file) => {
    expect(htmlTag(file)).toMatch(/^<html\b/);
    expect(htmlTag(file)).not.toMatch(/\bdata-theme\b/);
    expect(htmlTag(file)).not.toMatch(/\bdata-mode\b/);
  });

  it("the 404 page stays dark: it has no boot script and no switcher, so it names its mode itself", () => {
    expect(htmlTag("apps/docs/_layouts/not-found.html")).toMatch(/\bdata-theme="dark"/);
  });
});

describe("the 404 page has no switcher: its button would need the script", () => {
  it("is the links alone: no <luz-theme-mode>, no <luz-theme-time>, no mode radios, no button, and no script but the one that picks the language", () => {
    const html = read("apps/docs/_layouts/not-found.html");
    expect(html.includes("<luz-theme-mode")).toBe(false);
    expect(html.includes("<luz-theme-time")).toBe(false);
    expect(html.includes('name="luz-theme-mode"')).toBe(false);
    expect(html.includes("luz-theme-mode__button")).toBe(false);
    // Its one script is the language picker (tests/not-found-lang.spec.js): not a boot script, not the theme's
    expect(html.match(/<script\b[^>]*>/g) ?? []).toEqual(['<script type="module" src="/apps/docs/not-found.js">']);
    expect(html).toContain("footer-links");
  });
});
