/**
 * The icons of the colour mode (`<luz-theme-mode>`) are drawn by its stylesheet, so the markup
 * holds only the shapes: `.luz-theme-mode__icon` sets `fill: none`, `stroke: currentcolor`,
 * `stroke-width: 1.5` and round caps and joins, the family of the site's icons
 * (tests/icons-family.test.js). The CSS is read from what is published (`dist/`, run
 * `pnpm build` first) and from the source it is built from; the markup is the site's footer.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findAll, parse, queryAll } from "./helpers/html-dom.js";
import { repo } from "./helpers/page-facts.js";

const read = (file) => readFileSync(join(repo, file), "utf-8");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the rules whose selector is exactly `.luz-theme-mode__icon`, merged. */
function iconRule(css) {
  const out = new Map();
  for (const m of strip(css).matchAll(/(?:^|[};{])\s*\.luz-theme-mode__icon\s*\{([^}]*)\}/g)) {
    for (const d of m[1].split(";")) {
      const [name, ...value] = d.split(":");
      if (name?.trim() && value.length) out.set(name.trim(), value.join(":").trim());
    }
  }
  return out;
}

const SOURCES = {
  "packages/core/dist/luz.css": "the bundle",
  "packages/core/dist/components/theme-mode.css": "the component's own file",
  "packages/core/src/components/theme-mode.css": "the source",
};

describe(".luz-theme-mode__icon draws the family's icon", () => {
  for (const [file, what] of Object.entries(SOURCES)) {
    it(`${what} (${file}): no fill, the text colour as stroke, 1.5 wide, round caps and joins`, () => {
      expect(existsSync(join(repo, file)), `${file} (pnpm build)`).toBe(true);
      const rule = iconRule(read(file));
      expect(rule.get("fill"), "fill").toBe("none");
      expect(rule.get("stroke"), "stroke").toBe("currentcolor");
      expect(rule.get("stroke-width"), "stroke-width").toBe("1.5");
      expect(rule.get("stroke-linecap"), "stroke-linecap").toBe("round");
      expect(rule.get("stroke-linejoin"), "stroke-linejoin").toBe("round");
    });
  }

  it("is in the layer of the components, not unlayered", () => {
    const css = strip(read("packages/core/dist/luz.css"));
    const at = css.search(/(?:^|[};{])\s*\.luz-theme-mode__icon\s*\{[^}]*stroke-width/);
    expect(at, "the rule").toBeGreaterThan(-1);
    const layers = [...css.slice(0, at).matchAll(/@layer\s+(luz\.[a-z]+)\s*\{/g)].map((m) => m[1]);
    expect(layers.at(-1), "the layer open before the rule").toBe("luz.components");
  });
});

describe("the footer's colour mode icons are only shapes", () => {
  const footer = parse(read("apps/site/_partials/footer.html"), "footer");
  const icons = () => queryAll(footer, "svg").filter((svg) => (svg.attrs.get("class") ?? "").split(/\s+/).includes("luz-theme-mode__icon"));

  it("has one on each of the four options", () => {
    expect(icons()).toHaveLength(4);
    for (const svg of icons()) expect(svg.attrs.get("viewbox")).toBe("0 0 24 24");
  });

  it("writes no stroke, stroke width, caps or joins on the svg, a group or a shape: the stylesheet draws them", () => {
    expect(icons().length).toBeGreaterThan(0);
    for (const svg of icons()) {
      for (const node of [svg, ...findAll(svg, () => true)]) {
        const written = [...node.attrs.keys()].filter((k) => k === "stroke" || k.startsWith("stroke-"));
        expect(written, `<${node.name}> of ${svg.html.slice(svg.open.index, svg.open.index + 80)}`).toEqual([]);
        expect(["none", "currentColor", undefined], `${node.name} fill`).toContain(node.attrs.get("fill"));
      }
    }
  });
});
