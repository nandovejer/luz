/**
 * LUZ docs site: HTML elements is an area of the sidebar like any other.
 *
 * The owner's decision (2026-10-22): "HTML elements" (area `html`, 15 pages under /docs/html/) is
 * no longer nested in Documentation. The `parent` feature of site.json is removed: no area is
 * nested, and the sidebar, the breadcrumb and the reading order treat `html` as every other area.
 * The URLs and the `area: html` of the pages do not change.
 *
 *   site.json     no area carries "parent"; scanSite does not read it (no check, no field).
 *   sidebar       `html` is a top-level item of `ul.docs-nav`: `a.docs-nav__area` (the area label, linking
 *                 to the area index) and the list of the 14 other pages in its fold, as Documentation and
 *                 Accessibility. Order: Get started, Tokens, Core, Catalog, Landing, CMS, App, Documentation,
 *                 HTML elements, Accessibility. `.docs-nav__sub` and `a.docs-nav__subarea` are gone.
 *   aria-current  on an HTML page: "page" on its own link and "true" on the HTML elements area link (and not
 *                 on Documentation); on the HTML index the area link is "page".
 *   breadcrumb    Docs > HTML elements > Title; on the index, Docs > HTML elements.
 *   reading order the HTML pages come after the Documentation pages, before Accessibility.
 *   es and ar     the same, with the labels of the catalogs (area.html): no new catalog key.
 *
 * The browser half (the look, the keyboard, the drawer, the reflow) is tests/docs-nav-html.spec.js.
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { renderLlmsTxt } from "../scripts/docs-site/ai.js";
import { buildSearchIndex, buildSite, indexData, readingOrder, scanSite } from "../scripts/docs-site/site.js";
import { docsLanguage, languageOf } from "./helpers/docs-i18n-fixture.js";
import { makeSite } from "./helpers/docs-i18n-size-fixture.js";
import { findAll, hasClass, parse, query, queryAll, queryAllLive, queryLive, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The top-level areas of the sidebar, in order (the owner's list). */
const AREA_ORDER = ["get-started", "tokens", "components", "site", "landing", "cms", "app", "documentation", "html", "accessibility"];

/* ---- site.json: "parent" is gone ----------------------------------------------------------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A docs folder whose site.json lists `areas`. */
function fixtureSite(areas) {
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-docs-noparent-"));
  temps.push(repoRoot);
  const docsDir = join(repoRoot, "apps/docs");
  const files = {
    "site.json": `{\n  "areas": [\n${areas.map((a) => `    ${JSON.stringify(a)}`).join(",\n")}\n  ]\n}\n`,
    "pages/index.html": "<!-- luz:page\ntitle: Home\ndescription: About Home.\narea: hub\n-->\n<p>Hello.</p>\n",
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(docsDir, path)), { recursive: true });
    writeFileSync(join(docsDir, path), text);
  }
  return { repoRoot, docsDir };
}

describe("site.json: no area is nested", () => {
  it("has no \"parent\" on any area of the real site.json, and no scanned area carries one", () => {
    const { areas } = JSON.parse(readFileSync(join(repo, "apps/docs/site.json"), "utf-8"));
    expect(areas.filter((a) => "parent" in a).map((a) => a.id)).toEqual([]);
    const site = scanSite(join(repo, "apps/docs"), repo);
    expect(site.areas.filter((a) => a.parent !== undefined).map((a) => a.id)).toEqual([]);
  });

  it("lists the areas in the sidebar order, HTML elements right after Documentation and before Accessibility", () => {
    const site = scanSite(join(repo, "apps/docs"), repo);
    expect(site.areas.map((a) => a.id)).toEqual(AREA_ORDER);
  });

  it("no longer validates \"parent\": scanSite does not refuse an unknown parent", () => {
    const { repoRoot, docsDir } = fixtureSite([
      { id: "components", label: "Components", slug: "components" },
      { id: "html", label: "HTML elements", slug: "html", parent: "nowhere" },
    ]);
    expect(() => scanSite(docsDir, repoRoot)).not.toThrow();
  });

  it("no longer ships the nested sidebar's CSS or markup: no .docs-nav__sub, no docs-nav__subarea", () => {
    const css = readFileSync(join(repo, "apps/docs/reference.css"), "utf-8");
    expect(css).not.toMatch(/docs-nav__sub/);
    const generator = readFileSync(join(repo, "scripts/docs-site/site.js"), "utf-8");
    expect(generator).not.toMatch(/docs-nav__sub/);
  });
});

