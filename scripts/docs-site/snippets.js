/**
 * LUZ docs site: the snippet generator (F4 step 5, spec f4-customisation.md 3.4).
 *
 * The page "Choose your snippet" is written from the files that `npm pack`
 * ships, so a version and a hash are never typed by hand:
 *
 *   snippetData({ root, readFile, dev })  reads each package's package.json and
 *                                         the dist files of FILES; hashes them
 *   renderSnippets(data, t)               pure: the HTML of the page (an index
 *                                         table, eight snippets, the chunks); `t`
 *                                         reads the words of the page in its
 *                                         language (strings.js, keys snippets.*)
 *
 * `integrity` is `sha384-` + base64 of the SHA-384 of the bytes of
 * `packages/<name>/dist/<file>`, the algorithm of SECURITY.md. The URL carries
 * the `version` of that package.json. A missing file fails with the file name
 * and `run pnpm build`; with `dev: true` it warns and writes a placeholder, so
 * the page is never silently unsafe. This module reads nothing else: not
 * pack-files.txt, not budgets.json (tests check those against it).
 *
 * Catalog has no bundle (plan ai-and-catalog-only, decisions 59 and 63): a
 * page links each component it uses, `dist/components/<name>.min.css`. Its
 * files are read from its manifests (catalogComponents), never listed here:
 *
 *   catalogComponents({ root, readFile })  [{ file, tags, classes }] by file:
 *                                          the stylesheet of each element and
 *                                          class of catalog's custom-elements.json
 *                                          and classes.json
 *   catalogFilesIn(text, components)       the files of the ones a text names
 *                                          (`<luz-x` or a class), by file
 *   renderComponentLinks(data, file, t)    the two lines that load one
 *                                          component (npm, then CDN), the start
 *                                          of "Copy the markup" on its page
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KIND_PATTERNS, kindFiles } from "./kinds.js";
import { englishT } from "./strings.js";

/**
 * The files of each package that a snippet or the chunks table names (spec 3.4.1).
 * Catalog's `css` is null: it has a file per component (catalogComponents), and
 * EXAMPLE_COMPONENT is the one the snippets of a kind of site show, before the
 * patterns of the kind (kinds.js; the packages landing, cms, app and docs are
 * gone, their patterns are files of catalog).
 */
export const FILES = {
  tokens: { css: "luz-tokens.min.css", js: null, chunks: [] },
  core: { css: "luz.min.css", js: "luz.min.js", chunks: ["midi.min.js", "table-sort.min.js", "i18n-es.min.js"] },
  catalog: { css: null, js: "catalog.min.js", chunks: ["search.min.js", "cookie-consent.min.js", "color-mode.min.js", "timeline.min.js", "sidebar.min.js"] },
};

/** The catalog component the snippet of a kind of site links, as the example of one link per component. */
export const EXAMPLE_COMPONENT = "components/search.css";

/** `components/x.css` → `components/x.min.css`, the file a CDN link names. */
export const minified = (file) => file.replace(/\.css$/, ".min.css");

/**
 * The stylesheets of catalog, from the manifests its build writes: the
 * `stylesheet` of each element of custom-elements.json and the `files` of each
 * class of classes.json. [{ file, tags, classes }], sorted by file; the files
 * share no selector, so a page links them in any order, after core.
 */
export function catalogComponents({ root, readFile = readFileSync }) {
  const read = (name) => {
    const path = join(root, "packages", "catalog", "dist", name);
    try {
      return JSON.parse(readFile(path, "utf-8"));
    } catch (error) {
      throw new Error(`packages/catalog/dist/${name} is missing or unreadable (${error.message}): run pnpm build`);
    }
  };
  const byFile = new Map();
  const entry = (file) => {
    if (!/^components\/[a-z0-9-]+\.css$/.test(file)) throw new Error(`packages/catalog/dist: "${file}" is not a components/<name>.css`);
    if (!byFile.has(file)) byFile.set(file, { file, tags: [], classes: [] });
    return byFile.get(file);
  };
  for (const module of read("custom-elements.json").modules ?? []) {
    for (const d of module.declarations ?? []) if (d.tagName && d.stylesheet) entry(d.stylesheet).tags.push(d.tagName);
  }
  for (const c of read("classes.json").classes ?? []) if (c.defined) for (const file of c.files ?? []) entry(file).classes.push(c.name);
  return [...byFile.values()].sort((a, b) => (a.file < b.file ? -1 : 1));
}

