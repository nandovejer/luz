/**
 * The second example of the bar list, "In cells" (`<h3 id="example-cells">`, Spanish "En celdas"): the bar list in the form the
 * home page gives it for the size of the packages, with the meter cut into cells, a bold figure and a caption that carries a bold
 * total. What these tests pin (the look of the cells is tests/bar-list.spec.js; the page as a whole is tests/bar-list.test.js):
 *
 *   - its place: an h3 of the Example section, right after the first example and before "Known issues", and "On this page" lists it;
 *   - the live stage: a figure of the cells variant, a labelled list of rows (name, figure in a strong, hidden meter), a muted
 *     caption with a bold total, and the meters add up to the total the caption shows;
 *   - the words: the data is made up and the reader writes the real figures; the variants table and "When to use" say what the
 *     cells are for;
 *   - the snippet "Copy the markup": its own id, a copy button that points at it, and the same classes as the stage;
 *   - the home: the stage has the shape of the home's chart of weights (the same elements and classes), so it is the pattern the
 *     home uses and not a look-alike;
 *   - the Spanish page: the same h3 in Spanish, and the demo and the code stay English, byte for byte;
 *   - the generated example document (/examples/catalog/bar-list.html): two sections, every li in a list, the sheet linked.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { buildReal, site } from "./helpers/debug-page.js";
import { classesOf, descendants, find, findAll, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf-8");

const ROUTE = "/docs/catalog/bar-list/";
const ES_ROUTE = "/es/docs/catalog/bar-list/";
const ES_FILE = "apps/docs/i18n/es/pages/catalog/bar-list.html";
const ID = "example-cells";
const COPY_ID = "code-bar-list-cells";
const VARIANT = "luz-bar-list luz-bar-list--cells";

beforeAll(() => {
  buildReal();
}, 120_000);

const english = () => {
  const page = site.byRoute.get(ROUTE);
  expect(page, `${ROUTE} is a page`).toBeTruthy();
  return page.body;
};

/** The "In cells" part of a page: from its h3 to the h2 "Known issues", as a fragment. */
function cellsPart(html) {
  const start = html.indexOf(`<h3 id="${ID}">`);
  expect(start, `the page has <h3 id="${ID}">`).toBeGreaterThanOrEqual(0);
  const end = html.indexOf('<h2 id="known-issues">', start);
  expect(end, "and the h2 Known issues follows it").toBeGreaterThan(start);
  return html.slice(start, end);
}

/** The figure of the stage, as the text of the markup. */
const figureOf = (part) => part.match(/<figure class="luz-bar-list luz-bar-list--cells">[\s\S]*?<\/figure>/)?.[0] ?? "";

/** The code of a snippet by the id of its <code>, decoded. */
const codeOf = (html, id) => {
  const raw = html.match(new RegExp(`<code id="${id}">([\\s\\S]*?)</code>`))?.[1];
  expect(raw, `a <code id="${id}">`).toBeTruthy();
  return decodeEntities(raw);
};

const numberOf = (text) => Number(text.replace(/[^0-9.]/g, ""));

/** The element names and classes of a node and of everything under it, in order: its shape. */
const shapeOf = (node) => [node, ...descendants(node)].map((n) => `${n.name}${classesOf(n).map((c) => `.${c}`).join("")}`);

