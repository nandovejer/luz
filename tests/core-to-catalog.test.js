/**
 * F7 of .claude/plans/ai-and-catalog-only.md, "De core a catalog" (decisions 27 to 38):
 * the navbar, the sidebar (with its brand and `.luz-nav-toggle`), the terminal and the
 * timeline (`<luz-timeline>`) move from @luz-ds/core to @luz-ds/catalog, with no change
 * of classes, markup, attributes or look. What changes is the package, the import path
 * and what that carries: the layer (`luz.catalog`), the bundle (a file of components/ of
 * its own), the loader (`catalog.js`), the manifests and the budgets.
 *
 * The files are read as text and the built dist/ as the build left it; no browser. The
 * rest of the move is pinned where each thing already was tested (budgets in
 * tests/size-guard.test.js, layers in tests/layers.test.js, the pages in
 * tests/docs-site.test.js and tests/catalog-patterns.test.js, the criterion in
 * tests/release-text.test.js, the timeline in tests/timeline.test.js). This file holds
 * what has no older home:
 *
 *   - the packages: exports, files served, pack lists, the entry of core;
 *   - the manifests: classes and the element in catalog's, none in core's;
 *   - the boundary of decision 31: core names nothing of catalog;
 *   - the loader: five literal chunks, the sidebar's started at once, on a class;
 *   - EX-010, the changeset and the places that wire the pieces (apps, layouts);
 *   - luz-check's answer on a page that links core only;
 *   - no old path left in the sources, the docs, the specs and the fixtures.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { siteNumbers } from "../scripts/docs-site/i18n.js";
import { builtData, checkJson, removeWorkspaces, workspace } from "./helpers/check-fixtures.js";
import { checkModule } from "./helpers/check-modules.js";
import { releaseNotes } from "./helpers/release-notes.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8");
const json = (path) => JSON.parse(read(path));
const has = (path) => existsSync(join(repo, path));

/** The four components that moved, and the file of each in components/. */
const MOVED = ["navbar", "sidebar", "terminal", "timeline"];
/** The modules that moved with them. */
const MODULES = ["sidebar", "timeline"];

/** Every file under `dir` (repo-relative), skipping what is not source. */
function walk(dir, keep = () => true, out = []) {
  if (!has(dir)) return out;
  for (const entry of readdirSync(join(repo, dir)).sort()) {
    if (["node_modules", "dist", ".git", "docs", "test-results", "coverage"].includes(entry)) continue;
    const path = `${dir}/${entry}`;
    if (statSync(join(repo, path)).isDirectory()) walk(path, keep, out);
    else if (keep(path)) out.push(path);
  }
  return out;
}

afterAll(removeWorkspaces);

/* ---- The packages -------------------------------------------------------------------------- */

