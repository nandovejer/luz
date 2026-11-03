/**
 * The Dashboard page of the catalog gets a second example, "With data": four panels (a figure, a bar list, a line chart and a
 * stacked bar), each over a native list or table. What these tests pin (the look, the keyboard and the no-JS state are in
 * tests/dashboard-data.spec.js):
 *
 *   - the front matter key `loose`: optional (default empty), a list of core sheets outside luz.css, `;` apart, that a page uses
 *     without documenting them; `{{loose}}` in the head links them right after luz.css, on the page that names them and on no
 *     other, once each, in English and in Spanish;
 *   - the page: the example is real markup of four panels in the order figure, bar list, line chart, stacked bar; the sample
 *     data is told as made up in plain words (English and Spanish) and in the code snippet; the numbers add up (the rows of the
 *     bar list are the figure, the parts of the stacked bar are 100); the Spanish page is a translation of this body and the
 *     demo stays English;
 *   - the prompt for an app says that a data view draws a native table or list, and the other four prompts do not;
 *   - dev/DOCS-SITE.md documents the key and dev/BROWSER-REVIEWS.md has the row of the panels.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { assemblePrompt } from "../scripts/docs-site/prompts.js";
import { buildReal, site } from "./helpers/debug-page.js";
import { find, findAll, hasClass, matcher, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf-8");

// Rendering every page in every language takes seconds, more under load: once, before the tests that read it
beforeAll(() => {
  buildReal();
}, 120_000);

const ROUTE = "/docs/catalog/dashboard/";
const ES_ROUTE = "/es/docs/catalog/dashboard/";
const LOOSE = ["components/bar-list.css", "components/stacked-bar.css"];
const link = (file) => `/packages/core/dist/${file}`;
const rendered = () => buildReal().rendered;
const sheets = (html) => [...html.matchAll(/<link\b[^>]*rel="?stylesheet"?[^>]*>/g)].map((m) => m[0].match(/href="?([^" >]+)/)?.[1]);
const page = () => {
  const found = site.byRoute.get(ROUTE);
  expect(found, `${ROUTE} is a page`).toBeTruthy();
  return found;
};
const esSource = () => read("apps/docs/i18n/es/pages/catalog/dashboard.html");
/** The part of a page from the heading of the second example to the known issues: the intro and the specimen. */
const exampleOf = (html) => html.split('<h3 id="example-data">')[1]?.split('<h2 id="known-issues">')[0] ?? "";
/** The four panels of the example and the stage that holds them. */
const panelsOf = (html) => {
  const section = exampleOf(html);
  expect(section, "the page has the example With data").not.toBe("");
  const tree = parse(section, "dashboard.html");
  const stage = query(tree, "div.docs-demo__stage");
  const list = find(stage, (n) => n.name === "ul" && hasClass(n, "o-grid"));
  expect(list, "a ul.o-grid in the stage").toBeTruthy();
  return { tree, stage, list, panels: list.children.filter((n) => n.name === "li") };
};
const number = (text) => Number(text.replace(/[^\d.]/g, ""));

/* ---- The front matter key ---------------------------------------------------------------------------------------------- */

describe("the front matter key `loose`", () => {
  it("is the list of core sheets the Dashboard page uses without documenting them, and is optional (empty by default)", () => {
    expect(page().meta.loose.split(";").map((f) => f.trim())).toEqual(LOOSE);
    expect(page().meta.files, "the page still documents only its own sheet").toBe("components/dashboard.css");
    const others = [...site.byRoute.values()].filter((p) => p.route !== ROUTE);
    expect(others.length).toBeGreaterThan(100);
    for (const p of others) expect(p.meta.loose, p.route).toBe("");
  });

  it("is not a key of the Spanish page: the translation takes it from the English one", () => {
    expect(esSource()).not.toMatch(/^loose:/m);
  });

  it.each([ROUTE, ES_ROUTE])("%s links each sheet of it once, right after luz.css and before every catalog sheet", (route) => {
    const links = sheets(rendered().get(route));
    const at = links.indexOf(link("luz.css"));
    for (const [i, file] of LOOSE.entries()) {
      expect(links.filter((href) => href === link(file)), `${route}: ${file}`).toHaveLength(1);
      expect(links.indexOf(link(file)), `${route}: ${file} comes after luz.css, in the order of the key`).toBe(at + 1 + i);
    }
    expect(links.findIndex((href) => href.startsWith("/packages/catalog/")), route).toBeGreaterThan(at + LOOSE.length);
    // the sheets it does not name stay out
    for (const other of ["components/column-chart.css", "components/heat-map.css"]) expect(links, `${route}: ${other}`).not.toContain(link(other));
  });

  it("links a sheet it names on no other page of the docs, in any language", () => {
    const docs = [...rendered()].filter(([route]) => route.startsWith("/docs/") || route.startsWith("/es/docs/") || route.startsWith("/ar/docs/") || route === "/404.html");
    expect(docs.length, "the docs are rendered").toBeGreaterThan(100);
    for (const [route, html] of docs) {
      if (route === ROUTE || route === ES_ROUTE) continue;
      const own = [...(site.byRoute.get(route.replace(/^\/(?:es|ar)/, ""))?.meta.files ?? "").matchAll(/components\/[a-z0-9-]+\.css/g)].map((m) => m[0]);
      for (const file of LOOSE) if (!own.includes(file)) expect(sheets(html), `${route}: ${file}`).not.toContain(link(file));
    }
  });
});

