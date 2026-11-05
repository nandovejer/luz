/**
 * LUZ docs site: the sidebar is an accordion of areas.
 *
 * The owner's request (2026-10-22): "sections of links collapsed like an accordion, only the one with the
 * active child open". Each area of `ul.docs-nav` that has pages is
 *
 *   <li>
 *     <a class="luz-sidebar__link docs-nav__area" id="a-<id>" href="<area index>">Label</a>
 *     <details name="nav" [open]>
 *       <summary aria-labelledby="a-<id>"></summary>
 *       <ul>…the pages…</ul>
 *     </details>
 *   </li>
 *
 * and an area with no pages stays `<li><a class="docs-nav__area">` with no details. The whole
 * behaviour is native: one `name` makes the folds an accordion (opening one closes the others), and
 * the markup itself says which fold is open, so there is no script and no state to restore.
 *
 *   open        only the fold of the area of the current page carries `open`; the docs home (the hub,
 *               no area) has none
 *   the link    the area link is outside the fold and keeps its aria-current ("page" on an area index,
 *               "true" on the area of the current page); the page link inside the open fold keeps "page"
 *   the button  the summary is empty (a chevron drawn by CSS) and is named by the area link (aria-labelledby)
 *   the pages   every page of the site is still listed once, in reading order, across the folds, with the
 *               group lists (`li.docs-nav__group`) and the `lang="en"` of a list of untranslated pages
 *               as they were
 *
 * The browser half (the keyboard, the exclusivity, no JavaScript, the look, RTL, the drawer, axe) is
 * tests/docs-nav-fold.spec.js.
 */
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { buildSite, readingOrder, scanSite } from "../scripts/docs-site/site.js";
import { docsLanguage, languageOf } from "./helpers/docs-i18n-fixture.js";
import { makeSite } from "./helpers/docs-i18n-size-fixture.js";
import { findAll, hasClass, isInside, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const site = scanSite(join(repo, "apps/docs"), repo);
const { rendered } = buildSite(site);
const trees = new Map();
/** A parsed page of `html` (a Map of route to markup), cached per Map. */
const treeOf = (route, html = rendered) => {
  if (!trees.has(html)) trees.set(html, new Map());
  const cache = trees.get(html);
  return cache.get(route) ?? cache.set(route, parse(html.get(route), route)).get(route);
};

const order = readingOrder(site);
const orderRoutes = order.map((p) => p.route);
const areaOfRoute = (route) => site.byRoute.get(route).meta.area;

/** The index route of each area. */
const indexRoute = (area, root = "") => `${root}/docs/${area.slug}/`;
/** The pages an area lists under its link: its pages but its index. */
const listedOf = (area) => order.filter((p) => p.meta.area === area.id && p.route !== indexRoute(area)).map((p) => p.route);
const areasWithPages = site.areas.filter((a) => listedOf(a).length > 0);
const areasWithout = site.areas.filter((a) => listedOf(a).length === 0);

const listIn = (tree) => query(tree, "ul.docs-nav");
/** The `li` children of ul.docs-nav, one per area, in order. */
const itemsOf = (tree) => listIn(tree).children.filter((n) => n.name === "li");
const itemOf = (tree, href) => itemsOf(tree).find((li) => query(li, "a.docs-nav__area").attrs.get("href") === href);
const foldsOf = (tree) => queryAll(listIn(tree), "details");
const openFolds = (tree) => foldsOf(tree).filter((d) => d.attrs.has("open"));

describe("the real areas this test relies on", () => {
  it("has areas with pages and at least one area without (Accessibility is its own index)", () => {
    // Seven areas since F5b: landing, cms, app and documentation are groups of Catalog now
    expect(areasWithPages.map((a) => a.id)).toEqual(["get-started", "kinds", "tokens", "components", "catalog", "html"]);
    expect(areasWithout.map((a) => a.id)).toContain("accessibility");
  });
});

describe("every area with pages: the area link, then its fold", () => {
  it("is an li with a.luz-sidebar__link.docs-nav__area#a-<id> to the area index, then details[name=docs-nav] on every page", () => {
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      for (const area of areasWithPages) {
        const li = itemOf(tree, indexRoute(area));
        expect(li, `${p.route}: the item of ${area.id}`).toBeTruthy();
        expect(li.parent, `${p.route}: ${area.id} is a direct child of ul.docs-nav`).toBe(listIn(tree));
        const head = query(li, "a.docs-nav__area");
        expect(hasClass(head, "luz-sidebar__link"), `${p.route}: ${area.id} link class`).toBe(true);
        expect(head.attrs.get("id"), `${p.route}: ${area.id} link id`).toBe(`a-${area.id}`);
        expect(textOf(head), `${p.route}: ${area.id} link label`).toBe(area.label);
        expect(head.parent, `${p.route}: the area link is a direct child of the li, not of the fold`).toBe(li);
        const folds = queryAll(li, "details");
        expect(folds, `${p.route}: ${area.id} has one fold`).toHaveLength(1);
        const fold = folds[0];
        expect(fold.parent, `${p.route}: ${area.id} fold is a direct child of the li`).toBe(li);
        expect(fold.attrs.get("name"), `${p.route}: ${area.id} fold name`).toBe("nav");
        expect(head.open.index, `${p.route}: the link comes before its fold`).toBeLessThan(fold.open.index);
      }
    }
  });

  it("gives the fold an empty summary named by the area link, first in the details, and then the list of pages", () => {
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      expect(foldsOf(tree), `${p.route}: one fold per area with pages`).toHaveLength(areasWithPages.length);
      for (const fold of foldsOf(tree)) {
        const id = query(fold.parent, "a.docs-nav__area").attrs.get("id");
        const summaries = queryAll(fold, "summary");
        expect(summaries, `${p.route} ${id}: one summary`).toHaveLength(1);
        const summary = summaries[0];
        expect(summary.parent, `${p.route} ${id}`).toBe(fold);
        expect(fold.children[0], `${p.route} ${id}: the summary is the first child`).toBe(summary);
        expect(summary.attrs.get("aria-labelledby"), `${p.route} ${id}`).toBe(id);
        expect(summary.children, `${p.route} ${id}: the summary has no element in it`).toEqual([]);
        expect(textOf(summary), `${p.route} ${id}: the summary has no text of its own (the area link names it)`).toBe("");
        expect(fold.children.map((n) => n.name), `${p.route} ${id}`).toEqual(["summary", "ul"]);
        expect(fold.children[1].name, `${p.route} ${id}: the list`).toBe("ul");
      }
    }
  });

  it("puts the area link outside every fold: no a.docs-nav__area inside a details or a summary", () => {
    for (const p of site.pages) {
      expect(foldsOf(treeOf(p.route)), `${p.route}: the folds are there`).toHaveLength(areasWithPages.length);
      const inside = foldsOf(treeOf(p.route)).flatMap((d) => queryAll(d, "a.docs-nav__area"));
      expect(inside, p.route).toEqual([]);
    }
  });

  it("gives each area link a unique id, a-<id>, and no other element of the page that id", () => {
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      const ids = areasWithPages.map((a) => `a-${a.id}`);
      for (const id of ids) {
        const owners = findAll(tree, (n) => n.attrs?.get("id") === id);
        expect(owners.map((n) => n.name), `${p.route} #${id}`).toEqual(["a"]);
      }
    }
  });

  it("keeps an area with no pages as <li><a class=\"docs-nav__area\"> with no details, no summary and no list", () => {
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      for (const area of areasWithout) {
        const li = itemOf(tree, indexRoute(area));
        expect(li, `${p.route}: the item of ${area.id}`).toBeTruthy();
        expect(li.children.map((n) => n.name), `${p.route}: ${area.id}`).toEqual(["a"]);
        expect(hasClass(li.children[0], "docs-nav__area"), `${p.route}: ${area.id}`).toBe(true);
        expect(textOf(li.children[0]), `${p.route}: ${area.id}`).toBe(area.label);
      }
    }
  });

  it("has exactly one fold per area with pages, and no other details or summary in the sidebar", () => {
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      expect(foldsOf(tree).length, p.route).toBe(areasWithPages.length);
      expect(queryAll(listIn(tree), "summary").length, p.route).toBe(areasWithPages.length);
    }
  });
});

