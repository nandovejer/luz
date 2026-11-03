/**
 * A "Copy the markup" snippet is a fragment a reader pastes into a page, and
 * the generator also puts it, as it is, in a standalone example
 * (/examples/<area>/<slug>.html, scripts/docs-site/ai.js). A browser drops a
 * stray <td>, <tr>, <caption>... that has no table around it, and a <li> with
 * no list, a <summary> with no <details>... is invalid markup: so a snippet
 * never starts with an element that needs a parent. It starts with the table,
 * the list, the details that holds it.
 *
 * Every html code block of every docs page, English and Spanish (the code of a
 * translation stays English), is read here, so a new snippet that starts with a
 * part cannot be committed. The two it caught: the meter in a table cell
 * (components/meter.html, `code-meter-table`) and the data panel of the
 * dashboard (kinds/app.html, `code-k-app-charts`).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { exampleDocuments } from "../scripts/docs-site/ai.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { descendants, hasClass, parse } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["apps/docs/pages", "apps/docs/i18n/es/pages"];

/** The elements that only make sense inside another one: a table's parts, a list's items, a group's caption... */
const NEEDS_A_PARENT = new Set([
  "td", "th", "tr", "thead", "tbody", "tfoot", "caption", "col", "colgroup",
  "li", "dt", "dd", "option", "optgroup", "summary", "legend", "figcaption", "source", "track", "area",
]);

/** What a browser's parser ignores outright in the body of a page ("in body" insertion mode, a start tag with no table around it). */
const IGNORED_IN_BODY = new Set(["caption", "col", "colgroup", "tbody", "td", "tfoot", "th", "thead", "tr"]);

/** The names of the top-level elements of a fragment, in order. */
const topLevel = (code) => parse(code).children.map((node) => node.name);

/** The offender in a fragment: the name of its first element when it needs a parent, else null. */
const strayStart = (code) => {
  const [first] = topLevel(code);
  return first && NEEDS_A_PARENT.has(first) ? first : null;
};

/** The names a browser would keep of a fragment's top-level elements, written in the body of a page. */
const keptByBrowser = (names) => names.filter((name) => !IGNORED_IN_BODY.has(name));

const htmlFilesOf = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? htmlFilesOf(join(dir, entry.name)) : entry.name.endsWith(".html") ? [join(dir, entry.name)] : [],
  );

const BLOCK = /<pre\b([^>]*)>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/g;

/** Every html code block of every page: { file, id, code } with the entities decoded. */
const blocks = () => {
  const found = [];
  for (const dir of PAGES) {
    for (const path of htmlFilesOf(join(repo, dir))) {
      for (const [, preAttrs, codeAttrs, raw] of readFileSync(path, "utf-8").matchAll(BLOCK)) {
        const code = decodeEntities(raw).trim();
        if (/\bdata-lang="html"/.test(preAttrs) || code.startsWith("<")) {
          found.push({ file: relative(repo, path), id: /\bid="([^"]*)"/.exec(codeAttrs)?.[1] ?? "(no id)", code });
        }
      }
    }
  }
  return found;
};

const where = ({ file, id }) => `${file} #${id}`;

describe("the detector", () => {
  it("lets a snippet that starts with the element that holds its parts through", () => {
    expect(strayStart('<table class="luz-table"><caption>C</caption><tbody><tr><td>1</td></tr></tbody></table>')).toBeNull();
    expect(strayStart('<ul class="o-grid"><li>One</li></ul>')).toBeNull();
    expect(strayStart("<details><summary>S</summary>Body</details>")).toBeNull();
    expect(strayStart('<meter value="1">1</meter>')).toBeNull();
  });

  it("names the part a snippet starts with", () => {
    expect(strayStart('<td class="luz-table__numeric">1</td>')).toBe("td");
    expect(strayStart('<li class="luz-card">\n  <h2>T</h2>\n</li>')).toBe("li");
    expect(strayStart("<summary>S</summary>")).toBe("summary");
    expect(strayStart("<tr><td>1</td></tr>")).toBe("tr");
  });

  it("says what a browser drops of a snippet that starts with a table part", () => {
    expect(keptByBrowser(topLevel('<td>1</td><meter value="1">1</meter>'))).toEqual(["meter"]);
    expect(keptByBrowser(topLevel('<table><tr><td>1</td></tr></table>'))).toEqual(["table"]);
  });
});

describe("the code blocks of the docs", () => {
  const all = blocks();

  it("reads the html blocks of both languages, and all of them", () => {
    // Counted another way: the pre elements that say they are html, in every page
    const declared = PAGES.flatMap((dir) => htmlFilesOf(join(repo, dir))).reduce(
      (sum, path) => sum + (readFileSync(path, "utf-8").match(/<pre\b[^>]*\bdata-lang="html"/g) ?? []).length,
      0,
    );
    expect(declared).toBeGreaterThan(100);
    expect(all.length).toBeGreaterThanOrEqual(declared);
    expect(all.some((b) => b.file.startsWith("apps/docs/i18n/es/pages/"))).toBe(true);
    expect(all.some((b) => b.file.startsWith("apps/docs/pages/"))).toBe(true);
    // Nearly all of them have an element to examine: a block that parsed to nothing is a block that was not read
    expect(all.filter((b) => topLevel(b.code).length > 0).length).toBeGreaterThanOrEqual(Math.floor(declared * 0.9));
  });

  it("starts none with an element that needs a parent", () => {
    const offenders = all.flatMap((b) => {
      const stray = strayStart(b.code);
      return stray ? [`${where(b)}: starts with <${stray}>`] : [];
    });
    expect(offenders, `A snippet starts with an element that needs a parent. Wrap it in the table, list or details that holds it:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("the standalone examples", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const documents = exampleDocuments(site, { csp: "default-src 'self'", versions: { core: "0.0.0" }, root: repo });

  it("exist for the pages that have a markup section", () => {
    expect(documents.length).toBeGreaterThan(40);
  });

  it("keep every top-level element of every snippet, as a browser reads them", () => {
    let examined = 0;
    const dropped = [];
    for (const doc of documents) {
      const sections = [...descendants(parse(doc.html, doc.route))].filter((n) => n.name === "section" && hasClass(n, "o-stack"));
      for (const section of sections) {
        const written = section.children.filter((n) => n.name !== "h2").map((n) => n.name);
        examined += 1;
        const kept = keptByBrowser(written);
        if (kept.length !== written.length) {
          dropped.push(`${doc.route} ${section.attrs.get("aria-labelledby")}: written ${written.join(", ")}, kept ${kept.join(", ") || "nothing"}`);
        }
      }
    }
    expect(examined).toBeGreaterThan(documents.length);
    expect(dropped, `A browser drops what a snippet starts with in its standalone example:\n${dropped.join("\n")}`).toEqual([]);
  });
});