/* ---- The page ----------------------------------------------------------------------------------------------------------- */

describe("the Dashboard page: the example With data", () => {
  it("comes after the first example and before the known issues, with its own heading", () => {
    const body = page().body;
    expect(body.indexOf('<h2 id="example">')).toBeGreaterThan(-1);
    expect(body.indexOf('<h3 id="example-data">')).toBeGreaterThan(body.indexOf('<h2 id="example">'));
    expect(body.indexOf('<h3 id="example-data">')).toBeLessThan(body.indexOf('<h2 id="known-issues">'));
    expect(textOf(find(parse(body, "dashboard.html"), (n) => n.attrs.get("id") === "example-data"))).toBe("With data");
    expect(exampleOf(body)).toContain("data-docs-specimen");
  });

  it("holds four panels, in the order a figure, a bar list, a line chart over its table, and a stacked bar", () => {
    const { panels } = panelsOf(page().body);
    expect(panels).toHaveLength(4);
    for (const li of panels) {
      expect(hasClass(li, "luz-card"), "core's card").toBe(true);
      expect(hasClass(li, "luz-dashboard__panel"), "a panel").toBe(true);
      expect(textOf(find(li, matcher("h3.luz-card__title"))), "a title").not.toBe("");
    }
    const piece = (li, selector) => find(li, matcher(selector));
    expect(piece(panels[0], "div.luz-stat"), "the first is a stat").toBeTruthy();
    expect(piece(panels[1], "figure.luz-bar-list"), "the second is a bar list").toBeTruthy();
    const chart = piece(panels[2], "luz-chart");
    expect(chart, "the third is a chart").toBeTruthy();
    expect(chart.attrs.get("type")).toBe("line");
    expect(find(chart, (n) => n.name === "table" && hasClass(n, "luz-table")), "over a native table").toBeTruthy();
    expect(find(chart, (n) => n.name === "caption"), "that has a caption").toBeTruthy();
    expect(piece(panels[3], "figure.luz-stacked-bar"), "the fourth is a stacked bar").toBeTruthy();
    expect(panels.map((li) => hasClass(li, "luz-dashboard__panel--wide")), "only the chart is wide").toEqual([false, false, true, false]);
  });

  it("names its figures and bars by their title: the bar list and the stacked bar are labelled by the panel's heading", () => {
    const { panels, tree } = panelsOf(page().body);
    for (const [i, selector] of [[1, "figure.luz-bar-list"], [3, "figure.luz-stacked-bar"]]) {
      const figure = find(panels[i], matcher(selector));
      const heading = find(panels[i], matcher("h3.luz-card__title"));
      expect(heading.attrs.get("id"), `panel ${i + 1}: the heading has an id`).toBeTruthy();
      expect(figure.attrs.get("aria-labelledby"), `panel ${i + 1}`).toBe(heading.attrs.get("id"));
    }
    const ids = findAll(tree, (n) => n.attrs.has("id")).map((n) => n.attrs.get("id"));
    expect(new Set(ids).size, "no id twice").toBe(ids.length);
  });

  it("adds up: the rows of the bar list are the figure of the stat, and every meter agrees with its row", () => {
    const { panels } = panelsOf(page().body);
    const total = number(textOf(find(panels[0], matcher("p.luz-stat__value"))));
    expect(total).toBeGreaterThan(0);
    const rows = queryAll(panels[1], "li.luz-bar-list__row");
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const figures = rows.map((row) => number(textOf(find(row, matcher("span.luz-bar-list__figure")))));
    expect(figures.reduce((sum, n) => sum + n, 0), "the rows make the figure").toBe(total);
    for (const [i, row] of rows.entries()) {
      const meter = find(row, (n) => n.name === "meter");
      expect(Number(meter.attrs.get("value")), `row ${i + 1}: the meter shows its figure`).toBe(figures[i]);
      expect(Number(meter.attrs.get("max")), `row ${i + 1}: out of the total`).toBe(total);
      expect(textOf(find(row, matcher("span.luz-bar-list__name"))), `row ${i + 1}: a name`).not.toBe("");
    }
  });

  it("adds up: the parts of the stacked bar are 100 and the legend names every part with its share", () => {
    const { panels } = panelsOf(page().body);
    const parts = queryAll(panels[3], "span.luz-stacked-bar__part").map((p) => Number(/--v:\s*([\d.]+)/.exec(p.attrs.get("style"))?.[1]));
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.every((v) => v > 0)).toBe(true);
    expect(parts.reduce((sum, v) => sum + v, 0), "the shares of a whole").toBe(100);
    const items = queryAll(panels[3], "li.luz-stacked-bar__item");
    expect(items, "an item of the legend for each part").toHaveLength(parts.length);
    const names = items.map((li) => textOf(find(li, matcher("span.luz-stacked-bar__name"))));
    expect(names.every(Boolean), "every part has a name").toBe(true);
    expect(new Set(names).size, "and the names differ").toBe(names.length);
    expect(items.map((li) => number(textOf(find(li, matcher("span.luz-stacked-bar__figure"))))), "the legend says each share").toEqual(parts);
  });

  it("gives the line chart one row of the table for each point, and each <data> says the number it shows", () => {
    const { panels } = panelsOf(page().body);
    const rows = findAll(panels[2], (n) => n.name === "tr").filter((tr) => find(tr, (n) => n.name === "data"));
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const tr of rows) {
      const data = find(tr, (n) => n.name === "data");
      expect(number(textOf(data)), textOf(tr)).toBe(Number(data.attrs.get("value")));
    }
  });
});