describe("one name, one open fold: the area of the current page", () => {
  it("shares the name docs-nav across all the folds, and no other details of the sidebar has another", () => {
    for (const p of site.pages) {
      expect(foldsOf(treeOf(p.route)).map((d) => d.attrs.get("name")), p.route).toEqual(areasWithPages.map(() => "nav"));
    }
  });

  it("opens, in the markup, only the fold of the area of the page: /docs/components/button/ opens Core and nothing else", () => {
    const tree = treeOf("/docs/components/button/");
    const open = openFolds(tree);
    expect(open).toHaveLength(1);
    expect(query(open[0].parent, "a.docs-nav__area").attrs.get("id")).toBe("a-components");
    const core = site.areas.find((a) => a.id === "components");
    expect(core.label).toBe("Core");
    // The open fold lists the current page, marked
    const current = queryAll(open[0], "a").filter((a) => a.attrs.get("aria-current") === "page");
    expect(current.map((a) => a.attrs.get("href"))).toEqual(["/docs/components/button/"]);
  });

  it("opens HTML elements and only it on /docs/html/forms/", () => {
    const open = openFolds(treeOf("/docs/html/forms/"));
    expect(open.map((d) => query(d.parent, "a.docs-nav__area").attrs.get("id"))).toEqual(["a-html"]);
  });

  it("opens no fold on the docs home (the hub has no area), while every fold is there, closed", () => {
    const tree = treeOf("/docs/");
    expect(foldsOf(tree)).toHaveLength(areasWithPages.length);
    expect(openFolds(tree)).toEqual([]);
  });

  it("opens, on every page, the fold of its area when the area has pages, at most one, and none otherwise", () => {
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      const open = openFolds(tree).map((d) => query(d.parent, "a.docs-nav__area").attrs.get("id"));
      const area = site.areas.find((a) => a.id === p.meta.area);
      const expected = area && areasWithPages.includes(area) ? [`a-${area.id}`] : [];
      expect(open, p.route).toEqual(expected);
    }
  });

  it("opens the fold of an area on its index page too, and keeps every other closed", () => {
    for (const area of areasWithPages) {
      const open = openFolds(treeOf(indexRoute(area))).map((d) => query(d.parent, "a.docs-nav__area").attrs.get("id"));
      expect(open, area.id).toEqual([`a-${area.id}`]);
    }
  });

  it("opens without a script: `open` is in the markup and nothing in the sidebar is hidden or carries aria-expanded", () => {
    for (const p of site.pages) {
      const list = listIn(treeOf(p.route));
      const scripted = findAll(list, (n) => n.attrs.has("hidden") || n.attrs.has("aria-expanded") || n.attrs.has("inert"));
      expect(scripted.map((n) => n.name), p.route).toEqual([]);
    }
  });
});

