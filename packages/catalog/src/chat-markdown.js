/**
 * LUZ Catalog — chat-markdown (EXPERIMENTAL): the small piece of Markdown a
 * language model writes (paragraphs, headings, lists, code, bold, italic and
 * links), turned into DOM nodes. It builds nodes with createElement and
 * textContent and never parses HTML, so nothing the model writes can add an
 * element, an attribute or a script. A link is only a link when `link(url)`
 * gives back an address (<luz-chat> gives one for the sources of the answer);
 * any other is shown as its text.
 */

const INLINE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|(?<![*\w])\*([^*\s][^*\n]*?)\*(?![*\w])|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)/;
const NUMBER = /^\s*\d+[.)]\s+(.*)/;
const FENCE = /^\s*```/;
const QUOTE = /^\s{0,3}>\s?(.*)/;

const node = (tag, className) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
};

/** Writes `text` into `parent`, with its `code`, **bold**, *italic* and [links](url). */
function inline(parent, text, link) {
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) parent.append(text.slice(last, m.index));
    last = m.index + m[0].length;
    const [, code, strong, strong2, del, em, label, url] = m;
    if (code) parent.append(Object.assign(node("code", "luz-chat__code-inline"), { textContent: code }));
    else if (strong || strong2) inline(parent.appendChild(node("strong")), strong || strong2, link);
    else if (del) inline(parent.appendChild(node("del")), del, link);
    else if (em) inline(parent.appendChild(node("em")), em, link);
    else {
      const href = link?.(url);
      if (href) {
        const a = node("a");
        a.href = href;
        a.textContent = label;
        parent.append(a);
      } else parent.append(label);
    }
  }
  if (last < text.length) parent.append(text.slice(last));
}

/**
 * The nodes of `markdown`, in a fragment.
 * @param {string} markdown
 * @param {(url: string) => string | undefined} [link] the address to link, or nothing to show the text only
 * @returns {DocumentFragment}
 */
export function renderMarkdown(markdown, link) {
  const out = document.createDocumentFragment();
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (FENCE.test(line)) {
      // A block of code, up to the closing fence (or the end: the answer may still be arriving)
      const code = [];
      for (i++; i < lines.length && !FENCE.test(lines[i]); i++) code.push(lines[i]);
      i++;
      const pre = out.appendChild(node("pre", "luz-chat__code"));
      pre.tabIndex = 0;
      pre.appendChild(node("code")).textContent = code.join("\n");
    } else if (QUOTE.test(line)) {
      // A quote: its lines, without the mark, as one paragraph in a blockquote
      const rows = [];
      for (; i < lines.length && (m = QUOTE.exec(lines[i])); i++) rows.push(m[1]);
      inline(out.appendChild(node("blockquote")).appendChild(node("p")), rows.join("\n"), link);
    } else if ((m = HEADING.exec(line))) {
      inline(out.appendChild(node("p", "luz-chat__h")), m[2], link);
      i++;
    } else if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = NUMBER.test(line);
      const list = out.appendChild(node(ordered ? "ol" : "ul"));
      for (; i < lines.length && (m = (ordered ? NUMBER : BULLET).exec(lines[i])); i++) inline(list.appendChild(node("li")), m[1], link);
    } else if (!line.trim()) i++;
    else {
      const rows = [];
      for (; i < lines.length && lines[i].trim() && !FENCE.test(lines[i]) && !QUOTE.test(lines[i]) && !HEADING.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBER.test(lines[i]); i++) rows.push(lines[i].trim());
      inline(out.appendChild(node("p")), rows.join("\n"), link);
    }
  }
  return out;
}
