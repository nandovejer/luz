/**
 * The manifests of <luz-faq>, the frequently asked questions of
 * @luz-ds/catalog (a CSS-only tag). `custom-elements.json` lists the tag with
 * its stylesheet, `classes.json` lists the `luz-faq__*` classes with the file
 * that styles them, and the file is built, minified and packed. What the
 * browser does is in tests/site-faq.spec.js. Needs `pnpm catalog:build`
 * (dist/), like tests/class-manifest.test.js.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFileSync(join(repo, path), "utf-8");
const dist = "packages/catalog/dist";
const FILE = "components/faq.css";
const PARTS = ["title", "lead", "nav", "group", "group-title", "item", "question", "answer", "more"];

describe("<luz-faq> in the catalog's manifests", () => {
  it("is built: components/faq.css and its minified file are in dist/, and packed", () => {
    expect(existsSync(join(repo, dist, "components/faq.css"))).toBe(true);
    expect(existsSync(join(repo, dist, "components/faq.min.css"))).toBe(true);
    const packed = read("packages/catalog/pack-files.txt").split("\n").map((l) => l.trim());
    expect(packed).toContain("dist/components/faq.css");
    expect(packed).toContain("dist/components/faq.min.css");
  });

  it("custom-elements.json lists luz-faq as a CSS-only tag with its stylesheet", () => {
    const manifest = JSON.parse(read(`${dist}/custom-elements.json`));
    const tags = manifest.modules.flatMap((m) => (m.declarations ?? []).filter((d) => d.customElement));
    const faq = tags.filter((d) => d.tagName === "luz-faq");
    expect(faq).toHaveLength(1);
    expect(faq[0].stylesheet).toBe(FILE);
    expect(faq[0].description).toMatch(/^CSS-only: no script defines this tag\./);
  });

  it("classes.json lists the parts of luz-faq, each in components/faq.css and in no other file", () => {
    const manifest = JSON.parse(read(`${dist}/classes.json`));
    const faq = manifest.classes.filter((c) => c.name.startsWith("luz-faq"));
    expect(faq.map((c) => c.name).sort()).toEqual(PARTS.map((p) => `luz-faq__${p}`).sort());
    for (const c of faq) {
      expect(c.files, c.name).toEqual([FILE]);
      expect(c.layer, c.name).toBe("luz.catalog");
      expect(c.block, c.name).toBe("luz-faq");
    }
  });

  it("every luz-faq class the fixture uses is in classes.json", () => {
    const manifest = JSON.parse(read(`${dist}/classes.json`));
    const known = new Set(manifest.classes.map((c) => c.name));
    const used = new Set(read("tests/fixtures/catalog-faq.html").match(/luz-faq__[a-z-]+/g));
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(known.has(name), name).toBe(true);
  });

  it("the stylesheet is in the layer of the catalog, with its print rules in luz.print", () => {
    const css = read(`${dist}/components/faq.css`);
    expect(css).toMatch(/@layer luz\.catalog \{/);
    expect(css).toMatch(/@layer luz\.print \{/);
  });
});
