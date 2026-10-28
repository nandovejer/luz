/**
 * The home's pages are written with the attribute values that need no quotes
 * left unquoted (`class=luz-btn`, `unquoteAttributes()` in
 * scripts/docs-site/site.js): valid HTML5, and two bytes each. A test that
 * reads a rendered home with a regex of quoted values (`id="hero"`) reads it
 * through `quoted()`, which gives the quotes back to every start tag and
 * touches nothing else: the same page, the same attributes, the same text.
 * Prefer `parse()` of ./html-dom.js when the test asks for a tree.
 */
import { tags } from "../../scripts/docs-site/html.js";

// One attribute of a start tag: its name, then nothing, a quoted value or an unquoted one
const ATTRIBUTE = /(\s[^\s"'<>/=]+)(?:=(?:"[^"]*"|'[^']*'|([^\s"'=<>`]+)))?/g;

export function quoted(html, file = "<page>") {
  let out = "";
  let at = 0;
  for (const tag of tags(html, file)) {
    if (tag.type !== "start") continue;
    const raw = html.slice(tag.index, tag.end);
    const requoted = raw.replace(ATTRIBUTE, (whole, name, value) => (value === undefined ? whole : `${name}="${value}"`));
    if (requoted === raw) continue;
    out += html.slice(at, tag.index) + requoted;
    at = tag.end;
  }
  return out + html.slice(at);
}