/* ---- The real site, English ---------------------------------------------------------------------- */

const site = scanSite(join(repo, "apps/docs"), repo);
const { rendered } = buildSite(site);
const trees = new Map();
const treeOf = (route) => trees.get(route) ?? trees.set(route, parse(rendered.get(route), route)).get(route);

const order = readingOrder(site);
const orderRoutes = order.map((p) => p.route);

const HTML_INDEX = "/docs/html/";
const DOCS_INDEX = "/docs/documentation/";
const ACCESSIBILITY = "/docs/accessibility/";
const htmlPages = site.pages.filter((p) => p.meta.area === "html");
/** The pages listed under the area link: the area's pages but its index, in reading order. */
const htmlListed = order.filter((p) => p.meta.area === "html" && p.route !== HTML_INDEX).map((p) => p.route);
/** The sidebar's list: the one `ul.docs-nav` of the page. */
const listOf = (route) => query(treeOf(route), "ul.docs-nav");
const linksOf = (route) => findAll(listOf(route), (n) => n.name === "a");
const areaItem = (list, href) => queryAll(list, "a.docs-nav__area").find((a) => a.attrs.get("href") === href).parent;

describe("the sidebar lists HTML elements as an area of its own", () => {
  it("has the 15 pages of the HTML elements area where they were: same routes, same area, same files", () => {
    const files = readdirSync(join(repo, "apps/docs/pages/html")).filter((f) => f.endsWith(".html"));
    expect(files).toHaveLength(15);
    expect(htmlPages.map((p) => p.route).sort()).toEqual(files.map((f) => (f === "index.html" ? HTML_INDEX : `/docs/html/${f.replace(/\.html$/, "")}/`)).sort());
    // The index is the area link, the 14 others the list under it
    expect(htmlListed).toHaveLength(14);
  });

  it("lists the ten areas as a.docs-nav__area, in the owner's order, with HTML elements between Documentation and Accessibility, on every page", () => {
    for (const p of site.pages) {
      const hrefs = queryAll(listOf(p.route), "a.docs-nav__area").map((a) => a.attrs.get("href"));
      expect(hrefs, p.route).toEqual(AREA_ORDER.map((id) => `/docs/${site.areas.find((a) => a.id === id).slug}/`));
    }
  });

  it("holds HTML elements in its own item of ul.docs-nav: the area link, then the list in its fold with the 14 pages, like Documentation", () => {
    const label = site.areas.find((a) => a.id === "html").label;
    expect(label).toBe("HTML elements");
    for (const p of site.pages) {
      const list = listOf(p.route);
      const item = areaItem(list, HTML_INDEX);
      expect(item.name, p.route).toBe("li");
      expect(item.parent, `${p.route}: the item is a direct child of ul.docs-nav`).toBe(list);
      const head = query(item, "a.docs-nav__area");
      expect(textOf(head), p.route).toBe(label);
      expect(hasClass(head, "luz-sidebar__link"), `${p.route}: it is a sidebar link`).toBe(true);
      const lists = queryAll(item, "ul");
      expect(lists, `${p.route}: one list of pages`).toHaveLength(1);
      expect(head.open.index, p.route).toBeLessThan(lists[0].open.index);
      expect(
        findAll(lists[0], (n) => n.name === "a").map((a) => a.attrs.get("href")),
        p.route,
      ).toEqual(htmlListed);
      // Nothing of the area is inside the Documentation item, nor the other way round
      const documentation = areaItem(list, DOCS_INDEX);
      expect(findAll(documentation, (n) => n.name === "a" && n.attrs.get("href").startsWith("/docs/html/")), `${p.route}: no HTML link inside Documentation`).toEqual([]);
    }
  });

  it("has no nested block left: no .docs-nav__sub, no a.docs-nav__subarea, on any page", () => {
    for (const p of site.pages) {
      expect(rendered.get(p.route), p.route).not.toMatch(/docs-nav__sub/);
      expect(findAll(listOf(p.route), (n) => hasClass(n, "docs-nav__sub") || hasClass(n, "docs-nav__subarea")), p.route).toEqual([]);
    }
  });

  it("folds the areas with pages and still lists every page of every area once, in reading order", () => {
    for (const p of site.pages) {
      // The HTML elements area is a fold of its own, a sibling of the others, with its pages in it; nothing is hidden by the markup
      const folded = findAll(listOf(p.route), (n) => n.attrs.has("hidden") || n.attrs.has("aria-expanded"));
      expect(folded.map((n) => n.name), p.route).toEqual([]);
      expect(query(areaItem(listOf(p.route), HTML_INDEX), "details"), `${p.route}: HTML elements has a fold`).toBeTruthy();
      expect(queryAll(listOf(p.route), "details").every((d) => d.parent.parent === listOf(p.route)), `${p.route}: no fold is nested in another`).toBe(true);
      const hrefs = linksOf(p.route).map((a) => a.attrs.get("href"));
      let at = -1;
      for (const route of orderRoutes) {
        const i = hrefs.indexOf(route, at + 1);
        expect(i, `${p.route}: ${route} is listed, after the page before it`).toBeGreaterThan(at);
        at = i;
      }
      expect(hrefs.filter((h) => h === HTML_INDEX), `${p.route}: the HTML elements index is linked once`).toHaveLength(1);
    }
  });
});

