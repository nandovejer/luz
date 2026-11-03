/**
 * Four small additions, and what the docs say about each:
 *
 *   1. core's meta line has `.luz-meta--facts`: a `dl` of `div` pairs of `dt` and `dd`, for labelled facts in a hero. The look is
 *      in tests/meta.spec.js; here, the page of the Meta line (components/meta): the example, the markup to copy, the row of the
 *      variants table and the row of the contrast table, in English and in Spanish, and the class in the manifest `luz-check` reads.
 *   2. catalog's section has `.luz-section__more`, a link at the end of the head, in an `.o-row` with the title. The look is in
 *      tests/landing-section.spec.js; here, the page of the section.
 *   3. the pager fits any kind of site (`fits-kinds: any`): the kinds' lists are in tests/catalog-patterns.test.js, tests/prompts.test.js
 *      and tests/docs-snippets.test.js; here, what its page says about whose text it is, and that it is not only for documentation.
 *   4. the post list's page has a template for the results of a search: a `<search>` with a bare form, a heading that counts the
 *      results and the compact list named by it, with no `role="search"` (the element is the landmark).
 *
 * Every example is also a standalone document at /examples/<area>/<slug>.html (scripts/docs-site/ai.js): the markup to copy is in
 * it, as valid markup (tests/examples.spec.js runs axe on all of them). Plus the Open rows of dev/BROWSER-REVIEWS.md.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exampleDocuments } from "../scripts/docs-site/ai.js";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { PAGES_CSP } from "../vite.config.js";
import { MODES, contrast, formatRatio } from "./helpers/design-tokens.js";
import { site } from "./helpers/docs-site.js";
import { find, findAll, hasClass, isInside, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf-8");
/** The body of a Spanish page: the file without its leading `<!-- luz:page … -->` comment. */
const esBody = (path) => read(path).replace(/^<!-- luz:page[\s\S]*?-->/, "");

/** The two languages of a page: its English body (from the site) and its Spanish file. */
const PAGES = {
  meta: { route: "/docs/components/meta/", es: "apps/docs/i18n/es/pages/components/meta.html" },
  section: { route: "/docs/catalog/section/", es: "apps/docs/i18n/es/pages/catalog/section.html" },
  pager: { route: "/docs/catalog/pager/", es: "apps/docs/i18n/es/pages/catalog/pager.html" },
  "post-list": { route: "/docs/catalog/post-list/", es: "apps/docs/i18n/es/pages/catalog/post-list.html" },
};
const bodyOf = (slug, lang) => (lang === "en" ? site.byRoute.get(PAGES[slug].route).body : esBody(PAGES[slug].es));
const treeOf = (slug, lang) => parse(bodyOf(slug, lang), `${slug}.html (${lang})`);
const LANGS = ["en", "es"];

/** The html blocks of a page (the code of every `pre > code`), decoded, with the id of the code and the copy button that points at it. */
function snippetsOf(tree) {
  return findAll(tree, (n) => n.name === "pre" && n.attrs.get("data-lang") === "html").map((pre) => {
    const code = find(pre, (n) => n.name === "code");
    const text = decodeEntities(code.html.slice(code.open.end, code.close.index));
    const button = find(tree, (n) => n.name === "button" && n.attrs.get("data-copy-from") === code.attrs.get("id"));
    return { id: code.attrs.get("id"), text, button };
  });
}
const snippetWith = (tree, needle) => snippetsOf(tree).find((s) => s.text.includes(needle));
/** The specimens of a page: its live demos. */
const specimens = (tree) => findAll(tree, (n) => n.attrs.has("data-docs-specimen"));
const rowsOf = (table) => queryAll(table, "tr").filter((tr) => tr.children.some((c) => c.name === "td"));
const cellsOf = (row) => row.children.filter((c) => c.name === "td");
/** The section of a page between an h2/h3 id and the next heading of the same or a higher level. */
const section = (html, id) => html.split(new RegExp(`<h[23] [^>]*id="${id}"`))[1]?.split(/<h[23][ >]/)[0] ?? "";

/* ---- 1. core: .luz-meta--facts ------------------------------------------------------------------- */

