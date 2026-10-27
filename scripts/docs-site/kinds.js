/**
 * LUZ docs site: the patterns of each kind of site, as files of catalog (plan
 * ai-and-catalog-only, decisions 51 to 55, phase F5b).
 *
 * landing, cms, app and docs were four packages; their 21 components are
 * `packages/catalog/src/components/<block>.css` now (F8 named each by its
 * block, `.luz-<block>`; the unions keep `<kind>-header` and `<kind>-footer`
 * until they are merged). This module is the one place that says
 * which files and which pages belong to a kind, for the snippets (the
 * "Choose your snippet" page) and the prompts for AI, which write one `<link>`
 * per file. It reads no file: `kindFiles()` checks the list against the
 * manifests catalog's build wrote, so a file added to catalog without a line
 * here (or a line without its file) fails the build.
 *
 *   KIND_PATTERNS        by kind (`landing`, `cms`, `app`, `docs`): the files
 *                        in the order the kind's stylesheet had them (the
 *                        order of the cascade among them) and the pages of
 *                        its patterns (a slug of /docs/catalog/<slug>/; glow
 *                        and main have none)
 *   kindFiles(kind, components)   the `components/<name>.css` files, in order
 *   isKindFile(file)     is it one of the 21?
 *   kindOfFile(file)     the kind a file belongs to, or null
 *   FITS_KINDS, fitsKindsOf(value)   the kinds a catalog page says it fits best (`fits-kinds`)
 */

/**
 * The order of `files` is the order of the `@import`s of the stylesheet each
 * package had (header first, the pieces after it): the apps link them in it.
 * A name is the block's: `hero` is `components/hero.css` and `.luz-hero`; the
 * header and footer of landing and cms keep their kind in the name until they
 * are merged.
 */
export const KIND_PATTERNS = {
  landing: {
    files: ["landing-header", "hero", "main", "section", "stat", "landing-footer", "glow"],
    pages: ["landing-header", "hero", "section", "stat", "landing-footer"],
  },
  cms: {
    files: ["cms-header", "page-header", "article-header", "article", "cms-footer"],
    // The contents of an article has a page of its own, `toc`: its CSS is article.css
    pages: ["cms-header", "page-header", "article-header", "toc", "cms-footer"],
  },
  app: {
    files: ["app-bar", "dashboard"],
    pages: ["app-bar", "dashboard"],
  },
  docs: {
    files: ["docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"],
    pages: ["docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"],
  },
};

const KIND_OF = new Map(Object.entries(KIND_PATTERNS).flatMap(([kind, { files }]) => files.map((name) => [name, kind])));
const FILE = /^components\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.min)?\.css$/;

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

/** Is `file` (`components/x.css`, or its `.min.css`) one of the patterns of a kind of site? */
export const isKindFile = (file) => kindOfFile(file) !== null;

/** The kind (`landing`, `cms`, `app`, `docs`) a `components/<name>.css` belongs to, or null. */
export const kindOfFile = (file) => KIND_OF.get(FILE.exec(file)?.[1]) ?? null;

/**
 * The files of one kind, in order. `components` is catalogComponents()'s list.
 * Throws when the list and the manifests disagree.
 */
export function kindFiles(kind, components) {
  const spec = KIND_PATTERNS[kind];
  if (!spec) throw new Error(`${kind} is not a kind of site with patterns (${Object.keys(KIND_PATTERNS).join(", ")})`);
  const built = components.map(({ file }) => file).filter((file) => kindOfFile(file) === kind);
  const listed = spec.files.map((name) => `components/${name}.css`);
  const missing = listed.filter((file) => !built.includes(file));
  const extra = built.filter((file) => !listed.includes(file));
  if (missing.length || extra.length) {
    throw new Error(`scripts/docs-site/kinds.js: the files of ${kind} are not those of packages/catalog/dist${missing.length ? `; missing: ${missing.join(", ")}` : ""}${extra.length ? `; not listed: ${extra.join(", ")}` : ""}`);
  }
  return listed;
}
