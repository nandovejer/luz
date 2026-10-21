/**
 * LUZ docs site — the page generator, without Vite.
 *
 * apps/docs/pages/ holds one HTML fragment per page, with its front matter in
 * a leading `<!-- luz:page … -->` comment. This module scans that folder,
 * works out each page's route, renders it inside its layout with the shared
 * partials, and checks every internal link. plugin.js wires it into Vite;
 * the unit tests (tests/docs-site.test.js) call it directly, so the build
 * and the tests read the same route table.
 *
 * What the generator writes around each page, from the front matter of all
 * of them (one data source, so they never disagree): the sidebar (every area
 * and every page, flat), the breadcrumb, the page head (eyebrow, title, lead
 * and, on a component or pattern page, the chips), the rail ("On this page"
 * and the page's actions), "Keep going" and Previous / Next, the page foot
 * (the last update), the galleries of the area index pages and the A–Z index. apps/docs/404.html is the not-found page: its URLs start at
 * the site's path, because GitHub Pages serves it at any URL.
 *
 * Template syntax, on purpose only these:
 *   <!-- luz:include name -->   a file of _partials/ or of apps/site/_partials (name: [a-z0-9-]+)
 *   {{key}}                      a fixed set of values (the landing, layouts and partials)
 *   {{t:key}} / {{html:key}}     a string of the page's language catalog
 *                                (apps/landing/i18n/, see i18n.js)
 * No loops, no conditionals. Anything unknown fails the build.
 *
 * The home page is one template rendered once per language of
 * apps/landing/i18n/locales.json ("/", "/es/", "/ar/"). The documentation is
 * English, and in each language that has a folder apps/docs/i18n/<code>/ (see
 * docs-i18n.js): the same pages at /<code>/docs/…, translated where there is a
 * translation and in English, with a notice, where there is not. Every string
 * the generator writes is a key of apps/docs/i18n/<code>/strings.json (strings.js).
 *
 * Security (.claude/plans/docs-redesign/security.md, SEC-PLG-*): files are
 * read only inside apps/docs/ (and the landing page), after checking the real
 * path; no symlinks; route segments use a strict alphabet; expansion is a
 * single pass, so text a substitution produced is never expanded again.
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, relative, resolve, sep } from "node:path";
import { HtmlError, compactHtml, readHtml, tags } from "./html.js";
import { PACKAGES, SITE_KINDS } from "../luz-packages.js";
import { fillAiMarkers } from "./ai.js";
import { renderSnippets, snippetData } from "./snippets.js";
import { assertInlineHtml, loadLocales, localizeDocsLinks, lookup, markDocsLinks, renderAlternates, renderLangLinks, renderPageLinks, renderSwitcher, unusedKeys } from "./i18n.js";
import { isDemo, loadDocsLocales, localizeLinks, localize } from "./docs-i18n.js";
import { bundledEnglish, englishT, makeT } from "./strings.js";

/** Where the docs pages are published. */
export const DOCS_ROUTE = "/docs/";
/** The not-found page: a file at the site root, served by GitHub Pages for any missing URL. */
export const NOT_FOUND_ROUTE = "/404.html";
export const NOT_FOUND_FILE = "404.html";
/** The last part of every page title, and the whole title of the hub. */
export const SITE_TITLE = "LUZ documentation";

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
const NAME = /^[a-z0-9-]+$/;
const MAX_INCLUDE_DEPTH = 3;
/** Links of an area's "Keep going" list (site.json `essentials`). */
export const MAX_ESSENTIALS = 3;

/** Front matter keys: required, or the default when missing. */
const FRONT_MATTER = {
  title: { required: true },
  description: { required: true },
  area: { required: true },
  order: { default: "1000" },
  // Other names for the page, comma-separated ("navbar" for Site header): the search finds the
  // page by them, after its area, and the A–Z index lists them as "Another name for"
  keywords: { default: "" },
  layout: { default: "page" },
  nav: { default: "true" },
  search: { default: "true" },
  toc: { default: "h2" },
  // A group of the area (site.json): a heading of its gallery, or a labelled
  // sub-list of the sidebar
  group: { default: "" },
  // Shown next to the h1: the CSS files and the JS module of a component
  files: { default: "" },
  module: { default: "" },
  // "false" when the page's content starts with its own lead paragraph
  lead: { default: "true" },
  // A block the generator writes after the content: "gallery", "a-z" or "snippets"; "notfound" (the
  // 404) one block per other docs language; "ai" writes its tables where the content has
  // `<!-- luz:ai files -->` and `<!-- luz:ai rules -->`
  generate: { default: "" },
};

/** The values a layout or partial may use as {{key}}. */
const PLACEHOLDERS = new Set([
  "title", "doctitle", "description", "root", "content", "nav", "pagehead", "rail", "endnav", "pagefoot", "generated",
  // The page's language (i18n.js): its code and direction, its home page, the
  // <link rel="alternate"> of every language, the language switcher
  "lang", "dir", "home", "alternates", "langswitch", "langlinks",
  // ` dir="ltr"` in a right-to-left page, "" otherwise: for the English lists a partial writes
  "endir",
  // A docs page in a language: the notice before its content (a translation not
  // reviewed yet, or none) and the attributes of the content (lang="en" on a page in English)
  "notice", "contentattrs",
  // The version the packages share (packages/core/package.json): the CDN snippets and the footer of the home
  "version",
  // The home's weights (budgets.json against packages/*/dist), a list written by the build
  "weights",
  // The home's layers of packages and their dependencies (packages/*/package.json)
  "packages",
  // The home's checks: the test files of tests/ by what they check
  "checks",
  // The weight of each of the home's levels of adoption (budgets.json against dist)
  "weight1", "weight2", "weight3", "weight4",
  // What each level of the home brings, as a list of names read from the packages
  "list1", "list2", "list3",
]);
/** Values inserted as HTML, not escaped. Only the generator produces them. */
const RAW_VALUES = new Set(["content", "nav", "pagehead", "rail", "endnav", "pagefoot", "generated", "alternates", "langswitch", "langlinks", "endir", "notice", "contentattrs", "weights", "packages", "checks", "list1", "list2", "list3"]);

/** Where the home page's languages live, from the repository root. */
export const I18N_DIR = "apps/landing/i18n";

/** Partials whose links to the current page and its parents get aria-current. */
const CURRENT_PARTIALS = new Set(["header", "site-links"]);

/** The area id of the documentation home page and the A–Z index (not a sidebar area). */
export const HUB_AREA = "hub";

/**
 * Headings every component page has: not listed in the A–Z index, which
 * names what is specific to a page.
 */
const TEMPLATE_HEADINGS = new Set([
  "Example", "Known issues", "Code", "Design", "Copy the markup", "Variants and options", "How it works",
  "Without JavaScript", "Keyboard and ARIA", "When to use", "When not to use", "Do and don't",
  "Writing the content", "Contrast and focus", "Tokens it uses",
]);

/**
 * The areas that document a package of patterns built on core: one per
 * package, named as the package, except docs, whose area is `documentation`
 * (/docs/docs/ would read as a typo).
 */
const AREA_OF_PACKAGE = { docs: "documentation" };
const PACKAGE_AREAS = new Set(["site", ...SITE_KINDS.map((name) => AREA_OF_PACKAGE[name] ?? name)]);

/**
 * What an A–Z entry is, by the area of its page: the English index's own words.
 * A view in a language says them with the catalog's `kind.<area>` (the A–Z
 * index itself is the English one in every language, D9).
 */
const AREA_KIND = {
  "get-started": "Get started",
  components: "Component",
  tokens: "Token page",
  site: "Site pattern",
  landing: "Landing pattern",
  cms: "CMS pattern",
  app: "App pattern",
  documentation: "Documentation pattern",
  html: "HTML elements",
  accessibility: "Accessibility",
  hub: "Documentation",
};

/* ---- The strings and the routes of a language ----------------------------- */

/** The reader of the strings of a site or of its view in a language. */
const tOf = (site) => site.t ?? englishT();
/** Where the docs of the site (or of its view) are: "/docs/", "/es/docs/". */
const docsRootOf = (site) => site.docsRoute ?? DOCS_ROUTE;
/** The English site a view is made from, or the site itself. */
const baseOf = (site) => site.base ?? site;
/** The English page a view's page is made from, or the page itself. */
const englishOf = (page) => page.english ?? page;
/** ` lang="en"`, and ` dir="ltr"` in a right-to-left language: an island of English in the chrome of a page in another language. */
const enLang = (site) => (site.locale?.dir === "rtl" ? ' lang="en" dir="ltr"' : ' lang="en"');
/** `enLang()` on what a page that is not translated shows of its own: its title, its lead, its entries in a list. */
const enAttr = (site, page) => (page?.fallback ? enLang(site) : "");
/** The language of a view as attributes, on what the chrome says inside the English content of a page that is not translated yet. */
const ownAttrs = (site, page) => (page?.fallback ? ` lang="${site.locale.code}" dir="${site.locale.dir}"` : "");
/** A route of the English site in the docs of `site`. */
const localRouteOf = (site, route) => docsRootOf(site) + route.slice(DOCS_ROUTE.length);
/** The text of `key`, escaped (a placeholder's value is put in as written, then everything is escaped). */
const say = (t, key, vars) => escapeHtml(t(key, vars));

/* ---- Small pure helpers ------------------------------------------------ */

/** Escape a value for an attribute or text context. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Folders between a route and the site root: "/" → 0, "/docs/a/" → 2, "/404.html" → 0. */
export function depthOf(route) {
  return route.split("/").filter((part) => part && !part.endsWith(".html")).length;
}

/** Relative path from a route back to the site root: "./", "../", "../../". */
export function rootOf(route) {
  return "../".repeat(depthOf(route)) || "./";
}

/**
 * Route of a page from its path inside pages/ (posix separators):
 * "index.html" → "/docs/", "tokens/index.html" → "/docs/tokens/",
 * "components/button.html" → "/docs/components/button/".
 */
export function routeOfPage(path, file = path) {
  const parts = path.split("/");
  const last = parts.pop();
  if (!last.endsWith(".html")) throw new Error(`${file}: a page is an .html file`);
  const name = last.slice(0, -".html".length);
  for (const segment of [...parts, name]) {
    if (!SEGMENT.test(segment)) {
      throw new Error(`${file}: "${segment}" is not a valid route segment (lowercase letters, digits and "-", not starting with "-")`);
    }
  }
  if (name !== "index") parts.push(name);
  return DOCS_ROUTE + parts.map((p) => `${p}/`).join("");
}

/**
 * The site links that are current on a route, with their aria-current
 * value: "page" for the link to the route itself, "true" for its parents.
 * Home on "/" (and on each home page of `homes`, "/es/"…); Docs on every
 * docs page ("page" only on the hub); Components on the gallery ("page") and
 * on every page of the Components area ("true").
 */
export function currentOf(route, homes = ["/"]) {
  const marks = new Map();
  if (route === "/" || homes.includes(route)) marks.set(route, "page");
  if (route.startsWith(DOCS_ROUTE)) {
    marks.set(DOCS_ROUTE, route === DOCS_ROUTE ? "page" : "true");
    const components = `${DOCS_ROUTE}components/`;
    if (route.startsWith(components)) marks.set(components, route === components ? "page" : "true");
  }
  return marks;
}

/**
 * Read the front matter of a page source. Returns { meta, body, bodyLine }:
 * `body` is the fragment after the comment (leading blank lines and the final
 * newline removed), `bodyLine` the line of the source where it starts.
 */
export function parseFrontMatter(source, file, areas = null) {
  const match = /^<!-- luz:page\n([\s\S]*?)\n-->\n/.exec(source);
  if (!match) throw new Error(`${file}:1: a page starts with a <!-- luz:page … --> front matter comment`);
  const meta = {};
  match[1].split("\n").forEach((line, i) => {
    const where = `${file}:${i + 2}`;
    if (!line.trim()) return;
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`${where}: front matter lines are "key: value"`);
    const [, key, value] = kv;
    if (!(key in FRONT_MATTER)) throw new Error(`${where}: unknown front matter key "${key}"`);
    if (key in meta) throw new Error(`${where}: "${key}" is set twice`);
    meta[key] = value.trim();
  });
  for (const [key, rule] of Object.entries(FRONT_MATTER)) {
    if (meta[key] === undefined || meta[key] === "") {
      if (rule.required) throw new Error(`${file}: front matter needs "${key}"`);
      meta[key] = rule.default;
    }
  }
  if (!NAME.test(meta.layout)) throw new Error(`${file}: layout "${meta.layout}" is not a valid name`);
  if (!/^\d+$/.test(meta.order)) throw new Error(`${file}: order "${meta.order}" is not a whole number`);
  for (const key of ["nav", "search", "lead"]) {
    if (!["true", "false"].includes(meta[key])) throw new Error(`${file}: ${key} is "true" or "false"`);
  }
  if (!["h2", "h2,h3", "false"].includes(meta.toc)) throw new Error(`${file}: toc is "h2", "h2,h3" or "false"`);
  if (!["", "gallery", "a-z", "snippets", "ai", "notfound"].includes(meta.generate)) throw new Error(`${file}: generate is "gallery", "a-z", "snippets", "ai" or "notfound"`);
  if (meta.group && !NAME.test(meta.group)) throw new Error(`${file}: group "${meta.group}" is not a valid name`);
  if (areas && meta.area !== HUB_AREA) {
    const area = areas.find((a) => a.id === meta.area);
    if (!area) throw new Error(`${file}: unknown area "${meta.area}" (site.json has ${areas.map((a) => a.id).join(", ")})`);
    if (meta.group && !(area.groups ?? []).some((g) => g.id === meta.group)) {
      throw new Error(`${file}: area "${meta.area}" has no group "${meta.group}" in site.json`);
    }
  }

  const rest = source.slice(match[0].length);
  const leading = /^(?:[ \t]*\n)*/.exec(rest)[0];
  const bodyLine = source.slice(0, match[0].length + leading.length).split("\n").length;
  const body = rest.slice(leading.length).replace(/\n$/, "");
  return { meta, body, bodyLine };
}