describe.each(LANGS)("the Meta line page, facts variant (%s)", (lang) => {
  const tree = () => treeOf("meta", lang);
  /** A `dl` of pairs: every child a `div` of one `dt` and one `dd`. */
  const pairsOf = (dl) => {
    expect(dl.name, "a description list").toBe("dl");
    const pairs = dl.children.filter((c) => c.name !== "#text");
    expect(pairs.length, "at least three facts").toBeGreaterThanOrEqual(3);
    for (const pair of pairs) {
      expect(pair.name, "each pair is a div").toBe("div");
      expect(pair.children.map((c) => c.name), "a dt then a dd").toEqual(["dt", "dd"]);
    }
    return pairs;
  };

  it("shows the variant in a live example: dl.luz-meta.luz-meta--facts of div pairs, one fact being a date in a <time>", () => {
    const doc = tree();
    const live = specimens(doc);
    const dl = find(doc, (n) => n.name === "dl" && hasClass(n, "luz-meta") && hasClass(n, "luz-meta--facts") && live.some((s) => isInside(n, s)));
    expect(dl, "a dl.luz-meta--facts inside a specimen").toBeTruthy();
    const pairs = pairsOf(dl);
    expect(findAll(dl, (n) => n.name === "time" && n.attrs.has("datetime") && n.parent.name === "dd").length, "a <time datetime> inside a dd").toBeGreaterThanOrEqual(1);
    // The ordinary line is still there: the page keeps its first example
    expect(find(doc, (n) => n.name === "p" && hasClass(n, "luz-meta")), "the ordinary p.luz-meta").toBeTruthy();
    expect(pairs.map((p) => textOf(p.children[0])).every(Boolean), "every label has text").toBe(true);
  });

  it("gives the markup to copy: a block of the same dl, with a copy button that points at it", () => {
    const snippet = snippetWith(tree(), "luz-meta--facts");
    expect(snippet, "a snippet with the variant").toBeTruthy();
    expect(snippet.button, "its copy button").toBeTruthy();
    const dl = find(parse(snippet.text, "meta snippet"), (n) => n.name === "dl");
    expect(dl && hasClass(dl, "luz-meta") && hasClass(dl, "luz-meta--facts")).toBe(true);
    pairsOf(dl);
  });

  it("lists .luz-meta--facts in the variants table, with the ordinary line's rows still there", () => {
    const html = bodyOf("meta", lang);
    const variants = parse(section(html, "variants"), "meta variants");
    const rows = rowsOf(query(variants, "table")).map((tr) => textOf(cellsOf(tr)[0]));
    expect(rows.some((r) => r.includes(".luz-meta--facts"))).toBe(true);
    expect(rows.some((r) => r.includes(".luz-meta") && !r.includes("--facts"))).toBe(true);
  });

  it("has the contrast row of the value: --luz-text-primary on --luz-surface-page, with the ratios the tokens give", () => {
    const contrastTable = parse(section(bodyOf("meta", lang), "contrast"), "meta contrast");
    const row = rowsOf(query(contrastTable, "table")).find((tr) => {
      const pair = textOf(cellsOf(tr)[1]);
      return pair.startsWith("--luz-text-primary") && pair.includes("--luz-surface-page");
    });
    expect(row, "a row for the value of a pair").toBeTruthy();
    const cells = cellsOf(row).map(textOf);
    MODES.forEach((mode, i) => expect(cells[2 + i], mode).toBe(formatRatio(contrast(mode, "text-primary", "surface-page"))));
    expect(cells[5]).toBe("4.5:1");
    // …and the secondary row (the label, the dots) is still there
    expect(rowsOf(query(contrastTable, "table")).some((tr) => textOf(cellsOf(tr)[1]).startsWith("--luz-text-secondary"))).toBe(true);
  });

  it("lists --luz-text-primary among the colours it uses (the token page of its family)", () => {
    expect(section(bodyOf("meta", lang), "tokens")).toContain("<code>--luz-text-primary</code>");
  });
});

