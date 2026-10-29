/**
 * What the /debug/ page must contain, derived from the sources (the pages of the docs, the
 * fixture of the HTML elements, the packages), never typed: a component or an element that is
 * added shows up in the expectations by itself, as it must on the page.
 *
 * The page is rendered by buildSite() of scripts/docs-site/site.js, in the rendered map under
 * the route "/debug/" (the same map the docs pages and the home are in). That is the one place
 * a test reads it from: if the generator hands the page over another way, change `renderedDebug`.
 *
 * The hooks the tests read (the markup contract of the page):
 *   [data-debug-controls]          the page's own header, a direct child of <body>
 *     select[data-debug-mode]      options "light", "dark" and "high-contrast"
 *     input[data-debug-rtl]        a checkbox: checked sets dir="rtl" on <html>
 *     nav[data-debug-index]        the index: a[href="#id"] to each group and each block
 *   [data-debug-group]             "html", "objects", "core", "catalog", in this order; has an id
 *     [data-debug-block]           one block per element or component; has an id
 *       data-debug-name            the tag ("blockquote"), or the slug of its docs page ("button")
 *       .debug-block__name         its name (text)
 *       .debug-block__file         its file (text), "components/button.css"
 *       a.debug-block__docs        its docs page, root-absolute with a trailing slash
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite, landingDocuments, scanSite } from "../../scripts/docs-site/site.js";
import { classesOf, descendants, find, findAll, hasClass, parse, query, queryAll, textOf } from "./html-dom.js";

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const DEBUG_ROUTE = "/debug/";
export const GROUPS = ["html", "objects", "core", "catalog"];

export const site = scanSite(join(repo, "apps/docs"), repo);
const landing = landingDocuments(site, "apps/landing/index.html", readFileSync(join(repo, "apps/landing/index.html"), "utf-8"));

let built;
/** Every page of the site, rendered (the docs in every language, and the home), once. */
export const buildReal = () => (built ??= buildSite(site, { extra: landing, languages: true }));

/** The /debug/ document as the site renders it. Fails with a message, not a TypeError, while the page does not exist. */
export function renderedDebug() {
  const html = buildReal().rendered.get(DEBUG_ROUTE);
  if (typeof html !== "string") throw new Error(`buildSite() renders no document at ${DEBUG_ROUTE} (scripts/docs-site generates the /debug/ page)`);
  return html;
}

let tree;
export const debugTree = () => (tree ??= parse(renderedDebug(), "/debug/"));

/* ---- The attributes that point at an id ---------------------------------- */

/** Attributes whose value is one id. */
export const ID_REFERENCES = ["for", "aria-controls", "aria-labelledby", "aria-describedby", "aria-owns", "popovertarget", "commandfor", "data-copy-from", "list"];
/** Of those, the ones that hold a list of ids. */
export const ID_LISTS = new Set(["aria-controls", "aria-labelledby", "aria-describedby", "aria-owns"]);

/** The ids a subtree defines. */
export const idsIn = (node) => [node, ...descendants(node)].flatMap((n) => (n.attrs.has("id") ? [n.attrs.get("id")] : []));

/** The ids a subtree points at (the attributes above and a link to "#id"), each with the attribute that holds it. */
export function referencesIn(node) {
  const refs = [];
  for (const n of [node, ...descendants(node)]) {
    for (const name of ID_REFERENCES) {
      if (!n.attrs.has(name)) continue;
      const values = ID_LISTS.has(name) ? n.attrs.get(name).split(/\s+/).filter(Boolean) : [n.attrs.get(name)];
      for (const value of values) refs.push({ name, value });
    }
    const href = n.attrs.get("href");
    if (href && href.length > 1 && href.startsWith("#")) refs.push({ name: "href", value: href.slice(1) });
  }
  return refs;
}

/** How many references of a subtree point at an id that is not in the same subtree. */
export function unresolvedIn(node) {
  const ids = new Set(idsIn(node));
  return referencesIn(node).filter((r) => !ids.has(r.value)).length;
}