/* ---- Reading files safely ---------------------------------------------- */

/**
 * Read a file only if it is a regular file (not a symlink) whose real path is
 * inside one of `roots` (SEC-PLG-1, SEC-PLG-2). A root that is itself a
 * symlink is refused: its real path would follow the link, and anything
 * behind it would count as inside.
 */
export function readInside(path, roots) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) throw new Error(`${path}: not found`);
  if (stat.isSymbolicLink()) throw new Error(`${path}: symlinks are not allowed in the docs sources`);
  if (!stat.isFile()) throw new Error(`${path}: not a file`);
  const real = realpathSync(path);
  const inside = roots.some((root) => {
    if (lstatSync(root).isSymbolicLink()) throw new Error(`${root}: symlinks are not allowed in the docs sources`);
    const realRoot = realpathSync(root);
    return real === realRoot || real.startsWith(realRoot + sep);
  });
  if (!inside) throw new Error(`${path}: outside the docs sources`);
  return readFileSync(real, "utf-8");
}

/* ---- Scanning the site ------------------------------------------------- */

/**
 * Scan apps/docs: site.json, every page under pages/ and the not-found page
 * (404.html, optional). Files and folders whose name starts with "_" are not
 * pages. Returns { docsDir, repoRoot, areas, pages: [{ file, abs, route,
 * depth, meta, body, bodyLine }], notFound (or null), byRoute: Map, byFile:
 * Map (absolute path → page) }, pages sorted by route.
 */
export function scanSite(docsDir, repoRoot = resolve(docsDir, "../..")) {
  const rel = (p) => relative(repoRoot, p).split(sep).join("/");
  const roots = [docsDir];
  const siteText = readInside(join(docsDir, "site.json"), roots);
  const { areas } = JSON.parse(siteText);
  const validGroups = (groups) =>
    groups === undefined || (Array.isArray(groups) && groups.every((g) => NAME.test(g?.id ?? "") && typeof g.label === "string"));
  if (!Array.isArray(areas) || areas.some((a) => !NAME.test(a?.id ?? "") || typeof a.label !== "string" || !NAME.test(a.slug ?? "") || !validGroups(a.groups) || !(a.package === undefined || /^@luz-ds\/[a-z0-9-]+$/.test(a.package)))) {
    throw new Error(`${rel(join(docsDir, "site.json"))}: "areas" is a list of { id, label, slug, package?, groups?, essentials? }`);
  }

  // An area may be nested in another one's sidebar section ("parent"): one level, no groups of its own
  const siteFile = rel(join(docsDir, "site.json"));
  const lineOf = (area) => {
    const at = siteText.search(new RegExp(`"id"\\s*:\\s*"${area.id}"`));
    return at === -1 ? 1 : siteText.slice(0, at).split("\n").length;
  };
  for (const area of areas) {
    if (area.parent === undefined) continue;
    const where = `${siteFile}:${lineOf(area)}: area "${area.id}"`;
    const parent = areas.find((a) => a.id === area.parent);
    if (area.parent === area.id) throw new Error(`${where}: "parent" cannot be the area itself`);
    if (!parent) throw new Error(`${where}: "parent" is "${area.parent}", which is not an area of site.json`);
    if (parent.parent !== undefined) throw new Error(`${where}: "parent" is "${area.parent}", which is itself nested: one level only`);
    if (area.groups !== undefined) throw new Error(`${where}: a nested area (with a "parent") has no "groups"`);
  }

  const pagesDir = join(docsDir, "pages");
  const pages = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const abs = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`${rel(abs)}: symlinks are not allowed in the docs sources`);
      if (entry.name.startsWith("_")) continue;
      if (entry.isDirectory()) {
        if (!SEGMENT.test(entry.name)) throw new Error(`${rel(abs)}: "${entry.name}" is not a valid route segment`);
        walk(abs, `${prefix}${entry.name}/`);
      } else if (entry.isFile()) {
        const file = rel(abs);
        const route = routeOfPage(`${prefix}${entry.name}`, file);
        const { meta, body, bodyLine } = parseFrontMatter(readInside(abs, roots), file, areas);
        pages.push({ file, abs, route, depth: depthOf(route), meta, body, bodyLine });
      } else {
        throw new Error(`${rel(abs)}: only .html files and folders belong in pages/`);
      }
    }
  };
  walk(pagesDir, "");

  const byRoute = new Map();
  for (const page of pages) {
    const other = byRoute.get(page.route);
    if (other) throw new Error(`${page.file} and ${other.file} both make ${page.route}: keep one`);
    byRoute.set(page.route, page);
  }
  // "Keep going" of each area: up to MAX_ESSENTIALS pages of the site, data not code
  for (const area of areas) {
    const where = `${rel(join(docsDir, "site.json"))}: area "${area.id}"`;
    const list = area.essentials ?? [];
    if (!Array.isArray(list) || list.length > MAX_ESSENTIALS) throw new Error(`${where}: "essentials" is a list of up to ${MAX_ESSENTIALS} { href, label? }`);
    for (const item of list) {
      if (typeof item?.href !== "string" || (item.label !== undefined && (typeof item.label !== "string" || !item.label.trim()))) {
        throw new Error(`${where}: an essential is { href, label? }`);
      }
      if (!byRoute.has(item.href)) throw new Error(`${where}: essential ${item.href} is not a page of the site`);
    }
    if (new Set(list.map((item) => item.href)).size !== list.length) throw new Error(`${where}: an essential is listed twice`);
  }
  pages.sort((a, b) => (a.route < b.route ? -1 : a.route > b.route ? 1 : 0));

  let notFound = null;
  const notFoundAbs = join(docsDir, NOT_FOUND_FILE);
  if (lstatSync(notFoundAbs, { throwIfNoEntry: false })) {
    const file = rel(notFoundAbs);
    const { meta, body, bodyLine } = parseFrontMatter(readInside(notFoundAbs, roots), file, areas);
    notFound = { file, abs: notFoundAbs, route: NOT_FOUND_ROUTE, depth: 0, meta, body, bodyLine };
  }

  // The home page's languages (i18n.js), read only inside their folder
  const i18nDir = join(repoRoot, I18N_DIR);
  const i18n = loadLocales(i18nDir, repoRoot, (abs) => readInside(abs, [i18nDir]));

  // The partials shared with the home page: a symlink or a name in both folders fails here
  sharedPartials(docsDir, repoRoot);

  // The docs' own languages (docs-i18n.js): a folder apps/docs/i18n/<code>/ each
  const docsI18n = loadDocsLocales(docsDir, i18n, { repoRoot, areas, byRoute });

  const all = notFound ? [...pages, notFound] : pages;
  const site = { docsDir, repoRoot, areas, pages, notFound, byRoute, byFile: new Map(all.map((p) => [p.abs, p])), i18n, docsI18n, docsRoute: DOCS_ROUTE };
  // Every string the generator writes goes through `site.t`; the keys read are recorded in `usage.used` while a build runs
  site.usage = { used: null };
  site.lang = i18n?.default.code ?? "en";
  site.t = makeT({
    strings: docsI18n ? docsI18n.reference.strings : bundledEnglish(),
    lang: site.lang,
    usage: site.usage,
    file: docsI18n ? docsI18n.reference.file : "apps/docs/i18n/en/strings.json",
  });
  return site;
}

/**
 * The English locale of the docs pages: the home page's default catalog and the
 * docs' English strings, one object (a key is in one of them, never both).
 */
function englishLocale(site) {
  if (site.englishLocale) return site.englishLocale;
  const docs = site.docsI18n?.reference;
  const docsStrings = docs ? docs.strings : bundledEnglish();
  const home = site.i18n?.default;
  site.englishLocale = {
    code: "en",
    name: "English",
    dir: "ltr",
    route: "/",
    file: docs?.file ?? "apps/docs/i18n/en/strings.json",
    source: docs?.source ?? "",
    numbers: () => ({}),
    ...home,
    alsoIn: docs?.file ?? "apps/docs/i18n/en/strings.json",
    docsStrings,
    strings: { ...home?.strings, ...docsStrings },
  };
  return site.englishLocale;
}

/** The routes of the home page, one per language ("/" alone without a registry). */
export const homesOf = (site) => site.i18n?.locales.map((l) => l.route) ?? ["/"];

/* ---- The site's structure, from the front matter ------------------------ */

// The order is the English one in every language: the title that breaks a tie is the English page's
const byOrder = (a, b) => Number(a.meta.order) - Number(b.meta.order) || englishOf(a).meta.title.localeCompare(englishOf(b).meta.title, "en");

/** The area of a page, or null for the hub area. */
export function areaOf(site, page) {
  return site.areas.find((a) => a.id === page.meta.area) ?? null;
}

/** The route of an area's index page (in the docs at `root`: "/docs/", "/es/docs/"). */
export const areaRoute = (area, root = DOCS_ROUTE) => `${root}${area.slug}/`;

/** The index page of an area, or null while it has none. */
export function indexOf(site, area) {
  return site.byRoute.get(areaRoute(area, docsRootOf(site))) ?? null;
}

/**
 * The pages of an area under its index, in sidebar order: the pages without a
 * sidebar group first, then each group marked `sidebar: true` in site.json.
 * Returns [{ group (null or a site.json group), pages }].
 */
export function sectionsOf(site, area) {
  const index = areaRoute(area, docsRootOf(site));
  const pages = site.pages
    .filter((p) => p.meta.area === area.id && p.route !== index && p.meta.nav !== "false")
    .sort(byOrder);
  const sidebarGroups = (area.groups ?? []).filter((g) => g.sidebar);
  const inGroup = (p, g) => p.meta.group === g.id;
  return [
    { group: null, pages: pages.filter((p) => !sidebarGroups.some((g) => inGroup(p, g))) },
    ...sidebarGroups.map((g) => ({ group: g, pages: pages.filter((p) => inGroup(p, g)) })),
  ].filter((s) => s.pages.length);
}

/** The pages of an area under its index in sidebar order, flat. */
const flatPagesOf = (site, area) => sectionsOf(site, area).flatMap((s) => s.pages);

/** The areas in sidebar order: site.json's, a nested area (`parent`) right after the pages of its parent. */
const sidebarAreas = (site) => site.areas.filter((a) => !a.parent).flatMap((a) => [a, ...site.areas.filter((c) => c.parent === a.id)]);

/**
 * The reading order of Previous / Next: the sidebar order across the areas,
 * each area's index first. The hub area (the home, the A–Z index) and the
 * not-found page are not in it. Cached on the site.
 */
export function readingOrder(site) {
  site.readingOrder ??= sidebarAreas(site).flatMap((area) => [indexOf(site, area), ...flatPagesOf(site, area)].filter(Boolean));
  return site.readingOrder;
}

/** The pages before and after a page in the reading order: { prev, next } (null at the ends), or null when it is not in it. */
export function neighboursOf(site, page) {
  const order = readingOrder(site);
  const i = order.findIndex((p) => p.route === page.route);
  if (i === -1) return null;
  return { prev: order[i - 1] ?? null, next: order[i + 1] ?? null };
}

/**
 * The "Keep going" links of a page: its area's `essentials` (site.json), in
 * that order, without the page itself and without its Previous / Next (the
 * pager below already links them). [{ route, label }].
 */
export function essentialsOf(site, page) {
  const area = areaOf(site, page);
  if (!area) return [];
  const { prev, next } = neighboursOf(site, page) ?? {};
  const skip = new Set([page.route, prev?.route, next?.route]);
  return (area.essentials ?? [])
    .filter((item) => !skip.has(item.href))
    .map((item) => {
      const target = site.byRoute.get(item.href);
      // `english`: the label is English (a fallback page's title, or a label kept as written): it says lang="en"
      return { route: item.href, label: item.label ?? target.meta.title, english: item.label ? item.english === true : target.fallback === true };
    });
}

/** The text of <title>: "<h1> – <Area> – LUZ documentation", shorter on the hub and area indexes. */
export function docTitleOf(site, page) {
  const title = tOf(site)("title.site");
  const english = englishOf(page);
  if (english.route === DOCS_ROUTE || english.meta.title === SITE_TITLE) return title;
  const area = areaOf(site, page);
  // An area index is named as its area (compared in English, whatever the language of the title)
  if (!area || english.meta.title === areaOf(baseOf(site), english).label) return `${page.meta.title} – ${title}`;
  return `${page.meta.title} – ${area.label} – ${title}`;
}

/** The headings of a page's own content (cached): readHtml() of its body. */
function contentOf(page) {
  page.parsed ??= readHtml("\n".repeat(page.bodyLine - 1) + page.body, page.file);
  return page.parsed;
}

/**
 * The headings of a page, for the indexes: the structure (ids, levels, whether
 * a heading is in a demo) is the English page's, the text is the translation's
 * where the page is translated (their ids are the same: parity checks it).
 * `english` is the English text.
 */
function headingsOf(page) {
  const english = contentOf(englishOf(page)).headings;
  if (!page.english || page.fallback) return english;
  const own = new Map(contentOf(page).headings.filter((h) => h.id).map((h) => [h.id, h.text]));
  return english.map((h) => ({ ...h, english: h.text, text: own.get(h.id) ?? h.text }));
}

/* ---- Generated blocks --------------------------------------------------- */

