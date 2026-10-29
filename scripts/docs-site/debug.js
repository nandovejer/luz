/**
 * LUZ docs site — the /debug/ page (plan luz-final-refactor, section E).
 *
 * One generated document to look at LUZ by hand, one element under another: the
 * bare HTML tags, the layout objects, the core components and the catalog
 * patterns. Nothing in it is typed:
 *
 *   html     the demo of every card of /docs/html/ (its stage, or its snippet when
 *            the tag has no live demo), for the tags of tests/fixtures/html-elements.json
 *   objects  the labelled examples of /docs/components/layout/
 *   core     the Example (`.docs-example[data-docs-specimen]`) of each page of
 *            /docs/components/
 *   catalog  the same, of each page of /docs/catalog/
 *
 * Above each demo: its name, its file and a link to its page of the docs. A demo is
 * written for a page of its own, so its ids repeat: every id gets the prefix of its
 * block, and every reference to one follows (prefixIds()).
 *
 * The page is isolated: it links only the published CSS and JS of tokens, core and
 * catalog, never the docs' or the site's, so it shows what someone who uses LUZ sees.
 * Its own CSS is apps/debug/debug.css, inlined; its controls are apps/debug/debug.js.
 *
 * It is a document of the real site only (hasDebugPage()): not indexed, not in the
 * search, llms.txt, llms-full.txt, the A-Z index or the sidebar, and not written as
 * Markdown. Development tooling: nothing here ships in a package.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VOID, compactHtml, tags } from "./html.js";
import { catalogComponents, catalogFilesIn } from "./snippets.js";

/** The route of the page, and the file the build and the dev server give it (it never exists on disk). */
export const DEBUG_ROUTE = "/debug/";
export const DEBUG_FILE = "apps/debug/index.html";

/** The layout page: the objects are its labelled examples. */
const LAYOUT_ROUTE = "/docs/components/layout/";
const LAYOUT_FILE = "objects/_objects.css";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The groups, in the order of the page; the words are the page's own. */
const GROUPS = [
  { id: "html", title: "HTML tags", lead: "Every tag with no class, as its card in the docs shows it." },
  { id: "objects", title: "Layout objects", lead: "The o-* objects, as the layout page shows them." },
  { id: "core", title: "Core components", lead: "The example of each core component." },
  { id: "catalog", title: "Catalog components and patterns", lead: "The example of each catalog component and pattern." },
];

/**
 * Only the real site has the page. The sites of the unit tests are made of a few pages
 * of their own and have no fixture, no manifests and no catalog to build it from.
 */
export const hasDebugPage = (site) => site.docsDir === resolve(REPO, "apps/docs");

const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---- Attributes ----------------------------------------------------------- */

/**
 * Every attribute of the source, one at a time: `change(tag, name, value)` returns
 * the new value, or undefined to leave it. The rest of the markup is left byte for
 * byte, a value keeps its quotes, and only the attributes of tags are read: the
 * text and the code of a demo, which may talk about `id="name"`, are never touched.
 */
