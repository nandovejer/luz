/**
 * F5b and F8 of .claude/plans/ai-and-catalog-only.md (decisions 1, 2, 51 to 58 and 65 to 74): the patterns of a
 * landing page, a blog, a web application and a documentation site are components of @luz-ds/catalog, one
 * stylesheet each, named for what the piece is (`components/<block>.css`, F8: the kind of site is no longer in the
 * name, the page says it in `fits-kinds`); `@luz-ds/landing`, `cms`, `app` and `docs` and their layers are gone.
 * Sources are read as text and the docs site is read with the generator; no browser.
 *
 *   - the 20 files: sources, dist (plain and minified), the layer, the tarball list, the size row; the 21 files
 *     of F5b (`landing-hero.css`…) and the old chunks are gone
 *   - classes.json: each pattern's classes map to its file, in luz.catalog; no class of the old names
 *   - the four packages do not exist, and no list, script or config names them
 *   - the docs: a page per pattern at /docs/catalog/<block>/, the `files:` of each, the groups, the old
 *     areas and routes (of F5b and of F8) gone, nothing of the docs still names a removed package
 *   - "Fits best" (decision 71): the front matter, the rules of the generator, the line on a page and on a card
 *   - the migration changeset
 *
 * What other files of tests/ say about this model (layers, class-manifest, check-*, prompts, snippets…) is
 * in those files: this one holds what has no other home.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { LAYER_ORDER } from "../scripts/luz-layers.js";
import * as packages from "../scripts/luz-packages.js";
import { buildSite, parseFrontMatter, renderPage, scanSite } from "../scripts/docs-site/site.js";
import { parseTranslation } from "../scripts/docs-site/docs-i18n.js";
import { cleanupFixtures, docsI18nFixture, pageSource } from "./helpers/docs-i18n-fixture.js";
import { findAll, hasClass, parse, query, textOf } from "./helpers/html-dom.js";
import { releaseNotes } from "./helpers/release-notes.js";

const root = fileURLToPath(new URL("../", import.meta.url));

/* ---- scripts/docs-site/kinds.js, or a clear failure while it does not exist ------------------------- */

const KINDS_MODULE = join(root, "scripts/docs-site/kinds.js");
const kinds = existsSync(KINDS_MODULE) ? await import(/* @vite-ignore */ KINDS_MODULE) : {};
const member = (name) => {
  if (kinds[name] === undefined) throw new Error(`scripts/docs-site/kinds.js does not exist or does not export ${name}`);
  return kinds[name];
};
const fitsKindsOf = (...args) => member("fitsKindsOf")(...args);
const isKindFile = (...args) => member("isKindFile")(...args);
const kindPatterns = (...args) => member("kindPatterns")(...args);
const catalogPatterns = (...args) => member("catalogPatterns")(...args);
const fileKinds = (...args) => member("fileKinds")(...args);

const exists = (path) => existsSync(`${root}${path}`);
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const json = (path) => JSON.parse(read(path));

/** The 20 stylesheets of the patterns of a kind of site, named for their block, in the order of the cascade (CASCADE of kinds.js without the four of F7). */
const ALL = ["site-header", "masthead", "hero", "main", "section", "stat", "site-footer", "glow", "page-header", "article-header", "article", "app-bar", "dashboard", "docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"];
/** The 21 files of F5b, `<kind>-<name>.css`, and the two chunks and the three element files that F8 renamed: none of them exists any more. */
const OLD_ALL = [
  "landing-header", "landing-hero", "landing-main", "landing-section", "landing-stat", "landing-footer", "landing-glow",
  "cms-header", "cms-page-header", "cms-article-header", "cms-article", "cms-footer",
  "app-header", "app-dashboard",
  "docs-shell", "docs-page-head", "docs-rail", "docs-example", "docs-dodont", "docs-pager", "docs-page-foot",
];
const OLD_ELEMENT_FILES = ["consent", "mode", "banner"];
const KINDS = ["landing", "cms", "app", "docs"];

const repoSite = scanSite(join(root, "apps/docs"), root);

/* ---- The 21 files --------------------------------------------------------------------------- */

