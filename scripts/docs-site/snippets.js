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
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import { englishT } from "./strings.js";

/** The files of each package that a snippet or the chunks table names (spec 3.4.1). */
export const FILES = {
  tokens: { css: "luz-tokens.min.css", js: null, chunks: [] },
  core: { css: "luz.min.css", js: "luz.min.js", chunks: ["midi.min.js", "table-sort.min.js", "timeline.min.js", "i18n-es.min.js"] },
  site: { css: "site.min.css", js: "site.min.js", chunks: ["search.min.js", "consent.min.js", "mode.min.js"] },
  landing: { css: "landing.min.css", js: null, chunks: [] },
  cms: { css: "cms.min.css", js: null, chunks: [] },
  app: { css: "app.min.css", js: null, chunks: [] },
  docs: { css: "docs.min.css", js: null, chunks: [] },
};

/** What the reader is building: its id and the package that is its kind (null: none); its words are `snippets.kind.<id>`. */
export const KINDS = [
  { id: "atoms", pkg: null },
  { id: "landing", pkg: "landing" },
  { id: "blog", pkg: "cms" },
  { id: "app", pkg: "app" },
  { id: "docs", pkg: "docs" },
];

/** How it is loaded; its words are `snippets.way.<id>` and `snippets.way-heading.<id>`. */
export const WAYS = [{ id: "npm" }, { id: "cdn" }];

/** The chunks: where each is loaded from, and the catalog key that says when a page needs its line. */
const CHUNK_WHEN = {
  "midi.min.js": ["core", "snippets.when.midi"],
  "table-sort.min.js": ["core", "snippets.when.table-sort"],
  "timeline.min.js": ["core", "snippets.when.luz-timeline"],
  "i18n-es.min.js": ["core", "snippets.when.i18n-es"],
  "search.min.js": ["site", "snippets.when.luz-search"],
  "consent.min.js": ["site", "snippets.when.luz-consent"],
  "mode.min.js": ["site", "snippets.when.luz-mode"],
};

const CDN = "https://cdn.jsdelivr.net/npm";
const PLACEHOLDER = "sha384-(run pnpm build)";

/**
 * Read every file of FILES.
 * `root`: the repository; `readFile(path, encoding?)`: the bytes (a Buffer without an
 * encoding); `dev`: warn about a missing dist file instead of throwing; `warn`: where.
 * Returns { entries }: "<pkg>/<file>" → { pkg, version, file, url, integrity }.
 */
export function snippetData({ root, readFile, dev = false, warn = console.warn }) {
  const entries = {};
  for (const [pkg, spec] of Object.entries(FILES)) {
    const manifest = join(root, "packages", pkg, "package.json");
    let version;
    try {
      version = JSON.parse(readFile(manifest, "utf-8")).version;
    } catch (error) {
      throw new Error(`the snippets need ${manifest}: ${error.message}`);
    }
    if (typeof version !== "string" || !/^[0-9A-Za-z.+-]+$/.test(version)) throw new Error(`${manifest}: "version" is not a version`);
    for (const file of [spec.css, spec.js, ...spec.chunks].filter(Boolean)) {
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
  return { entries };
}

/* ---- Markup -------------------------------------------------------------- */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** The lines of a snippet; a `null` is a blank line. */
const text = (lines) => lines.map((l) => (l === null ? "" : esc(l))).join("\n");

// The comments inside a snippet are code: English in every language (D7)
const OPTIONAL_SITE = "Optional: site adds the search, the cookie banner and the language switch. Delete the site lines if the page has none of them.";
const OPTIONAL_SITE_SCRIPT = "Optional, with the site stylesheet: the search and the cookie banner";

function cdnCode(data, kind) {
  const at = (pkg, file) => data.entries[`${pkg}/${file}`];
  const link = (e) => `<link rel="stylesheet" href="${e.url}" integrity="${e.integrity}" crossorigin="anonymous">`;
  const script = (e) => `<script type="module" src="${e.url}" integrity="${e.integrity}" crossorigin="anonymous"></script>`;
  const lines = [link(at("tokens", FILES.tokens.css)), link(at("core", FILES.core.css))];
  if (kind.pkg) {
    lines.push(`<!-- ${OPTIONAL_SITE} -->`, link(at("site", FILES.site.css)), link(at(kind.pkg, FILES[kind.pkg].css)));
  }
  lines.push(null, "<!-- Optional: copy buttons, tabs, players, the color mode -->", script(at("core", FILES.core.js)));
  if (kind.pkg) lines.push(`<!-- ${OPTIONAL_SITE_SCRIPT} -->`, script(at("site", FILES.site.js)));
  return text(lines);
}

function npmCode(kind) {
  const lines = ['import "@luz-ds/tokens/css";', 'import "@luz-ds/core/css";'];
  if (kind.pkg) {
    lines.push(`// ${OPTIONAL_SITE}`, 'import "@luz-ds/site/css";', `import "@luz-ds/${kind.pkg}/css";`);
  }
  lines.push(null, "// Optional: copy buttons, tabs, players, the color mode", 'import "@luz-ds/core";');
  if (kind.pkg) lines.push(`// ${OPTIONAL_SITE_SCRIPT}`, 'import "@luz-ds/site";');
  return text(lines);
}

const installCommand = (kind) => `pnpm add ${["@luz-ds/tokens", "@luz-ds/core", ...(kind.pkg ? ["@luz-ds/site", `@luz-ds/${kind.pkg}`] : [])].join(" ")}`;

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
    const note = kind.pkg ? `\n        <p>${t("snippets.site-note")}</p>` : "";
    return `${open}
        <div class="docs-command-block">
          <code class="docs-command-block__cmd">
            <span class="docs-command-block__prefix" aria-hidden="true">$</span>
            ${esc(command)}
          </code>
          <button class="luz-copy-btn" type="button" data-copy="${esc(command)}" aria-label="${esc(t("snippets.copy-install", { kind: lower }))}">${esc(t("snippets.copy"))}</button>
        </div>${note}
${codeBlock({ id, lang: "js", label: t("snippets.label-bundler"), copy: t("snippets.copy-bundler", { kind: lower }), name: t("snippets.name-bundler", { kind: lower }), code: npmCode(kind) }, t)}
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
  const search = data.entries["site/search.min.js"];
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
