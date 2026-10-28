/**
 * What the CSS of the 20 patterns of the kinds of site says (F5b and F8 of .claude/plans/ai-and-catalog-only.md):
 * the checks the four packages had (tests/landing-package.test.js, landing-f4.test.js, app-package.test.js and
 * docs-package.test.js), now on `packages/catalog/src/components/<block>.css`, with their reasons. F8 named each
 * file and class for its block, with no kind of site (`landing-hero.css` is `hero.css`, `.luz-cms-toc` is `.luz-toc`),
 * and made the two headers one (`.luz-site-header`, `--publication` for a blog) and the two footers one
 * (`.luz-site-footer`); the masthead is a block of its own.
 * The sources are read as text; no browser, no build. The browser half is the specs of each pattern.
 *
 *   - landing: seven files; core keeps stickiness, the split grid and the row; the head of a section is shared
 *     with the hero; the stat and the section title share their sizes; the glow has one gradient
 *   - blog (cms): the header and the footer of landing, `--publication`, the masthead, four files of its own;
 *     the table of contents is in article.css
 *   - app: two files; the dashboard never reorders its panels (accessibility requirement O6)
 *   - docs: seven files, only the classes of the docs layout and its parts, nothing of the docs app
 *   - every file: tokens only (no hex, no named colour), no class of the old names, a header that names its block
 *   - the docs app uses them (the move out of apps/docs/reference.css), and the home is built on them
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { knownTokens } from "./helpers/known-tokens.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const exists = (path) => existsSync(`${root}${path}`);
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
/** The CSS of a pattern without its comments, so a sentence that names a class is not a rule. */
const src = (name) => (exists(`packages/catalog/src/components/${name}.css`) ? stripComments(read(`packages/catalog/src/components/${name}.css`)) : "");
const has = (text, needle) => (typeof needle === "string" ? text.includes(needle) : needle.test(text));
const defines = (css, selector) => new RegExp(`${selector.replace(/[.]/g, "\\.")}(?![\\w-])`).test(css);

/** The files of each kind of site, by block (F8): the header and the footer are the landing page's and the blog's. */
const KINDS = {
  landing: ["site-header", "hero", "main", "section", "stat", "site-footer", "glow"],
  blog: ["site-header", "masthead", "page-header", "article-header", "article", "site-footer"],
  app: ["app-bar", "dashboard"],
  docs: ["docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"],
};
const ALL = [...new Set(Object.values(KINDS).flat())];
const filesOf = (kind) => KINDS[kind];
const cssOf = (kind) => filesOf(kind).map(src).join("\n");
/** A class of the names before F8, `.luz-landing-hero`, `.luz-cms-toc`, `.luz-docs-shell`, `.luz-consent`, `<luz-mode>`: none is in a pattern's CSS. */
const OLD_NAME = /luz-(?:landing|cms)-|luz-app-(?:header|dashboard)(?![\w-])|luz-docs-(?:shell|page-|rail|pager|example|dodont)|luz-(?:consent|banner|mode)(?![\w-])/;

/** Every file under `dir` (relative to the repo) whose name ends in one of `extensions`. */
function walk(dir, extensions, out = []) {
  if (!exists(dir)) return out;
  for (const entry of readdirSync(`${root}${dir}`)) {
    if (["node_modules", "dist", ".git", "test-results"].includes(entry)) continue;
    const path = `${dir}/${entry}`;
    if (statSync(`${root}${path}`).isDirectory()) walk(path, extensions, out);
    else if (extensions.some((e) => entry.endsWith(e))) out.push(path);
  }
  return out;
}

/* ---- Every file ------------------------------------------------------------------------------ */

