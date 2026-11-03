/**
 * The three charts of @luz-ds/core that are CSS over a native element, each a LOOSE sheet like the bar list
 * (tests/bar-list.test.js): core's luz.css has no room for them, so each `components/<name>.css` is a file of core that
 * `components/index.css` does not import, that the package publishes on its own, and that a page links after luz.css.
 *
 *   luz-column-chart   a table whose cells are columns: --v from 0 to 1 on each cell, the figure in the cell as text
 *   luz-stacked-bar    the shares of a whole in one bar (hidden) and a legend of names and figures in text
 *   luz-heat-map       a table whose cells show a swatch mixed from the chart colour into the track, and the figure
 *
 * What these tests pin (the look is tests/column-chart.spec.js, stacked-bar.spec.js and heat-map.spec.js):
 *
 *   - the sources and the package: the file exists, luz.css does not hold it, pack-files.txt lists it plain and minified,
 *     `@luz-ds/core/components/*` reaches it, the manifest of classes says its file;
 *   - the sheet reads only tokens (no colour, no length typed), the chart tokens, has rules for forced colors and no motion;
 *   - the budgets: a row each in budgets.json and in the PRINCIPLES.md table, ideal 768 B, ceiling 1024 B;
 *   - the docs: a page each in the group Data, its Spanish page pending review, the link of the sheet in the head of its
 *     own page and of no other;
 *   - the changeset, and DESIGN.md writing the deviations of DR-2 and DR-8, dated, with no luz-exception.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { looseCoreSheets } from "../scripts/docs-site/snippets.js";
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
  { name: "column-chart", block: "luz-column-chart", title: "Column chart", series: ["--luz-chart-1", "--luz-chart-track"] },
  { name: "stacked-bar", block: "luz-stacked-bar", title: "Stacked bar", series: ["--luz-chart-1", "--luz-chart-2", "--luz-chart-3", "--luz-chart-4", "--luz-chart-5", "--luz-chart-6"] },
  { name: "heat-map", block: "luz-heat-map", title: "Heat map", series: ["--luz-chart-1", "--luz-chart-track"] },
];
const SHEET_OF = (name) => `components/${name}.css`;
const BAR_LIST = "components/bar-list.css";
const builtCore = CHARTS.every(({ name }) => existsSync(join(root, `packages/core/dist/components/${name}.css`)));

describe.each(CHARTS)("the sheet of the $name is a loose file of core", ({ name, block, series }) => {
  const source = () => {
    expect(existsSync(join(root, `packages/core/src/components/${name}.css`)), `components/${name}.css exists`).toBe(true);
    return read(`packages/core/src/components/${name}.css`);
  };

  it("is a source of core's components that the index does not import", () => {
    expect(existsSync(join(root, `packages/core/src/components/${name}.css`)), "the source exists").toBe(true);
    expect(read("packages/core/src/components/index.css")).not.toContain(name);
  });

  it("names its own block, and no luz-exception covers it (a deviation of a design rule is written in DESIGN.md)", () => {
    const css = strip(source());
    expect(css).toContain(`.${block}`);
    expect(source()).not.toMatch(/luz-exception/);
  });

  it("is published as components/<name>.css and components/<name>.min.css by core, and by no other package, under the exports of components/*", () => {
    const core = read("packages/core/pack-files.txt").split("\n");
    for (const file of [`dist/components/${name}.css`, `dist/components/${name}.min.css`]) expect(core, file).toContain(file);
    for (const pkg of ["tokens", "catalog"]) expect(read(`packages/${pkg}/pack-files.txt`).split("\n").filter((f) => f.includes(name)), pkg).toEqual([]);
    // `@luz-ds/core/components/<name>.css` is `./dist/components/<name>.css`
    expect(json("packages/core/package.json").exports["./components/*"]).toBe("./dist/components/*");
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

  it.skipIf(!builtCore)("is built beside the other components, in the layer of the components, and luz.css and its variants do not hold it", () => {
    for (const file of [`components/${name}.css`, `components/${name}.min.css`]) expect(existsSync(join(root, "packages/core/dist", file)), file).toBe(true);
    expect(read(`packages/core/dist/components/${name}.css`)).toMatch(/@layer luz\.components\s*\{/);
    for (const file of ["luz.css", "luz.min.css", "luz.conditional.css", "luz.conditional.min.css"]) {
      expect(read(`packages/core/dist/${file}`), `${file} has no ${name}`).not.toContain(block);
    }
  });

  it.skipIf(!builtCore)("is in core's manifest of classes, with its sheet and no other", () => {
    const classes = json("packages/core/dist/classes.json").classes.filter((c) => c.block === block || c.name === block);
    expect(classes.map((c) => c.name)).toContain(block);
    for (const c of classes) expect(c.files, c.name).toEqual([SHEET_OF(name)]);
  });

  it.skipIf(!builtCore)("fits: the minified sheet is under 1024 B, gzipped", () => {
    expect(gzipSync(readFileSync(join(root, `packages/core/dist/components/${name}.min.css`)), { level: 9 }).length).toBeLessThanOrEqual(1024);
  });
});

describe("the stacked bar names its six series in order, and the parts and the items share them", () => {
  it("gives the n-th part and the n-th item --luz-chart-n through --luz-stacked-bar-color, from the second on", () => {
    expect(existsSync(join(root, "packages/core/src/components/stacked-bar.css")), "components/stacked-bar.css exists").toBe(true);
    const css = strip(read("packages/core/src/components/stacked-bar.css"));
    for (const n of [2, 3, 4, 5, 6]) {
      expect(css, `series ${n}`).toMatch(new RegExp(`:nth-child\\(${n}\\)\\s*\\{\\s*--luz-stacked-bar-color:\\s*var\\(--luz-chart-${n}\\)`));
    }
    expect(css, "the first is the default of the colour").toMatch(/var\(--luz-stacked-bar-color,\s*var\(--luz-chart-1\)\)/);
  });
});

/* ---- The loose sheets, all together ----------------------------------------------------------------------------------- */

