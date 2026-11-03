/**
 * The three charts that are CSS over a native element are stylesheets of @luz-ds/catalog since 2026-11-03 (they were "loose" sheets
 * of core, like the bar list, tests/bar-list.test.js): each `components/<name>.css` is a file of catalog, independent, in the layer
 * luz.catalog, that a page links after luz.css and only where it uses it.
 *
 *   luz-column-chart   a table whose cells are columns: --v from 0 to 1 on each cell, the figure in the cell as text
 *   luz-stacked-bar    the shares of a whole in one bar (hidden) and a legend of names and figures in text
 *   luz-heat-map       a table whose cells show a swatch mixed from the chart colour into the track, and the figure
 *
 * What these tests pin (the look is tests/column-chart.spec.js, stacked-bar.spec.js and heat-map.spec.js; the move as a whole is
 * tests/charts-to-catalog.test.js):
 *
 *   - the sources and the package: the file is a source of catalog and core has none, catalog's pack-files.txt lists it plain and
 *     minified, `@luz-ds/catalog/components/*` reaches it, the manifest of catalog's classes says its file;
 *   - the sheet reads only tokens (no colour, no length typed), the chart tokens, has rules for forced colors and no motion;
 *   - the docs: a page each in the Catalog area, group Charts, `fits-kinds: app`, its Spanish page pending review, none left in
 *     Components, the docs' catalog sheets (catalog-patterns.css) holding the sheet;
 *   - the changesets, and DESIGN.md writing the deviations of DR-2 and DR-8, dated, with no luz-exception.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { buildReal, site } from "./helpers/debug-page.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf-8");
const json = (path) => JSON.parse(read(path));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Rendering every page in every language takes seconds, more under load: once, before the tests that read it
beforeAll(() => {
  buildReal();
}, 120_000);

/**
 * One row per chart: its block, the tokens it must read, and what its page's example holds.
 * `series` are the chart tokens the sheet reads.
 */
const CHARTS = [
  { name: "column-chart", block: "luz-column-chart", title: "Column chart", order: "37", series: ["--luz-chart-1", "--luz-chart-track"] },
  { name: "stacked-bar", block: "luz-stacked-bar", title: "Stacked bar", order: "38", series: ["--luz-chart-1", "--luz-chart-2", "--luz-chart-3", "--luz-chart-4", "--luz-chart-5", "--luz-chart-6"] },
  { name: "heat-map", block: "luz-heat-map", title: "Heat map", order: "39", series: ["--luz-chart-1", "--luz-chart-track"] },
];
const SHEET_OF = (name) => `components/${name}.css`;
const built = CHARTS.every(({ name }) => existsSync(join(root, `packages/catalog/dist/components/${name}.css`)));