/** The files of the components a text names: a tag `<luz-x` (space, `>` or `/` after it) or a class, by file. */
export function catalogFilesIn(text, components) {
  const names = (list, pattern) => list.some((name) => pattern(name).test(text));
  const esc = (name) => name.replace(/[-]/g, "\\-");
  return components
    .filter(({ tags, classes }) => names(tags, (tag) => new RegExp(`<${esc(tag)}[\\s>/]`)) || names(classes, (c) => new RegExp(`(?<![\\w-])${esc(c)}(?![\\w-])`)))
    .map(({ file }) => file);
}

/**
 * What the reader is building: its id and the kind in kinds.js whose patterns
 * it links (null: none); its words are `snippets.kind.<id>`.
 */
export const KINDS = [
  { id: "atoms", patterns: null },
  { id: "landing", patterns: "landing" },
  { id: "blog", patterns: "cms" },
  { id: "app", patterns: "app" },
  { id: "docs", patterns: "docs" },
];

/** How it is loaded; its words are `snippets.way.<id>` and `snippets.way-heading.<id>`. */
export const WAYS = [{ id: "npm" }, { id: "cdn" }];

/** The chunks: where each is loaded from, and the catalog key that says when a page needs its line. */
const CHUNK_WHEN = {
  "midi.min.js": ["core", "snippets.when.midi"],
  "table-sort.min.js": ["core", "snippets.when.table-sort"],
  "i18n-es.min.js": ["core", "snippets.when.i18n-es"],
  "search.min.js": ["catalog", "snippets.when.luz-search"],
  "cookie-consent.min.js": ["catalog", "snippets.when.luz-cookie-consent"],
  "color-mode.min.js": ["catalog", "snippets.when.luz-color-mode"],
  "timeline.min.js": ["catalog", "snippets.when.luz-timeline"],
  "sidebar.min.js": ["catalog", "snippets.when.luz-sidebar"],
};

const CDN = "https://cdn.jsdelivr.net/npm";
const PLACEHOLDER = "sha384-(run pnpm build)";

/**
 * Read every file of FILES.
 * `root`: the repository; `readFile(path, encoding?)`: the bytes (a Buffer without an
 * encoding); `dev`: warn about a missing dist file instead of throwing; `warn`: where.
 * Returns { entries, kindFiles }: "<pkg>/<file>" → { pkg, version, file, url, integrity };
 * the files of each kind of site's patterns, by kind (kinds.js), in order.
 */
export function snippetData({ root, readFile, dev = false, warn = console.warn }) {
  const entries = {};
  let components = [];
  let patterns = {};
  try {
    const built = catalogComponents({ root, readFile });
    components = built.map(({ file }) => minified(file));
    patterns = Object.fromEntries(Object.keys(KIND_PATTERNS).map((kind) => [kind, kindFiles(kind, built)]));
  } catch (error) {
    if (!dev) throw error;
    warn(`[docs] ${error.message}`);
    patterns = Object.fromEntries(Object.entries(KIND_PATTERNS).map(([kind, { files }]) => [kind, files.map((name) => `components/${name}.css`)]));
    components = [minified(EXAMPLE_COMPONENT), ...Object.values(patterns).flat().map(minified)];
  }
  for (const [pkg, spec] of Object.entries(FILES)) {
    const manifest = join(root, "packages", pkg, "package.json");
    let version;
    try {
      version = JSON.parse(readFile(manifest, "utf-8")).version;
    } catch (error) {
      throw new Error(`the snippets need ${manifest}: ${error.message}`);
    }
    if (typeof version !== "string" || !/^[0-9A-Za-z.+-]+$/.test(version)) throw new Error(`${manifest}: "version" is not a version`);
    for (const file of [spec.css, ...(pkg === "catalog" ? components : []), spec.js, ...spec.chunks].filter(Boolean)) {
      const path = join(root, "packages", pkg, "dist", file);
      let integrity;
      try {
        integrity = `sha384-${createHash("sha384").update(readFile(path)).digest("base64")}`;
      } catch {
        const message = `packages/${pkg}/dist/${file} is missing: run pnpm build`;
        if (!dev) throw new Error(message);
        warn(`[docs] ${message}`);
        integrity = PLACEHOLDER;
      }
      entries[`${pkg}/${file}`] = { pkg, version, file, url: `${CDN}/@luz-ds/${pkg}@${version}/dist/${file}`, integrity };
    }
  }
  return { entries, kindFiles: patterns };
}

