/**
 * F5b of .claude/plans/ai-and-catalog-only.md (decisions 1, 2 and 51 to 58, 71 to 73): the patterns of a
 * landing page, a blog, a web application and a documentation site are components of @luz-ds/catalog, one
 * stylesheet each (`<kind>-<name>.css`); `@luz-ds/landing`, `cms`, `app` and `docs` and their layers are gone.
 * Sources are read as text and the docs site is read with the generator; no browser.
 *
 *   - the 21 files: sources, dist (plain and minified), the layer, the tarball list, the size row
 *   - classes.json: each pattern's classes map to its file, in luz.catalog
 *   - the four packages do not exist, and no list, script or config names them
 *   - the docs: a page per pattern at /docs/catalog/<kind>-<name>/, the `files:` of each, the groups, the old
 *     areas and routes gone, nothing of the docs still names a removed package
 *   - "Fits best" (decision 71): the front matter, the rules of the generator, the line on a page and on a card
 *   - the migration changeset
 *
 * What other files of tests/ say about this model (layers, class-manifest, check-*, prompts, snippets…) is
 * in those files: this one holds what has no other home.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
const kindFiles = (...args) => member("kindFiles")(...args);
const kindOfFile = (...args) => member("kindOfFile")(...args);

const exists = (path) => existsSync(`${root}${path}`);
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const json = (path) => JSON.parse(read(path));

/** The 21 stylesheets that came from the four packages, by kind, in the order the kind's stylesheet had them. */
const FILES = {
  landing: ["header", "hero", "main", "section", "stat", "footer", "glow"],
  cms: ["header", "page-header", "article-header", "article", "footer"],
  app: ["header", "dashboard"],
  docs: ["shell", "page-head", "rail", "example", "dodont", "pager", "page-foot"],
};
const ALL = Object.entries(FILES).flatMap(([kind, names]) => names.map((name) => `${kind}-${name}`));
const KINDS = Object.keys(FILES);

const repoSite = scanSite(join(root, "apps/docs"), root);

/* ---- The 21 files --------------------------------------------------------------------------- */

