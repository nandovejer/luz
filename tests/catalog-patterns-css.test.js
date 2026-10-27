/**
 * What the CSS of the 21 patterns of the kinds of site says (F5b of .claude/plans/ai-and-catalog-only.md):
 * the checks the four packages had (tests/landing-package.test.js, landing-f4.test.js, app-package.test.js and
 * docs-package.test.js), now on `packages/catalog/src/components/<kind>-<name>.css`, with their reasons.
 * The sources are read as text; no browser, no build. The browser half is the specs of each pattern.
 *
 *   - landing: seven files; core keeps stickiness, the split grid and the row; the head of a section is shared
 *     with the hero; the stat and the section title share their sizes; the glow has one gradient
 *   - cms: five files; the table of contents is in cms-article.css
 *   - app: two files; the dashboard never reorders its panels (accessibility requirement O6)
 *   - docs: seven files, only `.luz-docs-*` classes and properties, nothing of the docs app
 *   - every file: tokens only (no hex, no named colour), no `luz-site-*` or `luz-catalog-*`, no other kind's names
 *   - the docs app uses them (the move out of apps/docs/reference.css), and the home is built on them
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const exists = (path) => existsSync(`${root}${path}`);
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
/** The CSS of a pattern without its comments, so a sentence that names a class is not a rule. */
const src = (name) => (exists(`packages/catalog/src/components/${name}.css`) ? stripComments(read(`packages/catalog/src/components/${name}.css`)) : "");
const has = (text, needle) => (typeof needle === "string" ? text.includes(needle) : needle.test(text));
const defines = (css, selector) => new RegExp(`${selector.replace(/[.]/g, "\\.")}(?![\\w-])`).test(css);

const KINDS = {
  landing: ["header", "hero", "main", "section", "stat", "footer", "glow"],
  cms: ["header", "page-header", "article-header", "article", "footer"],
  app: ["header", "dashboard"],
  docs: ["shell", "page-head", "rail", "example", "dodont", "pager", "page-foot"],
};
const filesOf = (kind) => KINDS[kind].map((name) => `${kind}-${name}`);
const cssOf = (kind) => filesOf(kind).map(src).join("\n");

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