const link = (href, text, attrs = "") => `<a${attrs} href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;

/**
 * The sidebar, flat: every area of site.json with every page of it, so a
 * page of another area is one link away and nothing is folded. A group
 * marked `sidebar: true` is a labelled sub-list. aria-current="page" on the
 * current page (the area link on an area index), "true" on its area link.
 * No .is-active: that is the scroll spy's mark. One line per link, without
 * indentation: the list is on every page, under the ceiling of a page (RL-17).
 */
export function renderNav(site, page) {
  const current = areaOf(site, page);
  const root = docsRootOf(site);
  // In a language the title of a page that is not translated is English: one lang="en" on a list of such pages, else on each link
  const item = (p, listIsEnglish) =>
    `<li>${link(p.route, p.meta.title, ` class="luz-sidebar__link"${p.fallback && !listIsEnglish ? enLang(site) : ""}${p.route === page.route ? ' aria-current="page"' : ""}`)}</li>`;
  const mark = (area) => {
    const route = areaRoute(area, root);
    const here = current?.id === area.id || current?.parent === area.id;
    return !here ? "" : page.route === route ? ' aria-current="page"' : ' aria-current="true"';
  };
  const areaHead = (area, attrs) => {
    const route = areaRoute(area, root);
    return link(indexOf(site, area) ? route : area.fallback ?? route, area.label, `${attrs}${mark(area)}`);
  };
  const listOf = (area) => {
    const sections = sectionsOf(site, area);
    // The area's own list is English as a whole when every page in it is, and it has no group label (said in the language)
    const allEnglish = sections.length === 1 && !sections[0].group && sections[0].pages.every((p) => p.fallback);
    return { sections, allEnglish };
  };
  const pagesOf = ({ sections, allEnglish }) =>
    sections.flatMap(({ group, pages }) => {
      if (!group) return pages.map((p) => item(p, allEnglish));
      const groupEnglish = pages.every((p) => p.fallback);
      return [
        `<li class="docs-nav__group"><span class="luz-sidebar__section-label" id="nav-${group.id}">${escapeHtml(group.label)}</span>`,
        `<ul class="docs-nav__pages"${groupEnglish ? enLang(site) : ""} aria-labelledby="nav-${group.id}">`,
        ...pages.map((p) => item(p, groupEnglish)),
        "</ul></li>",
      ];
    });
  // A nested area is a block at the end of its parent's list: its link, named by an id, then its pages
  const subOf = (area) => {
    const inner = listOf(area);
    const head = areaHead(area, ` class="luz-sidebar__link docs-nav__subarea" id="nav-${area.id}"`);
    const children = pagesOf(inner);
    if (!children.length) return [`<li class="docs-nav__sub">${head}</li>`];
    return [`<li class="docs-nav__sub">${head}`, `<ul class="docs-nav__pages"${inner.allEnglish ? enLang(site) : ""} aria-labelledby="nav-${area.id}">`, ...children, "</ul></li>"];
  };
  const items = site.areas
    .filter((area) => !area.parent)
    .map((area) => {
      const head = areaHead(area, ' class="luz-sidebar__link docs-nav__area"');
      const subs = site.areas.filter((a) => a.parent === area.id);
      const own = listOf(area);
      // With a nested block in the list, the language of each link is its own: the block's label is not English
      const children = [...pagesOf(subs.length ? { ...own, allEnglish: false } : own), ...subs.flatMap(subOf)];
      if (!children.length) return `<li>${head}</li>`;
      return [`<li>${head}`, `<ul class="docs-nav__pages"${own.allEnglish && !subs.length ? enLang(site) : ""}>`, ...children, "</ul></li>"].join("\n");
    });
  return `    <ul class="docs-nav">\n${items.join("\n")}\n    </ul>`;
}

/**
 * The breadcrumb: Docs › Area › Page, as the APG pattern has it (a labelled
 * nav, an ordered list, aria-current="page" on the last item). None on the
 * hub and the not-found page.
 */
export function renderBreadcrumb(site, page) {
  const canonical = englishOf(page).route;
  if (canonical === DOCS_ROUTE || canonical === NOT_FOUND_ROUTE) return "";
  const t = tOf(site);
  const root = docsRootOf(site);
  const area = areaOf(site, page);
  const trail = [link(root, t("chrome.crumb-docs"), ' class="luz-breadcrumb__item"')];
  const outer = area?.parent ? site.areas.find((a) => a.id === area.parent) : null;
  if (outer && indexOf(site, outer)) trail.push(link(areaRoute(outer, root), outer.label, ' class="luz-breadcrumb__item"'));
  if (area && page.route !== areaRoute(area, root) && indexOf(site, area)) {
    trail.push(link(areaRoute(area, root), area.label, ' class="luz-breadcrumb__item"'));
  }
  trail.push(`<span class="luz-breadcrumb__item"${enAttr(site, page)} aria-current="page">${escapeHtml(page.meta.title)}</span>`);
  const items = trail.map((item) => `        <li>${item}</li>`).join("\n");
  return `    <nav class="docs-breadcrumb" aria-label="${say(t, "chrome.crumb")}">\n      <ol class="luz-breadcrumb">\n${items}\n      </ol>\n    </nav>`;
}

/** Where the source of the site is: the rail's and the page foot's Edit and Report. */
export const REPO_URL = "https://github.com/nandovejer/luz";

/**
 * A component or a pattern page: the pages whose head ends with the chips.
 * A component of a gallery group (not a helper), or a pattern of a package's area.
 */
export function isViewPage(page) {
  const { area, group } = page.meta;
  return (area === "components" && group !== "" && group !== "helpers") || (PACKAGE_AREAS.has(area) && group === "patterns");
}

/**
 * The number of known issues a page's "Known issues" section declares: its
 * list items; without a list, its paragraphs; "None known." is 0. Null when
 * the page has no such section.
 */
export function knownIssuesOf(body) {
  const heading = /<h2 id="known-issues">[\s\S]*?<\/h2>/.exec(body);
  if (!heading) return null;
  const rest = body.slice(heading.index + heading[0].length);
  const end = rest.search(/<h2\b|<nav\b/);
  const section = end === -1 ? rest : rest.slice(0, end);
  const items = (section.match(/<li\b/g) ?? []).length;
  if (items) return items;
  if (/None known\./.test(section)) return 0;
  return (section.match(/<p[\s>]/g) ?? []).length;
}

/** Is there a spec of the page: tests/<slug>.spec.js or tests/<area>-<slug>.spec.js? */
const isTested = (site, page) => {
  const slug = page.route.split("/").at(-2);
  return [`${slug}.spec.js`, `${page.meta.area}-${slug}.spec.js`].some((name) => existsSync(join(site.repoRoot, "tests", name)));
};

/**
 * The chips of a component or pattern page: one per `;` entry of `files`,
 * the module (or "No JavaScript"), the modes, "Tested" when the page has a
 * spec, and its known issues, linked to the section.
 */
function chipsOf(site, page) {
  const t = tOf(site);
  const files = page.meta.files.split(";").map((f) => f.trim()).filter(Boolean);
  // The count is the English page's: a translation cannot change what the chip says
  const issues = knownIssuesOf(englishOf(page).body) ?? 0;
  return [
    ...files.map((f) => `<code class="docs-demo__file">${escapeHtml(f)}</code>`),
    page.meta.module ? escapeHtml(t("chip.js", { module: page.meta.module })) : say(t, "chip.nojs"),
    say(t, "chip.modes"),
    ...(isTested(site, page) ? [say(t, "chip.tested")] : []),
    link("#known-issues", t.plural("chip.issues", issues)),
  ];
}

/**
 * The breadcrumb, then the page head: the eyebrow ("Area · Group", or the
 * area alone; "Area · package" on an area index whose site.json entry has a
 * `package`; none on the hub), the h1, the lead (unless the content brings
 * its own) and, on a component or pattern page, the chips; on any other
 * page with `files`, a line "Files: a, b". The not-found
 * page keeps its plain head: the h1 and the lead.
 */
export function renderPageHead(site, page) {
  const t = tOf(site);
  const h1 = `    <h1 class="docs-title"${enAttr(site, page)}>${escapeHtml(page.meta.title)}</h1>`;
  const lead = page.meta.lead === "true" ? [`    <p class="luz-docs-page-head__lead"${enAttr(site, page)}>${escapeHtml(page.meta.description)}</p>`] : [];
  if (page.route === NOT_FOUND_ROUTE) {
    return `  <div class="luz-docs-page-head">\n${h1}${page.meta.lead === "true" ? `\n    <p class="docs-lead">${escapeHtml(page.meta.description)}</p>` : ""}\n  </div>`;
  }
  const area = areaOf(site, page);
  const group = area?.groups?.find((g) => g.id === page.meta.group);
  // An area index names the package the area documents (site.json `package`); its pages name their group
  // (a package name is code, in its own case)
  const pkg = area && page.route === areaRoute(area, docsRootOf(site)) && area.package ? `<code>${escapeHtml(area.package)}</code>` : null;
  const second = pkg ?? (group ? escapeHtml(group.label) : null);
  const eyebrow = area ? [`    <p class="luz-docs-page-head__eyebrow">${escapeHtml(area.label)}${second ? ` · ${second}` : ""}</p>`] : [];
  const files = page.meta.files.split(";").map((f) => f.trim()).filter(Boolean);
  // A component or pattern page ends with the chips; any other page with files says them in a line
  const chips = isViewPage(page)
    ? [`    <ul class="luz-docs-page-head__meta">${chipsOf(site, page).map((c) => `<li>${c}</li>`).join("")}</ul>`]
    : files.length
      ? [`    <p class="luz-docs-page-head__files">${say(t, "page.files")} ${files.map((f) => `<code class="docs-demo__file">${escapeHtml(f)}</code>`).join(", ")}</p>`]
      : [];
  const crumb = renderBreadcrumb(site, page);
  return [...(crumb ? [crumb] : []), '  <header class="luz-docs-page-head">', ...eyebrow, h1, ...lead, ...chips, "  </header>"].join("\n");
}

/**
 * "On this page": the h2 (or h2 and h3) of the content that have an id,
 * outside demos. Only on a page with three or more h2. Each h3 is listed
 * under its h2, in a nested list (on a component page: the sections of the
 * Code and of the Design tab, both, whichever tab is open; core's tabs.js
 * opens the tab of a section a link points at). An open <details> in the
 * rail, so it reads without JS; with it, the docs script folds it below
 * 80rem (the rail is above the content there) and, from 80rem, marks the
 * section in view (core's initSidebar).
 */
export function renderToc(page, html, t = englishT(), site = {}) {
  if (page.meta.toc === "false") return "";
  const levels = page.meta.toc === "h2,h3" ? [2, 3] : [2];
  const headings = readHtml(html, page.file).headings.filter((h) => levels.includes(h.level) && !h.specimen);
  if (headings.filter((h) => h.level === 2).length < 3) return "";
  const missing = headings.find((h) => !h.id);
  if (missing) throw new Error(`${page.file}: the heading "${missing.text}" belongs in "On this page" and needs an id`);
  if (headings[0].level !== 2) throw new Error(`${page.file}: the h3 "${headings[0].text}" comes before any h2`);
  const item = (h) => link(`#${h.id}`, h.text, ' class="luz-sidebar__link luz-docs-rail__link"');
  const lines = [];
  headings.forEach((h, i) => {
    const next = headings[i + 1];
    if (h.level === 2) {
      lines.push(next?.level === 3 ? `        <li>${item(h)}\n          <ul class="luz-docs-rail__sub">` : `        <li>${item(h)}</li>`);
      return;
    }
    lines.push(`            <li>${item(h)}</li>`);
    if (next?.level !== 3) lines.push("          </ul>\n        </li>");
  });
  // The headings are the content's: English on a page that is not translated yet
  return `  <nav class="luz-docs-rail__onpage" aria-labelledby="docs-rail-title">\n    <details class="luz-docs-rail__fold" open>\n      <summary class="luz-docs-rail__title" id="docs-rail-title">${say(t, "rail.on-page")}</summary>\n      <ul class="luz-docs-rail__list"${enAttr(site, page)}>\n${lines.join("\n")}\n      </ul>\n    </details>\n  </nav>`;
}

/**
 * The end of a page: "Keep going", a labelled nav with the area's essential
 * links, then Previous / Next in the reading order (across areas: an area's
 * index leads to its first page, its last page to the next area's index),
 * @luz-ds/docs's pager. Each pager link is one block, a small "Previous" /
 * "Next" above the page's title, named by that visible text, "Previous
 * Breadcrumb" (WCAG 2.5.3): no aria-label. Nothing on the hub area and the
 * not-found page.
 */
export function renderEndNav(site, page) {
  const t = tOf(site);
  const around = neighboursOf(site, page);
  const essentials = essentialsOf(site, page);
  if (!around && !essentials.length) return "";
  const lines = ['  <nav class="docs-end" aria-labelledby="docs-end-title">', `    <h2 class="docs-end__title" id="docs-end-title">${say(t, "end.title")}</h2>`];
  if (essentials.length) {
    lines.push('    <ul class="docs-end__links">', ...essentials.map((e) => `      <li>${link(e.route, e.label, e.english ? enLang(site) : "")}</li>`), "    </ul>");
  }
  const pager = [];
  for (const [key, label, rel] of [["prev", say(t, "end.prev"), "prev"], ["next", say(t, "end.next"), "next"]]) {
    const target = around?.[key];
    if (!target) continue;
    pager.push(
      `      <li class="luz-docs-pager__${key}"><a class="luz-docs-pager__link" rel="${rel}" href="${escapeHtml(target.route)}">` +
        `<span class="luz-docs-pager__label">${label}</span> ` +
        `<span class="luz-docs-pager__title"${enAttr(site, target)}>${escapeHtml(target.meta.title)}</span></a></li>`,
    );
  }
  if (pager.length) lines.push('    <ul class="luz-docs-pager">', ...pager, "    </ul>");
  lines.push("  </nav>");
  return lines.join("\n");
}

/** The Edit and Report links of a page: its source file on GitHub, and a new issue titled with the page. */
const actionsOf = (page) => ({
  edit: `${REPO_URL}/edit/main/${page.file}`,
  report: `${REPO_URL}/issues/new?title=${encodeURIComponent(page.meta.title)}`,
});

