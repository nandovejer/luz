/**
 * The snippet generator (F4 step 5, spec f4-customisation.md 3.4): the page
 * "Choose your snippet" is written by scripts/docs-site/snippets.js from the
 * files that npm pack ships, so a hash and a version can never be typed by hand.
 *
 *   snippetData({ root, readFile })  reads each package's package.json and the
 *                                    dist files of the table of 3.4.1
 *   renderSnippets(data)             pure: the HTML of 3.4.2 (the index table,
 *                                    the ten snippets, the chunks table)
 *
 * The checks read the rendered HTML, not the shape of `data`: that is what a
 * reader copies. Two roots are used: the repository (the real dist/, the real
 * pack-files.txt) and a fixture root with a distinct version and distinct
 * content per file, so a version or a hash taken from the wrong place fails.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { renderSnippets, snippetData } from "../scripts/docs-site/snippets.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- What the spec fixes (3.4.1): files per package, the ten ids -------- */

/**
 * The files a snippet of a kind of site links after the example, in the order of the cascade (CASCADE of kinds.js): the stylesheets of
 * the catalog pages that name the kind in `fits-kinds`, or `any` (F8: named for their blocks; the pieces that fit any site, the navbar, and
 * the sidebar, the terminal and the timeline of F7 come with them). The header and the footer are the landing page's and the blog's.
 * Landing and blog link the sidebar's file too, before their headers: the nav toggle of the site header and of the masthead is defined there.
 */
const KIND_FILES = {
  landing: ["navbar", "sidebar", "timeline", "site-header", "hero", "main", "section", "stat", "site-footer", "glow"],
  blog: ["navbar", "sidebar", "timeline", "site-header", "masthead", "site-footer", "page-header", "article-header", "article"],
  app: ["navbar", "sidebar", "app-bar", "dashboard"],
  docs: ["navbar", "sidebar", "terminal", "docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"],
};
const FILES = {
  tokens: ["luz-tokens.min.css"],
  // F7: the timeline chunk is catalog's, with the sidebar's
  core: ["luz.min.css", "luz.min.js", "midi.min.js", "table-sort.min.js", "i18n-es.min.js"],
  // Catalog has no bundle (F5a): one stylesheet per component, plain and minified, and the scripts
  catalog: [
    "components/search.css", "components/search.min.css", "components/cookie-consent.css", "components/cookie-consent.min.css", "components/announcement.css", "components/announcement.min.css",
    // the sheets of the pages of catalog that name a kind (the four layout components of F7 are among them) and the three more the docs' own pages list
    ...[...new Set(Object.values(KIND_FILES).flat())].flatMap((name) => [`components/${name}.css`, `components/${name}.min.css`]),
    "catalog.min.js", "search.min.js", "cookie-consent.min.js", "color-mode.min.js", "timeline.min.js", "sidebar.min.js",
  ],
};
/** The kind a snippet is for, and the kind of its patterns (F8: the same word, `blog` for a blog): null for the one with none. */
const KIND_PATTERNS = { atoms: null, landing: "landing", blog: "blog", app: "app", docs: "docs" };
const KINDS = Object.keys(KIND_PATTERNS);
const IDS = KINDS.flatMap((k) => [`${k}-npm`, `${k}-cdn`]);

/** The manifests of catalog's dist: the stylesheet of each element and the files of each class. */
const CATALOG_MANIFESTS = {
  "classes.json": {
    schema: 1,
    package: "@luz-ds/catalog",
    version: "1.0.0",
    classes: [
      { name: "luz-search", kind: "component", layer: "luz.catalog", files: ["components/search.css"], defined: true, block: "luz-search" },
      { name: "luz-cookie-consent", kind: "component", layer: "luz.catalog", files: ["components/cookie-consent.css"], defined: true, block: "luz-cookie-consent" },
      // the patterns of the four kinds of site: one file each (the generator reads the pages of catalog, kinds.js, and checks the files against these)
      ...[...new Set(Object.values(KIND_FILES).flat())].map((name) => ({ name: `luz-${name}`, kind: "component", layer: "luz.catalog", files: [`components/${name}.css`], defined: true, block: `luz-${name}` })),
    ],
    properties: [],
  },
  "custom-elements.json": {
    schemaVersion: "2.1.0",
    modules: [
      { kind: "javascript-module", path: "components/announcement.css", declarations: [{ kind: "class", name: "LuzAnnouncement", customElement: true, tagName: "luz-announcement", stylesheet: "components/announcement.css" }] },
      { kind: "javascript-module", path: "search.js", declarations: [{ kind: "class", name: "LuzSearch", customElement: true, tagName: "luz-search", stylesheet: "components/search.css" }] },
    ],
  },
};