describe("catalog serves the four components and the two modules; core serves none", () => {
  const catalog = json("packages/catalog/package.json");
  const core = json("packages/core/package.json");

  it("catalog exports ./sidebar and ./timeline as dist modules, and ./components/* for the four stylesheets", () => {
    expect(catalog.exports["./sidebar"]).toBe("./dist/sidebar.js");
    expect(catalog.exports["./timeline"]).toBe("./dist/timeline.js");
    expect(catalog.exports["./components/*"]).toBe("./dist/components/*");
  });

  it("core exports neither ./sidebar nor ./timeline, and no component of the four", () => {
    expect(core.exports).not.toHaveProperty("./sidebar");
    expect(core.exports).not.toHaveProperty("./timeline");
    // core's ./components/* is a pattern over its own dist folder: it must not reach a file of the four
    for (const name of MOVED) {
      expect(has(`packages/core/dist/components/${name}.css`), `core dist/components/${name}.css`).toBe(false);
      expect(has(`packages/core/dist/components/${name}.min.css`), `core dist/components/${name}.min.css`).toBe(false);
    }
  });

  it("catalog's dist has components/{navbar,sidebar,terminal,timeline}.css and .min.css, and the two modules, plain and minified", () => {
    for (const name of MOVED) {
      expect(has(`packages/catalog/dist/components/${name}.css`), `${name}.css`).toBe(true);
      expect(has(`packages/catalog/dist/components/${name}.min.css`), `${name}.min.css`).toBe(true);
    }
    for (const name of MODULES) {
      expect(has(`packages/catalog/dist/${name}.js`), `${name}.js`).toBe(true);
      expect(has(`packages/catalog/dist/${name}.min.js`), `${name}.min.js`).toBe(true);
      expect(has(`packages/core/dist/${name}.js`), `core ${name}.js`).toBe(false);
      expect(has(`packages/core/dist/${name}.min.js`), `core ${name}.min.js`).toBe(false);
    }
  });

  it("the sources moved: catalog has them in src/components/ and src/, core has none of them", () => {
    for (const name of MOVED) {
      expect(has(`packages/catalog/src/components/${name}.css`), `catalog src/components/${name}.css`).toBe(true);
      expect(has(`packages/core/src/components/${name}.css`), `core src/components/${name}.css`).toBe(false);
    }
    for (const name of MODULES) {
      expect(has(`packages/catalog/src/${name}.js`), `catalog src/${name}.js`).toBe(true);
      expect(has(`packages/core/src/${name}.js`), `core src/${name}.js`).toBe(false);
    }
  });

  it("the tarball lists follow: catalog packs the four stylesheets and the two modules, core packs none", () => {
    const packed = (pkg) => read(`packages/${pkg}/pack-files.txt`).split("\n").map((l) => l.trim());
    for (const name of MOVED) {
      for (const file of [`dist/components/${name}.css`, `dist/components/${name}.min.css`]) {
        expect(packed("catalog"), `catalog packs ${file}`).toContain(file);
        expect(packed("core"), `core does not pack ${file}`).not.toContain(file);
      }
    }
    for (const name of MODULES) {
      for (const file of [`dist/${name}.js`, `dist/${name}.min.js`]) {
        expect(packed("catalog"), `catalog packs ${file}`).toContain(file);
        expect(packed("core"), `core does not pack ${file}`).not.toContain(file);
      }
    }
  });

  it("core's entry no longer starts the sidebar or loads the timeline: luz.js neither exports initSidebar nor names the two modules", () => {
    const entry = read("packages/core/src/luz.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(entry).not.toMatch(/initSidebar/);
    expect(entry).not.toMatch(/\.\/sidebar\.js|\.\/timeline\.js/);
    expect(entry).not.toMatch(/luz-timeline/);
    expect(read("packages/core/src/components/index.css")).not.toMatch(/navbar|sidebar|terminal|timeline/);
    for (const file of ["luz.js", "luz.min.js"]) {
      const built = read(`packages/core/dist/${file}`);
      expect(built, `core dist/${file} names initSidebar`).not.toMatch(/initSidebar/);
      expect(built, `core dist/${file} imports a module that moved`).not.toMatch(/\.\/(?:sidebar|timeline)(?:\.min)?\.js/);
    }
  });

  it("catalog declares each stylesheet as a file of the package, and describes the navigation and the timeline", () => {
    expect(catalog.sideEffects).toContain("./dist/components/*.css");
    const description = catalog.description.toLowerCase();
    for (const word of ["navbar", "sidebar", "terminal", "timeline"]) expect(description, word).toContain(word);
  });
});

/* ---- The manifests ------------------------------------------------------------------------- */

describe("the manifests say where the four came to", () => {
  const classes = (pkg) => json(`packages/${pkg}/dist/classes.json`).classes;
  /** The blocks of the four (`luz-nav-toggle` is the sidebar's, in sidebar.css). */
  const BLOCK = /^luz-(?:navbar|sidebar|nav-toggle|terminal|timeline)(?:__|--|$)/;

  it("<luz-timeline> is in catalog's custom-elements.json, with the stylesheet a page links for it", () => {
    const declarations = json("packages/catalog/dist/custom-elements.json").modules.flatMap((m) => m.declarations ?? []);
    const timeline = declarations.find((d) => d.tagName === "luz-timeline");
    expect(timeline, "luz-timeline in catalog").toBeTruthy();
    expect(timeline.stylesheet).toBe("components/timeline.css");
    const module = json("packages/catalog/dist/custom-elements.json").modules.find((m) => m.declarations?.some((d) => d.tagName === "luz-timeline"));
    expect(module.path).toBe("timeline.js");
    expect(module.exports).toStrictEqual([{ kind: "custom-element-definition", name: "luz-timeline", declaration: { name: "LuzTimeline", module: "timeline.js" } }]);
  });

  it("core ships a custom-elements.json for its one tag, <luz-theme-mode>, and it is not the timeline's: its export, its field and its file are core's own", () => {
    expect(has("packages/core/dist/custom-elements.json")).toBe(true);
    const core = json("packages/core/package.json");
    expect(core.exports["./custom-elements.json"]).toBe("./dist/custom-elements.json");
    expect(core.customElements).toBe("dist/custom-elements.json");
    expect(read("packages/core/pack-files.txt").split("\n").map((l) => l.trim())).toContain("dist/custom-elements.json");
    const tags = json("packages/core/dist/custom-elements.json").modules.flatMap((m) => m.declarations ?? []).map((d) => d.tagName);
    expect(tags, "the timeline is catalog's: core declares only the color mode").toEqual(["luz-theme-mode"]);
  });

  it("the classes of the four are in catalog's classes.json, each defined, in the file of its component, in the luz.catalog layer", () => {
    const own = classes("catalog").filter((c) => BLOCK.test(c.name));
    const names = own.map((c) => c.name);
    for (const name of ["luz-navbar", "luz-navbar__link", "luz-sidebar", "luz-sidebar__link", "luz-sidebar__brand", "luz-nav-toggle", "luz-terminal", "luz-timeline", "luz-timeline__item"]) {
      expect(names, name).toContain(name);
    }
    const FILE = { "luz-navbar": "navbar", "luz-sidebar": "sidebar", "luz-nav-toggle": "sidebar", "luz-terminal": "terminal", "luz-timeline": "timeline" };
    for (const c of own) {
      if (!c.defined) continue;
      expect(c.layer, c.name).toBe("luz.catalog");
      expect(c.files, c.name).toContain(`components/${FILE[c.block]}.css`);
    }
  });

  it("none of those classes is in core's classes.json any more", () => {
    expect(classes("core").filter((c) => BLOCK.test(c.name)).map((c) => c.name)).toEqual([]);
  });

  it("core's hooks lost the sidebar's scroll spy, which catalog reads now", () => {
    expect(json("packages/core/dist/classes.json").hooks).not.toContain("data-luz-spy");
    expect(json("packages/catalog/dist/classes.json").hooks).toContain("data-luz-spy");
  });
});

/* ---- The boundary of decision 31: core names nothing of catalog ---------------------------- */

describe("core names no class and no element of catalog (decision 31)", () => {
  const coreFiles = () => walk("packages/core/dist", (f) => /\.(?:css|js)$/.test(f)).filter((f) => !f.includes("/node_modules/"));
  const hits = (text, pattern) => (text.match(pattern) ?? []).length;

  /** A class of catalog as a selector or as a string: `.luz-x`, not `--luz-x-…` and not a longer name. */
  const classPattern = (name) => new RegExp(`(?<![\\w-])\\.${name}(?![\\w-])|["'\`]${name}(?![\\w-])["'\`]`, "g");
  /** A tag as a selector (`luz-x`), as markup (`<luz-x`) or in a call (`define("luz-x"`, `querySelector("luz-x")`). */
  const tagPattern = (tag) =>
    new RegExp(`(?<![\\w.#-])${tag}(?![\\w-])(?=[\\s,>:{[+~)]|$)|<${tag}(?![\\w-])|(?:define|get|whenDefined|querySelector(?:All)?|closest|matches)\\(\\s*["'\`][^"'\`]*(?<![\\w.-])${tag}(?![\\w-])`, "g");

  it("the dist of core has no class of the four, with a dot or as a string", () => {
    const names = ["luz-navbar", "luz-sidebar", "luz-nav-toggle", "luz-terminal", "luz-timeline"];
    const found = [];
    for (const file of coreFiles()) {
      const text = read(file);
      for (const name of names) {
        // the blocks and their parts and modifiers: `.luz-sidebar__link`, `.luz-navbar--sticky`
        if (new RegExp(`(?<![\\w-])\\.${name}(?![a-z0-9])`).test(text)) found.push(`${file}: .${name}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("the dist of core has no <luz-timeline>, as a selector, markup or a call", () => {
    const found = coreFiles().filter((file) => tagPattern("luz-timeline").test(read(file)));
    expect(found).toEqual([]);
  });

  it("the sources of core name none either, in a rule or in a script (comments aside)", () => {
    const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
    const found = walk("packages/core/src", (f) => /\.(?:css|js)$/.test(f))
      .filter((file) => /(?<![\w-])\.luz-(?:navbar|sidebar|nav-toggle|terminal|timeline)(?![a-z0-9])|<luz-timeline/.test(code(read(file))))
      .map((file) => file);
    expect(found).toEqual([]);
  });

  it("whatever catalog's manifests define, the dist of core names none of it (a class with `defined: true`, a tag it declares)", () => {
    const classes = json("packages/catalog/dist/classes.json").classes.filter((c) => c.defined && !c.name.startsWith("is-")).map((c) => c.name);
    const tags = json("packages/catalog/dist/custom-elements.json").modules.flatMap((m) => m.declarations ?? []).map((d) => d.tagName);
    expect(classes.length).toBeGreaterThan(100);
    expect(tags).toContain("luz-timeline");
    const found = [];
    for (const file of coreFiles()) {
      const text = read(file);
      for (const name of classes) if (hits(text, classPattern(name))) found.push(`${file}: class ${name}`);
      for (const tag of tags) if (hits(text, tagPattern(tag))) found.push(`${file}: element ${tag}`);
    }
    expect(found).toEqual([]);
  });

  it("what core keeps for the sidebar is a token: --luz-sidebar-width in the settings (.o-shell reads it) and the colours of semantic.css", () => {
    expect(read("packages/core/dist/luz.css")).toContain("--luz-sidebar-width");
    expect(read("packages/tokens/src/semantic.css")).toContain("--luz-sidebar-bg");
  });

  it("the rules core had over the moved classes went with them: the shell's sidebar and the color mode in the sidebar are in sidebar.css", () => {
    const sidebar = read("packages/catalog/src/components/sidebar.css");
    // `.o-shell > .luz-sidebar` loses to the sidebar's own rules by specificity now, so it is written inside :where()
    expect(sidebar).toMatch(/:where\(\.o-shell\)\s*>\s*\.luz-sidebar/);
    expect(sidebar).toMatch(/\.luz-sidebar\s+:where\(luz-theme-mode\)/);
    expect(sidebar.lastIndexOf(".luz-sidebar :where(luz-theme-mode)"), "the color mode's rule is at the end of the file").toBeGreaterThan(sidebar.indexOf(".luz-sidebar__link"));
    expect(sidebar, "the old switcher class is gone from the sidebar").not.toMatch(/luz-mode-switcher|luz-mode-btn|luz-mode-cycle/);
    // (a token like --luz-sidebar-width is not a class: core keeps those)
    expect(read("packages/core/src/objects/_objects.css")).not.toMatch(/\.luz-sidebar/);
    expect(read("packages/core/src/components/theme-mode.css")).not.toMatch(/\.luz-sidebar/);
    expect(read("packages/core/src/print/_print.css")).not.toMatch(/\.luz-sidebar|\.luz-timeline|luz-timeline/);
  });
});

/* ---- Layers: the order inside luz.catalog is core's, sidebar then navbar then terminal then timeline ---- */

describe("the four are linked in the order they had in core's bundle: sidebar, navbar, terminal, timeline (decision 29)", () => {
  it("the docs page layout links them in that order, after core", () => {
    const layout = read("apps/docs/_layouts/page.html");
    const links = [...layout.matchAll(/<link[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    const at = (file) => links.findIndex((href) => href.endsWith(file));
    const core = links.findIndex((href) => /packages\/core\/dist\/luz\.css$/.test(href));
    expect(core, "core's luz.css").toBeGreaterThanOrEqual(0);
    const order = MOVED.map((name) => at(`/packages/catalog/dist/components/${name}.css`));
    // sidebar, navbar, terminal, timeline
    expect(order.every((i) => i > core), `linked after core: ${order}`).toBe(true);
    const wanted = ["sidebar", "navbar", "terminal", "timeline"].map((name) => at(`/packages/catalog/dist/components/${name}.css`));
    expect([...wanted].sort((a, b) => a - b)).toEqual(wanted);
  });
});

/* ---- The loader ---------------------------------------------------------------------------- */

describe("catalog.js, the presence loader, loads the two chunks that came from core", () => {
  const loader = () => read("packages/catalog/src/catalog.js");
  const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

  it("names six chunks as literals (SEC-CHUNK-1), search, cookie-consent, theme-time, theme-time-bar, timeline and sidebar, and nothing else (F8 named the chunks for their elements)", () => {
    const targets = [...code(loader()).matchAll(/\bimport\s*\(\s*(["'])(\.\/[\w.-]+\.js)\1\s*\)/g)].map((m) => m[2]).sort();
    expect(targets).toEqual(["./cookie-consent.js", "./search.js", "./sidebar.js", "./theme-time-bar.js", "./theme-time.js", "./timeline.js"]);
    expect(code(loader()).match(/\bimport\s*\(/g)).toHaveLength(6);
  });

  it("<luz-timeline> loads timeline.js", () => {
    expect(code(loader())).toMatch(/["']luz-timeline["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/timeline\.js["']\s*\)/);
    expect(code(loader())).toMatch(/querySelector\(\s*["']luz-timeline["']\s*\)/);
  });

  it("a .luz-sidebar, or a list marked data-luz-spy, loads sidebar.js and starts initSidebar() as soon as the page is scanned, not on idle", () => {
    const source = code(loader());
    const scan = /querySelector\(\s*(["'])([^"']*)\1\s*\)[^;\n]*load\(\s*["']sidebar["']\s*\)/.exec(source);
    expect(scan, "a querySelector(...) that loads the sidebar chunk").toBeTruthy();
    expect(scan[2], "the selector").toBe(".luz-sidebar, [data-luz-spy]");
    // the line is a plain `if`, not wrapped in idle(): the scroll spy reaches the page as it did from core's entry
    expect(scan[0], "not behind idle()").not.toMatch(/idle\(/);
    expect(source).toMatch(/import\(\s*["']\.\/sidebar\.js["']\s*\)\s*\.then\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.initSidebar\(\s*\)\s*\)/);
  });

  it("the timeline chunk defines the element when it is imported and exports initTimeline(root, t); the sidebar chunk exports initSidebar and imports nothing", () => {
    expect(code(read("packages/catalog/src/timeline.js"))).toMatch(/customElements\.define\(\s*["']luz-timeline["']/);
    expect(code(read("packages/catalog/src/timeline.js"))).toMatch(/export\s+function\s+initTimeline\s*\(\s*root\s*,\s*translate/);
    const sidebar = code(read("packages/catalog/src/sidebar.js"));
    expect(sidebar).toMatch(/export\s+function\s+initSidebar\b/);
    expect(sidebar.match(/\bimport\b[^(]/g) ?? [], "sidebar.js imports nothing (SEC-CHUNK-2)").toEqual([]);
    expect(code(read("packages/catalog/src/timeline.js")).match(/^\s*import\b/gm) ?? [], "timeline.js imports nothing (SEC-CHUNK-2)").toEqual([]);
  });

  it("the header of catalog.js says that the sidebar is the one selector that is not a tag", () => {
    expect(loader()).toMatch(/\.luz-sidebar[\s\S]{0,800}not a tag|not a tag[\s\S]{0,800}\.luz-sidebar/i);
  });

  it("the build lists the six chunks and the size guard expects them", () => {
    const chunks = /chunks:\s*\[([^\]]*)\]/.exec(read("scripts/build-catalog.js"))?.[1] ?? "";
    expect([...chunks.matchAll(/["']([\w.-]+\.js)["']/g)].map((m) => m[1])).toEqual(["search.js", "cookie-consent.js", "theme-time.js", "theme-time-bar.js", "timeline.js", "sidebar.js"]);
    const loaders = /const LOADERS = \{([^;]*)\};/.exec(read("scripts/check-size.js"))?.[1] ?? "";
    expect(loaders).toContain("./sidebar.min.js");
    expect(loaders).toContain("./timeline.min.js");
    expect(read("scripts/build-core.js")).not.toMatch(/timeline\.js|sidebar\.js/);
  });
});

/* ---- EX-010 and the changeset -------------------------------------------------------------- */

describe("EX-010 and the migration changeset", () => {
  it("EX-010 is in EXCEPTIONS.md with the path of the timeline in catalog, and the code carries the luz-exception comment", () => {
    const row = read("EXCEPTIONS.md").split("\n").find((line) => line.startsWith("| EX-010 "));
    expect(row, "the EX-010 row").toBeTruthy();
    expect(row).toContain("packages/catalog/src/timeline.js");
    expect(row).not.toContain("packages/core/src/timeline.js");
    expect(row).toContain("initTimeline(document, t)");
    expect(read("packages/catalog/src/timeline.js")).toMatch(/luz-exception:\s*EX-010/);
    expect(has("packages/core/src/timeline.js")).toBe(false);
    const elsewhere = walk("packages", (f) => /\/src\/.*\.(?:js|css)$/.test(f)).filter((f) => /luz-exception:\s*EX-010/.test(read(f)));
    expect(elsewhere).toEqual(["packages/catalog/src/timeline.js"]);
  });

  /** The changesets that are not the folder's README. */
  const changesets = () => walk(".changeset", (f) => f.endsWith(".md") && !f.endsWith("README.md")).map((f) => ({ file: f, text: read(f) }));
  const frontMatter = (text) => /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";

  it("a changeset bumps tokens, core, catalog and check by a minor, and says what changed route by route (decision 36)", () => {
    // pending changesets, or the same notes in the CHANGELOGs once the Version PR has consumed them
    const found = releaseNotes(repo).map(({ file, text }) => ({ file, text: text.replace(/[ \t]{2,}/g, " ") })).find(({ text }) => ["tokens", "core", "catalog", "check"].every((pkg) => new RegExp(`"@luz-ds/${pkg}":\\s*minor`).test(frontMatter(text))) && /@luz-ds\/core\/sidebar/.test(text));
    expect(found, "a changeset for the four packages that names @luz-ds/core/sidebar").toBeTruthy();
    const body = found.text.slice(found.text.indexOf("---", 3) + 3);
    for (const route of ["@luz-ds/core/sidebar", "@luz-ds/catalog/sidebar", "@luz-ds/core/timeline", "@luz-ds/catalog/timeline"]) expect(body, route).toContain(route);
    for (const name of MOVED) expect(body, name).toContain(name);
    // what a consumer loses or has to do
    expect(body).toMatch(/components\/(?:\{[^}]+\}|<name>|navbar)[^\n]*\.css/);
    expect(body).toMatch(/luz\.css[^\n]*(?:no longer|do not|does not)/i);
    expect(body).toMatch(/print/i);
    expect(body).toMatch(/luz\.catalog/);
    expect(body).toMatch(/\.u-\*|utilit/i);
    expect(body).toMatch(/scroll spy/i);
    expect(body).toMatch(/registerLocale\(\)/);
    expect(body).toMatch(/initTimeline\(document, t\)/);
    expect(body).toMatch(/custom-elements\.json/);
    expect(body).toMatch(/\/docs\/components\/\{navbar,sidebar,terminal,timeline\}\/[\s\S]*\/docs\/catalog\/\{navbar,sidebar,terminal,timeline\}\//);
    expect(body).toMatch(/load\/package-missing/);
  });

  it("no other changeset is a duplicate of it: the ones that exist have a frontmatter of packages", () => {
    for (const { file, text } of changesets()) expect(frontMatter(text), file).toMatch(/"@luz-ds\/[a-z]+":\s*(?:major|minor|patch)/);
  });
});

/* ---- Where the apps and the pages wire them ------------------------------------------------ */

describe("the apps and the generator take them from catalog", () => {
  it("apps/site/header.js and apps/docs/reference.js import initSidebar and the timeline from /packages/catalog/dist/, never from core's", () => {
    for (const file of ["apps/site/header.js", "apps/docs/reference.js"]) {
      const text = read(file);
      expect(text, file).not.toMatch(/\/packages\/core\/dist\/(?:sidebar|timeline)\.js/);
    }
    expect(read("apps/site/header.js")).toMatch(/import\s*\{\s*initSidebar\s*\}\s*from\s*["']\/packages\/catalog\/dist\/sidebar\.js["']/);
    expect(read("apps/docs/reference.js")).toMatch(/import\s*\{\s*initSidebar\s*\}\s*from\s*["']\/packages\/catalog\/dist\/sidebar\.js["']/);
    expect(read("apps/docs/reference.js")).toMatch(/import\(\s*["']\/packages\/catalog\/dist\/timeline\.js["']\s*\)/);
  });

  it("the docs app gives the timeline core's t: after importing the chunk it calls initTimeline(document, t), as EX-010 and decision 33 say it does", () => {
    // The chunk carries English and Spanish only; a language the docs register with registerLocale() (Arabic) reaches the timeline this way
    const text = read("apps/docs/reference.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(text).toMatch(/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*["']\/packages\/core\/dist\/i18n\.js["']/);
    expect(text).toMatch(/import\(\s*["']\/packages\/catalog\/dist\/timeline\.js["']\s*\)/);
    expect(text).toMatch(/initTimeline\(\s*document\s*,\s*t\s*\)/);
  });

  it("the generator's snippets know the two chunks as catalog's and the four stylesheets as files of catalog", () => {
    const snippets = read("scripts/docs-site/snippets.js");
    const files = /export const FILES = \{([\s\S]*?)\n\};/.exec(snippets)?.[1] ?? "";
    const core = /core:\s*\{[^}]*chunks:\s*\[([^\]]*)\]/.exec(files)?.[1] ?? "";
    const catalog = /catalog:\s*\{[^}]*chunks:\s*\[([^\]]*)\]/.exec(files)?.[1] ?? "";
    expect(core).not.toMatch(/timeline|sidebar/);
    expect(catalog).toMatch(/timeline\.min\.js/);
    expect(catalog).toMatch(/sidebar\.min\.js/);
    expect(snippets).toMatch(/["']timeline\.min\.js["']\s*:\s*\[\s*["']catalog["']/);
    expect(snippets).toMatch(/["']sidebar\.min\.js["']\s*:\s*\[\s*["']catalog["']/);
  });

  it("the consumer smoke test probes the two modules in catalog and none in core", () => {
    const smoke = read("scripts/smoke-consumer.js");
    expect(smoke).toMatch(/dist\/sidebar\.js/);
    expect(smoke).toMatch(/dist\/timeline\.js/);
    expect(smoke).not.toMatch(/core\s*\+\s*["']\/dist\/(?:sidebar|timeline)\.js/);
  });

  it("every template of the apps that uses a class of the four links the catalog file of it", () => {
    const manifest = json("packages/catalog/dist/classes.json").classes.filter((c) => c.defined && c.files?.length && c.files.every((f) => MOVED.some((m) => f === `components/${m}.css`)));
    const fileOf = new Map(manifest.map((c) => [c.name, c.files[0]]));
    expect(fileOf.get("luz-sidebar")).toBe("components/sidebar.css");
    expect(fileOf.get("luz-nav-toggle")).toBe("components/sidebar.css");
    const templates = ["apps/docs/_layouts/page.html", "apps/docs/_layouts/not-found.html", "apps/landing/index.html"];
    const missing = [];
    for (const file of templates) {
      const text = read(file);
      const used = new Set([...text.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => fileOf.has(c)).map((c) => fileOf.get(c)));
      if (/<luz-timeline\b/.test(text)) used.add("components/timeline.css");
      for (const component of used) if (!text.includes(`/packages/catalog/dist/${component}`)) missing.push(`${file}: ${component}`);
    }
    expect(missing).toEqual([]);
  });
});

/* ---- luz-check: a page that links core only is told to add the file of catalog -------------- */

describe("luz-check tells a page that links core only to add the catalog file of the sidebar, the navbar, the terminal and the timeline", () => {
  const page = (body, extra = "") => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>P</title>
  <link rel="stylesheet" href="node_modules/@luz-ds/tokens/dist/luz-tokens.min.css">
  <link rel="stylesheet" href="node_modules/@luz-ds/core/dist/luz.min.css">${extra}
</head>
<body>
${body}
</body>
</html>
`;
  const found = async (body, extra) => {
    const { data } = await builtData();
    const dir = workspace({ "index.html": page(body, extra) });
    const result = checkJson(["."], dir, { data });
    return result.data.findings.filter((f) => f.rule === "load/package-missing").map((f) => f.message);
  };

  it.each([
    { name: "luz-sidebar", component: "components/sidebar.css", body: '<nav class="luz-sidebar" aria-label="Main"><a class="luz-sidebar__link" href="/">Home</a></nav>' },
    { name: "luz-navbar", component: "components/navbar.css", body: '<nav class="luz-navbar" aria-label="Main"><ul class="luz-navbar__list"><li><a class="luz-navbar__link" href="/">Home</a></li></ul></nav>' },
    { name: "luz-terminal", component: "components/terminal.css", body: '<div class="luz-terminal"><pre class="luz-code-block"><code>npm i</code></pre></div>' },
    { name: "luz-timeline", component: "components/timeline.css", body: '<ol class="luz-timeline"><li class="luz-timeline__item">2026</li></ol>' },
  ])("a page that links core only is told to add the file of .$name: $component", async ({ name, component, body }) => {
    const messages = await found(body);
    // the words are messages.js's, not typed here
    expect(messages).toContain((await checkModule("messages")).message("load/package-missing:file", { name, package: "catalog", file: component }));
  });

  it("<luz-timeline> names the same file", async () => {
    const messages = await found('<luz-timeline aria-label="History"><ol><li>2026</li></ol></luz-timeline>');
    expect(messages).toEqual([(await checkModule("messages")).message("load/package-missing:tag-file", { tag: "luz-timeline", package: "catalog", file: "components/timeline.css" })]);
  });

  it("the sidebar's mobile button, .luz-nav-toggle, is the sidebar's file too", async () => {
    const messages = await found('<button class="luz-nav-toggle" popovertarget="nav" aria-label="Menu"></button>');
    expect(messages).toEqual([(await checkModule("messages")).message("load/package-missing:file", { name: "luz-nav-toggle", package: "catalog", file: "components/sidebar.css" })]);
  });

  it("a page that links the catalog file after core is told nothing", async () => {
    const links = MOVED.map((name) => `\n  <link rel="stylesheet" href="node_modules/@luz-ds/catalog/dist/components/${name}.min.css">`).join("");
    const body = [
      '<nav class="luz-sidebar" aria-label="Main"><a class="luz-sidebar__link" href="/">Home</a></nav>',
      '<nav class="luz-navbar" aria-label="Nav"><ul class="luz-navbar__list"><li><a class="luz-navbar__link" href="/">Home</a></li></ul></nav>',
      '<div class="luz-terminal"><pre class="luz-code-block"><code>npm i</code></pre></div>',
      '<luz-timeline aria-label="History"><ol class="luz-timeline"><li class="luz-timeline__item">2026</li></ol></luz-timeline>',
    ].join("\n");
    expect(await found(body, links)).toEqual([]);
  });
});

/* ---- No old path is left ------------------------------------------------------------------- */

describe("no old path is left in the sources, the docs, the specs or the fixtures", () => {
  /** A place core served, or a docs route, that does not exist any more. */
  const OLD = [
    /packages\/core\/(?:dist|src)\/(?:sidebar|timeline)(?:\.min)?\.js/,
    /@luz-ds\/core\/(?:sidebar|timeline)\b/,
    /packages\/core\/(?:dist|src)\/components\/(?:navbar|sidebar|terminal|timeline)(?:\.min)?\.css/,
    /@luz-ds\/core\/components\/(?:navbar|sidebar|terminal|timeline)\b/,
    /\/docs\/components\/(?:navbar|sidebar|terminal|timeline)\b/,
    /\/examples\/components\/(?:navbar|sidebar|terminal|timeline)\b/,
    /pages\/components\/(?:navbar|sidebar|terminal|timeline)\.html/,
  ];
  const skip = (file) => /(?:^|\/)CHANGELOG\.md$/.test(file) || file.startsWith(".changeset/") || file === "dev/BROWSER-REVIEWS.md" || file === "tests/core-to-catalog.test.js";
  // A sentence of a guide that says where a path went ("`@luz-ds/core/sidebar` is now `@luz-ds/catalog/sidebar`") names the old one on purpose
  const MIGRATION = /\b(?:is now|are `?@luz|becomes?|became|moved|were core's|was core's|no longer|instead of|replace)\b/i;
  const stale = (files) => {
    const out = [];
    for (const file of files) {
      if (skip(file)) continue;
      read(file)
        .split("\n")
        .forEach((line, i) => {
          if (file.endsWith(".md") && MIGRATION.test(line)) return;
          if (OLD.some((pattern) => pattern.test(line))) out.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
    }
    return out;
  };
  const text = (f) => /\.(?:js|css|html|md|json|txt|yml|yaml)$/.test(f);

  it("the packages, the apps, the scripts, the docs and the repository's own text", () => {
    const files = [
      ...walk("packages", text),
      ...walk("apps", text),
      ...walk("scripts", text),
      ...walk("dev", text),
      ...walk(".github", text),
      ...readdirSync(repo).filter((f) => /\.(?:md|json|js)$/.test(f) && statSync(join(repo, f)).isFile()),
    ].filter((f) => !f.startsWith("packages/check/dist/"));
    expect(stale(files)).toEqual([]);
  });

  it("the specs", () => {
    expect(stale(walk("tests", (f) => /\.spec\.js$/.test(f)))).toEqual([]);
  });

  it("the fixtures", () => {
    expect(stale(walk("tests/fixtures", text))).toEqual([]);
  });

  it("no source, doc or prompt says the sidebar, the navbar, the terminal or the timeline is core's", () => {
    // History is kept as written: the ledger of browser reviews and the changelogs
    const said = /\bcore'?s?\s+(?:`?\.?luz-)?(?:sidebar|navbar|terminal|timeline|nav-toggle)\b/i;
    const files = [...walk("packages", text), ...walk("apps", text), ...walk("scripts", text), ...walk("dev", text), "AGENTS.md", "PRINCIPLES.md", "DESIGN.md", "README.md", "SECURITY.md", "VERSIONING.md", "CONTRIBUTING.md"]
      .filter((f) => !skip(f) && !f.startsWith("packages/check/dist/") && f !== "EXCEPTIONS.md");
    const out = [];
    for (const file of files) {
      read(file)
        .split("\n")
        .forEach((line, i) => {
          if (said.test(line) && !/\b(?:was|were|came|moved|until|no longer|left core)\b/i.test(line)) out.push(`${file}:${i + 1}: ${line.trim().slice(0, 140)}`);
        });
    }
    expect(out).toEqual([]);
  });

  it("every fixture page that uses a class or the tag of the four links the catalog file of it, after core", () => {
    const manifest = json("packages/catalog/dist/classes.json").classes.filter((c) => c.defined && c.files?.length && c.files.every((f) => MOVED.some((m) => f === `components/${m}.css`)));
    const fileOf = new Map(manifest.map((c) => [c.name, c.files[0]]));
    const missing = [];
    for (const file of walk("tests/fixtures", (f) => f.endsWith(".html") && !f.startsWith("tests/fixtures/check/"))) {
      const html = read(file);
      const used = new Set([...html.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => fileOf.has(c)).map((c) => fileOf.get(c)));
      if (/<luz-timeline\b/.test(html)) used.add("components/timeline.css");
      for (const component of used) {
        const linked = [...html.matchAll(/<link[^>]*href="([^"]+)"/g)].map((m) => m[1]);
        const index = linked.findIndex((href) => href.replace(/\.min\.css$/, ".css").endsWith(`/packages/catalog/dist/${component}`));
        const core = linked.findIndex((href) => /\/packages\/core\/dist\/luz(?:\.min)?\.css$/.test(href));
        if (index === -1) missing.push(`${relative("tests", file)}: ${component} is not linked`);
        else if (core !== -1 && index < core) missing.push(`${relative("tests", file)}: ${component} is linked before core`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("the specs that load a script of the four import it from catalog, and the docs they visit are at /docs/catalog/<slug>/", () => {
    const specs = walk("tests", (f) => f.endsWith(".spec.js"));
    const bad = specs.filter((f) => /(?:dist|src)\/(?:sidebar|timeline)\b/.test(read(f)) && !/catalog\/(?:dist|src)\/(?:sidebar|timeline)\b|catalog\/(?:dist|src)\//.test(read(f)));
    expect(bad).toEqual([]);
  });
});

/* ---- The counts typed in the docs pages follow the sources --------------------------------- */

describe("the figures the docs pages type in a <span data-count> are the ones of the sources (33 components became 29 of core)", () => {
  // Nothing computes these spans: the page says "29" because someone typed it. This is the check that it stays true.
  const pages = () => walk("apps/docs", (f) => f.endsWith(".html") && /\/pages\//.test(f));
  const spans = (name) => pages().flatMap((file) => [...read(file).matchAll(new RegExp(`<span data-count="${name}">(\\d+)</span>`, "g"))].map((m) => ({ file, value: Number(m[1]) })));

  it("components: the stylesheets of core's components, on the docs home, the get-started pages and their Spanish pages", () => {
    const expected = siteNumbers(repo).components;
    const found = spans("components");
    expect(found.length, "pages that say how many components there are").toBeGreaterThanOrEqual(4);
    expect(found.filter((s) => s.value !== expected).map((s) => `${s.file}: ${s.value}, not ${expected}`)).toEqual([]);
    expect(expected, "core has 33 stylesheets less the navbar, the sidebar, the terminal and the timeline").toBe(29);
  });

  it("semantic: the tokens of the light block of semantic.css", () => {
    const expected = siteNumbers(repo).semantic;
    expect(spans("semantic").filter((s) => s.value !== expected).map((s) => `${s.file}: ${s.value}, not ${expected}`)).toEqual([]);
  });

  it("utilities: the utility classes core defines", () => {
    const expected = new Set(json("packages/core/dist/classes.json").classes.filter((c) => c.kind === "utility" && c.defined).map((c) => c.name)).size;
    expect(spans("utilities").filter((s) => s.value !== expected).map((s) => `${s.file}: ${s.value}, not ${expected}`)).toEqual([]);
  });

  it("modules: the rows of the table of JavaScript modules of core, which lost the sidebar and the timeline", () => {
    for (const file of ["apps/docs/pages/get-started/javascript.html", "apps/docs/i18n/es/pages/get-started/javascript.html"]) {
      const html = read(file);
      const table = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
      const rows = (table.match(/<tr>/g) ?? []).length;
      const typed = Number(/<span data-count="modules">(\d+)<\/span>/.exec(html)?.[1]);
      expect(typed, file).toBe(rows);
      expect(table, `${file} lists sidebar.js`).not.toContain("<code>sidebar.js</code>");
      expect(table, `${file} lists timeline.js`).not.toContain("<code>timeline.js</code>");
    }
  });
});

describe("the pages that describe catalog no longer say it holds six pieces that need data of the site (F7, decision 35)", () => {
  // Catalog is the navigation of the site and the pieces with JS or an identity of their own: the six elements, the navbar, the sidebar,
  // the terminal, the timeline and the patterns of the kinds of site
  const PAGES = ["apps/docs/pages/get-started/index.html", "apps/docs/i18n/es/pages/get-started/index.html", "apps/docs/pages/catalog/index.html", "apps/docs/i18n/es/pages/catalog/index.html", "apps/docs/pages/get-started/structure.html"];

  it.each(PAGES)("%s", (file) => {
    const text = read(file).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).not.toMatch(/\bSix (?:components|pieces)\b/);
    expect(text).not.toMatch(/\bSeis (?:componentes|piezas)\b/);
    expect(text).not.toMatch(/need(?:s)? data of the site|necesitan datos del sitio/i);
  });
});