/* ---- Markup -------------------------------------------------------------- */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** The lines of a snippet; a `null` is a blank line. */
const text = (lines) => lines.map((l) => (l === null ? "" : esc(l))).join("\n");

// The comments inside a snippet are code: English in every language (D7)
const OPTIONAL_SITE = "Optional: one line per catalog component the page uses (here the search), then the patterns of the kind of site. Delete the ones the page does not use.";
const OPTIONAL_SITE_SCRIPT = "Optional, with the search, the cookie banner or the color mode: the script that loads each one";

const linkTag = (e) => `<link rel="stylesheet" href="${e.url}" integrity="${e.integrity}" crossorigin="anonymous">`;
const importLine = (pkg, file) => `import "@luz-ds/${pkg}/${file}";`;

function cdnCode(data, kind) {
  const at = (pkg, file) => data.entries[`${pkg}/${file}`];
  const script = (e) => `<script type="module" src="${e.url}" integrity="${e.integrity}" crossorigin="anonymous"></script>`;
  const lines = [linkTag(at("tokens", FILES.tokens.css)), linkTag(at("core", FILES.core.css))];
  if (kind.patterns) {
    lines.push(`<!-- ${OPTIONAL_SITE} -->`, linkTag(at("catalog", minified(EXAMPLE_COMPONENT))), ...data.kindFiles[kind.patterns].map((file) => linkTag(at("catalog", minified(file)))));
  }
  lines.push(null, "<!-- Optional: copy buttons, tabs, players, the color mode -->", script(at("core", FILES.core.js)));
  if (kind.patterns) lines.push(`<!-- ${OPTIONAL_SITE_SCRIPT} -->`, script(at("catalog", FILES.catalog.js)));
  return text(lines);
}

function npmCode(data, kind) {
  const lines = ['import "@luz-ds/tokens/css";', 'import "@luz-ds/core/css";'];
  if (kind.patterns) {
    lines.push(`// ${OPTIONAL_SITE}`, importLine("catalog", EXAMPLE_COMPONENT), ...data.kindFiles[kind.patterns].map((file) => importLine("catalog", file)));
  }
  lines.push(null, "// Optional: copy buttons, tabs, players, the color mode", 'import "@luz-ds/core";');
  if (kind.patterns) lines.push(`// ${OPTIONAL_SITE_SCRIPT}`, 'import "@luz-ds/catalog";');
  return text(lines);
}

const installCommand = (kind) => `pnpm add ${["@luz-ds/tokens", "@luz-ds/core", ...(kind.patterns ? ["@luz-ds/catalog"] : [])].join(" ")}`;

/**
 * The start of "Copy the markup" on the page of a catalog component: the
 * import of its file for a bundler, then its <link> from the CDN with the
 * hash, each a code block with its copy button. `file` is `components/x.css`;
 * the ids name the component, so a page that needs two files has no id twice.
 */
export function renderComponentLinks(data, file, t = englishT()) {
  const cdn = data.entries[`catalog/${minified(file)}`];
  if (!cdn) throw new Error(`the snippets have no catalog/${minified(file)}: run pnpm build`);
  const npm = importLine("catalog", file);
  const name = file.slice("components/".length, -".css".length);
  const block = (id, label, shown, code) => codeBlock({ id, lang: id.endsWith("npm") ? "js" : "html", label, copy: t("snippets.copy-chunk", { file: shown }), name: t("snippets.name-chunk", { file: shown }), code: esc(code) }, t);
  return [
    block(`load-${name}-npm`, t("snippets.label-bundler"), `@luz-ds/catalog/${file}`, npm),
    block(`load-${name}-cdn`, t("snippets.label-html"), `dist/${minified(file)}`, linkTag(cdn)),
  ].join("\n");
}

/** A code block with its copy button, in the markup of the Install page. */
function codeBlock({ id, lang, label, copy, name, code }, t) {
  return `        <div class="docs-snippet">
          <div class="docs-snippet__bar">
            <span class="docs-snippet__lang">${esc(label)}</span>
            <button class="luz-copy-btn" type="button" data-copy-from="code-${id}" aria-label="${esc(copy)}">${esc(t("snippets.copy"))}</button>
          </div>
          <pre class="luz-code-block" data-lang="${lang}" tabindex="0" role="region" aria-label="${esc(name)}"><code id="code-${id}">${code}</code></pre>
        </div>`;
}