describe("the class manifests and luz-check know the two new classes", () => {
  const classes = (pkg) => JSON.parse(read(`packages/${pkg}/dist/classes.json`)).classes;
  it("core's manifest has luz-meta--facts, in components/meta.css, and catalog's has luz-section__more, in components/section.css", () => {
    const meta = classes("core").find((c) => c.name === "luz-meta--facts");
    expect(meta, "luz-meta--facts in packages/core/dist/classes.json").toBeTruthy();
    expect(meta.files).toContain("components/meta.css");
    const more = classes("catalog").find((c) => c.name === "luz-section__more");
    expect(more, "luz-section__more in packages/catalog/dist/classes.json").toBeTruthy();
    expect(more.files).toContain("components/section.css");
  });

  it("the snapshot @luz-ds/check ships has them too, so a page that uses them is not reported as an unknown class", () => {
    const snapshot = (pkg) => JSON.parse(read(`packages/check/dist/data/${pkg}/classes.json`)).classes.map((c) => c.name);
    expect(snapshot("core")).toContain("luz-meta--facts");
    expect(snapshot("catalog")).toContain("luz-section__more");
  });
});

/* ---- 2. catalog: .luz-section__more -------------------------------------------------------------- */

describe.each(LANGS)("the Section page, the link at the end of the head (%s)", (lang) => {
  const tree = () => treeOf("section", lang);
  const VAGUE = /^(more|see all|all|read more|click here|here)$/i;

  /** A head with the link: `.o-row` holding `.luz-section__title`, then `a.luz-section__more`. */
  const headsOf = (node) => findAll(node, (n) => hasClass(n, "o-row") && n.children.some((c) => hasClass(c, "luz-section__title")) && n.children.some((c) => c.name === "a" && hasClass(c, "luz-section__more")));

  it("shows it in a live example: an .o-row with the title and then the link, inside a .luz-section", () => {
    const doc = tree();
    const live = specimens(doc);
    const heads = headsOf(doc).filter((row) => live.some((s) => isInside(row, s)));
    expect(heads.length, "a head with a link inside a specimen").toBeGreaterThanOrEqual(1);
    const [row] = heads;
    const names = row.children.map((c) => (hasClass(c, "luz-section__title") ? "title" : hasClass(c, "luz-section__more") ? "more" : c.name));
    expect(names.indexOf("title"), "the title comes first").toBeLessThan(names.indexOf("more"));
    const link = row.children.find((c) => hasClass(c, "luz-section__more"));
    expect(link.attrs.get("href"), "a real link").toBeTruthy();
    let up = row.parent;
    while (up && !hasClass(up, "luz-section")) up = up.parent;
    expect(up, "inside a .luz-section").toBeTruthy();
    expect(textOf(link).split(/\s+/).length, `the link says where it goes (${textOf(link)})`).toBeGreaterThanOrEqual(2);
    expect(textOf(link)).not.toMatch(VAGUE);
  });

  it("gives the markup to copy: a section whose head is an .o-row with the title and then the link, with a copy button", () => {
    const snippet = snippetWith(tree(), "luz-section__more");
    expect(snippet, "a snippet with the link").toBeTruthy();
    expect(snippet.button, "its copy button").toBeTruthy();
    const doc = parse(snippet.text, "section snippet");
    expect(headsOf(doc).length).toBe(1);
    const link = find(doc, (n) => hasClass(n, "luz-section__more"));
    expect(link.name).toBe("a");
    expect(textOf(link)).not.toMatch(VAGUE);
    // the title of the section is the heading of the row, named by the section
    expect(find(doc, (n) => /^h[1-6]$/.test(n.name) && hasClass(n, "luz-section__title") && n.parent.attrs.get("class")?.includes("o-row"))).toBeTruthy();
  });

  it("lists .luz-section__more in the table of classes, and has the contrast row of the link: --luz-brand-primary on --luz-surface-page", () => {
    const html = bodyOf("section", lang);
    const classes = rowsOf(query(parse(section(html, "variants"), "section variants"), "table")).map((tr) => textOf(cellsOf(tr)[0]));
    expect(classes).toContain(".luz-section__more");
    const table = query(parse(section(html, "contrast"), "section contrast"), "table");
    const row = rowsOf(table).find((tr) => textOf(cellsOf(tr)[1]).startsWith("--luz-brand-primary"));
    expect(row, "a row for the link").toBeTruthy();
    const cells = cellsOf(row).map(textOf);
    expect(cells[1]).toContain("--luz-surface-page");
    MODES.forEach((mode, i) => expect(cells[2 + i], mode).toBe(formatRatio(contrast(mode, "brand-primary", "surface-page"))));
    expect(cells[5]).toBe("4.5:1");
  });
});