describe("looseCoreSheets(): the bar list and the three charts are the sheets luz.css does not hold", () => {
  it("returns them, sorted, read from the sources", () => {
    expect(looseCoreSheets(root)).toEqual([BAR_LIST, ...CHARTS.map(({ name }) => SHEET_OF(name))].sort());
  });

  it("is every file of src/components that the index does not import, and the index imports every other", () => {
    const index = read("packages/core/src/components/index.css");
    const loose = readdirSync(join(root, "packages/core/src/components")).filter((f) => /^[a-z]/.test(f) && f !== "index.css" && !index.includes(`./${f}`));
    expect(loose.sort()).toEqual(["bar-list.css", "column-chart.css", "heat-map.css", "stacked-bar.css"]);
  });
});

/* ---- The budgets ------------------------------------------------------------------------------------------------------ */

describe("the budgets of the three loose sheets", () => {
  const budgets = json("budgets.json").budgets;
  const lines = read("PRINCIPLES.md").split("\n");
  const header = lines.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
  const table = lines
    .slice(header + 2)
    .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const KiB = 1024;
  const bytes = (cell) => Math.round(parseFloat(cell.replace(/^≤\s*/, "")) * KiB);

  it("keeps core's rows as they were: the ceiling of core CSS is not raised", () => {
    expect(budgets.find((b) => b.name === "core CSS")).toMatchObject({ ideal: 8960, max: 11776 });
    expect(budgets.find((b) => b.name.startsWith("core conditional CSS"))).toMatchObject({ max: 11776 });
    expect(budgets.find((b) => b.file === "packages/core/dist/luz.min.js").max).toBe(8192);
  });

  it.each(CHARTS)("$name is a row of budgets.json: its minified sheet in core's dist, ideal 768 B, ceiling 1024 B", ({ name }) => {
    const row = `core component CSS, a loose sheet: ${name}`;
    expect(budgets.filter((b) => b.name === row)).toEqual([{ name: row, file: `packages/core/dist/components/${name}.min.css`, ideal: 768, max: 1024 }]);
  });

  it.each(CHARTS)("$name is a row of the PRINCIPLES.md table, with the same ideal and ceiling and no floor, at the place its row has in budgets.json", ({ name }) => {
    expect(table, "the table and budgets.json have the same rows").toHaveLength(budgets.length);
    const at = budgets.findIndex((b) => b.name === `core component CSS, a loose sheet: ${name}`);
    expect(at).toBeGreaterThan(-1);
    const [cell, floor, ideal, warn, ceiling] = table[at];
    expect(cell).toMatch(new RegExp(`^\`core\` component CSS, a loose sheet: \`${name}\``));
    expect(cell).toContain(`packages/core/dist/components/${name}.min.css`);
    expect(floor).toBe("—");
    expect(bytes(ideal)).toBe(768);
    expect(bytes(warn)).toBe(768);
    expect(bytes(ceiling)).toBe(1024);
  });

  it("has four rows of loose sheets in the table, and its ceilings are budgets.json's, row for row", () => {
    expect(table.filter(([cell]) => /loose sheet/.test(cell))).toHaveLength(4);
    expect(table.map((cells) => bytes(cells.at(-1)))).toEqual(budgets.map((b) => b.max));
  });
});

