/**
 * The docs in English, Spanish and Arabic: routes, links, titles, hreflang,
 * the language switcher and the pages that are not translated yet (design:
 * docs-i18n-design.md sections a, d and e; decisions D1 to D4).
 *
 * The fixture (tests/helpers/docs-i18n-fixture.js, which writes the API this
 * file fixes at its top) is a small repository with the real layout and
 * partials and fifteen pages. In es the pages translated are the hub, the
 * accessibility statement, get-started/ (index, reviewed install) and
 * components/ (index); in ar the hub, the statement, get-started/, tokens/ and
 * components/ (indexes). Every other page is the fallback of that language: a
 * real page at the localized route, in English, with a notice (D3).
 */
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSite, relativizeLinks, renderPage, routeOfPage, scanSite } from "../scripts/docs-site/site.js";
import { find, findAll, hasClass, parse, query, queryAll, textOf } from "./helpers/html-dom.js";
import { PAGES, REPO, TRANSLATED, docsI18nFixture as fixture, docsI18nModule, docsLanguage, messageOf, headLinks, languageOf, titleOf } from "./helpers/docs-i18n-fixture.js";

const CODES = ["es", "ar"];
const SITE_URL = "https://example.github.io/luz/";
const BUILD = { languages: true, unchecked: ["/", "/es/", "/ar/"] };
const pathOf = (route) => Object.keys(PAGES).find((path) => routeOfPage(path) === route);
const translates = (code, route) => Object.hasOwn(TRANSLATED[code], pathOf(route));
const localRoute = (code, route) => `/${code}${route}`;

/* ---- Opt in by folder (D1) ---------------------------------------------------------- */

