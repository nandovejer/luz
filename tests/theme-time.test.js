/**
 * <luz-theme-time> in the build of @luz-ds/catalog (the theme-mode plan, 2026-10-29): what the package ships, what
 * the presence loader may import, what the budgets hold, and what is gone.
 *
 *   - the two chunks (`theme-time.min.js`, with the tag; `theme-time-bar.min.js`, with variant="bar") and the boot
 *     script (`theme-time-boot.min.js`) are built, and none has a row in budgets.json or in PRINCIPLES.md §8: catalog has
 *     no weight limit (owner, 2026-11-02), `check-size` only reports their size
 *   - the loader catalog.min.js imports only the chunks of its map, each by a string literal, nothing static
 *     (SEC-CHUNK-1 and SEC-CHUNK-2), and `node scripts/check-size.js` passes
 *   - the manifests know the tag, its attributes and its classes
 *   - `<luz-color-mode>`, color-mode.js and color-mode.css are gone from the build, the loader, the manifests and the
 *     package's exports
 *
 * Reads dist/ (run `pnpm build` first), like the other tests of the packages' output.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8");
const dist = (path) => join("packages/catalog/dist", path);
const budgets = JSON.parse(read("budgets.json")).budgets;

const FILES = [
  ["theme-time", dist("theme-time.min.js")],
  ["theme-time-bar", dist("theme-time-bar.min.js")],
  ["theme-time-boot", dist("theme-time-boot.min.js")],
];

describe("the files of <luz-theme-time> are built and have no weight limit (owner, 2026-11-02)", () => {
  it.each(FILES)("%s: the file exists, and has no row in budgets.json nor in the table of PRINCIPLES.md §8", (name, file) => {
    expect(existsSync(join(repo, file)), `${file} is built`).toBe(true);
    expect(budgets.filter((b) => b.file === file || b.name.includes(name)).map((b) => b.name), "a row in budgets.json").toEqual([]);
    const table = read("PRINCIPLES.md");
    const short = file.split("/").pop();
    const line = table.split("\n").find((l) => l.startsWith("|") && l.includes(short.replace(".min.js", "")) && l.includes("`catalog`"));
    expect(line, `a row for ${short} in PRINCIPLES.md §8`).toBeUndefined();
  });

  it("theme-time.css is built, in the files of the package, and there is no per-file row of catalog components to hold it", () => {
    for (const file of ["components/theme-time.css", "components/theme-time.min.css"]) expect(existsSync(join(repo, dist(file))), file).toBe(true);
    expect(budgets.filter((b) => b.glob?.startsWith("packages/catalog/")).map((b) => b.name)).toEqual([]);
  });

  it("the package ships them and exposes the three scripts as subpaths", () => {
    const pack = read("packages/catalog/pack-files.txt").split("\n");
    for (const file of ["dist/theme-time.js", "dist/theme-time.min.js", "dist/theme-time-bar.js", "dist/theme-time-bar.min.js", "dist/theme-time-boot.js", "dist/theme-time-boot.min.js", "dist/components/theme-time.css", "dist/components/theme-time.min.css"]) {
      expect(pack, file).toContain(file);
    }
    const { exports } = JSON.parse(read("packages/catalog/package.json"));
    for (const subpath of ["./theme-time", "./theme-time-bar", "./theme-time-boot"]) expect(Object.keys(exports), subpath).toContain(subpath);
  });

  it("each chunk imports nothing and defines what it says: the tag in one, the bar's builder in the other", () => {
    for (const file of ["theme-time.min.js", "theme-time-bar.min.js"]) {
      const code = read(dist(file));
      expect(code, `${file} has no static import`).not.toMatch(/(?:^|[;}\s])import\s*["'{*\w]/);
      expect(code, `${file} has no dynamic import`).not.toMatch(/\bimport\s*\(/);
    }
    expect(read(dist("theme-time.min.js"))).toContain("luz-theme-time");
    expect(read(dist("theme-time-bar.min.js"))).toContain("luz-theme-time__bar");
  });

  it("the boot script is a classic script: no import, no export, nothing a module needs", () => {
    const code = read(dist("theme-time-boot.min.js"));
    expect(code).not.toMatch(/\b(?:import|export)\b/);
    expect(code).toContain("data-moments");
  });
});

describe("the presence loader, catalog.min.js", () => {
  const code = () => read(dist("catalog.min.js"));
  const CHUNKS = ["./cookie-consent.min.js", "./embed.min.js", "./search.min.js", "./sidebar.min.js", "./theme-time-bar.min.js", "./theme-time.min.js", "./timeline.min.js"];

  it("has no static import", () => {
    expect(code()).not.toMatch(/(?:^|[;}\s])import\b(?!\s*[(.])/);
    expect(code()).not.toMatch(/\bexport\b[^"'();]*?\bfrom\b/);
  });

  it("imports exactly its chunks, every call a string literal, and the two of the time are among them", () => {
    const calls = [...code().matchAll(/\bimport\s*\(/g)].length;
    const literal = [...code().matchAll(/\bimport\s*\(\s*(["'])(\.\/[\w.-]+\.js)\1\s*\)/g)].map((m) => m[2]).sort();
    expect(literal).toEqual(CHUNKS);
    expect(calls, "an import() that is not a literal").toBe(literal.length);
  });

  it("knows no color-mode", () => {
    expect(code()).not.toContain("color-mode");
  });

  it("the check of size passes: the budgets, the table of PRINCIPLES.md and SEC-CHUNK-1 and 2", () => {
    const result = spawnSync(process.execPath, [join(repo, "scripts/check-size.js")], { cwd: repo, encoding: "utf-8" });
    const out = result.stdout + result.stderr;
    expect(result.status, out).toBe(0);
    const report = out.slice(out.search(/catalog \(no limit, reported\)/));
    expect(out, "the section of catalog is printed").toMatch(/catalog \(no limit, reported\)/);
    expect(report, "the bar chunk is reported").toContain("theme-time-bar.min.js");
    expect(report, "the boot script is reported").toContain("theme-time-boot.min.js");
    expect(report, "the stylesheet is reported").toContain("theme-time.min.css");
  });
});

describe("the manifests of catalog", () => {
  const modules = () => JSON.parse(read(dist("custom-elements.json"))).modules;
  const declaration = (tag) => modules().flatMap((m) => m.declarations ?? []).find((d) => d.tagName === tag);
  const classes = () => JSON.parse(read(dist("classes.json"))).classes;

  it("custom-elements.json describes <luz-theme-time> with its attributes and its event", () => {
    const element = declaration("luz-theme-time");
    expect(element, "the tag is in the manifest").toBeDefined();
    expect(element.stylesheet).toBe("components/theme-time.css");
    expect(element.attributes.map((a) => a.name).sort()).toEqual(["latitude", "longitude", "no-remember", "place", "show", "variant"]);
    expect(element.events.map((e) => e.name)).toEqual(["luz-theme-time:change"]);
  });

  it("classes.json has the parts of the bar and the moments, all in components/theme-time.css, in the catalog layer", () => {
    const names = new Map(classes().map((c) => [c.name, c]));
    for (const part of ["bar", "day", "slider", "hour", "where", "saved", "moments", "moment", "legend", "input"]) {
      const entry = names.get(`luz-theme-time__${part}`);
      expect(entry, `.luz-theme-time__${part}`).toBeDefined();
      expect(entry.files).toEqual(["components/theme-time.css"]);
      expect(entry.layer).toBe("luz.catalog");
    }
  });

  it("<luz-color-mode> and its classes are gone", () => {
    expect(declaration("luz-color-mode")).toBeUndefined();
    expect(classes().filter((c) => c.name.startsWith("luz-color-mode") || c.name.startsWith("luz-mode"))).toEqual([]);
  });
});

describe("color-mode is gone from catalog", () => {
  it.each(["color-mode.js", "color-mode.min.js", "components/color-mode.css", "components/color-mode.min.css"])("dist/%s is not built", (file) => {
    expect(existsSync(join(repo, dist(file)))).toBe(false);
  });

  it("the sources are gone too, and the package no longer exports or ships them", () => {
    expect(existsSync(join(repo, "packages/catalog/src/color-mode.js"))).toBe(false);
    expect(existsSync(join(repo, "packages/catalog/src/components/color-mode.css"))).toBe(false);
    const { exports } = JSON.parse(read("packages/catalog/package.json"));
    expect(Object.keys(exports).filter((k) => k.includes("color-mode"))).toEqual([]);
    expect(read("packages/catalog/pack-files.txt")).not.toContain("color-mode");
    expect(budgets.filter((b) => JSON.stringify(b).includes("color-mode"))).toEqual([]);
  });
});