/** Catalog is linked a component at a time: any `components/<name>.min.css` of the package is the example. */
const CATALOG_SHEET = /^components\/[a-z0-9-]+\.min\.css$/;
/** A file of the kind of site: the stylesheets its snippet links after the example, named exactly. */
const PATTERN_SHEET = new RegExp(`^components/(?:${[...new Set(Object.values(KIND_FILES).flat())].join("|")})\\.min\\.css$`);
/** The example component is `catalog/components/*`: which one the snippet shows is the generator's choice; a pattern is its file. */
const shape = (pkg, file) => (pkg === "catalog" && !PATTERN_SHEET.test(file) && (CATALOG_SHEET.test(file) || file === "components/*.min.css") ? "catalog/components/*.min.css" : `${pkg}/${file}`);

/** What each CDN snippet loads, in order: stylesheets then scripts. */
const cdnFor = (kind) => {
  const prefix = KIND_PATTERNS[kind];
  const withSite = prefix !== null;
  return {
    // tokens, core, one catalog component as the example, then every pattern of the kind, in the order of the cascade
    css: [["tokens", "luz-tokens.min.css"], ["core", "luz.min.css"], ...(withSite ? [["catalog", "components/*.min.css"], ...KIND_FILES[prefix].map((name) => ["catalog", `components/${name}.min.css`])] : [])],
    js: [["core", "luz.min.js"], ...(withSite ? [["catalog", "catalog.min.js"]] : [])],
  };
};

/* ---- The two roots ------------------------------------------------------- */

const temps = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A root with every file of FILES, each with its own content and a version of its own. */
function fixtureRoot({ without = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "luz-snippets-"));
  temps.push(root);
  Object.entries(FILES).forEach(([pkg, files], i) => {
    const dir = join(root, "packages", pkg);
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: `@luz-ds/${pkg}`, version: `${i + 3}.${i + 7}.${i + 11}` }));
    for (const file of files) {
      if (without.includes(file)) continue;
      mkdirSync(dirname(join(dir, "dist", file)), { recursive: true });
      writeFileSync(join(dir, "dist", file), `/* ${pkg}/${file}: ${"x".repeat(i + 5)} */\n`);
    }
  });
  for (const [name, manifest] of Object.entries(CATALOG_MANIFESTS)) writeFileSync(join(root, "packages/catalog/dist", name), JSON.stringify(manifest));
  // The patterns of a kind are the catalog pages that name it in `fits-kinds` (F8, decision 72): the pages of the root are the repository's
  mkdirSync(join(root, "apps/docs/pages"), { recursive: true });
  cpSync(join(repo, "apps/docs/pages/catalog"), join(root, "apps/docs/pages/catalog"), { recursive: true });
  return root;
}

/** `readFile(path)` of the API: absolute (or relative to the root), returns the bytes. */
const readerOf = (root) => (path, encoding) => readFileSync(isAbsolute(path) ? path : join(root, path), encoding);

const build = (root) => renderSnippets(snippetData({ root, readFile: readerOf(root) }));

const fixture = fixtureRoot();
const ROOTS = [
  ["the repository", repo],
  ["a fixture root", fixture],
];

/* ---- Reading the rendered HTML ------------------------------------------- */

const unescape = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** The text of `<code id="code-<id>">`, tags of a highlighter removed, entities decoded. */
const codeOf = (html, id) => {
  const m = new RegExp(`<code[^>]*\\bid="code-${id}"[^>]*>([\\s\\S]*?)</code>`).exec(html);
  return m ? unescape(m[1].replace(/<[^>]+>/g, "")) : null;
};

