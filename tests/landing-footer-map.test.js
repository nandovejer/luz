/**
 * The footer of the home, as the generator writes it in English, Spanish and Arabic (what the markup says; where the
 * groups sit and how tall the links are is in tests/landing-footer.spec.js):
 *
 * - The brand is one link to the language's home page: the prism, the drawn word LUZ (hidden from a screen reader) and
 *   a "beta v<version>" badge, named "LUZ beta v<version>". The version is no longer a link to the changelog.
 * - A site map: a nav of four groups (Documentation, Reference, Resources, Community), each an h2 over a list, with
 *   exactly twenty-one links, in order. No link to the browser reviews, no column of kinds of site, no link twice.
 * - The licence line names Nando Muñoz, as a link to his GitHub, in every language.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { find, findAll, hasClass, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const GITHUB = "https://github.com/nandovejer/luz";
const coreVersion = JSON.parse(read("packages/core/package.json")).version;

const site = scanSite(join(repo, "apps/docs"), repo);
const landing = landingDocuments(site, "apps/landing/index.html", read("apps/landing/index.html"));
const { rendered } = buildSite(site, { extra: landing });
const CODES = { "/": "en", "/es/": "es", "/ar/": "ar" };
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));

/** The twenty-one links of the site map, as the English home writes them, in order, by group. */
const GROUPS = [
  { id: "footer-docs", links: ["/docs/get-started/", "/docs/get-started/migrate/", "/docs/get-started/make-it-yours/", "/docs/get-started/ai/", "/docs/a-z/"] },
  { id: "footer-reference", links: ["/docs/tokens/", "/docs/html/", "/docs/components/", "/docs/catalog/", "/docs/accessibility/", "/docs/privacy/"] },
  { id: "footer-resources", links: ["https://www.npmjs.com/org/luz-ds", "#inside-4", "/llms.txt", `${GITHUB}/blob/main/CHANGELOG.md`, "/docs/get-started/how-luz-is-built/"] },
  { id: "footer-community", links: [GITHUB, `${GITHUB}/issues/new/choose`, `${GITHUB}/blob/main/CONTRIBUTING.md`, `${GITHUB}/blob/main/CODE_OF_CONDUCT.md`, `${GITHUB}/blob/main/SECURITY.md`] },
];
/** Spanish has docs of its own: an internal /docs link goes to them. Arabic has none yet: its links stay English. */
const localized = (route, href) => (route === "/es/" && href.startsWith("/docs/") ? `/es${href}` : href);

const footerOf = (route) => {
  const html = rendered.get(route);
  return query(parse(html, route), "footer.luz-site-footer");
};

