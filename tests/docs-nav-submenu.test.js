/**
 * LUZ docs site: an area may be nested in another one's sidebar section.
 *
 * The owner's request (2026-10-18): "HTML elements" (area `html`, 15 pages under /docs/html/)
 * is no longer a section of its own in the sidebar. It is a submenu of the "Documentation"
 * section (area `documentation`): Documentation > its pages > HTML elements > its pages.
 * The URLs and the `area: html` of the pages stay. Only the sidebar, the breadcrumb and the
 * reading order change.
 *
 *   site.json     an area may carry "parent": "<area id>". scanSite refuses, with file:line,
 *                 a parent that does not exist, a parent that is itself nested (one level
 *                 only), a nested area with groups and an area that is its own parent.
 *   sidebar       `html` is not a top-level `a.docs-nav__area`. Inside the Documentation item,
 *                 after its own page links: `.docs-nav__sub` holding `a.docs-nav__subarea`
 *                 (the area index, labelled with the area label) and `ul.docs-nav__pages`
 *                 named by that link (`aria-labelledby`), with the pages of the area.
 *   aria-current  on an HTML page: "page" on its own link, "true" on the sub-area link and on
 *                 the Documentation area link; on the HTML index the sub-area link is the
 *                 page itself.
 *   breadcrumb    Docs > Documentation > HTML elements > Title.
 *   reading order the HTML pages come after the Documentation pages, before Accessibility.
 *   es and ar     the same, with the labels of the catalogs (area.html, area.documentation):
 *                 no new catalog key.
 *
 * The browser half (the look, the keyboard, the drawer, the reflow) is tests/docs-nav-submenu.spec.js.
 * The pages that carry the list of the 15 pages are the files of apps/docs/pages/html/: the
 * index is the sub-area link, so the list holds the 14 others (the sidebar never lists an
 * area's index among its pages: `sectionsOf`).
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { renderLlmsTxt } from "../scripts/docs-site/ai.js";
import { buildSearchIndex, buildSite, indexData, readingOrder, scanSite } from "../scripts/docs-site/site.js";
import { docsLanguage, languageOf } from "./helpers/docs-i18n-fixture.js";
import { makeSite } from "./helpers/docs-i18n-size-fixture.js";
import { findAll, hasClass, isInside, parse, query, queryAll, queryAllLive, queryLive, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- site.json: the rules of "parent" ---------------------------------------------------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** The first line of the areas in the site.json `fixtureSite` writes: one area per line. */
const FIRST_AREA_LINE = 3;

