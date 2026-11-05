/**
 * "On this page" of a page of controls (`parts: controls`, renderToc in scripts/docs-site/site.js).
 *
 * The Form fields page has many h3 (a control each, and a family's closing notes), so its rail lists only what a reader
 * jumps to: the families (h2), their controls (h3) and "Known issues" last. It leaves out the notes of a family (the h3
 * `<family>-contrast` and `<family>-tokens`) and the sections after "Known issues" (How form fields work, To migrate).
 * Its nav carries `docs-rail-controls`, the hook of the fold of tests/docs-controls.spec.js. A page with fewer than two
 * families (a translation not moved to the structure yet) keeps the whole list, as every other page does.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { renderToc } from "../scripts/docs-site/site.js";
import { buildReal } from "./helpers/debug-page.js";
import { findAll, parse, query, textOf } from "./helpers/html-dom.js";

const page = (parts = "controls") => ({ file: "x.html", meta: { toc: "h2,h3", parts } });
const h = (level, id, text = id) => `<h${level} id="${id}">${text}</h${level}><p>Text.</p>\n`;
const FAMILIES =
  h(2, "fam-a") + h(3, "a1") + h(3, "a2") + h(3, "fam-a-contrast") + h(3, "fam-a-tokens") +
  h(2, "fam-b") + h(3, "b1") + h(3, "fam-b-contrast") + h(3, "fam-b-tokens");
const TAIL = h(2, "known-issues") + h(2, "how-it-works") + h(2, "to-migrate") + h(2, "example") + h(3, "markup");

/** The links of a rail, as [href, text], and its tree. */
function links(html) {
  const tree = parse(html, "rail");
  return { tree, list: findAll(tree, (n) => n.name === "a").map((a) => [a.attrs.get("href"), textOf(a)]) };
}

describe("the rail of a page of controls", () => {
  it("lists the families, their controls and Known issues last, and nothing else", () => {
    const { list } = links(renderToc(page(), FAMILIES + TAIL));
    expect(list.map(([href]) => href)).toEqual(["#fam-a", "#a1", "#a2", "#fam-b", "#b1", "#known-issues"]);
  });

  it("nests the controls under their family, in the markup of every rail", () => {
    const { tree } = links(renderToc(page(), FAMILIES + TAIL));
    const top = query(tree, "ul.luz-page-rail__list").children.filter((n) => n.name === "li");
    expect(top.map((li) => li.children[0].attrs.get("href"))).toEqual(["#fam-a", "#fam-b", "#known-issues"]);
    const sub = (li) => findAll(li, (n) => n.name === "ul" && n.attrs.get("class") === "luz-page-rail__sub")[0];
    expect(sub(top[0]).children.map((li) => li.children[0].attrs.get("href"))).toEqual(["#a1", "#a2"]);
    expect(sub(top[1]).children.map((li) => li.children[0].attrs.get("href"))).toEqual(["#b1"]);
    expect(sub(top[2])).toBeUndefined();
  });

  it("omits an id that ends in -contrast or -tokens under a family, whatever its family", () => {
    const html = h(2, "fam-a") + h(3, "a1") + h(3, "fam-a-contrast") + h(2, "fam-b") + h(3, "b1") + h(3, "other-tokens") + TAIL;
    expect(links(renderToc(page(), html)).list.map(([href]) => href)).toEqual(["#fam-a", "#a1", "#fam-b", "#b1", "#known-issues"]);
  });

  it("has the class docs-rail-controls on its nav, and only a page of controls has it", () => {
    const own = renderToc(page(), FAMILIES + TAIL);
    expect(query(parse(own, "rail"), "nav").attrs.get("class")).toContain("docs-rail-controls");
    expect(query(parse(own, "rail"), "nav").attrs.get("class")).toContain("luz-page-rail__onpage");
    const plain = renderToc(page(""), FAMILIES + TAIL);
    expect(query(parse(plain, "rail"), "nav").attrs.get("class")).not.toContain("docs-rail-controls");
  });

  it("keeps the whole list of a page with fewer than two families, and no class", () => {
    const html = h(2, "only") + h(3, "o1") + h(3, "only-contrast") + TAIL;
    const rail = renderToc(page(), html);
    const { list, tree } = links(rail);
    expect(query(tree, "nav").attrs.get("class")).not.toContain("docs-rail-controls");
    expect(list.map(([href]) => href)).toEqual(["#only", "#o1", "#only-contrast", "#known-issues", "#how-it-works", "#to-migrate", "#example", "#markup"]);
  });

  it("does not change a page of tabs: all its h2 and h3", () => {
    const html = h(2, "a") + h(3, "a-contrast") + h(2, "known-issues") + h(2, "z") + h(2, "to-migrate");
    expect(links(renderToc(page(""), html)).list.map(([href]) => href)).toEqual(["#a", "#a-contrast", "#known-issues", "#z", "#to-migrate"]);
  });
});

describe("the rail of the real Form fields page", () => {
  // buildSite() renders every page in every language
  beforeAll(() => {
    buildReal();
  }, 120_000);

  it("lists the families, their controls and Known issues last, with no note of a family and no later section", () => {
    const html = buildReal().rendered.get("/docs/components/form/");
    const rail = query(parse(html, "form"), "nav.luz-page-rail__onpage");
    expect(rail.attrs.get("class")).toContain("docs-rail-controls");
    const hrefs = findAll(rail, (n) => n.name === "a").map((a) => a.attrs.get("href"));
    expect(hrefs.at(-1)).toBe("#known-issues");
    expect(hrefs.slice(0, 2)).toEqual(["#inputs", "#text"]);
    for (const href of hrefs) {
      expect(href, href).not.toMatch(/-(?:contrast|tokens)$/);
      expect(["#how-it-works", "#to-migrate", "#example", "#code", "#design"], href).not.toContain(href);
    }
    expect(hrefs).toEqual(expect.arrayContaining(["#inputs", "#text", "#email", "#choice", "#checkbox", "#select", "#known-issues"]));
  });

  it("is the whole list on the page in Spanish while it is not moved to the structure", () => {
    const html = buildReal().rendered.get("/es/docs/components/form/");
    const rail = query(parse(html, "form"), "nav.luz-page-rail__onpage");
    expect(rail, "a rail").toBeTruthy();
    expect(rail.attrs.get("class")).not.toContain("docs-rail-controls");
  });
});
