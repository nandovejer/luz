/**
 * F3, the package model (.claude/plans/specs/f3-package-model.md, §3.1, §5, §9 step 1).
 * The sources are read as text; no browser, no build.
 *
 *   (a) layering: a lower package never names a higher one
 *   (b) names: no block is shipped by two packages
 *   (c) peers: catalog takes tokens and core, and nothing else; the packages for one kind of site are gone
 *   (d) catalog after F3, F1, F5b and F7: seven elements, the 21 patterns of the four kinds of site and the four
 *       layout components that came from core (navbar, sidebar, terminal, timeline), the exports of spec §1.3, no placeholders
 *
 * F5b (.claude/plans/ai-and-catalog-only.md, decisions 1, 2, 51 to 58): landing, cms, app and docs are not
 * packages any more, their patterns are files of catalog. F8 (decisions 65 to 69) named each file for its block
 * (`hero.css`, `site-header.css`), with no kind of site in the name, so a file of the patterns is known by the
 * list in tests/helpers/catalog-names.js, no longer by a prefix; the rule of names of catalog admits no
 * `luz-<kind>-*` (decision 57).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { JPEG_LONG_SIDES, LONG_SIDES, RATIOS, VARIANTS, sizeOf } from "../scripts/build-placeholders.js";
import { LAYER_ORDER } from "../scripts/luz-layers.js";
import { blocksOfCss } from "./helpers/css-blocks.js";
import { LAYOUT, PATTERNS } from "./helpers/catalog-names.js";
import { isNpmOrReleased } from "./helpers/versions.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const KINDS = ["landing", "cms", "app", "docs"];
/** The tags catalog defines or styles for any site (the four components of F7 are in tests/helpers/catalog-names.js). */
const SITE_TAGS = ["search", "cookie-consent", "lang-switch", "submenu", "announcement", "faq", "theme-time"];
// <luz-theme-time> replaced <luz-color-mode> (2026-10-29): core's <luz-theme-mode> is its twin in name only, and core names
// the catalog's element in no code (its page and its comments may say that the catalog extends it)
const SITE_COMPONENTS = [...SITE_TAGS];

/** Source files (.css and .js) of packages/<name>/src, with their text. */
function sources(name, extensions = [".css", ".js"]) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "placeholders") walk(path);
      } else if (extensions.some((e) => entry.endsWith(e))) out.push({ path: path.slice(root.length), text: readFileSync(path, "utf-8") });
    }
  };
  walk(`${root}packages/${name}/src`);
  return out;
}

/** "path:line: text" for each line of the package's sources that matches (`keep`: which files of the package to read). */
function offenders(names, pattern, keep = () => true) {
  return names.flatMap((name) =>
    sources(name).filter(({ path }) => keep(path)).flatMap(({ path, text }) =>
      text.split("\n").flatMap((line, i) => (pattern.test(line) ? [`${path}:${i + 1}: ${line.trim()}`] : [])),
    ),
  );
}

/* ---- (a) A lower package never names a higher one ------------------------ */

/** A source file of catalog that is a pattern of a kind of site (`components/<block>.css`, one of the 20). */
const isPatternFile = (path) => new RegExp(`/components/(?:${PATTERNS.join("|")})\\.css$`).test(path);
/** A class of the names before F8, or the tag of an element before it. */
const OLD_NAME = /luz-(?:landing|cms)-|luz-app-(?:header|dashboard)(?![\w-])|luz-docs-(?:shell|page-|rail|pager|example|dodont)|luz-(?:consent|banner)(?![\w:-])/;