function renderSnippet(data, kind, way, t) {
  const id = `${kind.id}-${way.id}`;
  const label = t(`snippets.kind.${kind.id}`);
  const heading = t(`snippets.way-heading.${way.id}`);
  const open = `      <div data-snippet data-kind="${kind.id}" data-via="${way.id}" id="${id}">\n        <h3>${esc(t("snippets.heading", { kind: label, way: `${heading[0].toLowerCase()}${heading.slice(1)}` }))}</h3>`;
  const lower = label.toLowerCase();
  if (way.id === "npm") {
    const command = installCommand(kind);
    return `${open}
        <div class="docs-command-block">
          <code class="docs-command-block__cmd">
            <span class="docs-command-block__prefix" aria-hidden="true">$</span>
            ${esc(command)}
          </code>
          <button class="luz-copy-btn" type="button" data-copy="${esc(command)}" aria-label="${esc(t("snippets.copy-install", { kind: lower }))}">${esc(t("snippets.copy"))}</button>
        </div>
${codeBlock({ id, lang: "js", label: t("snippets.label-bundler"), copy: t("snippets.copy-bundler", { kind: lower }), name: t("snippets.name-bundler", { kind: lower }), code: npmCode(data, kind) }, t)}
      </div>`;
  }
  return `${open}
${codeBlock({ id, lang: "html", label: t("snippets.label-html"), copy: t("snippets.copy-cdn", { kind: lower }), name: t("snippets.name-cdn", { kind: lower }), code: cdnCode(data, kind) }, t)}
      </div>`;
}

/**
 * The index table, and the picker that replaces it with JavaScript. The picker is
 * inside a <template>: without a script it is not in the page at all (docs.spec.js
 * allows no `hidden` element in main), and the script clones it in (step 6).
 * The region that holds the table carries `data-docs-snippets`, the picker's hook
 * (its name is text in the page's language).
 */