describe("the Dashboard page: the data is told as made up", () => {
  it("says in the English page that the titles, the panels and the figures are made up for the example", () => {
    const intro = textOf(find(parse(exampleOf(page().body), "dashboard.html"), (n) => n.name === "p"));
    expect(intro).toMatch(/made up/);
    expect(intro).toMatch(/figures/);
  });

  it("says it in the Spanish page, in Spanish", () => {
    const intro = textOf(find(parse(exampleOf(esSource()), "dashboard.html"), (n) => n.name === "p"));
    expect(intro).toMatch(/inventad/);
    expect(intro).toMatch(/cifras/);
  });

  it("marks the title of the specimen as sample data, so a copy of the picture says it too", () => {
    const { stage } = panelsOf(page().body);
    expect(textOf(find(stage, matcher("p.luz-dashboard__title")))).toMatch(/sample/i);
  });

  it("opens the code of the snippet with a comment that says the figures are samples, in both languages", () => {
    for (const source of [page().body, esSource()]) {
      const code = /<code id="code-dashboard-data">([\s\S]*?)<\/code>/.exec(source)?.[1] ?? "";
      expect(code, "a snippet of the data panels").not.toBe("");
      expect(code.trimStart().startsWith("&lt;!-- Sample figures"), "the first line of the markup").toBe(true);
    }
  });

  it("has a second Copy-the-markup snippet that holds the four pieces, and a copy button that points at it", () => {
    const code = /<code id="code-dashboard-data">([\s\S]*?)<\/code>/.exec(page().body)[1];
    for (const piece of ["luz-stat", "luz-bar-list", "&lt;luz-chart", "luz-stacked-bar"]) expect(code, piece).toContain(piece);
    expect(code.match(/luz-dashboard__panel&quot;/g)?.length ?? 0, "a panel for each piece").toBeGreaterThanOrEqual(3);
    expect(page().body).toContain('data-copy-from="code-dashboard-data"');
  });

  it("says in the rules that the data is the reader's, not LUZ's", () => {
    const text = page().body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toMatch(/The data is yours/);
    expect(text).toMatch(/does not fetch, count or invent figures/);
  });
});