describe("a language has docs when apps/docs/i18n/<code>/ exists (D1)", () => {
  const made = [];
  const docsI18nFixture = (options) => {
    const f = fixture(options);
    made.push(f);
    return f;
  };
  afterEach(() => made.splice(0).forEach((f) => f.cleanup()));

  it("a site without apps/docs/i18n is the English docs it was: no languages, no localized route", () => {
    const f = docsI18nFixture({ i18n: false });
    const site = f.scan();
    expect(site.docsI18n).toBeNull();
    const { rendered } = buildSite(site, BUILD);
    expect([...rendered.keys()].every((route) => route.startsWith("/docs/"))).toBe(true);
    expect(rendered.size).toBe(Object.keys(PAGES).length);
  });

  it("a language with a folder gets its tree, and a language of the registry without one does not", () => {
    const f = docsI18nFixture({ languages: ["es"] });
    const site = f.scan();
    expect(site.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    expect(site.docsI18n.languages.map((l) => l.code)).toEqual(["es"]);
    const { rendered } = buildSite(site, BUILD);
    const routes = [...rendered.keys()];
    expect(routes.filter((r) => r.startsWith("/es/docs/"))).toHaveLength(Object.keys(PAGES).length);
    expect(routes.filter((r) => r.startsWith("/ar/"))).toEqual([]);
  });

  it("refuses a folder whose code is not in the home page's registry", () => {
    const f = docsI18nFixture({ languages: ["es", "fr"] });
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toMatch(/(?=[\s\S]*apps\/docs\/i18n\/fr)(?=[\s\S]*locales\.json)/);
  });

  it("refuses a language folder when there is no English reference catalog", () => {
    const f = docsI18nFixture({ catalogs: { en: false } });
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toMatch(/apps\/docs\/i18n\/en\/strings\.json/);
  });
});

/* ---- Everything below reads one fixture, built once --------------------------------------- */

describe("the localized site", () => {
  let mod;
  let f;
  let site;
  let built;
  const L = {};
  const trees = new Map();

  /** Built by the first test that needs it, so that each test fails on its own while the feature is missing. */
  let ready_;
  const ready = () =>
    (ready_ ??= (async () => {
      mod = await docsI18nModule();
      f = fixture();
      site = f.scan();
      built = buildSite(site, BUILD);
      for (const code of CODES) L[code] = mod.localize(site, docsLanguage(site, code));
    })());
  afterAll(() => f?.cleanup());

  const routes = () => site.pages.map((p) => p.route);
  /** The rendered page of an English route in a language ("en" for the English one). */
  const htmlOf = (code, route) => {
    const html = built.rendered.get(code === "en" ? route : localRoute(code, route));
    if (!html) throw new Error(`buildSite(site, { languages: true }) did not render ${code === "en" ? route : localRoute(code, route)}`);
    return html;
  };
  const treeOf = (code, route) => {
    const key = `${code} ${route}`;
    if (!trees.has(key)) trees.set(key, parse(htmlOf(code, route), key));
    return trees.get(key);
  };
  const strings = (code) => docsLanguage(site, code).docsStrings;
  /** What a reader of the language sees as the title of a page in a list: the translation's, else English. */
  const titleIn = (code, route) => (translates(code, route) ? docsLanguage(site, code).pages.get(route).meta.title : site.byRoute.get(route).meta.title);

  /* ---- Routes ------------------------------------------------------------------------- */

  describe("routes: /es/docs/… and /ar/docs/… for every page, English untouched (D2)", () => {
    it("builds with no problem: every link, fragment and id of every language resolves", async () => {
      await ready();
      expect(built.problems).toEqual([]);
    });

    it("renders every English page at its route and one page per language at /<code>/docs/…, and nothing else", async () => {
      await ready();
      const expected = [...routes(), ...CODES.flatMap((code) => routes().map((r) => localRoute(code, r)))].sort();
      expect([...built.rendered.keys()].sort()).toEqual(expected);
    });

    it("renders only the English routes when the languages are not asked for: the default call is the one it was", async () => {
      await ready();
      const { rendered } = buildSite(site, { unchecked: BUILD.unchecked });
      expect([...rendered.keys()].sort()).toEqual(routes().sort());
    });

    it("keeps site.pages English only: the same fifteen pages, all under /docs/", async () => {
      await ready();
      expect(site.pages).toHaveLength(Object.keys(PAGES).length);
      expect(routes().every((r) => r.startsWith("/docs/"))).toBe(true);
      for (const code of CODES) expect(site.byRoute.has(localRoute(code, "/docs/"))).toBe(false);
    });

    it("localize() gives a view of the English pages, in the same order, at the localized routes", async () => {
      await ready();
      for (const code of CODES) {
        const view = L[code];
        expect(view.docsRoute).toBe(`/${code}/docs/`);
        expect(view.locale).toBe(docsLanguage(site, code));
        expect(view.pages).toHaveLength(site.pages.length);
        view.pages.forEach((page, i) => {
          const english = site.pages[i];
          expect(page.english, english.route).toBe(english);
          expect(page.canonicalRoute).toBe(english.route);
          expect(page.route).toBe(localRoute(code, english.route));
          expect(view.byRoute.get(page.route)).toBe(page);
        });
        expect(mod.localize(site, docsLanguage(site, code)), "memoized").toBe(view);
      }
    });

    it("says for each view whether it is a translation, whether it was reviewed and in which language it is written", async () => {
      await ready();
      for (const code of CODES) {
        for (const page of L[code].pages) {
          const path = pathOf(page.canonicalRoute);
          const done = translates(code, page.canonicalRoute);
          expect(page.fallback, `${code} ${page.canonicalRoute}`).toBe(!done);
          expect(page.lang, `${code} ${page.canonicalRoute}`).toBe(done ? code : "en");
          expect(page.reviewed, `${code} ${page.canonicalRoute}`).toBe(done && TRANSLATED[code][path].reviewed === true);
          expect(page.file, `${code} ${page.canonicalRoute}`).toBe(done ? `apps/docs/i18n/${code}/pages/${path}` : `apps/docs/pages/${path}`);
        }
      }
    });

    it("keeps the 404 a single English file of the site: no localized 404 on the real site", async () => {
      await ready();
      const real = scanSite(join(REPO, "apps/docs"), REPO);
      expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
      const { rendered } = buildSite(real, { languages: true });
      expect(rendered.has("/404.html")).toBe(true);
      expect([...rendered.keys()].filter((r) => r.endsWith("404.html"))).toEqual(["/404.html"]);
      expect(real.pages.every((p) => p.route.startsWith("/docs/"))).toBe(true);
      for (const language of real.docsI18n.languages) {
        for (const page of real.pages) expect(rendered.has(`${language.docsRoute}${page.route.slice("/docs/".length)}`), `${language.code} ${page.route}`).toBe(true);
      }
    }, 120_000);
  });

  /* ---- Links stay in the language -------------------------------------------------------- */

  describe("links stay in the language", () => {
    it("localizeLinks rewrites <a href> to the docs and to the home, and data-luz-search-src, and nothing else", async () => {
      await ready();
      const es = docsLanguage(site, "es");
      expect(mod.localizeLinks('<a href="/docs/components/button/">b</a>', es)).toBe('<a href="/es/docs/components/button/">b</a>');
      expect(mod.localizeLinks('<a class="x" href="/docs/get-started/#how" data-a="1">h</a>', es)).toBe('<a class="x" href="/es/docs/get-started/#how" data-a="1">h</a>');
      expect(mod.localizeLinks('<a href="/docs/">d</a><a href="/">h</a>', es)).toBe('<a href="/es/docs/">d</a><a href="/es/">h</a>');
      expect(mod.localizeLinks('<dialog data-luz-search-src="/docs/search-index.json"></dialog>', es)).toBe('<dialog data-luz-search-src="/es/docs/search-index.json"></dialog>');
      expect(mod.localizeLinks('<a href="/docs/get-started/">a</a>', docsLanguage(site, "ar"))).toBe('<a href="/ar/docs/get-started/">a</a>');
      const unchanged = [
        '<link rel="alternate" hreflang="en" href="/docs/x/">',
        '<link rel="canonical" href="/docs/x/">',
        '<a href="/docs/x/index.md">markdown</a>',
        '<a href="https://github.com/nandovejer/luz/docs/">github</a>',
        '<a href="#top">top</a>',
        '<a href="/packages/core/dist/luz.css">css</a>',
        '<a href="/es/docs/x/">already</a>',
        '<a href="/ar/docs/x/">other language</a>',
        "<p>The folder /docs/ holds the pages.</p>",
        '<a href="docs/x/">relative</a>',
      ];
      for (const html of unchanged) expect(mod.localizeLinks(html, es), html).toBe(html);
    });

    it("stores a translation's body already localized and keeps the source in rawBody", async () => {
      await ready();
      const view = L.es.byRoute.get("/es/docs/get-started/");
      expect(view.rawBody).toContain('href="/docs/get-started/install/"');
      expect(view.body).toContain('href="/es/docs/get-started/install/"');
      expect(view.body).not.toContain('href="/docs/');
      expect(view.body).toContain('href="#three"');
    });

    it("sends every link of a localized page to the same language, except the language switcher's and the notice's link to the English page", async () => {
      await ready();
      const problems = [];
      for (const code of CODES) {
        for (const route of routes()) {
          const own = `/${code}/`;
          // The switcher's links are cross-language by nature: they are checked on their own (the switcher tests below)
          const switcher = new Set(findAll(query(treeOf(code, route), "luz-lang-switch"), (n) => n.name === "a"));
          const anchors = findAll(treeOf(code, route), (n) => n.name === "a" && n.attrs.has("href") && !switcher.has(n));
          for (const a of anchors) {
            const href = a.attrs.get("href");
            if (!href.startsWith("/") || href.startsWith("//")) continue;
            const path = href.split(/[#?]/)[0];
            if (a.attrs.has("hreflang")) {
              // The notice: the English version of this same page
              if (a.attrs.get("hreflang") !== "en" || path !== route) problems.push(`${code} ${route}: hreflang link to ${href}`);
              continue;
            }
            if (!path.startsWith(own)) problems.push(`${code} ${route}: ${href} leaves the language`);
            else if (path !== own && !path.endsWith("index.md") && !built.rendered.has(path)) problems.push(`${code} ${route}: ${href} is not a page`);
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it("links the Markdown of a localized page to the Markdown of that page", async () => {
      await ready();
      for (const code of CODES) {
        for (const route of routes()) {
          const copy = find(treeOf(code, route), (n) => n.name === "a" && n.attrs.has("data-docs-copy-page"));
          expect(copy?.attrs.get("href"), `${code} ${route}`).toBe(`${localRoute(code, route)}index.md`);
        }
      }
    });

    it("points the search dialog of a localized page at the search index of its language", async () => {
      await ready();
      for (const code of CODES) {
        const html = htmlOf(code, "/docs/get-started/");
        expect(html).toContain(`data-luz-search-src="/${code}/docs/search-index.json"`);
        expect(html).not.toContain('data-luz-search-src="/docs/search-index.json"');
      }
      expect(htmlOf("en", "/docs/get-started/")).toContain('data-luz-search-src="/docs/search-index.json"');
    });

    it("resolves a link to a page that is not translated to its fallback page in the same language", async () => {
      await ready();
      // get-started/ is translated into es and says <a href="/docs/components/widget/">, which es has not translated
      const widget = query(treeOf("es", "/docs/get-started/"), "div.docs-body");
      const anchor = find(widget, (n) => n.name === "a" && n.attrs.get("href") === "/es/docs/components/widget/");
      expect(anchor, "the link, localized").toBeTruthy();
      expect(built.rendered.has("/es/docs/components/widget/")).toBe(true);
      expect(L.es.byRoute.get("/es/docs/components/widget/").fallback).toBe(true);
      expect(query(treeOf("es", "/docs/components/widget/"), "div.docs-body").attrs.get("lang")).toBe("en");
    });

    it("lists the A–Z index in English inside the chrome of the language, linking the pages of that language", async () => {
      await ready();
      const lists = queryAll(treeOf("es", "/docs/a-z/"), "ul.docs-az__list");
      expect(lists.length).toBeGreaterThan(0);
      for (const list of lists) {
        expect(languageOf(list)).toBe("en");
        for (const a of findAll(list, (n) => n.name === "a")) expect(a.attrs.get("href"), a.attrs.get("href")).toMatch(/^\/es\/docs\//);
      }
    });

    it("relativizes a localized route by its depth, and the search index of each language", async () => {
      await ready();
      const known = new Set(["/", "/es/", "/ar/", "/docs/", "/es/docs/", "/ar/docs/", "/es/docs/components/", "/ar/docs/tokens/color/", "/docs/components/"]);
      const dialog = (code) => `<dialog data-luz-search-src="/${code}/docs/search-index.json"></dialog>`;
      // /es/docs/get-started/ is three folders deep, /ar/docs/tokens/color/ four
      expect(relativizeLinks(`<a href="/es/docs/components/#x">c</a><a href="/es/">h</a>${dialog("es")}`, "/es/docs/get-started/", known)).toBe(
        '<a href="../../../es/docs/components/#x">c</a><a href="../../../es/">h</a><dialog data-luz-search-src="../../../es/docs/search-index.json"></dialog>',
      );
      expect(relativizeLinks(`<a href="/ar/docs/">d</a>${dialog("ar")}`, "/ar/docs/tokens/color/", known)).toBe(
        '<a href="../../../../ar/docs/">d</a><dialog data-luz-search-src="../../../../ar/docs/search-index.json"></dialog>',
      );
      // The English index is still the English page's
      expect(relativizeLinks('<dialog data-luz-search-src="/docs/search-index.json"></dialog>', "/docs/components/", known)).toBe(
        '<dialog data-luz-search-src="../../docs/search-index.json"></dialog>',
      );
      // The 404 keeps the site's path, and links to the homes of the other languages
      expect(
        relativizeLinks('<a href="/es/">es</a><a href="/ar/">ar</a><a href="/es/docs/">d</a><dialog data-luz-search-src="/docs/search-index.json"></dialog>', "/404.html", known, "/luz/"),
      ).toBe('<a href="/luz/es/">es</a><a href="/luz/ar/">ar</a><a href="/luz/es/docs/">d</a><dialog data-luz-search-src="/luz/docs/search-index.json"></dialog>');
    });
  });

  /* ---- lang, dir and titles ------------------------------------------------------------------ */

  describe("{{lang}}, {{dir}} and the title of each page", () => {
    it("writes the language and direction of the page on <html>, also on a fallback page", async () => {
      await ready();
      const expected = { en: ["en", "ltr"], es: ["es", "ltr"], ar: ["ar", "rtl"] };
      for (const [code, [lang, dir]] of Object.entries(expected)) {
        for (const route of routes()) {
          const root = treeOf(code, route);
          const html = find(root, (n) => n.name === "html");
          expect([html.attrs.get("lang"), html.attrs.get("dir") ?? "ltr"], `${code} ${route}`).toEqual([lang, dir]);
        }
      }
      // The attribute is written, not left to the default, on an Arabic page
      expect(htmlOf("ar", "/docs/get-started/")).toMatch(/<html[^>]* dir="rtl"/);
    });

    it("uses the placeholders in the real layout: {{lang}}, {{dir}}, {{alternates}}, {{notice}} and {{contentattrs}}", async () => {
      await ready();
      const layout = readFileSync(join(REPO, "apps/docs/_layouts/page.html"), "utf-8");
      expect(layout).toMatch(/<html[^>]* lang="\{\{lang\}\}"/);
      expect(layout).toMatch(/<html[^>]* dir="\{\{dir\}\}"/);
      expect(layout).toContain("{{alternates}}");
      expect(layout).toMatch(/\{\{notice\}\}\s*<div class="docs-body"[^>]*\{\{contentattrs\}\}/);
      expect(layout).toContain("{{t:chrome.skip}}");
      expect(layout).toContain('aria-label="{{t:chrome.nav}}"');
    });

    it("gives every page of a language its own <title>: '<title> – <area> – <site title>' in the language's chrome", async () => {
      await ready();
      for (const code of CODES) {
        const titles = new Map();
        const site_ = strings(code)["title.site"];
        for (const route of routes()) {
          const title = titleOf(htmlOf(code, route));
          expect(titles.has(title), `${code}: ${route} and ${titles.get(title)} have the title "${title}"`).toBe(false);
          titles.set(title, route);
          const page = site.byRoute.get(route);
          expect(title.endsWith(site_), `${code} ${route}: ${title}`).toBe(true);
          if (route === "/docs/") expect(title).toBe(site_);
          else if (page.meta.area !== "hub" && route !== `/docs/${page.meta.area}/`) {
            expect(title, `${code} ${route}`).toBe(`${titleIn(code, route)} – ${strings(code)[`area.${page.meta.area}`]} – ${site_}`);
          } else expect(title.startsWith(titleIn(code, route)), `${code} ${route}: ${title}`).toBe(true);
        }
      }
    });
  });

  /* ---- hreflang --------------------------------------------------------------------------------- */

  describe("hreflang, canonical and the alternates (reciprocal)", () => {
    const render = (code, route, options = {}) =>
      code === "en" ? renderPage(site.byRoute.get(route), site, options) : renderPage(L[code].byRoute.get(localRoute(code, route)), L[code], options);
    const url = (route) => SITE_URL + route.slice(1);
    const alternates = (html) => Object.fromEntries(headLinks(html).filter((l) => l.rel === "alternate").map((l) => [l.hreflang, l.href]));
    const canonical = (html) => headLinks(html).filter((l) => l.rel === "canonical").map((l) => l.href);

    /** The set a translated page and all its translations list: English, each language that translated it, x-default. */
    const setOf = (route) => ({
      en: url(route),
      ...Object.fromEntries(CODES.filter((c) => translates(c, route)).map((c) => [c, url(localRoute(c, route))])),
      "x-default": url(route),
    });

    it("lists on a translated page its own canonical URL, English, every language that translated it and x-default", async () => {
      await ready();
      const route = "/docs/get-started/";
      const options = { siteUrl: SITE_URL };
      expect(canonical(render("es", route, options))).toEqual([url("/es/docs/get-started/")]);
      expect(alternates(render("es", route, options))).toEqual({ en: url(route), es: url("/es/docs/get-started/"), ar: url("/ar/docs/get-started/"), "x-default": url(route) });
    });

    it("lists only the languages that translated the page: es without ar for a page only es translated, ar without es for tokens/", async () => {
      await ready();
      const options = { siteUrl: SITE_URL };
      expect(alternates(render("es", "/docs/get-started/install/", options))).toEqual(setOf("/docs/get-started/install/"));
      expect(Object.keys(alternates(render("es", "/docs/get-started/install/", options))).sort()).toEqual(["en", "es", "x-default"]);
      expect(Object.keys(alternates(render("ar", "/docs/tokens/", options))).sort()).toEqual(["ar", "en", "x-default"]);
    });

    it("is reciprocal: the English page and each translation of a page list the same set, each with its own canonical", async () => {
      await ready();
      const options = { siteUrl: SITE_URL };
      for (const route of routes()) {
        const members = ["en", ...CODES.filter((c) => translates(c, route))];
        if (members.length === 1) continue;
        for (const code of members) {
          const html = render(code, route, options);
          expect(alternates(html), `${code} ${route}`).toEqual(setOf(route));
          expect(canonical(html), `${code} ${route}`).toEqual([url(code === "en" ? route : localRoute(code, route))]);
        }
      }
    });

    it("gives the English page of a page with no translation its own canonical and no alternate for es or ar", async () => {
      await ready();
      const html = render("en", "/docs/components/widget/", { siteUrl: SITE_URL });
      expect(canonical(html)).toEqual([url("/docs/components/widget/")]);
      expect(Object.keys(alternates(html)).filter((k) => CODES.includes(k))).toEqual([]);
    });

    it("gives a fallback page the canonical of the English page and no alternate, and does not hide it from search", async () => {
      await ready();
      for (const code of CODES) {
        for (const route of routes().filter((r) => !translates(code, r))) {
          const html = render(code, route, { siteUrl: SITE_URL });
          expect(canonical(html), `${code} ${route}`).toEqual([url(route)]);
          expect(headLinks(html).filter((l) => l.rel === "alternate"), `${code} ${route}`).toEqual([]);
          expect(html, `${code} ${route}`).not.toMatch(/<meta[^>]*name="robots"/);
        }
      }
    });

    it("writes root-absolute URLs in dev, where there is no site URL", async () => {
      await ready();
      const html = htmlOf("es", "/docs/get-started/");
      expect(canonical(html)).toEqual(["/es/docs/get-started/"]);
      expect(alternates(html)).toEqual({ en: "/docs/get-started/", es: "/es/docs/get-started/", ar: "/ar/docs/get-started/", "x-default": "/docs/get-started/" });
    });
  });

  /* ---- The language switcher -------------------------------------------------------------------- */

  describe("the language switcher of every docs page (D4)", () => {
    const switcherOf = (code, route) => query(treeOf(code, route), "luz-lang-switch");

    it("is in the header of every page of every language, the one the home page has", async () => {
      await ready();
      for (const code of ["en", ...CODES]) {
        for (const route of routes()) expect(switcherOf(code, route), `${code} ${route}`).toBeTruthy();
      }
    });

    it("links the same page in each language, marks the current one and names each language in its own", async () => {
      await ready();
      const names = { en: "English", es: "Español", ar: "العربية" };
      for (const code of ["en", ...CODES]) {
        for (const route of routes()) {
          const anchors = findAll(switcherOf(code, route), (n) => n.name === "a");
          expect(
            anchors.map((a) => [a.attrs.get("lang"), a.attrs.get("href"), textOf(a)]),
            `${code} ${route}`,
          ).toEqual([
            ["en", route, names.en],
            ["es", localRoute("es", route), names.es],
            ["ar", localRoute("ar", route), names.ar],
          ]);
          expect(anchors.filter((a) => a.attrs.get("aria-current") === "page").map((a) => a.attrs.get("lang")), `${code} ${route}`).toEqual([code]);
        }
      }
    });

    it("says hreflang only on the links whose page is translated, and always on English", async () => {
      await ready();
      for (const code of ["en", ...CODES]) {
        for (const route of routes()) {
          const marked = findAll(switcherOf(code, route), (n) => n.name === "a" && n.attrs.has("hreflang")).map((a) => a.attrs.get("hreflang"));
          expect(marked, `${code} ${route}`).toEqual(["en", ...CODES.filter((c) => translates(c, route))]);
        }
      }
    });

    it("is written in the language of the page, with a button and a popover and no script", async () => {
      await ready();
      const labels = { en: "Language", es: "Idioma", ar: "اللغة" };
      for (const code of ["en", ...CODES]) {
        const root = switcherOf(code, "/docs/get-started/");
        expect(textOf(query(root, "p.luz-lang-switch__title")), code).toBe(labels[code]);
        expect(query(root, "button.luz-lang-switch__button")?.attrs.get("popovertarget"), code).toBe("luz-lang-menu");
        expect(find(root, (n) => n.attrs.has("popover")), code).toBeTruthy();
        expect(findAll(root, (n) => n.name === "script"), code).toEqual([]);
      }
    });
  });

  /* ---- The fallback: a page that is not translated yet ---------------------------------------------- */

  describe("a page that is not translated yet is the English page in the chrome of the language (D3)", () => {
    const fallbacks = (code) => routes().filter((r) => !translates(code, r));
    const translated = (code) => routes().filter((r) => translates(code, r));

    it("puts lang=en and dir=ltr on the content, the title and the lead of a fallback, and not on a translation", async () => {
      await ready();
      for (const code of CODES) {
        for (const route of fallbacks(code)) {
          const root = treeOf(code, route);
          const body = query(root, "div.docs-body");
          expect([body.attrs.get("lang"), body.attrs.get("dir")], `${code} ${route}`).toEqual(["en", "ltr"]);
          expect(languageOf(query(root, "h1.docs-title")), `${code} ${route} h1`).toBe("en");
          expect(languageOf(query(root, "p.luz-docs-page-head__lead")), `${code} ${route} lead`).toBe("en");
        }
        for (const route of translated(code)) {
          const root = treeOf(code, route);
          expect(query(root, "div.docs-body").attrs.has("lang"), `${code} ${route}`).toBe(false);
          expect(languageOf(query(root, "h1.docs-title")), `${code} ${route} h1`).toBe(code);
          expect(languageOf(query(root, "p.luz-docs-page-head__lead")), `${code} ${route} lead`).toBe(code);
        }
      }
    });

    it("marks as English every title of an untranslated page in the sidebar, the pager, Keep going, the breadcrumb, the galleries and On this page", async () => {
      await ready();
      const problems = [];
      const check = (where, node, expected) => {
        if (languageOf(node) !== expected) problems.push(`${where}: "${textOf(node)}" is in ${languageOf(node)}, expected ${expected}`);
      };
      for (const code of CODES) {
        const homeOf = (route) => (translates(code, route) ? code : "en");
        for (const route of routes()) {
          const root = treeOf(code, route);
          const at = `${code} ${route}`;
          const target = (href) => href.slice(code.length + 1);
          // The sidebar: the title of a page is English when the page is
          for (const a of queryAll(query(root, "ul.docs-nav"), "a")) {
            if (hasClass(a, "docs-nav__area")) {
              check(`${at} sidebar area`, a, code);
              continue;
            }
            check(`${at} sidebar ${a.attrs.get("href")}`, a, homeOf(target(a.attrs.get("href"))));
          }
          // The pager and Keep going
          for (const a of findAll(root, (n) => n.name === "a" && hasClass(n, "luz-docs-pager__link"))) {
            check(`${at} pager title`, query(a, "span.luz-docs-pager__title"), homeOf(target(a.attrs.get("href"))));
            check(`${at} pager label`, query(a, "span.luz-docs-pager__label"), code);
          }
          for (const a of findAll(query(root, "ul.docs-end__links"), (n) => n.name === "a")) check(`${at} keep going`, a, homeOf(target(a.attrs.get("href"))));
          // The breadcrumb: the last item is the page itself
          const crumbs = findAll(query(root, "ol.luz-breadcrumb"), (n) => hasClass(n, "luz-breadcrumb__item"));
          crumbs.forEach((crumb, i) => check(`${at} breadcrumb`, crumb, i === crumbs.length - 1 ? homeOf(route) : code));
          // The galleries: a card is the page's title and description
          for (const a of findAll(root, (n) => n.name === "a" && n.parent && hasClass(n.parent, "docs-card__title"))) {
            check(`${at} card`, a, homeOf(target(a.attrs.get("href"))));
          }
          for (const card of queryAll(root, "li.docs-card")) {
            const href = find(card, (n) => n.name === "a").attrs.get("href");
            check(`${at} card description`, query(card, "p.docs-card__desc"), homeOf(target(href)));
          }
          for (const row of queryAll(root, "ul.docs-gallery__rows")) {
            for (const li of findAll(row, (n) => n.name === "li")) check(`${at} gallery row`, find(li, (n) => n.name === "a"), homeOf(target(find(li, (n) => n.name === "a").attrs.get("href"))));
          }
          for (const h2 of findAll(root, (n) => n.name === "h2" && n.parent && hasClass(n.parent, "docs-gallery"))) check(`${at} gallery group`, h2, code);
          // On this page: the headings of the content, in the language of the content
          for (const a of queryAll(root, "a.luz-docs-rail__link")) check(`${at} on this page`, a, homeOf(route));
        }
      }
      expect(problems).toEqual([]);
    });

    it("shows the localized names of the areas and groups where the English ones were, and the language's own eyebrow", async () => {
      await ready();
      for (const code of CODES) {
        const root = treeOf(code, "/docs/components/widget/");
        const areaLinks = queryAll(query(root, "ul.docs-nav"), "a").filter((a) => hasClass(a, "docs-nav__area")).map((a) => textOf(a));
        expect(areaLinks, code).toEqual(site.areas.map((a) => strings(code)[`area.${a.id}`]));
        const eyebrow = textOf(query(root, "p.luz-docs-page-head__eyebrow"));
        expect(eyebrow, code).toBe(`${strings(code)["area.components"]} · ${strings(code)["group.components.actions"]}`);
        expect(textOf(query(query(root, "ul.docs-nav"), "span.luz-sidebar__section-label")), code).toBe(strings(code)["group.components.helpers"]);
      }
    });

    it("shows a notice before the content, with a link to the English page, and no role", async () => {
      await ready();
      for (const code of CODES) {
        for (const route of fallbacks(code)) {
          const root = treeOf(code, route);
          const notices = queryAll(root, "div.docs-notice");
          expect(notices, `${code} ${route}`).toHaveLength(1);
          const [notice] = notices;
          expect(hasClass(notice, "luz-alert") && hasClass(notice, "luz-alert--info"), `${code} ${route}`).toBe(true);
          expect(notice.attrs.has("role"), `${code} ${route}: a static notice is no alert`).toBe(false);
          // Between the page head and the content, inside main
          const siblings = query(root, "main").children;
          const at = (n) => siblings.indexOf(n);
          expect(at(notice) > at(find(root, (n) => hasClass(n, "luz-docs-page-head"))), `${code} ${route}: after the head`).toBe(true);
          expect(at(notice) < at(query(root, "div.docs-body")), `${code} ${route}: before the content`).toBe(true);
          // It is written in the language of the page and links the English page
          expect(languageOf(notice), `${code} ${route}`).toBe(code);
          const english = find(notice, (n) => n.name === "a");
          expect([english?.attrs.get("href"), english?.attrs.get("hreflang")], `${code} ${route}`).toEqual([route, "en"]);
          expect(strings(code)["notice.untranslated"], "the catalog key notice.untranslated").toBeTruthy();
          const said = strings(code)["notice.untranslated"].replace(/<[^>]*>/g, "").split(/\{[^}]*\}/).sort((a, b) => b.length - a.length)[0].trim();
          expect(textOf(notice), `${code} ${route}`).toContain(said);
        }
      }
    });

    it("points the Edit this page links of a fallback at the English file, and of a translation at the translation", async () => {
      await ready();
      const edit = "https://github.com/nandovejer/luz/edit/main/";
      for (const code of CODES) {
        for (const route of routes()) {
          const expected = `${edit}${translates(code, route) ? `apps/docs/i18n/${code}/pages/` : "apps/docs/pages/"}${pathOf(route)}`;
          const hrefs = findAll(treeOf(code, route), (n) => n.name === "a" && n.attrs.get("href")?.startsWith(edit)).map((a) => a.attrs.get("href"));
          expect(hrefs, `${code} ${route}`).toEqual([expected, expected]);
        }
      }
    });

    it("keeps the English pages as they were: no notice, no lang on the content, English chrome", async () => {
      await ready();
      for (const route of routes()) {
        const root = treeOf("en", route);
        expect(queryAll(root, "div.docs-notice"), route).toEqual([]);
        expect(query(root, "div.docs-body").attrs.has("lang"), route).toBe(false);
      }
    });
  });
});