describe("the 20 patterns are stylesheets of catalog, named for their block", () => {
  it("are 20 files named <block>.css (the two headers and the two footers are one each, and the masthead is its own)", () => {
    expect(ALL).toHaveLength(20);
    // `app-bar` and `docs-layout` are the names of their blocks (`.luz-app-bar`, `.luz-docs-layout`), not a kind's prefix on a name
    const sources = readdirSync(`${root}packages/catalog/src/components`).filter((f) => f.endsWith(".css") && !f.startsWith("_")).map((f) => f.replace(/\.css$/, ""));
    expect(sources.filter((f) => !["search", "navbar", "sidebar", "terminal", "timeline", "lang-switch", "submenu", "announcement", "faq", "cookie-consent", "theme-time"].includes(f)).sort()).toEqual([...ALL].sort());
  });

  it.each([...OLD_ALL, ...OLD_ELEMENT_FILES])("the F5b file %s is gone from src, dist (plain and minified) and the tarball list", (name) => {
    for (const file of [`packages/catalog/src/components/${name}.css`, `packages/catalog/dist/components/${name}.css`, `packages/catalog/dist/components/${name}.min.css`]) expect(exists(file), file).toBe(false);
    const packed = read("packages/catalog/pack-files.txt").split("\n").map((l) => l.trim());
    expect(packed).not.toContain(`dist/components/${name}.css`);
    expect(packed).not.toContain(`dist/components/${name}.min.css`);
  });

  it.each(ALL)("%s has its source, and its built file and minified file", (name) => {
    expect(exists(`packages/catalog/src/components/${name}.css`), `src/components/${name}.css`).toBe(true);
    for (const file of [`${name}.css`, `${name}.min.css`]) expect(exists(`packages/catalog/dist/components/${file}`), `dist/components/${file} (pnpm build)`).toBe(true);
  });

  it.each(ALL)("%s starts with the order of the layers and has one block, in luz.catalog", (name) => {
    const css = read(`packages/catalog/dist/components/${name}.css`);
    expect(css.startsWith(LAYER_ORDER)).toBe(true);
    expect(css.match(/^@layer luz\.catalog \{$/gm) ?? []).toHaveLength(1);
    expect(css).not.toMatch(/@layer luz\.(?:landing|cms|app|docs)\b/);
  });

  it.each(ALL)("%s is in pack-files.txt of catalog, plain and minified", (name) => {
    const packed = read("packages/catalog/pack-files.txt").split("\n").map((l) => l.trim());
    expect(packed).toContain(`dist/components/${name}.css`);
    expect(packed).toContain(`dist/components/${name}.min.css`);
  });

  it("is reached by `@luz-ds/catalog/components/<block>.css`, with the stylesheets marked as having side effects", () => {
    const manifest = json("packages/catalog/package.json");
    expect(manifest.exports["./components/*"]).toBe("./dist/components/*");
    expect(manifest.sideEffects).toContain("./dist/components/*.css");
  });

  it("has no bundle of a kind: no landing.css, cms.css, app.css or docs.css in catalog or anywhere in dist", () => {
    for (const kind of KINDS) {
      expect(exists(`packages/catalog/dist/${kind}.css`), `${kind}.css`).toBe(false);
      expect(exists(`packages/catalog/src/${kind}.css`)).toBe(false);
    }
    expect(exists("packages/catalog/src/index.css"), "catalog has no index.css").toBe(false);
  });

  it("each minified file is under the ceiling of the row `catalog kind patterns CSS (each)` (min + gzip)", () => {
    const row = json("budgets.json").budgets.find((b) => b.name === "catalog kind patterns CSS (each)");
    expect(row).toBeTruthy();
    const over = ALL.filter((name) => gzipSync(readFileSync(`${root}packages/catalog/dist/components/${name}.min.css`)).length > row.max).map((name) => name);
    expect(over).toEqual([]);
  });
});

describe("the budget rows of catalog: a row for the 20 patterns, and the general row leaves them out", () => {
  const budgets = json("budgets.json").budgets;

  it("has `catalog kind patterns CSS (each)`: the 20 blocks by name (F8: no `{landing,cms,app,docs}-*` glob any more), ideal 768 and a ceiling of 1024", () => {
    const row = budgets.find((b) => b.name === "catalog kind patterns CSS (each)");
    expect(row).toMatchObject({ name: "catalog kind patterns CSS (each)", ideal: 768, max: 1024 });
    const list = /^packages\/catalog\/dist\/components\/\{([^}]+)\}\.min\.css$/.exec(row.glob);
    expect(list, row.glob).toBeTruthy();
    expect(list[1].split(",").sort(), "the blocks by name").toEqual([...ALL].sort());
  });

  it("keeps `catalog component CSS (each)` at 1280 and 1536 (never raised), and says with `except` that the patterns are the other row's", () => {
    const row = budgets.find((b) => b.name === "catalog component CSS (each)");
    expect(row).toMatchObject({ glob: "packages/catalog/dist/components/*.min.css", ideal: 1280, max: 1536 });
    // `except` names the files of the other rows: the 20 patterns, and (F7) the four layout components that came from core,
    // each by its name (a list of blocks, no prefix glob)
    const list = /\{([^}]+)\}\.min\.css$/.exec(row.except);
    expect(list, row.except).toBeTruthy();
    expect(list[1], "no `-*` prefix: the blocks are named").not.toContain("*");
    const excluded = (name) => list[1].split(",").includes(name);
    for (const name of ALL) expect(excluded(name), `${name} is the patterns' row`).toBe(true);
    for (const slug of ["navbar", "sidebar", "terminal", "timeline"]) expect(excluded(slug), `${slug} is the layout row`).toBe(true);
    for (const slug of ["search", "cookie-consent", "theme-time", "lang-switch", "submenu", "announcement", "faq"]) expect(excluded(slug), `${slug} stays in the general row`).toBe(false);
  });

  it("has no row of the four packages: landing CSS, cms CSS, app CSS, docs CSS", () => {
    for (const name of ["landing CSS", "cms CSS", "app CSS", "docs CSS"]) expect(budgets.find((b) => b.name === name), name).toBeUndefined();
    expect(budgets.filter((b) => /packages\/(?:landing|cms|app|docs)\//.test(b.file ?? b.glob ?? ""))).toEqual([]);
  });

  it("is in the PRINCIPLES.md table of section 8, with the same ceiling and no `{landing,cms,app,docs}-*` glob, and the table has no row of the four packages", () => {
    const principles = read("PRINCIPLES.md");
    expect(principles).toMatch(/^\| Each pattern of a kind of site in `catalog` \([^\n]*scripts\/docs-site\/kinds\.js[^\n]*\| — \| ≤ 0\.75 kB \| 0\.75 kB \| 1 kB \|$/m);
    for (const name of ["landing", "cms", "app", "docs"]) expect(principles, `${name} CSS`).not.toMatch(new RegExp(`^\\| \`${name}\` CSS \\|`, "m"));
    expect(principles, "no glob of the four kinds").not.toContain("{landing,cms,app,docs}-*");
  });
});

/* ---- classes.json --------------------------------------------------------------------------- */

describe("the classes of the patterns, in classes.json of catalog", () => {
  const manifest = json("packages/catalog/dist/classes.json");
  const byName = new Map(manifest.classes.map((c) => [c.name, c]));

  /** A class or block of each pattern, and the file that declares it. */
  const BLOCKS = {
    "luz-site-header": "site-header",
    "luz-masthead": "masthead",
    "luz-hero": "hero",
    "luz-main": "main",
    "luz-section": "section",
    "luz-stat": "stat",
    "luz-site-footer": "site-footer",
    "luz-glow": "glow",
    "luz-page-header": "page-header",
    "luz-article-header": "article-header",
    "luz-article": "article",
    "luz-toc": "article",
    "luz-app-bar": "app-bar",
    "luz-dashboard": "dashboard",
    "luz-docs-layout": "docs-layout",
    "luz-doc-header": "doc-header",
    "luz-page-rail": "page-rail",
    "luz-example": "example",
    "luz-do-dont": "do-dont",
    "luz-pager": "pager",
    "luz-page-footer": "page-footer",
  };

  it.each(Object.entries(BLOCKS))(".%s is a defined class of luz.catalog, declared in components/%s.css", (name, file) => {
    expect(byName.get(name), name).toMatchObject({ layer: "luz.catalog", defined: true });
    expect(byName.get(name).files, name).toContain(`components/${file}.css`);
  });

  it("has the new blocks and none of the old: no `luz-landing-*`, `luz-cms-*`, `luz-app-*` or `luz-docs-*` class but the app bar and the docs layout (luz-docs-layout, -main, -nav)", () => {
    const kept = new Set(["luz-docs-layout", "luz-docs-main", "luz-docs-nav"]);
    const stale = manifest.classes.map((c) => c.name).filter((name) => /^luz-(?:landing|cms|app|docs)-/.test(name) && !kept.has(name.split(/__|--/)[0]) && !name.startsWith("luz-app-bar"));
    expect(stale).toEqual([]);
    const blocks = new Set(manifest.classes.filter((c) => c.block).map((c) => c.block));
    for (const name of [...Object.keys(BLOCKS), "luz-docs-main", "luz-docs-nav"]) expect(blocks.has(name), name).toBe(true);
  });

  it("holds none of the names of F8's table 1 as a class, a block, a part or a modifier", () => {
    const OLD = ["luz-landing-hero", "luz-landing-section", "luz-landing-stat", "luz-landing-glow", "luz-landing-main", "luz-landing-header", "luz-cms-header", "luz-landing-footer", "luz-cms-footer", "luz-app-header", "luz-app-dashboard", "luz-cms-page-header", "luz-cms-article-header", "luz-cms-article", "luz-cms-toc", "luz-docs-shell", "luz-docs-page-head", "luz-docs-rail", "luz-docs-pager", "luz-docs-page-foot", "luz-docs-example", "luz-docs-dodont", "luz-consent", "luz-banner", "luz-mode"];
    const names = new Set(manifest.classes.map((c) => c.block ?? c.name));
    for (const old of OLD) expect(names.has(old), old).toBe(false);
  });

  it("gives every class of these blocks the kind `component`: `pattern` is for `luz-catalog-*` classes only, so `luz-app-bar` and `luz-docs-layout` are not apart from `luz-hero`", () => {
    const own = manifest.classes.filter((c) => Object.hasOwn(BLOCKS, c.block ?? "") || /^luz-docs-(?:main|nav)/.test(c.block ?? ""));
    expect(own.length).toBeGreaterThan(80);
    const kinds = new Map();
    for (const c of own) kinds.set(c.kind, [...(kinds.get(c.kind) ?? []), c.name]);
    expect([...kinds.keys()], `kinds: ${[...kinds].map(([k, v]) => `${k} ${v.slice(0, 3)}`).join("; ")}`).toEqual(["component"]);
    for (const c of manifest.classes.filter((c) => c.kind === "pattern")) expect(c.name, "a pattern is a luz-catalog-* class").toMatch(/^luz-catalog-/);
  });

  it("every class of a block of the patterns is in luz.catalog, and no file but its block's declares it", () => {
    const files = new Set(ALL.map((name) => `components/${name}.css`));
    const own = manifest.classes.filter((c) => Object.hasOwn(BLOCKS, c.block ?? ""));
    for (const c of own) {
      expect(c.layer, c.name).toBe("luz.catalog");
      if (c.defined) for (const file of c.files) expect(files.has(file), `${c.name} in ${file}`).toBe(true);
    }
  });

  it("every one of the 20 files declares a class, and classes.json says so", () => {
    const declared = new Set(manifest.classes.filter((c) => c.defined).flatMap((c) => c.files));
    expect(ALL.filter((name) => !declared.has(`components/${name}.css`))).toEqual([]);
  });

  it("has no class that points at a bundle (landing.css, cms.css, app.css, docs.css) and no layer of a kind", () => {
    for (const c of manifest.classes) {
      expect(c.files.filter((f) => /^(?:landing|cms|app|docs)\.css$/.test(f)), c.name).toEqual([]);
      expect(c.layer, c.name).toMatch(/^luz\.(?:catalog|print|components|objects|utilities)$/);
    }
    for (const p of manifest.properties) expect(p.layer, p.name).not.toMatch(/^luz\.(?:landing|cms|app|docs)$/);
  });

  it("holds the properties a pattern sets for its own parts, in its file, under the new names: --luz-docs-measure in docs-layout.css, --luz-toc-top in article.css, --luz-glow-start in glow.css, --luz-page-rail-top and -w in docs-layout.css", () => {
    const own = (name) => manifest.properties.find((p) => p.name === name);
    expect(own("--luz-docs-measure")).toMatchObject({ scope: "component", layer: "luz.catalog", files: ["components/docs-layout.css"] });
    expect(own("--luz-toc-top")).toMatchObject({ scope: "component", layer: "luz.catalog", files: ["components/article.css"] });
    expect(own("--luz-glow-start")).toMatchObject({ scope: "component", files: ["components/glow.css"] });
    // the rail's top and width are set by the layout that holds it
    expect(own("--luz-page-rail-top")).toMatchObject({ scope: "component", files: ["components/docs-layout.css"] });
    expect(own("--luz-page-rail-w")).toMatchObject({ scope: "component", files: ["components/docs-layout.css"] });
    for (const old of ["--luz-landing-glow-start", "--luz-landing-glow-x", "--luz-landing-title-accent", "--luz-cms-toc-top", "--luz-docs-rail-top", "--luz-docs-rail-w", "--luz-docs-example-w"]) expect(own(old), old).toBeUndefined();
  });
});

/* ---- The four packages are gone -------------------------------------------------------------- */

describe("landing, cms, app and docs are not packages any more", () => {
  it.each(KINDS)("packages/%s does not exist", (kind) => {
    expect(exists(`packages/${kind}`)).toBe(false);
    expect(exists(`scripts/build-${kind}.js`), `scripts/build-${kind}.js`).toBe(false);
  });

  it("scripts/luz-packages.js lists tokens, core and catalog, the tool check, and no kind of site", () => {
    expect(Object.keys(packages).sort()).toEqual(["BASE", "PACKAGES", "PUBLISHED", "TOOLS"]);
    expect(packages.BASE).toEqual(["tokens", "core", "catalog"]);
    expect(packages.PACKAGES).toEqual(["tokens", "core", "catalog"]);
    expect(packages.TOOLS).toEqual(["check"]);
    expect(packages.PUBLISHED).toEqual(["tokens", "core", "catalog", "check"]);
    expect(read("scripts/luz-packages.js")).not.toMatch(/SITE_KINDS/);
  });

  it("the root package.json has no `<kind>:build` script, and its build is tokens, core, catalog and check", () => {
    const scripts = json("package.json").scripts;
    for (const kind of KINDS) expect(scripts[`${kind}:build`], `${kind}:build`).toBeUndefined();
    expect(scripts.build).toBe("pnpm tokens:build && pnpm core:build && pnpm catalog:build && pnpm luzcheck:build");
  });

  it("no manifest, workspace or lockfile entry names a package of the four", () => {
    const lock = read("pnpm-lock.yaml");
    for (const kind of KINDS) {
      expect(lock, `pnpm-lock.yaml importer packages/${kind}`).not.toMatch(new RegExp(`^ {2}packages/${kind}:$`, "m"));
      expect(lock, `pnpm-lock.yaml @luz-ds/${kind}`).not.toMatch(new RegExp(`@luz-ds/${kind}(?![\\w-])`));
    }
  });

  it("no script, config, workflow or owner list points at packages/landing, cms, app or docs, or at their dist files", () => {
    const files = [
      "scripts/check-dist.js",
      "scripts/qa-release.js",
      "scripts/smoke-consumer.js",
      "scripts/check-pack.js",
      "scripts/publish.js",
      "scripts/build-package.js",
      "scripts/check-size.js",
      "scripts/ai-manifests.js",
      "stylelint.config.js",
      ".github/CODEOWNERS",
      ".github/ISSUE_TEMPLATE/bug.yml",
      ".github/ISSUE_TEMPLATE/component.yml",
      "apps/docs/_layouts/page.html",
      "apps/docs/_layouts/not-found.html",
      "apps/docs/package.json",
      "apps/landing/package.json",
      "packages/check/package.json",
    ].filter(exists);
    const offenders = files.flatMap((file) =>
      read(file)
        .split("\n")
        .flatMap((line, i) => (/packages\/(?:landing|cms|app|docs)\b|@luz-ds\/(?:landing|cms|app|docs)(?![\w-])|dist\/(?:landing|cms|app|docs)(?:\.min)?\.css/.test(line) ? [`${file}:${i + 1}: ${line.trim().slice(0, 100)}`] : [])),
    );
    expect(offenders).toEqual([]);
  });

  it("the docs and the home link the patterns they use as files of catalog, after core, not a bundle of a kind", () => {
    const layout = read("apps/docs/_layouts/page.html");
    expect(layout).toMatch(/\/apps\/docs\/catalog-patterns\.css|catalog-patterns\.css/);
    expect(exists("apps/docs/catalog-patterns.css"), "apps/docs/catalog-patterns.css").toBe(true);
    const imports = [...read("apps/docs/catalog-patterns.css").matchAll(/@import url\("([^"]+)"\)/g)].map((m) => m[1]);
    const names = imports.map((href) => /components\/([\w-]+)\.css$/.exec(href)?.[1]).filter(Boolean);
    expect(names.sort(), "the file imports the 20 patterns, by their new names").toEqual([...ALL].sort());
  });
});

/* ---- scripts/docs-site/kinds.js -------------------------------------------------------------- */

describe("scripts/docs-site/kinds.js reads the files and the pages of each kind from `fits-kinds` (decisions 71 and 72)", () => {
  it("has no list of patterns typed by hand: the module of F5b (KIND_PATTERNS, kindFiles, kindOfFile) is gone, and only the order of the cascade is written", () => {
    for (const gone of ["KIND_PATTERNS", "kindFiles", "kindOfFile"]) expect(kinds[gone], gone).toBeUndefined();
    expect(member("CASCADE")).toEqual(expect.arrayContaining(ALL));
    expect(new Set(member("CASCADE")).size, "no block twice").toBe(member("CASCADE").length);
  });

  it("the files of a kind are those of the catalog pages that name it (or `any`), in the order of the cascade", () => {
    expect(kindPatterns("landing", root, null).files).toEqual(["navbar", "sidebar", "timeline", "site-header", "hero", "main", "section", "stat", "site-footer", "glow"].map((n) => `components/${n}.css`));
    expect(kindPatterns("blog", root, null).files).toEqual(["navbar", "sidebar", "timeline", "site-header", "masthead", "site-footer", "page-header", "article-header", "article"].map((n) => `components/${n}.css`));
    expect(kindPatterns("app", root, null).files).toEqual(["navbar", "sidebar", "app-bar", "dashboard"].map((n) => `components/${n}.css`));
    expect(kindPatterns("docs", root, null).files).toEqual(["navbar", "sidebar", "terminal", "docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"].map((n) => `components/${n}.css`));
  });

  it("landing and blog link the sidebar's file though no page of theirs lists it: the nav toggle of the site header and of the masthead is defined there, and it comes before the headers", () => {
    for (const kind of ["landing", "blog"]) {
      const files = kindPatterns(kind, root, null).files;
      expect(files, kind).toContain("components/sidebar.css");
      expect(files.indexOf("components/sidebar.css"), `${kind}: the sidebar before the header`).toBeLessThan(files.indexOf("components/site-header.css"));
      expect(kindPatterns(kind, root, null).pages, `${kind}: the sidebar is not one of its patterns`).not.toContain("sidebar");
    }
  });

  it("the pages of a kind are the slugs of the pages that name it, `any` left out: the header and the footer are the page of landing and of blog", () => {
    const pages = (kind) => [...kindPatterns(kind, root, null).pages].sort();
    expect(pages("landing")).toEqual(["hero", "section", "site-footer", "site-header", "stat", "timeline"]);
    expect(pages("blog")).toEqual(["article-header", "masthead", "page-header", "site-footer", "site-header", "timeline", "toc"]);
    expect(pages("app")).toEqual(["app-bar", "dashboard", "sidebar"]);
    expect(pages("docs")).toEqual(["do-dont", "doc-header", "docs-layout", "example", "page-footer", "page-rail", "pager", "sidebar", "terminal"]);
  });

  it("knows a file of a pattern by its page, plain or minified: a page that fits some kinds and not `any`, and not the sidebar, the terminal or the timeline", () => {
    const map = fileKinds(root);
    expect(isKindFile("components/hero.css", map)).toBe(true);
    expect(isKindFile("components/pager.min.css", map)).toBe(true);
    expect(isKindFile("components/site-header.css", map)).toBe(true);
    expect(isKindFile("components/search.css", map)).toBe(false);
    expect(isKindFile("components/navbar.css", map), "navbar fits any site").toBe(false);
    expect(isKindFile("components/lang-switch.css", map)).toBe(false);
    expect(isKindFile("components/announcement.css", map)).toBe(false);
    for (const base of ["sidebar", "terminal", "timeline"]) expect(isKindFile(`components/${base}.css`, map), base).toBe(false);
    for (const old of [...OLD_ALL, ...OLD_ELEMENT_FILES]) expect(isKindFile(`components/${old}.css`, map), old).toBe(false);
  });

  describe("on a tree of its own", () => {
    const tmp = [];
    const tree = (pages) => {
      const dir = mkdtempSync(join(tmpdir(), "luz-kinds-"));
      tmp.push(dir);
      mkdirSync(join(dir, "apps/docs/pages/catalog"), { recursive: true });
      for (const [slug, head] of Object.entries(pages)) writeFileSync(join(dir, `apps/docs/pages/catalog/${slug}.html`), `<!-- luz:page\n${head}\n-->\n<p>x</p>\n`);
      return dir;
    };
    const page = (kinds, file, order = 1) => `title: P\ndescription: d\narea: catalog\ngroup: navigation\norder: ${order}\nfits-kinds: ${kinds}\nfits: a sentence of its own\nfiles: ${file}`;
    afterEach(() => tmp.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

    it("a page that names a kind adds its file to that kind, and no other kind's (a new pattern needs a page, nothing in kinds.js)", () => {
      const dir = tree({ hero: page("landing", "components/hero.css"), "app-bar": page("app", "components/app-bar.css", 2), search: page("any", "<luz-search>", 3) });
      // landing and blog also link the sidebar's file, which defines the nav toggle of their headers
      expect(kindPatterns("landing", dir, null)).toEqual({ files: ["components/sidebar.css", "components/hero.css"], pages: ["hero"] });
      expect(kindPatterns("app", dir, null)).toEqual({ files: ["components/app-bar.css"], pages: ["app-bar"] });
      expect(kindPatterns("docs", dir, null)).toEqual({ files: [], pages: [] });
    });

    it("a page of `any` puts its file in every kind but names no page of it", () => {
      const dir = tree({ navbar: page("any", "components/navbar.css") });
      for (const kind of ["app", "docs"]) expect(kindPatterns(kind, dir, null), kind).toEqual({ files: ["components/navbar.css"], pages: [] });
      for (const kind of ["landing", "blog"]) expect(kindPatterns(kind, dir, null), kind).toEqual({ files: ["components/navbar.css", "components/sidebar.css"], pages: [] });
    });

    it("fails, naming the file, for a stylesheet the page lists and catalog does not build", () => {
      const dir = tree({ hero: page("landing", "components/hero.css") });
      expect(() => kindPatterns("landing", dir, [{ file: "components/main.css" }])).toThrow(/components\/hero\.css[^]*which packages\/catalog\/dist does not have/);
      expect(() => kindPatterns("landing", dir, [{ file: "components/hero.css" }, { file: "components/sidebar.css" }])).not.toThrow();
    });

    it("fails, asking for CASCADE, when a page lists a stylesheet whose place in the cascade is not written", () => {
      const dir = tree({ ribbon: page("landing", "components/ribbon.css") });
      expect(() => kindPatterns("landing", dir, null)).toThrow(/add ribbon to CASCADE/);
    });

    it("refuses a kind that has no patterns", () => {
      expect(() => kindPatterns("nope", tree({}), null)).toThrow(/not a kind of site/);
    });

    it("reads the front matter of the page, not its name: `fits-kinds` and `files` of a page called anything", () => {
      const dir = tree({ "whatever-the-name": page("docs, app", "components/pager.css") });
      expect(catalogPatterns(dir)).toEqual([{ slug: "whatever-the-name", kinds: ["docs", "app"], files: ["components/pager.css"], order: 1, file: "apps/docs/pages/catalog/whatever-the-name.html" }]);
    });
  });
});

/* ---- The docs ------------------------------------------------------------------------------ */

/** The page of each pattern: [slug, files the page names, the id of its docs-component, the kinds it fits best]. */
const PAGES = [
  ["site-header", ["site-header"], "p-site-header", "landing, blog"],
  ["masthead", ["masthead"], "p-masthead", "blog"],
  ["hero", ["hero"], "p-hero", "landing"],
  ["section", ["main", "section", "glow"], "p-section", "landing"],
  ["stat", ["stat"], "p-stat", "landing"],
  ["site-footer", ["site-footer"], "p-site-footer", "landing, blog"],
  ["page-header", ["page-header"], "p-page-header", "blog"],
  ["article-header", ["article-header"], "p-article-header", "blog"],
  ["toc", ["article"], "p-toc", "blog"],
  ["app-bar", ["app-bar"], "p-app-bar", "app"],
  ["dashboard", ["dashboard"], "p-dashboard", "app"],
  ["docs-layout", ["docs-layout"], "p-docs-layout", "docs"],
  ["doc-header", ["doc-header"], "p-doc-header", "docs"],
  ["page-rail", ["page-rail"], "p-page-rail", "docs"],
  ["example", ["example"], "p-example", "docs"],
  ["do-dont", ["do-dont"], "p-do-dont", "docs"],
  ["pager", ["pager"], "p-pager", "docs"],
  ["page-footer", ["page-footer"], "p-page-footer", "docs"],
];
/** The pages of the old routes of F5b (`<kind>-<name>`) and of the pieces F8 renamed: none is a page now, in English or Spanish. */
const OLD_SLUGS = [...OLD_ALL, "cms-toc", "consent", "mode", "color-mode", "banner"];
const ELEMENT_PAGES = ["announcement", "faq", "cookie-consent", "lang-switch", "theme-time", "search", "submenu"];
/** F7: the pages that came from core, in `pages/components/` until then. */
const LAYOUT_PAGES = ["navbar", "sidebar", "terminal", "timeline"];
const catalogPages = () => repoSite.pages.filter((p) => p.meta.area === "catalog");

describe("the pages of the 18 patterns, at /docs/catalog/<block>/", () => {
  it("are 18 pages beside the seven elements, the four that came from core (F7), the class reference and the gallery: 31 in the area", () => {
    expect(PAGES).toHaveLength(18);
    const routes = catalogPages().map((p) => p.route).sort();
    expect(routes).toEqual(["/docs/catalog/", "/docs/catalog/classes/", ...[...ELEMENT_PAGES, ...LAYOUT_PAGES, ...PAGES.map(([slug]) => slug)].map((slug) => `/docs/catalog/${slug}/`)].sort());
  });

  it.each(OLD_SLUGS)("there is no page at /docs/catalog/%s/, in English or in Spanish, and no redirect (decision 69)", (slug) => {
    expect(repoSite.byRoute.has(`/docs/catalog/${slug}/`), slug).toBe(false);
    for (const file of [`apps/docs/pages/catalog/${slug}.html`, `apps/docs/i18n/es/pages/catalog/${slug}.html`]) expect(exists(file), file).toBe(false);
  });

  it.each(PAGES)("/docs/catalog/%s/ names its files: %j, and has the docs-component %s", (slug, names, id) => {
    const page = repoSite.byRoute.get(`/docs/catalog/${slug}/`);
    expect(page, `apps/docs/pages/catalog/${slug}.html`).toBeTruthy();
    expect(page.meta.area).toBe("catalog");
    expect(page.file).toBe(`apps/docs/pages/catalog/${slug}.html`);
    const files = page.meta.files.split(/[,;]/).map((f) => f.trim());
    expect([...files].sort()).toEqual(names.map((name) => `components/${name}.css`).sort());
    expect(page.body, "the id the page had in its area (the specs find the page by it)").toContain(`<div class="docs-component" id="${id}">`);
  });

  it("every one of the 20 files is named by the `files:` of exactly one page", () => {
    const map = fileKinds(root);
    const named = catalogPages().flatMap((p) => p.meta.files.split(/[,;]/).map((f) => f.trim()).filter((f) => isKindFile(f, map)));
    expect(named.sort()).toEqual(ALL.map((name) => `components/${name}.css`).sort());
  });

  it("the Do and don't of the docs patterns is titled \"Do and don't\", the name the component pages use for the same block", () => {
    expect(repoSite.byRoute.get("/docs/catalog/do-dont/").meta.title).toBe("Do and don't");
  });

  it("the union pages exist: Site header (landing and blog) documents --publication, Masthead is a page of its own, Site footer is one page", () => {
    const header = repoSite.byRoute.get("/docs/catalog/site-header/");
    expect(header.meta["fits-kinds"]).toBe("landing, blog");
    expect(header.body).toContain("luz-site-header--publication");
    expect(header.body, "the bar of a blog is the same component with the modifier, not a block of its own").not.toMatch(/luz-cms-header/);
    const masthead = repoSite.byRoute.get("/docs/catalog/masthead/");
    expect(masthead.meta.files.trim()).toBe("components/masthead.css");
    for (const part of ["luz-masthead__top", "luz-masthead__date", "luz-masthead__brand", "luz-masthead__actions", "luz-masthead__sections"]) expect(masthead.body, part).toContain(part);
    expect(masthead.body, "the masthead is a block, not a modifier of the bar").not.toContain("--masthead");
    const footer = repoSite.byRoute.get("/docs/catalog/site-footer/");
    for (const part of ["luz-site-footer__brand", "luz-site-footer__col", "luz-site-footer__col-title"]) expect(footer.body, part).toContain(part);
  });

  it("each page has a Spanish translation, pending review or reviewed, with its own `fits`", () => {
    for (const [slug] of [...PAGES, ["announcement"], ["cookie-consent"], ["theme-time"]]) {
      const file = `apps/docs/i18n/es/pages/catalog/${slug}.html`;
      expect(exists(file), file).toBe(true);
      const head = read(file).split("-->")[0];
      expect(head, file).toMatch(/^fits: .{10,}$/m);
      expect(head, `${file}: fits-kinds comes from the English page`).not.toMatch(/^fits-kinds:/m);
      expect(head, file).toMatch(/^reviewed: (?:true|false)$/m);
    }
  });
});

describe("the four areas of the packages are gone from the docs", () => {
  it("site.json has get-started, kinds, tokens, components, catalog, html and accessibility, and no landing, cms, app or documentation", () => {
    expect(repoSite.areas.map((a) => a.id)).toEqual(["get-started", "kinds", "tokens", "components", "catalog", "html", "accessibility"]);
    for (const old of ["landing", "cms", "app", "documentation"]) expect(repoSite.areas.find((a) => a.id === old), old).toBeUndefined();
  });

  it.each(["landing", "cms", "app", "documentation"])("no page is in the area %s, none is at /docs/%s/, and its folder and its Spanish folder are gone", (old) => {
    expect(repoSite.pages.filter((p) => p.meta.area === old).map((p) => p.route)).toEqual([]);
    expect(repoSite.pages.filter((p) => p.route.startsWith(`/docs/${old}/`)).map((p) => p.route)).toEqual([]);
    expect(exists(`apps/docs/pages/${old}`), `apps/docs/pages/${old}`).toBe(false);
    expect(exists(`apps/docs/i18n/es/pages/${old}`), `apps/docs/i18n/es/pages/${old}`).toBe(false);
  });

  it("the galleries and the templates pages of the four are gone, and so are the old routes of the patterns", () => {
    const OLD = [
      ...["landing", "cms", "app", "documentation"].flatMap((area) => [`/docs/${area}/`, `/docs/${area}/templates/`]),
      ...["shell", "page-head", "rail", "example", "dodont", "pager", "page-foot"].map((name) => `/docs/documentation/${name}/`),
      "/docs/landing/hero/",
      "/docs/cms/toc/",
      "/docs/app/dashboard/",
    ];
    expect(OLD.filter((route) => repoSite.byRoute.has(route))).toEqual([]);
  });

  it("nothing links to the old routes: pages, partials, layouts, the home, its catalogs, site.json, the README and the scripts", () => {
    const old = new RegExp(`/docs/(?:landing|cms|app|documentation)/|/docs/catalog/(?:${OLD_SLUGS.join("|")})/`);
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        if (["node_modules", "dist"].includes(entry)) continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(html|json|js|css|md|txt)$/.test(entry)) files.push(path);
      }
    };
    for (const dir of ["apps", "scripts", "packages/catalog/src", "packages/core/src", "packages/check/src"]) walk(join(root, dir));
    files.push(join(root, "README.md"), join(root, "packages/catalog/README.md"), join(root, "packages/core/README.md"));
    const offenders = files.flatMap((file) => readFileSync(file, "utf-8").split("\n").flatMap((line, i) => (old.test(line) ? [`${file.slice(root.length)}:${i + 1}`] : [])));
    expect(offenders).toEqual([]);
  });

  it("no page of the docs (English or Spanish) names a package that is gone: @luz-ds/landing, cms, app or docs (the app is @luz-ds/docs-site)", () => {
    const gone = /@luz-ds\/(?:landing|cms|app|docs)(?![\w-])/;
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (entry.endsWith(".html")) files.push(path);
      }
    };
    walk(join(root, "apps/docs/pages"));
    walk(join(root, "apps/docs/i18n"));
    walk(join(root, "apps/site/_partials"));
    files.push(join(root, "apps/landing/index.html"));
    const offenders = files.flatMap((file) => readFileSync(file, "utf-8").split("\n").flatMap((line, i) => (gone.test(line) ? [`${file.slice(root.length)}:${i + 1}`] : [])));
    expect(offenders, "say that the CSS is catalog's").toEqual([]);
  });

  it("no page says the CSS of a pattern is `components/<name>.css` of a kind's package, or names a file of F5b: the file is `<block>.css` of catalog", () => {
    const offenders = PAGES.flatMap(([slug]) => {
      const text = readFileSync(`${root}apps/docs/pages/catalog/${slug}.html`, "utf-8");
      return text.split("\n").flatMap((line, i) => (/(?:landing|cms|app|docs)'?s <code>components\//.test(line) || /\bcms\.css\b|\blanding\.css\b|\bdocs\.css\b|\bapp\.css\b/.test(line) || new RegExp(`components/(?:${[...OLD_ALL, ...OLD_ELEMENT_FILES].join("|")})(?:\\.min)?\\.css`).test(line) ? [`${slug}.html:${i + 1}: ${line.trim().slice(0, 90)}`] : []));
    });
    expect(offenders).toEqual([]);
  });
});

describe("the pages that count the pieces name the patterns as files of catalog", () => {
  const structure = read("apps/docs/pages/get-started/structure.html");
  const start = read("apps/docs/pages/get-started/index.html");

  it("get-started/structure.html has a row for each kind of site in the table of what each package needs: its blocks, and catalog as the package", () => {
    expect(structure).toContain("@luz-ds/catalog");
    const NAMES = {
      landing: ["site-header", "hero", "main", "section", "stat", "site-footer", "glow"],
      blog: ["site-header", "masthead", "page-header", "article-header", "article", "toc", "site-footer"],
      app: ["app-bar", "dashboard"],
      docs: ["docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"],
    };
    for (const [kind, names] of Object.entries(NAMES)) {
      const row = structure.split("<tr>").find((r) => r.includes(`.luz-${names[0]}`) && r.includes(`.luz-${names[1]}`));
      expect(row, `the row of ${kind}`).toBeTruthy();
      for (const name of names) expect(row, `${kind}: ${name}`).toContain(`.luz-${name}`);
      expect(row, `${kind}: the package column`).toMatch(/data-label="Package"><div>catalog<\/div>/);
    }
    expect(structure, "the bar of a blog is the header with --publication").toContain("--publication");
    expect(structure, "no class of the old names").not.toMatch(/\.luz-(?:landing-|cms-|app-(?:header|dashboard)|docs-(?:shell|page-|rail|pager|example|dodont))/);
  });

  it("get-started/index.html names each of the 20 files in a `<code>`, says there is no package for a kind, and links /docs/catalog/ and /docs/kinds/", () => {
    const named = [...start.matchAll(/<code class="luz-code-inline">([a-z-]+)<\/code>/g)].map((m) => m[1]);
    expect(ALL.filter((name) => !named.includes(name))).toEqual([]);
    expect(start).toContain('href="/docs/kinds/"');
    expect(start).toContain('href="/docs/catalog/"');
    expect(start).not.toMatch(/pnpm add [^"<]*@luz-ds\/(?:landing|cms|app|docs)(?![\w-])/);
    expect(start).not.toMatch(/data-copy-from="code-cdn-(?:landing|cms|app|docs)"/);
  });

  it("the home and the Kinds pages link the pages of the patterns, not an area of a package: the first link of each kind page is under /docs/catalog/", () => {
    for (const kind of ["landing", "blog", "app", "docs"]) {
      const body = repoSite.byRoute.get(`/docs/kinds/${kind}/`).body;
      expect(body, kind).toMatch(/href="\/docs\/catalog\/[a-z-]+\/"/);
      expect(body, kind).not.toMatch(/href="\/docs\/(?:landing|cms|app|documentation)\//);
    }
  });

  it("catalog's README tells the migration: the four packages are not published any more, and where each file went", () => {
    const readme = read("packages/catalog/README.md");
    expect(readme).toMatch(/not published any more/);
    for (const name of ALL) expect(readme, name).toContain(`${name}.css`);
    for (const name of ["landing-header", "cms-article", "app-dashboard", "docs-pager"]) expect(readme, `${name} is the old name of F5b: it is not in the table`).not.toMatch(new RegExp(`\\| \`${name}\\.css\``));
    const root = read("README.md");
    expect(root, "the root README says the four are not published any more").toMatch(/`@luz-ds\/landing`, `cms`, `app` and `docs` are not published any more/);
  });

  it("the English and Spanish strings of the docs have the words of Fits best and none of the removed areas, the old kind labels or the site note", () => {
    for (const code of ["en", "es"]) {
      const strings = json(`apps/docs/i18n/${code}/strings.json`);
      for (const key of ["fits.label", "fits.any", "kind.landing", "kind.blog", "kind.app", "kind.docs", ...["navigation", "page-structure", "content", "site-wide", "documentation", "reference"].map((id) => `group.catalog.${id}`)]) {
        if (code === "en" && key.startsWith("group.")) continue; // the English labels are site.json's own
        expect(strings[key], `${code} ${key}`).toBeTruthy();
      }
      for (const key of ["snippets.site-note", "kind.cms", "kind.documentation", "area.landing", "area.cms", "area.app", "area.documentation", "group.catalog.patterns", "group.landing.patterns", "group.cms.patterns", "group.app.patterns", "group.documentation.patterns"]) {
        expect(strings[key], `${code} ${key}`).toBeUndefined();
      }
    }
  });
});

/* ---- The groups of the Catalog area ---------------------------------------------------------- */

describe("the Catalog area groups its pages by what they do", () => {
  const area = repoSite.areas.find((a) => a.id === "catalog");
  const MEMBERS = {
    navigation: ["app-bar", "masthead", "site-header", "lang-switch", "submenu", "navbar", "sidebar"],
    "page-structure": ["article-header", "site-footer", "page-header", "hero", "section"],
    content: ["dashboard", "faq", "stat", "toc", "terminal", "timeline"],
    "site-wide": ["theme-time", "announcement", "cookie-consent", "search"],
    documentation: ["do-dont", "example", "page-footer", "doc-header", "pager", "page-rail", "docs-layout"],
    reference: ["classes"],
  };

  it("has the groups navigation, page-structure, content, site-wide, documentation and reference, in that order, shown in the sidebar", () => {
    expect(area.groups.map((g) => g.id)).toEqual(["navigation", "page-structure", "content", "site-wide", "documentation", "reference"]);
    for (const g of area.groups) expect(g.sidebar, g.id).toBe(true);
    expect(area.groups.find((g) => g.id === "reference").list, "the class reference is a list, not a gallery").toBe(true);
    expect(area.groups.find((g) => g.id === "patterns"), "the old group `patterns` is gone").toBeUndefined();
  });

  it.each(Object.entries(MEMBERS))("the group %s holds %j", (id, slugs) => {
    const members = catalogPages().filter((p) => p.meta.group === id).map((p) => p.route.split("/").filter(Boolean).at(-1));
    expect(members.sort()).toEqual([...slugs].sort());
  });

  it("every page of the area but the gallery is in a group of site.json, and no group is empty", () => {
    const pages = catalogPages().filter((p) => p.route !== "/docs/catalog/");
    for (const page of pages) expect(area.groups.some((g) => g.id === page.meta.group), page.file).toBe(true);
    for (const g of area.groups) expect(pages.some((p) => p.meta.group === g.id), `group ${g.id}`).toBe(true);
  });

  it("gives every page of the area its own order number: 0 for the gallery, then 1 to 30 at most, no ties", () => {
    const orders = catalogPages().map((p) => Number(p.meta.order));
    expect(catalogPages()).toHaveLength(31);
    expect(new Set(orders).size, `orders: ${orders.sort((a, b) => a - b).join(" ")}`).toBe(orders.length);
    expect(Math.min(...orders)).toBe(0);
    expect(Math.max(...orders)).toBeLessThanOrEqual(30);
    expect(repoSite.byRoute.get("/docs/catalog/").meta.order).toBe("0");
  });

  it("the gallery of the area has a section for each group, with the card of each member, in the order of the groups", () => {
    const { rendered } = buildSite(repoSite, { unchecked: ["/"] });
    const html = rendered.get("/docs/catalog/");
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    // The class reference is a list, not a gallery of cards, in its own section
    expect(sections).toEqual(["navigation", "page-structure", "content", "site-wide", "documentation", "reference"]);
    for (const [id, slugs] of Object.entries(MEMBERS)) {
      if (id === "reference") continue;
      const start = html.indexOf(`aria-labelledby="group-${id}"`);
      const section = html.slice(start, html.indexOf("</section>", start));
      const cards = [...section.matchAll(/<h3 class="luz-card__title docs-card__title"><a href="\/docs\/catalog\/([a-z-]+)\/">/g)].map((m) => m[1]);
      expect(cards.sort(), id).toEqual([...slugs].sort());
    }
  });
});

/* ---- "Fits best" (decision 71) -------------------------------------------------------------- */

const meta = (extra = {}) => ({ title: "Piece", description: "A piece.", area: "catalog", group: "navigation", ...extra });
const AREAS = [{ id: "catalog", label: "Catalog", slug: "catalog", groups: [{ id: "navigation", label: "Navigation" }, { id: "reference", label: "Reference", list: true }] }, { id: "components", label: "Components", slug: "components", groups: [{ id: "actions", label: "Actions" }] }];
const parseMeta = (fields, file = "apps/docs/pages/catalog/piece.html") =>
  parseFrontMatter(`<!-- luz:page\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n-->\n<p>x</p>\n`, file, AREAS);

describe("Fits best: the front matter of a pattern page of catalog", () => {
  it("accepts `fits-kinds: landing, app` and `fits: …` on a page of a group of catalog", () => {
    const { meta: parsed } = parseMeta(meta({ "fits-kinds": "landing, app", fits: "the top of a page" }));
    expect(parsed["fits-kinds"]).toBe("landing, app");
    expect(parsed.fits).toBe("the top of a page");
  });

  it.each(["any", "landing", "blog", "app", "docs", "landing, blog, app, docs"])("accepts the kinds: %s", (kinds) => {
    expect(() => parseMeta(meta({ "fits-kinds": kinds, fits: "a sentence" }))).not.toThrow();
  });

  it("requires both on a pattern page of catalog, naming the file and the key", () => {
    expect(() => parseMeta(meta({ fits: "a sentence" }))).toThrow(/apps\/docs\/pages\/catalog\/piece\.html: .*"fits-kinds"/);
    expect(() => parseMeta(meta({ "fits-kinds": "any" }))).toThrow(/apps\/docs\/pages\/catalog\/piece\.html: .*"fits"/);
    expect(() => parseMeta(meta())).toThrow(/piece\.html: .*needs "fits-kinds"/);
  });

  it("forbids both on any other page: a component, the gallery of catalog and its class reference", () => {
    const component = { title: "Button", description: "A button.", area: "components", group: "actions" };
    expect(() => parseMeta({ ...component, "fits-kinds": "any", fits: "a sentence" }, "apps/docs/pages/components/button.html")).toThrow(/components\/button\.html: .*"fits-kinds" belongs to the pattern pages of catalog/);
    expect(() => parseMeta({ ...component, fits: "a sentence" }, "apps/docs/pages/components/button.html")).toThrow(/components\/button\.html: .*"fits" belongs to the pattern pages of catalog/);
    const reference = meta({ group: "reference", fits: "a sentence" });
    expect(() => parseMeta(reference, "apps/docs/pages/catalog/classes.html")).toThrow(/classes\.html: .*"fits" belongs/);
    const gallery = { title: "Catalog", description: "The catalog.", area: "catalog", generate: "gallery", "fits-kinds": "any" };
    expect(() => parseMeta(gallery, "apps/docs/pages/catalog/index.html")).toThrow(/catalog\/index\.html: .*"fits-kinds" belongs/);
    expect(() => parseMeta({ ...component })).not.toThrow();
  });

  it("refuses an unknown kind, a kind twice, an empty list and `any` mixed with a kind, each with the file", () => {
    for (const bad of ["cms", "landing, cms", "marketing", "landing, landing", "any, app", "app, any", "any, any", ","]) {
      expect(() => parseMeta(meta({ "fits-kinds": bad, fits: "a sentence" })), bad).toThrow(/apps\/docs\/pages\/catalog\/piece\.html: .*fits-kinds/);
    }
  });

  it("the kinds are written as the reader says them: landing, blog, app, docs (blog, not cms), and any stands alone", () => {
    expect(member("FITS_KINDS")).toEqual(["landing", "blog", "app", "docs"]);
    expect(fitsKindsOf("blog, docs")).toEqual(["blog", "docs"]);
    expect(fitsKindsOf("any")).toEqual(["any"]);
    expect(() => fitsKindsOf("")).toThrow(/not a list of kinds/);
    expect(() => fitsKindsOf("cms")).toThrow(/not a list of kinds/);
    expect(() => fitsKindsOf("any, app")).toThrow(/"any" stands alone/);
    expect(() => fitsKindsOf("app, app")).toThrow(/names a kind twice/);
  });
});

describe("Fits best: the real pages", () => {
  const patterns = () => catalogPages().filter((p) => p.meta.group && p.meta.group !== "reference");

  it("every pattern page of catalog has both, and no other page has either", () => {
    expect(patterns()).toHaveLength(29);
    for (const page of patterns()) {
      expect(page.meta["fits-kinds"], page.file).toBeTruthy();
      expect(page.meta.fits.length, page.file).toBeGreaterThan(10);
      expect(() => fitsKindsOf(page.meta["fits-kinds"]), page.file).not.toThrow();
    }
    for (const page of repoSite.pages.filter((p) => !patterns().includes(p))) {
      expect(page.meta["fits-kinds"], page.file).toBe("");
      expect(page.meta.fits, page.file).toBe("");
    }
  });

  it("a pattern fits the kinds its page says (the header and the footer fit landing and blog; the masthead blog), and the seven elements fit any site", () => {
    for (const [slug, , , fits] of PAGES) {
      expect(repoSite.byRoute.get(`/docs/catalog/${slug}/`).meta["fits-kinds"], slug).toBe(fits);
    }
    for (const slug of ELEMENT_PAGES) expect(repoSite.byRoute.get(`/docs/catalog/${slug}/`).meta["fits-kinds"], slug).toBe("any");
  });

  it("the four that came from core say what they fit: the navbar any site, the sidebar docs and app, the terminal docs, the timeline blog and landing (F7)", () => {
    const fits = (slug) => repoSite.byRoute.get(`/docs/catalog/${slug}/`).meta["fits-kinds"];
    expect(fitsKindsOf(fits("navbar"))).toEqual(["any"]);
    expect([...fitsKindsOf(fits("sidebar"))].sort()).toEqual(["app", "docs"]);
    expect(fitsKindsOf(fits("terminal"))).toEqual(["docs"]);
    expect([...fitsKindsOf(fits("timeline"))].sort()).toEqual(["blog", "landing"]);
  });

  it("is a sentence of its own on each page: no two pages say the same", () => {
    const sentences = patterns().map((p) => p.meta.fits);
    expect(new Set(sentences).size).toBe(sentences.length);
  });
});

describe("Fits best: what a page, a card and the Spanish page say", () => {
  const { rendered } = buildSite(repoSite, { unchecked: ["/"], languages: true });
  const KIND_WORD = { en: { landing: "landing", blog: "blog", app: "app", docs: "docs", any: "any site" }, es: { landing: "landing", blog: "blog", app: "app", docs: "documentación", any: "cualquier sitio" } };
  const LABEL = { en: "Fits best:", es: "Encaja mejor en:" };
  const headOf = (html) => query(parse(html), "header.luz-doc-header");

  it.each([
    ["/docs/catalog/hero/", "en"],
    ["/docs/catalog/site-header/", "en"],
    ["/docs/catalog/docs-layout/", "en"],
    ["/docs/catalog/search/", "en"],
    ["/es/docs/catalog/hero/", "es"],
  ])("%s says `Fits best: <kinds as links> — <sentence>` under the lead and before the chips (%s)", (route, lang) => {
    const canonical = route.replace(/^\/es/, "");
    const page = repoSite.byRoute.get(canonical);
    const head = headOf(rendered.get(route));
    const fits = query(head, "p.docs-fits");
    expect(fits, `${route}: p.docs-fits`).toBeTruthy();
    const kinds = fitsKindsOf(page.meta["fits-kinds"]);
    // The words: label, then the kinds joined with commas, a dash, and the page's sentence (the page's own in its language)
    // (a link is followed by a space in the text of the node: "landing , blog")
    const said = textOf(fits).replace(/ ,/g, ",");
    expect(said.startsWith(`${LABEL[lang]} ${kinds.map((k) => KIND_WORD[lang][k]).join(", ")} — `), `${route}: ${said}`).toBe(true);
    if (lang === "en") expect(textOf(fits).endsWith(` — ${page.meta.fits}`), route).toBe(true);
    // Each kind but `any` is a link to its page of Kinds of site, in the language of the page
    const hrefs = findAll(fits, (n) => n.name === "a").map((a) => a.attrs.get("href"));
    expect(hrefs, route).toEqual(kinds.filter((k) => k !== "any").map((k) => `${lang === "es" ? "/es" : ""}/docs/kinds/${k}/`));
    // After the lead and before the chips
    const order = [query(head, "p.luz-doc-header__lead"), fits, query(head, "ul.luz-doc-header__meta")].map((n) => n.open.index);
    expect(order, route).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(3);
  });

  it("says `any site` for a piece that fits any, as plain words: there is no kind to link", () => {
    const fits = query(headOf(rendered.get("/docs/catalog/announcement/")), "p.docs-fits");
    expect(findAll(fits, (n) => n.name === "a")).toEqual([]);
    expect(textOf(fits)).toMatch(/^Fits best: any site — /);
  });

  it("a page that is not a pattern of catalog has no such line: a component, the class reference and the gallery", () => {
    for (const route of ["/docs/components/button/", "/docs/catalog/classes/", "/docs/catalog/", "/docs/kinds/landing/"]) {
      expect(rendered.get(route), route).not.toContain("docs-fits");
    }
  });

  it("the card of the gallery says it too, in plain words (the card is one link): no link inside the line", () => {
    for (const [route, lang] of [["/docs/catalog/", "en"], ["/es/docs/catalog/", "es"]]) {
      const cards = findAll(parse(rendered.get(route)), (n) => n.name === "li" && hasClass(n, "docs-card"));
      expect(cards, route).toHaveLength(29);
      for (const card of cards) {
        const href = query(card, "h3.docs-card__title").children.find((n) => n.name === "a").attrs.get("href");
        const slug = href.split("/").filter(Boolean).at(-1);
        const fits = query(card, "p.docs-card__fits");
        expect(fits, `${route} ${slug}`).toBeTruthy();
        expect(findAll(fits, (n) => n.name === "a"), `${route} ${slug}: plain`).toEqual([]);
        const kinds = fitsKindsOf(repoSite.byRoute.get(`/docs/catalog/${slug}/`).meta["fits-kinds"]);
        // A page with no translation (the terminal, which came from core in F7 and was never translated) is a card in English inside the Spanish gallery
        const words = lang === "es" && !existsSync(join(root, `apps/docs/i18n/es/pages/catalog/${slug}.html`)) ? "en" : lang;
        expect(textOf(fits).startsWith(`${LABEL[words]} ${kinds.map((k) => KIND_WORD[words][k]).join(", ")} — `), `${route} ${slug}: ${textOf(fits)}`).toBe(true);
        // The description comes before the line
        expect(query(card, "p.docs-card__desc").open.index).toBeLessThan(fits.open.index);
      }
    }
  });

  it("the gallery of another area has no such line on its cards", () => {
    expect(rendered.get("/docs/components/")).not.toContain("docs-card__fits");
  });
});

describe("Fits best: in a translation", () => {
  // The fixture site has a catalog area with two pattern pages (catalog/header.html says `fits`, and so does catalog/switch.html)
  const FITS_EN = "the top of every page";
  const translation = (fields = {}) =>
    pageSource(
      { title: "Cabecera", description: "La parte superior de una página.", fits: "la parte superior de cada página", source: "000000000000", reviewed: "false", ...fields },
      '<h2 id="example">Ejemplo</h2>\n<h2 id="known-issues">Problemas conocidos</h2>\n<p>Ninguno.</p>',
    );
  const omit = (source, key) => source.replace(new RegExp(`^${key}: .*\\n`, "m"), "");
  const made = [];
  const fixture = (translations) => {
    const f = docsI18nFixture({ languages: ["es"], translations: { es: translations } });
    made.push(f);
    return f;
  };
  afterEach(() => {
    cleanupFixtures();
    made.splice(0);
  });

  it("`fits` is a key of a translation, and `fits-kinds` is not: the kinds come from the English page", () => {
    expect(parseTranslation(translation(), "apps/docs/i18n/es/pages/catalog/header.html").meta.fits).toBe("la parte superior de cada página");
    expect(() => parseTranslation(translation({ "fits-kinds": "app" }), "apps/docs/i18n/es/pages/catalog/header.html")).toThrow(/header\.html:\d+: "fits-kinds" comes from the English page/);
  });

  it("a translation of a page that has `fits` must have its own, naming the file", () => {
    const f = fixture({ "catalog/header.html": omit(translation(), "fits") });
    expect(() => f.scan()).toThrow(/apps\/docs\/i18n\/es\/pages\/catalog\/header\.html: .*fits/);
  });

  it("a translation whose English page has no `fits` must not have one", () => {
    // The gallery of the area has none, and a translation of it must not invent one
    const f = fixture({ "catalog/index.html": translation({ title: "Catálogo", description: "Las piezas que no son del núcleo." }) });
    expect(() => f.scan()).toThrow(/apps\/docs\/i18n\/es\/pages\/catalog\/index\.html: .*fits/);
  });

  it("a translation with its own `fits` is read, and the Spanish page says it, with the kinds of the English page", () => {
    const f = fixture({ "catalog/header.html": translation() });
    const site = f.scan();
    const es = site.docsI18n.languages.find((l) => l.code === "es");
    expect(es.pages.get("/docs/catalog/header/").meta.fits).toBe("la parte superior de cada página");
    const { rendered, problems } = buildSite(site, { languages: true, unchecked: ["/"] });
    expect(problems).toEqual([]);
    // The chrome words are the language's (the pseudo catalog of the fixture says every word of them in Spanish); the kinds come from the English page
    const strings = JSON.parse(f.read("apps/docs/i18n/es/strings.json"));
    const spanish = textOf(query(parse(rendered.get("/es/docs/catalog/header/")), "p.docs-fits")).replace(/ ,/g, ",");
    expect(spanish).toBe(`${strings["fits.label"]} ${["landing", "blog", "app", "docs"].map((k) => strings[`kind.${k}`]).join(", ")} — la parte superior de cada página`);
    const english = textOf(query(parse(rendered.get("/docs/catalog/header/")), "p.docs-fits")).replace(/ ,/g, ",");
    expect(english).toBe(`Fits best: landing, blog, app, docs — ${FITS_EN}`);
  });

  it("a page that is not translated says its English sentence, in the English words of an island: lang=en on its card", () => {
    const f = fixture({});
    const { rendered } = buildSite(f.scan(), { languages: true, unchecked: ["/"] });
    const gallery = parse(rendered.get("/es/docs/catalog/"));
    const card = findAll(gallery, (n) => n.name === "li" && hasClass(n, "docs-card")).find((li) => query(li, "h3.docs-card__title").children.some((a) => a.attrs.get("href") === "/es/docs/catalog/switch/"));
    expect(card, "the card of a page that is not translated").toBeTruthy();
    expect(card.attrs.get("lang"), "an island of English").toBe("en");
    expect(textOf(query(card, "p.docs-card__fits"))).toBe("Fits best: any site — when the site has a switch");
  });
});

/* ---- The generator still renders a page head the same way for English ------------------------ */

describe("renderPage of a catalog pattern page puts Fits best in the head, once", () => {
  it("has one p.docs-fits in the page", () => {
    const page = repoSite.byRoute.get("/docs/catalog/hero/");
    const html = renderPage(page, repoSite, {});
    expect(html.match(/class="docs-fits"/g)).toHaveLength(1);
  });
});

/* ---- The migration changeset --------------------------------------------------------------- */

describe("the migration changeset", () => {
  const notes = () => releaseNotes(root);
  const minor = (note, name) => note.bumps.some((b) => b.name === `@luz-ds/${name}` && b.level === "minor");

  it("is a minor of tokens, core, catalog and check, and says what to do: the table of files, the layers, the check", () => {
    const note = notes().find((n) => minor(n, "catalog") && /@luz-ds\/landing\/components\/header\.css/.test(n.text));
    expect(note, "a changeset about the patterns of the four kinds").toBeTruthy();
    for (const name of ["tokens", "core", "catalog", "check"]) expect(minor(note, name), name).toBe(true);
    for (const name of ["landing", "cms", "app", "docs"]) expect(note.bumps.some((b) => b.name === `@luz-ds/${name}`), `${name} is not a package`).toBe(false);
  });

  it("maps each of the 21 files of the four packages to its file in catalog, by the new name of its block, and says the layers luz.landing, cms, app and docs are gone (breaking)", () => {
    // pending in .changeset/ before the Version PR, in the CHANGELOGs after it (where Prettier pads the tables)
    const text = notes().find((n) => /@luz-ds\/landing\/components\/header\.css/.test(n.text)).text.replace(/[ \t]{2,}/g, " ");
    const MAP = {
      landing: { header: "site-header", hero: "hero", main: "main", section: "section", stat: "stat", footer: "site-footer", glow: "glow" },
      cms: { header: "site-header", "page-header": "page-header", "article-header": "article-header", article: "article", footer: "site-footer" },
      app: { header: "app-bar", dashboard: "dashboard" },
      docs: { shell: "docs-layout", "page-head": "doc-header", rail: "page-rail", example: "example", dodont: "do-dont", pager: "pager", "page-foot": "page-footer" },
    };
    for (const [kind, files] of Object.entries(MAP)) {
      for (const [old, now] of Object.entries(files)) expect(text, `${kind}/${old}`).toMatch(new RegExp(`\\| \`@luz-ds/${kind}/components/${old}\\.css\` \\| \`@luz-ds/catalog/components/${now}\\.css\``));
    }
    for (const layer of ["luz.landing", "luz.cms", "luz.app", "luz.docs"]) expect(text, layer).toContain(layer);
    expect(text).toMatch(/\*\*Breaking:\*\*/);
  });
});