describe.each(CHARTS)("the sheet of the $name is a stylesheet of catalog", ({ name, block, series }) => {
  const source = () => {
    expect(existsSync(join(root, `packages/catalog/src/components/${name}.css`)), `catalog's components/${name}.css exists`).toBe(true);
    return read(`packages/catalog/src/components/${name}.css`);
  };

  it("is a source of catalog's components, and core has no source of it nor an import of it", () => {
    expect(existsSync(join(root, `packages/catalog/src/components/${name}.css`)), "the source exists").toBe(true);
    expect(existsSync(join(root, `packages/core/src/components/${name}.css`)), "core has none").toBe(false);
    expect(read("packages/core/src/components/index.css")).not.toContain(name);
    expect(source()).toContain(`LUZ Catalog: ${name}`);
  });

  it("names its own block, and no luz-exception covers it (a deviation of a design rule is written in DESIGN.md)", () => {
    const css = strip(source());
    expect(css).toContain(`.${block}`);
    expect(source()).not.toMatch(/luz-exception/);
  });

  it("is published as components/<name>.css and components/<name>.min.css by catalog, and by no other package, under the exports of components/*", () => {
    const catalog = read("packages/catalog/pack-files.txt").split("\n");
    for (const file of [`dist/components/${name}.css`, `dist/components/${name}.min.css`]) expect(catalog, file).toContain(file);
    for (const pkg of ["tokens", "core"]) expect(read(`packages/${pkg}/pack-files.txt`).split("\n").filter((f) => f.includes(name)), pkg).toEqual([]);
    // `@luz-ds/catalog/components/<name>.css` is `./dist/components/<name>.css`
    expect(json("packages/catalog/package.json").exports["./components/*"]).toBe("./dist/components/*");
  });

  it("reads only tokens: no colour, no length and no font typed (a 1px edge in forced colors and the em of letter-spacing aside)", () => {
    const css = strip(source())
      .replace(/border:\s*1px solid CanvasText;/g, "")
      .replace(/letter-spacing:\s*(?:0\.04em|0);/g, "");
    expect(css, "no hex colour").not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css, "no colour function but color-mix() of tokens").not.toMatch(/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/i);
    expect(css, "no length typed").not.toMatch(/(?<![\w-])-?\d*\.?\d+(?:px|rem|em|ex|ch|pt|vh|vw|vmin|vmax|cqi|cqw)\b/);
    expect(css, "no named font").not.toMatch(/font-family:\s*(?!\s|var\()/);
    // every var() of a token is one of the system's (a fallback or a local property is `--luz-<block>-…`)
    for (const [, token] of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) expect(token, "a token of the system").toMatch(/^--(?:luz-|v$)/);
  });

  it("takes its colours from the chart tokens", () => {
    const css = strip(source());
    for (const token of series) expect(css, token).toContain(token);
  });

  it("has a rule for forced colors (the system colours and an edge), and no motion at all to turn off under reduced motion", () => {
    const css = strip(source());
    const forced = css.split("@media (forced-colors: active)")[1];
    expect(forced, "a forced-colors block").toBeTruthy();
    expect(forced).toContain("CanvasText");
    expect(forced).toMatch(/forced-color-adjust:\s*none/);
    expect(css, "no animation, no transition: nothing moves under prefers-reduced-motion").not.toMatch(/\b(?:animation|transition|@keyframes)\b/);
  });

  it.skipIf(!built)("is built beside catalog's other components, in the layer luz.catalog, and luz.css and its variants do not hold it", () => {
    for (const file of [`components/${name}.css`, `components/${name}.min.css`]) {
      expect(existsSync(join(root, "packages/catalog/dist", file)), file).toBe(true);
      expect(existsSync(join(root, "packages/core/dist", file)), `core's dist has no ${file}`).toBe(false);
    }
    const css = read(`packages/catalog/dist/components/${name}.css`);
    expect(css).toMatch(/@layer luz\.catalog\s*\{/);
    expect(css).not.toMatch(/@layer luz\.components\s*\{/);
    for (const file of ["luz.css", "luz.min.css", "luz.conditional.css", "luz.conditional.min.css"]) {
      expect(read(`packages/core/dist/${file}`), `${file} has no ${name}`).not.toContain(block);
    }
  });

  it.skipIf(!built)("is in catalog's manifest of classes, with its sheet and no other, and in core's manifest no more", () => {
    const classes = json("packages/catalog/dist/classes.json").classes.filter((c) => c.block === block || c.name === block);
    expect(classes.map((c) => c.name)).toContain(block);
    for (const c of classes) {
      expect(c.files, c.name).toEqual([SHEET_OF(name)]);
      expect(c.layer, c.name).toBe("luz.catalog");
    }
    expect(json("packages/core/dist/classes.json").classes.filter((c) => (c.block ?? c.name) === block), "core's manifest").toEqual([]);
  });

  it.skipIf(!built)("fits: the minified sheet is under 1024 B, gzipped (catalog has no limit; the pieces were this small in core and stay so)", () => {
    expect(gzipSync(readFileSync(join(root, `packages/catalog/dist/components/${name}.min.css`)), { level: 9 }).length).toBeLessThanOrEqual(1024);
  });
});

describe("the stacked bar names its six series in order, and the parts and the items share them", () => {
  it("gives the n-th part and the n-th item --luz-chart-n through --luz-stacked-bar-color, from the second on", () => {
    expect(existsSync(join(root, "packages/catalog/src/components/stacked-bar.css")), "catalog's components/stacked-bar.css exists").toBe(true);
    const css = strip(read("packages/catalog/src/components/stacked-bar.css"));
    for (const n of [2, 3, 4, 5, 6]) {
      expect(css, `series ${n}`).toMatch(new RegExp(`:nth-child\\(${n}\\)\\s*\\{\\s*--luz-stacked-bar-color:\\s*var\\(--luz-chart-${n}\\)`));
    }
    expect(css, "the first is the default of the colour").toMatch(/var\(--luz-stacked-bar-color,\s*var\(--luz-chart-1\)\)/);
  });
});

/* ---- The docs pages --------------------------------------------------------------------------------------------------- */

describe.each(CHARTS)("the page of the $name", ({ name, block, title, order }) => {
  const route = `/docs/catalog/${name}/`;
  const page = () => {
    const found = site.byRoute.get(route);
    expect(found, `${route} is a page`).toBeTruthy();
    return found;
  };
  const rendered = () => buildReal().rendered;
  const sheets = (html) => [...html.matchAll(/<link\b[^>]*rel="?stylesheet"?[^>]*>/g)].map((m) => m[0].match(/href="?([^" >]+)/)?.[1]);

  it("is a page of the Catalog area, in the group Charts, fits an application, and names its sheet as its file", () => {
    expect(page().meta).toMatchObject({ area: "catalog", group: "charts", files: SHEET_OF(name), title, "fits-kinds": "app", order });
    expect(page().meta.fits.length).toBeGreaterThan(10);
    expect(page().file).toBe(`apps/docs/pages/catalog/${name}.html`);
    expect(page().body).toContain(`<div class="docs-component" id="p-${name}">`);
  });

  it("is no longer a page of Components, in English or in Spanish", () => {
    expect(site.byRoute.has(`/docs/components/${name}/`)).toBe(false);
    for (const file of [`apps/docs/pages/components/${name}.html`, `apps/docs/i18n/es/pages/components/${name}.html`]) expect(existsSync(join(root, file)), file).toBe(false);
  });

  it("tells that the stylesheet is catalog's: link components/<name>.css after luz.css", () => {
    const body = page().body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    expect(body).toContain(`A stylesheet of @luz-ds/catalog: link components/${name}.css after luz.css`);
    expect(body).not.toContain("A separate stylesheet");
  });

  it("has an example of its own block, above the known issues, whose figures are text", () => {
    const example = page().body.split('<h2 id="known-issues">')[0];
    expect(example).toContain(`class="${block}"`);
    expect(example).toContain("data-docs-specimen");
  });

  it("is a page of the Spanish docs whose source is the hash of the English body, pending review, and the rendered page says so", () => {
    expect(existsSync(join(root, `apps/docs/i18n/es/pages/catalog/${name}.html`)), "the Spanish page exists").toBe(true);
    const es = read(`apps/docs/i18n/es/pages/catalog/${name}.html`);
    expect(es).toMatch(/^<!-- luz:page/);
    expect(es.match(/^source: ([0-9a-f]{12})$/m)?.[1]).toBe(sourceHash(page().body));
    expect(es).toMatch(/^reviewed: false$/m);
    expect(es).not.toMatch(/^(?:area|group|files|order|fits-kinds):/m);
    const html = rendered().get(`/es${route}`);
    expect(html, "the Spanish page is rendered").toBeTruthy();
    expect(html).toContain(json("apps/docs/i18n/es/strings.json")["notice.pending"]);
  });

  it("is rendered, in English and in Spanish, with the docs' catalog sheets (catalog-patterns.css, which imports the sheet) and no sheet of core but luz.css; no other page of the docs links a sheet of core's of that name", () => {
    expect(read("apps/docs/catalog-patterns.css")).toContain(`/packages/catalog/dist/components/${name}.css`);
    for (const r of [route, `/es${route}`]) {
      const links = sheets(rendered().get(r));
      expect(links, r).toContain("/apps/docs/catalog-patterns.css");
      expect(links.filter((href) => href.startsWith("/packages/core/")), r).toEqual(["/packages/core/dist/luz.css"]);
    }
    for (const [r, html] of rendered()) if (typeof html === "string") expect(sheets(html), r).not.toContain(`/packages/core/dist/components/${name}.css`);
  });
});