/* ---- 3. catalog: the pager fits any kind of site -------------------------------------------------- */

describe("the Pager page: it is not only for documentation", () => {
  it("says in its front matter that it fits any site, in the English page (the Spanish page takes it from there)", () => {
    expect(site.byRoute.get(PAGES.pager.route).meta["fits-kinds"]).toBe("any");
    expect(read("apps/docs/pages/catalog/pager.html")).toMatch(/^fits-kinds: any$/m);
    expect(read(PAGES.pager.es), "a translation has no fits-kinds of its own").not.toMatch(/^fits-kinds:/m);
  });

  it.each([
    ["en", /course|series of posts/i],
    ["es", /curso|serie de entradas/i],
  ])("%s: When to use names pages in a sequence beyond a guide: a course or a series of posts", (lang, words) => {
    expect(decodeEntities(section(bodyOf("pager", lang), "when").replace(/<[^>]*>/g, " "))).toMatch(words);
  });

  it.each([
    ["en", /your (own )?text|your (own )?words|not LUZ's/i, /Previous/],
    ["es", /tu texto|tus palabras|no de LUZ/i, /Anterior/],
  ])("%s: Writing the content says the labels and the titles are the author's text, and still offers Previous and Next as a default", (lang, mine, label) => {
    const text = decodeEntities(section(bodyOf("pager", lang), "content").replace(/<[^>]*>/g, " "));
    expect(text).toMatch(mine);
    expect(text).toMatch(label);
    expect(text).toMatch(/label|etiqueta/i);
    expect(text).toMatch(/title|título/i);
  });
});

/* ---- 4. catalog: the results of a search, on the post list's page --------------------------------- */

describe.each(LANGS)("the Post list page, a template for the results of a search (%s)", (lang) => {
  let parsed;
  const tree = () => (parsed ??= treeOf("post-list", lang));
  const stage = () => {
    const stages = queryAll(tree(), "div.docs-demo__stage").filter((s) => find(s, (n) => n.name === "search"));
    expect(stages.length, "one demo stage with a <search>").toBe(1);
    return stages[0];
  };

  /** The three parts of the template, in a tree: the <search>, the element that counts, the list. */
  function partsOf(doc) {
    const search = find(doc, (n) => n.name === "search");
    expect(search, "a <search> element").toBeTruthy();
    const list = find(doc, (n) => n.name === "ul" && hasClass(n, "luz-post-list"));
    expect(list, "the list").toBeTruthy();
    return { search, list };
  }

  /** The checks both the demo and the markup to copy must pass. */
  function checkTemplate(doc, { heading, exact }) {
    const { search, list } = partsOf(doc);
    // the landmark is the element: no role="search" on it, on the form or anywhere in the template
    expect(findAll(doc, (n) => n.attrs.get("role") === "search"), "no role=search: <search> is the landmark").toEqual([]);
    // a bare form: label for an input type=search, and a submit button; no luz- class on any of them
    const form = find(search, (n) => n.name === "form");
    expect(form, "a form inside <search>").toBeTruthy();
    expect(form.attrs.get("action"), "the form goes somewhere").toBeTruthy();
    const input = find(form, (n) => n.name === "input" && n.attrs.get("type") === "search");
    expect(input, "an input type=search").toBeTruthy();
    expect(input.attrs.get("name"), "a name, so the word is sent").toBeTruthy();
    const label = find(form, (n) => n.name === "label" && n.attrs.get("for") === input.attrs.get("id"));
    expect(label, "a label for the input").toBeTruthy();
    expect(textOf(label).length).toBeGreaterThan(0);
    const button = find(form, (n) => n.name === "button");
    expect(button, "a button").toBeTruthy();
    expect(["submit", undefined], "a submit button").toContain(button.attrs.get("type"));
    for (const control of [form, input, label, button]) expect(control.attrs.get("class") ?? "", `${control.name} has no class`).not.toMatch(/luz-/);
    // the results sit outside <search>: a heading that counts, and the list it names
    expect(isInside(list, search), "the list is outside <search>").toBe(false);
    const counter = find(doc, (n) => n.attrs.get("id") === list.attrs.get("aria-labelledby"));
    expect(counter, "the list is named by an element with that id (aria-labelledby)").toBeTruthy();
    expect(isInside(counter, search), "the count is outside <search>").toBe(false);
    expect(textOf(counter), "it counts the results").toMatch(/\b\d+ results?\b/i);
    expect(counter.name === "h2", `the count is ${heading ? "an h2" : "not a heading (a demo adds none to the page)"}`).toBe(heading);
    if (!heading) expect(/^h[1-6]$/.test(counter.name)).toBe(false);
    // the compact list, as a list of cards
    expect(hasClass(list, "luz-post-list--compact"), "the compact variant").toBe(true);
    expect(list.attrs.get("role"), "role=list keeps the list for a screen reader").toBe("list");
    const items = list.children.filter((c) => c.name === "li");
    expect(items.length, "at least one result").toBeGreaterThanOrEqual(exact ? 2 : 1);
    for (const li of items) expect(find(li, (n) => n.name === "article" && hasClass(n, "luz-card")), "each result is a card").toBeTruthy();
    // the count says how many results there are, and the list has that many items (the template is not a lie)
    const said = Number(textOf(counter).match(/\b(\d+) results?\b/i)[1]);
    if (exact) expect(items.length, "the count is the number of items").toBe(said);
    return { search, list, counter };
  }

  it("shows it in a live demo stage after the other three: a <search> with its form, the count, and the compact list", () => {
    const stages = queryAll(tree(), "div.docs-demo__stage");
    expect(stages.indexOf(stage()), "after the other demos of the page").toBeGreaterThanOrEqual(3);
    checkTemplate(stage(), { heading: false, exact: true });
  });

  it("gives the markup to copy: the same template, with the count as an h2 and each card title as a heading, and a copy button", () => {
    const snippet = snippetWith(tree(), "<search>");
    expect(snippet, "a snippet with <search>").toBeTruthy();
    expect(snippet.button, "its copy button").toBeTruthy();
    expect(snippet.text, "not one role=search").not.toMatch(/role="search"/);
    const doc = parse(snippet.text, "post-list search snippet");
    checkTemplate(doc, { heading: true, exact: false });
    // a heading level under the h2 that counts
    expect(findAll(doc, (n) => hasClass(n, "luz-card__title")).every((n) => n.name === "h3")).toBe(true);
  });

  it("does not add a heading to the page: no h1 to h6 in the demo stage, so the table of contents and the outline are the page's own", () => {
    expect(findAll(stage(), (n) => /^h[1-6]$/.test(n.name))).toEqual([]);
  });

  it("says in the accessibility notes that <search> is the landmark and a role=search on its form would announce two", () => {
    const notes = decodeEntities(section(bodyOf("post-list", lang), "keyboard").replace(/<[^>]*>/g, " "));
    expect(notes).toContain("<search>");
    expect(notes).toContain('role="search"');
    expect(notes).toMatch(lang === "en" ? /landmark/i : /referencia/i);
  });

  it("has no live role=search anywhere in the page: the demo and the markup to copy are the only places the template lives", () => {
    const live = findAll(tree(), (n) => n.attrs.get("role") === "search");
    expect(live).toEqual([]);
  });
});

/* ---- The standalone examples made from the pages ---------------------------------------------------- */

describe("the examples made from the four pages (/examples/<area>/<slug>.html)", () => {
  const VERSIONS = { tokens: "1.2.3", core: "1.2.3", catalog: "1.2.3", check: "1.2.3" };
  const documents = exampleDocuments(site, { csp: PAGES_CSP, versions: VERSIONS });
  const exampleOf = (route) => {
    const doc = documents.find((d) => d.route === route);
    expect(doc, `an example for ${route}`).toBeTruthy();
    return { doc, tree: parse(doc.html, route) };
  };
  const ALLOWED_PARENTS = { li: ["ul", "ol", "menu"], dt: ["dl", "div"], dd: ["dl", "div"], tr: ["table", "thead", "tbody", "tfoot"] };
  const orphans = (tree) => findAll(tree, (n) => ALLOWED_PARENTS[n.name] && !ALLOWED_PARENTS[n.name].includes(n.parent.name)).map((n) => `${n.name} in ${n.parent.name}`);

  it("the Meta example carries the facts list: a dl of div pairs with no orphan dt or dd, and the page's one h1", () => {
    const { tree } = exampleOf("/examples/components/meta.html");
    const dl = find(tree, (n) => n.name === "dl" && hasClass(n, "luz-meta--facts"));
    expect(dl, "the dl.luz-meta--facts in the example").toBeTruthy();
    expect(dl.children.every((c) => c.name === "div" && c.children.map((x) => x.name).join() === "dt,dd")).toBe(true);
    expect(orphans(tree)).toEqual([]);
    expect(queryAll(tree, "h1")).toHaveLength(1);
  });

  it("the Section example carries the head with its link: an .o-row of the title and the link", () => {
    const { tree } = exampleOf("/examples/catalog/section.html");
    const link = find(tree, (n) => n.name === "a" && hasClass(n, "luz-section__more"));
    expect(link, "the a.luz-section__more in the example").toBeTruthy();
    expect(hasClass(link.parent, "o-row")).toBe(true);
    expect(link.parent.children.some((c) => hasClass(c, "luz-section__title"))).toBe(true);
    expect(orphans(tree)).toEqual([]);
    expect(queryAll(tree, "h1")).toHaveLength(1);
  });

  it("the Post list example carries the search results: one <search> landmark, no role=search, the count before the list it names, valid markup", () => {
    const { tree, doc } = exampleOf("/examples/catalog/post-list.html");
    const searches = findAll(tree, (n) => n.name === "search");
    expect(searches.length, "the <search> in the example").toBeGreaterThanOrEqual(1);
    expect(findAll(tree, (n) => n.attrs.get("role") === "search"), "no role=search").toEqual([]);
    expect(doc.html).not.toMatch(/role="search"/);
    const lists = findAll(tree, (n) => n.name === "ul" && hasClass(n, "luz-post-list--compact") && n.attrs.has("aria-labelledby"));
    expect(lists.length, "a compact list named by its count").toBeGreaterThanOrEqual(1);
    for (const list of lists) {
      const counter = find(tree, (n) => n.attrs.get("id") === list.attrs.get("aria-labelledby"));
      expect(counter, `${list.attrs.get("aria-labelledby")} exists once in the document`).toBeTruthy();
      expect(counter.open.index, "the count comes before the list").toBeLessThan(list.open.index);
    }
    // every id of the document is unique, and every label points at an input
    const ids = findAll(tree, (n) => n.attrs.has("id")).map((n) => n.attrs.get("id"));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), "duplicate ids").toEqual([]);
    for (const label of findAll(tree, (n) => n.name === "label" && n.attrs.has("for"))) {
      expect(find(tree, (n) => n.attrs.get("id") === label.attrs.get("for")), `label for ${label.attrs.get("for")}`).toBeTruthy();
    }
    expect(orphans(tree)).toEqual([]);
    expect(queryAll(tree, "h1")).toHaveLength(1);
  });
});