describe("the 21 patterns are stylesheets of catalog", () => {
  it("are 21 files named <kind>-<name>.css, 7 of landing, 5 of cms, 2 of app and 7 of docs", () => {
    expect(ALL).toHaveLength(21);
    const sources = readdirSync(`${root}packages/catalog/src/components`).filter((f) => /^(landing|cms|app|docs)-.+\.css$/.test(f));
    expect(sources.map((f) => f.replace(/\.css$/, "")).sort()).toEqual([...ALL].sort());
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

  it("is reached by `@luz-ds/catalog/components/<kind>-<name>.css`, with the stylesheets marked as having side effects", () => {
    const manifest = json("packages/catalog/package.json");
    expect(manifest.exports["./components/*"]).toBe("./dist/components/*");
    expect(manifest.sideEffects).toContain("./dist/components/*.css");
  });

  it("has no bundle of the kind: no landing.css, cms.css, app.css or docs.css in catalog or anywhere in dist", () => {
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

describe("the budget rows of catalog: a row for the 21 patterns, and the general row leaves them out", () => {
  const budgets = json("budgets.json").budgets;

  it("has `catalog kind patterns CSS (each)`: the glob of the four kinds, ideal 768 and a ceiling of 1024", () => {
    const row = budgets.find((b) => b.name === "catalog kind patterns CSS (each)");
    expect(row).toEqual({ name: "catalog kind patterns CSS (each)", glob: "packages/catalog/dist/components/{landing,cms,app,docs}-*.min.css", ideal: 768, max: 1024 });
  });

  it("keeps `catalog component CSS (each)` at 1280 and 1536 (never raised), and says with `except` that the patterns are the other row's", () => {
    const row = budgets.find((b) => b.name === "catalog component CSS (each)");
    expect(row).toMatchObject({ glob: "packages/catalog/dist/components/*.min.css", ideal: 1280, max: 1536 });
    expect(row.except).toBe("packages/catalog/dist/components/{landing,cms,app,docs}-*.min.css");
  });

  it("has no row of the four packages: landing CSS, cms CSS, app CSS, docs CSS", () => {
    for (const name of ["landing CSS", "cms CSS", "app CSS", "docs CSS"]) expect(budgets.find((b) => b.name === name), name).toBeUndefined();
    expect(budgets.filter((b) => /packages\/(?:landing|cms|app|docs)\//.test(b.file ?? b.glob ?? ""))).toEqual([]);
  });

  it("is in the PRINCIPLES.md table of section 8, with the same ceiling, and the table has no row of the four packages", () => {
    const principles = read("PRINCIPLES.md");
    expect(principles).toMatch(/^\| Each pattern of a kind of site in `catalog` \([^\n]*\{landing,cms,app,docs\}-\*\.min\.css[^\n]*\| — \| ≤ 0\.75 kB \| 0\.75 kB \| 1 kB \|$/m);
    for (const name of ["landing", "cms", "app", "docs"]) expect(principles, `${name} CSS`).not.toMatch(new RegExp(`^\\| \`${name}\` CSS \\|`, "m"));
  });
});

/* ---- classes.json --------------------------------------------------------------------------- */

describe("the classes of the patterns, in classes.json of catalog", () => {
  const manifest = json("packages/catalog/dist/classes.json");
  const byName = new Map(manifest.classes.map((c) => [c.name, c]));

  /** A class or block of each pattern, and the file that declares it. */
  const BLOCKS = {
    "luz-landing-header": "landing-header",
    "luz-landing-hero": "landing-hero",
    "luz-landing-main": "landing-main",
    "luz-landing-section": "landing-section",
    "luz-landing-stat": "landing-stat",
    "luz-landing-footer": "landing-footer",
    "luz-landing-glow": "landing-glow",
    "luz-cms-header": "cms-header",
    "luz-cms-page-header": "cms-page-header",
    "luz-cms-article-header": "cms-article-header",
    "luz-cms-article": "cms-article",
    "luz-cms-toc": "cms-article",
    "luz-cms-footer": "cms-footer",
    "luz-app-header": "app-header",
    "luz-app-dashboard": "app-dashboard",
    "luz-docs-shell": "docs-shell",
    "luz-docs-page-head": "docs-page-head",
    "luz-docs-rail": "docs-rail",
    "luz-docs-example": "docs-example",
    "luz-docs-dodont": "docs-dodont",
    "luz-docs-pager": "docs-pager",
    "luz-docs-page-foot": "docs-page-foot",
  };

  it.each(Object.entries(BLOCKS))(".%s is a defined pattern of luz.catalog, declared in components/%s.css", (name, file) => {
    expect(byName.get(name), name).toMatchObject({ kind: "pattern", layer: "luz.catalog", defined: true });
    expect(byName.get(name).files, name).toContain(`components/${file}.css`);
  });

  it("every class of a kind of site is a pattern of luz.catalog, and no file but its kind's declares it", () => {
    const own = manifest.classes.filter((c) => /^luz-(landing|cms|app|docs)-/.test(c.name));
    expect(own.length).toBeGreaterThan(80);
    for (const c of own) {
      expect(c.kind, c.name).toBe("pattern");
      expect(c.layer, c.name).toBe("luz.catalog");
      const kind = /^luz-(landing|cms|app|docs)-/.exec(c.name)[1];
      if (c.defined) for (const file of c.files) expect(kindOfFile(file), `${c.name} in ${file}`).toBe(kind);
    }
  });

  it("every one of the 21 files declares a class, and classes.json says so", () => {
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

  it("holds the properties a pattern sets for its own parts, in its file: --luz-docs-measure in docs-shell.css, --luz-cms-toc-top in cms-article.css", () => {
    const own = (name) => manifest.properties.find((p) => p.name === name);
    expect(own("--luz-docs-measure")).toMatchObject({ scope: "component", layer: "luz.catalog", files: ["components/docs-shell.css"] });
    expect(own("--luz-cms-toc-top")).toMatchObject({ scope: "component", layer: "luz.catalog", files: ["components/cms-article.css"] });
    expect(own("--luz-landing-glow-start")).toMatchObject({ scope: "component", files: ["components/landing-glow.css"] });
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
    const names = imports.map((href) => /components\/((?:landing|cms|app|docs)-[\w-]+)\.css$/.exec(href)?.[1]).filter(Boolean);
    expect(names.sort(), "the file imports the 21 patterns").toEqual([...ALL].sort());
  });
});

/* ---- scripts/docs-site/kinds.js -------------------------------------------------------------- */

describe("scripts/docs-site/kinds.js lists the files and the pages of each kind", () => {
  it("has the four kinds, with their files in the order the kind's stylesheet had them", () => {
    expect(Object.keys(member("KIND_PATTERNS"))).toEqual(KINDS);
    for (const kind of KINDS) expect(member("KIND_PATTERNS")[kind].files, kind).toEqual(FILES[kind]);
  });

  it("names the page of each pattern that has one: glow and main have none, and the table of contents is `toc`", () => {
    const { landing, cms, app, docs } = member("KIND_PATTERNS");
    expect(landing.pages).toEqual(["header", "hero", "section", "stat", "footer"]);
    expect(cms.pages).toEqual(["header", "page-header", "article-header", "toc", "footer"]);
    expect(app.pages).toEqual(["header", "dashboard"]);
    expect(docs.pages).toEqual(FILES.docs);
  });

  it("knows a file of a pattern by its name, plain or minified, and no other", () => {
    expect(isKindFile("components/landing-hero.css")).toBe(true);
    expect(isKindFile("components/docs-pager.min.css")).toBe(true);
    expect(kindOfFile("components/cms-article.css")).toBe("cms");
    expect(isKindFile("components/search.css")).toBe(false);
    expect(isKindFile("components/lang-switch.css")).toBe(false);
    expect(kindOfFile("components/banner.css")).toBeNull();
  });

  it("kindFiles() fails when the list and the built files of catalog disagree: a file added without a line, or a line without its file", () => {
    const built = (names) => names.map((file) => ({ file: `components/${file}.css`, tags: [], classes: [] }));
    expect(kindFiles("app", built(["app-header", "app-dashboard", "search"]))).toEqual(["components/app-header.css", "components/app-dashboard.css"]);
    expect(() => kindFiles("app", built(["app-header"]))).toThrow(/missing: components\/app-dashboard\.css/);
    expect(() => kindFiles("app", built(["app-header", "app-dashboard", "app-menu"]))).toThrow(/not listed: components\/app-menu\.css/);
    expect(() => kindFiles("nope", [])).toThrow(/not a kind of site/);
  });
});

/* ---- The docs ------------------------------------------------------------------------------ */

/** The page of each pattern: [slug, files the page names, the id of its docs-component]. */
const PAGES = [
  ["landing-header", ["landing-header"], "p-landing-header"],
  ["landing-hero", ["landing-hero"], "p-landing-hero"],
  ["landing-section", ["landing-main", "landing-section", "landing-glow"], "p-landing-section"],
  ["landing-stat", ["landing-stat"], "p-landing-stat"],
  ["landing-footer", ["landing-footer"], "p-landing-footer"],
  ["cms-header", ["cms-header"], "p-cms-header"],
  ["cms-page-header", ["cms-page-header"], "p-cms-page-header"],
  ["cms-article-header", ["cms-article-header"], "p-article-header"],
  ["cms-toc", ["cms-article"], "p-toc"],
  ["cms-footer", ["cms-footer"], "p-cms-footer"],
  ["app-header", ["app-header"], "p-app-header"],
  ["app-dashboard", ["app-dashboard"], "p-app-dashboard"],
  ...FILES.docs.map((name) => [`docs-${name}`, [`docs-${name}`], `p-docs-${name}`]),
];
const ELEMENT_PAGES = ["banner", "consent", "lang-switch", "mode", "search", "submenu"];
const catalogPages = () => repoSite.pages.filter((p) => p.meta.area === "catalog");

describe("the pages of the 19 patterns, at /docs/catalog/<kind>-<name>/", () => {
  it("are 19 pages beside the six elements, the class reference and the gallery: 27 in the area", () => {
    expect(PAGES).toHaveLength(19);
    const routes = catalogPages().map((p) => p.route).sort();
    expect(routes).toEqual(["/docs/catalog/", "/docs/catalog/classes/", ...[...ELEMENT_PAGES, ...PAGES.map(([slug]) => slug)].map((slug) => `/docs/catalog/${slug}/`)].sort());
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

  it("every one of the 21 files is named by the `files:` of exactly one page", () => {
    const named = catalogPages().flatMap((p) => p.meta.files.split(/[,;]/).map((f) => f.trim()).filter((f) => isKindFile(f)));
    expect(named.sort()).toEqual(ALL.map((name) => `components/${name}.css`).sort());
  });

  it("the Do and don't of the docs patterns is titled \"Do and don't\", the name the component pages use for the same block", () => {
    expect(repoSite.byRoute.get("/docs/catalog/docs-dodont/").meta.title).toBe("Do and don't");
  });

  it("each page has a Spanish translation, pending review or reviewed, with its own `fits`", () => {
    for (const [slug] of PAGES) {
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
      ...FILES.docs.map((name) => `/docs/documentation/${name === "dodont" ? "dodont" : name}/`),
      "/docs/landing/hero/",
      "/docs/cms/toc/",
      "/docs/app/dashboard/",
    ];
    expect(OLD.filter((route) => repoSite.byRoute.has(route))).toEqual([]);
  });

  it("nothing links to the old routes: pages, partials, layouts, the home, its catalogs, site.json, the README and the scripts", () => {
    const old = /\/docs\/(?:landing|cms|app|documentation)\//;
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

  it("no page says the CSS of a pattern is `components/<name>.css` of a kind's package: the file is `<kind>-<name>.css` of catalog", () => {
    const offenders = PAGES.flatMap(([slug]) => {
      const text = readFileSync(`${root}apps/docs/pages/catalog/${slug}.html`, "utf-8");
      return text.split("\n").flatMap((line, i) => (/(?:landing|cms|app|docs)'?s <code>components\//.test(line) || /\bcms\.css\b|\blanding\.css\b|\bdocs\.css\b|\bapp\.css\b/.test(line) ? [`${slug}.html:${i + 1}: ${line.trim().slice(0, 90)}`] : []));
    });
    expect(offenders).toEqual([]);
  });
});

describe("the pages that count the pieces name the patterns as files of catalog", () => {
  const structure = read("apps/docs/pages/get-started/structure.html");
  const start = read("apps/docs/pages/get-started/index.html");

  it("get-started/structure.html has a row for each kind of site in the table of what each package needs: its blocks, and catalog as the package", () => {
    expect(structure).toContain("@luz-ds/catalog");
    const NAMES = { landing: ["header", "hero", "main", "section", "stat", "footer", "glow"], cms: ["header", "page-header", "article-header", "article", "toc", "footer"], app: ["header", "dashboard"], docs: FILES.docs };
    for (const [kind, names] of Object.entries(NAMES)) {
      const row = structure.split("<tr>").find((r) => r.includes(`.luz-${kind}-${names[0]}`));
      expect(row, `the row of ${kind}`).toBeTruthy();
      // The row writes the first block whole and the rest by their suffix (`-hero`), or whole
      for (const name of names.slice(1)) expect(row.includes(`.luz-${kind}-${name}`) || row.includes(`<code>-${name}</code>`), `${kind}: ${name}`).toBe(true);
      expect(row, `${kind}: the package column`).toMatch(/data-label="Package"><div>catalog<\/div>/);
    }
  });

  it("get-started/index.html names each of the 21 files in a `<code>`, says there is no package for a kind, and links /docs/catalog/ and /docs/kinds/", () => {
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
    for (const name of ["landing-header", "cms-article", "app-dashboard", "docs-pager"]) expect(readme, name).toContain(name);
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
    navigation: ["app-header", "cms-header", "landing-header", "lang-switch", "submenu"],
    "page-structure": ["cms-article-header", "cms-footer", "cms-page-header", "landing-hero", "landing-footer", "landing-section"],
    content: ["app-dashboard", "landing-stat", "cms-toc"],
    "site-wide": ["mode", "banner", "consent", "search"],
    documentation: ["docs-dodont", "docs-example", "docs-page-foot", "docs-page-head", "docs-pager", "docs-rail", "docs-shell"],
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

  it("gives every page of the area its own order number: 0 for the gallery, then 1 to 26, no ties", () => {
    const orders = catalogPages().map((p) => Number(p.meta.order));
    expect(new Set(orders).size, `orders: ${orders.sort((a, b) => a - b).join(" ")}`).toBe(orders.length);
    expect(orders.sort((a, b) => a - b)).toEqual(Array.from({ length: 27 }, (_, i) => i));
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
  const KIND_OF = { landing: "landing", cms: "blog", app: "app", docs: "docs" };

  it("every pattern page of catalog has both, and no other page has either", () => {
    expect(patterns()).toHaveLength(25);
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

  it("a pattern of a kind fits that kind (landing-*: landing, cms-*: blog, app-*: app, docs-*: docs), and the six elements fit any site", () => {
    for (const [slug] of PAGES) {
      expect(repoSite.byRoute.get(`/docs/catalog/${slug}/`).meta["fits-kinds"], slug).toBe(KIND_OF[slug.split("-")[0]]);
    }
    for (const slug of ELEMENT_PAGES) expect(repoSite.byRoute.get(`/docs/catalog/${slug}/`).meta["fits-kinds"], slug).toBe("any");
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
  const headOf = (html) => query(parse(html), "header.luz-docs-page-head");

  it.each([
    ["/docs/catalog/landing-hero/", "en"],
    ["/docs/catalog/cms-header/", "en"],
    ["/docs/catalog/docs-shell/", "en"],
    ["/docs/catalog/search/", "en"],
    ["/es/docs/catalog/landing-hero/", "es"],
  ])("%s says `Fits best: <kinds as links> — <sentence>` under the lead and before the chips (%s)", (route, lang) => {
    const canonical = route.replace(/^\/es/, "");
    const page = repoSite.byRoute.get(canonical);
    const head = headOf(rendered.get(route));
    const fits = query(head, "p.docs-fits");
    expect(fits, `${route}: p.docs-fits`).toBeTruthy();
    const kinds = fitsKindsOf(page.meta["fits-kinds"]);
    // The words: label, then the kinds joined with commas, a dash, and the page's sentence (the page's own in its language)
    expect(textOf(fits).startsWith(`${LABEL[lang]} ${kinds.map((k) => KIND_WORD[lang][k]).join(", ")} — `), `${route}: ${textOf(fits)}`).toBe(true);
    if (lang === "en") expect(textOf(fits).endsWith(` — ${page.meta.fits}`), route).toBe(true);
    // Each kind but `any` is a link to its page of Kinds of site, in the language of the page
    const hrefs = findAll(fits, (n) => n.name === "a").map((a) => a.attrs.get("href"));
    expect(hrefs, route).toEqual(kinds.filter((k) => k !== "any").map((k) => `${lang === "es" ? "/es" : ""}/docs/kinds/${k}/`));
    // After the lead and before the chips
    const order = [query(head, "p.luz-docs-page-head__lead"), fits, query(head, "ul.luz-docs-page-head__meta")].map((n) => n.open.index);
    expect(order, route).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(3);
  });

  it("says `any site` for a piece that fits any, as plain words: there is no kind to link", () => {
    const fits = query(headOf(rendered.get("/docs/catalog/banner/")), "p.docs-fits");
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
      expect(cards, route).toHaveLength(25);
      for (const card of cards) {
        const href = query(card, "h3.docs-card__title").children.find((n) => n.name === "a").attrs.get("href");
        const slug = href.split("/").filter(Boolean).at(-1);
        const fits = query(card, "p.docs-card__fits");
        expect(fits, `${route} ${slug}`).toBeTruthy();
        expect(findAll(fits, (n) => n.name === "a"), `${route} ${slug}: plain`).toEqual([]);
        const kinds = fitsKindsOf(repoSite.byRoute.get(`/docs/catalog/${slug}/`).meta["fits-kinds"]);
        expect(textOf(fits).startsWith(`${LABEL[lang]} ${kinds.map((k) => KIND_WORD[lang][k]).join(", ")} — `), `${route} ${slug}: ${textOf(fits)}`).toBe(true);
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
    const page = repoSite.byRoute.get("/docs/catalog/landing-hero/");
    const html = renderPage(page, repoSite, {});
    expect(html.match(/class="docs-fits"/g)).toHaveLength(1);
  });
});

/* ---- The migration changeset --------------------------------------------------------------- */

describe("the migration changeset", () => {
  const notes = () => releaseNotes(root);
  const minor = (note, name) => note.bumps.some((b) => b.name === `@luz-ds/${name}` && b.level === "minor");

  it("is a minor of tokens, core, catalog and check, and says what to do: the table of files, the layers, the check", () => {
    const note = notes().find((n) => /catalog-patterns|components of `@luz-ds\/catalog`/.test(n.text) || (minor(n, "catalog") && /landing-hero\.css/.test(n.text)));
    expect(note, "a changeset about the patterns of the four kinds").toBeTruthy();
    for (const name of ["tokens", "core", "catalog", "check"]) expect(minor(note, name), name).toBe(true);
    for (const name of ["landing", "cms", "app", "docs"]) expect(note.bumps.some((b) => b.name === `@luz-ds/${name}`), `${name} is not a package`).toBe(false);
  });

  it("maps each of the 21 old files to its new one, and says the layers luz.landing, cms, app and docs are gone (breaking)", () => {
    const text = read(".changeset/catalog-patterns.md");
    for (const [kind, names] of Object.entries(FILES)) {
      for (const name of names) expect(text, `${kind}-${name}`).toContain(`@luz-ds/catalog/components/${kind}-${name}.css`);
    }
    for (const layer of ["luz.landing", "luz.cms", "luz.app", "luz.docs"]) expect(text, layer).toContain(layer);
    expect(text).toMatch(/\*\*Breaking:\*\*/);
  });
});
