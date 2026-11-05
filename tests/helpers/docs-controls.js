/**
 * A docs page of controls (front matter `parts: controls`, the Form fields page), read into its parts, for the tests of
 * its structure, its Design sections and its AI files.
 *
 * The page's shape (what these helpers read, and tests/docs-controls.test.js holds):
 *   h2   a family (`inputs`, `choice`), with a one-line `<p>`; the h2 before "Known issues"
 *   h3   a control (`text`, `checkbox`), inside `div.docs-control`; its summary `<p>`, its example, then its own Code and
 *        Design tabs; the h3 `<family>-contrast` and `<family>-tokens` inside `div.docs-family-notes` are the family's
 *   h4   the title of a panel of a control (`<control>-code`, `<control>-design`)
 *   h5   a section of a panel; its id is the control's id and the section's (`text-markup`)
 */
import { findAll, isLive, parse, textOf } from "./html-dom.js";

/** The pages of controls of a site, from the front matter. */
export const controlsPages = (site) => site.pages.filter((p) => p.meta.parts === "controls");

/** The eleven sections of the template, in order, Code panel then Design panel (PRINCIPLES SR-5). */
export const CODE_SECTIONS = ["markup", "variants", "how", "no-js", "keyboard"];
export const DESIGN_SECTIONS = ["when", "when-not", "do-dont", "content", "contrast", "tokens"];

/**
 * { tree, families: [{ id, title, node, controls: [{ id, title, node, headings: [{ level, id, text, node }] }],
 * notes: [{ id, text, node }] }], knownIssues: node|null, headings, between(from, to) }
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
  const end = headings.findIndex((h) => h.level === 2 && h.id === "known-issues");
  const body = end === -1 ? headings : headings.slice(0, end);
  const families = [];
  for (const h of body) {
    if (h.level === 2) families.push({ id: h.id, title: h.text, node: h.node, controls: [], notes: [] });
    else if (!families.length) continue;
    else if (h.level === 3) {
      const family = families.at(-1);
      if (h.id === `${family.id}-contrast` || h.id === `${family.id}-tokens`) family.notes.push(h);
      else family.controls.push({ id: h.id, title: h.text, node: h.node, headings: [] });
    } else families.at(-1).controls.at(-1)?.headings.push(h);
  }
  const between = (a, b) => {
    const from = a.node.close.end;
    const to = b ? b.node.open.index : page.body.length;
    return page.body.slice(from, to);
  };
  return { tree, headings, families, knownIssues: end === -1 ? null : headings[end], between };
}

/** The section of a control (its h5) as HTML: to the next heading of any level. */
export function sectionOf(read, headingId) {
  const i = read.headings.findIndex((h) => h.id === headingId);
  if (i === -1) throw new Error(`no heading #${headingId}`);
  return read.between(read.headings[i], read.headings[i + 1]);
}

/** The html of a tag's text, to plain words. */
export const words = (html) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