describe("the 20 patterns: tokens only, and nothing of the old names", () => {
  it.each(ALL)("%s uses no hex colour, named colour or literal space (RL-10 reads it too)", (name) => {
    const css = src(name);
    expect(css.length, `${name}.css`).toBeGreaterThan(0);
    expect(has(css, /#[0-9a-fA-F]{3,8}\b(?![\w-])/), "a hex colour").toBe(false);
    expect(has(css, /(?<![\w-])(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/), "a colour function").toBe(false);
  });

  it.each(ALL)("%s names no class of the old names, no `luz-catalog-*`, and no `luz-site-*` but the header and the footer", (name) => {
    const css = src(name);
    expect(has(css, OLD_NAME), "an old name").toBe(false);
    expect(has(css, /luz-catalog-/), "catalog").toBe(false);
    expect(has(css, /luz-site-(?!header|footer)/), "an old block of @luz-ds/site").toBe(false);
  });

  it.each(ALL)("%s declares no token, only the properties of its own block or a knob (a token is read, never declared)", (name) => {
    const tokens = new Set(knownTokens());
    const declared = [...src(name).matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(declared.filter((d) => tokens.has(d))).toEqual([]);
    // A pattern may set a property of core's grid (--luz-grid-min) or of an element it refines (--luz-lang-switch-top);
    // its own are named for its block (--luz-glow-x, --luz-toc-top, --luz-page-rail-w), and none for a kind of site
    expect(declared.filter((d) => /^--luz-(?:landing|cms|app)-/.test(d))).toEqual([]);
  });

  it.each(ALL)("%s starts with the standard header of a catalog component: LUZ Catalog, the layer, and a prefix that is a class it defines", (name) => {
    const text = read(`packages/catalog/src/components/${name}.css`);
    const head = text.split("*/")[0];
    expect(head, `${name}.css`).toMatch(/LUZ Catalog/);
    expect(head, `${name}.css`).toMatch(/Layer: catalog/);
    const prefix = /Prefix: (\.luz-[\w-]*)/.exec(head)?.[1];
    // `.luz-landing-` was the prefix of the kind: F8's prefix, when the header says one, is the block, a class the file defines
    if (prefix !== undefined && prefix !== ".luz-") expect(defines(stripComments(text), prefix), `${name}.css says "Prefix: ${prefix}", which it does not define (the header of F5b kept the kind)`).toBe(true);
    expect(head, `${name}.css`).not.toMatch(/Prefix: \.luz-(?:landing|cms|app|docs)-(?![a-z0-9])/);
  });
});

/* ---- landing ------------------------------------------------------------------------------------ */

describe("landing: the page structure of a landing page", () => {
  it("defines the classes of the spec: header, hero and footer with their parts, the main, the section, the glow and the stat", () => {
    const css = cssOf("landing");
    for (const name of [
      ".luz-site-header",
      ".luz-site-header__brand",
      ".luz-site-header__actions",
      ".luz-hero",
      ".luz-hero__copy",
      ".luz-hero__eyebrow",
      ".luz-hero__title",
      ".luz-hero__lead",
      ".luz-hero__media",
      ".luz-site-footer",
      ".luz-main",
      ".luz-section",
      ".luz-glow",
      ".luz-stat",
    ]) {
      expect(defines(css, name), name).toBe(true);
    }
  });

  it("leaves to core what core owns: no sticky, no grid columns, no row in landing's CSS", () => {
    const header = src("site-header");
    expect(header, "stickiness is core's .o-sticky").not.toMatch(/position\s*:\s*sticky/);
    const hero = src("hero");
    expect(hero, "the columns are core's .o-grid--split").not.toMatch(/grid-template-columns/);
    expect(hero, "the grid is core's .o-grid").not.toMatch(/display\s*:\s*grid/);
    expect(hero, "the measure of the columns is a property of core's grid").toMatch(/--luz-grid-min\s*:\s*24rem/);
  });

  it("names the bar for its panels: anchor-name and anchor-scope --luz-bar, and the language list opens at the bar", () => {
    const header = src("site-header");
    expect(header).toMatch(/anchor-name\s*:\s*--luz-bar/);
    expect(header).toMatch(/anchor-scope\s*:\s*--luz-bar/);
    expect(header).toMatch(/--luz-lang-switch-top\s*:\s*var\(--luz-bar-h\)/);
  });

  it("hero.css has the centred hero and the bleeding picture, and the bleed never sizes itself in vw", () => {
    const hero = src("hero");
    expect(defines(hero, ".luz-hero--centered")).toBe(true);
    expect(defines(hero, ".luz-hero__media--bleed")).toBe(true);
    // A visible scrollbar makes vw wider than the page (Playwright hides scrollbars, so the browser test cannot see it)
    const block = hero.slice(hero.indexOf(".luz-hero__media--bleed"));
    expect(block.length, "the bleed rule exists").toBeGreaterThan(0);
    expect(block).not.toMatch(/\b\d+(?:\.\d+)?[sld]?vw\b/);
  });

  it("section.css has the head: eyebrow, title and lead, and the accent knob for the em of a title", () => {
    const section = src("section");
    for (const part of ["eyebrow", "title", "lead"]) expect(defines(section, `.luz-section__${part}`), part).toBe(true);
    expect(section).toMatch(/var\(\s*--luz-title-accent\s*,\s*inherit\s*\)/);
    // The knob is read on the em of both kinds of title
    expect(section + src("hero")).toMatch(/\.luz-hero__title\s+em/);
    expect(section).toMatch(/\.luz-section__title\s+em/);
  });

  it("the head shares its declarations with the hero's (selector lists in hero.css), it does not copy them", () => {
    const all = src("section") + src("hero");
    expect(all).toMatch(/\.luz-hero__eyebrow\s*,\s*\.luz-section__eyebrow|\.luz-section__eyebrow\s*,\s*\.luz-hero__eyebrow/);
  });

  it("the head's Arabic rules: the eyebrow and the title have their :lang(ar) rules", () => {
    const all = src("section") + src("hero");
    expect(all).toMatch(/\.luz-section__eyebrow:lang\(ar\)/);
    expect(all).toMatch(/\.luz-section__title:lang\(ar\)/);
  });

  it("site-footer.css has the brand, the columns and their heading; the old row stays", () => {
    const footer = src("site-footer");
    for (const part of ["brand", "col", "col-title"]) expect(defines(footer, `.luz-site-footer__${part}`), part).toBe(true);
    expect(footer, "the old row footer").toMatch(/\.luz-site-footer\s*>\s*\.o-row/);
  });

  it("stat.css has the value (tabular figures, the heading font) and the label", () => {
    const stat = src("stat");
    expect(defines(stat, ".luz-stat")).toBe(true);
    expect(defines(stat, ".luz-stat__value")).toBe(true);
    expect(defines(stat, ".luz-stat__label")).toBe(true);
    expect(stat).toMatch(/tabular-nums/);
    expect(stat).toMatch(/var\(--luz-font-heading\)/);
  });

  it("the stat value shares the section title's size rules (selector lists in section.css), it does not copy them", () => {
    const section = src("section");
    const rules = [...section.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(([, selector, body]) => ({ selectors: selector.split(",").map((s) => s.trim()), body }))
      .filter((r) => r.selectors.includes(".luz-section__title") && /font-size\s*:\s*var\(--luz-text-(3xl|2xl|xl)\)/.test(r.body));
    const steps = rules.map((r) => r.body.match(/--luz-text-(3xl|2xl|xl)/)[1]).sort();
    expect(steps, "one size rule per step of the title: 3xl, 2xl, xl").toEqual(["2xl", "3xl", "xl"]);
    for (const r of rules) expect(r.selectors, r.body.trim()).toContain(".luz-stat__value");
    const own = src("stat").match(/\.luz-stat__value\s*\{[^}]*\}/)?.[0] ?? "";
    expect(own, "stat.css keeps no font-size of its own on the value").not.toMatch(/font-size/);
  });

  it("glow.css reads --luz-glow-x and does not repeat its gradient for right-to-left", () => {
    const glow = src("glow");
    expect(glow).toMatch(/--luz-glow-x/);
    expect(glow.match(/radial-gradient\(/g)?.length, "one radial gradient").toBe(1);
    expect(glow).not.toMatch(/:dir\(rtl\)/);
  });

  it("the patterns know no LUZ data: no phrase, no number, no palette", () => {
    const css = cssOf("landing");
    expect(css, "no colour typed in the pattern: only tokens").not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/);
  });

  it("the feature grid is a template, not a pattern: no file, no class, no page, named nowhere in what the repository ships", () => {
    expect(exists("packages/catalog/src/components/landing-feature-grid.css")).toBe(false);
    const files = ["packages/catalog/src", "packages/catalog/README.md", "apps", "scripts", "dev"].flatMap((p) => (p.endsWith(".md") ? [p] : walk(p, [".css", ".html", ".js", ".json", ".md"])));
    const offenders = files.flatMap((f) => read(f).split("\n").flatMap((line, i) => (/luz-landing-feature-grid|landing\/feature-grid|landing-feature-grid/.test(line) ? [`${f}:${i + 1}`] : [])));
    expect(offenders).toEqual([]);
    expect(exists("apps/docs/pages/catalog/landing-feature-grid.html")).toBe(false);
  });
});

describe("landing: the docs of the patterns document what their CSS adds", () => {
  const MENTIONS = [
    ["hero", ["luz-hero--centered", "luz-hero__media--bleed"]],
    ["section", ["luz-section__eyebrow", "luz-section__title", "luz-section__lead", "--luz-title-accent", "--luz-glow-x"]],
    ["site-footer", ["luz-site-footer__brand", "luz-site-footer__col"]],
    ["stat", ["luz-stat__value", "luz-stat__label"]],
  ];
  for (const [page, names] of MENTIONS) {
    it(`/docs/catalog/${page}/ documents ${names.join(", ")}`, () => {
      const html = read(`apps/docs/pages/catalog/${page}.html`);
      for (const name of names) expect(html, name).toContain(name);
    });
  }

  it("the page of the stat shows the stat in its example", () => {
    const html = read("apps/docs/pages/catalog/stat.html");
    for (const name of ['class="luz-stat"', "luz-stat__value", "luz-stat__label"]) expect(html, name).toContain(name);
  });
});

/* ---- cms ------------------------------------------------------------------------------------------ */

describe("blog (cms): the page structure of a blog or a newspaper, with any CMS", () => {
  it("defines the header (with --publication), the masthead and its five parts, the page header, the article header, the article layout, the contents and the footer", () => {
    const css = cssOf("blog");
    for (const name of [
      ".luz-site-header",
      ".luz-site-header--publication",
      ".luz-site-header__brand",
      ".luz-site-header__actions",
      ".luz-masthead",
      ".luz-masthead__top",
      ".luz-masthead__date",
      ".luz-masthead__brand",
      ".luz-masthead__actions",
      ".luz-masthead__sections",
      ".luz-page-header",
      ".luz-page-header__title",
      ".luz-article-header",
      ".luz-article-header__title",
      ".luz-article",
      ".luz-article__layout",
      ".luz-toc",
      ".luz-toc__list",
      ".luz-site-footer",
    ]) {
      expect(defines(css, name), name).toBe(true);
    }
  });

  it("puts the table of contents in article.css: it is the article's, and it has no file of its own", () => {
    expect(defines(src("article"), ".luz-toc")).toBe(true);
    expect(exists("packages/catalog/src/components/toc.css")).toBe(false);
    for (const name of ["site-header", "page-header", "article-header", "site-footer"]) expect(defines(src(name), ".luz-toc"), name).toBe(false);
  });

  it("leaves stickiness to core's .o-sticky: only the table of contents is sticky, and only from where it is beside the text", () => {
    expect(src("site-header")).not.toMatch(/position\s*:\s*sticky/);
    expect(src("page-header")).not.toMatch(/position\s*:\s*sticky/);
  });
});

/* ---- app ------------------------------------------------------------------------------------------ */

describe("app: the header and the dashboard of a web application", () => {
  const header = src("app-bar");
  const dashboard = src("dashboard");

  it("app-bar.css defines the header and its parts: product, actions, account and its name", () => {
    for (const name of [".luz-app-bar", ".luz-app-bar__product", ".luz-app-bar__actions", ".luz-app-bar__account-name"]) expect(defines(header, name), name).toBe(true);
  });

  it("leaves stickiness to core's .o-sticky: no position: sticky in the app header", () => {
    expect(header).not.toMatch(/position\s*:\s*sticky/);
  });

  it("gives .o-main the scroll padding of the bar (O5): scroll-padding-block-start: var(--luz-bar-h)", () => {
    expect(header).toMatch(/\.o-main[^{}]*\{[^}]*scroll-padding-block-start\s*:\s*var\(--luz-bar-h\)/);
  });

  it("clips the account name with the visually-hidden technique, never display: none, so it stays in the name", () => {
    const rule = header.match(/\.luz-app-bar__account-name[^{}]*\{([^}]*)\}/g)?.join("\n") ?? "";
    expect(rule, "a rule for the name").not.toBe("");
    expect(rule).not.toMatch(/display\s*:\s*none/);
    expect(rule).not.toMatch(/visibility\s*:\s*hidden/);
    expect(rule).not.toMatch(/font-size\s*:\s*0\b/);
  });

  it("dashboard.css defines the dashboard, its title row, its panel and the wide panel", () => {
    for (const name of [".luz-dashboard", ".luz-dashboard__head", ".luz-dashboard__title", ".luz-dashboard__panel", ".luz-dashboard__panel--wide"]) expect(defines(dashboard, name), name).toBe(true);
  });

  it("is the container of its own size query: inline-size, and the wide panel spans two columns from a 40rem container", () => {
    expect(dashboard).toMatch(/container-type\s*:\s*inline-size/);
    expect(dashboard).toMatch(/@container\s*\(\s*min-width\s*:\s*40rem\s*\)[^{]*\{[^}]*\.luz-dashboard__panel--wide[^{}]*\{[^}]*grid-column\s*:\s*span\s+2/);
  });

  it("lets a panel shrink (min-inline-size: 0), so a wide child never widens its column", () => {
    expect(dashboard).toMatch(/\.luz-dashboard__panel[^{}]*\{[^}]*min-(inline-size|width)\s*:\s*0/);
  });

  it("never reorders the panels: no dense packing, no order (accessibility requirement O6)", () => {
    expect(dashboard).not.toMatch(/grid-auto-flow\s*:[^;]*dense/);
    expect(dashboard).not.toMatch(/(^|[;{\s])order\s*:/);
    expect(dashboard).not.toMatch(/row-reverse|column-reverse/);
  });

  it("leaves the grid to core's .o-grid: no second sticky bar, no sidebar", () => {
    expect(dashboard).not.toMatch(/position\s*:\s*sticky/);
    expect(dashboard).not.toMatch(/luz-sidebar/);
  });

  it("writes the account's initials as text in the name, never aria-hidden, in the pages that show the button", () => {
    const offenders = [];
    for (const file of ["apps/docs/pages/catalog/app-bar.html", "apps/docs/pages/catalog/dashboard.html"]) {
      for (const match of read(file).matchAll(/luz-app-bar__account(?!-name)[\s\S]*?(?:<\/button>|&lt;\/button&gt;)/g)) {
        if (/luz-avatar[^>]*aria-hidden|luz-avatar[^&]*aria-hidden/.test(match[0])) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ---- docs ----------------------------------------------------------------------------------------- */

describe("docs: the pieces of a documentation page", () => {
  const css = cssOf("docs");

  it("has no `mark` selector: the example's code is not highlighted with <mark> (core's highlight.js rewrites it from textContent)", () => {
    expect(has(css, /(?<![\w-])mark(?![\w-])/), "a `mark` type selector or element name").toBe(false);
  });

  it("the page of the example has no <mark> element inside a pre.luz-code-block", () => {
    const html = read("apps/docs/pages/catalog/example.html");
    const blocks = [...html.matchAll(/<pre\b[^>]*\bluz-code-block\b[^>]*>[\s\S]*?<\/pre>/g)].map((m) => m[0]);
    expect(blocks.length, "pre.luz-code-block blocks").toBeGreaterThan(0);
    expect(blocks.filter((block) => /<mark\b/i.test(block))).toEqual([]);
  });

  it("defines the seven patterns and their parts", () => {
    for (const name of [
      ".luz-docs-layout",
      ".luz-docs-nav",
      ".luz-docs-main",
      ".luz-page-rail",
      ".luz-page-rail__onpage",
      ".luz-page-rail__actions",
      ".luz-doc-header",
      ".luz-doc-header__eyebrow",
      ".luz-doc-header__lead",
      ".luz-doc-header__meta",
      ".luz-example",
      ".luz-example__preview",
      ".luz-example__code",
      ".luz-example__frame",
      ".luz-do-dont",
      ".luz-do-dont__item",
      ".luz-do-dont__item--do",
      ".luz-do-dont__item--dont",
      ".luz-do-dont__verdict",
      ".luz-do-dont__stage",
      ".luz-pager",
      ".luz-pager__prev",
      ".luz-pager__next",
      ".luz-pager__link",
      ".luz-page-footer",
    ]) {
      expect(defines(css, name), name).toBe(true);
    }
  });

  it("every class in a selector is one of the seven blocks (the layout with its nav and main, the page head, the rail, the example, do and don't, the pager, the page foot): no core class, no `.docs-*` of the docs app", () => {
    const own = /^luz-(?:docs-layout|docs-nav|docs-main|doc-header|page-rail|example|do-dont|pager|page-footer)(?![a-z0-9-])/;
    const offenders = [];
    for (const name of filesOf("docs")) {
      for (const [, prelude] of src(name).matchAll(/([^{};]+)\{/g)) {
        if (prelude.trim().startsWith("@")) continue;
        for (const [, cls] of prelude.matchAll(/\.([a-zA-Z_-][\w-]*)/g)) if (!own.test(cls)) offenders.push(`${name}: .${cls}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it("every custom property it declares is `--luz-docs-*` (the layout's own) or `--luz-page-rail-*` (the rail's top and width, set by the layout), and the layout sets the measure to 46rem", () => {
    const declared = [...css.matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(declared.filter((name) => !/^--luz-(?:docs|page-rail)-/.test(name))).toEqual([]);
    expect(has(css, /--luz-docs-measure\s*:\s*46rem/), "--luz-docs-measure: 46rem").toBe(true);
    expect(has(css, /--luz-example-w/), "--luz-example-w").toBe(true);
  });

  it("knows nothing of the docs app or of what the docs teach: no `docs-*` class or hook, no demo or page id", () => {
    const offenders = [];
    for (const name of filesOf("docs")) {
      src(name)
        .split("\n")
        .forEach((line, i) => {
          if (/(?<![\w-])\.?docs-[a-z]|data-docs|#demo-|#c-[a-z]|#p-[a-z]|\.luz-(?:btn|card|search|table|alert|badge)\b/.test(line)) offenders.push(`${name}.css:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it("places the layout by columns, not by position: three tracks from 80rem, a sidebar of 16.5rem and a rail of 14rem", () => {
    const shell = src("docs-layout");
    for (const value of ["16.5rem", "14rem", "80rem", "60rem"]) expect(has(shell, value), value).toBe(true);
  });
});

describe("docs: the patterns left apps/docs/reference.css and the docs app uses the new names", () => {
  // The old classes of the app (`.pager`, class="pager"…), not the new names of the files and the pages (`pager.css`, /docs/catalog/docs-pager/)
  const OLD = /(?:\.|\bclass="(?:[^"]*\s)?|\bclass=&quot;(?:[^&]*\s)?|["'`])docs-(?:dodont|pager|page-head|onpage)(?![\w-])/;

  it("apps/docs/reference.css no longer defines .do-dont*, .pager*, .doc-header* or .docs-onpage*", () => {
    const offenders = stripComments(read("apps/docs/reference.css")).split("\n").flatMap((line, i) => (OLD.test(line) ? [`reference.css:${i + 1}: ${line.trim()}`] : []));
    expect(offenders.slice(0, 12), `${offenders.length} lines`).toEqual([]);
  });

  it("nothing else of the docs app, the generator or the guides names the old classes", () => {
    const files = [...walk("apps/docs", [".html", ".js", ".css", ".json"]), ...walk("scripts/docs-site", [".js"])].filter((f) => f !== "apps/docs/reference.css");
    const offenders = files.flatMap((f) => read(f).split("\n").flatMap((line, i) => (OLD.test(line) ? [`${f}:${i + 1}: ${line.trim().slice(0, 90)}`] : [])));
    expect(offenders.slice(0, 12), `${offenders.length} places`).toEqual([]);
  });

  it("the docs layout links the patterns (apps/docs/catalog-patterns.css) before the app's own stylesheet, and the generator writes the new names", () => {
    const layout = read("apps/docs/_layouts/page.html");
    expect(layout.indexOf("/apps/docs/catalog-patterns.css")).toBeGreaterThan(-1);
    expect(layout.indexOf("/apps/docs/catalog-patterns.css")).toBeLessThan(layout.indexOf("/apps/docs/reference.css"));
    expect(layout).not.toMatch(/\/packages\/docs\//);
    const generator = read("scripts/docs-site/site.js");
    for (const name of ["luz-doc-header", "luz-pager", "luz-page-rail__onpage"]) expect(has(generator, name), name).toBe(true);
  });

  it("apps/docs/catalog-patterns.css imports the 20 files, kind by kind (landing, blog, app, docs), each file once, and holds no rule", () => {
    const css = read("apps/docs/catalog-patterns.css");
    const imports = [...css.matchAll(/@import url\("\/packages\/catalog\/dist\/components\/([a-z-]+)\.css"\)/g)].map((m) => m[1]);
    expect(imports).toEqual(ALL);
    expect(stripComments(css).replace(/@import url\("[^"]+"\);/g, "").trim(), "no rule of its own").toBe("");
  });

  it("every page the generator writes uses them: the page head, the pager and the on-this-page rail", () => {
    const site = scanSite(join(root, "apps/docs"), root);
    const { rendered } = buildSite(site, { unchecked: ["/"] });
    const page = rendered.get("/docs/components/button/");
    expect(page, "the button page is rendered").toBeTruthy();
    expect(has(page, '<header class="luz-doc-header">'), "page head").toBe(true);
    expect(has(page, /<ul class="luz-pager">/), "pager").toBe(true);
    expect(has(page, '<nav class="luz-page-rail__onpage"'), "on this page").toBe(true);
    expect(has(page, 'class="luz-pager__prev"'), "pager prev").toBe(true);
    expect(has(page, 'class="luz-pager__link"'), "pager link").toBe(true);
    expect(has(page, OLD), "an old class in the rendered page").toBe(false);
  });

  it("a component page's Do and don't uses the pattern's classes", () => {
    const body = read("apps/docs/pages/components/button.html");
    for (const name of ['class="luz-do-dont"', "luz-do-dont__item--do", "luz-do-dont__stage"]) expect(has(body, name), name).toBe(true);
    expect(has(body, OLD), "an old class in button.html").toBe(false);
  });

  it("the docs script finds the specimens and the rail by the new names", () => {
    const script = read("apps/docs/reference.js");
    expect(has(script, ".luz-do-dont__stage"), "specimen selector").toBe(true);
    expect(has(script, "luz-page-rail"), "rail selector").toBe(true);
    expect(has(script, OLD), "an old class in reference.js").toBe(false);
  });

  it("the pager's page and the docs patterns' pages name each pager link by its visible text (WCAG 2.5.3): no aria-label on it", () => {
    /** The start tags of a.luz-pager__link, live (`<a …>`) and written out in a code block (`&lt;a …&gt;`). */
    const pagerLinks = (text) => [
      ...[...text.matchAll(/<a\b[^>]*\bluz-pager__link\b[^>]*>/g)].map((m) => m[0]),
      ...[...text.matchAll(/&lt;a\b(?:(?!&gt;)[\s\S])*?\bluz-pager__link\b(?:(?!&gt;)[\s\S])*?&gt;/g)].map((m) => m[0]),
    ];
    const links = pagerLinks(read("apps/docs/pages/catalog/pager.html"));
    expect(links.length, "pager links in pager.html").toBeGreaterThan(0);
    expect(links.filter((tag) => /\baria-label(?:ledby)?\b/.test(tag)).map((tag) => tag.slice(0, 120))).toEqual([]);
  });
});

describe("the accessibility statement says what is known about the documentation patterns (no JavaScript, the sticky rail), as catalog's", () => {
  it.each([
    ["apps/docs/pages/accessibility.html", /Documentation patterns/, /catalog/i, /no script/i],
    ["apps/docs/i18n/es/pages/accessibility.html", /Patrones de documentación/, /cat[aá]logo|catalog/i, /sin script/i],
  ])("%s: the entry of the documentation patterns says they are catalog's, CSS with no script, and the rail", (file, title, owner, noScript) => {
    const item = read(file).split("<li>").find((li) => title.test(li));
    expect(item, `the entry "${title}"`).toBeTruthy();
    expect(item).toMatch(owner);
    expect(item).toMatch(noScript);
    expect(item).toMatch(/rail|barra/i);
  });
});

/* ---- the home and the docs footer ------------------------------------------------------------------ */

describe("the home page and the docs footer are built on the landing patterns and core's classes", () => {
  const home = read("apps/landing/index.html");

  it("the home page is an .o-page with a landing main, hero, sections and footer", () => {
    expect(home).toMatch(/<body class="[^"]*\bo-page\b/);
    expect(home).toMatch(/<main[^>]*class="[^"]*\bluz-main\b/);
    expect(home).toMatch(/<section class="[^"]*\bluz-hero\b[^"]*\bo-grid\b[^"]*\bo-grid--split\b|<section class="[^"]*\bo-grid\b[^"]*\bo-grid--split\b[^"]*\bluz-hero\b/);
    expect(home).toMatch(/\bluz-section\b/);
    expect(home).toMatch(/<footer[^>]*class="[^"]*\bluz-site-footer\b|<footer[^>]*>\s*<div class="[^"]*\bluz-site-footer\b/);
    expect(home).toMatch(/\bo-actions\b/);
  });

  it("no file of the home page or of the docs footer names a class of site's old blocks", () => {
    // `luz-site-` names the old blocks of site (`luz-site-mode` was the key of the stored colour mode, gone in F2).
    // `luz-site-header` and `luz-site-footer` are the names of the two unions of F8 (the header of a landing page, the footer
    // of the landing page and the blog): current names now, not the old blocks of @luz-ds/site
    const old = /luz-site-(?!mode|header|footer)/;
    const files = ["apps/landing/index.html", "apps/landing/landing.css", "apps/site/header.css", "apps/site/_partials/footer.html", "apps/docs/_partials/footer-links.html", "apps/docs/_layouts/not-found.html"];
    const offenders = files.flatMap((f) => read(f).split("\n").flatMap((line, i) => (old.test(line) ? [`${f}:${i + 1}: ${line.trim().slice(0, 80)}`] : [])));
    expect(offenders).toEqual([]);
  });

  it("the docs footer partial is the landing footer", () => {
    const partial = read("apps/site/_partials/footer.html");
    expect(partial).toMatch(/\bluz-site-footer\b/);
    expect(partial).toMatch(/\bo-container--inline\b/);
  });
});