/* ---- The sources the page is made from ----------------------------------- */

const pageOf = (route) => site.byRoute.get(route);
const hasAttr = (name) => (n) => n.attrs.has(name);

/** The first live demo ("Example") of a page: `.docs-example[data-docs-specimen]`. */
export function specimenOf(page) {
  return find(parse(page.body, page.file), (n) => hasClass(n, "docs-example") && n.attrs.has("data-docs-specimen"));
}

/** The classes of LUZ and the tags `<luz-*>` a subtree uses: what a demo shows, which the page must still show. */
export function luzNamesIn(node) {
  const names = new Set();
  for (const n of [node, ...descendants(node)]) {
    if (n.name.startsWith("luz-")) names.add(`<${n.name}>`);
    for (const c of classesOf(n)) if (/^(luz-|o-|u-)/.test(c)) names.add(`.${c}`);
  }
  return names;
}

/** What the page names in a subtree, in the same form as luzNamesIn(). */
export const namesIn = (node) => luzNamesIn(node);

/** The component pages of a folder of the docs with a live demo: [{ slug, route, page, specimen }], in route order. */
function demoPages(folder) {
  return site.pages
    .filter((p) => p.route.startsWith(`/docs/${folder}/`) && p.route !== `/docs/${folder}/`)
    .map((page) => ({ slug: page.route.split("/").filter(Boolean).pop(), route: page.route, page, title: page.meta.title, files: page.meta.files ?? "", specimen: specimenOf(page) }))
    .filter((p) => p.specimen);
}

/** Core's components (the layout page is the layout objects') and catalog's, each with a demo on its page. */
export const corePages = () => demoPages("components");
export const catalogPages = () => demoPages("catalog");

/** The page of the layout objects, and the `.o-*` its examples are labelled with. */
export const LAYOUT_ROUTE = "/docs/components/layout/";
export function layoutObjects() {
  const page = pageOf(LAYOUT_ROUTE);
  return queryAll(parse(page.body, page.file), "code.docs-demo__file")
    .map((n) => textOf(n))
    .filter((t) => /^\.o-[a-z0-9-]+$/.test(t));
}

/** The first stylesheet a page names in its `files` line ("components/button.css"), or null. */
export const stylesheetOf = (files) => files.split(/[,;]/).map((f) => f.trim()).find((f) => /\.css$/.test(f)) ?? null;

/** The elements of tests/fixtures/html-elements.json. */
export const htmlElements = () => JSON.parse(readFileSync(join(repo, "tests/fixtures/html-elements.json"), "utf-8")).elements;

/** The card of each element on the pages of /docs/html/: name → { route, card } (the `article.elements-card`, with its stage). */
export function elementCards() {
  const cards = new Map();
  for (const page of site.pages.filter((p) => p.route.startsWith("/docs/html/"))) {
    for (const card of findAll(parse(page.body, page.file), (n) => n.name === "article" && hasClass(n, "elements-card") && n.attrs.has("data-element"))) {
      cards.set(card.attrs.get("data-element"), { route: page.route, card });
    }
  }
  return cards;
}

/** The stylesheets of a package's components, as the file names a site links: every src/components/<name>.css that does not start with "_". */
export function componentStylesheets(pkg) {
  const dir = join(repo, "packages", pkg, "src/components");
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".css") && !f.startsWith("_")).sort() : [];
}

/* ---- The page, by its hooks ---------------------------------------------- */

export const groupsOf = (root) => findAll(root, hasAttr("data-debug-group"));
export const blocksOf = (node) => findAll(node, hasAttr("data-debug-block"));
export const groupNamed = (root, name) => groupsOf(root).find((g) => g.attrs.get("data-debug-group") === name);
export const blockNamed = (group, name) => blocksOf(group).find((b) => b.attrs.get("data-debug-name") === name);

export { descendants, find, findAll, hasClass, parse, query, queryAll, textOf };