describe("the page of the bar list has a second example, In cells", () => {
  it("is an h3 of the Example section, after the first example and before Known issues, once", () => {
    const body = english();
    expect(body.match(new RegExp(`id="${ID}"`, "g")), "the id is used once").toHaveLength(1);
    const example = body.indexOf('<h2 id="example">');
    const first = body.indexOf("docs-example", example);
    const cells = body.indexOf(`<h3 id="${ID}">`);
    const issues = body.indexOf('<h2 id="known-issues">');
    expect(example, "the Example section").toBeGreaterThanOrEqual(0);
    expect(first, "a first example is in it").toBeGreaterThan(example);
    expect(cells, "In cells comes after the first example").toBeGreaterThan(first);
    expect(cells, "and before Known issues").toBeLessThan(issues);
    expect(body.slice(first, cells), "no other heading between them").not.toMatch(/<h[1-6]\b/);
    expect(body).toMatch(new RegExp(`<h3 id="${ID}">In cells</h3>`));
  });

  it("is listed in On this page, in English and in Spanish", () => {
    for (const [route, title] of [[ROUTE, "In cells"], [ES_ROUTE, "En celdas"]]) {
      const tree = parse(buildReal().rendered.get(route), route);
      const link = find(tree, (n) => n.name === "a" && n.attrs.get("href") === `#${ID}`);
      expect(link, `${route} has a link to #${ID}`).toBeTruthy();
      expect(textOf(link)).toBe(title);
    }
  });

  it("has a live stage in a specimen: a figure of the cells variant, a labelled list, and a muted caption", () => {
    const part = parse(cellsPart(english()), ROUTE);
    const specimen = query(part, "div.docs-example");
    expect(specimen?.attrs.has("data-docs-specimen"), "the demo is a specimen").toBe(true);
    const figures = queryAll(part, "figure");
    expect(figures).toHaveLength(1);
    expect(classesOf(figures[0])).toEqual(["luz-bar-list", "luz-bar-list--cells"]);
    const lists = queryAll(figures[0], "ul.luz-bar-list__rows");
    expect(lists).toHaveLength(1);
    expect(lists[0].attrs.get("aria-label")?.trim(), "the list has a name").toBeTruthy();
    const caption = query(figures[0], "figcaption.u-text-muted");
    expect(caption, "a muted caption").toBeTruthy();
    expect(caption.parent, "the caption is a child of the figure").toBe(figures[0]);
    expect(textOf(query(caption, "strong")), "its bold total").toMatch(/\d/);
  });

  it("has rows of a name, a figure in a strong and a hidden meter, and the meters add up to the total in the caption", () => {
    const figure = query(parse(cellsPart(english()), ROUTE), "figure");
    const rows = queryAll(figure, "li.luz-bar-list__row");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const values = [];
    for (const row of rows) {
      expect(row.parent.name, "a row is in the list").toBe("ul");
      expect(row.children.map((c) => `${c.name}.${classesOf(c).join(".")}`)).toEqual(["span.luz-bar-list__name", "span.luz-bar-list__figure", "meter.luz-bar-list__meter"]);
      const [name, fig, meter] = row.children;
      expect(textOf(name)).not.toBe("");
      const strong = query(fig, "strong");
      expect(strong, "the figure is in a strong").toBeTruthy();
      expect(meter.attrs.get("aria-hidden"), "the meter is a picture of the figure").toBe("true");
      expect(meter.attrs.get("min")).toBe("0");
      expect(numberOf(textOf(meter)), "the text inside the meter says the figure").toBe(numberOf(textOf(strong)));
      expect(Number(meter.attrs.get("value")), "the meter shows the figure").toBe(numberOf(textOf(strong)));
      values.push(Number(meter.attrs.get("value")));
    }
    expect(new Set(rows.map((r) => r.children[2].attrs.get("max"))).size, "one scale for every row").toBe(1);
    expect(Number(rows[0].children[2].attrs.get("max")), "the scale is the largest value").toBe(Math.max(...values));
    const total = numberOf(textOf(query(query(figure, "figcaption.u-text-muted"), "strong")));
    expect(values.reduce((a, b) => a + b, 0), "the total of the caption is the sum of the rows").toBe(total);
    expect(total).toBe(84);
  });

  it("says that the names, sizes and note are made up and the reader writes the real ones", () => {
    const part = cellsPart(english());
    const intro = textOf(parse(part, ROUTE).children.find((n) => n.name === "p"));
    expect(intro).toMatch(/made up/i);
    expect(intro).toMatch(/yours to write/i);
    expect(figureOf(part), "and the demo itself says sample data").toMatch(/sample data/i);
  });

  it("has its snippet: a docs-snippet with its own code id and a copy button that points at it, and no id twice", () => {
    const body = english();
    const tree = parse(body, ROUTE);
    expect(body.match(new RegExp(`id="${COPY_ID}"`, "g")), "the code id is used once").toHaveLength(1);
    const button = find(tree, (n) => n.name === "button" && n.attrs.get("data-copy-from") === COPY_ID);
    expect(button, "a copy button points at the code").toBeTruthy();
    expect(classesOf(button)).toContain("luz-copy-btn");
    expect(button.attrs.get("type")).toBe("button");
    expect(button.attrs.get("aria-label")?.trim(), "the button has a name").toBeTruthy();
    expect(classesOf(button.parent.parent), "in a docs-snippet").toContain("docs-snippet");
    const code = find(tree, (n) => n.name === "code" && n.attrs.get("id") === COPY_ID);
    expect(code.parent.name).toBe("pre");
    expect(classesOf(code.parent)).toContain("luz-code-block");
    expect(classesOf(code.parent.parent), "the snippet holds the code").toContain("docs-snippet");
    const copied = findAll(tree, (n) => n.attrs.has("data-copy-from")).map((n) => n.attrs.get("data-copy-from"));
    const ids = findAll(tree, (n) => n.attrs.has("id")).map((n) => n.attrs.get("id"));
    for (const target of copied) expect(ids.filter((id) => id === target), `one element has the id ${target}`).toHaveLength(1);
  });

  it("copies the variant of the stage: the code is a figure of the cells variant with the same classes", () => {
    const body = english();
    const code = codeOf(body, COPY_ID);
    expect(code).toContain(`<figure class="${VARIANT}">`);
    expect(code).toContain("<figcaption");
    const classesIn = (markup) => new Set([...markup.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    const shown = classesIn(figureOf(cellsPart(body)));
    expect(classesIn(code), "the code uses the classes of the stage, no more and no fewer").toEqual(shown);
    expect(code.match(/<meter\b[^>]*aria-hidden="true"/g)?.length, "its meters are hidden too").toBe(code.match(/<meter\b/g).length);
    // the first snippet is the plain list: it must not be the one that was changed
    const plain = body.match(/<code id="(?!code-bar-list-cells)[^"]*">[\s\S]*?<\/code>/)?.[0] ?? "";
    expect(decodeEntities(plain)).not.toContain("--cells");
  });

  it("says in the variants table that the cells are what the home uses for sizes, and in When to use what they suit", () => {
    const tree = parse(english(), ROUTE);
    const row = findAll(tree, (n) => n.name === "tr").find((tr) => textOf(tr).startsWith("luz-bar-list--cells"));
    expect(row, "a row for the variant").toBeTruthy();
    expect(textOf(row)).toMatch(/home page/i);
    expect(textOf(row)).toMatch(/sizes/i);
    const when = english().split('<h3 id="when">')[1].split('<h3 id="when-not">')[0];
    expect(textOf(parse(when, ROUTE).children.find((n) => n.name === "p")), "the sentence about cells").toMatch(/cells\b.*\bfew short comparisons/i);
  });
});

describe("the second example is the home's pattern", () => {
  it("has the elements and the classes of the home's chart of weights, row by row and in the caption", () => {
    const home = parse(buildReal().rendered.get("/"), "/");
    const chart = findAll(home, (n) => n.name === "figure" && classesOf(n).includes("luz-bar-list--cells"))[0];
    expect(chart, "the home has a chart in cells").toBeTruthy();
    const docs = query(parse(cellsPart(english()), ROUTE), "figure");
    expect(classesOf(docs)).toEqual(classesOf(chart));
    const homeRow = query(chart, "li.luz-bar-list__row");
    const docsRow = query(docs, "li.luz-bar-list__row");
    expect(shapeOf(docsRow)).toEqual(shapeOf(homeRow));
    expect(shapeOf(query(docs, "figcaption"))).toEqual(shapeOf(query(chart, "figcaption")));
    expect(shapeOf(query(docs, "ul"))[0]).toEqual(shapeOf(query(chart, "ul"))[0]);
    expect(new Set(shapeOf(docs))).toEqual(new Set(shapeOf(chart)));
  });
});

describe("the Spanish page", () => {
  it("has the h3 example-cells, En celdas, after the first example and before the known issues", () => {
    const es = read(ES_FILE);
    const first = es.indexOf("docs-example");
    const cells = es.indexOf(`<h3 id="${ID}">`);
    expect(cells, "the Spanish page has the h3").toBeGreaterThan(first);
    expect(cells).toBeLessThan(es.indexOf('<h2 id="known-issues">'));
    expect(es).toContain(`<h3 id="${ID}">En celdas</h3>`);
    const intro = textOf(parse(cellsPart(es), ES_ROUTE).children.find((n) => n.name === "p"));
    expect(intro, "it says the data is made up and the reader writes the real figures").toMatch(/inventados/i);
    expect(intro).toMatch(/escribes tú/i);
  });

  it("says the same things about the variant and When to use, in Spanish", () => {
    const es = read(ES_FILE);
    const row = findAll(parse(es, ES_ROUTE), (n) => n.name === "tr").find((tr) => textOf(tr).startsWith("luz-bar-list--cells"));
    expect(textOf(row)).toMatch(/página de inicio/i);
    const when = es.split('<h3 id="when">')[1].split('<h3 id="when-not">')[0];
    expect(textOf(parse(when, ES_ROUTE).children.find((n) => n.name === "p"))).toMatch(/celdas\b.*\bpocas comparaciones breves/i);
  });

  it("keeps the demo and the code in English, as the English page has them, and marks the demo lang=en", () => {
    const en = english();
    const es = read(ES_FILE);
    expect(figureOf(cellsPart(es)), "the demo is the English one, byte for byte").toBe(figureOf(cellsPart(en)));
    expect(codeOf(es, COPY_ID), "the code is the English one").toBe(codeOf(en, COPY_ID));
    expect(es).toContain(`data-copy-from="${COPY_ID}"`);
    const rendered = parse(buildReal().rendered.get(ES_ROUTE), ES_ROUTE);
    const figure = findAll(rendered, (n) => n.name === "figure" && classesOf(n).includes("luz-bar-list--cells"))[0];
    expect(figure, "the rendered Spanish page has the demo").toBeTruthy();
    let up = figure;
    while (up && up.attrs.get("lang") !== "en" && up.name !== "#root") up = up.parent;
    expect(up.attrs.get("lang"), "the demo is lang=en inside the Spanish page").toBe("en");
  });
});

describe("the generated example document of the bar list", () => {
  it("has one section per markup block, the cells variant in the second, every li in a list, and the sheet linked once", async () => {
    const ai = await import(/* @vite-ignore */ join(root, "scripts/docs-site/ai.js"));
    const { PAGES_CSP } = await import(/* @vite-ignore */ join(root, "vite.config.js"));
    const versions = Object.fromEntries(["tokens", "core", "catalog"].map((name) => [name, JSON.parse(read(`packages/${name}/package.json`)).version]));
    const doc = ai.exampleDocuments(site, { csp: PAGES_CSP, versions }).find((e) => e.route === "/examples/catalog/bar-list.html");
    expect(doc, "the bar list has an example document").toBeTruthy();
    const tree = parse(doc.html, doc.route);

    const sections = queryAll(tree, "section");
    expect(sections, "a section for the plain list and one for the cells").toHaveLength(2);
    expect(sections.map((s) => textOf(query(s, "h2")))).toEqual(["Bar list markup", "Bar list in cells markup"]);
    expect(query(sections[0], "figure")?.attrs.get("class")).toBe("luz-bar-list");
    expect(query(sections[1], "figure")?.attrs.get("class")).toBe(VARIANT);
    for (const section of sections) expect(section.attrs.get("aria-labelledby")).toBe(query(section, "h2").attrs.get("id"));

    const all = [...descendants(tree)];
    for (const li of all.filter((n) => n.name === "li")) expect(["ul", "ol", "menu"], "an li is in a list").toContain(li.parent.name);
    for (const part of all.filter((n) => ["dt", "dd"].includes(n.name))) expect(part.parent.name, `a ${part.name} is in a dl`).toBe("dl");
    for (const part of all.filter((n) => n.name === "tr")) expect(["table", "thead", "tbody", "tfoot"]).toContain(part.parent.name);

    const ids = all.filter((n) => n.attrs.has("id")).map((n) => n.attrs.get("id"));
    expect(new Set(ids).size, "no id twice").toBe(ids.length);
    const links = all.filter((n) => n.name === "link").map((n) => n.attrs.get("href"));
    expect(links.filter((href) => href.endsWith("components/bar-list.min.css")), "the sheet of the bar list").toHaveLength(1);
  });
});
