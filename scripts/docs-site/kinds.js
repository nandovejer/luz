/**
 * LUZ docs site: the patterns of each kind of site, from the pages of catalog
 * (plan ai-and-catalog-only, decisions 51 to 55, 71 and 72).
 *
 * A pattern of a kind of site is a catalog component like any other: one
 * stylesheet, `packages/catalog/src/components/<block>.css`, and one page,
 * `apps/docs/pages/catalog/<block>.html`, which says for which kinds of site
 * it fits best in `fits-kinds` (`landing`, `blog`, `app`, `docs`, or `any`).
 * Nothing here lists a pattern by hand: the files and the pages of a kind are
 * the ones whose page names it (or `any`). Only the ORDER of the cascade is
 * written, in CASCADE, because it is the one thing a page does not say.
 * Used by the snippets (the "Choose your snippet" page) and by the prompts for
 * AI, which write one `<link>` per file.
 *
 *   FITS_KINDS, fitsKindsOf(value)   the kinds a catalog page says it fits best (`fits-kinds`)
 *   catalogPatterns(root)            the pages of catalog that have `fits-kinds`:
 *                                    { slug, kinds, files, order, file }
 *   kindPatterns(kind, root, components)   { files, pages } of a kind, files in cascade order
 *   fileKinds(root), isKindFile(file, fileKinds(root))   is it the file of a page that fits some kinds, not `any`?
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CATALOG_PAGES = "apps/docs/pages/catalog";

/**
 * The order the files of the patterns are linked in: the pieces a pattern
 * refines come before it (the navbar and the sidebar before the headers and
 * the layout), the header before the body, and hero before section (section
 * shares the hero's head rules and sets its own after them).
 */
export const CASCADE = [
  "navbar", "sidebar", "terminal", "timeline",
  "site-header", "masthead", "hero", "main", "section", "stat", "site-footer", "glow",
  "page-header", "article-header", "article",
  "app-bar", "dashboard",
  "docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer",
];

/**
 * The kinds of site a catalog page may name in `fits-kinds` (decision 71), as
 * the reader says them: a blog, not cms. `any` is the other value, and stands
 * alone. The ids of the prompts and of /docs/kinds/<kind>/ are these.
 */
export const FITS_KINDS = ["landing", "blog", "app", "docs"];

/**
 * The list a `fits-kinds` line says: ["any"] or kinds of FITS_KINDS, each once.
 * Throws a message (without file:line: the caller adds it) on anything else.
 */
export function fitsKindsOf(value) {
  const kinds = value.split(",").map((k) => k.trim());
  const bad = kinds.find((k) => k !== "any" && !FITS_KINDS.includes(k));
  if (!value.trim() || bad !== undefined) {
    throw new Error(`fits-kinds "${value}" is not a list of kinds (${FITS_KINDS.join(", ")}), or "any" alone`);
  }
  if (new Set(kinds).size !== kinds.length) throw new Error(`fits-kinds "${value}" names a kind twice`);
  if (kinds.includes("any") && kinds.length > 1) throw new Error(`fits-kinds "${value}": "any" stands alone`);
  return kinds;
}

/**
 * The catalog pages by what they document: { slug, kinds (fits-kinds), files
 * (every entry of `files:`), order, file } for each page of
 * apps/docs/pages/catalog/ that has `fits-kinds`, in the order of the pages.
 */
export function catalogPatterns(root) {
  const pages = [];
  for (const name of readdirSync(join(root, CATALOG_PAGES)).filter((f) => f.endsWith(".html") && !f.startsWith("_"))) {
    const head = /^<!-- luz:page\n([\s\S]*?)\n-->/.exec(readFileSync(join(root, CATALOG_PAGES, name), "utf-8"))?.[1] ?? "";
    const key = (k) => new RegExp(`^${k}: (.*)$`, "m").exec(head)?.[1].trim();
    if (!key("fits-kinds")) continue;
    const files = (key("files") ?? "").split(/[;,]/).map((f) => f.trim());
    pages.push({ slug: name.slice(0, -5), kinds: fitsKindsOf(key("fits-kinds")), files, order: Number(key("order") ?? 0), file: `${CATALOG_PAGES}/${name}` });
  }
  return pages.sort((a, b) => a.order - b.order);
}

const FILE = /^components\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.min)?\.css$/;
const stylesheetsOf = (page) => page.files.filter((f) => FILE.test(f));

/** `components/x.css` → the kinds its page names (["any"] included), for every stylesheet some page documents. */
export function fileKinds(root) {
  const map = new Map();
  for (const page of catalogPatterns(root)) for (const file of stylesheetsOf(page)) map.set(file, page.kinds);
  return map;
}

/**
 * The pieces whose page says they fit some kinds best, and that a site of any
 * kind may use all the same: they count with the base (the weight and the
 * lists of the home, the classes of the general prompt), not as patterns.
 */
const BASE_PIECES = new Set(["components/sidebar.css", "components/terminal.css", "components/timeline.css"]);

/**
 * Is `file` (or its `.min.css`) the stylesheet of a pattern of a kind of site:
 * a page that fits some kinds, not `any`, and not one of BASE_PIECES? `kinds`
 * is fileKinds(root).
 */
export const isKindFile = (file, kinds) => {
  const css = file.replace(/\.min\.css$/, ".css");
  const named = kinds.get(css);
  return named !== undefined && !named.includes("any") && !BASE_PIECES.has(css);
};

/** The kinds whose header holds `.luz-nav-toggle`, which sidebar.css defines: they link that file though their pages do not list it. */
const NAV_TOGGLE_KINDS = ["landing", "blog"];

/**
 * The patterns of one kind: the pages that name it, or `any`, and their
 * stylesheets (`components/<name>.css`) in the order of CASCADE; `pages` are the
 * slugs of those that name the kind, in the order of the docs. `components`
 * is catalogComponents()'s list (null before the first build: no check): throws
 * when a page's stylesheet is not built, or is not in CASCADE.
 */
export function kindPatterns(kind, root, components) {
  if (!FITS_KINDS.includes(kind)) throw new Error(`${kind} is not a kind of site with patterns (${FITS_KINDS.join(", ")})`);
  const pages = catalogPatterns(root).filter((p) => p.kinds.includes(kind) || p.kinds.includes("any"));
  const built = new Set((components ?? []).map(({ file }) => file));
  // The nav toggle of the site header and of the masthead (landing, blog) is defined in the sidebar's file
  const files = [...new Set([...pages.flatMap(stylesheetsOf), ...(NAV_TOGGLE_KINDS.includes(kind) ? ["components/sidebar.css"] : [])])];
  const missing = components ? files.filter((file) => !built.has(file)) : [];
  if (missing.length) throw new Error(`scripts/docs-site/kinds.js: a page of catalog lists ${missing.join(", ")}, which packages/catalog/dist does not have`);
  const unordered = files.filter((file) => !CASCADE.includes(file.replace(/^components\/|\.css$/g, "")));
  if (unordered.length) throw new Error(`scripts/docs-site/kinds.js: add ${unordered.map((f) => f.replace(/^components\/|\.css$/g, "")).join(", ")} to CASCADE (the order the files of the patterns are linked in)`);
  files.sort((a, b) => CASCADE.indexOf(a.replace(/^components\/|\.css$/g, "")) - CASCADE.indexOf(b.replace(/^components\/|\.css$/g, "")));
  // The pages that name the kind: the ones of `any` (the search, the navbar…) are catalog's general pieces, which a prompt already lists by their classes and elements
  return { files, pages: pages.filter((p) => p.kinds.includes(kind)).map((p) => p.slug) };
}
