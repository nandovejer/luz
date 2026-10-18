/**
 * What the accessibility and UX reviews of /es/docs/ and /ar/docs/ found that
 * the generator and the catalogs must fix (docs-i18n-decisions.md). The
 * browser measurements are in tests/docs-i18n.spec.js; this file holds what
 * the generator output and the catalogs are enough for:
 *
 *   1  in a page whose <html> is dir="rtl" (Arabic), every element that says
 *      lang="en" in the chrome or the head is left to right: the h1, the lead,
 *      the last item of the breadcrumb, the titles of the pager and of "Keep
 *      going", the lists and links of the sidebar, the items of "On this
 *      page", the cards of a gallery. The div.docs-body fallback already is.
 *      Spanish (ltr) needs no dir.
 *   4  the notice has no title line, says one sentence and links the English
 *      page; no catalog has a notice.title-* key (en, es and ar go together)
 *   5  footer.name is translated in Spanish
 *
 * 1 and 4 read the fixture site (tests/helpers/docs-i18n-fixture.js: the real
 * layout, partials and English catalog); 4's keys and 5 read the real catalogs.
 */
import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSite, renderPage, scanSite } from "../scripts/docs-site/site.js";
import {
  find,
  findAll,
  hasClass,
  matcher,
  parse,
  query,
  queryAll,
  textOf,
} from "./helpers/html-dom.js";
import {
  REPO,
  chromeOf,
  docsI18nFixture,
  docsI18nModule,
  docsLanguage,
  realEnglishStrings,
} from "./helpers/docs-i18n-fixture.js";

const CODES = ["es", "ar"];
const SITE_URL = "https://example.github.io/luz/";
const realCatalog = (code) =>
  JSON.parse(
    readFileSync(join(REPO, `apps/docs/i18n/${code}/strings.json`), "utf-8")
  );

/** The sentences of a catalog value: a full stop, a question or exclamation mark (Latin or Arabic) before a space or the end. */
const sentences = (value) =>
  (value.replace(/<[^>]*>/g, "").match(/[.!?؟。](?=\s|$)/g) ?? []).length;

/** The direction a node ends up with: the nearest `dir` of itself or an ancestor. */
function directionOf(node) {
  for (let n = node; n; n = n.parent)
    if (n.attrs?.has("dir")) return n.attrs.get("dir");
  return null;
}
const insideSearch = (node) => {
  for (let n = node; n; n = n.parent) if (n.name === "luz-search") return true;
  return false;
};
const describeNode = (n) =>
  `${n.name}${
    n.attrs.get("class")
      ? "." + n.attrs.get("class").split(/\s+/).join(".")
      : ""
  } (line ${n.open.line})`;
/** One line per kind of element, with how many there are and the first route: ["ul.docs-nav__pages x 32, first on /ar/docs/"]. */
function byKind(lines) {
  const kinds = new Map();
  for (const [route, node] of lines) {
    const kind = describeNode(node).replace(/ \(line \d+\)$/, "");
    const entry = kinds.get(kind) ?? { count: 0, first: route };
    entry.count++;
    kinds.set(kind, entry);
  }
  return [...kinds].map(
    ([kind, { count, first }]) =>
      `${kind} says lang="en" and is not dir="ltr": ${count} times, first on ${first}`
  );
}