/** A docs folder whose site.json lists `areas`, one per line (so the line of each is known). */
function fixtureSite(areas) {
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-docs-parent-"));
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

const scan = (areas) => {
  const { repoRoot, docsDir } = fixtureSite(areas);
  return () => scanSite(docsDir, repoRoot);
};

const DOCUMENTATION = { id: "documentation", label: "Documentation", slug: "documentation" };
const HTML = { id: "html", label: "HTML elements", slug: "html" };
const COMPONENTS = { id: "components", label: "Components", slug: "components" };

describe("site.json: an area may be nested in another (\"parent\")", () => {
  it("accepts an area with the id of a top-level area as its parent, and keeps the field on the area", () => {
    const site = scan([COMPONENTS, DOCUMENTATION, { ...HTML, parent: "documentation" }])();
    expect(site.areas.find((a) => a.id === "html")?.parent).toBe("documentation");
    expect(site.areas.find((a) => a.id === "documentation")?.parent).toBeUndefined();
  });

  it("refuses a parent that is not an area of site.json, with the file and the line of the area", () => {
    const line = FIRST_AREA_LINE + 2;
    expect(scan([COMPONENTS, DOCUMENTATION, { ...HTML, parent: "nowhere" }])).toThrow(new RegExp(`apps/docs/site\\.json:${line}\\b.*parent`, "i"));
  });

  it("refuses a parent that is itself nested: one level only", () => {
    // html is under documentation, which is under components: html is the area at fault
    const line = FIRST_AREA_LINE + 2;
    const areas = [COMPONENTS, { ...DOCUMENTATION, parent: "components" }, { ...HTML, parent: "documentation" }];
    expect(scan(areas)).toThrow(new RegExp(`apps/docs/site\\.json:${line}\\b.*parent`, "i"));
  });

  it("refuses a nested area that has groups", () => {
    const line = FIRST_AREA_LINE + 2;
    const grouped = { ...HTML, parent: "documentation", groups: [{ id: "elements", label: "Elements" }] };
    expect(scan([COMPONENTS, DOCUMENTATION, grouped])).toThrow(new RegExp(`apps/docs/site\\.json:${line}\\b.*(parent|nested|groups)`, "i"));
  });

  it("refuses an area that is its own parent", () => {
    const line = FIRST_AREA_LINE + 1;
    expect(scan([COMPONENTS, { ...HTML, parent: "html" }, DOCUMENTATION])).toThrow(new RegExp(`apps/docs/site\\.json:${line}\\b.*parent`, "i"));
  });

  it("nests HTML elements in Documentation in the real site.json, and no other area", () => {
    const site = scanSite(join(repo, "apps/docs"), repo);
    expect(Object.fromEntries(site.areas.filter((a) => a.parent).map((a) => [a.id, a.parent]))).toEqual({ html: "documentation" });
    expect(site.areas.find((a) => a.id === "html")?.groups).toBeUndefined();
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
const htmlPages = site.pages.filter((p) => p.meta.area === "html");
/** The pages listed under the sub-area link: the area's pages but its index, in reading order. */
const htmlListed = order.filter((p) => p.meta.area === "html" && p.route !== HTML_INDEX).map((p) => p.route);
const topLevel = site.areas.filter((a) => !a.parent);
/** The sidebar's list: the one `ul.docs-nav` of the page. */
const listOf = (route) => query(treeOf(route), "ul.docs-nav");
const linksOf = (route) => findAll(listOf(route), (n) => n.name === "a");

describe("the sidebar nests HTML elements inside the Documentation section", () => {
  it("has the 15 pages of the HTML elements area where they were: same routes, same area, same files", () => {
    const files = readdirSync(join(repo, "apps/docs/pages/html")).filter((f) => f.endsWith(".html"));
    expect(files).toHaveLength(15);
    expect(htmlPages.map((p) => p.route).sort()).toEqual(files.map((f) => (f === "index.html" ? HTML_INDEX : `/docs/html/${f.replace(/\.html$/, "")}/`)).sort());
    // The index is the sub-area link, the 14 others the list under it
    expect(htmlListed).toHaveLength(14);
  });

  it("is no longer a top-level area: a.docs-nav__area lists the areas without a parent, in site.json order", () => {
    for (const p of site.pages) {
      const areas = queryAll(listOf(p.route), "a.docs-nav__area");
      expect(
        areas.map((a) => a.attrs.get("href")),
        p.route,
      ).toEqual(topLevel.map((a) => `/docs/${a.slug}/`));
      expect(
        areas.map((a) => a.attrs.get("href")),
        `${p.route}: no top-level link to HTML elements`,
      ).not.toContain(HTML_INDEX);
    }
  });

  it("puts one .docs-nav__sub inside the Documentation item, after the links of Documentation's own pages", () => {
    const own = order.filter((p) => p.meta.area === "documentation" && p.route !== DOCS_INDEX).map((p) => p.route);
    expect(own.length).toBeGreaterThan(5);
    for (const p of site.pages) {
      const list = listOf(p.route);
      const subs = findAll(list, (n) => hasClass(n, "docs-nav__sub"));
      expect(subs, `${p.route}: one nested block`).toHaveLength(1);
      const [sub] = subs;
      const area = queryAll(list, "a.docs-nav__area").find((a) => a.attrs.get("href") === DOCS_INDEX);
      const item = area.parent;
      expect(isInside(sub, item), `${p.route}: the block is inside the item of the Documentation area link`).toBe(true);
      const ownLinks = findAll(item, (n) => n.name === "a" && own.includes(n.attrs.get("href")));
      expect(ownLinks.map((a) => a.attrs.get("href")), p.route).toEqual(own);
      for (const a of ownLinks) {
        expect(isInside(a, sub), `${p.route}: ${a.attrs.get("href")} is not in the nested block`).toBe(false);
        expect(a.open.index, `${p.route}: ${a.attrs.get("href")} comes before the nested block`).toBeLessThan(sub.open.index);
      }
      // The next area follows the whole block
      const next = queryAll(list, "a.docs-nav__area").find((a) => a.attrs.get("href") === "/docs/accessibility/");
      expect(next.open.index, p.route).toBeGreaterThan(sub.close.index);
    }
  });

  it("holds the link to the area index (class docs-nav__subarea, the area label) and a list of its pages named by that link", () => {
    const label = site.areas.find((a) => a.id === "html").label;
    for (const p of site.pages) {
      const [sub] = findAll(listOf(p.route), (n) => hasClass(n, "docs-nav__sub"));
      const heads = queryAll(sub, "a.docs-nav__subarea");
      expect(heads, `${p.route}: one sub-area link`).toHaveLength(1);
      const [head] = heads;
      expect(head.attrs.get("href"), p.route).toBe(HTML_INDEX);
      expect(textOf(head), p.route).toBe(label);
      expect(hasClass(head, "docs-nav__area"), `${p.route}: the sub-area link is not an area link of the top level`).toBe(false);
      expect(hasClass(head, "luz-sidebar__link"), `${p.route}: it is a sidebar link`).toBe(true);
      const lists = queryAll(sub, "ul.docs-nav__pages");
      expect(lists, `${p.route}: one list of pages`).toHaveLength(1);
      const [pages] = lists;
      const id = head.attrs.get("id");
      expect(id, `${p.route}: the sub-area link has an id the list can point at`).toBeTruthy();
      expect(pages.attrs.get("aria-labelledby"), `${p.route}: the list is named by the sub-area link`).toBe(id);
      expect(head.open.index, p.route).toBeLessThan(pages.open.index);
      const links = findAll(pages, (n) => n.name === "a");
      expect(
        links.map((a) => a.attrs.get("href")),
        p.route,
      ).toEqual(htmlListed);
      for (const a of links) expect(hasClass(a, "luz-sidebar__link"), `${p.route}: ${a.attrs.get("href")}`).toBe(true);
      // The nested block holds nothing else: the area link and the list
      expect(findAll(sub, (n) => n.name === "a")).toHaveLength(1 + htmlListed.length);
    }
  });

  it("keeps the sidebar flat: nothing folded, every page of every area still listed once, in reading order", () => {
    for (const p of site.pages) {
      const nav = parse(rendered.get(p.route), p.route);
      const folded = findAll(query(nav, "ul.docs-nav"), (n) => n.name === "details" || n.name === "summary" || n.attrs.has("hidden") || n.attrs.has("aria-expanded"));
      expect(folded.map((n) => n.name), p.route).toEqual([]);
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

  it("is lean: the nested block costs no page more than 380 bytes over the section it replaces", () => {
    const over = [];
    for (const p of site.pages) {
      const html = rendered.get(p.route);
      const [sub] = findAll(listOf(p.route), (n) => hasClass(n, "docs-nav__sub"));
      expect(sub, `${p.route}: the nested block`).toBeTruthy();
      const block = html.slice(sub.open.index, html.indexOf(">", sub.close.index) + 1);
      const head = query(sub, "a.docs-nav__subarea");
      const mark = head.attrs.has("aria-current") ? ` aria-current="${head.attrs.get("aria-current")}"` : "";
      const items = query(sub, "ul.docs-nav__pages")
        .children.filter((c) => c.name === "li")
        .map((li) => html.slice(li.open.index, html.indexOf(">", li.close.index) + 1));
      // What the section was when HTML elements was an area of its own (a flat item with its list)
      const before = `<li><a class="luz-sidebar__link docs-nav__area" href="${HTML_INDEX}"${mark}>${textOf(head)}</a>\n<ul class="docs-nav__pages">\n${items.join("\n")}\n</ul></li>`;
      const grew = Buffer.byteLength(block) - Buffer.byteLength(before);
      if (grew > 380) over.push(`${p.route}: ${grew} bytes`);
    }
    expect(over).toEqual([]);
  });
});

describe("aria-current in the nested sidebar", () => {
  /** What the sidebar must mark on a page: { page: [hrefs], true: [hrefs] }, area links included. */
  const marksOf = (p) => {
    if (p.route === HTML_INDEX) return { page: [HTML_INDEX], true: [DOCS_INDEX] };
    if (p.meta.area === "html") return { page: [p.route], true: [DOCS_INDEX, HTML_INDEX] };
    const area = site.areas.find((a) => a.id === p.meta.area);
    if (!area) return { page: [], true: [] };
    return { page: [p.route], true: p.route === `/docs/${area.slug}/` ? [] : [`/docs/${area.slug}/`] };
  };

  it("marks an HTML page \"page\", and the sub-area link and the Documentation area link \"true\"", () => {
    for (const p of htmlPages.filter((q) => q.route !== HTML_INDEX)) {
      const links = linksOf(p.route);
      const head = links.find((a) => hasClass(a, "docs-nav__subarea"));
      expect(head, `${p.route}: the sub-area link`).toBeTruthy();
      expect(head.attrs.get("aria-current"), p.route).toBe("true");
      const documentation = links.find((a) => a.attrs.get("href") === DOCS_INDEX);
      expect(documentation.attrs.get("aria-current"), p.route).toBe("true");
    }
  });

  it("marks the HTML elements index \"page\" on the sub-area link, and the Documentation area link \"true\"", () => {
    const links = linksOf(HTML_INDEX);
    expect(links.find((a) => hasClass(a, "docs-nav__subarea")), "the sub-area link").toBeTruthy();
    expect(links.find((a) => hasClass(a, "docs-nav__subarea")).attrs.get("aria-current")).toBe("page");
    expect(links.find((a) => a.attrs.get("href") === DOCS_INDEX).attrs.get("aria-current")).toBe("true");
  });

  it("leaves the sub-area link unmarked on every page that is not in the HTML elements area", () => {
    for (const p of site.pages.filter((q) => q.meta.area !== "html")) {
      const head = linksOf(p.route).find((a) => hasClass(a, "docs-nav__subarea"));
      expect(head, `${p.route}: the sub-area link`).toBeTruthy();
      expect(head.attrs.has("aria-current"), p.route).toBe(false);
    }
  });

  it("has exactly one aria-current=\"page\" per page, and the \"true\" marks of the page's area chain, no more", () => {
    for (const p of site.pages) {
      const links = linksOf(p.route);
      const expected = marksOf(p);
      const at = (value) => links.filter((a) => a.attrs.get("aria-current") === value).map((a) => a.attrs.get("href"));
      expect(at("page"), `${p.route} page`).toEqual(expected.page);
      expect(at("true").sort(), `${p.route} true`).toEqual([...expected.true].sort());
      expect(links.filter((a) => hasClass(a, "is-active")), p.route).toEqual([]);
    }
  });
});

describe("the breadcrumb of an HTML page: Docs > Documentation > HTML elements > Title", () => {
  const crumbs = (route) => findAll(queryLive(treeOf(route), "nav.docs-breadcrumb"), (n) => hasClass(n, "luz-breadcrumb__item"));

  it("links Docs, Documentation and HTML elements, then names the page, on every page of the area", () => {
    for (const p of htmlPages.filter((q) => q.route !== HTML_INDEX)) {
      const items = crumbs(p.route);
      expect(items.map((a) => textOf(a)), p.route).toEqual(["Docs", "Documentation", "HTML elements", p.meta.title]);
      expect(items.map((a) => a.attrs.get("href") ?? null), p.route).toEqual(["/docs/", DOCS_INDEX, HTML_INDEX, null]);
      expect(items.at(-1).attrs.get("aria-current"), p.route).toBe("page");
    }
  });

  it("ends at HTML elements, the current page, on its index", () => {
    const items = crumbs(HTML_INDEX);
    expect(items.map((a) => textOf(a))).toEqual(["Docs", "Documentation", "HTML elements"]);
    expect(items.map((a) => a.attrs.get("href") ?? null)).toEqual(["/docs/", DOCS_INDEX, null]);
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

describe("the reading order (Previous / Next) follows the nested sidebar", () => {
  const end = (route) => {
    const tree = treeOf(route);
    const rel = (kind) => queryAllLive(tree, "a.luz-docs-pager__link").find((n) => n.attrs.get("rel") === kind)?.attrs.get("href") ?? null;
    return { prev: rel("prev"), next: rel("next") };
  };
  const areaRuns = (routes, areaOf) => routes.map(areaOf).filter((id, i, all) => id !== all[i - 1]);
  const areaOfRoute = (route) => site.byRoute.get(route).meta.area;

  it("lists the areas in runs: site.json's top-level order, with HTML elements right after Documentation", () => {
    const expected = topLevel.flatMap((a) => (a.id === "documentation" ? ["documentation", "html"] : [a.id]));
    expect(areaRuns(orderRoutes, areaOfRoute)).toEqual(expected);
    expect(orderRoutes.at(-1)).toBe("/docs/accessibility/");
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
    expect(end(lastHtml).next).toBe("/docs/accessibility/");
    expect(end("/docs/accessibility/").prev).toBe(lastHtml);
    expect(end("/docs/accessibility/").next).toBeNull();
  });

  it("gives Components the page that came before HTML elements, the last page of Tokens", () => {
    const lastTokens = orderRoutes.filter((r) => areaOfRoute(r) === "tokens").at(-1);
    expect(end("/docs/components/").prev).toBe(lastTokens);
    expect(end(lastTokens).next).toBe("/docs/components/");
  });

  it("is still one path through every page: each Next is the Previous of the page it points at", () => {
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

// Only Spanish has docs in the real repository (owner, 2026-10-19; Arabic docs are planned). The right-to-left sidebar is
// still checked, on a copy of the real docs with a stand-in Arabic language (tests/helpers/docs-i18n-size-fixture.js:
// the English catalog written in Arabic letters, every page in the English fallback). Spanish is the real folder.
describe("the nested sidebar in Spanish (real) and Arabic (a stand-in copy of the docs)", () => {
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

      it("builds with no problem (no key missing or unused: the labels are area.html and area.documentation)", () => {
        expect(langs.problems).toEqual([]);
        expect(strings(code)["area.html"]).toBeTruthy();
        expect(strings(code)["area.documentation"]).toBeTruthy();
      });

      it("lists the top-level areas without HTML elements, and puts the sub-area link, labelled in the language, in the Documentation item", () => {
        for (const route of ["/docs/html/forms/", HTML_INDEX, DOCS_INDEX, "/docs/components/button/"]) {
          const nav = list(route);
          const areas = queryAll(nav, "a.docs-nav__area");
          expect(
            areas.map((a) => textOf(a)),
            `${code} ${route}`,
          ).toEqual(topLevel.map((a) => strings(code)[`area.${a.id}`]));
          const [sub] = findAll(nav, (n) => hasClass(n, "docs-nav__sub"));
          expect(sub, `${code} ${route}: the nested block`).toBeTruthy();
          expect(isInside(sub, areas.find((a) => a.attrs.get("href") === `${root}${DOCS_INDEX}`).parent), `${code} ${route}`).toBe(true);
          const head = query(sub, "a.docs-nav__subarea");
          expect(head.attrs.get("href"), `${code} ${route}`).toBe(`${root}${HTML_INDEX}`);
          expect(textOf(head), `${code} ${route}`).toBe(strings(code)["area.html"]);
          // The label is in the language of the page, as the other area links are
          expect(languageOf(head), `${code} ${route}`).toBe(code);
          expect(query(sub, "ul.docs-nav__pages").attrs.get("aria-labelledby"), `${code} ${route}`).toBe(head.attrs.get("id"));
        }
      });

      it("lists the 14 pages in the language of the page, each as English (lang=en, left to right) when it is not translated", () => {
        const [sub] = findAll(list("/docs/html/forms/"), (n) => hasClass(n, "docs-nav__sub"));
        const links = findAll(query(sub, "ul.docs-nav__pages"), (n) => n.name === "a");
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
        // The area label, in Arabic, is not an island of English
        const head = query(sub, "a.docs-nav__subarea");
        expect(directionOf(head), code).toBe(code === "ar" ? "rtl" : "ltr");
      });

      it("marks the current page, its sub-area link and the Documentation area link", () => {
        const links = findAll(list("/docs/html/forms/"), (n) => n.name === "a");
        const at = (value) => links.filter((a) => a.attrs.get("aria-current") === value).map((a) => a.attrs.get("href"));
        expect(at("page")).toEqual([`${root}/docs/html/forms/`]);
        expect(at("true").sort()).toEqual([`${root}${DOCS_INDEX}`, `${root}${HTML_INDEX}`].sort());
        const index = findAll(list(HTML_INDEX), (n) => n.name === "a");
        expect(index.filter((a) => a.attrs.get("aria-current") === "page").map((a) => a.attrs.get("href"))).toEqual([`${root}${HTML_INDEX}`]);
      });

      it("writes the breadcrumb Docs > Documentation > HTML elements > Title with the catalog's words", () => {
        const items = findAll(queryLive(tree(`${root}/docs/html/forms/`), "nav.docs-breadcrumb"), (n) => hasClass(n, "luz-breadcrumb__item"));
        const done = translates(code, "/docs/html/forms/");
        const title = (done ? docsLanguage(langSite, code).pages.get("/docs/html/forms/") : langSite.byRoute.get("/docs/html/forms/")).meta.title;
        expect(items.map((a) => textOf(a))).toEqual([strings(code)["chrome.crumb-docs"], strings(code)["area.documentation"], strings(code)["area.html"], title]);
        expect(items.map((a) => a.attrs.get("href") ?? null)).toEqual([`${root}/docs/`, `${root}${DOCS_INDEX}`, `${root}${HTML_INDEX}`, null]);
      });

      it("reads in the same order: Documentation, HTML elements, its pages, Accessibility", () => {
        const next = (route) => queryAllLive(tree(`${root}${route}`), "a.luz-docs-pager__link").find((n) => n.attrs.get("rel") === "next")?.attrs.get("href");
        const prev = (route) => queryAllLive(tree(`${root}${route}`), "a.luz-docs-pager__link").find((n) => n.attrs.get("rel") === "prev")?.attrs.get("href");
        const lastDocumentation = orderRoutes.filter((r) => langSite.byRoute.get(r).meta.area === "documentation").at(-1);
        expect(next(lastDocumentation)).toBe(`${root}${HTML_INDEX}`);
        expect(prev(HTML_INDEX)).toBe(`${root}${lastDocumentation}`);
        expect(next(htmlListed.at(-1))).toBe(`${root}/docs/accessibility/`);
        expect(prev("/docs/accessibility/")).toBe(`${root}${htmlListed.at(-1)}`);
      });
    });
  }
});