describe("the Spanish Dashboard page: a translation of this body, with the demo in English", () => {
  it("has the source hash of the English body, is pending review, and carries no key of the structure", () => {
    const es = esSource();
    expect(es.match(/^source: ([0-9a-f]{12})$/m)?.[1]).toBe(sourceHash(page().body));
    expect(es).toMatch(/^reviewed: false$/m);
    expect(es).not.toMatch(/^(?:area|group|files|loose|order|fits-kinds):/m);
  });

  it("has the example With data, with the heading and the introduction in Spanish and the same ids as the English page", () => {
    const heading = find(parse(esSource(), "dashboard.html"), (n) => n.attrs.get("id") === "example-data");
    expect(textOf(heading)).toBe("Con datos");
    const ids = (html) => findAll(parse(html, "dashboard.html"), (n) => n.attrs.has("id")).map((n) => n.attrs.get("id")).sort();
    expect(ids(esSource())).toEqual(ids(page().body));
  });

  it("keeps the demo and the code of the snippet in English, and the rendered specimen says lang=en", () => {
    const en = panelsOf(page().body);
    const sp = panelsOf(esSource());
    expect(textOf(sp.stage)).toBe(textOf(en.stage));
    const code = (source) => /<code id="code-dashboard-data">([\s\S]*?)<\/code>/.exec(source)?.[1];
    expect(code(esSource())).toBe(code(page().body));
    const html = rendered().get(ES_ROUTE);
    const specimens = [...html.matchAll(/<div\b[^>]*data-docs-specimen[^>]*>/g)].map((m) => m[0]);
    expect(specimens.length).toBeGreaterThanOrEqual(2);
    for (const tag of specimens) expect(tag, "a demo is English inside the translated page").toContain('lang="en"');
  });
});

/* ---- The prompt for an app --------------------------------------------------------------------------------------------- */

describe("the prompts for AI: data views", () => {
  const SENTENCE = "Data views (bar list, column chart, stacked bar, heat map, line chart) each draw a native table or list that stays in the page; the author supplies the data.";
  const prompt = (id) => assemblePrompt(id, { root });

  it("the prompt for an app says that a data view draws a native table or list in the page and that the author supplies the data", () => {
    const text = prompt("app").replace(/\s+/g, " ");
    expect(text).toContain(SENTENCE);
    expect(text.indexOf("Numbers are cards;"), "in the paragraph of the skeleton, after the cards").toBeLessThan(text.indexOf(SENTENCE));
  });

  it.each(["start", "landing", "blog", "docs"])("the prompt %s does not carry it", (id) => {
    expect(prompt(id)).not.toMatch(/Data views/);
    expect(prompt(id)).not.toContain("the author supplies the data");
  });

  it("the sentence is written in words: no class, no element and no file typed in it, and it is in the preset of app only", () => {
    expect(SENTENCE).not.toMatch(/[`<>]|luz-|\.css|\.js/);
    for (const preset of ["landing", "blog", "docs"]) expect(read(`apps/site/prompts/presets/${preset}.md`), preset).not.toContain("Data views");
    expect(read("apps/site/prompts/body.md")).not.toContain("Data views");
    expect(read("apps/site/prompts/presets/app.md").match(/Data views/g)).toHaveLength(1);
  });
});

/* ---- The contributor guides --------------------------------------------------------------------------------------------- */

describe("dev/DOCS-SITE.md and dev/BROWSER-REVIEWS.md", () => {
  it("DOCS-SITE.md documents `loose`: an optional front matter key of core sheets outside luz.css, `;` apart, linked after luz.css", () => {
    const item = read("dev/DOCS-SITE.md").split("\n").find((line) => line.startsWith("- `loose`"));
    expect(item, "a bullet that starts with `loose`").toBeTruthy();
    expect(item).toMatch(/optional/);
    expect(item).toMatch(/front matter/);
    expect(item).toMatch(/luz\.css/);
    expect(item).toContain("`files`");
    expect(item).toContain("{{loose}}");
  });

  it("BROWSER-REVIEWS.md has an Open row for the data panels of the Dashboard: its files, what to look at and both browsers", () => {
    const open = read("dev/BROWSER-REVIEWS.md").split(/^## Closed/m)[0];
    const row = open.split("\n").find((line) => line.startsWith("|") && line.includes("apps/docs/pages/catalog/dashboard.html"));
    expect(row, "a row of the Dashboard page in the Open section").toBeTruthy();
    const cells = row.split("|").map((c) => c.trim());
    expect(cells[1], "the scope").toMatch(/Dashboard/);
    expect(cells[2]).toContain("site.js");
    expect(cells[2]).toContain("loose");
    expect(cells[3], "what to look at").toMatch(/luz-chart/);
    expect(cells[4]).toMatch(/Safari/);
    expect(cells[4]).toMatch(/Firefox/);
  });
});
