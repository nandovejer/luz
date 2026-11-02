/**
 * The bar list of @luz-ds/core (`.luz-bar-list`, component-gaps plan, section 4.2) is a LOOSE sheet: core's luz.css has no room
 * for it, so `components/bar-list.css` is a file of core that `components/index.css` does not import, that the package
 * publishes on its own, and that a page links after luz.css. What these tests pin (the look is tests/bar-list.spec.js):
 *
 *   - the sources and the package: the file exists, luz.css does not hold it, pack-files.txt lists it plain and minified;
 *   - the budgets: core's rows are unchanged and the loose sheet has a row of its own (ideal 768 B, ceiling 1024 B), the same in
 *     budgets.json and in the PRINCIPLES.md table (its place among the other rows is not pinned: other rows come and go);
 *   - the docs: the page in the new group "Data" (Spanish "Datos"), its translation, the line that says it is a separate sheet;
 *   - the generator: `looseCoreSheets()` finds the loose sheets, the `{{loose}}` placeholder links them on the pages that name
 *     them and nowhere else, the examples page and the debug page link them;
 *   - the home uses the component and keeps no class of its own for its bar charts;
 *   - DESIGN.md writes the deviation of the track of the meter (DR-2), dated, and no luz-exception covers it.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { looseCoreSheets } from "../scripts/docs-site/snippets.js";
import { buildReal, renderedDebug, site } from "./helpers/debug-page.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf-8");
const json = (path) => JSON.parse(read(path));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Rendering every page in every language takes seconds, more under load: once, before the tests that read it
beforeAll(() => {
  buildReal();
}, 120_000);

const SHEET = "components/bar-list.css";
const ROUTE = "/docs/components/bar-list/";
const ES_ROUTE = "/es/docs/components/bar-list/";
const builtCore = existsSync(join(root, "packages/core/dist/components/bar-list.css"));

/* ---- The sources and the package -------------------------------------------------------------------------------------- */

