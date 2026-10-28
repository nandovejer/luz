/**
 * LUZ check: the names catalog had before 0.3 (plan ai-and-catalog-only,
 * decisions 66 and 69). The CSS accepts no old name and there are no aliases,
 * so a page that still writes one gets the new name, not a guess.
 *
 *   BLOCKS            old block -> new block, for a class (`luz-landing-hero`,
 *                     with its `__parts` and `--modifiers`) and the file
 *                     `components/<old without luz->.css`
 *   TAGS              old element -> new element, and the chunk it loads
 *   renamedClass(name)  { current, publication } | null
 *   renamedTag(tag)     the new tag | null
 *   renamedFile(url)    { name, current } | null, for a link or a script
 *   pinsOldRelease(records)  does the page link catalog 0.0 to 0.2, which has the old names?
 *
 * `luz-cms-header` and `luz-landing-header` are one block now,
 * `luz-site-header`, with `--publication` for the blog bar; the masthead
 * (`luz-cms-header--masthead` and its `__top`, `__date`, `__sections`) is
 * `luz-masthead`. A name of the current table is never in here, so a project
 * on catalog 0.2 (whose manifests still know the old names) is not told.
 */
const BLOCKS = {
  "luz-landing-hero": "luz-hero",
  "luz-landing-section": "luz-section",
  "luz-landing-stat": "luz-stat",
  "luz-landing-glow": "luz-glow",
  "luz-landing-main": "luz-main",
  "luz-landing-header": "luz-site-header",
  "luz-cms-header": "luz-site-header",
  "luz-landing-footer": "luz-site-footer",
  "luz-cms-footer": "luz-site-footer",
  "luz-app-header": "luz-app-bar",
  "luz-app-dashboard": "luz-dashboard",
  "luz-cms-article-header": "luz-article-header",
  "luz-cms-page-header": "luz-page-header",
  "luz-cms-article": "luz-article",
  "luz-cms-toc": "luz-toc",
  "luz-docs-page-head": "luz-doc-header",
  "luz-docs-shell": "luz-docs-layout",
  "luz-docs-rail": "luz-page-rail",
  "luz-docs-page-foot": "luz-page-footer",
  "luz-docs-pager": "luz-pager",
  "luz-docs-example": "luz-example",
  "luz-docs-dodont": "luz-do-dont",
  "luz-banner": "luz-announcement",
  "luz-consent": "luz-cookie-consent",
  "luz-mode": "luz-color-mode",
};
const TAGS = { "luz-mode": "luz-color-mode", "luz-consent": "luz-cookie-consent", "luz-banner": "luz-announcement" };
// The masthead's own parts were parts of luz-cms-header
const MASTHEAD = new Set(["__top", "__date", "__sections"]);
const MAX_NAME = 64;
const PART = /^(luz-[a-z0-9]+(?:-[a-z0-9]+)*?)((?:__|--)[a-z0-9_-]+)?$/;

/** @returns {{ current: string, publication: boolean } | null} */
export function renamedClass(name) {
  // The echo of a name is capped at 64 characters everywhere; a longer one is not a name to repeat in a fix
  if (name.length > MAX_NAME) return null;
  const [, block, rest = ""] = PART.exec(name) ?? [];
  if (!Object.hasOwn(BLOCKS, block ?? "")) return null;
  if (block === "luz-cms-header" && (rest === "--masthead" || MASTHEAD.has(rest))) return { current: rest === "--masthead" ? "luz-masthead" : `luz-masthead${rest}`, publication: false };
  return { current: `${BLOCKS[block]}${rest}`, publication: block === "luz-cms-header" && rest === "" };
}

export const renamedTag = (tag) => (Object.hasOwn(TAGS, tag) ? TAGS[tag] : null);

// A page that links a catalog release before 0.3 has the old names right: it is told nothing
const PINNED = /@luz-ds\/catalog@0\.[0-2]\./;

/** Does a markup file link a catalog release that still has the old names? */
export function pinsOldRelease(records) {
  for (const record of records) {
    const url = record.name === "link" ? record.attrs.get("href") : record.name === "script" ? record.attrs.get("src") : undefined;
    if (url !== undefined && PINNED.test(url.value)) return true;
  }
  return false;
}

// …/components/landing-hero.css, or the chunks …/mode.js and …/consent.js, of catalog
const FILE = /@luz-ds\/catalog|\/packages\/catalog\//;
const COMPONENT = /\/components\/([a-z0-9-]+)(\.min)?\.css$/;
const CHUNK = /\/(mode|consent)(\.min)?\.js$/;

/** @returns {{ name: string, current: string } | null} */
export function renamedFile(url) {
  if (!FILE.test(url)) return null;
  const path = url.split(/[?#]/)[0];
  const component = COMPONENT.exec(path);
  if (component !== null) {
    const block = Object.hasOwn(BLOCKS, `luz-${component[1]}`) ? BLOCKS[`luz-${component[1]}`] : null;
    return block === null ? null : { name: `${component[1]}${component[2] ?? ""}.css`, current: `${block.slice(4)}${component[2] ?? ""}.css` };
  }
  const chunk = CHUNK.exec(path);
  return chunk === null ? null : { name: `${chunk[1]}${chunk[2] ?? ""}.js`, current: `${chunk[1] === "mode" ? "color-mode" : "cookie-consent"}${chunk[2] ?? ""}.js` };
}