/**
 * The rail, the aside between the sidebar and main (so "On this page" comes
 * before the content; the skip link still goes to main, past both), around
 * one inner box (the sticky one, so the aside can stretch over main's rows
 * from 80rem and never cover the footer): "On this page"
 * (`toc`, from renderToc; none on a short page) and the page's actions: Copy page as Markdown (a
 * link to the page's index.md, which the docs script copies to the
 * clipboard), Edit this page and Report a problem.
 */
export function renderRail(page, toc, t = englishT()) {
  const { edit, report } = actionsOf(page);
  return [
    `  <aside class="luz-docs-rail" aria-label="${say(t, "rail.about")}">`,
    '  <div class="luz-docs-rail__inner">',
    ...(toc ? [toc] : []),
    '    <div class="luz-docs-rail__actions">',
    `      ${link(`${page.route}index.md`, t("rail.copy"), ` data-docs-copy-page data-docs-copied="${say(t, "rail.copied")}" data-docs-not-copied="${say(t, "rail.not-copied")}"`)}`,
    `      ${link(edit, t("rail.edit"))}`,
    `      ${link(report, t("rail.report"))}`,
    "    </div>",
    "  </div>",
    "  </aside>",
  ].join("\n");
}

const pad = (n) => String(n).padStart(2, "0");
/** Today, as the local calendar has it: YYYY-MM-DD. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** The date of the last commit of each file, by absolute path: one git call per file per process. */
const lastCommits = new Map();

/**
 * The day a page was last changed: the commit date of its file
 * (`git log -1 --format=%cs`), cached; today in dev, and for a file git does
 * not know (new, or outside a repository).
 */
