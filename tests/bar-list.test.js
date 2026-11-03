/**
 * The bar list (`.luz-bar-list`, component-gaps plan, section 4.2) is a stylesheet of @luz-ds/catalog since 2026-11-03: it was a
 * "loose" sheet of core (a file of core that luz.css did not hold), and core's rule is now that it holds what every page needs and
 * fits in luz.css, while what a page links on its own when it uses it is catalog. What these tests pin (the look is
 * tests/bar-list.spec.js; the move as a whole is tests/charts-to-catalog.test.js):
 *
 *   - the sources and the package: `components/bar-list.css` is a source of catalog in the layer luz.catalog, core has no file of
 *     it (source, dist, pack list, manifest), catalog's pack-files.txt lists it plain and minified, the manifest of classes
 *     says its file;
 *   - the docs: the page in the Catalog area, group "Charts" (Spanish "Gráficos"), `fits-kinds: app`, its translation, the line
 *     that says it is a stylesheet of catalog, no page of it in Components;
 *   - the generator: the docs link it through catalog-patterns.css, the examples page and the debug page link it as a catalog sheet;
 *   - the home uses the component, links it as a catalog sheet and keeps no class of its own for its bar charts;
 *   - DESIGN.md writes the deviation of the track of the meter (DR-2), dated, and no luz-exception covers it.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
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
const ROUTE = "/docs/catalog/bar-list/";
const ES_ROUTE = "/es/docs/catalog/bar-list/";
const builtCatalog = existsSync(join(root, "packages/catalog/dist/components/bar-list.css"));
const sheets = (html) => [...html.matchAll(/<link\b[^>]*rel="?stylesheet"?[^>]*>/g)].map((m) => m[0].match(/href="?([^" >]+)/)?.[1]);

/* ---- The sources and the package -------------------------------------------------------------------------------------- */