for (const route of Object.keys(CODES)) {
  describe(`the footer of ${route}`, () => {
    const footer = footerOf(route);
    const strings = catalog(CODES[route]);

    it("has the brand as one link to the home page: the prism, the drawn word and the beta badge, named LUZ beta v<version>", () => {
      const brand = query(footer, "a.landing-brand__home");
      expect(brand, "the brand link").toBeTruthy();
      expect(brand.attrs.get("href")).toBe(route);
      expect(find(brand, (n) => n.name === "svg"), "the prism").toBeTruthy();
      const word = query(brand, "span.site-word");
      expect(word, "the drawn word LUZ").toBeTruthy();
      expect(word.attrs.get("aria-hidden")).toBe("true");
      expect(word.attrs.get("lang")).toBe("en");
      expect(word.attrs.get("dir")).toBe("ltr");
      expect(findAll(word, (n) => hasClass(n, "ch")).map(textOf)).toEqual(["L", "U", "Z"]);
      expect(textOf(query(brand, "span.u-sr-only") ?? query(brand, "strong.u-sr-only"))).toBe("LUZ");
      const badge = query(brand, "span.site-badge");
      expect(badge, "the badge is inside the same link").toBeTruthy();
      expect(textOf(badge)).toBe(`${strings["footer.beta"]} v${coreVersion}`);
      const version = query(badge, "span.site-badge__version");
      expect(textOf(version)).toBe(`v${coreVersion}`);
      expect(version.attrs.get("dir")).toBe("ltr");
    });

    it("has no version link to the changelog beside the brand, and no __version or __beta part of the old brand", () => {
      const html = rendered.get(route);
      expect(html).not.toContain("landing-brand__version");
      expect(html).not.toContain("landing-brand__beta");
      const brandLine = query(footer, "p.landing-brand");
      expect(findAll(brandLine, (n) => n.name === "a")).toHaveLength(1);
    });

    it("has a site map of four groups, each an h2 title over a list it labels, with the ids footer-docs, footer-reference, footer-resources and footer-community", () => {
      const nav = query(footer, "nav.landing-foot-nav");
      expect(nav, "the site map").toBeTruthy();
      expect(nav.attrs.get("aria-label"), "the site map is named").toBe(strings["footer.nav"]);
      const groups = queryAll(nav, "div.landing-foot-group");
      expect(groups).toHaveLength(4);
      expect(groups.map((g) => query(g, "h2.luz-site-footer__col-title")?.attrs.get("id"))).toEqual(GROUPS.map((g) => g.id));
      for (const group of groups) {
        const title = query(group, "h2.luz-site-footer__col-title");
        expect(textOf(title).length, "a title").toBeGreaterThan(2);
        const list = query(group, "ul");
        expect(list.attrs.get("aria-labelledby")).toBe(title.attrs.get("id"));
      }
    });

    it("has exactly these twenty-one links, in this order", () => {
      const nav = query(footer, "nav.landing-foot-nav");
      const groups = queryAll(nav, "div.landing-foot-group");
      for (const [i, expected] of GROUPS.entries()) {
        const hrefs = findAll(groups[i], (n) => n.name === "a").map((a) => a.attrs.get("href"));
        expect(hrefs, `${route} ${expected.id}`).toEqual(expected.links.map((href) => localized(route, href)));
      }
      expect(findAll(nav, (n) => n.name === "a")).toHaveLength(21);
    });

    it("tells a reader of a language with no docs of its own, with hreflang=\"en\", that the docs behind the /docs links are English", () => {
      const docs = findAll(footer, (n) => n.name === "a" && /^\/(?:es\/)?docs\//.test(n.attrs.get("href") ?? ""));
      expect(docs.length).toBe(11 + 1);
      for (const a of docs) {
        if (route === "/ar/") expect(a.attrs.get("hreflang"), a.attrs.get("href")).toBe("en");
        else expect(a.attrs.has("hreflang"), a.attrs.get("href")).toBe(false);
      }
    });

    it("has no link to the browser reviews, no column of the kinds of site, and no link twice", () => {
      const hrefs = findAll(footer, (n) => n.name === "a").map((a) => a.attrs.get("href"));
      expect(hrefs.filter((h) => /browser-reviews/i.test(h ?? "")), "no browser reviews").toEqual([]);
      expect(hrefs.filter((h) => /\/docs\/kinds\//.test(h ?? "")), "no kinds of site").toEqual([]);
      const nav = query(footer, "nav.landing-foot-nav");
      const inMap = findAll(nav, (n) => n.name === "a").map((a) => a.attrs.get("href"));
      expect(new Set(inMap).size, "no link twice in the site map").toBe(inMap.length);
      expect(inMap.filter((h) => /\/docs\/catalog\/$/.test(h)), "/docs/catalog/ once").toHaveLength(1);
      expect(findAll(footer, (n) => hasClass(n, "landing-foot-label")), "the labels of the old columns are gone").toEqual([]);
    });

    it("names Nando Muñoz in the licence line as a link to his GitHub, and not Fernando", () => {
      const legal = query(footer, "p.landing-legal");
      const author = findAll(legal, (n) => n.name === "a").find((a) => a.attrs.get("href") === "https://github.com/nandovejer");
      expect(author, "a link to https://github.com/nandovejer").toBeTruthy();
      expect(textOf(author)).toBe("Nando Muñoz");
      expect(textOf(legal)).not.toContain("Fernando");
      expect(findAll(legal, (n) => n.name === "a").some((a) => a.attrs.get("href") === `${GITHUB}/blob/main/LICENSE`), "the licence stays a link").toBe(true);
    });
  });
}