describe("the fixture site, rendered once for the review tests", () => {
  let f;
  let site;
  let built;
  const trees = new Map();
  const ready = () => {
    if (!built) {
      f = docsI18nFixture();
      site = f.scan();
      built = buildSite(site, {
        languages: true,
        unchecked: ["/", "/es/", "/ar/"],
      });
    }
  };
  afterAll(() => f?.cleanup());
  const treeOf = (route) => {
    ready();
    if (!trees.has(route)) {
      const html = built.rendered.get(route);
      if (!html)
        throw new Error(
          `buildSite(site, { languages: true }) did not render ${route}`
        );
      trees.set(route, parse(html, route));
    }
    return trees.get(route);
  };
  const routesOf = (code) => {
    ready();
    return site.pages.map((p) => `/${code}${p.route}`);
  };

  /* ---- 1. English in a right-to-left page ---------------------------------------------------- */

  describe("an English island in a right-to-left page is left to right", () => {
    /** Every element of the page that says lang="en", outside the search dialog (its lists are written in the header partial). */
    const islands = (route) =>
      findAll(
        treeOf(route),
        (n) => n.attrs.get("lang") === "en" && !insideSearch(n)
      );

    it("makes every lang=en element of the chrome and the head of an Arabic page dir=ltr, itself or through an ancestor that says it", () => {
      const offenders = [];
      for (const route of routesOf("ar")) {
        for (const node of islands(route))
          if (directionOf(node) !== "ltr") offenders.push([route, node]);
      }
      expect(byKind(offenders)).toEqual([]);
    });

    it("covers the title, the lead, the breadcrumb, the pager, the sidebar, 'On this page', 'Keep going' and the gallery cards", () => {
      const seen = new Map();
      const want = {
        "the h1": (n) => n.name === "h1" && hasClass(n, "docs-title"),
        "the lead": (n) =>
          n.name === "p" && hasClass(n, "luz-docs-page-head__lead"),
        "the last item of the breadcrumb": (n) =>
          hasClass(n, "luz-breadcrumb__item") &&
          n.attrs.get("aria-current") === "page",
        "a title of the pager": (n) => hasClass(n, "luz-docs-pager__title"),
        "a list of the sidebar": (n) =>
          n.name === "ul" && hasClass(n, "docs-nav__pages"),
        "a link of the sidebar": (n) =>
          n.name === "a" && hasClass(n, "luz-sidebar__link"),
        "the list of 'On this page'": (n) => hasClass(n, "luz-docs-rail__list"),
        "a card of a gallery": (n) =>
          n.name === "li" && hasClass(n, "docs-card"),
        "a link of 'Keep going'": (n) =>
          n.name === "a" &&
          Boolean(n.parent?.parent) &&
          hasClass(n.parent.parent, "docs-end__links"),
      };
      for (const route of routesOf("ar")) {
        for (const node of islands(route)) {
          for (const [name, test] of Object.entries(want)) {
            if (test(node))
              seen.set(name, [
                ...(seen.get(name) ?? []),
                `${route}: ${directionOf(node)}`,
              ]);
          }
        }
      }
      const missing = Object.keys(want).filter((name) => !seen.has(name));
      expect(
        missing,
        "kinds of English island the fixture has to show"
      ).toEqual([]);
      for (const [name, where] of seen) {
        expect(
          [
            ...new Set(
              where
                .filter((w) => !w.endsWith(": ltr"))
                .map((w) => w.split(": ")[1])
            ),
          ],
          `${name}: its direction on the pages that have it (${where.length} found)`
        ).toEqual([]);
      }
    });

    it("also makes the English lists of the search dialog dir=ltr (they are written in apps/site/_partials/header.html, which this round does not change)", () => {
      const lists = findAll(
        treeOf("/ar/docs/"),
        (n) => n.attrs.get("lang") === "en" && insideSearch(n)
      );
      expect(lists.length, "lang=en lists in the dialog").toBeGreaterThan(0);
      expect(
        lists.filter((n) => directionOf(n) !== "ltr").map(describeNode)
      ).toEqual([]);
    });

    it("does not need dir on the English islands of a Spanish page (it is left to right already)", () => {
      for (const route of routesOf("es")) {
        expect(
          find(treeOf(route), (n) => n.name === "html").attrs.get("dir"),
          route
        ).toBe("ltr");
      }
    });
  });

  /* ---- 4. The notice ------------------------------------------------------------------------- */

  describe("the notice is one sentence and a link, with no title line", () => {
    const noticeOf = (route) => query(treeOf(route), "div.docs-notice");
    /** The notice's own words: without the icon and the link. */
    const sayingOf = (notice) => {
      const link = find(notice, (n) => n.name === "a");
      return textOf(notice)
        .replace(textOf(link), "")
        .replace(/[ℹ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };
    /** [code, route]: a page not translated (fallback) and one translated and not reviewed (pending) per language. */
    const CASES = [
      ["es", "/es/docs/components/widget/", "fallback"],
      ["es", "/es/docs/get-started/", "pending"],
      ["ar", "/ar/docs/components/widget/", "fallback"],
      ["ar", "/ar/docs/get-started/", "pending"],
    ];

    for (const [code, route, kind] of CASES) {
      it(`has no title element in the ${kind} notice of ${route}`, () => {
        const notice = noticeOf(route);
        expect(notice, `${route} has a notice`).toBeTruthy();
        const titles = findAll(notice, (n) =>
          (n.attrs.get("class") ?? "").includes("title")
        );
        expect(
          titles.map(describeNode),
          "elements with 'title' in their class"
        ).toEqual([]);
        // The text is the icon, the sentence and the link, nothing before the sentence
        const catalog = docsLanguage(site, code).docsStrings;
        const key =
          kind === "fallback" ? "notice.untranslated" : "notice.pending";
        const first = catalog[key]
          .replace(/<[^>]*>/g, "")
          .split(/\{[^}]*\}/)[0]
          .trim();
        expect(
          sayingOf(notice).startsWith(first),
          `${route}: the notice starts with its sentence "${first}"`
        ).toBe(true);
      });

      it(`says one sentence and links the English page in the ${kind} notice of ${route}`, () => {
        const notice = noticeOf(route);
        expect(
          sentences(sayingOf(notice)),
          `${route}: "${sayingOf(notice)}"`
        ).toBe(1);
        const links = queryAll(notice, "a");
        expect(links).toHaveLength(1);
        expect([
          links[0].attrs.get("hreflang"),
          links[0].attrs.get("href"),
        ]).toEqual([
          "en",
          site.pages.find((p) => `/${code}${p.route}` === route).route,
        ]);
      });
    }

    it("keeps its place: no role, a direct child of main between the page head and div.docs-body", () => {
      for (const [, route] of CASES) {
        const notice = noticeOf(route);
        expect(notice.attrs.has("role"), route).toBe(false);
        const main = notice.parent;
        expect(main.name, route).toBe("main");
        const siblings = main.children.filter(
          (n) =>
            n === notice ||
            hasClass(n, "luz-docs-page-head") ||
            matcher("div.docs-body")(n)
        );
        expect(
          siblings.map((n) =>
            n === notice ? "notice" : hasClass(n, "docs-body") ? "body" : "head"
          ),
          route
        ).toEqual(["head", "notice", "body"]);
      }
    });
  });
});

describe("the notice does not read notice.title-* keys", () => {
  let f;
  afterAll(() => f?.cleanup());

  it("renders the notices of both languages from an English catalog that has no notice.title-untranslated or notice.title-pending", async () => {
    await docsI18nModule();
    const english = Object.fromEntries(
      Object.entries(realEnglishStrings()).filter(
        ([key]) => !key.startsWith("notice.title-")
      )
    );
    f = docsI18nFixture({ english });
    const site = f.scan();
    const { rendered, problems } = buildSite(site, {
      languages: true,
      unchecked: ["/", "/es/", "/ar/"],
    });
    expect(problems).toEqual([]);
    for (const route of [
      "/es/docs/components/widget/",
      "/es/docs/get-started/",
      "/ar/docs/components/widget/",
      "/ar/docs/get-started/",
    ]) {
      expect(
        queryAll(parse(rendered.get(route), route), "div.docs-notice"),
        route
      ).toHaveLength(1);
    }
  });
});

describe("the catalogs of the docs", () => {
  it("have no notice.title-* key in en, es or ar (the three go together: a key in one is an extra key)", () => {
    const found = [];
    for (const code of ["en", ...CODES]) {
      for (const key of Object.keys(realCatalog(code)))
        if (key.startsWith("notice.title-"))
          found.push(`apps/docs/i18n/${code}/strings.json: ${key}`);
    }
    expect(found).toEqual([]);
  });

  it("say each notice in one sentence in en, es and ar (notice.untranslated and notice.pending)", () => {
    const found = [];
    for (const code of ["en", ...CODES]) {
      const catalog = realCatalog(code);
      for (const key of ["notice.untranslated", "notice.pending"]) {
        const n = sentences(catalog[key]);
        if (n !== 1)
          found.push(`${code} ${key}: ${n} sentences in "${catalog[key]}"`);
      }
    }
    expect(found).toEqual([]);
  });

  /* ---- 5. footer.name ---------------------------------------------------------------------- */

  it("translates footer.name in Spanish", () => {
    const es = realCatalog("es")["footer.name"];
    expect(es).toBeTruthy();
    expect(es).not.toBe(realEnglishStrings()["footer.name"]);
    expect(es).not.toMatch(/Design System/i);
    expect(es).toMatch(/LUZ/);
  });

  it("leaves no English 'Design System' in the footer of the Spanish docs outside a lang=en element", async () => {
    const mod = await docsI18nModule();
    const site = scanSite(join(REPO, "apps/docs"), REPO);
    const view = mod.localize(site, docsLanguage(site, "es"));
    const html = renderPage(view.byRoute.get("/es/docs/"), view, {
      siteUrl: SITE_URL,
    });
    const english = chromeOf(html).filter((item) =>
      /Design System/.test(item.value)
    );
    expect(
      english.map((i) => `line ${i.line}: ${i.kind} "${i.value}"`)
    ).toEqual([]);
  });
});
