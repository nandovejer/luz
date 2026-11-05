/**
 * A docs page of controls (front matter `parts: controls`: the four pages of Form fields, form-inputs, form-choice,
 * form-values and form-field-parts), read into its parts, for the tests of its structure, its Design sections and its AI files.
 *
 * The shape of a page (what these helpers read, and tests/docs-controls.test.js holds):
 *   h2   a control (`text`, `checkbox`), inside `div.docs-control`; its summary `<p>`, its example, then its own Code and
 *        Design tabs. At the end, `div.docs-family-notes` holds the h2 `<family>-contrast` and `<family>-tokens`, the notes
 *        every control of the page shares, and the one h2 `known-issues` closes the page
 *   h3   the title of a panel of a control (`<control>-code`, `<control>-design`)
 *   h4   a section of a panel; its id is the control's id and the section's (`text-markup`)
 */
import { findAll, hasClass, isLive, parse, textOf } from "./html-dom.js";

/** The pages of controls of a site, from the front matter, in the order of the page (`order`). */
export const controlsPages = (site) => site.pages.filter((p) => p.meta.parts === "controls").sort((a, b) => Number(a.meta.order) - Number(b.meta.order));

/** The eleven sections of the template, in order, Code panel then Design panel (PRINCIPLES SR-5). */
export const CODE_SECTIONS = ["markup", "variants", "how", "no-js", "keyboard"];
export const DESIGN_SECTIONS = ["when", "when-not", "do-dont", "content", "contrast", "tokens"];

/**
 * { tree, headings, controls: [{ id, title, node, headings }], family, notes: [{ id, text, node }], knownIssues, between(a, b) }
 * `family`: the id the notes share (`inputs` for `inputs-contrast`), or null; `headings` of a control: its h3 and h4, in order.
 * `between(a, b)`: the HTML of the page from the end of heading `a` to the start of heading `b` (or the end).
 */
export function readControls(page) {
  const tree = parse(page.body, page.file);
  const headings = findAll(tree, (n) => /^h[1-6]$/.test(n.name) && isLive(n)).map((node) => ({
    level: Number(node.name[1]),
    id: node.attrs.get("id") ?? null,
    text: textOf(node),
    node,
  }));
  const controls = [];
  const notes = [];
  let knownIssues = null;
  for (const h of headings) {
    if (h.level === 2) {
      if (h.id === "known-issues") knownIssues = h;
      else if (hasClass(h.node.parent, "docs-family-notes")) notes.push(h);
      else controls.push({ id: h.id, title: h.text, node: h.node, headings: [] });
    } else controls.at(-1)?.headings.push(h);
  }
  const family = notes[0]?.id.replace(/-(?:contrast|tokens)$/, "") ?? null;
  const between = (a, b) => page.body.slice(a.node.close.end, b ? b.node.open.index : page.body.length);
  return { tree, headings, controls, family, notes, knownIssues, between };
}

/** The section of a control (its h4) as HTML: to the next heading of any level. */
export function sectionOf(read, headingId) {
  const i = read.headings.findIndex((h) => h.id === headingId);
  if (i === -1) throw new Error(`no heading #${headingId}`);
  return read.between(read.headings[i], read.headings[i + 1]);
}

/** The html of a tag's text, to plain words. */
export const words = (html) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
