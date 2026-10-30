/**
 * The icons of the home page are the one family of the Icons page (#79): a 24 grid, a 1.5 stroke,
 * round caps and joins, no fill, in the text colour. What the browser draws, in all three languages,
 * is tests/landing-icons.spec.js; this file reads the source of the page, apps/landing/index.html
 * and landing.css, which is one file for the three languages:
 *
 *  - `.ic`, the class that draws the page's inline outline icons, is 1.5 wide;
 *  - no stroke width in the page is anything else (1.6 and 2 were the old ones);
 *  - every symbol of the page's sprite is on the 24 grid;
 *  - an inline icon is its shapes in the `svg`, with no group around them to carry the stroke.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { find, findAll, parse, queryAll } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(repo, "apps/landing/index.html"), "utf-8");
const css = readFileSync(join(repo, "apps/landing/landing.css"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
const tree = parse(html, "apps/landing/index.html");

describe("the icons of the home page follow the one family of the Icons page", () => {
  it("draws the outline icons with .ic at a stroke of 1.5, round ends, no fill", () => {
    const rule = css.match(/(?:^|\})\s*\.ic\s*\{([^}]*)\}/);
    expect(rule, "the .ic rule").toBeTruthy();
    const decl = Object.fromEntries([...rule[1].matchAll(/([a-z-]+)\s*:\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
    expect(decl["stroke-width"]).toBe("1.5");
    expect(decl["stroke-linecap"]).toBe("round");
    expect(decl["stroke-linejoin"]).toBe("round");
    expect(decl.fill).toBe("none");
  });

  it("writes no stroke width but 1.5 anywhere in the page (not the old 1.6, not 2, not 1)", () => {
    const widths = [...html.matchAll(/\bstroke-width\s*=\s*"?([^"\s>]+)/g)].map((m) => m[1]);
    expect(widths.length, "the symbols of the sprite carry theirs").toBeGreaterThan(0);
    expect(widths.filter((w) => w !== "1.5")).toEqual([]);
    // and none in a style rule of the page either, but the 1.5 of .ic
    const inCss = [...css.matchAll(/stroke-width\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
    expect(inCss.filter((w) => w !== "1.5")).toEqual([]);
  });

  it("puts every symbol of the sprite on the 24 grid", () => {
    const symbols = findAll(tree, (n) => n.name === "symbol");
    expect(symbols.length).toBeGreaterThanOrEqual(14);
    expect(symbols.filter((s) => s.attrs.get("viewbox") !== "0 0 24 24").map((s) => s.attrs.get("id"))).toEqual([]);
  });

  it("draws an inline icon of the page as shapes straight in its svg, with no group that carries the stroke", () => {
    const inline = findAll(tree, (n) => n.name === "svg" && (n.attrs.get("class") ?? "").split(/\s+/).includes("ic") && !find(n, (c) => c.name === "use"));
    expect(inline.length, "the inline icons of the levels, the kinds and the eyebrows").toBeGreaterThan(8);
    const grouped = inline.filter((svg) => queryAll(svg, "g").length > 0);
    expect(grouped).toHaveLength(0);
    for (const svg of inline) expect(svg.attrs.get("viewbox")).toBe("0 0 24 24");
  });

  it("gives every inline eyebrow icon of the page the .ic class, so none carries its own stroke", () => {
    const eyebrows = findAll(tree, (n) => n.name === "p" && (n.attrs.get("class") ?? "").split(/\s+/).includes("landing-inside__eyebrow"));
    expect(eyebrows.length).toBeGreaterThan(0);
    for (const p of eyebrows) {
      const svg = find(p, (n) => n.name === "svg");
      if (find(svg, (n) => n.name === "use")) continue;
      expect((svg.attrs.get("class") ?? "").split(/\s+/)).toContain("ic");
    }
  });
});