describe("the gallery of the catalog: the group Charts has the four that came from core", () => {
  it.each([
    ["/docs/catalog/", "Charts", ""],
    ["/es/docs/catalog/", "Gráficos", "/es"],
  ])("%s has the section %s with a card to each of bar-list, column-chart, heat-map and stacked-bar", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const section = html.split('aria-labelledby="group-charts"')[1]?.split("</section>")[0] ?? "";
    expect(section).toContain(`<h2 id="group-charts">${heading}</h2>`);
    for (const name of ["bar-list", ...CHARTS.map((c) => c.name)]) expect(section, name).toContain(`href="${prefix}/docs/catalog/${name}/"`);
  });
});

/* ---- The changeset ---------------------------------------------------------------------------------------------------- */

describe("the changeset that added the three charts", () => {
  const files = () => readdirSync(join(root, ".changeset")).filter((f) => f.endsWith(".md") && f !== "README.md");

  it("is one that names each chart's class and sheet, and bumps @luz-ds/core and @luz-ds/check as the bar list's does", () => {
    // the changeset that added the three (the one of the move to catalog, charts-to-catalog.md, has its own test in tests/charts-to-catalog.test.js)
    const own = files().filter((f) => f !== "charts-to-catalog.md" && CHARTS.every(({ block }) => read(`.changeset/${f}`).includes(block)));
    expect(own, "one changeset names the three charts").toHaveLength(1);
    const text = read(`.changeset/${own[0]}`);
    const frontMatter = text.split("---")[1];
    expect(frontMatter).toMatch(/"@luz-ds\/core":\s*(?:patch|minor)/);
    expect(frontMatter).toMatch(/"@luz-ds\/check":\s*(?:patch|minor)/);
    for (const { name } of CHARTS) expect(text, name).toContain(`${name}.css`);
    expect(text, "it says the sheets are loose").toMatch(/loose/);
    // the bar list's changeset is the model: the same two packages
    const model = files().find((f) => read(`.changeset/${f}`).includes("luz-bar-list"));
    if (model) expect(text.split("---")[1].match(/"@luz-ds\/[a-z]+"/g)).toEqual(read(`.changeset/${model}`).split("---")[1].match(/"@luz-ds\/[a-z]+"/g));
  });
});

