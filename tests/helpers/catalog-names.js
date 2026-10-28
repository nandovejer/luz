/**
 * The names of @luz-ds/catalog after F8 of .claude/plans/ai-and-catalog-only.md (decisions 65 to 69, the table
 * of decision 66, and the tables of .changeset/catalog-names.md). Typed once, by hand, because they are the
 * spec: the tests compare the packages, the docs, `luz-check` and the changeset with this list, never the
 * other way round.
 *
 *   PATTERNS      the 20 stylesheets of the patterns of a kind of site, `components/<block>.css`
 *   ELEMENTS      the seven elements, with their stylesheet and, if they have one, their chunk
 *   LAYOUT        the four that came from core in F7 (unchanged by F8)
 *   CLASSES       old class -> new class, row by row of table 1 of the changeset
 *   TAGS          old element -> new element
 *   FILES         old component file -> new file, as the changeset's table 3 names them
 *   CHUNKS        old chunk -> new chunk (and the export that follows it)
 *   PROPERTIES    old custom property -> new
 *   OLD_PAGES     the slugs of /docs/catalog/<slug>/ that are not pages any more
 *   KEPT          what does not change, and a test must not take for old
 */

/** The 20 patterns, in the order of the cascade (CASCADE of scripts/docs-site/kinds.js, without the four of F7). */
export const PATTERNS = ["site-header", "masthead", "hero", "main", "section", "stat", "site-footer", "glow", "page-header", "article-header", "article", "app-bar", "dashboard", "docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"];

/** The four of F7 (core to catalog), whose names F8 keeps. */
export const LAYOUT = ["navbar", "sidebar", "terminal", "timeline"];

/** The seven elements: tag (or class) of each, its stylesheet and its chunk. */
export const ELEMENTS = [
  { name: "search", tag: "luz-search", css: "search", chunk: "search" },
  { name: "cookie-consent", tag: "luz-cookie-consent", css: "cookie-consent", chunk: "cookie-consent" },
  { name: "color-mode", tag: "luz-color-mode", css: "color-mode", chunk: "color-mode" },
  { name: "lang-switch", tag: "luz-lang-switch", css: "lang-switch", chunk: null },
  { name: "submenu", tag: "luz-submenu", css: "submenu", chunk: null },
  { name: "announcement", tag: "luz-announcement", css: "announcement", chunk: null },
  { name: "faq", tag: "luz-faq", css: "faq", chunk: null },
];

/** Table 1 of the changeset: [old class, new class, the old class is `--publication` of the new one]. A part and a modifier keep their name. */
export const CLASSES = [
  ["luz-landing-hero", "luz-hero"],
  ["luz-landing-section", "luz-section"],
  ["luz-landing-stat", "luz-stat"],
  ["luz-landing-glow", "luz-glow"],
  ["luz-landing-main", "luz-main"],
  ["luz-landing-header", "luz-site-header"],
  ["luz-cms-header", "luz-site-header", "publication"],
  ["luz-cms-header--masthead", "luz-masthead"],
  ["luz-landing-footer", "luz-site-footer"],
  ["luz-cms-footer", "luz-site-footer"],
  ["luz-app-header", "luz-app-bar"],
  ["luz-app-dashboard", "luz-dashboard"],
  ["luz-cms-page-header", "luz-page-header"],
  ["luz-cms-article-header", "luz-article-header"],
  ["luz-cms-article", "luz-article"],
  ["luz-cms-toc", "luz-toc"],
  ["luz-docs-shell", "luz-docs-layout"],
  ["luz-docs-page-head", "luz-doc-header"],
  ["luz-docs-rail", "luz-page-rail"],
  ["luz-docs-pager", "luz-pager"],
  ["luz-docs-page-foot", "luz-page-footer"],
  ["luz-docs-example", "luz-example"],
  ["luz-docs-dodont", "luz-do-dont"],
  ["luz-consent", "luz-cookie-consent"],
];

/** Table 2 of the changeset, the elements. */
export const TAGS = [
  ["luz-mode", "luz-color-mode"],
  ["luz-consent", "luz-cookie-consent"],
  ["luz-banner", "luz-announcement"],
];

/** Table 3 of the changeset, the stylesheets: [old name without `.css`, new name]. The F5b names of the 21 files. */
export const FILES = [
  ["landing-hero", "hero"],
  ["landing-section", "section"],
  ["landing-stat", "stat"],
  ["landing-glow", "glow"],
  ["landing-main", "main"],
  ["landing-header", "site-header"],
  ["cms-header", "site-header"],
  ["landing-footer", "site-footer"],
  ["cms-footer", "site-footer"],
  ["app-header", "app-bar"],
  ["app-dashboard", "dashboard"],
  ["cms-page-header", "page-header"],
  ["cms-article-header", "article-header"],
  ["cms-article", "article"],
  ["docs-shell", "docs-layout"],
  ["docs-page-head", "doc-header"],
  ["docs-rail", "page-rail"],
  ["docs-pager", "pager"],
  ["docs-page-foot", "page-footer"],
  ["docs-example", "example"],
  ["docs-dodont", "do-dont"],
  ["consent", "cookie-consent"],
  ["mode", "color-mode"],
  ["banner", "announcement"],
];

/** The chunks of catalog and the subpath of each: [old name, new name]. */
export const CHUNKS = [
  ["mode", "color-mode"],
  ["consent", "cookie-consent"],
];

/** Table 4 of the changeset, the custom properties. */
export const PROPERTIES = [
  ["--luz-landing-glow-x", "--luz-glow-x"],
  ["--luz-landing-glow-start", "--luz-glow-start"],
  ["--luz-landing-title-accent", "--luz-title-accent"],
  ["--luz-cms-toc-top", "--luz-toc-top"],
  ["--luz-docs-rail-top", "--luz-page-rail-top"],
  ["--luz-docs-rail-w", "--luz-page-rail-w"],
  ["--luz-docs-example-w", "--luz-example-w"],
];

/** The slugs of /docs/catalog/<slug>/ that were pages and are not: the 21 patterns of F5b that have a page, and the three elements. */
export const OLD_PAGES = [
  "landing-header", "landing-hero", "landing-section", "landing-stat", "landing-footer",
  "cms-header", "cms-page-header", "cms-article-header", "cms-toc", "cms-footer",
  "app-header", "app-dashboard",
  "docs-shell", "docs-page-head", "docs-rail", "docs-example", "docs-dodont", "docs-pager", "docs-page-foot",
  "mode", "consent", "banner",
];

/** The class blocks of catalog that keep a `docs-` name, as parts of the docs layout (`.luz-docs-main` and `.luz-docs-nav`) or its block. */
export const DOCS_KEPT = ["luz-docs-layout", "luz-docs-main", "luz-docs-nav"];

/**
 * What F8 does not change and a scan for old names must leave alone: `getConsent()`, the `data-luz-consent*` attributes,
 * the `--luz-consent-h` property, the `luz-consent` key of localStorage and the `luz:consent` event; core's `luz-mode-*`.
 */
export const KEPT = ["getConsent", "data-luz-consent", "--luz-consent-h", "luz:consent", "luz-mode-switcher", "luz-mode-btn", "luz-mode-cycle"];

/** A regular expression for an old class name as a whole word (`luz-cms-toc` but not `luz-cms-toc-top`'s property). */
export const oldClassPattern = () => new RegExp(`(?<![\\w-])(?:${CLASSES.map(([old]) => old).filter((o) => o !== "luz-consent").join("|")})(?![a-z0-9-])`);