describe("aria-current in the sidebar", () => {
  /** What the sidebar must mark on a page: the page itself, and its area link when the page is not the area index. */
  const marksOf = (p) => {
    const area = site.areas.find((a) => a.id === p.meta.area);
    if (!area) return { page: [], true: [] };
    return { page: [p.route], true: p.route === `/docs/${area.slug}/` ? [] : [`/docs/${area.slug}/`] };
  };

  it("marks an HTML page \"page\" and the HTML elements area link \"true\", and not Documentation", () => {
    for (const p of htmlPages.filter((q) => q.route !== HTML_INDEX)) {
      const links = linksOf(p.route);
      expect(links.find((a) => a.attrs.get("href") === p.route).attrs.get("aria-current"), p.route).toBe("page");
      expect(links.find((a) => hasClass(a, "docs-nav__area") && a.attrs.get("href") === HTML_INDEX).attrs.get("aria-current"), p.route).toBe("true");
      expect(links.find((a) => a.attrs.get("href") === DOCS_INDEX).attrs.has("aria-current"), `${p.route}: Documentation is not marked`).toBe(false);
    }
  });

  it("marks the HTML elements index \"page\" on the area link, and nothing else", () => {
    const links = linksOf(HTML_INDEX);
    expect(links.find((a) => hasClass(a, "docs-nav__area") && a.attrs.get("href") === HTML_INDEX).attrs.get("aria-current")).toBe("page");
    expect(links.filter((a) => a.attrs.has("aria-current")).map((a) => a.attrs.get("href"))).toEqual([HTML_INDEX]);
  });

  it("leaves the HTML elements area link unmarked on every page that is not in the area", () => {
    for (const p of site.pages.filter((q) => q.meta.area !== "html")) {
      const head = linksOf(p.route).find((a) => a.attrs.get("href") === HTML_INDEX);
      expect(head.attrs.has("aria-current"), p.route).toBe(false);
    }
  });

  it("has exactly one aria-current=\"page\" per page and, at most, the \"true\" of its own area link", () => {
    for (const p of site.pages) {
      const links = linksOf(p.route);
      const expected = marksOf(p);
      const at = (value) => links.filter((a) => a.attrs.get("aria-current") === value).map((a) => a.attrs.get("href"));
      expect(at("page"), `${p.route} page`).toEqual(expected.page);
      expect(at("true"), `${p.route} true`).toEqual(expected.true);
      expect(links.filter((a) => hasClass(a, "is-active")), p.route).toEqual([]);
    }
  });
});

