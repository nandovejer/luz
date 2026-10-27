/**
 * <luz-timeline> as a piece of @luz-ds/catalog (F7, decisions 27, 32 and 61 of
 * the plan ai-and-catalog-only; it was core's): its budget row, its published
 * export, its row in PRINCIPLES.md section 8, its CSS in the catalog layer, the
 * loader line in catalog.js. The behaviour is in tests/timeline.spec.js.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");
const catalogDist = resolve(root, "packages/catalog/dist");
const distBuilt = existsSync(resolve(catalogDist, "catalog.js"));

describe("timeline: size and publication", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;

  it("has its own budget row: ideal 2 kB, ceiling 3 kB", () => {
    const row = budgets.find((b) => b.file === "packages/catalog/dist/timeline.min.js");
    expect(row, "a row for timeline.min.js in budgets.json").toBeDefined();
    expect(row.name).toBe("catalog JS lazy chunk: timeline");
    expect(row.ideal).toBe(2048);
    expect(row.max).toBe(3072);
  });

  it("leaves no row for a timeline chunk of core", () => {
    expect(budgets.find((b) => b.file === "packages/core/dist/timeline.min.js")).toBeUndefined();
    expect(budgets.find((b) => /core JS lazy chunk: timeline/.test(b.name))).toBeUndefined();
  });

  it("never raises the ceiling of the core entry", () => {
    expect(budgets.find((b) => b.file === "packages/core/dist/luz.min.js").max).toBe(8192);
  });

  it("has its row in PRINCIPLES.md section 8", () => {
    expect(/\| `catalog` JS lazy chunk: `timeline`[^|]*\| — \| ≤ 2 kB \| 2 kB \| 3 kB \|/.test(read("PRINCIPLES.md")), "the timeline row in section 8").toBe(true);
  });

  it("is exported as @luz-ds/catalog/timeline, and no longer as @luz-ds/core/timeline", () => {
    expect(JSON.parse(read("packages/catalog/package.json")).exports["./timeline"]).toBe("./dist/timeline.js");
    expect(JSON.parse(read("packages/core/package.json")).exports["./timeline"]).toBeUndefined();
  });

  it("is a side effect of the package, so a bundler keeps the element it defines", () => {
    const sideEffects = JSON.parse(read("packages/catalog/package.json")).sideEffects;
    expect(sideEffects).toContain("./dist/timeline.js");
    expect(sideEffects).toContain("./dist/timeline.min.js");
    expect(JSON.parse(read("packages/core/package.json")).sideEffects).not.toContain("./dist/timeline.js");
  });
});

describe("timeline: sources", () => {
  it("has its module and its stylesheet, and the stylesheet is imported by the components", () => {
    expect(existsSync(resolve(root, "packages/catalog/src/timeline.js"))).toBe(true);
    expect(existsSync(resolve(root, "packages/catalog/src/components/timeline.css"))).toBe(true);
  });

  it("is no longer in core: no module, no stylesheet, no import in its components", () => {
    expect(existsSync(resolve(root, "packages/core/src/timeline.js"))).toBe(false);
    expect(existsSync(resolve(root, "packages/core/src/components/timeline.css"))).toBe(false);
    expect(read("packages/core/src/components/index.css")).not.toMatch(/timeline/);
  });

  it("styles the element before it is defined, so nothing jumps when it upgrades", () => {
    expect(read("packages/catalog/src/components/timeline.css")).toContain("luz-timeline:not(:defined)");
  });

  it("builds its rail with DOM APIs only (no HTML sink)", () => {
    expect(read("packages/catalog/src/timeline.js")).not.toMatch(/\b(innerHTML|outerHTML|insertAdjacentHTML|eval)\b|document\.write/);
  });
});

describe.skipIf(!distBuilt)("timeline: dist", () => {
  it("is a lazy chunk of catalog, loaded by presence from catalog.js, and catalog.js does not contain its code", () => {
    expect(existsSync(resolve(catalogDist, "timeline.js"))).toBe(true);
    expect(existsSync(resolve(catalogDist, "timeline.min.js"))).toBe(true);
    expect(read("packages/catalog/dist/timeline.js")).toContain("luz-timeline");
    expect(read("packages/catalog/dist/catalog.js")).toMatch(/querySelector\(["']luz-timeline["']\)/);
    expect(read("packages/catalog/dist/catalog.js")).toMatch(/import\(["']\.\/timeline\.js["']\)/);
    expect(read("packages/catalog/dist/catalog.min.js")).toContain("./timeline.min.js");
    expect(read("packages/catalog/dist/catalog.js")).not.toContain("luz-timeline__item");
  });

  it("core ships no chunk of it and its entry does not load it", () => {
    for (const file of ["timeline.js", "timeline.min.js"]) expect(existsSync(resolve(root, "packages/core/dist", file)), file).toBe(false);
    expect(read("packages/core/dist/luz.js")).not.toMatch(/timeline/i);
    expect(read("packages/core/dist/luz.min.js")).not.toMatch(/timeline/i);
  });

  it("is standalone: neither chunk imports the entry, so importing it has none of the entry's side effects", () => {
    for (const file of ["timeline.js", "timeline.min.js"]) {
      const code = read(`packages/catalog/dist/${file}`);
      expect(code, `${file} imports luz.js or luz.min.js`).not.toMatch(/(?:from|import)\s*\(?\s*["'][^"']*\/?luz(?:\.min)?\.js["']/);
      expect(code, `${file} still defines the element`).toContain("luz-timeline");
    }
  });

  it("puts the stylesheet in catalog's components/timeline.css and in none of core's", () => {
    expect(read("packages/catalog/dist/components/timeline.css").includes("luz-timeline")).toBe(true);
    expect(existsSync(resolve(catalogDist, "components/timeline.min.css"))).toBe(true);
    expect(read("packages/core/dist/luz.css").includes("luz-timeline"), "luz-timeline in core's dist/luz.css").toBe(false);
    expect(existsSync(resolve(root, "packages/core/dist/components/timeline.css"))).toBe(false);
  });
});
