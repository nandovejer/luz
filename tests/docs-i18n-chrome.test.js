/**
 * No English is left in the chrome of a page in Spanish or Arabic (design:
 * docs-i18n-design.md sections c and i).
 *
 * The chrome is everything the generator, the layout and the shared partials
 * write around a page: the header and its search dialog, the sidebar, the
 * breadcrumb, the chips, the rail, "Keep going", the foot, the footer. For
 * each page of a language the test removes everything inside [lang="en"],
 * pre, code, kbd, script, style and svg (a page that is not translated is
 * English on purpose, and says so with lang="en"), and then asks:
 *
 *   es and ar   no value of the English catalogs (the docs' and the home's) of
 *               two words or more appears in a text node or in an aria-label,
 *               title, alt, placeholder or data-luz-label-* attribute
 *   ar          every text node and every one of those attributes has an
 *               Arabic letter, or is a symbol, a number or a brand
 *
 * It renders the fixture site of tests/helpers/docs-i18n-fixture.js: the real
 * layout and the real partials, the real home catalogs, and Spanish and
 * Arabic docs catalogs that are the English one with every word replaced (so a
 * string that was translated never contains the English one). What the test
 * finds is therefore the English that is written in code: the generator's
 * literals (until they move to the English catalog) and the shared partials.
 *
 * It is expected to stay red after the generator is done, on the shared
 * partials: apps/site/_partials/footer.html ("Color mode", "Change color mode",
 * Auto, Light, Dark, "High contrast") and apps/docs/_partials/footer-links.html
 * ("Home", "A–Z index", "Accessibility statement", "Issues on GitHub", "LUZ
 * Design System · v… · Beta · MIT License") are English literals until they
 * take their words from the catalogs. Those are the assertions it keeps red
 * until the footer moves to catalog keys (the other session owns footer.html).
 */
import { afterAll, describe, expect, it } from "vitest";
import { join } from "node:path";
import { buildSite, renderPage, scanSite } from "../scripts/docs-site/site.js";
import { REPO, chromeOf, docsI18nFixture, docsLanguage, docsI18nModule } from "./helpers/docs-i18n-fixture.js";

const CODES = ["es", "ar"];

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const words = (text) => text.split(/\s+/).filter(Boolean);
/** The plain text of a catalog value: without markup, a {placeholder} stands for any text. */
const patternOf = (value) => {
  const plain = value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&middot;/g, "·").trim();
  const parts = plain.split(/\{[^}]*\}/);
  if (words(parts.join(" ")).length < 2) return null;
  // As whole words: "1 result" is not found in "1 resultado"
  return new RegExp(`(?<![\\p{L}\\p{N}])${parts.map(escapeRe).join(".+?")}(?![\\p{L}\\p{N}])`, "u");
};

/** The English strings of two words or more that a language does not say as they are, as [value, regexp]. */
function englishPatterns(site, code) {
  const english = { ...site.i18n.default.strings, ...site.docsI18n.reference.strings };
  const own = new Set(Object.values(docsLanguage(site, code).strings));
  const seen = new Set();
  const patterns = [];
  for (const value of Object.values(english)) {
    if (seen.has(value) || own.has(value)) continue;
    seen.add(value);
    const pattern = patternOf(value);
    if (pattern) patterns.push([value, pattern]);
  }
  return patterns;
}

/** What an English leftover looks like: [`route:line: "text" (kind) is the English "value"`]. */
function englishIn(route, items, patterns) {
  const found = [];
  for (const item of items) {
    for (const [value, pattern] of patterns) {
      if (pattern.test(item.value)) {
        found.push(`${route}:${item.line}: ${item.kind} "${item.value}" is the English string "${value}"`);
        break;
      }
    }
  }
  return found;
}

const BRANDS = /\b(?:LUZ|GitHub|A–Z|MIT|npm|beta)\b/g;
/** Is this text in Arabic, or a symbol, a number or a brand (v0.1.0 beta, GitHub, A–Z)? */
const isArabicOrNeutral = (text) => /\p{Script=Arabic}/u.test(text) || !/\p{Script=Latin}/u.test(text.replace(BRANDS, ""));