export function lastUpdatedOf(site, page, { dev = false } = {}) {
  if (dev) return today();
  if (!lastCommits.has(page.abs)) {
    let date = "";
    try {
      date = execFileSync("git", ["log", "-1", "--format=%cs", "--", page.file], {
        cwd: site.repoRoot,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      date = "";
    }
    lastCommits.set(page.abs, /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null);
  }
  return lastCommits.get(page.abs) ?? today();
}

const dateFormats = new Map();
/** The long date of the catalog's `format.date-locale`: "18 October 2026", "18 de octubre de 2026". */
const dayOf = (iso, locale) => {
  if (!dateFormats.has(locale)) {
    const options = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };
    // A catalog whose format.date-locale is no language tag still gets a date, in English
    dateFormats.set(locale, (() => { try { return new Intl.DateTimeFormat(locale, options); } catch { return new Intl.DateTimeFormat("en-GB", options); } })());
  }
  return dateFormats.get(locale).format(new Date(`${iso}T00:00:00Z`));
};

/** The page foot: "Last updated <time>", then Edit and Report, the rail's links. */
export function renderPageFoot(site, page, options = {}) {
  const t = tOf(site);
  const iso = lastUpdatedOf(site, page, options);
  const { edit, report } = actionsOf(page);
  const day = dayOf(iso, t("format.date-locale"));
  return `  <p class="luz-docs-page-foot">${say(t, "page.updated")} <time datetime="${iso}">${day}</time> · ${link(edit, t("rail.edit"))} · ${link(report, t("rail.report"))}</p>`;
}

/**
 * The gallery of an area index: one h2 per group of site.json (in its
 * order), a card per page with its name as the one link and its
 * description; a group marked `list: true` is a plain list.
 */
export function renderGallery(site, page) {
  const area = areaOf(site, page);
  if (!area) return "";
  const pages = site.pages
    .filter((p) => p.meta.area === area.id && p.route !== areaRoute(area, docsRootOf(site)) && p.meta.nav !== "false")
    .sort(byOrder);
  const groups = [...(area.groups ?? []), { id: "", label: "" }];
  const card = (p) =>
    `      <li class="luz-card docs-card"${enAttr(site, p)}>\n        <h3 class="luz-card__title docs-card__title">${link(p.route, p.meta.title)}</h3>\n        <p class="luz-card__body docs-card__desc">${escapeHtml(p.meta.description)}</p>\n      </li>`;
  const row = (p) => `      <li${enAttr(site, p)}>${link(p.route, p.meta.title)} <span class="docs-gallery__desc">${escapeHtml(p.meta.description)}</span></li>`;
  return groups
    .map((group) => {
      const members = pages.filter((p) => p.meta.group === group.id);
      if (!members.length) return "";
      const list = group.list
        ? `    <ul class="docs-gallery__rows">\n${members.map(row).join("\n")}\n    </ul>`
        : `    <ul class="docs-gallery__cards">\n${members.map(card).join("\n")}\n    </ul>`;
      if (!group.label) return `  <div class="docs-gallery">\n${list}\n  </div>`;
      return `  <section class="docs-gallery" aria-labelledby="group-${group.id}">\n    <h2 id="group-${group.id}"${ownAttrs(site, page)}>${escapeHtml(group.label)}</h2>\n${list}\n  </section>`;
    })
    .filter(Boolean)
    .join("\n");
}

/** The h2 of a component page's tab panels: its h3 belong to that tab. */
const VIEW_HEADINGS = new Set(["code", "design"]);

/** A class a page names in <code>, with its dot: `.luz-btn--primary`, `.o-container`, `.u-hidden`. */
const CLASS_NAME = /^\.(?:luz|o|u)-[a-z0-9]+(?:(?:-{1,2}|__)[a-z0-9]+)*$/;
/** A token a page names in <code>: `--luz-brand-primary`. */
const TOKEN_NAME = /^--luz-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The classes and tokens a page names in its own text (not in a demo, not in
 * a code sample), each with the section it is named in: the one that names
 * it most, the first on a tie; or the element that carries its own id (a
 * token card, `id="luz-brand-primary"`). `defined` says a card or a table of
 * classes (a cell labelled "Class…") names it. [{ text, id, tab, count, defined, token }]
 * in document order; `id` is null before the page's first heading.
 */
function namesOf(page, byId) {
  const found = new Map();
  // The names are code, the same in a translation: read from the English page
  page = englishOf(page);
  for (const code of contentOf(page).codes) {
    const token = TOKEN_NAME.test(code.text);
    if (code.specimen || !(token || CLASS_NAME.test(code.text))) continue;
    // A card with the name for its id (a token), or the cell of a table of classes
    const own = code.own === code.text.replace(/^[.-]+/, "");
    const id = own ? code.own : code.heading;
    const where = found.get(code.text) ?? found.set(code.text, { token, named: true, targets: new Map() }).get(code.text);
    const target = where.targets.get(id) ?? where.targets.set(id, { id, tab: byId.get(code.heading)?.tab ?? null, count: 0, defined: false }).get(id);
    target.count++;
    target.defined ||= own || /^class/i.test(code.cell ?? "");
  }
  // A colour drawn as a swatch and named nowhere in a <code> (a primitive of the palette): the
  // label of its scale, where the page defines it
  const { swatches, ids } = contentOf(page);
  for (const { token: text, heading, own } of swatches) {
    if (!TOKEN_NAME.test(text)) continue;
    const id = ids.has(own) ? own : heading;
    const where = found.get(text) ?? found.set(text, { token: true, targets: new Map() }).get(text);
    if (where.named) continue;
    const target = where.targets.get(id) ?? where.targets.set(id, { id, tab: byId.get(heading)?.tab ?? null, count: 0, defined: true }).get(id);
    target.count++;
  }
  return [...found].map(([text, { token, targets }]) => {
    const all = [...targets.values()];
    // Where it is defined, then where it is named most; Map keeps insertion order, so a tie is the first
    const best = all.reduce((a, b) => (Number(b.defined) - Number(a.defined) || b.count - a.count) > 0 ? b : a);
    return { text, id: best.id, tab: best.tab, count: all.reduce((n, t) => n + t.count, 0), defined: best.defined, token };
  });
}

/**
 * What the A–Z index and the search index are both made of, so the two never
 * disagree: every page that is not marked `search: false`, with its headings
 * (the levels of its "On this page", outside demos), its HTML element
 * cards (the h2 `el-<name>-title`), its keywords (other names for the page)
 * and the classes and tokens it names.
 * Returns [{ page, title, route, area (label or null), kind, keywords,
 * sections: [{ text, id, tab (label of its tab or null), template }],
 * elements: [{ text, id }], names: [{ text, id, tab }] }] in route order.
 * `template` marks a heading every component page has ("When to use"): it
 * names nothing on its own. A class or a token is listed once, on the page
 * that documents it: where a card or a table of classes defines it, then a
 * page of the tokens area, then the one that names it most.
 */
export function indexData(site) {
  const t = tOf(site);
  const data = site.pages
    .filter((page) => page.meta.search !== "false")
    .map((page) => {
      const area = areaOf(site, page);
      // The index of a package's area is the package ("Site", "Landing", "CMS"), not one of its patterns
      const kind =
        PACKAGE_AREAS.has(area?.id) && page.route === areaRoute(area, docsRootOf(site))
          ? area.label
          : site.locale
            ? t(Object.hasOwn(AREA_KIND, page.meta.area) ? `kind.${page.meta.area}` : "kind.page")
            : AREA_KIND[page.meta.area] ?? "Page";
      // The levels "On this page" lists: on a component page, the h3 of its tabs too
      const sectionLevels = page.meta.toc === "h2,h3" ? [2, 3] : [2];
      const sections = [];
      const elements = [];
      let tab = null;
      for (const h of headingsOf(page)) {
        if (h.specimen || !h.id) continue;
        if (h.level === 2) tab = VIEW_HEADINGS.has(h.id) ? h.text : null;
        const element = /^el-(.+)-title$/.exec(h.id);
        if (element && h.level === 2) {
          elements.push({ text: t("index.element", { name: h.text }), id: `el-${element[1]}` });
        } else if (sectionLevels.includes(h.level) && (h.english ?? h.text) !== englishOf(page).meta.title) {
          sections.push({ text: h.text, id: h.id, tab: h.level > 2 ? tab : null, template: TEMPLATE_HEADINGS.has(h.english ?? h.text) });
        }
      }
      const keywords = page.meta.keywords.split(",").map((k) => k.trim()).filter(Boolean);
      // An area index only introduces: what it names, a page of its area names for real
      const candidates = area && page.route === areaRoute(area, docsRootOf(site)) ? [] : namesOf(page, new Map(sections.map((s) => [s.id, s])));
      return { page, title: page.meta.title, route: page.route, area: area?.label ?? null, kind, keywords, sections, elements, names: [], candidates };
    });
  // Each name goes to one page. Tokens: a page of the tokens area. Then the page that names most of
  // its family (`.luz-btn` with `.luz-btn--primary`, `--luz-space` with `--luz-space-md`), where it
  // is defined, the page named after it (`.luz-select`, Select), and the page that names it most.
  const block = (c) => (c.token ? c.text.split("-").slice(0, 4).join("-") : c.text.split(/--|__/)[0]);
  for (const entry of data) {
    const family = new Map();
    for (const c of entry.candidates) family.set(block(c), (family.get(block(c)) ?? 0) + 1);
    entry.family = family;
  }
  const score = (entry, c) =>
    [c.token && entry.page.meta.area === "tokens", entry.family.get(block(c)), c.defined, c.text.includes(entry.route.split("/").at(-2)), c.count].map(Number);
  const beats = (a, b) => {
    const i = a.findIndex((v, k) => v !== b[k]);
    return i > -1 && a[i] > b[i];
  };
  const owner = new Map();
  for (const entry of data) {
    for (const c of entry.candidates) {
      const best = owner.get(c.text);
      if (!best || beats(score(entry, c), score(best.entry, best.c))) owner.set(c.text, { entry, c });
    }
  }
  for (const entry of data) {
    entry.names = entry.candidates.filter((c) => owner.get(c.text).entry === entry).map(({ text, id, tab }) => ({ text, id, tab }));
    delete entry.candidates;
    delete entry.family;
  }
  return data;
}

/**
 * Every entry of the A–Z index: each page, each other name of a page (its
 * `keywords`), each heading specific to a page (template headings left out),
 * and each HTML element card. The search index has all of these and more:
 * the template headings, and the classes and tokens (about 300 names, which
 * would take the page past its size ceiling).
 * Returns [{ name, href, kind }] sorted by name.
 */
export function indexEntries(site) {
  const t = tOf(site);
  const entries = [];
  for (const { title, route, kind, keywords, sections, elements } of indexData(site)) {
    entries.push({ name: title, href: route, kind });
    for (const k of aliasesOf(title, keywords)) entries.push({ name: k, href: route, kind: t("kind.alias", { title }) });
    for (const s of sections) if (!s.template) entries.push({ name: s.text, href: `${route}#${s.id}`, kind: t("kind.section", { title }) });
    for (const e of elements) entries.push({ name: e.text, href: `${route}#${e.id}`, kind: t("kind.element", { title }) });
  }
  const key = (e) => e.name.replace(/^[^\p{L}\p{N}]+/u, "");
  return entries.sort((a, b) => key(a).localeCompare(key(b), "en", { sensitivity: "base" }) || a.href.localeCompare(b.href));
}

/** The keywords of a page that its title does not already say. */
const aliasesOf = (title, keywords) => {
  const said = ` ${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return keywords.filter((k) => !said.includes(` ${k.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `));
};

/** Where the search index is published, next to the pages it points at. */
export const SEARCH_INDEX_ROUTE = `${DOCS_ROUTE}search-index.json`;
/** The search index of a language's docs: /es/docs/search-index.json. */
export const searchIndexRouteOf = (site) => `${docsRootOf(site)}search-index.json`;

/** Template headings the search leaves out: the page itself, or its tab row. */
const NOT_SEARCHED = new Set(["example", "code", "design"]);

/**
 * The search index of @luz-ds/site's search (format version 1, the
 * public contract documented on /docs/site/search/), from the same data
 * as the A–Z index: three lists of [text, url, meta?]. URLs are relative to
 * the JSON file, so the site works under any path; a section's URL carries
 * its page and its fragment, since "#how" exists on many pages. A section
 * names its page (and tab) in its meta, ["When to use", url, "Button ›
 * Design"], read after it, so it makes sense alone (a11y.md SRCH-19) and is
 * found by the page's name (the search reads the meta too); that is why
 * template headings are kept here. An element names its page in its text.
 * A class or a token is a section too: [".luz-btn--primary", url, "Button ›
 * Code"], at the part of the page that names it. A page's other names (its
 * `keywords`) follow its area in the meta of the page. Plain data for
 * JSON.stringify (SEC-PLG-9).
 */
export function buildSearchIndex(site) {
  const root = docsRootOf(site);
  const url = (route, id = "") => (route.slice(root.length) || "./") + (id && `#${id}`);
  const lang = site.locale?.code;
  const index = { version: 1, pages: [], sections: [], elements: [] };
  for (const { page, title, route, area, keywords, sections, elements, names } of indexData(site)) {
    // An entry of a translated page says its language (the 4th item of an entry); the others are English, in lists that say so
    const own = lang && !page.fallback;
    const entry = (text, href, meta) => (own ? [text, href, meta ?? "", lang] : meta ? [text, href, meta] : [text, href]);
    const meta = [area, aliasesOf(title, keywords).join(", ")].filter(Boolean).join(" · ");
    index.pages.push(entry(title, url(route), meta));
    for (const s of sections) {
      if (!NOT_SEARCHED.has(s.id)) index.sections.push(entry(s.text, url(route, s.id), `${title}${s.tab ? ` › ${s.tab}` : ""}`));
    }
    for (const n of names) index.sections.push([n.text, url(route, n.id ?? ""), `${title}${n.tab ? ` › ${n.tab}` : ""}`]);
    for (const e of elements) index.elements.push(entry(`${e.text}, ${title}`, url(route, e.id)));
  }
  return index;
}

/**
 * The A–Z index is two pages, so neither passes the ceiling of a docs page
 * (RL-17): the first holds the letters A–L, the second M–Z and then "Other"
 * (a name that starts with neither). Each lists its own half of the same
 * indexEntries(), so the two never disagree and every entry is on one page.
 */
export const AZ_PAGES = [
  { route: `${DOCS_ROUTE}a-z/`, label: "A–L", letters: [..."ABCDEFGHIJKL"] },
  { route: `${DOCS_ROUTE}a-z/m-z/`, label: "M–Z", letters: [..."MNOPQRSTUVWXYZ", "#"] },
];

/** The letter an entry is filed under: its first letter or digit, A–Z, else "#" (Other). */
const azLetterOf = (name) => {
  const first = name.replace(/^[^\p{L}\p{N}]+/u, "")[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
};
const azIdOf = (letter) => (letter === "#" ? "az-other" : `az-${letter.toLowerCase()}`);

/**
 * One page of the A–Z index (`page` is the one being rendered; the first half
 * when it is not one of AZ_PAGES): a nav to the two halves that says so in
 * words, the row of letters (a letter of the other half links to its section
 * there; Other last, on the half that has it), a pointer to the components
 * gallery, then one h2 and one list per letter of this half that has entries.
 */
export function renderAZ(site, page) {
  const t = tOf(site);
  const root = docsRootOf(site);
  // The index is the English one in every language (its names, kinds and letters are English): in a language it keeps
  // the language's chrome around it and says lang="en" on its lists; its links go to the pages of that language
  const base = baseOf(site);
  const inEnglish = site.locale ? enLang(site) : "";
  const toLocal = (route) => localRouteOf(site, route);
  const groups = new Map();
  for (const entry of indexEntries(base)) {
    const letter = azLetterOf(entry.name);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(entry);
  }
  const halfRoutes = AZ_PAGES.map((p) => ({ ...p, route: toLocal(p.route) }));
  const half = halfRoutes.find((p) => p.route === page?.route) ?? halfRoutes[0];
  const halves = halfRoutes.map((p) => `<li>${link(p.route, p.label, p === half ? ' aria-current="page"' : "")}</li>`).join("");
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  // A letter is a letter of the English alphabet in every language
  const jump = letters
    .map((l) => {
      if (!groups.has(l)) return `<li><span>${l}</span></li>`;
      const there = halfRoutes.find((p) => p.letters.includes(l));
      return `<li>${link(there === half ? `#${azIdOf(l)}` : `${there.route}#${azIdOf(l)}`, l)}</li>`;
    })
    .join("");
  // The row reaches every section of the page: Other too, when this half has it
  const other = half.letters.includes("#") && groups.has("#") ? `<li${site.locale ? ` lang="${site.locale.code}" dir="${site.locale.dir}"` : ""}>${link("#az-other", t("az.rest"))}</li>` : "";
  const sections = half.letters
    .filter((l) => groups.has(l))
    .map((l) => {
      const id = azIdOf(l);
      const heading = l === "#" ? say(t, "az.rest") : l;
      const items = groups
        .get(l)
        .map((e) => `      <li>${link(site.locale ? e.href.replace(DOCS_ROUTE, root) : e.href, e.name)} <span class="docs-az__kind">${escapeHtml(e.kind)}</span></li>`)
        .join("\n");
      return `  <section class="docs-az__letter" aria-labelledby="${id}">\n    <h2 id="${id}"${l === "#" ? ownAttrs(site, page) : inEnglish}>${heading}</h2>\n    <ul class="docs-az__list"${inEnglish}>\n${items}\n    </ul>\n  </section>`;
    });
  const gallery = `  <p${ownAttrs(site, page)}>${say(t, "az.gallery", { link: "\u0000" }).replace("\u0000", link(`${root}components/`, t("az.gallery-link")))}</p>`;
  return `  <nav class="docs-az__halves" aria-label="${say(t, "az.parts")}"${ownAttrs(site, page)}>\n    <p>${say(t, "az.intro")}</p>\n    <ul${inEnglish}>${halves}</ul>\n  </nav>\n  <nav class="docs-az__letters" aria-label="${say(t, "az.letters")}"${ownAttrs(site, page)}>\n    <ul${inEnglish}>${jump}${other}</ul>\n  </nav>\n${gallery}\n${sections.join("\n")}`;
}

/* ---- Rendering --------------------------------------------------------- */

/**
 * Add aria-current to every link inside a <nav> (or a site links list) whose
 * href is a key of `marks` (Map href → "page" | "true"). The brand link,
 * outside the nav, is not a navigation item. A link that names a language
 * (hreflang: the switcher's, the notice's) is not a link to where you are.
 */
export function markCurrent(html, marks) {
  if (!marks?.size) return html;
  return html.replace(/<(nav|ul)\b[\s\S]*?<\/\1>/g, (list) =>
    list.replace(/<a\b([^>]*?)\shref="([^"]*)"([^>]*)>/g, (whole, before, value, after) =>
      marks.has(value) && !/\saria-current=|\shreflang=/.test(before + after) ? `<a${before} href="${value}"${after} aria-current="${marks.get(value)}">` : whole,
    ),
  );
}

/**
 * Reject markup a fragment or partial must never carry: it would override the
 * page's CSP or base URL, or run a script (SEC-PLG-12, D5). Layouts own them.
 */
export function assertFragmentSafe(html, file) {
  for (const tag of tags(html, file)) {
    if (tag.type !== "start") continue;
    if (tag.name === "script" || tag.name === "base" || (tag.name === "meta" && tag.attrs.has("http-equiv"))) {
      throw new HtmlError(file, tag.line, `<${tag.name}> belongs in a layout, not in a page or partial`);
    }
  }
}

/**
 * Expand includes and placeholders in `template`, in one pass: the text a
 * substitution produces is never scanned again (SEC-PLG-7). The source of an
 * included partial is expanded the same way, up to MAX_INCLUDE_DEPTH, with a
 * cycle check (SEC-PLG-3). An include on a line of its own is indented to
 * that line, so partials are written without a base indentation.
 *
 * ctx: { file, partial(name) → { text, file }, values, current, placeholders,
 * stack, locale (a language of i18n.js, for {{t:…}} and {{html:…}}), used (a
 * Set of the catalog keys used), firstLine (the line of the file `template`
 * starts at) }
 */
export function expand(template, ctx) {
  const stack = ctx.stack ?? [];
  const lineAt = (offset) => (ctx.firstLine ?? 1) + (template.slice(0, offset).match(/\n/g)?.length ?? 0);
  return template.replace(/^([ \t]*)<!-- luz:include ([^\s>]*) -->|<!-- luz:include ([^\s>]*) -->|\{\{([^{}]*)\}\}/gm, (whole, indent, lineName, inlineName, key, offset) => {
    const name = lineName ?? inlineName;
    if (name !== undefined) {
      if (!NAME.test(name)) throw new Error(`${ctx.file}: include name "${name}" is not valid ([a-z0-9-]+)`);
      if (stack.includes(name)) throw new Error(`${ctx.file}: include cycle ${[...stack, name].join(" → ")}`);
      if (stack.length >= MAX_INCLUDE_DEPTH) throw new Error(`${ctx.file}: includes nest deeper than ${MAX_INCLUDE_DEPTH}`);
      const partial = ctx.partial(name);
      let text = expand(partial.text.replace(/\s+$/, ""), { ...ctx, file: partial.file, firstLine: 1, stack: [...stack, name] });
      if (CURRENT_PARTIALS.has(name)) text = markCurrent(text, ctx.current);
      if (indent) text = indent + text.replace(/\n(?=[^\n])/g, `\n${indent}`);
      return text;
    }
    // A string of the catalog: escaped text, or trusted inline HTML
    const string = /^(t|html):(.*)$/.exec(key);
    if (string) {
      const where = `${ctx.file}:${lineAt(offset)}`;
      if (!ctx.locale) {
        if (!ctx.placeholders) return whole;
        throw new Error(`${where}: {{${key}}} needs a language catalog (${I18N_DIR}/locales.json)`);
      }
      const text = lookup(ctx.locale, string[2], where, ctx.used);
      return string[1] === "t" ? escapeHtml(text) : assertInlineHtml(text, `${ctx.locale.file} "${string[2]}"`);
    }
    if (!ctx.placeholders) return whole;
    if (!PLACEHOLDERS.has(key)) throw new Error(`${ctx.file}: unknown placeholder {{${key}}}`);
    if (!(key in ctx.values)) throw new Error(`${ctx.file}: {{${key}}} has no value here`);
    return RAW_VALUES.has(key) ? ctx.values[key] : escapeHtml(ctx.values[key]);
  });
}

/** The partials the docs share with the home page (F2): the header, the site links, the footer. */
export const SHARED_PARTIALS_DIR = "apps/site/_partials";

/**
 * The shared partials folder of a repository, checked: null when there is
 * none; an error when it, or apps/site, is a symlink (SEC-PLG-1/2), or when a
 * name is in it and in apps/docs/_partials as well (one partial, one file).
 */
export function sharedPartials(docsDir, repoRoot) {
  const rel = (p) => relative(repoRoot, p).split(sep).join("/");
  const dir = join(repoRoot, SHARED_PARTIALS_DIR);
  for (const path of [dirname(dir), dir]) {
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (!stat) return null;
    if (stat.isSymbolicLink()) throw new Error(`${rel(path)}: symlinks are not allowed in the docs sources`);
    if (!stat.isDirectory()) throw new Error(`${rel(path)}: not a folder`);
  }
  const names = (folder) =>
    lstatSync(folder, { throwIfNoEntry: false })?.isDirectory() ? readdirSync(folder).filter((n) => n.endsWith(".html")) : [];
  const docsPartials = join(docsDir, "_partials");
  const both = names(dir).filter((n) => names(docsPartials).includes(n));
  if (both.length) {
    throw new Error(both.map((n) => `${rel(join(dir, n))} and ${rel(join(docsPartials, n))}: the partial "${n.slice(0, -5)}" is in both folders; keep one`).join("\n"));
  }
  return dir;
}

/**
 * A reader of partials and layouts (SEC-PLG-1/2/3). Layouts are read inside
 * apps/docs; a partial from apps/docs/_partials, else from apps/site/_partials
 * (the ones the home page shares), never from both. The roots are apps/docs
 * and apps/site/_partials, each refused if it is a symlink, so a read never
 * follows a link out of the repository.
 */
export function sourceReader(site) {
  const rel = (p) => relative(site.repoRoot, p).split(sep).join("/");
  const check = (folder, name) => {
    if (!NAME.test(name)) throw new Error(`"${name}" is not a valid ${folder.slice(1, -1)} name`);
  };
  const layout = (name) => {
    check("_layouts", name);
    const abs = join(site.docsDir, "_layouts", `${name}.html`);
    return { text: readInside(abs, [site.docsDir]), file: rel(abs) };
  };
  // A partial never carries a script, a <base> or a CSP (SEC-PLG-12): refused as it is read, with its file
  const safe = (found) => (assertFragmentSafe(found.text, found.file), found);
  const partial = (name) => safe(find(name));
  const find = (name) => {
    check("_partials", name);
    const own = join(site.docsDir, "_partials", `${name}.html`);
    const shared = sharedPartials(site.docsDir, site.repoRoot);
    if (shared) {
      const abs = join(shared, `${name}.html`);
      if (lstatSync(abs, { throwIfNoEntry: false })) return { text: readInside(abs, [shared]), file: rel(abs) };
    }
    return { text: readInside(own, [site.docsDir]), file: rel(own) };
  };
  return { partial, layout };
}

/** Where an area index wants its generated block (the gallery), when not after the content. */
export const GENERATED_MARKER = "<!-- luz:generated -->";

/**
 * The block a page's `generate` front matter asks for, written after its
 * content, or where the content has GENERATED_MARKER.
 * "snippets" reads the dist/ files of the packages (snippets.js), so a missing
 * file fails the build and only warns in dev (`options.dev`).
 */
function renderGenerated(page, site, options) {
  switch (page.meta.generate) {
    case "gallery":
      return renderGallery(site, page);
    case "a-z":
      return renderAZ(site, page);
    case "snippets":
      return renderSnippets(snippetData({ root: site.repoRoot, readFile: readFileSync, dev: options.dev === true }), tOf(site));
    case "notfound":
      return renderNotFoundLanguages(site);
    default:
      return "";
  }
}

/**
 * The block of the not-found page for each other docs language (D15): a
 * sentence in that language, with its own lang and dir, and a link to the
 * language's docs. The page is one static file for every address.
 */
function renderNotFoundLanguages(site) {
  const docs = site.docsI18n;
  if (!docs?.languages.length) return "";
  site.t.mark("notfound.");
  return docs.languages
    .map(
      (language) =>
        `    <section class="docs-not-found__lang" lang="${escapeHtml(language.code)}" dir="${escapeHtml(language.dir)}">\n` +
        `      <p>${escapeHtml(language.docsStrings["notfound.text"])}</p>\n` +
        `      <p>${link(language.docsRoute, language.docsStrings["notfound.home"], ' class="luz-btn luz-btn--outline"')}</p>\n` +
        "    </section>",
    )
    .join("\n")
    .replace(/^ {4}/, "");
}

/** A class name or a selector of one: letters, digits, `-`, `_` and dots (tests/docs-class-name-wrap.spec.js reads the same). */
const TABLE_NAME = /^[.#]?[A-Za-z][\w-]*(?:\.[A-Za-z][\w-]*)*$/;

/**
 * The names in the tables of "Variants and options" break only at a BEM
 * delimiter, never inside a word or at a single hyphen (F7): from
 * `<h3 id="variants">` to the next `<h2`, a `<code>` of a `<td>` whose text is
 * one name with a `-` or a `_` is written as pieces, cut before each `__` and
 * `--`, with a `<wbr>` between them: `<code class="docs-name"><span>.luz-x</span>
 * <wbr><span>__part</span></code>` (no spaces). apps/docs/reference.css keeps
 * each piece on one line. The text is the same, so a copy or a search sees the
 * name as written; the pages are never edited by hand for it.
 */
export function breakClassNames(html) {
  const start = html.indexOf('<h3 id="variants"');
  if (start === -1) return html;
  const found = html.indexOf("<h2", start);
  const end = found === -1 ? html.length : found;
  const name = (whole, text) => (TABLE_NAME.test(text) && /[-_]/.test(text) ? `<code class="docs-name">${text.split(/(?=__|--)/).map((piece) => `<span>${piece}</span>`).join("<wbr>")}</code>` : whole);
  const section = html.slice(start, end).replace(/<td\b[^>]*>[\s\S]*?<\/td>/g, (cell) => cell.replace(/<code>([^<]*)<\/code>/g, name));
  return html.slice(0, start) + section + html.slice(end);
}

/**
 * The demos of a translated page (`[data-docs-specimen]`, the Do and don't
 * stages and the snippets) are live LUZ markup the translation leaves in
 * English: each container gets `lang="en"`, and `dir="ltr"` in a right-to-left
 * page. A container the translation already gave a `lang` keeps its own, and
 * gets no `dir`. Everything else is left byte for byte.
 */
function markDemos(html, file, dir) {
  let out = "";
  let from = 0;
  for (const tag of tags(html, file)) {
    if (tag.type !== "start" || !isDemo(tag.attrs) || tag.attrs.has("lang")) continue;
    const at = tag.index + 1 + (tag.written ?? tag.name).length;
    out += `${html.slice(from, at)} lang="en"${dir === "rtl" ? ' dir="ltr"' : ""}`;
    from = at;
  }
  return from ? out + html.slice(from) : html;
}

/**
 * Render a page: its layout, with the partials, the generated blocks and the
 * page fragment. `options.root` is the {{root}} value (relative in the pages
 * build, the site's path on the not-found page).
 */
export function renderPage(page, site, options = {}) {
  // The catalog keys this render reads are recorded in the caller's Set (buildSite reports the ones no render read)
  const usage = site.usage;
  const prior = usage?.used;
  if (usage && options.used) usage.used = options.used;
  try {
    return renderPageIn(page, site, options);
  } finally {
    if (usage) usage.used = prior;
  }
}

function renderPageIn(page, site, options) {
  const reader = options.reader ?? sourceReader(site);
  const t = tOf(site);
  // The marks of the links to where you are are the English page's: the partials say /docs/…, the links are put in the language afterwards
  const current = currentOf(englishOf(page).route);
  const locale = site.locale ?? englishLocale(site);
  const strings = { locale, used: options.used };
  const expanded = expand(page.body, { file: page.file, firstLine: page.bodyLine, partial: reader.partial, current, placeholders: false, ...strings });
  // "ai" is written inside the content, at its two markers, so it is known to the table of contents
  const filled = page.meta.generate === "ai" ? fillAiMarkers(expanded, site, { file: page.file }) : expanded;
  // `<!-- luz:generated -->` in the content puts the generated block where it stands, once
  const block = renderGenerated(page, site, options);
  const marked = filled.includes(GENERATED_MARKER);
  // An empty block (the 404 of a site with one language) takes its marker's line with it
  const placed = block ? filled.replace(GENERATED_MARKER, () => block) : filled.replace(/\n?[ \t]*<!-- luz:generated -->/, "");
  const unmarked = breakClassNames(marked ? placed.replaceAll(GENERATED_MARKER, "") : filled);
  // A translated page keeps its demos in English: each says so, and an RTL page keeps them left to right
  const content = site.locale && !page.fallback ? markDemos(unmarked, page.file, site.locale.dir) : unmarked;
  const generated = marked ? "" : block;
  const toc = renderToc(page, `${content}\n${generated}`, t, site);
  const layout = reader.layout(page.meta.layout);
  const notFound = page.route === NOT_FOUND_ROUTE;
  const out = expand(layout.text, {
    file: layout.file,
    partial: reader.partial,
    current,
    placeholders: true,
    ...strings,
    values: {
      ...languageValues(site, locale, { page, siteUrl: options.siteUrl }),
      title: page.meta.title,
      doctitle: docTitleOf(site, page),
      description: page.meta.description,
      root: options.root ?? "/",
      content,
      nav: renderNav(site, page),
      pagehead: renderPageHead(site, page),
      rail: notFound ? "" : renderRail(page, toc, t),
      endnav: renderEndNav(site, page),
      pagefoot: notFound ? "" : renderPageFoot(site, page, { dev: options.dev === true }),
      generated,
      notice: notFound ? "" : renderNotice(site, page),
      contentattrs: page.fallback ? ' lang="en" dir="ltr"' : "",
    },
  });
  // In a language the links the partials and the layout carry (/docs/, the home) go to that language's pages
  return site.locale ? localizeLinks(out, site.locale) : out;
}

/**
 * What a page in a language says before its content when it is not what the
 * reader may think: a page that is not translated yet (English), or a
 * translation no person has reviewed. "" for a reviewed translation. A
 * non-landmark alert, no role: it is there when the page loads. It links the
 * English page; on the accessibility statement it adds that English prevails.
 */
function renderNotice(site, page) {
  if (!site.locale || (!page.fallback && page.reviewed)) return "";
  const t = tOf(site);
  t.mark("notice.");
  const canonical = englishOf(page).route;
  const text = page.fallback
    ? [t("notice.untranslated")]
    : [t("notice.pending"), ...(canonical === `${DOCS_ROUTE}accessibility/` ? [t("notice.pending-statement")] : [])];
  return [
    '<div class="luz-alert luz-alert--info docs-notice">',
    '    <div class="luz-alert__icon" aria-hidden="true">\u2139</div>',
    "    <div>",
    `      <div class="luz-alert__body">${escapeHtml(text.join(" "))} <a href="${escapeHtml(canonical)}" hreflang="en">${say(t, "notice.english")}</a></div>`,
    "    </div>",
    "  </div>",
    "  ",
  ].join("\n");
}

/**
 * The language values of a template: {{lang}}, {{dir}}, {{home}} and, on a
 * home page (`home: true`), {{alternates}}, {{langswitch}} and {{langlinks}}.
 * On a docs `page` (the not-found page apart) {{alternates}} is its canonical
 * link and the alternates of the languages that translated it, and
 * {{langswitch}} the switcher, when the docs have more than one language.
 */
function languageValues(site, locale, { home = false, siteUrl = "", page = null, used = null } = {}) {
  const i18n = site.i18n;
  const translated = home && i18n && locale;
  const values = {
    lang: locale?.code ?? "en",
    dir: locale?.dir ?? "ltr",
    // On a docs page only: the home page's catalogs and tests pin the lists of its dialog as they are
    endir: page && locale?.dir === "rtl" ? ' dir="ltr"' : "",
    home: locale?.route ?? "/",
    alternates: translated ? renderAlternates(i18n, locale, siteUrl) : "",
    langswitch: translated ? renderSwitcher(i18n, locale, lookup(locale, "lang.label", `${I18N_DIR}/${locale.code}.json`, null)) : "",
    langlinks: translated ? renderLangLinks(i18n, locale) : "",
    weights: translated ? renderWeights(site, locale, used ?? site.usage?.used) : "",
    packages: translated ? renderPackages(site, locale, used ?? site.usage?.used) : "",
    checks: translated ? renderChecks(site, locale, used ?? site.usage?.used) : "",
    ...(translated ? levelWeights(site, locale, used ?? site.usage?.used) : {}),
    ...(translated ? levelLists(site, locale, used ?? site.usage?.used) : {}),
  };
  if (page && page.route !== NOT_FOUND_ROUTE) {
    values.alternates = renderDocsAlternates(site, page, siteUrl);
    values.langswitch = renderDocsSwitcher(site, page, locale);
  }
  // A repository without the packages (a fixture) has no {{version}}: a template that uses it fails
  const version = sharedVersion(site.repoRoot);
  if (version) values.version = version;
  return values;
}

/**
 * A row of the home's bar charts: a name, a figure and a bar under them, the
 * bar's length the value against `max` (a native <meter>, hidden from the
 * accessibility tree: the figure is the text). `kind` marks a row: "zero"
 * for a count of none.
 */
function barRow(name, figure, value, max, kind = "") {
  return [
    `  <li class="landing-bar${kind ? ` landing-bar--${kind}` : ""}">`,
    `    <span class="landing-bar__name">${escapeHtml(name)}</span>`,
    `    <span class="landing-bar__figure"><strong>${escapeHtml(figure)}</strong></span>`,
    `    <meter class="luz-meter landing-bar__meter" min="0" max="${max}" value="${value}" aria-hidden="true">${escapeHtml(figure)}</meter>`,
    "  </li>",
  ].join("\n");
}

/**
 * What the home's "Light" card shows about weight, measured when the page is
 * built and never typed: a bar per CSS library (PACKAGES) with the min+gzip
 * size of everything it publishes (every `file` budget of budgets.json under
 * its dist), the longest bar the heaviest package, and under them the sum.
 * Fails when a file is missing: run `pnpm build` first.
 */
function renderWeights(site, locale, used) {
  const file = `${I18N_DIR}/${locale.code}.json`;
  const say = (key) => lookup(locale, key, file, used);
  const budgets = JSON.parse(readFileSync(resolve(site.repoRoot, "budgets.json"), "utf-8")).budgets;
  const number = new Intl.NumberFormat(`${locale.code}-u-nu-latn`, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const kb = (bytes) => `${number.format(bytes / 1024)} ${say("why.weight.unit")}`;
  const packages = PACKAGES.map((name) => {
    const size = budgets
      .filter((b) => b.file?.startsWith(`packages/${name}/dist/`))
      .reduce((sum, b) => {
        const path = resolve(site.repoRoot, b.file);
        if (!existsSync(path)) throw new Error(`${b.file} is missing: run pnpm build before the home page's weights can be read`);
        return sum + gzipSync(readFileSync(path), { level: 9 }).length;
      }, 0);
    return { name, size };
  });
  const total = packages.reduce((sum, p) => sum + p.size, 0);
  const max = Math.max(...packages.map((p) => p.size));
  return [
    '<figure class="landing-chart">',
    `  <ul class="landing-bars" aria-label="${escapeHtml(say("why.weight.list"))}">`,
    ...packages.map((p) => barRow(p.name, kb(p.size), p.size, max)),
    "  </ul>",
    `  <figcaption class="u-text-muted"><strong>${escapeHtml(say("why.weight.total").replace("{total}", kb(total)))}</strong> ${escapeHtml(say("why.weight.caption"))}</figcaption>`,
    "</figure>",
  ].join("\n");
}

/**
 * The kinds of dependency the home's "Zero-dependency" card counts, each with
 * the package names that would be one (lower-case, matched against the start
 * of a dependency's name, or the whole name for a scoped one). The order is
 * the order of the rows; the words come from the catalog (`why.zero.cat.*`).
 */
const ZERO_KINDS = [
  ["css-frameworks", ["bootstrap", "tailwindcss", "bulma", "foundation-sites", "@picocss/", "open-props", "uikit", "materialize-css"]],
  ["css-preprocessors", ["sass", "node-sass", "sass-embedded", "less", "stylus", "postcss"]],
  ["js-frameworks", ["react", "react-dom", "vue", "svelte", "@angular/", "preact", "solid-js", "lit", "alpinejs", "htmx.org", "jquery"]],
  ["highlighters", ["prismjs", "highlight.js", "shiki", "@shikijs/", "codemirror", "monaco-editor"]],
  ["icon-libraries", ["@fortawesome/", "lucide", "@heroicons/", "@tabler/icons", "feather-icons", "@phosphor-icons/", "@mdi/"]],
  ["utilities", ["lodash", "underscore", "moment", "dayjs", "date-fns", "luxon", "axios", "core-js", "@babel/runtime"]],
  ["search-and-motion", ["fuse.js", "lunr", "flexsearch", "minisearch", "gsap", "framer-motion", "animejs", "motion"]],
];

/**
 * What the home's "Zero-dependency" card shows, counted when the page is built
 * and never typed: for each kind of dependency a page usually drags in (CSS
 * frameworks, preprocessors, JS frameworks, highlighters, icon sets, utility
 * libraries, search and motion libraries), how many the CSS libraries
 * (PACKAGES) ask for at run time, in `dependencies` or in `peerDependencies`
 * outside @luz-ds. Every count is read, so the card cannot say zero while a
 * package.json says otherwise; and the build fails outright on any
 * `dependencies` at all, so the claim and the code cannot drift apart.
 */
function renderPackages(site, locale, used) {
  const file = `${I18N_DIR}/${locale.code}.json`;
  const say = (key) => lookup(locale, key, file, used);
  const number = new Intl.NumberFormat(`${locale.code}-u-nu-latn`);
  const runtime = [];
  const withDeps = [];
  for (const name of PACKAGES) {
    const manifest = JSON.parse(readFileSync(resolve(site.repoRoot, "packages", name, "package.json"), "utf-8"));
    const deps = Object.keys(manifest.dependencies ?? {});
    if (deps.length) withDeps.push(`@luz-ds/${name}`);
    runtime.push(...deps, ...Object.keys(manifest.peerDependencies ?? {}).filter((peer) => !peer.startsWith("@luz-ds/")));
  }
  if (withDeps.length) throw new Error(`the home page says "zero dependencies", but ${withDeps.join(", ")} has dependencies in its package.json`);
  const matches = (dep, names) => names.some((n) => (n.endsWith("/") ? dep.toLowerCase().startsWith(n) : dep.toLowerCase() === n));
  const rows = ZERO_KINDS.map(([kind, names]) => ({ name: say(`why.zero.cat.${kind}`), count: runtime.filter((dep) => matches(dep, names)).length }));
  const max = Math.max(1, ...rows.map((r) => r.count));
  return [
    '<figure class="landing-chart">',
    `  <ul class="landing-bars" aria-label="${escapeHtml(say("why.zero.list"))}">`,
    ...rows.map((r) => barRow(r.name, number.format(r.count), r.count, max, r.count ? "" : "zero")),
    "  </ul>",
    `  <figcaption class="u-text-muted"><strong>${escapeHtml(say("why.zero.total").replace("{n}", number.format(runtime.length)))}</strong> ${escapeHtml(say("why.zero.caption"))}</figcaption>`,
    "</figure>",
  ].join("\n");
}

/**
 * What the home's "Usable" card shows, counted when the page is built and
 * never typed: seven shares, each a measure of the repository as it is. The
 * components are the pages of apps/docs/pages/components whose `files` is a
 * stylesheet of components/ (not a `_` file); the tests are tests/*.spec.js
 * and *.test.js; the colour pairs are what scripts/check-contrast.js
 * measures (it fails the build when one does not meet its ratio, so the
 * first share is whole or the page does not build). The words come from
 * the catalog (`why.usable.m.*`).
 */
const contrastPairs = new Map();

function renderChecks(site, locale, used) {
  const file = `${I18N_DIR}/${locale.code}.json`;
  const say = (key) => lookup(locale, key, file, used);
  const number = new Intl.NumberFormat(`${locale.code}-u-nu-latn`);
  const percent = new Intl.NumberFormat(`${locale.code}-u-nu-latn`, { style: "percent", maximumFractionDigits: 0 });
  const root = site.repoRoot;
  // The components, from their docs pages
  const pagesDir = resolve(root, "apps/docs/pages/components");
  const components = readdirSync(pagesDir)
    .filter((name) => name.endsWith(".html"))
    .map((name) => ({ route: `/docs/components/${name.slice(0, -5)}/`, source: readFileSync(resolve(pagesDir, name), "utf-8") }))
    .filter((page) => /^files: components\/[a-z0-9-]+\.css$/m.test(page.source));
  if (!components.length) throw new Error("apps/docs/pages/components has no component pages to count the home page's shares from");
  // The pages the right-to-left test skips, from its own source
  const rtlSpec = readFileSync(resolve(root, "tests/rtl.spec.js"), "utf-8");
  const skipped = new Set([...(rtlSpec.match(/SKIP_PAGES = new Set\(\[([^\]]*)\]\)/)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]));
  // The component stylesheets
  const cssDir = resolve(root, "packages/core/src/components");
  const stylesheets = readdirSync(cssDir)
    .filter((name) => name.endsWith(".css") && name !== "index.css" && !name.startsWith("_"))
    .map((name) => readFileSync(resolve(cssDir, name), "utf-8"));
  // The tests
  const testsDir = resolve(root, "tests");
  const tests = readdirSync(testsDir)
    .filter((name) => /\.(spec|test)\.js$/.test(name))
    .map((name) => readFileSync(resolve(testsDir, name), "utf-8"));
  // The colour pairs, measured by the script (once per build)
  if (!contrastPairs.has(root)) {
    const out = execFileSync(process.execPath, [resolve(root, "scripts/check-contrast.js")], { encoding: "utf-8" });
    const pairs = Number(out.match(/(\d+) token pairs/)?.[1]);
    if (!pairs) throw new Error("scripts/check-contrast.js did not say how many token pairs it measured");
    contrastPairs.set(root, pairs);
  }
  const pairs = contrastPairs.get(root);
  const share = (part, whole) => ({ part, whole, pct: Math.round((100 * part) / whole) });
  const rows = [
    ["contrast", share(pairs, pairs)],
    ["rtl", share(components.filter((p) => p.source.includes("data-docs-specimen") && !skipped.has(p.route)).length, components.length)],
    ["no-js", share(components.filter((p) => !/^module: /m.test(p.source)).length, components.length)],
    ["focus", share(stylesheets.filter((css) => css.includes(":focus-visible")).length, stylesheets.length)],
    ["forced", share(stylesheets.filter((css) => css.includes("forced-colors")).length, stylesheets.length)],
    ["issues", share(components.filter((p) => p.source.includes("None known")).length, components.length)],
    ["tests", share(tests.filter((src) => /javaScriptEnabled: false|chromium-nojs|nojs/.test(src)).length, tests.length)],
  ];
  const total = say("why.usable.total")
    .replace("{components}", number.format(components.length))
    .replace("{tests}", number.format(tests.length))
    .replace("{pairs}", number.format(pairs));
  return [
    '<figure class="landing-chart">',
    `  <ul class="landing-bars" aria-label="${escapeHtml(say("why.usable.list"))}">`,
    ...rows.map(([kind, s]) => barRow(say(`why.usable.m.${kind}`), percent.format(s.pct / 100), s.pct, 100)),
    "  </ul>",
    `  <figcaption class="u-text-muted"><strong>${escapeHtml(total)}</strong> ${escapeHtml(say("why.usable.caption"))}</figcaption>`,
    "</figure>",
  ].join("\n");
}

/**
 * The names each of the home's levels brings, read from the packages when
 * the page is built and never typed, as {{list1}}…{{list3}}: tags under a
 * heading with their count, each a link to where the documentation
 * explains it. Level 1 (tokens): the groups of the custom properties
 * luz-tokens.css defines, with their counts; level 2 (core): its components (the stylesheets of
 * src/components, not `_` files) and its layout objects (the `.o-*` blocks
 * of _objects.css); level 3 (site): its components (the same, in
 * packages/site/src/components). The headings come from the catalog
 * (`inside.list.*`).
 */
function levelLists(site, locale, used) {
  const file = `${I18N_DIR}/${locale.code}.json`;
  const say = (key) => lookup(locale, key, file, used);
  const root = site.repoRoot;
  const read = (path) => readFileSync(resolve(root, path), "utf-8");
  const sheets = (dir) =>
    readdirSync(resolve(root, dir))
      .filter((name) => name.endsWith(".css") && name !== "index.css" && !name.startsWith("_"))
      .map((name) => name.slice(0, -4));
  const pages = "apps/docs/pages";
  const ids = (path) => new Set([...read(`${pages}/${path}`).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  // The token groups read the families of colour, the rows of the colour page and the scales
  const tokenJson = JSON.parse(read("packages/tokens/tokens.json"));
  const families = new Set(Object.keys(tokenJson.color));
  const colorIds = ids("tokens/color.html");
  const SCALES = [
    [/^--luz-(space|control)-/, "spacing"],
    [/^--luz-(font|type)-|^--luz-text-(xs|sm|base|md|lg|body|[0-9]*xl)$/, "typography"],
    [/^--luz-radius-/, "radius"],
    [/^--luz-shadow-/, "shadows"],
    [/^--luz-(duration|easing)-/, "motion"],
    [/^--luz-mq-/, "breakpoints"],
  ];
  // A component: the page whose front matter names its stylesheet
  const pageOf = (dir, area) => {
    const map = new Map();
    for (const name of readdirSync(resolve(root, pages, dir)).filter((n) => n.endsWith(".html"))) {
      for (const m of read(`${pages}/${dir}/${name}`).matchAll(/components\/([a-z0-9-]+)\.css/g)) {
        if (!map.has(m[1])) map.set(m[1], `/docs/${area}/${name.slice(0, -5)}/`);
      }
    }
    return map;
  };
  const coreHref = pageOf("components", "components");
  const siteHref = pageOf("site", "site");
  const layoutIds = ids("components/layout.html");
  const objectHref = (name) => `/docs/components/layout/#${layoutIds.has(`objects-${name.slice(2)}`) ? `objects-${name.slice(2)}` : "objects-reference"}`;
  const tokens = [...new Set([...read("packages/tokens/dist/luz-tokens.css").matchAll(/^\s*(--luz-[\w-]+):/gm)].map((m) => m[1]))];
  const objects = [...new Set([...read("packages/core/src/objects/_objects.css").matchAll(/^\s*\.(o-[a-z]+)\b/gm)].map((m) => m[1]))];
  // Masonry (landing.css): each name a tile whose height grows with the
  // weight of what it ships (its stylesheet's bytes, or its share of a
  // shared one), as --share, from 0 to 1 against the heaviest of its list
  const shareOf = (weights) => (i) => (weights[i] / Math.max(...weights)).toFixed(3);
  const list = (heading, names, href, weight) => {
    const share = shareOf(names.map(weight));
    return [
      `<div class="landing-names" style="--n:${names.length}">`,
      `  <h3 class="landing-names__title">${escapeHtml(say(heading))} <span class="landing-names__n">${names.length}</span></h3>`,
      `  <ul class="landing-names__list landing-names__list--map" dir="ltr">${names.map((n, i) => `<li style="--share:${share(i)}"><a href="${escapeHtml(href(n))}">${escapeHtml(n)}</a></li>`).join("")}</ul>`,
      "</div>",
    ].join("\n");
  };
  // The weight of a stylesheet of a package: its bytes in dist (1 if it is not built)
  const sheetBytes = (pkg) => (name) => {
    const file = resolve(root, `packages/${pkg}/dist/components/${name}.min.css`);
    return existsSync(file) ? statSync(file).size : 1;
  };
  // An object has no file of its own: its weight is how many rules of _objects.css name it
  const objectsCss = read("packages/core/src/objects/_objects.css");
  const objectWeight = (name) => (objectsCss.match(new RegExp(`\\.${name}(?![\\w-])`, "g")) ?? []).length || 1;
  const component = (map, area) => (name) => map.get(name) ?? `/docs/${area}/`;
  // The tokens by group, one tag each (its name and how many tokens it has),
  // to the page of the documentation that explains the group: the primitive
  // colours (a family of tokens.json), the semantic colours (a row of the
  // colour page), then each scale. A token in no group is counted nowhere,
  // so the build fails rather than drop it silently
  const GROUPS = [
    ["inside.list.primitives", "/docs/tokens/palette/", (n) => families.has(n.slice(2).split("-")[1])],
    ["inside.list.semantic", "/docs/tokens/color/", (n) => colorIds.has(n.slice(2))],
    ["inside.list.spacing", "/docs/tokens/spacing/", (n) => SCALES[0][0].test(n)],
    ["inside.list.typography", "/docs/tokens/typography/", (n) => SCALES[1][0].test(n)],
    ["inside.list.radius", "/docs/tokens/radius/", (n) => SCALES[2][0].test(n)],
    ["inside.list.shadows", "/docs/tokens/shadows/", (n) => SCALES[3][0].test(n)],
    ["inside.list.motion", "/docs/tokens/motion/", (n) => SCALES[4][0].test(n)],
    ["inside.list.breakpoints", "/docs/tokens/layout/", (n) => SCALES[5][0].test(n)],
  ];
  const lost = tokens.filter((name) => !GROUPS.some(([, , test]) => test(name)));
  if (lost.length) throw new Error(`the home page's list of tokens has no group for ${lost.join(", ")}: add one to GROUPS in scripts/docs-site/site.js`);
  // Each group a tile of the masonry (landing.css), as tall as its count
  // against the largest group's
  const counts = GROUPS.map(([, , test]) => tokens.filter(test).length);
  const share = shareOf(counts);
  const tags = GROUPS.map(([key, href], i) => {
    return `<li style="--share:${share(i)}"><a href="${href}">${escapeHtml(say(key))} <span class="landing-names__n">${counts[i]}</span></a></li>`;
  });
  return {
    list1: [
      `<div class="landing-names" style="--n:${GROUPS.length}">`,
      `  <h3 class="landing-names__title">${escapeHtml(say("inside.list.tokens"))} <span class="landing-names__n">${tokens.length}</span></h3>`,
      `  <ul class="landing-names__list landing-names__list--groups">${tags.join("")}</ul>`,
      "</div>",
    ].join("\n"),
    list2: [list("inside.list.components", sheets("packages/core/src/components"), component(coreHref, "components"), sheetBytes("core")), list("inside.list.objects", objects, objectHref, objectWeight)].join("\n"),
    list3: list("inside.list.site", sheets("packages/site/src/components"), component(siteHref, "site"), sheetBytes("site")),
  };
}

/**
 * The weights of the home's "Inside" levels, measured when the page is built
 * and never typed: the min+gzip size of the budgeted files of each package
 * in dist, summed level by level (tokens; + core; + site), and for the fourth
 * level the third plus the heaviest package for one kind of site, said as
 * "up to". Returned as {{weight1}}…{{weight4}}, in the language's number
 * format. Fails when a file is missing: run `pnpm build`.
 */
function levelWeights(site, locale, used) {
  const file = `${I18N_DIR}/${locale.code}.json`;
  const say = (key) => lookup(locale, key, file, used);
  const budgets = JSON.parse(readFileSync(resolve(site.repoRoot, "budgets.json"), "utf-8")).budgets;
  const number = new Intl.NumberFormat(`${locale.code}-u-nu-latn`, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const kb = (bytes) => `${number.format(bytes / 1024)} ${say("why.weight.unit")}`;
  const weigh = (name) =>
    budgets
      .filter((b) => b.file?.startsWith(`packages/${name}/dist/`))
      .reduce((sum, b) => {
        const path = resolve(site.repoRoot, b.file);
        if (!existsSync(path)) throw new Error(`${b.file} is missing: run pnpm build before the home page's levels can be read`);
        return sum + gzipSync(readFileSync(path), { level: 9 }).length;
      }, 0);
  const one = weigh("tokens");
  const two = one + weigh("core");
  const three = two + weigh("site");
  const four = three + Math.max(...SITE_KINDS.map(weigh));
  return { weight1: kb(one), weight2: kb(two), weight3: kb(three), weight4: say("inside.upto").replace("{total}", kb(four)) };
}

/**
 * The <head> links of a docs page: its canonical URL and the languages it is
 * in. A translation lists the English page, every language that translated
 * the page and x-default (English); the English page of a translated page lists
 * the same set, so each member lists every member. A page with no translation
 * has only its canonical link, and a page that is not translated yet (English
 * in a language's chrome) points its canonical link at the English page.
 */
function renderDocsAlternates(site, page, siteUrl) {
  const docs = site.docsI18n;
  const english = englishOf(page).route;
  if (!docs || page.fallback) return renderPageLinks(english, [], siteUrl);
  const translators = docs.languages.filter((l) => l.pages.has(english));
  if (!translators.length) return renderPageLinks(page.route, [], siteUrl);
  const defaultCode = site.i18n.default.code;
  const set = site.i18n.locales
    .filter((l) => l.code === defaultCode || translators.some((x) => x.code === l.code))
    .map((l) => [l.code, l.code === defaultCode ? english : docs.byCode.get(l.code).docsRoute + english.slice(DOCS_ROUTE.length)]);
  return renderPageLinks(page.route, [...set, ["x-default", english]], siteUrl);
}

/**
 * The language switcher of a docs page: the same page in each language of the
 * docs (English first, then the languages of the registry that have a folder),
 * the page's language marked, hreflang only on the pages that are translated
 * (and on English). "" when the docs have one language.
 */
function renderDocsSwitcher(site, page, locale) {
  const docs = site.docsI18n;
  if (!docs?.languages.length || !site.i18n) return "";
  const i18n = site.i18n;
  const english = englishOf(page).route;
  const locales = i18n.locales.filter((l) => l === i18n.default || docs.byCode.has(l.code));
  const label = lookup(locale, "lang.label", `${I18N_DIR}/${locale.code}.json`, site.usage?.used);
  return renderSwitcher(i18n, locale, label, {
    locales,
    hrefOf: (l) => (l === i18n.default ? english : docs.byCode.get(l.code).docsRoute + english.slice(DOCS_ROUTE.length)),
    hreflangOf: (l) => (l === i18n.default ? l.code : docs.byCode.get(l.code).pages.has(english) ? l.code : null),
  });
}

/** The version of packages/core/package.json (tokens, core and site share it), or null. */
function sharedVersion(repoRoot) {
  const manifest = join(repoRoot ?? "", "packages/core/package.json");
  if (!repoRoot || !existsSync(manifest)) return null;
  const { version } = JSON.parse(readFileSync(manifest, "utf-8"));
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version)) throw new Error(`packages/core/package.json: "version" is not a version`);
  return version;
}

/**
 * Render a full document that is not a page (the landing): includes, the
 * language values and the strings of `options.locale` (a language of
 * site.i18n; the default one when not given). Links to the documentation
 * from a page in another language say hreflang="en". `options.siteUrl`
 * (the pages build) makes the canonical and alternate URLs absolute.
 */
export function renderDocument(html, file, route, site, options = {}) {
  const reader = options.reader ?? sourceReader(site);
  const locale = options.locale ?? site.i18n?.default;
  // The switcher's label is a catalog key like any other
  if (site.i18n && locale) options.used?.add("lang.label");
  // The template's indentation is for the author; the page ships without it
  const out = compactHtml(expand(html, {
    file,
    partial: reader.partial,
    current: currentOf(route, homesOf(site)),
    placeholders: true,
    locale,
    used: options.used,
    values: languageValues(site, locale, { home: true, siteUrl: options.siteUrl, used: options.used }),
  }));
  if (!locale || !site.i18n || locale === site.i18n.default) return out;
  // A language that has docs links to them (apps/docs/i18n/<code>/); one that has not, to the English ones, and says so
  return site.docsI18n?.byCode.has(locale.code) ? localizeDocsLinks(out, locale.code) : markDocsLinks(out, DOCS_ROUTE, site.i18n.default.code);
}

/**
 * The home page in every language of the registry, as `extra` documents of
 * buildSite(): [{ route, file, html, locale }]; one, at "/", without one.
 */
export function landingDocuments(site, file, html) {
  if (!site.i18n) return [{ route: "/", file, html }];
  return site.i18n.locales.map((locale) => ({ route: locale.route, file, html, locale }));
}

/**
 * Pages build: make every root-absolute link to a known route relative to
 * `route`, so the site works under any sub-path (https://<user>.github.io/<repo>/).
 * `href="/docs/#x"` on /docs/a/ becomes `href="../../docs/#x"`. On the
 * not-found page `root` is the site's path: "/docs/" becomes "/luz/docs/".
 */
export function relativizeLinks(html, route, routes, root = rootOf(route)) {
  return html
    .replace(/href="\/([^"#?]*)(#[^"]*)?"/g, (whole, path, hash = "") =>
      routes.has(`/${path}`) ? `href="${root}${path}${hash}"` : whole,
    )
    .replace(/data-luz-search-src="\/((?:[a-z]{2,3}(?:-[a-z0-9]+)*\/)?docs\/search-index\.json)"/g, (whole, path) => `data-luz-search-src="${root}${path}"`);
}

/* ---- Checking ---------------------------------------------------------- */

const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/**
 * Check the internal links of rendered documents.
 * docs:  [{ route, ids: Set, links: [{ href, file, line }] }]
 * known: Map route → Set of ids (or null when its ids are not checked)
 * Returns a list of problems, each "file:line: message". Rules: a link to
 * "#x" needs an element with that id on the same page; a root-absolute link
 * to a page needs a known route, with its trailing slash, and its #fragment
 * must exist on that page. Links to files (with an extension) are assets.
 */
export function checkLinks(docs, known) {
  const problems = [];
  for (const doc of docs) {
    for (const { href, file, line } of doc.links) {
      const where = `${file}:${line}`;
      if (href.startsWith("#")) {
        if (href.length > 1 && !doc.ids.has(decode(href.slice(1)))) problems.push(`${where}: ${href} is not an id on ${doc.route}`);
        continue;
      }
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const [beforeHash, hash = ""] = href.split(/#(.*)/s);
      const path = beforeHash.split("?")[0];
      if (/\.[a-z0-9]+$/i.test(path)) continue;
      if (!known.has(path)) {
        problems.push(known.has(`${path}/`) ? `${where}: ${href} needs a trailing slash (${path}/)` : `${where}: ${href} is not a page of the site`);
        continue;
      }
      const ids = known.get(path);
      if (hash && ids && !ids.has(decode(hash))) problems.push(`${where}: ${href}: #${hash} is not an id on ${path}`);
    }
  }
  return problems;
}

/** Read a source fragment with its real line numbers (offset by `firstLine`). */
function readSourceHtml(text, file, firstLine = 1) {
  return readHtml("\n".repeat(firstLine - 1) + text, file);
}

/**
 * Render and check the whole site: the nesting of every source, the fragments'
 * safety, duplicate ids on each rendered page, and every internal link
 * (the generated ones too: sidebar, breadcrumb, end of page, galleries, A–Z).
 * `extra` are full documents outside apps/docs/pages (the landing, once per
 * language: landingDocuments()): [{ route, file, html, locale? }].
 * `unchecked` are routes known to exist whose ids are not checked.
 * `languages: true` renders the pages of every docs language too
 * (/es/docs/…, with the English page where a page is not translated), and
 * then a key of apps/docs/i18n/en/strings.json that no render used is a
 * problem. When the landing is rendered in every language, a catalog key that
 * no template used is a problem too.
 * Returns { rendered: Map route → html, problems: [string] }. Throws on a
 * malformed source and on a missing catalog key (never a warning).
 */
export function buildSite(site, { extra = [], unchecked = [], root, languages = false, siteUrl } = {}) {
  const reader = sourceReader(site);
  const used = new Set();
  const sourceLinks = (text, file, firstLine, fragment) => {
    if (fragment) assertFragmentSafe(text, file);
    return readSourceHtml(text, file, firstLine).links.map((l) => ({ ...l, file }));
  };
  // Links of every partial a source includes, at any depth; each partial is
  // checked once. Called after rendering, which already refused include cycles.
  const partials = new Map();
  const partialLinks = (html) =>
    [...html.matchAll(/<!-- luz:include ([a-z0-9-]+) -->/g)].flatMap(([, name]) => {
      if (!partials.has(name)) {
        const partial = reader.partial(name);
        partials.set(name, [...sourceLinks(partial.text, partial.file, 1, true), ...partialLinks(partial.text)]);
      }
      return partials.get(name);
    });

  const rendered = new Map();
  const docs = [];
  const add = (page, view, options = {}) => {
    const html = renderPage(page, view, { reader, root, used, siteUrl, ...options });
    const layout = reader.layout(page.meta.layout);
    const { ids, links: renderedLinks } = readHtml(html, `${page.file} (rendered as ${page.route})`);
    // Links the generator wrote (sidebar, breadcrumb, end of page, galleries, A–Z)
    const sourceHrefs = new Set();
    const links = [
      ...sourceLinks(page.body, page.file, page.bodyLine, true),
      ...partialLinks(page.body),
      ...sourceLinks(layout.text, layout.file, 1, false),
      ...partialLinks(layout.text),
    ];
    for (const l of links) sourceHrefs.add(l.href);
    for (const l of renderedLinks) if (!sourceHrefs.has(l.href)) links.push({ ...l, file: `${page.file} (generated)`, line: 1 });
    rendered.set(page.route, html);
    docs.push({ route: page.route, ids: new Set(ids.keys()), links });
  };
  for (const page of site.notFound ? [...site.pages, site.notFound] : site.pages) add(page, site);
  const docsI18n = site.docsI18n;
  const wanted = languages ? docsI18n?.languages ?? [] : [];
  for (const language of wanted) {
    const view = localize(site, language);
    for (const page of view.pages) add(page, view);
  }
  for (const doc of extra) {
    const html = renderDocument(doc.html, doc.file, doc.route, site, { reader, locale: doc.locale, used });
    const links = [...sourceLinks(doc.html, doc.file, 1, false), ...partialLinks(doc.html)];
    const { ids, links: renderedLinks } = readHtml(html, `${doc.file} (rendered as ${doc.route})`);
    // Links written by the generator or a catalog: the language's home, the switcher, links inside a string
    const sourceHrefs = new Set(links.map((l) => l.href));
    for (const l of renderedLinks) if (!sourceHrefs.has(l.href)) links.push({ ...l, file: `${doc.file} (rendered as ${doc.route})`, line: l.line });
    rendered.set(doc.route, html);
    docs.push({ route: doc.route, ids: new Set(ids.keys()), links });
  }

  // The home pages (/, /es/, /ar/) are not docs: a link to one is not checked
  const known = new Map([...docs.map((d) => [d.route, d.ids]), ...[...homesOf(site), ...unchecked].map((route) => [route, null])]);
  // The pages of the docs languages exist even when this build does not render them (a link to one is not a mistake)
  if (!languages) {
    for (const language of docsI18n?.languages ?? []) {
      for (const page of site.pages) known.set(language.docsRoute + page.route.slice(DOCS_ROUTE.length), null);
    }
  }
  const seen = new Set();
  const problems = checkLinks(docs, known).filter((p) => !seen.has(p) && seen.add(p));
  // Every key is used somewhere, once the home page has been rendered in every language
  const everyLanguage = site.i18n && site.i18n.locales.every((l) => extra.some((d) => d.locale === l));
  if (everyLanguage) problems.push(...unusedKeys(site.i18n, used));
  // ... and the docs' own, once every language has been rendered (with no language, the notices and the rail have no render)
  if (languages && docsI18n?.languages.length) {
    // What only some pages need is not "unused" when the site has no such page: the labels of a kind and an
    // entry, the chips, a files line, the notices, and the strings of a generated page the site does not have
    const generates = new Set(site.pages.map((p) => p.meta.generate));
    const conditional = (key) =>
      ["kind.", "index.", "chip.", "notice.", "page.files", "az.rest"].some((prefix) => key.startsWith(prefix)) ||
      (key.startsWith("snippets.") && !generates.has("snippets")) ||
      (key.startsWith("ai.") && !generates.has("ai")) ||
      (key.startsWith("az.") && !generates.has("a-z")) ||
      (key.startsWith("notfound.") && !site.notFound);
    for (const key of Object.keys(docsI18n.reference.strings)) if (conditional(key)) used.add(key);
    problems.push(...unusedKeys({ default: docsI18n.reference }, used));
  }
  return { rendered, problems };
}