describe("the sheet of the bar list is a loose file of core", () => {
  const source = () => read("packages/core/src/components/bar-list.css");

  it("is a source of core's components that the index does not import", () => {
    // the bar list and the three charts (tests/chart-sheets.test.js) are the loose sheets
    const LOOSE = ["bar-list.css", "column-chart.css", "stacked-bar.css", "heat-map.css"];
    expect(existsSync(join(root, "packages/core/src/components/bar-list.css"))).toBe(true);
    expect(read("packages/core/src/components/index.css")).not.toMatch(/bar-list/);
    for (const file of readdirSync(join(root, "packages/core/src/components")).filter((f) => /^[a-z]/.test(f) && f !== "index.css" && !LOOSE.includes(f))) {
      expect(read("packages/core/src/components/index.css"), `${file} is imported, only the loose sheets are not`).toContain(`./${file}`);
    }
  });

  it("names its own block, takes its colours from the chart tokens and keeps the 0 minimum of its meter", () => {
    const css = strip(source());
    expect(css).toMatch(/\.luz-bar-list\b/);
    for (const token of ["--luz-chart-1", "--luz-chart-track"]) expect(css, token).toContain(token);
    expect(css).toMatch(/min-inline-size:\s*0\b/);
    expect(source(), "a deviation of a design rule is written in DESIGN.md, not as a luz-exception").not.toMatch(/luz-exception/);
  });

  it("is published as components/bar-list.css and components/bar-list.min.css, by core and by no other package", () => {
    const core = read("packages/core/pack-files.txt").split("\n");
    for (const file of ["dist/components/bar-list.css", "dist/components/bar-list.min.css"]) expect(core, file).toContain(file);
    for (const pkg of ["tokens", "catalog"]) expect(read(`packages/${pkg}/pack-files.txt`).split("\n").filter((f) => /bar-list/.test(f)), pkg).toEqual([]);
  });

  it.skipIf(!builtCore)("is built beside the other components, in the layer of the components, and luz.css does not contain it", () => {
    for (const file of ["components/bar-list.css", "components/bar-list.min.css"]) expect(existsSync(join(root, "packages/core/dist", file)), file).toBe(true);
    expect(read("packages/core/dist/components/bar-list.css")).toMatch(/@layer luz\.components\s*\{/);
    for (const file of ["luz.css", "luz.min.css", "luz.conditional.css", "luz.conditional.min.css"]) {
      expect(read(`packages/core/dist/${file}`), `${file} has no bar list`).not.toContain("luz-bar-list");
    }
  });

  it.skipIf(!builtCore)("is in core's manifest of classes, with its sheet", () => {
    const classes = json("packages/core/dist/classes.json").classes.filter((c) => c.block === "luz-bar-list");
    expect(classes.map((c) => c.name).sort()).toEqual(
      ["luz-bar-list", "luz-bar-list--cells", "luz-bar-list__figure", "luz-bar-list__meter", "luz-bar-list__name", "luz-bar-list__row", "luz-bar-list__row--zero", "luz-bar-list__rows"].sort(),
    );
    for (const c of classes) expect(c.files, c.name).toEqual([SHEET]);
  });
});

/* ---- The budgets ------------------------------------------------------------------------------------------------------ */

describe("the budget of the loose sheet", () => {
  const budgets = json("budgets.json").budgets;
  const lines = read("PRINCIPLES.md").split("\n");
  const header = lines.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
  const table = lines
    .slice(header + 2)
    .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const KiB = 1024;
  const bytes = (cell) => Math.round(parseFloat(cell.replace(/^≤\s*/, "")) * KiB);
  const NAME = "core component CSS, a loose sheet: bar-list";

  it("keeps core's rows as they were: the ceiling of core CSS is not raised", () => {
    expect(budgets.find((b) => b.name === "core CSS")).toMatchObject({ ideal: 8960, max: 11776 });
    expect(budgets.find((b) => b.name.startsWith("core conditional CSS"))).toMatchObject({ max: 11776 });
    expect(budgets.find((b) => b.file === "packages/core/dist/luz.min.js").max).toBe(8192);
  });

  it("is a row of budgets.json: packages/core/dist/components/bar-list.min.css, ideal 768 B, ceiling 1024 B", () => {
    expect(budgets.filter((b) => b.name === NAME)).toEqual([{ name: NAME, file: "packages/core/dist/components/bar-list.min.css", ideal: 768, max: 1024 }]);
  });

  it("is a row of the PRINCIPLES.md table, with the same ideal and ceiling and no floor, at the place its row has in budgets.json", () => {
    expect(table, "the table and budgets.json have the same rows").toHaveLength(budgets.length);
    const at = budgets.findIndex((b) => b.name === NAME);
    expect(at).toBeGreaterThan(-1);
    const [name, floor, ideal, warn, ceiling] = table[at];
    expect(name).toMatch(/^`core` component CSS, a loose sheet: `bar-list`/);
    expect(name).toContain("packages/core/dist/components/bar-list.min.css");
    expect(floor).toBe("—");
    expect(bytes(ideal)).toBe(768);
    expect(bytes(warn)).toBe(768);
    expect(bytes(ceiling)).toBe(1024);
    expect(table.filter(([cell]) => /loose sheet:? `?bar-list/.test(cell)), "one row").toHaveLength(1);
  });

  it("has the ceilings of the table equal to budgets.json, row for row", () => {
    expect(table.map((cells) => bytes(cells.at(-1)))).toEqual(budgets.map((b) => b.max));
  });

  it.skipIf(!builtCore)("fits: the minified sheet is under its ceiling, gzipped", async () => {
    const { gzipSync } = await import("node:zlib");
    expect(gzipSync(readFileSync(join(root, "packages/core/dist/components/bar-list.min.css")), { level: 9 }).length).toBeLessThanOrEqual(1024);
  });
});

/* ---- The docs page ---------------------------------------------------------------------------------------------------- */

describe("the page of the bar list", () => {
  const page = site.byRoute.get(ROUTE);

  it("is a page of Components, in the group Data, and names the loose sheet as its file", () => {
    expect(page, `${ROUTE} is a page`).toBeTruthy();
    expect(page.meta).toMatchObject({ area: "components", group: "data", files: SHEET, title: "Bar list" });
  });

  it("has the group Data in the components area, between Media and Helpers, and Spanish says Datos", () => {
    const area = json("apps/docs/site.json").areas.find((a) => a.id === "components");
    const ids = area.groups.map((g) => g.id);
    expect(area.groups.find((g) => g.id === "data")).toMatchObject({ label: "Data" });
    expect(ids.indexOf("data")).toBe(ids.indexOf("media") + 1);
    expect(ids.indexOf("helpers")).toBe(ids.indexOf("data") + 1);
    expect(json("apps/docs/i18n/es/strings.json")["group.components.data"]).toBe("Datos");
  });

  it("tells that the stylesheet is separate: link components/bar-list.css after luz.css", () => {
    const body = text(page.body);
    expect(body).toContain("A separate stylesheet: link components/bar-list.css after luz.css");
  });

  it("has the examples of the page as bar lists whose meters are decorative, and a figure in text in every row", () => {
    const example = page.body.split('<h2 id="known-issues">')[0];
    expect(example).toContain('class="luz-bar-list"');
    const meters = [...example.matchAll(/<meter\b[^>]*>/g)].map((m) => m[0]);
    expect(meters.length).toBeGreaterThan(1);
    for (const meter of meters) expect(meter, "a meter that shows what a figure says is hidden").toContain('aria-hidden="true"');
    expect(example.match(/class="luz-bar-list__figure"/g)?.length).toBe(meters.length);
  });

  it("is a page of the Spanish docs whose source is the hash of the English body, and says it is pending review", () => {
    const es = read("apps/docs/i18n/es/pages/components/bar-list.html");
    expect(es).toMatch(/^<!-- luz:page/);
    expect(es.match(/^source: ([0-9a-f]{12})$/m)?.[1]).toBe(sourceHash(page.body));
    expect(es).toMatch(/^reviewed: false$/m);
    expect(es).not.toMatch(/^(?:area|group|files|order):/m);
  });
});

describe("the gallery of the components", () => {
  const rendered = () => buildReal().rendered;

  it.each([
    ["/docs/components/", "Data", "/docs/components/bar-list/"],
    ["/es/docs/components/", "Datos", "/es/docs/components/bar-list/"],
  ])("%s has a section %s with a card to the bar list (and one to each of the three charts: four in all)", (route, heading, href) => {
    const html = rendered().get(route);
    const section = html.split('aria-labelledby="group-data"')[1]?.split("</section>")[0] ?? "";
    expect(section, `${route} has the group`).toContain(`<h2 id="group-data">${heading}</h2>`);
    expect(section.match(/<li class="luz-card docs-card">/g)).toHaveLength(4);
    expect(section).toContain(`href="${href}"`);
  });
});

/* ---- The generator ---------------------------------------------------------------------------------------------------- */

describe("looseCoreSheets(): the sheets of core that luz.css does not hold", () => {
  const temps = [];
  afterEach(() => {
    for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  /** A root with core's components: the files and the index. */
  function coreWith(files, index) {
    const dir = mkdtempSync(join(tmpdir(), "luz-loose-"));
    temps.push(dir);
    const components = join(dir, "packages/core/src/components");
    mkdirSync(components, { recursive: true });
    for (const file of files) writeFileSync(join(components, file), "/* x */\n");
    writeFileSync(join(components, "index.css"), index);
    return dir;
  }

  it("returns the real ones: the bar list and the three charts, read from the sources", () => {
    expect(looseCoreSheets(root)).toEqual([SHEET, "components/column-chart.css", "components/heat-map.css", "components/stacked-bar.css"]);
  });

  it("returns the files of src/components that the index does not import, sorted, as components/<file>", () => {
    const dir = coreWith(["a.css", "b.css", "z-loose.css", "m-loose.css"], '@import url("./a.css");\n@import url("./b.css");\n');
    expect(looseCoreSheets(dir)).toEqual(["components/m-loose.css", "components/z-loose.css"]);
  });

  it("does not return a file that starts with _ (a partial), nor the index, and returns none when the index imports everything", () => {
    expect(looseCoreSheets(coreWith(["a.css", "_partial.css"], '@import url("./a.css");\n'))).toEqual([]);
  });

  it("returns none for a root with no core beside it, and does not throw", () => {
    const dir = mkdtempSync(join(tmpdir(), "luz-loose-"));
    temps.push(dir);
    expect(looseCoreSheets(dir)).toEqual([]);
  });
});

describe("{{loose}}: the link of a loose sheet, written in the head of the pages that name it", () => {
  const rendered = () => buildReal().rendered;
  const LINK = "/packages/core/dist/components/bar-list.css";
  const sheets = (html) => [...html.matchAll(/<link\b[^>]*rel="?stylesheet"?[^>]*>/g)].map((m) => m[0].match(/href="?([^" >]+)/)?.[1]);
  /** The pages whose `files` names a loose sheet: the bar list, in every language. */
  const NAMED = [ROUTE, ES_ROUTE];
  /** The home and the debug page link every core sheet, the docs pages the ones they name. */
  const HOMES = ["/", "/es/", "/ar/"];

  it("links it right after luz.css and before every catalog sheet, on the page of the bar list in English and in Spanish", () => {
    for (const route of NAMED) {
      const links = sheets(rendered().get(route));
      expect(links.filter((href) => href === LINK), route).toHaveLength(1);
      expect(links.indexOf(LINK), `${route}: after luz.css`).toBe(links.indexOf("/packages/core/dist/luz.css") + 1);
      const firstCatalog = links.findIndex((href) => href.startsWith("/packages/catalog/"));
      expect(firstCatalog, route).toBeGreaterThan(links.indexOf(LINK));
    }
  });

  it("links it on no other page of the docs, in any language, and leaves no placeholder behind", () => {
    const others = [...rendered()].filter(([route]) => route.startsWith("/docs/") || route.startsWith("/es/docs/") || route.startsWith("/ar/docs/") || route === "/404.html");
    expect(others.length, "the docs are rendered").toBeGreaterThan(100);
    for (const [route, html] of others) {
      if (NAMED.includes(route)) continue;
      expect(sheets(html), route).not.toContain(LINK);
    }
    for (const [route, html] of rendered()) {
      if (typeof html === "string") expect(html, route).not.toContain("{{loose}}");
    }
  });

  it("links it on the home page of every language, after luz.css and before catalog's sheets", () => {
    for (const route of HOMES) {
      const html = rendered().get(route);
      expect(html, `${route} is rendered`).toBeTruthy();
      const links = sheets(html);
      expect(links.indexOf(LINK), `${route}: after luz.css`).toBe(links.indexOf("/packages/core/dist/luz.css") + 1);
      expect(links.findIndex((href) => href.startsWith("/packages/catalog/")), `${route}: before catalog's`).toBeGreaterThan(links.indexOf(LINK));
    }
  });

  it("is linked by the debug page after luz.css, with the three charts' sheets, before the catalog's sheets: it shows every component", () => {
    const links = sheets(renderedDebug());
    const loose = ["bar-list", "column-chart", "heat-map", "stacked-bar"].map((name) => `/packages/core/dist/components/${name}.css`);
    expect(loose[0]).toBe(LINK);
    expect(links.slice(0, 6)).toEqual(["/packages/tokens/dist/luz-tokens.css", "/packages/core/dist/luz.css", ...loose]);
    expect(links.findIndex((href) => href.startsWith("/packages/catalog/"))).toBe(6);
  });

  it("is in the page layout of the docs as a placeholder right after luz.css, never typed", () => {
    expect(read("apps/docs/_layouts/page.html")).toMatch(/<link rel="stylesheet" href="\/packages\/core\/dist\/luz\.css">\{\{loose\}\}/);
    expect(read("apps/docs/_layouts/page.html")).not.toContain("bar-list");
  });
});

/* ---- The examples page ------------------------------------------------------------------------------------------------ */

describe("the page of the examples of the bar list", () => {
  it("links ../dist/core/components/bar-list.min.css right after luz.min.css, and the build copies the file beside the others", async () => {
    const ai = await import(/* @vite-ignore */ join(root, "scripts/docs-site/ai.js"));
    const { PAGES_CSP } = await import(/* @vite-ignore */ join(root, "vite.config.js"));
    const { FILES } = await import(/* @vite-ignore */ join(root, "scripts/docs-site/snippets.js"));
    const versions = Object.fromEntries(["tokens", "core", "catalog"].map((name) => [name, json(`packages/${name}/package.json`).version]));
    const example = ai.exampleDocuments(site, { csp: PAGES_CSP, versions }).find((e) => e.route === "/examples/components/bar-list.html");
    expect(example, "the bar list has an example page").toBeTruthy();
    const hrefs = [...example.html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["../dist/tokens/tokens.min.css", `../dist/core/${FILES.core.css}`, "../dist/core/components/bar-list.min.css"]);
    if (builtCore) {
      const routes = ai.exampleAssets(root).map((a) => a.route);
      expect(routes).toContain("/examples/dist/core/components/bar-list.min.css");
    }
  });
});

/* ---- The home ---------------------------------------------------------------------------------------------------------- */

describe("the home page uses the bar list, and keeps no bar chart of its own", () => {
  const OWN = /landing-bar|landing-chart/;

  it("has no class of the old charts in its stylesheet, its template or the generator", () => {
    for (const file of ["apps/landing/landing.css", "apps/landing/index.html", "scripts/docs-site/site.js", "scripts/docs-site/i18n.js"]) {
      expect(read(file), file).not.toMatch(OWN);
    }
    for (const file of readdirSync(join(root, "apps/landing/i18n")).filter((f) => f.endsWith(".json"))) expect(read(`apps/landing/i18n/${file}`), file).not.toMatch(OWN);
  });

  it("links the loose sheet in its template, after luz.css and before the first catalog sheet", () => {
    const links = [...read("apps/landing/index.html").matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.indexOf("/packages/core/dist/components/bar-list.css")).toBe(links.indexOf("/packages/core/dist/luz.css") + 1);
    expect(links.findIndex((href) => href.startsWith("/packages/catalog/"))).toBeGreaterThan(links.indexOf("/packages/core/dist/components/bar-list.css"));
  });

  it.each(["/", "/es/", "/ar/"])("%s: the three charts are figures of the bar list in cells, each row a name, a figure and a hidden meter, and no old class is left", (route) => {
    const html = buildReal().rendered.get(route);
    expect(html).not.toMatch(OWN);
    expect(html.match(/<figure class="?luz-bar-list luz-bar-list--cells"?>/g), "three charts").toHaveLength(3);
    expect(html.match(/<ul class="?luz-bar-list__rows"? aria-label=/g), "each list keeps its name").toHaveLength(3);
    const rows = html.match(/<li class="?luz-bar-list__row\b/g).length;
    expect(html.match(/<span class="?luz-bar-list__name"?>/g)).toHaveLength(rows);
    expect(html.match(/<span class="?luz-bar-list__figure"?>/g)).toHaveLength(rows);
    const meters = html.match(/<meter\b[^>]*>/g);
    expect(meters).toHaveLength(rows);
    for (const meter of meters) {
      expect(meter, "the meter is the bar's, with no class of core's meter").toMatch(/class="?luz-bar-list__meter"?/);
      expect(meter).not.toMatch(/luz-meter/);
      expect(meter, "a picture of a figure that is text").toMatch(/aria-hidden="?true"?/);
    }
  });
});

/* ---- DESIGN.md --------------------------------------------------------------------------------------------------------- */

describe("DESIGN.md: the track of the meter of the bar list", () => {
  const design = () => read("DESIGN.md");
  const exceptions = () => design().split(/^### DR-2\b/m)[1].split(/^#{2,3} /m)[0].split(/^\*\*Exceptions:\*\*/m)[1];

  it("writes the deviation in the Exceptions of DR-2: the track is --luz-chart-track and has no edge, with the day", () => {
    const body = exceptions();
    expect(body, "DR-2 has Exceptions").toBeTruthy();
    const at = body.indexOf("`.luz-bar-list__meter`");
    expect(at, "DR-2 names the meter of the bar list").toBeGreaterThanOrEqual(0);
    const own = body.slice(at);
    expect(own).toContain("`--luz-chart-track`");
    expect(own, "the day it was written").toContain("2026-11-02");
  });

  it("is a design rule, never a luz-exception or a row of EXCEPTIONS.md", () => {
    expect(exceptions()).not.toMatch(/luz-exception|EX-\d+/);
    const register = existsSync(join(root, "EXCEPTIONS.md")) ? read("EXCEPTIONS.md") : "";
    expect(register).not.toMatch(/bar-list/);
  });
});