describe("the chrome of the localized pages of the fixture site", () => {
  let site;
  let f;
  let built;
  let ready_;
  const ready = () =>
    (ready_ ??= (async () => {
      f = docsI18nFixture();
      site = f.scan();
      for (const code of CODES) docsLanguage(site, code);
      built = buildSite(site, { languages: true, unchecked: ["/", "/es/", "/ar/"] });
    })());
  afterAll(() => f?.cleanup());

  const routes = () => site.pages.map((p) => p.route);
  const rendered = (route) => {
    const html = built.rendered.get(route);
    if (!html) throw new Error(`buildSite(site, { languages: true }) did not render ${route}`);
    return html;
  };
  const pagesOf = (code) => routes().map((route) => [`/${code}${route}`, chromeOf(rendered(`/${code}${route}`))]);

  it("can see English: the chrome of an English page is full of the English catalog's strings", async () => {
    await ready();
    const patterns = englishPatterns(site, "es");
    expect(patterns.length, "English strings of two words or more").toBeGreaterThan(20);
    const route = "/docs/components/widget/";
    const html = rendered(route);
    const found = englishIn(route, chromeOf(html), patterns).map((line) => /is the English string "(.*)"$/.exec(line)[1]);
    for (const value of ["Skip to main content", "About this page", "Keep going", "Copy page as Markdown", "Edit this page", "Report a problem", "Last updated"]) {
      expect(found, value).toContain(value);
    }
  });

  it("writes the strings of the language's catalog in the chrome of its pages", async () => {
    await ready();
    for (const code of CODES) {
      const text = pagesOf(code).flatMap(([, items]) => items.map((i) => i.value)).join("\n");
      const strings = docsLanguage(site, code).docsStrings;
      for (const key of ["chrome.skip", "chrome.nav"]) expect(text, `${code} ${key}`).toContain(strings[key].replace(/<[^>]*>/g, ""));
    }
  });

  for (const code of CODES) {
    describe(code, () => {
      it("has no English string of two words or more in a text or an attribute, outside what is marked lang=\"en\"", async () => {
        await ready();
        const patterns = englishPatterns(site, code);
        const found = pagesOf(code).flatMap(([route, items]) => englishIn(route, items, patterns));
        // One line per distinct leftover, with the first page that has it
        const seen = new Map();
        for (const line of found) {
          const key = line.replace(/^[^:]*:\d+: /, "");
          if (!seen.has(key)) seen.set(key, line);
        }
        expect([...seen.values()]).toEqual([]);
      });
    });
  }

  describe("ar", () => {
    it("has an Arabic letter in every text and every label, unless it is a symbol, a number or a brand", async () => {
      await ready();
      const seen = new Map();
      for (const [route, items] of pagesOf("ar")) {
        for (const item of items) {
          if (isArabicOrNeutral(item.value)) continue;
          const key = `${item.kind} "${item.value}"`;
          if (!seen.has(key)) seen.set(key, `${route}:${item.line}: ${key} has no Arabic letter`);
        }
      }
      expect([...seen.values()]).toEqual([]);
    });

    it("has English only inside lang=en on a page that is not translated: the chrome around it has none of its words", async () => {
      await ready();
      const mod = await docsI18nModule();
      const localized = mod.localize(site, docsLanguage(site, "ar"));
      const view = localized.byRoute.get("/ar/docs/components/widget/");
      expect(view.fallback).toBe(true);
      const html = renderPage(view, localized, { dev: true });
      // The content is English, so the test above has to skip it: it is in lang="en"
      expect(html).toMatch(/<div class="docs-body"[^>]*\blang="en"/);
      const text = chromeOf(html).map((i) => i.value);
      expect(text).not.toContain("Widget");
      expect(text).not.toContain("Example");
    });
  });
});

/* ---- The real site, in every language it has ------------------------------------------------------------ */

describe("the chrome of the real site, in each language it has", () => {
  const real = scanSite(join(REPO, "apps/docs"), REPO);

  it("is read from apps/docs/i18n", () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
  });

  for (const language of real.docsI18n?.languages ?? []) {
    it(`leaves no English in the chrome of the ${language.code} pages`, () => {
      const { rendered } = buildSite(real, { languages: true });
      const patterns = englishPatterns(real, language.code);
      const seen = new Map();
      for (const [route, html] of rendered) {
        if (!route.startsWith(language.docsRoute)) continue;
        const items = chromeOf(html);
        for (const line of englishIn(route, items, patterns)) seen.set(line.replace(/^[^:]*:\d+: /, ""), line);
        if (language.code === "ar") {
          for (const item of items) if (!isArabicOrNeutral(item.value)) seen.set(`${item.kind} ${item.value}`, `${route}:${item.line}: ${item.kind} "${item.value}" has no Arabic letter`);
        }
      }
      expect([...seen.values()]).toEqual([]);
    }, 120_000);
  }
});
