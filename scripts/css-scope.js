/**
 * LUZ Design System — selector scoping for luz.conditional.css
 *
 * scopeCss(css) puts the reset and the bare-element rules of core inside a
 * zone, [data-luz], so a page that already has a design can opt in one
 * region at a time. A small transform of its own, no dependency: it reads
 * the CSS of packages/core/src/generic and src/elements, which are written
 * for it (every selector is :where(…), or * or a vendor pseudo-element, no
 * nesting).
 *
 * - :where(a, b) becomes :where([data-luz] a, [data-luz] b): specificity 0
 *   stays 0, and a pseudo-element after it stays after it.
 * - body (the document's font, colour and background) becomes the zone root
 *   itself, and html is dropped: scroll-behavior and the text-size adjust are
 *   about the document, not about a region.
 * - * (the reset) becomes :where([data-luz], [data-luz] *).
 * - A colour-mode context in front of an element (:is([data-theme="dark"], …)
 *   select) may be outside the zone, on it or inside it: all three are matched.
 * - An item that starts with a class (:where(select, .luz-select)) is left as
 *   it is: a component shares the rule of its element, and works outside the zone.
 * - Everything else is prefixed with the zone and a space.
 * Rules inside @media, @supports, @layer and @container are scoped in place;
 * A condition left with no rule is dropped. @keyframes and @font-face are copied
 * as they are.
 */

export const ZONE = "[data-luz]";

/** Index of the character that closes the bracket opened at `open`. */
function matching(css, open) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const stack = [pairs[css[open]]];
  for (let i = open + 1; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === "\\") i++;
    } else if (c === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i + 2) + 1;
      if (i === 0) throw new Error("unterminated comment");
    } else if (pairs[c]) {
      stack.push(pairs[c]);
    } else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  throw new Error(`unbalanced ${css[open]} near "${css.slice(open, open + 40)}"`);
}

/** Split on the commas that are not inside (), [] or a string. */
function splitTop(text) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === "\\") i++;
    } else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(text.slice(from, i));
      from = i + 1;
    }
  }
  out.push(text.slice(from));
  return out.map((s) => s.trim()).filter(Boolean);
}

/** One item inside :where(…); null when it is dropped. */
function scopeItem(item) {
  // A class is not about the zone: the component it names works anywhere
  if (item.startsWith(".")) return item;
  if (item === "html") return null;
  if (item === "body") return ZONE;
  if (item.startsWith(":is([data-theme")) {
    const end = matching(item, 3);
    const context = item.slice(0, end + 1);
    const rest = item.slice(end + 1).trim();
    return `${context} ${ZONE} ${rest}, ${ZONE}${context} ${rest}, ${ZONE} ${context} ${rest}`;
  }
  return `${ZONE} ${item}`;
}

function scopeSelector(selector) {
  if (selector.startsWith(":where(")) {
    const end = matching(selector, 6);
    const items = splitTop(selector.slice(7, end)).map(scopeItem).filter(Boolean);
    return items.length ? `:where(${items.join(", ")})${selector.slice(end + 1)}` : null;
  }
  if (selector.startsWith("*")) return `:where(${ZONE}, ${ZONE} *)${selector.slice(1)}`;
  return `${ZONE} ${selector}`;
}

/** Scope every style rule of `css`. */
export function scopeCss(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const next = css.slice(i).search(/[{;}]|\/\*/);
    if (next === -1) return out + css.slice(i);
    const at = i + next;
    if (css.startsWith("/*", at)) {
      const end = css.indexOf("*/", at + 2) + 2;
      out += css.slice(i, end);
      i = end;
      continue;
    }
    if (css[at] === ";") {
      out += css.slice(i, at + 1);
      i = at + 1;
      continue;
    }
    if (css[at] === "}") throw new Error("unexpected }");
    // A block: an at-rule or a style rule
    const prelude = css.slice(i, at);
    const close = matching(css, at);
    const body = css.slice(at + 1, close);
    const name = prelude.trim();
    if (name.startsWith("@")) {
      const nested = /^@(media|supports|layer|container)\b/.test(name);
      const inner = nested ? scopeCss(body) : body;
      // A condition that held only html rules (dropped above) is dropped too
      if (nested && !name.startsWith("@layer") && !inner.replace(/\/\*[^]*?\*\//g, "").trim()) {
        i = close + 1;
        continue;
      }
      out += `${prelude}{${inner}}`;
    } else {
      if (body.includes("{")) throw new Error(`nested rule in "${name}": not supported`);
      const lead = prelude.match(/^\s*/)[0];
      const selectors = splitTop(name).map(scopeSelector).filter(Boolean);
      if (selectors.length) out += `${lead}${selectors.join(",\n")} {${body}}`;
    }
    i = close + 1;
  }
  return out;
}