describe("the sheet of the bar list is a stylesheet of catalog", () => {
  const source = () => {
    expect(existsSync(join(root, "packages/catalog/src/components/bar-list.css")), "catalog's components/bar-list.css exists").toBe(true);
    return read("packages/catalog/src/components/bar-list.css");
  };

  it("is a source of catalog's components, with the header of a catalog component, and core has no source of it", () => {
    expect(existsSync(join(root, "packages/catalog/src/components/bar-list.css"))).toBe(true);
    expect(existsSync(join(root, "packages/core/src/components/bar-list.css")), "core has no bar-list.css").toBe(false);
    expect(read("packages/core/src/components/index.css")).not.toMatch(/bar-list/);
    expect(source()).toMatch(/LUZ Catalog: bar-list/);
    expect(source()).not.toMatch(/Loose sheet|LUZ Component:/);
  });

  it("names its own block, takes its colours from the chart tokens and keeps the 0 minimum of its meter", () => {
    const css = strip(source());
    expect(css).toMatch(/\.luz-bar-list\b/);
    for (const token of ["--luz-chart-1", "--luz-chart-track"]) expect(css, token).toContain(token);
    expect(css).toMatch(/min-inline-size:\s*0\b/);
    expect(source(), "a deviation of a design rule is written in DESIGN.md, not as a luz-exception").not.toMatch(/luz-exception/);
  });

  it("is published as components/bar-list.css and components/bar-list.min.css, by catalog and by no other package", () => {
    const catalog = read("packages/catalog/pack-files.txt").split("\n");
    for (const file of ["dist/components/bar-list.css", "dist/components/bar-list.min.css"]) expect(catalog, file).toContain(file);
    for (const pkg of ["tokens", "core"]) expect(read(`packages/${pkg}/pack-files.txt`).split("\n").filter((f) => /bar-list/.test(f)), pkg).toEqual([]);
  });

  it.skipIf(!builtCatalog)("is built beside catalog's other components, in the layer luz.catalog, and neither luz.css nor core's dist holds it", () => {
    for (const file of ["components/bar-list.css", "components/bar-list.min.css"]) expect(existsSync(join(root, "packages/catalog/dist", file)), file).toBe(true);
    const css = read("packages/catalog/dist/components/bar-list.css");
    expect(css).toMatch(/@layer luz\.catalog\s*\{/);
    expect(css, "not in the layer of core's components").not.toMatch(/@layer luz\.components\s*\{/);
    for (const file of ["luz.css", "luz.min.css", "luz.conditional.css", "luz.conditional.min.css"]) {
      expect(read(`packages/core/dist/${file}`), `${file} has no bar list`).not.toContain("luz-bar-list");
    }
    for (const file of ["components/bar-list.css", "components/bar-list.min.css"]) expect(existsSync(join(root, "packages/core/dist", file)), `core's dist has no ${file}`).toBe(false);
  });

  it.skipIf(!builtCatalog)("is in catalog's manifest of classes, with its sheet, and in core's manifest no more", () => {
    const classes = json("packages/catalog/dist/classes.json").classes.filter((c) => c.block === "luz-bar-list");
    expect(classes.map((c) => c.name).sort()).toEqual(
      ["luz-bar-list", "luz-bar-list--cells", "luz-bar-list__figure", "luz-bar-list__meter", "luz-bar-list__name", "luz-bar-list__row", "luz-bar-list__row--zero", "luz-bar-list__rows"].sort(),
    );
    for (const c of classes) {
      expect(c.files, c.name).toEqual([SHEET]);
      expect(c.layer, c.name).toBe("luz.catalog");
    }
    expect(json("packages/core/dist/classes.json").classes.filter((c) => (c.block ?? c.name) === "luz-bar-list"), "core's manifest").toEqual([]);
  });
});

/* ---- The docs page ---------------------------------------------------------------------------------------------------- */

describe("the page of the bar list", () => {
  const found = site.byRoute.get(ROUTE);
  // a page that is not there fails the test that needs it with a plain message, not a TypeError
  const page = new Proxy({}, { get: (_, key) => { expect(found, `${ROUTE} is a page`).toBeTruthy(); return found[key]; } });

  it("is a page of the Catalog area, in the group Charts, fits an application, and names its sheet as its file", () => {
    expect(page, `${ROUTE} is a page`).toBeTruthy();
    expect(page.meta).toMatchObject({ area: "catalog", group: "charts", files: SHEET, title: "Bar list", "fits-kinds": "app", order: "36" });
    expect(page.meta.fits.length).toBeGreaterThan(10);
    expect(page.file).toBe("apps/docs/pages/catalog/bar-list.html");
    expect(page.body).toContain('<div class="docs-component" id="p-bar-list">');
  });

  it("is no longer a page of Components, in English or in Spanish", () => {
    expect(site.byRoute.has("/docs/components/bar-list/")).toBe(false);
    for (const file of ["apps/docs/pages/components/bar-list.html", "apps/docs/i18n/es/pages/components/bar-list.html"]) expect(existsSync(join(root, file)), file).toBe(false);
  });

  it("tells that the stylesheet is catalog's: link components/bar-list.css after luz.css", () => {
    const body = text(page.body);
    expect(body).toContain("A stylesheet of @luz-ds/catalog: link components/bar-list.css after luz.css");
    expect(body, "the words of a loose sheet of core are gone").not.toContain("A separate stylesheet");
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
    expect(existsSync(join(root, "apps/docs/i18n/es/pages/catalog/bar-list.html")), "the Spanish page exists").toBe(true);
    const es = read("apps/docs/i18n/es/pages/catalog/bar-list.html");
    expect(es).toMatch(/^<!-- luz:page/);
    expect(es.match(/^source: ([0-9a-f]{12})$/m)?.[1]).toBe(sourceHash(page.body));
    expect(es).toMatch(/^reviewed: false$/m);
    expect(es).not.toMatch(/^(?:area|group|files|order|fits-kinds):/m);
  });

  it.each([ROUTE, ES_ROUTE])("%s is rendered with the docs' catalog sheets (catalog-patterns.css, which imports the bar list) and links no sheet of core but luz.css", (route) => {
    expect(buildReal().rendered.get(route), `${route} is rendered`).toBeTruthy();
    const links = sheets(buildReal().rendered.get(route));
    expect(links, route).toContain("/apps/docs/catalog-patterns.css");
    expect(read("apps/docs/catalog-patterns.css")).toContain("/packages/catalog/dist/components/bar-list.css");
    expect(links.filter((href) => href.startsWith("/packages/core/")), route).toEqual(["/packages/core/dist/luz.css"]);
  });
});

describe("the gallery of the catalog", () => {
  it.each([
    ["/docs/catalog/", "Charts", "/docs/catalog/bar-list/"],
    ["/es/docs/catalog/", "Gráficos", "/es/docs/catalog/bar-list/"],
  ])("%s has a section %s with a card to the bar list", (route, heading, href) => {
    const html = buildReal().rendered.get(route);
    const section = html.split('aria-labelledby="group-charts"')[1]?.split("</section>")[0] ?? "";
    expect(section, `${route} has the group`).toContain(`<h2 id="group-charts">${heading}</h2>`);
    expect(section).toContain(`href="${href}"`);
  });
});

/* ---- The generator ---------------------------------------------------------------------------------------------------- */

describe("the sheet is linked as a catalog sheet by the debug page and by the examples page", () => {
  it("is linked by the debug page among catalog's sheets, in the order of the folder, and core's luz.css is the only sheet of core", () => {
    const links = sheets(renderedDebug());
    expect(links.filter((href) => href.startsWith("/packages/core/"))).toEqual(["/packages/core/dist/luz.css"]);
    expect(links.slice(0, 2)).toEqual(["/packages/tokens/dist/luz-tokens.css", "/packages/core/dist/luz.css"]);
    expect(links).toContain("/packages/catalog/dist/components/bar-list.css");
    expect(links.findIndex((href) => href.startsWith("/packages/catalog/")), "catalog's sheets follow luz.css").toBe(2);
  });

  it("links ../dist/catalog/components/bar-list.min.css after luz.min.css, and the build copies the file beside the others", async () => {
    const ai = await import(/* @vite-ignore */ join(root, "scripts/docs-site/ai.js"));
    const { PAGES_CSP } = await import(/* @vite-ignore */ join(root, "vite.config.js"));
    const { FILES } = await import(/* @vite-ignore */ join(root, "scripts/docs-site/snippets.js"));
    const versions = Object.fromEntries(["tokens", "core", "catalog"].map((name) => [name, json(`packages/${name}/package.json`).version]));
    const examples = ai.exampleDocuments(site, { csp: PAGES_CSP, versions });
    const example = examples.find((e) => e.route === "/examples/catalog/bar-list.html");
    expect(example, "the bar list has an example page in the catalog area").toBeTruthy();
    expect(examples.some((e) => e.route === "/examples/components/bar-list.html"), "and none in the components area").toBe(false);
    const hrefs = [...example.html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["../dist/tokens/tokens.min.css", `../dist/core/${FILES.core.css}`, "../dist/catalog/components/bar-list.min.css"]);
    if (builtCatalog) {
      const routes = ai.exampleAssets(root).map((a) => a.route);
      expect(routes).toContain("/examples/dist/catalog/components/bar-list.min.css");
      expect(routes).not.toContain("/examples/dist/core/components/bar-list.min.css");
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

  it("links the sheet of catalog in its template, after luz.css, and no sheet of core's but luz.css", () => {
    const links = [...read("apps/landing/index.html").matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    const at = links.indexOf("/packages/catalog/dist/components/bar-list.css");
    expect(at, "a link to catalog's bar-list.css").toBeGreaterThan(links.indexOf("/packages/core/dist/luz.css"));
    expect(links).not.toContain("/packages/core/dist/components/bar-list.css");
    expect(links.filter((href) => href.startsWith("/packages/core/"))).toEqual(["/packages/core/dist/luz.css"]);
  });

  it.each(["/", "/es/", "/ar/"])("%s: the three charts are figures of the bar list in cells, each row a name, a figure and a hidden meter, and no old class is left", (route) => {
    const html = buildReal().rendered.get(route);
    expect(html).not.toMatch(OWN);
    expect(sheets(html), route).toContain("/packages/catalog/dist/components/bar-list.css");
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