describe("the marks and the pages across the folds", () => {
  it("keeps aria-current: \"page\" on the page's link (inside the open fold) and \"true\" on its area link (outside)", () => {
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      const area = site.areas.find((a) => a.id === p.meta.area);
      const links = findAll(listIn(tree), (n) => n.name === "a");
      const at = (value) => links.filter((a) => a.attrs.get("aria-current") === value);
      if (!area) {
        expect(at("page").concat(at("true")), p.route).toEqual([]);
        continue;
      }
      const isIndex = p.route === indexRoute(area);
      expect(at("page").map((a) => a.attrs.get("href")), `${p.route} page`).toEqual([p.route]);
      expect(at("true").map((a) => a.attrs.get("href")), `${p.route} true`).toEqual(isIndex ? [] : [indexRoute(area)]);
      const mark = at("page")[0];
      if (isIndex) {
        expect(findAll(listIn(tree), (n) => n.name === "details").some((d) => isInside(mark, d)), `${p.route}: an area index is marked on the area link, outside the fold`).toBe(false);
      } else {
        const fold = foldsOf(tree).find((d) => isInside(mark, d));
        expect(fold?.attrs.has("open"), `${p.route}: the current page is inside an open fold`).toBe(true);
        expect(at("true").every((a) => !foldsOf(tree).some((d) => isInside(a, d))), `${p.route}: the area link is outside the fold`).toBe(true);
      }
    }
  });

  it("lists every page of the site once across the folds, in reading order, and every area index once as an area link", () => {
    const indexes = new Set(site.areas.map((a) => indexRoute(a)));
    const expected = orderRoutes.filter((r) => !indexes.has(r) && areaOfRoute(r) !== "hub" && site.areas.some((a) => a.id === areaOfRoute(r)));
    for (const p of site.pages) {
      const tree = treeOf(p.route);
      const hrefs = foldsOf(tree).flatMap((d) => queryAll(d, "a").map((a) => a.attrs.get("href")));
      expect(hrefs, `${p.route}: every page, once, in the order of the folds`).toEqual(expected);
      expect(new Set(hrefs).size, `${p.route}: no page twice`).toBe(hrefs.length);
      const areas = queryAll(listIn(tree), "a.docs-nav__area").map((a) => a.attrs.get("href"));
      expect(areas, `${p.route}: the area links`).toEqual(site.areas.map((a) => indexRoute(a)));
    }
  });

  it("keeps the group lists inside their fold: li.docs-nav__group with a label and a list named by it", () => {
    const tree = treeOf("/docs/components/button/");
    const groups = queryAll(listIn(tree), "li.docs-nav__group");
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(foldsOf(tree).some((d) => isInside(g, d)), "a group list is inside a fold").toBe(true);
      const label = query(g, "span.luz-sidebar__section-label");
      const list = query(g, "ul.docs-nav__pages");
      expect(list.attrs.get("aria-labelledby")).toBe(label.attrs.get("id"));
    }
    // ... in Core's fold, for the groups of Core
    const core = itemOf(tree, "/docs/components/");
    expect(queryAll(core, "li.docs-nav__group").length).toBe(groups.filter((g) => isInside(g, core)).length);
    expect(queryAll(core, "li.docs-nav__group").length).toBeGreaterThan(0);
  });

  it("keeps the English sidebar free of lang attributes (nothing is untranslated)", () => {
    for (const p of site.pages) {
      expect(findAll(listIn(treeOf(p.route)), (n) => n.attrs.has("lang")), p.route).toEqual([]);
    }
  });
});

