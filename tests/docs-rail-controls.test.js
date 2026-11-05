/**
 * "On this page" of a page of controls (`parts: controls`, renderToc in scripts/docs-site/site.js).
 *
 * The pages of Form fields have many h2 (a control each, and the notes their controls share: the h2 `<family>-contrast` and
 * `<family>-tokens`), so their rail lists what a reader jumps to: the controls and "Known issues" last. It leaves out the
 * notes. The same ids on a page that is not a page of controls are headings like any other, and are listed.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { isFamilyNote, renderToc } from "../scripts/docs-site/site.js";
import { buildReal, site } from "./helpers/debug-page.js";
import { controlsPages, readControls } from "./helpers/docs-controls.js";
import { findAll, parse, query, textOf } from "./helpers/html-dom.js";

const page = (parts = "controls") => ({ file: "x.html", meta: { toc: "h2", parts } });
const h = (id, text = id) => `<h2 id="${id}">${text}</h2><p>Text.</p>\n`;
const CONTROLS = h("a") + h("b") + h("c") + `<div class="docs-family-notes">\n${h("fam-contrast")}${h("fam-tokens")}</div>\n` + h("known-issues");

/** The links of a rail, as [href, text]. */
const links = (html) => findAll(parse(html, "rail"), (n) => n.name === "a").map((a) => [a.attrs.get("href"), textOf(a)]);

describe("the rail of a page of controls", () => {
  it("lists the controls and Known issues last, and not the notes of the family", () => {
    expect(links(renderToc(page(), CONTROLS)).map(([href]) => href)).toEqual(["#a", "#b", "#c", "#known-issues"]);
  });

  it("omits an h2 whose id ends in -contrast or -tokens, whatever the family", () => {
    const html = h("a") + h("b") + h("fam-a-contrast") + h("other-tokens") + h("known-issues");
    expect(links(renderToc(page(), html)).map(([href]) => href)).toEqual(["#a", "#b", "#known-issues"]);
    expect(["x-contrast", "y-tokens", "inputs-tokens"].every(isFamilyNote)).toBe(true);
    expect(["contrast", "tokens", "a", "known-issues", "x-contrasts"].some(isFamilyNote)).toBe(false);
  });

  it("counts only the controls: under three h2 once the notes are out, there is no rail", () => {
    const html = h("a") + h("b") + h("fam-contrast") + h("fam-tokens");
    expect(renderToc(page(), html)).toBe("");
    expect(renderToc(page(), h("a") + h("b") + h("known-issues"))).not.toBe("");
  });

  it("is the same rail as any page's: one flat list, nothing folded, no class of its own", () => {
    const rail = renderToc(page(), CONTROLS);
    const nav = query(parse(rail, "rail"), "nav");
    expect(nav.attrs.get("class")).toBe("luz-page-rail__onpage");
    expect(findAll(nav, (n) => n.name === "ul")).toHaveLength(1);
  });

  it("does not change a page that is not a page of controls: the same ids are listed", () => {
    expect(links(renderToc(page(""), CONTROLS)).map(([href]) => href)).toEqual(["#a", "#b", "#c", "#fam-contrast", "#fam-tokens", "#known-issues"]);
  });
});

describe("the rail of the real pages of Form fields", () => {
  // buildSite() renders every page in every language
  beforeAll(() => {
    buildReal();
  }, 120_000);

  it("lists the controls of each page and Known issues last, never the notes", () => {
    for (const p of controlsPages(site)) {
      const read = readControls(p);
      const rail = query(parse(buildReal().rendered.get(p.route), p.route), "nav.luz-page-rail__onpage");
      expect(rail, `${p.route} has a rail`).toBeTruthy();
      const hrefs = findAll(rail, (n) => n.name === "a").map((a) => a.attrs.get("href"));
      expect(hrefs, p.route).toEqual([...read.controls.map((c) => `#${c.id}`), "#known-issues"]);
      for (const note of read.notes) expect(hrefs, `${p.route} ${note.id}`).not.toContain(`#${note.id}`);
    }
  });

  it("is the same on the page in Spanish, which shows the English page until it is translated", () => {
    const route = "/es/docs/components/form-choice/";
    const rail = query(parse(buildReal().rendered.get(route), route), "nav.luz-page-rail__onpage");
    const english = query(parse(buildReal().rendered.get("/docs/components/form-choice/"), "en"), "nav.luz-page-rail__onpage");
    expect(findAll(rail, (n) => n.name === "a").map((a) => a.attrs.get("href"))).toEqual(findAll(english, (n) => n.name === "a").map((a) => a.attrs.get("href")));
  });
});
