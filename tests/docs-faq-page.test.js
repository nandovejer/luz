/**
 * The docs page "More questions" (/docs/get-started/faq/): the eight questions the FAQ of the home sent away
 * (HTML and classes, Existing projects), so the home keeps two groups. Read from its sources and from the page the
 * generator writes; what a browser draws is in tests/docs-faq-page.spec.js.
 *
 * - It follows How LUZ is built in Get started (order 13), in English and in Spanish.
 * - Two groups, each an h2 over its questions, the questions as native details, the answers with the ids
 *   faq-classes, faq-unstyled, faq-why-classes, faq-same, faq-classless, faq-new-only, faq-worth and faq-migrate.
 * - The Spanish translation keeps the ids, the groups and the order, and says it is pending review.
 * - The page uses the FAQ pattern of catalog, so the page links its stylesheet.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { findAll, hasClass, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const IDS = ["faq-classes", "faq-unstyled", "faq-why-classes", "faq-same", "faq-classless", "faq-new-only", "faq-worth", "faq-migrate"];
const GROUPS = ["faq-g-html", "faq-g-existing"];

const frontMatter = (source) => Object.fromEntries([...source.match(/<!-- luz:page\n([\s\S]*?)-->/)[1].matchAll(/^([a-z-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2].trim()]));
const structure = (source) => {
  const faq = query(parse(source.replace(/<!-- luz:page[\s\S]*?-->/, ""), "faq"), "luz-faq");
  return {
    faq,
    groups: queryAll(faq, "section.luz-faq__group"),
    items: findAll(faq, (n) => n.name === "details" && hasClass(n, "luz-faq__item")),
    ids: findAll(faq, (n) => hasClass(n, "luz-faq__answer")).map((n) => n.attrs.get("id")),
  };
};

describe("the page More questions, in English", () => {
  const source = read("apps/docs/pages/get-started/faq.html");
  const meta = frontMatter(source);
  const page = structure(source);

  it("is page 13 of Get started, with a one-line description", () => {
    expect(meta.area).toBe("get-started");
    expect(meta.order).toBe("13");
    expect(meta.description.length).toBeGreaterThan(40);
  });

  it("holds the eight questions that left the home, as native details with these ids, in this order", () => {
    expect(page.faq, "a <luz-faq>").toBeTruthy();
    expect(page.items).toHaveLength(8);
    expect(page.ids).toEqual(IDS);
    for (const item of page.items) {
      expect(item.attrs.has("id"), "the id is on the answer, not on the details").toBe(false);
      expect(query(item, "summary.luz-faq__question")).toBeTruthy();
      expect(textOf(query(item, "summary.luz-faq__question")), "a question").toMatch(/\?$/);
    }
  });

  it("has two groups, each named by its h2", () => {
    expect(page.groups.map((g) => g.attrs.get("aria-labelledby"))).toEqual(GROUPS);
    for (const group of page.groups) {
      const title = query(group, "h2.luz-faq__group-title");
      expect(title, "an h2 over its questions").toBeTruthy();
      expect(title.attrs.get("id")).toBe(group.attrs.get("aria-labelledby"));
    }
  });

  it("points back to the FAQ of the home page", () => {
    expect(source).toMatch(/<a href="\/#faq">/);
  });
});

describe("the page More questions, in Spanish", () => {
  const source = read("apps/docs/i18n/es/pages/get-started/faq.html");
  const meta = frontMatter(source);
  const page = structure(source);
  const english = structure(read("apps/docs/pages/get-started/faq.html"));

  it("keeps the ids, the groups and the order of the English page", () => {
    expect(page.ids).toEqual(IDS);
    expect(page.groups.map((g) => g.attrs.get("aria-labelledby"))).toEqual(GROUPS);
    expect(page.items).toHaveLength(english.items.length);
  });

  it("is a translation pending review", () => {
    expect(meta.reviewed).toBe("false");
    expect(meta.title).not.toBe("More questions");
    expect(meta.source).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("the page the generator writes", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const { rendered } = buildSite(site);
  const html = rendered.get("/docs/get-started/faq/");

  it("exists, with one h1, the FAQ pattern's stylesheet and the eight answers", () => {
    expect(html).toBeTruthy();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toMatch(/components\/faq(?:\.min)?\.css/);
    const tree = parse(html, "faq");
    expect(findAll(tree, (n) => hasClass(n, "luz-faq__answer")).map((n) => n.attrs.get("id"))).toEqual(IDS);
  });
});