/* ---- Spanish (real) and Arabic (a stand-in copy of the docs) ------------------------------------- */

describe("the same folds in Spanish (real) and Arabic (a stand-in copy of the docs)", () => {
  const copy = makeSite({ languages: ["es", "ar"] });
  afterAll(() => copy.cleanup());
  const langSite = scanSite(copy.docsDir, copy.repoRoot);
  const langs = buildSite(langSite, { languages: true, unchecked: ["/", "/es/", "/ar/"] });
  const strings = (code) => docsLanguage(langSite, code).docsStrings;
  const translates = (code, route) => docsLanguage(langSite, code).pages.has(route);

  it("runs on the repository as it is: only Spanish is real, Arabic is the stand-in", () => {
    expect(readdirSync(join(repo, "apps/docs/i18n")).sort()).toEqual(["en", "es", "glossary.json"]);
    expect(copy.standIns).toEqual(["ar"]);
    expect(langs.problems).toEqual([]);
  });

  for (const code of ["es", "ar"]) {
    describe(code, () => {
      const root = `/${code}`;
      const tree = (route) => treeOf(`${root}${route}`, langs.rendered);

      it("has one fold per area with pages, the link first, named by it, with the catalog's label, on a page of every kind", () => {
        for (const route of ["/docs/", "/docs/components/button/", "/docs/html/forms/", "/docs/accessibility/", "/docs/tokens/"]) {
          const t = tree(route);
          expect(foldsOf(t), `${code} ${route}`).toHaveLength(areasWithPages.length);
          for (const area of areasWithPages) {
            const li = itemOf(t, indexRoute(area, root));
            const head = query(li, "a.docs-nav__area");
            expect(head.attrs.get("id"), `${code} ${route}`).toBe(`a-${area.id}`);
            expect(textOf(head), `${code} ${route}`).toBe(strings(code)[`area.${area.id}`]);
            expect(languageOf(head), `${code} ${route}: the label is in the language`).toBe(code);
            const fold = query(li, "details");
            expect(fold.attrs.get("name"), `${code} ${route}`).toBe("nav");
            expect(fold.children[0].attrs.get("aria-labelledby"), `${code} ${route}`).toBe(`a-${area.id}`);
            expect(languageOf(fold), `${code} ${route}: the fold itself is in the language of the page`).toBe(code);
          }
          for (const area of areasWithout) expect(queryAll(itemOf(t, indexRoute(area, root)), "details"), `${code} ${route}`).toEqual([]);
        }
      });

      it("opens only the fold of the area of the page, and none on the docs home", () => {
        const open = (route) => openFolds(tree(route)).map((d) => query(d.parent, "a.docs-nav__area").attrs.get("id"));
        expect(open("/docs/")).toEqual([]);
        expect(open("/docs/components/button/")).toEqual(["a-components"]);
        expect(open("/docs/html/forms/")).toEqual(["a-html"]);
        expect(open("/docs/tokens/color/")).toEqual(["a-tokens"]);
      });

      it("lists every page once across the folds, in reading order, and marks the current page and its area", () => {
        const indexes = new Set(site.areas.map((a) => indexRoute(a)));
        const expected = orderRoutes.filter((r) => !indexes.has(r) && areaOfRoute(r) !== "hub" && site.areas.some((a) => a.id === areaOfRoute(r)));
        const t = tree("/docs/html/forms/");
        const hrefs = foldsOf(t).flatMap((d) => queryAll(d, "a").map((a) => a.attrs.get("href")));
        expect(hrefs).toEqual(expected.map((r) => `${root}${r}`));
        const links = findAll(listIn(t), (n) => n.name === "a");
        const at = (value) => links.filter((a) => a.attrs.get("aria-current") === value).map((a) => a.attrs.get("href"));
        expect(at("page")).toEqual([`${root}/docs/html/forms/`]);
        expect(at("true")).toEqual([`${root}/docs/html/`]);
      });

      it("says lang=\"en\" for the pages not translated, on the list when the whole list is English, and keeps the folds in the language", () => {
        for (const route of ["/docs/html/forms/", "/docs/components/button/"]) {
          const t = tree(route);
          expect(foldsOf(t), `${code} ${route}: the folds are there`).toHaveLength(areasWithPages.length);
          for (const fold of foldsOf(t)) {
            for (const a of queryAll(fold, "a")) {
              const done = translates(code, a.attrs.get("href").slice(root.length));
              expect(languageOf(a), `${code} ${route} ${a.attrs.get("href")}`).toBe(done ? code : "en");
            }
            // An area whose pages are all English, with no group, carries the lang once, on its list
            const list = fold.children[1];
            const hasGroups = queryAll(list, "li.docs-nav__group").length > 0;
            const pages = queryAll(list, "a");
            const allEnglish = pages.every((a) => !translates(code, a.attrs.get("href").slice(root.length)));
            if (!hasGroups && allEnglish) {
              expect(list.attrs.get("lang"), `${code} ${route}: the all-English list carries lang="en"`).toBe("en");
              expect(
                pages.filter((a) => a.attrs.has("lang")).map((a) => a.attrs.get("href")),
                `${code} ${route}: and its links carry none`,
              ).toEqual([]);
            }
            // A group of English pages carries it on the group's list
            for (const g of queryAll(list, "li.docs-nav__group")) {
              const gl = query(g, "ul.docs-nav__pages");
              if (queryAll(gl, "a").every((a) => !translates(code, a.attrs.get("href").slice(root.length)))) {
                expect(gl.attrs.get("lang"), `${code} ${route}: the group list`).toBe("en");
              }
            }
          }
        }
      });
    });
  }

  it("in Arabic, which has no translated page, every list of pages is English: the lang is on the lists, the summary and the area links are Arabic", () => {
    const t = treeOf("/ar/docs/components/button/", langs.rendered);
    expect(foldsOf(t), "the folds are there").toHaveLength(areasWithPages.length);
    for (const fold of foldsOf(t)) {
      expect(languageOf(fold.children[0]), "the summary").toBe("ar");
      expect(languageOf(query(fold.parent, "a.docs-nav__area")), "the area link").toBe("ar");
      const list = fold.children[1];
      const lists = [list, ...queryAll(list, "ul.docs-nav__pages")];
      const covered = queryAll(list, "a").every((a) => languageOf(a) === "en");
      expect(covered, "every page link is English").toBe(true);
      expect(lists.some((l) => l.attrs.get("lang") === "en"), "the lang=en sits on a list, not only on the links").toBe(true);
    }
  });
});