/* ---- dev/BROWSER-REVIEWS.md ------------------------------------------------------------------------- */

describe("dev/BROWSER-REVIEWS.md has an Open row for each of the three new things the browsers have not seen", () => {
  const open = () => read("dev/BROWSER-REVIEWS.md").split(/^## Closed/m)[0];
  const rowWith = (needle) => open().split("\n").find((line) => line.startsWith("|") && line.includes(needle));

  it.each([
    [".luz-meta--facts", "packages/core/src/components/meta.css", "apps/docs/pages/components/meta.html"],
    [".luz-section__more", "packages/catalog/src/components/section.css", "apps/docs/pages/catalog/section.html"],
    ["<search>", "apps/docs/pages/catalog/post-list.html", "apps/docs/pages/catalog/post-list.html"],
  ])("%s: its files, what to look at, and both browsers", (needle, file, page) => {
    const row = rowWith(needle);
    expect(row, `a row naming ${needle} in the Open section`).toBeTruthy();
    const cells = row.split("|").map((c) => c.trim());
    expect(cells[2], "the files").toContain(file);
    expect(cells[2], "the page").toContain(page);
    expect(cells[3].length, "what to look at").toBeGreaterThan(40);
    expect(cells[4]).toMatch(/Safari/);
    expect(cells[4]).toMatch(/Firefox/);
  });
});