describe("the 21 patterns: tokens only, and nothing of another kind or of the old catalog", () => {
  for (const [kind, names] of Object.entries(KINDS)) {
    it.each(names)(`${kind}-%s uses no hex colour, named colour or literal space (RL-10 reads it too)`, (name) => {
      const css = src(`${kind}-${name}`);
      expect(css.length, `${kind}-${name}.css`).toBeGreaterThan(0);
      expect(has(css, /#[0-9a-fA-F]{3,8}\b(?![\w-])/), "a hex colour").toBe(false);
      expect(has(css, /(?<![\w-])(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/), "a colour function").toBe(false);
    });

    it(`${kind} patterns name no \`luz-site-*\` or \`luz-catalog-*\` class or property, and no other kind's`, () => {
      const others = Object.keys(KINDS).filter((k) => k !== kind).join("|");
      const css = cssOf(kind);
      expect(has(css, /luz-(?:site|catalog)-/), "site or catalog").toBe(false);
      expect(has(css, new RegExp(`luz-(?:${others})-`)), "another kind").toBe(false);
    });

    it(`${kind} patterns declare only \`--luz-${kind}-*\` properties of their own (a token is read, never declared)`, () => {
      const declared = [...cssOf(kind).matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)].map((m) => m[1]);
      // A pattern may set a property of core's grid (--luz-grid-min) or of an element it refines (--luz-lang-switch-top)
      const own = declared.filter((name) => !name.startsWith(`--luz-${kind}-`) && !/^--luz-(?:grid-min|lang-switch-top|submenu-top|bar-h)$/.test(name));
      expect(own).toEqual([]);
    });
  }

  it("every file starts with the standard header of a catalog component: its name, the layer and the prefix", () => {
    for (const [kind, names] of Object.entries(KINDS)) {
      for (const name of names) {
        const head = (exists(`packages/catalog/src/components/${kind}-${name}.css`) ? read(`packages/catalog/src/components/${kind}-${name}.css`) : "").split("*/")[0];
        expect(head, `${kind}-${name}.css`).toMatch(/LUZ Catalog/);
        expect(head, `${kind}-${name}.css`).toMatch(new RegExp(`Layer: catalog`));
        expect(head, `${kind}-${name}.css`).toContain(`.luz-${kind}-`);
      }
    }
  });
});

/* ---- landing ------------------------------------------------------------------------------------ */

describe("landing: the page structure of a landing page", () => {
  it("defines the classes of the spec: header, hero and footer with their parts, the main, the section, the glow and the stat", () => {
    const css = cssOf("landing");
    for (const name of [
      ".luz-landing-header",
      ".luz-landing-header__brand",
      ".luz-landing-header__actions",
      ".luz-landing-hero",
      ".luz-landing-hero__copy",
      ".luz-landing-hero__eyebrow",
      ".luz-landing-hero__title",
      ".luz-landing-hero__lead",
      ".luz-landing-hero__media",
      ".luz-landing-footer",
      ".luz-landing-main",
      ".luz-landing-section",
      ".luz-landing-glow",
      ".luz-landing-stat",
    ]) {
      expect(defines(css, name), name).toBe(true);
    }
  });

  it("leaves to core what core owns: no sticky, no grid columns, no row in landing's CSS", () => {
    const header = src("landing-header");
    expect(header, "stickiness is core's .o-sticky").not.toMatch(/position\s*:\s*sticky/);
    const hero = src("landing-hero");
    expect(hero, "the columns are core's .o-grid--split").not.toMatch(/grid-template-columns/);
    expect(hero, "the grid is core's .o-grid").not.toMatch(/display\s*:\s*grid/);
    expect(hero, "the measure of the columns is a property of core's grid").toMatch(/--luz-grid-min\s*:\s*24rem/);
  });

  it("names the bar for its panels: anchor-name and anchor-scope --luz-bar, and the language list opens at the bar", () => {
    const header = src("landing-header");
    expect(header).toMatch(/anchor-name\s*:\s*--luz-bar/);
    expect(header).toMatch(/anchor-scope\s*:\s*--luz-bar/);
    expect(header).toMatch(/--luz-lang-switch-top\s*:\s*var\(--luz-bar-h\)/);
  });

  it("landing-hero.css has the centred hero and the bleeding picture, and the bleed never sizes itself in vw", () => {
    const hero = src("landing-hero");
    expect(defines(hero, ".luz-landing-hero--centered")).toBe(true);
    expect(defines(hero, ".luz-landing-hero__media--bleed")).toBe(true);
    // A visible scrollbar makes vw wider than the page (Playwright hides scrollbars, so the browser test cannot see it)
    const block = hero.slice(hero.indexOf(".luz-landing-hero__media--bleed"));
    expect(block.length, "the bleed rule exists").toBeGreaterThan(0);
    expect(block).not.toMatch(/\b\d+(?:\.\d+)?[sld]?vw\b/);
  });

  it("landing-section.css has the head: eyebrow, title and lead, and the accent knob for the em of a title", () => {
    const section = src("landing-section");
    for (const part of ["eyebrow", "title", "lead"]) expect(defines(section, `.luz-landing-section__${part}`), part).toBe(true);
    expect(section).toMatch(/var\(\s*--luz-landing-title-accent\s*,\s*inherit\s*\)/);
    // The knob is read on the em of both kinds of title
    expect(section + src("landing-hero")).toMatch(/\.luz-landing-hero__title\s+em/);
    expect(section).toMatch(/\.luz-landing-section__title\s+em/);
  });

  it("the head shares its declarations with the hero's (selector lists in landing-hero.css), it does not copy them", () => {
    const all = src("landing-section") + src("landing-hero");
    expect(all).toMatch(/\.luz-landing-hero__eyebrow\s*,\s*\.luz-landing-section__eyebrow|\.luz-landing-section__eyebrow\s*,\s*\.luz-landing-hero__eyebrow/);
  });

  it("the head's Arabic rules: the eyebrow and the title have their :lang(ar) rules", () => {
    const all = src("landing-section") + src("landing-hero");
    expect(all).toMatch(/\.luz-landing-section__eyebrow:lang\(ar\)/);
    expect(all).toMatch(/\.luz-landing-section__title:lang\(ar\)/);
  });

  it("landing-footer.css has the brand, the columns and their heading; the old row stays", () => {
    const footer = src("landing-footer");
    for (const part of ["brand", "col", "col-title"]) expect(defines(footer, `.luz-landing-footer__${part}`), part).toBe(true);
    expect(footer, "the old row footer").toMatch(/\.luz-landing-footer\s*>\s*\.o-row/);
  });

  it("landing-stat.css has the value (tabular figures, the heading font) and the label", () => {
    const stat = src("landing-stat");
    expect(defines(stat, ".luz-landing-stat")).toBe(true);
    expect(defines(stat, ".luz-landing-stat__value")).toBe(true);
    expect(defines(stat, ".luz-landing-stat__label")).toBe(true);
    expect(stat).toMatch(/tabular-nums/);
    expect(stat).toMatch(/var\(--luz-font-heading\)/);
  });

  it("the stat value shares the section title's size rules (selector lists in landing-section.css), it does not copy them", () => {
    const section = src("landing-section");
    const rules = [...section.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(([, selector, body]) => ({ selectors: selector.split(",").map((s) => s.trim()), body }))
      .filter((r) => r.selectors.includes(".luz-landing-section__title") && /font-size\s*:\s*var\(--luz-text-(3xl|2xl|xl)\)/.test(r.body));
    const steps = rules.map((r) => r.body.match(/--luz-text-(3xl|2xl|xl)/)[1]).sort();
    expect(steps, "one size rule per step of the title: 3xl, 2xl, xl").toEqual(["2xl", "3xl", "xl"]);
    for (const r of rules) expect(r.selectors, r.body.trim()).toContain(".luz-landing-stat__value");
    const own = src("landing-stat").match(/\.luz-landing-stat__value\s*\{[^}]*\}/)?.[0] ?? "";
    expect(own, "landing-stat.css keeps no font-size of its own on the value").not.toMatch(/font-size/);
  });

  it("landing-glow.css reads --luz-landing-glow-x and does not repeat its gradient for right-to-left", () => {
    const glow = src("landing-glow");
    expect(glow).toMatch(/--luz-landing-glow-x/);
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
    ["landing-hero", ["luz-landing-hero--centered", "luz-landing-hero__media--bleed"]],
    ["landing-section", ["luz-landing-section__eyebrow", "luz-landing-section__title", "luz-landing-section__lead", "--luz-landing-title-accent", "--luz-landing-glow-x"]],
    ["landing-footer", ["luz-landing-footer__brand", "luz-landing-footer__col"]],
    ["landing-stat", ["luz-landing-stat__value", "luz-landing-stat__label"]],
  ];
  for (const [page, names] of MENTIONS) {
    it(`/docs/catalog/${page}/ documents ${names.join(", ")}`, () => {
      const html = read(`apps/docs/pages/catalog/${page}.html`);
      for (const name of names) expect(html, name).toContain(name);
    });
  }

  it("the page of the stat shows the stat in its example", () => {
    const html = read("apps/docs/pages/catalog/landing-stat.html");
    for (const name of ['class="luz-landing-stat"', "luz-landing-stat__value", "luz-landing-stat__label"]) expect(html, name).toContain(name);
  });
});

/* ---- cms ------------------------------------------------------------------------------------------ */

describe("cms: the page structure of a blog or a newspaper, with any CMS", () => {
  it("defines the header, its masthead, the page header, the article header, the article layout, the contents and the footer", () => {
    const css = cssOf("cms");
    for (const name of [
      ".luz-cms-header",
      ".luz-cms-header--masthead",
      ".luz-cms-header__brand",
      ".luz-cms-header__sections",
      ".luz-cms-page-header",
      ".luz-cms-page-header__title",
      ".luz-cms-article-header",
      ".luz-cms-article-header__title",
      ".luz-cms-article",
      ".luz-cms-article__layout",
      ".luz-cms-toc",
      ".luz-cms-toc__list",
      ".luz-cms-footer",
    ]) {
      expect(defines(css, name), name).toBe(true);
    }
  });

  it("puts the table of contents in cms-article.css: it is the article's, and cms has no file of its own for it", () => {
    expect(defines(src("cms-article"), ".luz-cms-toc")).toBe(true);
    expect(exists("packages/catalog/src/components/cms-toc.css")).toBe(false);
    for (const name of ["cms-header", "cms-page-header", "cms-article-header", "cms-footer"]) expect(defines(src(name), ".luz-cms-toc"), name).toBe(false);
  });

  it("leaves stickiness to core's .o-sticky: only the table of contents is sticky, and only from where it is beside the text", () => {
    expect(src("cms-header")).not.toMatch(/position\s*:\s*sticky/);
    expect(src("cms-page-header")).not.toMatch(/position\s*:\s*sticky/);
  });
});

/* ---- app ------------------------------------------------------------------------------------------ */

describe("app: the header and the dashboard of a web application", () => {
  const header = src("app-header");
  const dashboard = src("app-dashboard");

  it("app-header.css defines the header and its parts: product, actions, account and its name", () => {
    for (const name of [".luz-app-header", ".luz-app-header__product", ".luz-app-header__actions", ".luz-app-header__account-name"]) expect(defines(header, name), name).toBe(true);
  });

  it("leaves stickiness to core's .o-sticky: no position: sticky in the app header", () => {
    expect(header).not.toMatch(/position\s*:\s*sticky/);
  });

  it("gives .o-main the scroll padding of the bar (O5): scroll-padding-block-start: var(--luz-bar-h)", () => {
    expect(header).toMatch(/\.o-main[^{}]*\{[^}]*scroll-padding-block-start\s*:\s*var\(--luz-bar-h\)/);
  });

  it("clips the account name with the visually-hidden technique, never display: none, so it stays in the name", () => {
    const rule = header.match(/\.luz-app-header__account-name[^{}]*\{([^}]*)\}/g)?.join("\n") ?? "";
    expect(rule, "a rule for the name").not.toBe("");
    expect(rule).not.toMatch(/display\s*:\s*none/);
    expect(rule).not.toMatch(/visibility\s*:\s*hidden/);
    expect(rule).not.toMatch(/font-size\s*:\s*0\b/);
  });

  it("app-dashboard.css defines the dashboard, its title row, its panel and the wide panel", () => {
    for (const name of [".luz-app-dashboard", ".luz-app-dashboard__head", ".luz-app-dashboard__title", ".luz-app-dashboard__panel", ".luz-app-dashboard__panel--wide"]) expect(defines(dashboard, name), name).toBe(true);
  });

  it("is the container of its own size query: inline-size, and the wide panel spans two columns from a 40rem container", () => {
    expect(dashboard).toMatch(/container-type\s*:\s*inline-size/);
    expect(dashboard).toMatch(/@container\s*\(\s*min-width\s*:\s*40rem\s*\)[^{]*\{[^}]*\.luz-app-dashboard__panel--wide[^{}]*\{[^}]*grid-column\s*:\s*span\s+2/);
  });

  it("lets a panel shrink (min-inline-size: 0), so a wide child never widens its column", () => {
    expect(dashboard).toMatch(/\.luz-app-dashboard__panel[^{}]*\{[^}]*min-(inline-size|width)\s*:\s*0/);
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
    for (const file of ["apps/docs/pages/catalog/app-header.html", "apps/docs/pages/catalog/app-dashboard.html"]) {
      for (const match of read(file).matchAll(/luz-app-header__account(?!-name)[\s\S]*?(?:<\/button>|&lt;\/button&gt;)/g)) {
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
    const html = read("apps/docs/pages/catalog/docs-example.html");
    const blocks = [...html.matchAll(/<pre\b[^>]*\bluz-code-block\b[^>]*>[\s\S]*?<\/pre>/g)].map((m) => m[0]);
    expect(blocks.length, "pre.luz-code-block blocks").toBeGreaterThan(0);
    expect(blocks.filter((block) => /<mark\b/i.test(block))).toEqual([]);
  });

  it("defines the seven patterns and their parts", () => {
    for (const name of [
      ".luz-docs-shell",
      ".luz-docs-nav",
      ".luz-docs-main",
      ".luz-docs-rail",
      ".luz-docs-rail__onpage",
      ".luz-docs-rail__actions",
      ".luz-docs-page-head",
      ".luz-docs-page-head__eyebrow",
      ".luz-docs-page-head__lead",
      ".luz-docs-page-head__meta",
      ".luz-docs-example",
      ".luz-docs-example__preview",
      ".luz-docs-example__code",
      ".luz-docs-example__frame",
      ".luz-docs-dodont",
      ".luz-docs-dodont__item",
      ".luz-docs-dodont__item--do",
      ".luz-docs-dodont__item--dont",
      ".luz-docs-dodont__verdict",
      ".luz-docs-dodont__stage",
      ".luz-docs-pager",
      ".luz-docs-pager__prev",
      ".luz-docs-pager__next",
      ".luz-docs-pager__link",
      ".luz-docs-page-foot",
    ]) {
      expect(defines(css, name), name).toBe(true);
    }
  });

  it("every class in a selector is a `.luz-docs-*` class: no core class, no `.docs-*` of the docs app", () => {
    const offenders = [];
    for (const name of filesOf("docs")) {
      for (const [, prelude] of src(name).matchAll(/([^{};]+)\{/g)) {
        if (prelude.trim().startsWith("@")) continue;
        for (const [, cls] of prelude.matchAll(/\.([a-zA-Z_-][\w-]*)/g)) if (!cls.startsWith("luz-docs-")) offenders.push(`${name}: .${cls}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it("every custom property it declares is `--luz-docs-*`, and the shell sets the measure to 46rem", () => {
    const declared = [...css.matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(declared.filter((name) => !name.startsWith("--luz-docs-"))).toEqual([]);
    expect(has(css, /--luz-docs-measure\s*:\s*46rem/), "--luz-docs-measure: 46rem").toBe(true);
    expect(has(css, /--luz-docs-example-w/), "--luz-docs-example-w").toBe(true);
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

  it("places the shell by columns, not by position: three tracks from 80rem, a sidebar of 16.5rem and a rail of 14rem", () => {
    const shell = src("docs-shell");
    for (const value of ["16.5rem", "14rem", "80rem", "60rem"]) expect(has(shell, value), value).toBe(true);
  });
});

describe("docs: the patterns left apps/docs/reference.css and the docs app uses the new names", () => {
  // The old classes of the app (`.docs-pager`, class="docs-pager"…), not the new names of the files and the pages (`docs-pager.css`, /docs/catalog/docs-pager/)
  const OLD = /(?:\.|\bclass="(?:[^"]*\s)?|\bclass=&quot;(?:[^&]*\s)?|["'`])docs-(?:dodont|pager|page-head|onpage)(?![\w-])/;

  it("apps/docs/reference.css no longer defines .docs-dodont*, .docs-pager*, .docs-page-head* or .docs-onpage*", () => {
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
    for (const name of ["luz-docs-page-head", "luz-docs-pager", "luz-docs-rail__onpage"]) expect(has(generator, name), name).toBe(true);
  });

  it("apps/docs/catalog-patterns.css imports the 21 files, in the order of the cascade each kind's stylesheet had, and holds no rule", () => {
    const css = read("apps/docs/catalog-patterns.css");
    const imports = [...css.matchAll(/@import url\("\/packages\/catalog\/dist\/components\/([a-z-]+)\.css"\)/g)].map((m) => m[1]);
    expect(imports).toEqual(Object.keys(KINDS).flatMap(filesOf));
    expect(stripComments(css).replace(/@import url\("[^"]+"\);/g, "").trim(), "no rule of its own").toBe("");
  });

  it("every page the generator writes uses them: the page head, the pager and the on-this-page rail", () => {
    const site = scanSite(join(root, "apps/docs"), root);
    const { rendered } = buildSite(site, { unchecked: ["/"] });
    const page = rendered.get("/docs/components/button/");
    expect(page, "the button page is rendered").toBeTruthy();
    expect(has(page, '<header class="luz-docs-page-head">'), "page head").toBe(true);
    expect(has(page, /<ul class="luz-docs-pager">/), "pager").toBe(true);
    expect(has(page, '<nav class="luz-docs-rail__onpage"'), "on this page").toBe(true);
    expect(has(page, 'class="luz-docs-pager__prev"'), "pager prev").toBe(true);
    expect(has(page, 'class="luz-docs-pager__link"'), "pager link").toBe(true);
    expect(has(page, OLD), "an old class in the rendered page").toBe(false);
  });

  it("a component page's Do and don't uses the pattern's classes", () => {
    const body = read("apps/docs/pages/components/button.html");
    for (const name of ['class="luz-docs-dodont"', "luz-docs-dodont__item--do", "luz-docs-dodont__stage"]) expect(has(body, name), name).toBe(true);
    expect(has(body, OLD), "an old class in button.html").toBe(false);
  });

  it("the docs script finds the specimens and the rail by the new names", () => {
    const script = read("apps/docs/reference.js");
    expect(has(script, ".luz-docs-dodont__stage"), "specimen selector").toBe(true);
    expect(has(script, "luz-docs-rail"), "rail selector").toBe(true);
    expect(has(script, OLD), "an old class in reference.js").toBe(false);
  });

  it("the pager's page and the docs patterns' pages name each pager link by its visible text (WCAG 2.5.3): no aria-label on it", () => {
    /** The start tags of a.luz-docs-pager__link, live (`<a …>`) and written out in a code block (`&lt;a …&gt;`). */
    const pagerLinks = (text) => [
      ...[...text.matchAll(/<a\b[^>]*\bluz-docs-pager__link\b[^>]*>/g)].map((m) => m[0]),
      ...[...text.matchAll(/&lt;a\b(?:(?!&gt;)[\s\S])*?\bluz-docs-pager__link\b(?:(?!&gt;)[\s\S])*?&gt;/g)].map((m) => m[0]),
    ];
    const links = pagerLinks(read("apps/docs/pages/catalog/docs-pager.html"));
    expect(links.length, "pager links in docs-pager.html").toBeGreaterThan(0);
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
    expect(home).toMatch(/<main[^>]*class="[^"]*\bluz-landing-main\b/);
    expect(home).toMatch(/<section class="[^"]*\bluz-landing-hero\b[^"]*\bo-grid\b[^"]*\bo-grid--split\b|<section class="[^"]*\bo-grid\b[^"]*\bo-grid--split\b[^"]*\bluz-landing-hero\b/);
    expect(home).toMatch(/\bluz-landing-section\b/);
    expect(home).toMatch(/<footer[^>]*class="[^"]*\bluz-landing-footer\b|<footer[^>]*>\s*<div class="[^"]*\bluz-landing-footer\b/);
    expect(home).toMatch(/\bo-actions\b/);
  });

  it("no file of the home page or of the docs footer names a class of site's old blocks", () => {
    // `luz-site-` names the old blocks of site (`luz-site-mode` was the key of the stored colour mode, gone in F2)
    const old = /luz-site-(?!mode)/;
    const files = ["apps/landing/index.html", "apps/landing/landing.css", "apps/site/header.css", "apps/site/_partials/footer.html", "apps/docs/_partials/footer-links.html", "apps/docs/_layouts/not-found.html"];
    const offenders = files.flatMap((f) => read(f).split("\n").flatMap((line, i) => (old.test(line) ? [`${f}:${i + 1}: ${line.trim().slice(0, 80)}`] : [])));
    expect(offenders).toEqual([]);
  });

  it("the docs footer partial is the landing footer", () => {
    const partial = read("apps/site/_partials/footer.html");
    expect(partial).toMatch(/\bluz-landing-footer\b/);
    expect(partial).toMatch(/\bo-container--inline\b/);
  });
});