describe("the breadcrumb of an HTML page: Docs > HTML elements > Title", () => {
  const crumbs = (route) => findAll(queryLive(treeOf(route), "nav.docs-breadcrumb"), (n) => hasClass(n, "luz-breadcrumb__item"));

  it("links Docs and HTML elements, then names the page, with no Documentation between, on every page of the area", () => {
    for (const p of htmlPages.filter((q) => q.route !== HTML_INDEX)) {
      const items = crumbs(p.route);
      expect(items.map((a) => textOf(a)), p.route).toEqual(["Docs", "HTML elements", p.meta.title]);
      expect(items.map((a) => a.attrs.get("href") ?? null), p.route).toEqual(["/docs/", HTML_INDEX, null]);
      expect(items.at(-1).attrs.get("aria-current"), p.route).toBe("page");
    }
  });

  it("ends at HTML elements, the current page, on its index", () => {
    const items = crumbs(HTML_INDEX);
    expect(items.map((a) => textOf(a))).toEqual(["Docs", "HTML elements"]);
    expect(items.map((a) => a.attrs.get("href") ?? null)).toEqual(["/docs/", null]);
    expect(items.at(-1).attrs.get("aria-current")).toBe("page");
  });

  it("leaves the breadcrumb of every other page as it was: Docs > Area > Title", () => {
    for (const p of site.pages.filter((q) => q.meta.area !== "html" && q.meta.area !== "hub" && q.route !== "/docs/")) {
      const area = site.areas.find((a) => a.id === p.meta.area);
      const items = crumbs(p.route);
      const index = p.route === `/docs/${area.slug}/`;
      expect(items.map((a) => textOf(a)), p.route).toEqual(index ? ["Docs", p.meta.title] : ["Docs", area.label, p.meta.title]);
    }
  });
});

describe("the reading order (Previous / Next)", () => {
  const end = (route) => {
    const tree = treeOf(route);
    const rel = (kind) => queryAllLive(tree, "a.luz-docs-pager__link").find((n) => n.attrs.get("rel") === kind)?.attrs.get("href") ?? null;
    return { prev: rel("prev"), next: rel("next") };
  };
  const areaRuns = (routes, areaOf) => routes.map(areaOf).filter((id, i, all) => id !== all[i - 1]);
  const areaOfRoute = (route) => site.byRoute.get(route).meta.area;

  it("lists the areas in runs, in the sidebar's order, with HTML elements after Documentation and before Accessibility", () => {
    expect(areaRuns(orderRoutes, areaOfRoute)).toEqual(AREA_ORDER);
    expect(orderRoutes.at(-1)).toBe(ACCESSIBILITY);
  });

  it("starts the HTML run with its index, then the pages in the order the sidebar lists them", () => {
    const run = orderRoutes.filter((r) => areaOfRoute(r) === "html");
    expect(run).toEqual([HTML_INDEX, ...htmlListed]);
    const start = orderRoutes.indexOf(HTML_INDEX);
    expect(orderRoutes.slice(start, start + run.length)).toEqual(run);
  });

  it("goes from the last Documentation page to the HTML index, and from the last HTML page to Accessibility", () => {
    const lastDocumentation = orderRoutes.filter((r) => areaOfRoute(r) === "documentation").at(-1);
    const lastHtml = htmlListed.at(-1);
    expect(end(lastDocumentation).next).toBe(HTML_INDEX);
    expect(end(HTML_INDEX).prev).toBe(lastDocumentation);
    expect(end(HTML_INDEX).next).toBe(htmlListed[0]);
    expect(end(lastHtml).next).toBe(ACCESSIBILITY);
    expect(end(ACCESSIBILITY).prev).toBe(lastHtml);
    expect(end(ACCESSIBILITY).next).toBeNull();
  });

  it("gives Core the page that came before it, the last page of Tokens", () => {
    const lastTokens = orderRoutes.filter((r) => areaOfRoute(r) === "tokens").at(-1);
    expect(end("/docs/components/").prev).toBe(lastTokens);
    expect(end(lastTokens).next).toBe("/docs/components/");
  });

  it("is one path through every page: each Next is the Previous of the page it points at", () => {
    for (const [i, route] of orderRoutes.entries()) {
      const { prev, next } = end(route);
      expect(prev, route).toBe(orderRoutes[i - 1] ?? null);
      expect(next, route).toBe(orderRoutes[i + 1] ?? null);
    }
    expect(new Set(orderRoutes).size).toBe(orderRoutes.length);
  });
});