function mapAttributes(html, change, file = "debug") {
  const ATTRIBUTE = /([^\s"'<>/=]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let out = "";
  let from = 0;
  for (const tag of tags(html, file)) {
    if (tag.type !== "start" || tag.attrs.size === 0) continue;
    const open = tag.index + 1 + tag.written.length;
    const source = html.slice(open, tag.end);
    const edited = source.replace(ATTRIBUTE, (whole, name, equals, double, single, bare) => {
      const value = double ?? single ?? bare;
      const next = change(tag, name.toLowerCase(), value);
      if (next === undefined || next === value) return whole;
      const quote = double !== undefined ? '"' : single !== undefined ? "'" : "";
      return `${name}${equals}${quote}${next}${quote}`;
    });
    if (edited === source) continue;
    out += html.slice(from, open) + edited;
    from = tag.end;
  }
  return from ? out + html.slice(from) : html;
}

/** The ids a fragment defines. */
function idsOf(html, file) {
  const ids = new Set();
  for (const tag of tags(html, file)) if (tag.type === "start" && tag.attrs.has("id")) ids.add(tag.attrs.get("id"));
  return ids;
}

/**
 * Attributes whose value is an id, or a list of them (white space between): the
 * label, the ARIA relations, the popover and the command, the copy button, the
 * datalist, the form of a control and the cells' headers. `href="#id"` is
 * handled apart, as a link to a fragment of the page.
 */
const ID_REFERENCES = new Set([
  "for",
  "list",
  "form",
  "headers",
  "popovertarget",
  "commandfor",
  "interestfor",
  "data-copy-from",
  "aria-controls",
  "aria-labelledby",
  "aria-describedby",
  "aria-owns",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-activedescendant",
]);

/**
 * Join the demo of one component to the demos of the others: every id becomes
 * `<prefix>-<id>`, and every reference to an id of this fragment follows it (the
 * attributes above, a link to `#id` and an SVG <use>, whose lists keep their
 * order). A reference to something this fragment does not define is left as it is,
 * and so are `href="#"`, a link to another page, and the text of the fragment.
 */
export function prefixIds(html, prefix) {
  const ids = idsOf(html, "prefixIds");
  if (ids.size === 0) return html;
  const renamed = (id) => `${prefix}-${id}`;
  return mapAttributes(html, (_tag, name, value) => {
    if (name === "id") return renamed(value);
    if (ID_REFERENCES.has(name)) {
      return value
        .split(/(\s+)/)
        .map((part) => (ids.has(part) ? renamed(part) : part))
        .join("");
    }
    if ((name === "href" || name === "xlink:href") && value.length > 1 && value.startsWith("#") && ids.has(value.slice(1))) return `#${renamed(value.slice(1))}`;
    return undefined;
  });
}

/**
 * What joining leaves to do in one demo, once its ids are prefixed:
 * a link to a fragment of the page the demo came from, outside the demo (the docs'
 * "#c-button"), goes to the block itself; and a radio group is scoped to the demo, so
 * that choosing in one block never unchecks another's.
 */
function scopeDemo(html, { prefix, blockId }) {
  const ids = idsOf(html, "scopeDemo");
  return mapAttributes(html, (tag, name, value) => {
    if (tag.name === "input" && name === "name" && tag.attrs.get("type") === "radio") return `${prefix}-${value}`;
    if ((tag.name === "a" || tag.name === "area") && name === "href" && value.length > 1 && value.startsWith("#") && !ids.has(value.slice(1))) return `#${blockId}`;
    return undefined;
  });
}

/* ---- Slices of a source --------------------------------------------------- */

/**
 * The elements of a source that `test(tag)` says yes to, in document order:
 * { inner, outer } as the text between their tags and with them. The sources are
 * ours and were read strictly (readHtml()), so their tags nest.
 */
function elementsOf(html, test, file) {
  const open = [];
  const found = [];
  for (const tag of tags(html, file)) {
    if (tag.type === "start") {
      if (VOID.has(tag.name) || tag.selfClosing) continue;
      open.push({ tag, hit: test(tag) });
    } else {
      const top = open.pop();
      if (top?.hit) {
        found.push({ start: top.tag.index, inner: html.slice(top.tag.end, tag.index), outer: html.slice(top.tag.index, tag.end), attrs: top.tag.attrs });
      }
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

const hasClass = (tag, name) => (tag.attrs.get("class") ?? "").split(/\s+/).includes(name);
const named = (name, className) => (tag) => tag.name === name && hasClass(tag, className);

/* ---- The sources ---------------------------------------------------------- */

/** The tags of the fixture, which says what the page must hold and which file styles each. */
function htmlElements(root) {
  return JSON.parse(readFileSync(join(root, "tests/fixtures/html-elements.json"), "utf-8")).elements;
}

/** A page of the docs under a folder: not the index of the folder. */
const pagesIn = (site, folder) => site.pages.filter((p) => p.route.startsWith(`/docs/${folder}/`) && p.route !== `/docs/${folder}/`);

const slugOf = (route) => route.split("/").filter(Boolean).pop();

/** The block of every tag of the fixture, from its card in /docs/html/. */
function htmlBlocks(site) {
  const cards = new Map();
  for (const page of pagesIn(site, "html")) {
    for (const card of elementsOf(page.body, (tag) => tag.name === "article" && hasClass(tag, "elements-card") && tag.attrs.has("data-element"), page.file)) {
      cards.set(card.attrs.get("data-element"), { route: page.route, file: page.file, inner: card.inner });
    }
  }
  return htmlElements(site.repoRoot).map((element) => {
    const card = cards.get(element.name);
    if (!card) throw new Error(`${element.name} is in tests/fixtures/html-elements.json and has no card on /docs/html/`);
    const stage = elementsOf(card.inner, named("div", "elements-stage"), card.file)[0];
    const snippet = elementsOf(card.inner, named("div", "elements-snippet"), card.file)[0];
    const demo = stage?.inner ?? snippet?.outer;
    if (demo === undefined) throw new Error(`${card.file}: the card of <${element.name}> has no stage and no snippet`);
    return {
      name: element.name,
      title: `<${element.name}>`,
      file: element.styledBy,
      href: `${card.route}#el-${element.name}`,
      demo,
    };
  });
}

/** The labelled examples of the layout page: one block for each `.o-*` it names. */
function objectBlocks(site) {
  const page = site.byRoute.get(LAYOUT_ROUTE);
  if (!page) throw new Error(`${LAYOUT_ROUTE} is not a page of the site`);
  const stage = named("div", "docs-demo__stage");
  // The grid of the examples is a stage too: only the innermost ones, each with its label
  const stages = elementsOf(page.body, stage, page.file).filter((s) => elementsOf(s.inner, stage, page.file).length === 0);
  return stages.flatMap((stage) => {
    const label = elementsOf(stage.inner, named("code", "docs-demo__file"), page.file)[0]?.inner.trim();
    if (!label || !/^\.o-[a-z0-9-]+$/.test(label)) return [];
    return [{ name: label.slice(1), title: label, file: LAYOUT_FILE, href: `${LAYOUT_ROUTE}#objects-examples`, demo: stage.inner }];
  });
}

/** The stylesheet(s) a page of the catalog names, or the files a tag or a class of its `files` line stands for. */
function catalogFiles(site, page) {
  const components = catalogComponents({ root: site.repoRoot });
  const named = [...page.meta.files.matchAll(/components\/[a-z0-9-]+\.css/g)].map((m) => m[0]);
  return [...new Set([...named, ...catalogFilesIn(page.meta.files, components)])].sort();
}

/** The block of each page of a folder with an Example. */
function componentBlocks(site, folder) {
  return pagesIn(site, folder).flatMap((page) => {
    const examples = elementsOf(page.body, (tag) => tag.name === "div" && hasClass(tag, "docs-example") && tag.attrs.has("data-docs-specimen"), page.file);
    if (!examples.length) return [];
    const files = folder === "catalog" ? catalogFiles(site, page) : (page.meta.files ?? "").split(";").map((f) => f.trim()).filter(Boolean);
    return [
      {
        name: slugOf(page.route),
        title: page.meta.title,
        file: files.join(", ") || "no stylesheet of its own",
        href: page.route,
        demo: examples.map((e) => e.inner).join("\n"),
      },
    ];
  });
}

/* ---- The page ------------------------------------------------------------- */

/** The published stylesheets the page links, in the order of the cascade: tokens, core, then every catalog component. */
function stylesheets(root) {
  const dir = join(root, "packages/catalog/src/components");
  const catalog = readdirSync(dir).filter((f) => f.endsWith(".css") && !f.startsWith("_")).sort();
  return ["/packages/tokens/dist/luz-tokens.css", "/packages/core/dist/luz.css", ...catalog.map((f) => `/packages/catalog/dist/components/${f}`)];
}

const MODES = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["high-contrast", "High contrast"],
];

/** The blocks of each group, with the ids the page and its index are made of. */
function groupsOf(site) {
  const sources = { html: htmlBlocks(site), objects: objectBlocks(site), core: componentBlocks(site, "components"), catalog: componentBlocks(site, "catalog") };
  return GROUPS.map((group) => ({
    ...group,
    anchor: `debug-group-${group.id}`,
    blocks: sources[group.id].map((block) => {
      const anchor = `debug-${group.id}-${block.name}`;
      const prefix = `${group.id}-${block.name}`;
      return { ...block, anchor, demo: scopeDemo(prefixIds(block.demo, prefix), { prefix, blockId: anchor }) };
    }),
  }));
}

const link = (href, text, attrs = "") => `<a${attrs} href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;

function renderControls() {
  const options = MODES.map(([value, label]) => `<option value="${value}"${value === "light" ? " selected" : ""}>${label}</option>`).join("");
  return `<header class="debug-bar o-sticky" data-debug-controls>
<h1 class="debug-bar__title">LUZ debug</h1>
<label class="debug-bar__control"><span>Color mode</span><select data-debug-mode>${options}</select></label>
<label class="debug-bar__control"><input type="checkbox" data-debug-rtl><span>Right to left</span></label>
</header>
<p class="debug-note">Every element and component of LUZ, one under another, to look at by hand. This page is not indexed.</p>`;
}

function renderIndex(groups) {
  const items = groups
    .map(
      (group) =>
        `<li class="debug-index__group">${link(`#${group.anchor}`, group.title)}</li>\n${group.blocks.map((block) => `<li>${link(`#${block.anchor}`, block.title)}</li>`).join("\n")}`,
    )
    .join("\n");
  return `<nav class="debug-index" data-debug-index aria-label="Index">
<details open>
<summary>Index</summary>
<ul>
${items}
</ul>
</details>
</nav>`;
}

function renderBlock(group, block) {
  return `<section class="debug-block" id="${block.anchor}" data-debug-block data-debug-name="${escapeHtml(block.name)}">
<div class="debug-block__head">
<h3 class="debug-block__name">${escapeHtml(block.title)}</h3>
<code class="debug-block__file">${escapeHtml(block.file)}</code>
<a class="debug-block__docs" href="${escapeHtml(block.href)}" aria-label="Docs page for ${escapeHtml(block.title)}">Docs page</a>
</div>
<div class="debug-block__demo">
${block.demo}
</div>
</section>`;
}

function renderGroup(group) {
  return `<section id="${group.anchor}" data-debug-group="${group.id}" aria-labelledby="${group.anchor}-title">
<h2 class="debug-group__title" id="${group.anchor}-title">${escapeHtml(group.title)}</h2>
<p class="debug-group__lead">${escapeHtml(group.lead)}</p>
<div class="debug-group__blocks">
${group.blocks.map((block) => renderBlock(group, block)).join("\n")}
</div>
</section>`;
}

/**
 * The whole document of /debug/.
 * @param {object} options
 * @param {object} options.site  the scan of the site (scanSite()); the page is made from its pages
 * @returns {string} the HTML
 */
export function renderDebug({ site }) {
  if (!hasDebugPage(site)) throw new Error(`${DEBUG_ROUTE} is a page of the docs site of this repository only`);
  const groups = groupsOf(site);
  // The comments of the source are for its author; the page ships without them
  const css = readFileSync(join(site.repoRoot, "apps/debug/debug.css"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n{2,}/g, "\n").trim();
  const links = stylesheets(site.repoRoot).map((href) => `<link rel="stylesheet" href="${href}">`);
  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Debug: every element and component - LUZ</title>
<link rel="icon" href="data:,">
${links.join("\n")}
<style>
${css}
</style>
</head>
<body>
${renderControls()}
${renderIndex(groups)}
<main class="debug-main" id="main-content">
${groups.map(renderGroup).join("\n")}
</main>
<script type="module" src="/packages/core/dist/luz.js"></script>
<script type="module" src="/packages/catalog/dist/catalog.js"></script>
<script type="module" src="/apps/debug/debug.js"></script>
</body>
</html>
`;
  return compactHtml(html);
}