/* ---- The docs pages --------------------------------------------------------------------------------------------------- */

describe.each(CHARTS)("the page of the $name", ({ name, block, title }) => {
  const route = `/docs/components/${name}/`;
  const page = () => {
    const found = site.byRoute.get(route);
    expect(found, `${route} is a page`).toBeTruthy();
    return found;
  };
  const rendered = () => buildReal().rendered;
  const sheets = (html) => [...html.matchAll(/<link\b[^>]*rel="?stylesheet"?[^>]*>/g)].map((m) => m[0].match(/href="?([^" >]+)/)?.[1]);
  const LINK = `/packages/core/dist/components/${name}.css`;

  it("is a page of Components, in the group Charts, and names the loose sheet as its file", () => {
    expect(page(), `${route} is a page`).toBeTruthy();
    expect(page().meta).toMatchObject({ area: "components", group: "charts", files: SHEET_OF(name), title });
  });

  it("tells that the stylesheet is separate: link components/<name>.css after luz.css", () => {
    const body = page().body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    expect(body).toContain(`A separate stylesheet: link components/${name}.css after luz.css`);
  });

  it("has an example of its own block, above the known issues, whose figures are text", () => {
    const example = page().body.split('<h2 id="known-issues">')[0];
    expect(example).toContain(`class="${block}"`);
    expect(example).toContain("data-docs-specimen");
  });

  it("is a page of the Spanish docs whose source is the hash of the English body, pending review, and the rendered page says so", () => {
    expect(existsSync(join(root, `apps/docs/i18n/es/pages/components/${name}.html`)), "the Spanish page exists").toBe(true);
    const es = read(`apps/docs/i18n/es/pages/components/${name}.html`);
    expect(es).toMatch(/^<!-- luz:page/);
    expect(es.match(/^source: ([0-9a-f]{12})$/m)?.[1]).toBe(sourceHash(page().body));
    expect(es).toMatch(/^reviewed: false$/m);
    expect(es).not.toMatch(/^(?:area|group|files|order):/m);
    const html = rendered().get(`/es${route}`);
    expect(html, "the Spanish page is rendered").toBeTruthy();
    expect(html).toContain(json("apps/docs/i18n/es/strings.json")["notice.pending"]);
  });

  it("links the sheet right after luz.css and before every catalog sheet, in English and in Spanish, and on no other page of the docs than the Dashboard's when its `loose` key names it", () => {
    for (const r of [route, `/es${route}`]) {
      expect(rendered().get(r), `${r} is rendered`).toBeTruthy();
      const links = sheets(rendered().get(r));
      expect(links.filter((href) => href === LINK), r).toHaveLength(1);
      expect(links.indexOf(LINK), `${r}: after luz.css (the loose sheets of the pages that name them: only this one)`).toBe(links.indexOf("/packages/core/dist/luz.css") + 1);
      const firstCatalog = links.findIndex((href) => href.startsWith("/packages/catalog/"));
      if (firstCatalog > -1) expect(firstCatalog, r).toBeGreaterThan(links.indexOf(LINK));
    }
    // The Dashboard page uses the stacked bar without documenting it: its `loose` key names the sheet, in every language
    const dashboard = (site.byRoute.get("/docs/catalog/dashboard/").meta.loose ?? "").split(";").map((f) => f.trim());
    const onDashboard = dashboard.includes(SHEET_OF(name));
    if (name === "stacked-bar") expect(dashboard, "the Dashboard page names the stacked bar in `loose`").toContain(SHEET_OF(name));
    else expect(onDashboard, `${name} is not on the Dashboard page`).toBe(false);
    for (const r of ["/docs/catalog/dashboard/", "/es/docs/catalog/dashboard/"]) {
      expect(sheets(rendered().get(r)).filter((href) => href === LINK), `${r}`).toHaveLength(onDashboard ? 1 : 0);
    }
    for (const [r, html] of rendered()) {
      if (typeof html !== "string" || r === route || r === `/es${route}`) continue;
      if (onDashboard && (r === "/docs/catalog/dashboard/" || r === "/es/docs/catalog/dashboard/")) continue;
      if (r.startsWith("/docs/") || r.startsWith("/es/docs/") || r.startsWith("/ar/docs/") || r === "/404.html") expect(sheets(html), r).not.toContain(LINK);
    }
  });
});