describe("what does not change", () => {
  it("keeps the A-Z kind and the area label of the HTML pages in the A-Z index and in the search index", () => {
    const entries = indexData(site).filter((e) => e.page.meta.area === "html");
    expect(entries).toHaveLength(15);
    for (const e of entries) {
      expect(e.area, e.route).toBe("HTML elements");
      expect(e.kind, e.route).toBe("HTML elements");
    }
    const pages = buildSearchIndex(site).pages.filter(([, url]) => url.startsWith("html/"));
    expect(pages).toHaveLength(15);
    for (const [, url, meta] of pages) expect(meta, url).toMatch(/^HTML elements/);
  });

  it("keeps the HTML elements section of llms.txt, with its 15 pages", () => {
    const text = renderLlmsTxt(site);
    const start = text.indexOf("\n## HTML elements\n");
    expect(start).toBeGreaterThan(-1);
    const section = text.slice(start + 1).split(/\n## /)[0];
    const routes = [...section.matchAll(/\]\((\/docs\/html\/[^)]*)\)/g)].map((m) => m[1]);
    expect(routes.sort()).toEqual(htmlPages.map((p) => p.route).sort());
  });
});

/* ---- Spanish and Arabic ------------------------------------------------------------------------- */

// Only Spanish has docs in the real repository (Arabic docs are planned). The right-to-left sidebar is still checked, on a
// copy of the real docs with a stand-in Arabic language (tests/helpers/docs-i18n-size-fixture.js: the English catalog
// written in Arabic letters, every page in the English fallback). Spanish is the real folder.
describe("the sidebar in Spanish (real) and Arabic (a stand-in copy of the docs)", () => {
  const copy = makeSite({ languages: ["es", "ar"] });
  afterAll(() => copy.cleanup());
  it("runs on the real repository without Arabic docs: the stand-in is a copy", () => {
    expect(readdirSync(join(repo, "apps/docs/i18n")).sort()).toEqual(["en", "es", "glossary.json"]);
    expect(copy.standIns).toEqual(["ar"]);
  });
  const langSite = scanSite(copy.docsDir, copy.repoRoot);
  const langs = buildSite(langSite, { languages: true, unchecked: ["/", "/es/", "/ar/"] });
  const tree = (route) => trees.get(route) ?? trees.set(route, parse(langs.rendered.get(route), route)).get(route);
  const strings = (code) => docsLanguage(langSite, code).docsStrings;
  const directionOf = (node) => {
    for (let n = node; n; n = n.parent) if (n.attrs?.has("dir")) return n.attrs.get("dir");
    return "ltr";
  };
  const translates = (code, route) => docsLanguage(langSite, code).pages.has(route);

  for (const code of ["es", "ar"]) {
    describe(code, () => {
      const root = `/${code}`;
      const list = (route) => query(tree(`${root}${route}`), "ul.docs-nav");

      it("builds with no problem (no key missing or unused: the label is area.html, no new key)", () => {
        expect(langs.problems).toEqual([]);
        expect(strings(code)["area.html"]).toBeTruthy();
        expect(strings(code)["area.documentation"]).toBeTruthy();
      });

      it("lists the ten areas, HTML elements labelled in the language between Documentation and Accessibility, linking to its index", () => {
        for (const route of ["/docs/html/forms/", HTML_INDEX, DOCS_INDEX, "/docs/components/button/"]) {
          const areas = queryAll(list(route), "a.docs-nav__area");
          expect(
            areas.map((a) => textOf(a)),
            `${code} ${route}`,
          ).toEqual(AREA_ORDER.map((id) => strings(code)[`area.${id}`]));
          const head = areas.find((a) => a.attrs.get("href") === `${root}${HTML_INDEX}`);
          expect(head, `${code} ${route}: the HTML elements area link`).toBeTruthy();
          expect(textOf(head), `${code} ${route}`).toBe(strings(code)["area.html"]);
          // The label is in the language of the page, as the other area links are
          expect(languageOf(head), `${code} ${route}`).toBe(code);
          expect(findAll(list(route), (n) => hasClass(n, "docs-nav__sub")), `${code} ${route}`).toEqual([]);
        }
      });

      it("lists the 14 pages under it in the language of the page, each as English (lang=en, left to right) when it is not translated", () => {
        const item = areaItem(list("/docs/html/forms/"), `${root}${HTML_INDEX}`);
        const links = findAll(query(item, "ul"), (n) => n.name === "a");
        expect(
          links.map((a) => a.attrs.get("href")),
          code,
        ).toEqual(htmlListed.map((r) => `${root}${r}`));
        for (const a of links) {
          const route = a.attrs.get("href").slice(root.length);
          const done = translates(code, route);
          expect(languageOf(a), `${code} ${route}`).toBe(done ? code : "en");
          if (!done && code === "ar") expect(directionOf(a), `${code} ${route}: an English island in Arabic is left to right`).toBe("ltr");
          if (done && code === "ar") expect(directionOf(a), `${code} ${route}`).toBe("rtl");
        }
        expect(directionOf(query(item, "a.docs-nav__area")), code).toBe(code === "ar" ? "rtl" : "ltr");
      });

      it("marks the current page and the HTML elements area link, and not Documentation", () => {
        const links = findAll(list("/docs/html/forms/"), (n) => n.name === "a");
        const at = (value) => links.filter((a) => a.attrs.get("aria-current") === value).map((a) => a.attrs.get("href"));
        expect(at("page")).toEqual([`${root}/docs/html/forms/`]);
        expect(at("true")).toEqual([`${root}${HTML_INDEX}`]);
        const index = findAll(list(HTML_INDEX), (n) => n.name === "a");
        expect(index.filter((a) => a.attrs.has("aria-current")).map((a) => `${a.attrs.get("aria-current")} ${a.attrs.get("href")}`)).toEqual([`page ${root}${HTML_INDEX}`]);
      });

      it("writes the breadcrumb Docs > HTML elements > Title with the catalog's words", () => {
        const items = findAll(queryLive(tree(`${root}/docs/html/forms/`), "nav.docs-breadcrumb"), (n) => hasClass(n, "luz-breadcrumb__item"));
        const done = translates(code, "/docs/html/forms/");
        const title = (done ? docsLanguage(langSite, code).pages.get("/docs/html/forms/") : langSite.byRoute.get("/docs/html/forms/")).meta.title;
        expect(items.map((a) => textOf(a))).toEqual([strings(code)["chrome.crumb-docs"], strings(code)["area.html"], title]);
        expect(items.map((a) => a.attrs.get("href") ?? null)).toEqual([`${root}/docs/`, `${root}${HTML_INDEX}`, null]);
      });

      it("reads in the same order: Documentation, HTML elements, its pages, Accessibility", () => {
        const rel = (route, kind) => queryAllLive(tree(`${root}${route}`), "a.luz-docs-pager__link").find((n) => n.attrs.get("rel") === kind)?.attrs.get("href");
        const lastDocumentation = orderRoutes.filter((r) => langSite.byRoute.get(r).meta.area === "documentation").at(-1);
        expect(rel(lastDocumentation, "next")).toBe(`${root}${HTML_INDEX}`);
        expect(rel(HTML_INDEX, "prev")).toBe(`${root}${lastDocumentation}`);
        expect(rel(htmlListed.at(-1), "next")).toBe(`${root}${ACCESSIBILITY}`);
        expect(rel(ACCESSIBILITY, "prev")).toBe(`${root}${htmlListed.at(-1)}`);
      });
    });
  }
});