/** The `link` and `script` tags of a text: their attributes. */
const tagsOf = (text) =>
  [...text.matchAll(/<(link|script)\b([^>]*)>/g)].map(([, tag, attrs]) => {
    const a = Object.fromEntries([...attrs.matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    return { tag, ...a, url: a.href ?? a.src };
  });

const URL_RE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/([a-z]+)@([^/]+)\/dist\/((?:components\/)?[^/]+)$/;
const parts = (url) => {
  const m = URL_RE.exec(url ?? "");
  expect(m, `${url} is https://cdn.jsdelivr.net/npm/@luz-ds/<pkg>@<version>/dist/<file>`).not.toBeNull();
  return { pkg: m[1], version: m[2], file: m[3] };
};

const sri = (root, pkg, file) => `sha384-${createHash("sha384").update(readFileSync(join(root, "packages", pkg, "dist", file))).digest("base64")}`;
const versionOf = (root, pkg) => JSON.parse(readFileSync(join(root, "packages", pkg, "package.json"), "utf-8")).version;

/** The markup of one snippet: from its opening tag to the next snippet or the end of its section. */
const snippetOf = (html, id) => {
  const at = html.search(new RegExp(`\\bid="${id}"`));
  expect(at, `#${id} exists`).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<", at);
  const afterOpen = html.indexOf(">", start) + 1;
  const next = html.slice(afterOpen).search(/data-snippet\b|<\/section>/);
  return html.slice(start, next < 0 ? undefined : afterOpen + next);
};

/** Every `<code>` of the page, decoded: where the modulepreload lines are. */
const allCode = (html) => [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)].map((m) => unescape(m[1].replace(/<[^>]+>/g, "")));

/* ---- The tests ----------------------------------------------------------- */

describe("the snippet generator", () => {
  it("renders the same HTML from the same data twice (renderSnippets is pure)", () => {
    const data = snippetData({ root: fixture, readFile: readerOf(fixture) });
    expect(typeof renderSnippets(data)).toBe("string");
    expect(renderSnippets(data)).toBe(renderSnippets(data));
    expect(renderSnippets(snippetData({ root: fixture, readFile: readerOf(fixture) }))).toBe(renderSnippets(data));
  });

  it("has the ten snippets, each an element with its id, data-snippet, data-kind and data-via", () => {
    const html = build(fixture);
    for (const id of IDS) {
      expect(html.match(new RegExp(`\\bid="${id}"`, "g"))?.length, `#${id} once`).toBe(1);
      const [kind, via] = id.split("-");
      const open = snippetOf(html, id).match(/^<[^>]*>/)[0];
      expect(open, id).toMatch(/\bdata-snippet\b/);
      expect(open, id).toContain(`data-kind="${kind}"`);
      expect(open, id).toContain(`data-via="${via}"`);
      expect(codeOf(html, id), `${id} has its code block`).not.toBeNull();
    }
  });

  it("has an index table that links to each of the ten snippets", () => {
    const html = build(fixture);
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0] ?? "";
    for (const id of IDS) {
      expect(table, `the table links to #${id}`).toContain(`href="#${id}"`);
      expect(html, `#${id} is an element`).toMatch(new RegExp(`\\bid="${id}"`));
    }
  });

  it("has a section of its own for the chunks", () => {
    expect(build(fixture)).toMatch(/\bid="chunks"/);
  });

  for (const [label, root] of ROOTS) {
    describe(`with ${label}`, () => {
      const html = build(root);

      for (const kind of KINDS) {
        it(`${kind}, from a CDN: the files of its table, tokens then core then catalog's example then the patterns of the kind, every line with its own hash`, () => {
          const tags = tagsOf(codeOf(html, `${kind}-cdn`));
          const want = cdnFor(kind);
          const sheets = tags.filter((t) => t.tag === "link");
          const scripts = tags.filter((t) => t.tag === "script");
          expect(sheets.map((t) => shape(parts(t.url).pkg, parts(t.url).file))).toEqual(want.css.map(([p, f]) => shape(p, f)));
          expect(scripts.map((t) => `${parts(t.url).pkg}/${parts(t.url).file}`)).toEqual(want.js.map(([p, f]) => `${p}/${f}`));
          for (const t of sheets) expect(t.rel, t.url).toBe("stylesheet");
          for (const t of scripts) expect(t.type, t.url).toBe("module");
          for (const t of tags) {
            const { pkg, version, file } = parts(t.url);
            expect(version, `${t.url}: the version of the package`).toBe(versionOf(root, pkg));
            expect(t.integrity, `${t.url}: sha384 of packages/${pkg}/dist/${file}`).toBe(sri(root, pkg, file));
            expect(t.crossorigin, t.url).toBe("anonymous");
          }
        });

        it(`${kind}, with npm: install command and imports in layer order, core's script after the styles`, () => {
          const prefix = KIND_PATTERNS[kind];
          const el = snippetOf(html, `${kind}-npm`);
          // The patterns of a kind are catalog's files: the command is the three packages, never a fourth
          const add = ["@luz-ds/tokens", "@luz-ds/core", ...(prefix ? ["@luz-ds/catalog"] : [])];
          expect(el).toContain(`data-copy="pnpm add ${add.join(" ")}"`);
          const code = codeOf(html, `${kind}-npm`);
          const imports = [...code.matchAll(/\bimport\s+["']([^"']+)["']/g)].map((m) => m[1]);
          const css = imports.filter((s) => s.endsWith(".css") || s.endsWith("/css"));
          // catalog has no `/css`: its first line is one component's file (the example), then the file of each pattern of the kind
          const want = ["@luz-ds/tokens/css", "@luz-ds/core/css", ...(prefix ? ["@luz-ds/catalog/components/*.css", ...KIND_FILES[prefix].map((name) => `@luz-ds/catalog/components/${name}.css`)] : [])];
          expect(css.map((s) => (/^@luz-ds\/catalog\/components\/[a-z0-9-]+\.css$/.test(s) && !PATTERN_SHEET.test(`${s.slice("@luz-ds/catalog/".length).replace(/\.css$/, ".min.css")}`) ? "@luz-ds/catalog/components/*.css" : s))).toEqual(want);
          expect(css, "no import of a catalog bundle").not.toContain("@luz-ds/catalog/css");
          expect(code, "no import of a package of a kind").not.toMatch(/@luz-ds\/(?:landing|cms|app|docs)(?![\w-])/);
          const js = imports.filter((s) => !s.endsWith("/css") && !s.endsWith(".css")).sort();
          expect(js).toEqual(prefix ? ["@luz-ds/catalog", "@luz-ds/core"] : ["@luz-ds/core"]);
        });
      }

      it("marks the catalog lines of landing, blog, app and docs as optional, in both ways of loading", () => {
        for (const kind of KINDS.filter((k) => KIND_PATTERNS[k])) {
          for (const via of ["npm", "cdn"]) expect(codeOf(html, `${kind}-${via}`), `${kind}-${via}`).toMatch(/optional/i);
        }
      });

      it("keeps modulepreload out of the ten snippets: a chunk is fetched only by the page that needs it", () => {
        for (const id of IDS) expect(codeOf(html, id), id).not.toMatch(/modulepreload/);
      });

      // SEC-CHUNK-4, M1 of the Safari and Firefox reviews (2026-10-16): `modulepreload` with
      // `integrity` is not a guard in WebKit and Firefox. The full-SRI path is an import map
      // with an `integrity` section, which blocks a tampered chunk in all three engines.
      const chunkSection = () => html.slice(html.search(/\bid="chunks"/));
      const budgetedChunks = () => {
        const budgets = JSON.parse(readFileSync(join(repo, "budgets.json"), "utf-8")).budgets;
        return budgets.filter((b) => /lazy chunk:/.test(b.name)).map((b) => b.file.replace(/^packages\//, ""));
      };

      it("gives, in the chunks section, one import map whose integrity lists exactly the lazy chunks that budgets.json budgets, each with its version and sha384", () => {
        const budgeted = budgetedChunks();
        expect(budgeted.length).toBe(8); // core: midi, table-sort, i18n-es; catalog: search, cookie-consent, color-mode, timeline, sidebar (the last two came from core in F7)
        expect(budgeted).toContain("catalog/dist/timeline.min.js");
        expect(budgeted).toContain("catalog/dist/sidebar.min.js");
        expect(budgeted).not.toContain("core/dist/timeline.min.js");
        const block = codeOf(html, "chunks-importmap");
        expect(block, "a code block #code-chunks-importmap in the chunks section").not.toBeNull();
        expect(chunkSection()).toContain('id="code-chunks-importmap"');
        const m = /^\s*<script type="importmap">\s*([\s\S]*?)\s*<\/script>\s*$/.exec(block);
        expect(m, "a <script type=\"importmap\"> element").not.toBeNull();
        const map = JSON.parse(m[1]);
        expect(Object.keys(map), "only the integrity section").toEqual(["integrity"]);
        const listed = Object.keys(map.integrity).map((url) => {
          const { pkg, file } = parts(url);
          return `${pkg}/dist/${file}`;
        });
        expect(listed.sort()).toEqual([...budgeted].sort());
        for (const [url, hash] of Object.entries(map.integrity)) {
          const { pkg, version, file } = parts(url);
          expect(version, url).toBe(versionOf(root, pkg));
          expect(hash, url).toBe(sri(root, pkg, file));
          expect(hash, url).toMatch(/^sha384-/);
        }
      });

      it("gives each chunk's row the import map member to add: \"<url>\": \"<sha384>\", with the same hash", () => {
        const section = chunkSection();
        for (const rel of budgetedChunks()) {
          const [pkg, , file] = rel.split("/");
          const line = codeOf(html, `chunk-${pkg}-${file.replace(/\.min\.js$/, "")}`);
          expect(line, `${rel} row`).not.toBeNull();
          const member = JSON.parse(`{${line.trim().replace(/,$/, "")}}`);
          const entries = Object.entries(member);
          expect(entries, rel).toHaveLength(1);
          const [url, hash] = entries[0];
          expect(parts(url), rel).toMatchObject({ pkg, file });
          expect(hash, rel).toBe(sri(root, pkg, file));
        }
        // each row says when to add the line
        for (const element of ["luz-timeline", "luz-search", "luz-cookie-consent", "luz-color-mode", "luz-sidebar"]) expect(section, element).toContain(element);
      });

      it("calls the import map the way to check a chunk, and modulepreload only a performance hint (it does not block a bad file in Safari and Firefox)", () => {
        const text = unescape(chunkSection().split(/<table/)[0].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
        expect(text).toMatch(/import map/i);
        expect(text).toMatch(/performance hint/i);
        expect(text).not.toMatch(/never runs|wrong hash never|uses? (that|the) (verdict|result)/i);
        // the block comes before a table of members: the map itself is shown whole
        expect(chunkSection().indexOf('id="code-chunks-importmap"')).toBeLessThan(chunkSection().indexOf("<table"));
      });

      it("says, in the row of the Spanish file, to add its line only on a page whose lang is es (F6)", () => {
        const section = chunkSection();
        const row = section.split(/<tr>/).find((r) => r.includes("<code>i18n-es.min.js</code>"));
        expect(row, "a row for i18n-es.min.js in the chunks table").toBeTruthy();
        const when = unescape(row.match(/data-label="Add the line only if the page has"[^>]*>([\s\S]*?)<\/td>/)?.[1].replace(/<[^>]+>/g, "") ?? "");
        expect(when).toMatch(/\blang\b/);
        expect(when).toMatch(/\bes\b/);
        expect(when).toMatch(/\bpage\b/);
        // the line itself, like every chunk's: a member of the import map's integrity section
        const line = unescape(row.match(/<code id="code-chunk-core-i18n-es"[^>]*>([\s\S]*?)<\/code>/)?.[1] ?? "");
        expect(line).toContain("i18n-es.min.js");
        expect(line).not.toContain("modulepreload");
        expect(Object.values(JSON.parse(`{${line.trim().replace(/,$/, "")}}`))[0]).toMatch(/^sha384-/);
      });
    });
  }

  it("links one file of a catalog component as the example, then the files of the kind's patterns, all of them files its manifests list, never catalog.min.css", () => {
    const html = build(fixture);
    const known = new Set(CATALOG_MANIFESTS["custom-elements.json"].modules.flatMap((m) => m.declarations.map((d) => d.stylesheet)).concat(CATALOG_MANIFESTS["classes.json"].classes.flatMap((c) => c.files)));
    for (const kind of KINDS.filter((k) => KIND_PATTERNS[k])) {
      const catalog = tagsOf(codeOf(html, `${kind}-cdn`)).filter((t) => t.tag === "link" && parts(t.url).pkg === "catalog");
      const files = catalog.map((t) => parts(t.url).file);
      expect(files, `${kind}: the example, then the patterns of the kind`).toHaveLength(1 + KIND_FILES[KIND_PATTERNS[kind]].length);
      expect(CATALOG_SHEET.test(files[0]) && !PATTERN_SHEET.test(files[0]), `${files[0]} is the example component`).toBe(true);
      expect(files.slice(1), `${kind}: the patterns, in the order of the cascade`).toEqual(KIND_FILES[KIND_PATTERNS[kind]].map((name) => `components/${name}.min.css`));
      if (kind === "landing" || kind === "blog") {
        // the nav toggle of the headers is defined in the sidebar's file, so it is linked before them
        const header = files.indexOf("components/site-header.min.css");
        const masthead = files.indexOf("components/masthead.min.css");
        expect(files.indexOf("components/sidebar.min.css"), `${kind}: the sidebar is linked`).toBeGreaterThan(-1);
        expect(files.indexOf("components/sidebar.min.css"), `${kind}: the sidebar before the site header`).toBeLessThan(header);
        if (kind === "blog") expect(files.indexOf("components/sidebar.min.css"), "blog: the sidebar before the masthead").toBeLessThan(masthead);
      }
      for (const file of files) expect(known.has(file.replace(".min.css", ".css")), `${file} is a stylesheet the manifests of catalog list`).toBe(true);
      expect(codeOf(html, `${kind}-npm`), `${kind}-npm`).not.toMatch(/@luz-ds\/catalog\/(?:css|print\.css)/);
      expect(codeOf(html, `${kind}-cdn`), `${kind}-cdn`).not.toMatch(/catalog\.min\.css|print\.css/);
      expect(codeOf(html, `${kind}-cdn`), `${kind}-cdn`).not.toMatch(/@luz-ds\/(?:landing|cms|app|docs)@/);
    }
  });

  it("takes each version from its own package.json: the three fixture versions are all different, and a pattern has catalog's", () => {
    const html = build(fixture);
    const versions = new Set(tagsOf(codeOf(html, "app-cdn")).map((t) => parts(t.url).version));
    expect(versions.size).toBe(3); // tokens, core, catalog: there is no package of a kind
    for (const pkg of ["tokens", "core", "catalog"]) expect(versions.has(versionOf(fixture, pkg)), pkg).toBe(true);
    const docs = tagsOf(codeOf(html, "docs-cdn")).filter((t) => t.tag === "link" && PATTERN_SHEET.test(parts(t.url).file));
    expect(docs).toHaveLength(KIND_FILES.docs.length);
    for (const t of docs) expect(parts(t.url).version, t.url).toBe(versionOf(fixture, "catalog"));
  });

  it("lists only files that each package ships (pack-files.txt), so a renamed file fails here", () => {
    const html = build(repo);
    const shipped = Object.fromEntries(
      Object.keys(FILES).map((pkg) => [pkg, new Set(readFileSync(join(repo, "packages", pkg, "pack-files.txt"), "utf-8").split("\n").map((l) => l.trim()))]),
    );
    const urls = new Set(allCode(html).flatMap(tagsOf).map((t) => t.url).filter(Boolean));
    expect(urls.size).toBeGreaterThanOrEqual(9);
    for (const url of urls) {
      const { pkg, file } = parts(url);
      expect(shipped[pkg]?.has(`dist/${file}`), `${url} is in packages/${pkg}/pack-files.txt`).toBe(true);
    }
  });

  describe("a file that is missing", () => {
    for (const file of ["luz-tokens.min.css", "search.min.js"]) {
      it(`fails with the file name and "run pnpm build" (${file})`, () => {
        const root = fixtureRoot({ without: [file] });
        expect(() => snippetData({ root, readFile: readerOf(root) })).toThrow(new RegExp(`${file.replace(/\./g, "\\.")}[\\s\\S]*run pnpm build|run pnpm build[\\s\\S]*${file.replace(/\./g, "\\.")}`));
      });
    }
  });
});

/* ---- Nothing is typed: hashes, and the Install page's lines ----------------- */

describe("the hashes and URLs of the docs are never typed", () => {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

  it("has no sha384- followed by 64 base64 characters in apps/docs/pages/ or in a README", () => {
    const files = [
      ...walk(join(repo, "apps/docs/pages")),
      join(repo, "README.md"),
      ...readdirSync(join(repo, "packages"))
        .map((p) => join(repo, "packages", p, "README.md"))
        .filter(existsSync),
    ];
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const typed = readFileSync(file, "utf-8").match(/sha384-[A-Za-z0-9+/]{64}/g);
      expect(typed, file).toBeNull();
    }
  });

  describe("the Install page", () => {
    const raw = readFileSync(join(repo, "apps/docs/pages/get-started/index.html"), "utf-8");
    const source = unescape(raw);
    const html = build(repo);
    const urlsOf = (text) => tagsOf(text).map((t) => t.url);

    it("uses only URLs the generator writes: same package, same version, same file", () => {
      const generated = new Set(allCode(html).flatMap((c) => c.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/[^\s"'<>]+/g) ?? []));
      const typed = source.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/[^\s"'<>]+/g) ?? [];
      expect(typed.length).toBeGreaterThan(10);
      for (const url of new Set(typed)) expect(generated.has(url), `${url} is a generated URL`).toBe(true);
    });

    it("loads in each block the generated lines without integrity: level 2 is Components only, the block of the kinds is a landing page's", () => {
      const block = (id) => {
        const text = codeOf(raw, id);
        expect(text, `#code-${id} on the Install page`).toBeTruthy();
        return urlsOf(text);
      };
      const isSubsequence = (small, big) => {
        let i = 0;
        for (const x of big) if (x === small[i]) i++;
        return i === small.length;
      };
      const generated = (kind) => {
        const { css, js } = cdnFor(kind);
        return urlsOf(codeOf(html, `${kind}-cdn`)).filter((u) => [...css, ...js].some(([p, f]) => shape(parts(u).pkg, parts(u).file) === shape(p, f)));
      };
      // the same lines in the same order, for the one block that is a whole kind
      expect(block("cdn-level-2")).toEqual(generated("atoms"));
      for (const [id, kind] of [["cdn-kinds", "landing"]]) {
        expect(isSubsequence(block(id), generated(kind)), `${id} is lines of the ${kind} snippet, in its order`).toBe(true);
      }
      // F5b: the blocks of the four packages are gone from the page
      for (const id of ["cdn-landing", "cdn-cms", "cdn-app", "cdn-docs"]) expect(codeOf(raw, id), `#code-${id} is gone`).toBeNull();
    });

    it("gives the install commands the generator gives", () => {
      const commands = new Set([...source.matchAll(/data-copy="(pnpm add [^"]+)"/g)].map((m) => m[1]));
      for (const kind of KINDS) {
        const add = `pnpm add ${["@luz-ds/tokens", "@luz-ds/core", ...(KIND_PATTERNS[kind] ? ["@luz-ds/catalog"] : [])].join(" ")}`;
        expect(commands.has(add), add).toBe(true);
        expect(snippetOf(html, `${kind}-npm`)).toContain(`data-copy="${add}"`);
      }
    });
  });
});