describe("the gallery of the components: the group Charts has the four charts", () => {
  it.each([
    ["/docs/components/", "Charts", ""],
    ["/es/docs/components/", "Gráficos", "/es"],
  ])("%s has the section %s with a card to each of bar-list, column-chart, heat-map and stacked-bar", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const section = html.split('aria-labelledby="group-charts"')[1]?.split("</section>")[0] ?? "";
    expect(section).toContain(`<h2 id="group-charts">${heading}</h2>`);
    for (const name of ["bar-list", ...CHARTS.map((c) => c.name)]) expect(section, name).toContain(`href="${prefix}/docs/components/${name}/"`);
  });
});

/* ---- The changeset ---------------------------------------------------------------------------------------------------- */

describe("the changeset of the three charts", () => {
  const files = () => readdirSync(join(root, ".changeset")).filter((f) => f.endsWith(".md") && f !== "README.md");

  it("is one that names each chart's class and sheet, and bumps @luz-ds/core and @luz-ds/check as the bar list's does", () => {
    const own = files().filter((f) => CHARTS.every(({ block }) => read(`.changeset/${f}`).includes(block)));
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
    expect(existsSync(join(root, "packages/core/src/components/stacked-bar.css")), "components/stacked-bar.css exists").toBe(true);
    expect(read("packages/core/src/components/stacked-bar.css")).toMatch(/gap:\s*var\(--luz-space-3xs\)/);
  });

  it("are design rules, never a luz-exception or a row of EXCEPTIONS.md", () => {
    for (const rule of ["DR-2", "DR-8"]) expect(exceptions(rule), rule).not.toMatch(/luz-exception|EX-\d+/);
    const register = existsSync(join(root, "EXCEPTIONS.md")) ? read("EXCEPTIONS.md") : "";
    expect(register).not.toMatch(/column-chart|stacked-bar|heat-map/);
  });
});