function renderIndex(t) {
  const way = (w) => t(`snippets.way.${w.id}`);
  const rows = KINDS.map((kind) => {
    const label = t(`snippets.kind.${kind.id}`);
    const cell = (w) => {
      const how = w.id === "npm" ? t("snippets.with-npm") : t("snippets.from-cdn");
      return `<td data-label="${esc(way(w))}"><div><a href="#${kind.id}-${w.id}">${esc(label)}, ${esc(how)}</a></div></td>`;
    };
    return `            <tr><th scope="row">${esc(label)}</th>${cell(WAYS[0])}${cell(WAYS[1])}</tr>`;
  });
  return `    <section class="docs-block" aria-labelledby="choose">
      <h2 class="docs-chapter__title" id="choose">${esc(t("snippets.choose"))}</h2>
      <template data-docs-picker>
      <form class="docs-picker">
        <fieldset>
          <legend>${esc(t("snippets.picker-kind"))}</legend>
${KINDS.map((k, i) => `          <label><input type="radio" name="kind" value="${k.id}"${i === 0 ? " checked" : ""}> ${esc(t(`snippets.kind.${k.id}`))}</label>`).join("\n")}
        </fieldset>
        <fieldset>
          <legend>${esc(t("snippets.picker-way"))}</legend>
${WAYS.map((w, i) => `          <label><input type="radio" name="via" value="${w.id}"${i === 0 ? " checked" : ""}> ${esc(way(w))}</label>`).join("\n")}
        </fieldset>
        <output data-picker-status></output>
      </form>
      </template>
      <div class="luz-table-wrap" role="region" data-docs-snippets aria-label="${esc(t("snippets.every"))}" tabindex="0">
        <table class="luz-table">
          <caption>${esc(t("snippets.every"))}</caption>
          <thead>
            <tr><th scope="col">${esc(t("snippets.col-kind"))}</th><th scope="col">${esc(way(WAYS[0]))}</th><th scope="col">${esc(way(WAYS[1]))}</th></tr>
          </thead>
          <tbody>
${rows.join("\n")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderChunks(data, t) {
  const copyBlock = (id, copy, name, code) => `<div class="docs-snippet">
                <div class="docs-snippet__bar">
                  <span class="docs-snippet__lang">${esc(t("snippets.label-html"))}</span>
                  <button class="luz-copy-btn" type="button" data-copy-from="code-${id}" aria-label="${esc(copy)}">${esc(t("snippets.copy"))}</button>
                </div>
                <pre class="luz-code-block" data-lang="html" tabindex="0" role="region" aria-label="${esc(name)}"><code id="code-${id}">${code}</code></pre>
              </div>`;
  const search = data.entries["catalog/search.min.js"];
  const member = (e) => `${JSON.stringify(e.url)}: ${JSON.stringify(e.integrity)}`;
  const chunks = Object.entries(CHUNK_WHEN).map(([file, [pkg, key]]) => ({ file, pkg, when: t(key), e: data.entries[`${pkg}/${file}`] }));
  const rows = chunks.map(({ file, pkg, when, e }) => {
    const id = `chunk-${pkg}-${file.replace(/\.min\.js$/, "")}`;
    return `            <tr>
              <th scope="row"><code>${esc(file)}</code></th>
              <td data-label="${esc(t("snippets.col-when"))}"><div>${when}</div></td>
              <td data-label="${esc(t("snippets.col-line"))}">${copyBlock(id, t("snippets.copy-chunk", { file }), t("snippets.name-chunk", { file }), esc(member(e)))}</td>
            </tr>`;
  });
  const map = `<script type="importmap">\n${JSON.stringify({ integrity: Object.fromEntries(chunks.map(({ e }) => [e.url, e.integrity])) }, null, 2)}\n</script>`;
  return `    <section class="docs-block" aria-labelledby="chunks">
      <h2 class="docs-chapter__title" id="chunks">${esc(t("snippets.chunks-title"))}</h2>
      <p>${t("snippets.chunks-p1")}</p>
      <p>${t("snippets.chunks-p2")}</p>
${copyBlock("chunks-importmap", t("snippets.copy-importmap"), t("snippets.name-importmap"), esc(map)).replace(/^/, "      ")}
      <p>${t("snippets.chunks-p3")}</p>
${copyBlock("chunks-hint", t("snippets.copy-hint"), t("snippets.name-hint"), esc(`<link rel="modulepreload" href="${search.url}" integrity="${search.integrity}" crossorigin="anonymous">`)).replace(/^/, "      ")}
      <p>${t("snippets.chunks-p4")}</p>
      <div class="luz-table-wrap" role="region" aria-label="${esc(t("snippets.chunks-title"))}" tabindex="0">
        <table class="luz-table">
          <caption>${esc(t("snippets.chunks-title"))}</caption>
          <thead>
            <tr><th scope="col">${esc(t("snippets.col-file"))}</th><th scope="col">${esc(t("snippets.col-when"))}</th><th scope="col">${esc(t("snippets.col-line"))}</th></tr>
          </thead>
          <tbody>
${rows.join("\n")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderVerify(t) {
  return `    <section class="docs-block" aria-labelledby="verify">
      <h2 class="docs-chapter__title" id="verify">${esc(t("snippets.verify-title"))}</h2>
      <p>${t("snippets.verify-p1")}</p>
      <div class="docs-snippet">
        <div class="docs-snippet__bar">
          <span class="docs-snippet__lang">${esc(t("snippets.label-shell"))}</span>
          <button class="luz-copy-btn" type="button" data-copy-from="code-verify" aria-label="${esc(t("snippets.verify-copy"))}">${esc(t("snippets.copy"))}</button>
        </div>
        <pre class="luz-code-block" data-lang="text" tabindex="0" role="region" aria-label="${esc(t("snippets.verify-name"))}"><code id="code-verify">${esc("curl -s <url of the file> | openssl dgst -sha384 -binary | openssl base64 -A")}</code></pre>
      </div>
      <p>${t("snippets.verify-p2")}</p>
    </section>`;
}

/**
 * The HTML of the page: the index table (and the form that JavaScript reveals), a
 * section per kind with its two snippets, the chunks and the note on verifying.
 * `t` reads the words of the page (English by default).
 */
export function renderSnippets(data, t = englishT()) {
  const sections = KINDS.map(
    (kind) => `    <section data-snippet-kind="${kind.id}" aria-labelledby="${kind.id}">
      <h2 class="docs-chapter__title" id="${kind.id}">${esc(t(`snippets.kind.${kind.id}`))}</h2>
${WAYS.map((way) => renderSnippet(data, kind, way, t)).join("\n")}
    </section>`,
  );
  return [renderIndex(t), ...sections, renderChunks(data, t), renderVerify(t)].join("\n");
}
