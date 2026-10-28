/**
 * F3, one stylesheet per component (.claude/plans/specs/f3-package-model.md,
 * §4 and §9 step 2; the unit half of the acceptance, the browser half is a
 * Playwright comparison).
 *
 * buildPackage() writes dist/components/<name>.css and <name>.min.css for
 * every src/components/<name>.css whose name does not start with `_`, each
 * in the package's own layer. Core already does this, and so does catalog, which
 * holds the patterns of the four kinds of site too since F5b (landing, cms, app and
 * docs are not packages any more). Catalog has no bundle and no print.css (F5a,
 * decisions 59 and 62): a component that prints carries its own `@layer luz.print` block.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYER_ORDER } from "../scripts/luz-layers.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const PACKAGES = ["catalog"];

const list = (dir, filter) => (existsSync(`${root}${dir}`) ? readdirSync(`${root}${dir}`).filter(filter).sort() : []);
const isCss = (f) => f.endsWith(".css") && !f.endsWith(".min.css");
const blocks = (css, layer) => css.match(new RegExp(`^@layer luz\\.${layer} \\{$`, "gm")) ?? [];
const printAt = (css) => css.search(/@layer luz\.print\s*\{/);
const layerBlocks = (css) => css.match(/@layer luz\.[\w-]+\s*\{/g) ?? [];

for (const name of PACKAGES) {
  const src = `packages/${name}/src/components`;
  const dist = `packages/${name}/dist`;
  const manifest = JSON.parse(readFileSync(`${root}packages/${name}/package.json`, "utf-8"));
  const wanted = list(src, (f) => isCss(f) && !f.startsWith("_"));
  const built = existsSync(`${root}${dist}/components`);

  describe(`@luz-ds/${name}: one stylesheet per component`, () => {
    it("has components to ship", () => {
      expect(wanted.length).toBeGreaterThan(0);
    });

    it("exports ./components/* from dist/components, as core does", () => {
      expect(manifest.exports["./components/*"]).toBe("./dist/components/*");
    });

    it("lists every component, plain and minified, in pack-files.txt", () => {
      const packed = readFileSync(`${root}packages/${name}/pack-files.txt`, "utf-8").split("\n").filter(Boolean);
      const expected = wanted.flatMap((f) => [`dist/components/${f}`, `dist/components/${f.replace(/\.css$/, ".min.css")}`]);
      expect(expected.filter((path) => !packed.includes(path))).toEqual([]);
    });

    it.skipIf(!built)("dist/components holds exactly the components of src/components", () => {
      expect(list(`${dist}/components`, isCss)).toEqual(wanted);
    });

    it.skipIf(!built)("each component also has a minified file", () => {
      const minified = list(`${dist}/components`, (f) => f.endsWith(".min.css"));
      expect(minified).toEqual(wanted.map((f) => f.replace(/\.css$/, ".min.css")));
      for (const f of minified) expect(readFileSync(`${root}${dist}/components/${f}`, "utf-8").length, f).toBeGreaterThan(0);
    });

    it.skipIf(!built)("each component starts with the layer order and has one luz layer block", () => {
      const bad = [];
      for (const f of wanted) {
        const file = `${root}${dist}/components/${f}`;
        const css = existsSync(file) ? readFileSync(file, "utf-8") : "";
        if (!css.startsWith(LAYER_ORDER) || blocks(css, name).length !== 1) bad.push(f);
      }
      expect(bad).toEqual([]);
    });
  });
}

describe("@luz-ds/catalog: no bundle, print rules in each component", () => {
  const built = existsSync(`${root}packages/catalog/dist/components`);
  const wanted = list("packages/catalog/src/components", (f) => isCss(f) && !f.startsWith("_"));
  const manifest = JSON.parse(readFileSync(`${root}packages/catalog/package.json`, "utf-8"));

  it("has no `_print.css` source, no `dist/print.css` in pack-files.txt and no bundle export", () => {
    expect(existsSync(`${root}packages/catalog/src/components/_print.css`)).toBe(false);
    const packed = readFileSync(`${root}packages/catalog/pack-files.txt`, "utf-8").split("\n");
    expect(packed.filter((p) => /^dist\/(?:catalog(?:\.min)?|print)\.css$/.test(p))).toEqual([]);
    expect(Object.keys(manifest.exports).filter((k) => ["./css", "./css/min", "./print.css"].includes(k))).toEqual([]);
  });

  it.skipIf(!built)("dist has no catalog.css, catalog.min.css or print.css", () => {
    for (const f of ["catalog.css", "catalog.min.css", "print.css"]) expect(existsSync(`${root}packages/catalog/dist/${f}`), f).toBe(false);
  });

  it.skipIf(!built)("search, cookie-consent, docs-layout and glow carry one `@layer luz.print` block with `@media print`, plain and minified", () => {
    for (const name of ["search", "cookie-consent", "docs-layout", "glow"]) {
      for (const file of [`${name}.css`, `${name}.min.css`]) {
        const css = readFileSync(`${root}packages/catalog/dist/components/${file}`, "utf-8");
        expect(css.match(/@layer luz\.print\s*\{/g), file).toHaveLength(1);
        expect(css.slice(printAt(css)), file).toContain("@media print");
      }
    }
  });

  it.skipIf(!built)("a print block, where a component has one, sits after its luz.catalog block and holds nothing else in a layer", () => {
    for (const f of wanted) {
      const css = readFileSync(`${root}packages/catalog/dist/components/${f}`, "utf-8");
      const print = printAt(css);
      if (print === -1) continue;
      expect(css.search(/@layer luz\.catalog\s*\{/), f).toBeLessThan(print);
      expect(layerBlocks(css.slice(print)), f).toHaveLength(1);
    }
  });
});