/* ---- DESIGN.md -------------------------------------------------------------------------------------------------------- */

describe("DESIGN.md: the deviations of the three charts", () => {
  const design = () => read("DESIGN.md");
  const exceptions = (rule) => design().split(new RegExp(`^### ${rule}\\b`, "m"))[1].split(/^#{2,3} /m)[0].split(/^\*\*Exceptions:\*\*/m)[1];

  it("DR-2: the column of a column chart, the swatch of a heat map and the parts of a stacked bar have no edge, with the day it was written", () => {
    const body = exceptions("DR-2");
    for (const selector of ["`.luz-column-chart td::after`", "`.luz-heat-map td::before`", "`.luz-stacked-bar__part`"]) {
      const at = body.indexOf(selector);
      expect(at, `DR-2 names ${selector}`).toBeGreaterThanOrEqual(0);
    }
    const own = body.slice(body.indexOf("`.luz-column-chart td::after`"));
    expect(own, "the day it was written").toContain("2026-11-02");
    expect(own).toContain("CanvasText");
  });

  it("DR-8: the gap between the parts of a stacked bar is the half step, --luz-space-3xs, with the day it was written", () => {
    const body = exceptions("DR-8");
    const at = body.indexOf("`.luz-stacked-bar__bar`");
    expect(at, "DR-8 names the bar of the stacked bar").toBeGreaterThanOrEqual(0);
    expect(body.slice(at)).toContain("`--luz-space-3xs`");
    expect(body.slice(at)).toContain("2026-11-02");
    expect(existsSync(join(root, "packages/catalog/src/components/stacked-bar.css")), "catalog's components/stacked-bar.css exists").toBe(true);
    expect(read("packages/catalog/src/components/stacked-bar.css")).toMatch(/gap:\s*var\(--luz-space-3xs\)/);
  });

  it("are design rules, never a luz-exception or a row of EXCEPTIONS.md", () => {
    for (const rule of ["DR-2", "DR-8"]) expect(exceptions(rule), rule).not.toMatch(/luz-exception|EX-\d+/);
    const register = existsSync(join(root, "EXCEPTIONS.md")) ? read("EXCEPTIONS.md") : "";
    expect(register).not.toMatch(/column-chart|stacked-bar|heat-map/);
  });
});