describe("layering: tokens < core < catalog", () => {
  it("tokens and core name no catalog block (the 20 patterns, the four layout components) and none of catalog's seven tags", () => {
    const tags = new RegExp(`(?<![\\w-])luz-(?:${SITE_COMPONENTS.join("|")})(?:__|--|(?![\\w-]))`);
    const blocks = new RegExp(`(?<![\\w-])luz-(?:${[...PATTERNS, ...LAYOUT].join("|")})(?:__|--|(?![\\w-]))`);
    expect(offenders(["tokens", "core"], /luz-(?:site|catalog|landing|cms)-/)).toEqual([]);
    expect(offenders(["tokens", "core"], blocks)).toEqual([]);
    expect(offenders(["tokens", "core"], tags)).toEqual([]);
  });

  it("the elements of catalog (search, cookie-consent, theme-time, lang-switch, submenu, announcement, faq) name no pattern of a kind of site, nor a name of before F8", () => {
    expect(offenders(["catalog"], OLD_NAME, (path) => !isPatternFile(path) && /\/components\//.test(path))).toEqual([]);
  });

  // A pattern may refine catalog's tags (`.luz-site-header luz-lang-switch`), but catalog's old `luz-catalog-*` classes went
  // away in F3, `luz-site-*` is only the header and the footer (the unions of F8), and no pattern names a class of before F8
  it.each(PATTERNS)("the pattern %s names no `luz-catalog-*` class or property, no `luz-site-*` but the header and the footer, and no name of before F8", (name) => {
    const own = new RegExp(`/components/${name}\\.css$`);
    expect(sources("catalog").filter(({ path }) => own.test(path)).length, `packages/catalog/src/components/${name}.css`).toBe(1);
    expect(offenders(["catalog"], /luz-catalog-|luz-site-(?!header|footer)/, (path) => own.test(path))).toEqual([]);
    expect(offenders(["catalog"], OLD_NAME, (path) => own.test(path))).toEqual([]);
  });
});

/* ---- (b) No block is shipped by two packages ------------------------------ */

describe("names: one package per block", () => {
  const packages = ["core", "catalog"];
  const owners = new Map();
  for (const name of packages) {
    for (const { path, text } of sources(name, [".css"])) {
      for (const block of blocksOfCss(text)) {
        if (!owners.has(block)) owners.set(block, new Map());
        const files = owners.get(block);
        files.set(name, [...(files.get(name) ?? []), path]);
      }
    }
  }

  it("reads the blocks of every package", () => {
    for (const name of packages) {
      expect([...owners.values()].some((files) => files.has(name)), `${name} defines at least one block`).toBe(true);
    }
  });

  it("no tag, component or object name is defined by two packages", () => {
    // F7 (decision 31): `:where(.o-shell) > .luz-sidebar` in catalog's sidebar.css names core's object as the context of the
    // sidebar, which it styles; it does not define the object. That one file is the only exception, and `o-shell` the only block.
    const CONTEXT = new Map([["o-shell", ["packages/catalog/src/components/sidebar.css"]]]);
    const shared = [...owners]
      .filter(([, files]) => files.size > 1)
      .filter(([block, files]) => !(CONTEXT.has(block) && files.get("core").length > 0 && JSON.stringify(files.get("catalog")) === JSON.stringify(CONTEXT.get(block))))
      .map(([block, files]) => `${block}: ${[...files.keys()].join(" and ")}`);
    expect(shared).toEqual([]);
  });

  it("core defines no block that catalog defines, for the four components that moved (F7)", () => {
    for (const name of LAYOUT) {
      const classes = { navbar: "luz-navbar", sidebar: "luz-sidebar", terminal: "luz-terminal", timeline: "luz-timeline" };
      expect(owners.get(classes[name])?.has("core") ?? false, `${classes[name]} in core`).toBe(false);
      expect(owners.get(classes[name])?.has("catalog") ?? false, `${classes[name]} in catalog`).toBe(true);
    }
  });

  // The reader that (b) stands on: only the leftmost compound of a selector
  // defines a block, so a refinement of another package's tag is not a claim
  it("reads a block from the leftmost compound, through :where() and :is()", () => {
    const css = `
      :where(luz-submenu > details > summary) { color: red }
      :where(luz-announcement)[tone="warning"], .luz-card__title--x { color: red }
      .o-stack.o-stack--lg > * { color: red }
      .luz-site-header luz-lang-switch { color: red }
      :root:has(.o-sticky) .luz-toc { color: red }
      @media (min-height: 30rem) { :is(.o-sticky) { position: sticky } }
    `;
    expect([...blocksOfCss(css)].sort()).toEqual(["luz-announcement", "luz-card", "luz-site-header", "luz-submenu", "o-stack", "o-sticky"]);
  });
});

/* ---- (c) The packages for one kind of site are gone (F5b) ---------------- */

describe("peers: catalog needs tokens and core, and the four packages for one kind of site do not exist", () => {
  const manifest = JSON.parse(readFileSync(`${root}packages/catalog/package.json`, "utf-8"));

  it("catalog requires tokens and core with literal ranges, as its only peers", () => {
    expect(manifest.peerDependencies).toEqual({ "@luz-ds/core": "^0.1.0 || ^0.2.0", "@luz-ds/tokens": "^0.1.0 || ^0.2.0" });
    expect(manifest.peerDependenciesMeta).toBeUndefined();
  });

  for (const kind of KINDS) {
    it(`packages/${kind} is not there: no package.json, no source, no dist`, () => {
      expect(existsSync(`${root}packages/${kind}`), `packages/${kind}`).toBe(false);
    });
  }

  it("no package, app or script depends on the four old packages", () => {
    const manifests = ["package.json", "apps/docs/package.json", "apps/landing/package.json", ...readdirSync(`${root}packages`).map((n) => `packages/${n}/package.json`)];
    const offenders = manifests.flatMap((file) => {
      const json = JSON.parse(readFileSync(`${root}${file}`, "utf-8"));
      const deps = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies, ...json.optionalDependencies };
      return Object.keys(deps).filter((name) => KINDS.some((k) => name === `@luz-ds/${k}`)).map((name) => `${file}: ${name}`);
    });
    expect(offenders).toEqual([]);
  });
});

/* ---- (d) catalog after F3 and F1: seven components and nothing else (step 12) -------- */

describe("catalog after F8: seven `<luz-*>` elements, the 20 patterns of the four kinds of site and the four layout components of core", () => {
  const read = (path) => readFileSync(`${root}${path}`, "utf-8");
  const manifest = JSON.parse(read("packages/catalog/package.json"));
  const components = [...SITE_COMPONENTS, ...LAYOUT, ...PATTERNS].map((name) => `${name}.css`).sort();
  const minified = components.map((f) => f.replace(/\.css$/, ".min.css"));
  const list = (dir, keep) => (existsSync(`${root}${dir}`) ? readdirSync(`${root}${dir}`).filter(keep).sort() : []);
  const isCss = (f) => f.endsWith(".css") && !f.endsWith(".min.css");

  it("src/components holds the seven elements, the four layout components and the 20 patterns, nothing else: no `_print.css`, the print rules are in each component", () => {
    expect(list("packages/catalog/src/components", (f) => f.endsWith(".css"))).toEqual(components);
  });

  it("catalog has no bundle: no `src/index.css` to bundle the components", () => {
    expect(existsSync(`${root}packages/catalog/src/index.css`)).toBe(false);
  });

  const built = existsSync(`${root}packages/catalog/dist/components`);

  it.skipIf(!built)("dist has no `catalog.css`, `catalog.min.css` or `print.css`", () => {
    for (const f of ["catalog.css", "catalog.min.css", "print.css"]) expect(existsSync(`${root}packages/catalog/dist/${f}`), f).toBe(false);
  });

  it.skipIf(!built)("dist/components is exactly the seven elements, the four layout components and the 20 patterns, plain and minified", () => {
    expect(list("packages/catalog/dist/components", isCss)).toEqual(components);
    expect(list("packages/catalog/dist/components", (f) => f.endsWith(".min.css"))).toEqual(minified);
  });

  it.skipIf(!built)("each built component starts with the layer order and has one `luz.catalog` block", () => {
    for (const f of components) {
      const css = existsSync(`${root}packages/catalog/dist/components/${f}`) ? read(`packages/catalog/dist/components/${f}`) : "";
      expect(css.startsWith(LAYER_ORDER), f).toBe(true);
      expect(css.match(/^@layer luz\.catalog \{$/gm) ?? [], f).toHaveLength(1);
    }
  });

  it("`exports` is the scripts, the components and the manifests: no `./css`, `./css/min` or `./print.css`, no `./placeholders/*`", () => {
    expect(manifest.exports).toEqual({
      ".": "./dist/catalog.js",
      "./search": "./dist/search.js",
      "./cookie-consent": "./dist/cookie-consent.js",
      "./theme-time": "./dist/theme-time.js",
      "./theme-time-bar": "./dist/theme-time-bar.js",
      "./theme-time-boot": "./dist/theme-time-boot.js",
      "./sidebar": "./dist/sidebar.js",
      "./timeline": "./dist/timeline.js",
      "./classes.json": "./dist/classes.json",
      "./custom-elements.json": "./dist/custom-elements.json",
      "./components/*": "./dist/components/*",
      "./package.json": "./package.json",
    });
  });

  it("`sideEffects` is the component stylesheets and the files that define or load an element", () => {
    expect([...manifest.sideEffects].sort()).toEqual(
      ["./dist/components/*.css", "./dist/catalog.js", "./dist/catalog.min.js", "./dist/search.js", "./dist/search.min.js", "./dist/cookie-consent.js", "./dist/cookie-consent.min.js", "./dist/theme-time.js", "./dist/theme-time.min.js", "./dist/theme-time-bar.js", "./dist/theme-time-bar.min.js", "./dist/timeline.js", "./dist/timeline.min.js"].sort(),
    );
  });

  it("ships `dist` and the licence only, and describes its components", () => {
    expect(manifest.files).toEqual(["dist", "LICENSE"]);
    for (const word of ["search", "consent", "language", "submenu", "announcement", "faq"]) expect(manifest.description.toLowerCase(), word).toContain(word);
    expect(manifest.description.toLowerCase(), "no placeholder in the package").not.toContain("placeholder");
  });

  it("pack-files.txt lists the seven elements, the four layout components and the 20 patterns, plain and minified, and no placeholder", () => {
    const packed = read("packages/catalog/pack-files.txt").split("\n").filter(Boolean);
    expect(packed.filter((f) => f.startsWith("dist/components/")).sort()).toEqual([...components, ...minified].sort().map((f) => `dist/components/${f}`));
    expect(packed.filter((f) => /placeholder/.test(f))).toEqual([]);
  });

  it("no source of catalog names a `luz-catalog-*` class or property, and `luz-site-*` is only the header and the footer", () => {
    expect(offenders(["catalog"], /luz-catalog-|luz-site-(?!header|footer)/)).toEqual([]);
  });

  it("search and cookie consent hide on paper what only works on a screen, each in its own file, inside `@layer luz.print`", () => {
    for (const [name, hidden] of [["search", "luz-search"], ["cookie-consent", "luz-cookie-consent"]]) {
      const css = read(`packages/catalog/src/components/${name}.css`);
      expect(css, `${name}.css has a print block`).toMatch(/@media print/);
      expect(css.slice(css.indexOf("@media print")), `${name}.css hides ${hidden} on paper`).toContain(hidden);
    }
  });
});

/* ---- (d) The placeholders are docs-only (D2, security: placeholders) ------- */

describe("the image placeholders are docs-only", () => {
  const read = (path) => readFileSync(`${root}${path}`, "utf-8");
  const dir = "apps/docs/assets/placeholders";

  it("catalog ships none: no source folder, no export, no build step, no file in the tarball list", () => {
    expect(existsSync(`${root}packages/catalog/src/placeholders`), "packages/catalog/src/placeholders").toBe(false);
    expect(/placeholder/.test(read("packages/catalog/package.json")), "package.json").toBe(false);
    expect(/placeholders/.test(read("scripts/build-catalog.js")), "scripts/build-catalog.js").toBe(false);
    expect(/placeholder/.test(read("packages/catalog/pack-files.txt")), "pack-files.txt").toBe(false);
    expect(existsSync(`${root}packages/catalog/dist/placeholders`) && readdirSync(`${root}packages/catalog/dist/placeholders`).length, "built catalog").toBeFalsy();
  });

  it("every placeholder the build promises is under apps/docs/assets/placeholders/", () => {
    const files = [];
    for (const prefix of Object.values(VARIANTS)) {
      files.push(`${prefix}.svg`);
      for (const [name, ratio] of Object.entries(RATIOS)) {
        for (const long of LONG_SIDES) {
          const [width] = sizeOf(ratio, long);
          files.push(`${prefix}-${name}-${width}.avif`, `${prefix}-${name}-${width}.webp`);
          if (JPEG_LONG_SIDES.includes(long)) files.push(`${prefix}-${name}-${width}.jpg`);
        }
      }
    }
    expect(files.filter((f) => !existsSync(`${root}${dir}/${f}`))).toEqual([]);
  });

  it("their MIT notice stays next to them: a LICENSE file in the same folder", () => {
    expect(existsSync(`${root}${dir}/LICENSE`), `${dir}/LICENSE`).toBe(true);
    const licence = existsSync(`${root}${dir}/LICENSE`) ? read(`${dir}/LICENSE`) : "";
    expect(/MIT License/.test(licence), "says MIT License").toBe(true);
    expect(/Creative Commons|SIL Open Font|Apache License|GNU/i.test(licence), "only MIT").toBe(false);
  });

  it("the script that renders them writes there, not into a package", () => {
    const script = read("scripts/build-placeholders.js");
    expect(script.includes("apps/docs/assets/placeholders"), "writes to apps/docs/assets/placeholders").toBe(true);
    expect(script.includes("packages/catalog"), "names no package").toBe(false);
  });

  it("no published stylesheet or package list points at them: no `url()` to a placeholder, no export", () => {
    const bad = [];
    for (const name of ["tokens", "core", "catalog"]) {
      for (const { path, text } of sources(name, [".css"])) if (/url\([^)]*placeholder/.test(text)) bad.push(path);
      const manifest = JSON.parse(read(`packages/${name}/package.json`));
      if (JSON.stringify(manifest.exports ?? {}).includes("placeholder")) bad.push(`packages/${name}/package.json exports`);
    }
    expect(bad).toEqual([]);
  });
});

/* ---- (e) core after F6: a language is a lazy file, a pattern export --------- */

describe("core after F6: the languages are published as a pattern export and their files are packed", () => {
  const read = (path) => readFileSync(`${root}${path}`, "utf-8");
  const manifest = JSON.parse(read("packages/core/package.json"));
  const packed = read("packages/core/pack-files.txt").split("\n").map((l) => l.trim());

  it('exports "./i18n/*" as "./dist/i18n-*.js", and keeps "./i18n" for the module with loadLocales()', () => {
    expect(manifest.exports["./i18n/*"]).toBe("./dist/i18n-*.js");
    expect(manifest.exports["./i18n"]).toBe("./dist/i18n.js");
  });

  it("packs dist/i18n-es.js and dist/i18n-es.min.js, and not the JSON source", () => {
    expect(packed).toContain("dist/i18n-es.js");
    expect(packed).toContain("dist/i18n-es.min.js");
    expect(packed.filter((f) => f.endsWith(".json") && f.includes("i18n"))).toEqual([]);
    expect(packed.filter((f) => f.startsWith("src/"))).toEqual([]);
  });

  it("needs no sideEffects entry: a language file has none and is reached by import() only", () => {
    expect(manifest.sideEffects.filter((f) => /i18n/.test(f))).toEqual([]);
  });

  it("the JSON sources are not in the tarball: `files` is dist and LICENSE", () => {
    expect(manifest.files).toEqual(["dist", "LICENSE"]);
  });
});


describe("versions: the repository matches npm", () => {
  // On 2026-10-19 the owner published 0.1.0 of these (and of landing, cms, app and docs, which are not packages any more) by hand. The repo must say the same, or the
  // Version Packages PR of changesets proposes 0.1.0 again: a version npm already has, with other content.
  // `catalog` (formerly `site`) was never published: it stays at 0.0.0, and a minor changeset makes it 0.2.0
  // with tokens and core (the `fixed` group)
  const PUBLISHED_BY_HAND = ["tokens", "core", "check"];
  const version = (name) => JSON.parse(readFileSync(`${root}packages/${name}/package.json`, "utf-8")).version;

  // Until the Version Packages PR is merged. On it, and after it, a package is at the version its CHANGELOG lists
  for (const name of PUBLISHED_BY_HAND) {
    it(`@luz-ds/${name} is at 0.1.0, the version on npm, or at a version its CHANGELOG lists`, () => {
      expect(isNpmOrReleased(root, name, "0.1.0"), `${name} is at ${version(name)}`).toBe(true);
    });
  }

  it("@luz-ds/catalog stays at 0.0.0 until it is released, then at a version its CHANGELOG lists", () => {
    expect(isNpmOrReleased(root, "catalog", "0.0.0"), `catalog is at ${version("catalog")}`).toBe(true);
  });
});
