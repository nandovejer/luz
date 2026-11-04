/**
 * `.luz-column-chart` with several series and `<luz-chart type="column" interactive>` / `<luz-chart type="line" interactive>`
 * of @luz-ds/catalog, the parts that need no browser (what they draw and do is tests/column-chart.spec.js,
 * tests/chart-interactive.spec.js and, without JavaScript, tests/chart.spec.js):
 *   - the sheets: the hairlines are `thin`, the header and the title are in the sans, the defaults of the two knobs, the forced-colors
 *     colour of a second series;
 *   - chart.js: the attribute is documented in its header, it writes no word of its own (EX-014, in tests/chart.test.js) and keeps
 *     the one native button;
 *   - the two pages: the live example and the snippet of a table laid out as boxes carry the roles of a table, the interactive demo is
 *     on both, and "Keyboard and ARIA" says what the keys do, what an off series keeps and that Escape puts the readout away;
 *     the total of a series is a sum, said so;
 *   - the review record has a row for the column chart.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { decodeEntities } from "../scripts/docs-site/html.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { findAll, parse } from "./helpers/html-dom.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const CHART_CSS = "packages/catalog/src/components/chart.css";
const COLUMN_CSS = "packages/catalog/src/components/column-chart.css";
const CHART_JS = "packages/catalog/src/chart.js";
const css = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");
/** The rules of a stylesheet, flat, nested at-rules included: [{ selector, body }]. */
const rulesOf = (text) => [...css(text).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.replace(/\s+/g, " ").trim(), body: body.trim() }));
/** The declarations of the rules whose selector is `selector` exactly: [[property, value], …]. */
const declarationsOf = (text, selector) => rulesOf(text).filter((r) => r.selector === selector).flatMap((r) => [...r.body.matchAll(/(?:^|;)\s*([-\w]+)\s*:\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
const valueOf = (text, selector, property) => declarationsOf(text, selector).filter(([p]) => p === property).map(([, v]) => v).at(-1);

describe("the stylesheets", () => {
  const chart = () => read(CHART_CSS);
  const column = () => read(COLUMN_CSS);

  it("the header of the series is a hairline, `thin`, in --luz-divider: its rule under the buttons and the separator between two of them", () => {
    expect(valueOf(chart(), ".luz-chart__picker", "border-block-end")).toBe("thin solid var(--luz-divider)");
    expect(valueOf(chart(), ".luz-chart__pick + .luz-chart__pick", "border-inline-start")).toBe("thin solid var(--luz-divider)");
  });

  it("a button of the header and the title of the chart are in the sans of the system, whatever the table's own font", () => {
    expect(valueOf(chart(), ".luz-chart__pick", "font-family")).toBe("var(--luz-font-sans)");
    expect(valueOf(chart(), ".luz-chart__title", "font-family")).toBe("var(--luz-font-sans)");
  });

  it("the dot of a series and the content of the readout are no classes: the dot is the ::before of a button and of a key, the readout's p, ul and spans are styled through :where()", () => {
    const sheet = css(chart());
    expect(sheet, "no class for the dot or the parts of the readout").not.toMatch(/\.luz-chart__(?:dot|name|readout-(?:title|list|name|value))\b/);
    expect(read(CHART_JS), "chart.js does not write them either").not.toMatch(/luz-chart__(?:dot|name|readout-(?:title|list|name|value))\b|["']luz-chart__(?:dot|name)["']/);
    expect(rulesOf(chart()).some((r) => /\.luz-chart__pick(?:\[[^\]]*\])?::before/.test(r.selector) || /\.luz-chart__pick[^,{]*::before/.test(r.selector)), "the dot of a button").toBe(true);
    expect(rulesOf(chart()).some((r) => /\.luz-chart__readout \.luz-chart__key::before/.test(r.selector)), "the dot of a key of the readout").toBe(true);
    expect(sheet).toMatch(/\.luz-chart__readout :where\(p\)/);
    expect(sheet).toMatch(/\.luz-chart__readout :where\(ul\)/);
  });

  it("the name of a day is raised above the bands with the layer token, never a number", () => {
    const rule = rulesOf(chart()).find((r) => /tbody th$/.test(r.selector) && /z-index/.test(r.body));
    expect(rule, "a rule of the names of the days that sets z-index").toBeTruthy();
    expect(rule.body).toMatch(/z-index:\s*var\(--luz-z-raised\)/);
    expect(css(chart())).not.toMatch(/z-index:\s*-?\d/);
  });

  it("the bar is --luz-column-chart-bar, the space-lg step by default, and never wider than its column", () => {
    expect(valueOf(column(), ".luz-column-chart", "--luz-column-chart-bar")).toBe("var(--luz-space-lg)");
    expect(valueOf(column(), ".luz-column-chart td::after", "inline-size")).toMatch(/^min\(var\(--luz-column-chart-bar\), 100%\)$/);
  });

  it("the gap between the columns of a group is --luz-column-chart-gap, the space-xs step by default, and the head row is a thin hairline in --luz-divider", () => {
    const gaps = rulesOf(column()).flatMap((r) => [...r.body.matchAll(/(?:^|;)\s*gap\s*:\s*([^;]+)/g)].map((m) => m[1].trim()));
    expect(gaps).toContain("var(--luz-column-chart-gap, var(--luz-space-xs))");
    const legend = rulesOf(column()).find((r) => /thead tr$/.test(r.selector) && /border-block-end/.test(r.body));
    expect(legend, "the head row has a rule under it").toBeTruthy();
    expect(legend.body).toMatch(/border-block-end:\s*thin solid var\(--luz-divider\)/);
  });

  it("in forced colors series 2 and later are CanvasText and the dots of the legend have an edge", () => {
    const forced = css(column()).slice(css(column()).indexOf("@media (forced-colors: active)"));
    expect(forced).toMatch(/nth-child\(n \+ 3\)\s*\{[^}]*--luz-column-chart-fill:\s*CanvasText/);
    expect(forced).toMatch(/thead th \+ th::before[^{]*\{[^}]*border:\s*1px solid CanvasText/);
  });

  it("in forced colors the band of a day is a dashed edge, and the columns of an interactive chart have none", () => {
    const forced = css(chart()).slice(css(chart()).indexOf("@media (forced-colors: active)"));
    expect(forced).toMatch(/\.luz-chart__band\s*\{[^}]*stroke-dasharray/);
    expect(forced).toMatch(/\[data-luz-active\][^{]*\{[^}]*outline:\s*1px dashed CanvasText/);
    expect(forced).toMatch(/td::after\s*\{[^}]*border:\s*0/);
  });

  it("the sheet of the column chart stays within its 1,024 B gzip limit, which is not raised (tests/chart-sheets.test.js)", () => {
    const limit = /toBeLessThanOrEqual\((\d+)\)/.exec(read("tests/chart-sheets.test.js").slice(read("tests/chart-sheets.test.js").indexOf("fits: the minified sheet")))?.[1];
    expect(limit).toBe("1024");
  });
});

describe("chart.js", () => {
  it("documents the boolean attribute `interactive` and the type `column` in its header, as plain text for custom-elements.json", () => {
    const header = read(CHART_JS);
    expect(header).toMatch(/@attr \{boolean\} interactive - [A-Z][^\n]*\.\n/);
    expect(header).toMatch(/@attr \{[^}]*"column"[^}]*\} type - /);
  });

  it("gives the table of a column chart its class itself, so that without the script it stays a table", () => {
    expect(read(CHART_JS)).toMatch(/classList\.add\(\s*["']luz-column-chart["']\s*\)/);
  });

  it("says the total with Intl.NumberFormat of the page's language and adds it up: a sum", () => {
    const source = read(CHART_JS).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
    expect(source).toMatch(/Intl\.NumberFormat\(/);
    expect(source).toMatch(/reduce\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\w+\s*\+\s*\w+/);
  });

  it("adds the interactive parts for type=\"line\" and type=\"column\" only when `interactive` is there", () => {
    expect(read(CHART_JS)).toMatch(/hasAttribute\(\s*["']interactive["']\s*\)/);
  });
});

describe("the pages", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const page = (route) => {
    const found = site.byRoute.get(route);
    expect(found, route).toBeTruthy();
    return found;
  };
  const chart = () => page("/docs/catalog/chart/");
  const column = () => page("/docs/catalog/column-chart/");
  const section = (p, id) => p.body.split(`<h3 id="${id}">`)[1].split(/<h3 |<p class="docs-view__xref">/)[0];
  const textOf = (html) => decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

  it("the chart page has a live interactive line chart, with a header's worth of days and series, and the words of the Show table button", () => {
    const live = chart().body.split('<h2 id="known-issues">')[0];
    const demos = [...live.matchAll(/<luz-chart\b([^>]*\binteractive\b[^>]*)>([\s\S]*?)<\/luz-chart>/g)];
    expect(demos, "a <luz-chart interactive> in the example").toHaveLength(1);
    const [, attributes, inner] = demos[0];
    expect(attributes).toMatch(/type="line"/);
    expect(attributes).toMatch(/data-luz-label-table="[^"\s][^"]*"/);
    expect(attributes).toMatch(/data-luz-label-chart="[^"\s][^"]*"/);
    expect(inner).toMatch(/<caption/);
    expect([...inner.matchAll(/<th scope="col">/g)].length, "a head cell for the days and at least two series").toBeGreaterThanOrEqual(3);
    expect([...inner.matchAll(/<th scope="row">/g)].length, "many days").toBeGreaterThanOrEqual(14);
    expect(inner).toMatch(/<data value="-?[\d.]+">/);
  });

  it("the column chart page has a live interactive column chart: a table with no class, a row per day and a column per series", () => {
    const live = column().body.split('<h2 id="known-issues">')[0];
    const demos = [...live.matchAll(/<luz-chart\b([^>]*\binteractive\b[^>]*)>([\s\S]*?)<\/luz-chart>/g)];
    expect(demos, "a <luz-chart interactive> in the example").toHaveLength(1);
    const [, attributes, inner] = demos[0];
    expect(attributes).toMatch(/type="column"/);
    expect(inner).toMatch(/<caption/);
    expect(inner, "the table has no class: the script gives it one").toMatch(/<table>/);
    expect(inner).not.toMatch(/luz-column-chart/);
    expect([...inner.matchAll(/<th scope="col">/g)].length).toBeGreaterThanOrEqual(3);
    expect([...inner.matchAll(/<th scope="row">/g)].length).toBeGreaterThanOrEqual(14);
    expect(inner, "a figure in each cell and its share of the scale").toMatch(/<td style="--v: [.\d]+"><data value="\d+">\d+<\/data><\/td>/);
  });

  it("the example of several series and its snippet carry the roles of a table: the rows are laid out as boxes", () => {
    const body = column().body;
    const roles = (html) => {
      const root = parse(html);
      const [table] = findAll(root, (n) => n.name === "table" && /\bluz-column-chart\b/.test(n.attrs.get("class") ?? "") && findAll(n, (c) => c.name === "th" && c.attrs.get("scope") === "row").length > 0);
      expect(table, "a table.luz-column-chart with a th scope=row").toBeTruthy();
      const all = (name) => findAll(table, (n) => n.name === name);
      return {
        table: table.attrs.get("role"),
        groups: [...all("thead"), ...all("tbody")].map((n) => n.attrs.get("role")),
        rows: all("tr").map((n) => n.attrs.get("role")),
        heads: all("th").map((n) => [n.attrs.get("scope"), n.attrs.get("role")]),
        cells: all("td").map((n) => n.attrs.get("role")),
      };
    };
    const live = body.split('<h2 id="known-issues">')[0];
    const example = live.slice(live.indexOf('<h3 id="example-several">'), live.indexOf('<h3 id="example-interactive">'));
    const snippet = decodeEntities(/<code id="code-column-chart-several">([\s\S]*?)<\/code>/.exec(body)?.[1] ?? "");
    expect(snippet, "a snippet of several series").toContain("luz-column-chart");
    for (const [where, html] of [["the example", example.slice(example.indexOf("<table"), example.indexOf("</table>") + 8)], ["the snippet", snippet]]) {
      const found = roles(html);
      expect(found.table, `${where}: the table`).toBe("table");
      expect(new Set(found.groups), `${where}: the row groups`).toEqual(new Set(["rowgroup"]));
      expect(new Set(found.rows), `${where}: the rows`).toEqual(new Set(["row"]));
      expect(found.heads.filter(([scope]) => scope === "col").map(([, role]) => role), `${where}: the head cells`).not.toContain(null);
      for (const [scope, role] of found.heads) expect(role, `${where}: a th scope=${scope}`).toBe(scope === "row" ? "rowheader" : "columnheader");
      expect(new Set(found.cells), `${where}: the cells`).toEqual(new Set(["cell"]));
    }
  });

  for (const [name, get] of [["chart", chart], ["column chart", column]]) {
    it(`the ${name} page's Keyboard and ARIA says what the arrows do when the focus is in a row, that an off series keeps its cells, and what Escape does`, () => {
      const text = textOf(section(get(), "keyboard"));
      expect(text, "arrow keys, when the focus is in a row of the table").toMatch(/arrow keys?/i);
      expect(text).toMatch(/\brow/i);
      expect(text, "Home and End").toMatch(/Home/);
      expect(text).toMatch(/\bEnd\b/);
      expect(text, "a series turned off").toMatch(/\boff\b/);
      expect(text, "an off series keeps its cells, so a reader still has every figure").toMatch(/\bkeeps? (?:its|their) cells|\bcells (?:stay|remain|are kept)|(?:stay|remain)s? in the table/i);
      expect(text, "Escape puts the readout away").toMatch(/Escape[^.]*(?:away|hides?|dismiss)/i);
      expect(text, "the buttons are toggle buttons").toMatch(/aria-pressed/);
      expect(text, "the row is named by its cells").toMatch(/Apr 1, Desktop 252, Mobile 148/);
    });

    it(`the ${name} page says the total of a series is a sum, and for what that suits`, () => {
      const text = textOf(get().body);
      expect(text).toMatch(/the total (?:in its header )?is a sum|total of a series is a sum|total is a sum/i);
      expect(text, "it does not suit rates, shares or averages").toMatch(/rates, shares or averages/i);
    });
  }

  it("the column chart page says to link chart.css and the loader for the interactive chart, and that the bar and the gap are its knobs", () => {
    const body = column().body;
    expect(body).toContain("components/chart.css");
    expect(body).toContain("catalog.js");
    expect(body).toContain("--luz-column-chart-bar");
    expect(body).toContain("--luz-column-chart-gap");
  });

  it("the column chart page puts the name under the column, as an axis: it says so where it says how the figure sits", () => {
    expect(textOf(column().body)).toMatch(/the figure, its column, then the day|name below it|name below the column/i);
    expect(textOf(column().body)).not.toMatch(/the day, then its figure, then the column/);
  });
});

describe("the review record", () => {
  const open = () => read("dev/BROWSER-REVIEWS.md").split(/^## Closed/m)[0];

  it("has an Open row for the column chart, for both browsers: its sheets, its script and its page, and what to look at", () => {
    expect(existsSync(join(repo, "dev/BROWSER-REVIEWS.md"))).toBe(true);
    const row = open().split("\n").find((line) => line.startsWith("|") && line.includes("Column chart") && line.includes("column-chart.css"));
    expect(row, "a row of the column chart in the Open section").toBeTruthy();
    const cells = row.split("|").map((c) => c.trim());
    for (const file of ["column-chart.css", "chart.css", "chart.js", "column-chart.html"]) expect(cells[2], file).toContain(file);
    expect(cells[3], "what to look at").toMatch(/table-footer-group/);
    expect(cells[3]).toMatch(/forced colors/);
    expect(cells[4]).toBe("Safari, Firefox");
  });

  it("the row of <luz-chart> says it now has `interactive` on a line", () => {
    const row = open().split("\n").find((line) => line.startsWith("|") && line.includes("<luz-chart>") && line.includes("packages/catalog/src/chart.js") && !line.includes("Column chart"));
    expect(row).toBeTruthy();
    expect(row).toMatch(/interactive/);
  });
});
