/**
 * <luz-theme-mode> (core): what the build publishes. The element, its CSS and
 * its boot script are checked in the browser by tests/theme-mode*.spec.js; this
 * file reads the built files and the package: the weight of the lazy chunk and
 * of the boot script, that the old selector (.luz-mode-switcher, .luz-mode-btn,
 * .luz-mode-cycle and initThemeCycle) is gone without an alias, that luz.js
 * loads the chunk only when the page has the element, and what the package
 * exports and ships.
 *
 * Needs `pnpm build` first (dist/ is generated), as tests/size-guard.test.js does.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8");
const json = (path) => JSON.parse(read(path));
// The gzip of tests/size-guard.test.js and scripts/check-size.js
const sizeOf = (path) => gzipSync(readFileSync(join(repo, path)), { level: 9 }).length;

const CHUNK = "packages/core/dist/theme-mode.min.js";
const BOOT = "packages/core/dist/theme-boot.min.js";

describe("the weight of the color mode", () => {
  const { budgets } = json("budgets.json");
  const rowOf = (file) => budgets.find((row) => row.file === file);

  it("the lazy chunk has its own row in budgets.json: 1.25 kB the ceiling", () => {
    const row = rowOf(CHUNK);
    expect(row, `a row for ${CHUNK}`).toBeDefined();
    expect(row.max).toBe(1.25 * 1024);
    expect(row.ideal).toBeLessThanOrEqual(row.max);
  });

  it("the boot script has its own row in budgets.json: 0.5 kB the ceiling", () => {
    const row = rowOf(BOOT);
    expect(row, `a row for ${BOOT}`).toBeDefined();
    expect(row.max).toBe(0.5 * 1024);
    expect(row.ideal).toBeLessThanOrEqual(row.max);
  });

  it("the table of PRINCIPLES.md names both rows", () => {
    const principles = read("PRINCIPLES.md");
    expect(principles).toMatch(/^\|[^\n|]*`theme-mode`[^\n|]*\|.*1\.25 kB \|$/m);
    expect(principles).toMatch(/^\|[^\n|]*`theme-boot\.min\.js`[^\n|]*\|.*0\.5 kB \|$/m);
  });

  it.each([
    [CHUNK, 1.25 * 1024],
    [BOOT, 0.5 * 1024],
  ])("%s, minified and gzipped, is under its ceiling", (file, max) => {
    expect(existsSync(join(repo, file)), `${file} is built`).toBe(true);
    expect(sizeOf(file)).toBeLessThanOrEqual(max);
  });
});

describe("the old selector is gone, without an alias", () => {
  const css = read("packages/core/dist/luz.css");

  it.each(["luz-mode-switcher", "luz-mode-btn", "luz-mode-cycle"])("dist/luz.css has no .%s*", (name) => {
    expect(css).not.toContain(name);
  });

  it("dist/luz.css has the new parts: .luz-theme-mode__button, __group, __legend, __option, __input", () => {
    for (const part of ["button", "group", "legend", "option", "input"]) expect(css, part).toContain(`.luz-theme-mode__${part}`);
  });

  it("the class manifest lists the new parts and none of the old names", () => {
    const names = json("packages/core/dist/classes.json").classes.map((c) => c.name);
    expect(names.some((n) => n.startsWith("luz-theme-mode__"))).toBe(true);
    expect(names.filter((n) => /^(luz-mode-switcher|luz-mode-btn|luz-mode-cycle)/.test(n))).toEqual([]);
  });

  it("core exports no initThemeCycle: not from the entry, not from theme.js", () => {
    for (const file of ["packages/core/src/luz.js", "packages/core/src/theme.js", "packages/core/dist/luz.js", "packages/core/dist/theme.js"]) {
      expect(read(file), file).not.toMatch(/initThemeCycle/);
    }
    expect(read("packages/core/dist/luz.min.js")).not.toMatch(/initThemeCycle/);
  });

  it("the sources of core write none of the old class names", () => {
    for (const file of ["packages/core/src/theme.js", "packages/core/src/luz.js", "packages/core/src/theme-mode.js"]) {
      expect(read(file), file).not.toMatch(/luz-mode-(switcher|btn|cycle)/);
    }
    expect(existsSync(join(repo, "packages/core/src/components/mode-switcher.css"))).toBe(false);
    expect(existsSync(join(repo, "packages/core/dist/components/mode-switcher.css"))).toBe(false);
  });
});

describe("luz.js loads the chunk only on demand", () => {
  const STATIC_THEME_MODE = /(?:^|[;}\s])(?:import\b[^("']*?["']\.\/theme-mode(?:\.min)?\.js["']|export\b[^"'();]*?\bfrom\s*["']\.\/theme-mode(?:\.min)?\.js["']|import\s*["']\.\/theme-mode(?:\.min)?\.js["'])/;

  it.each([
    ["packages/core/dist/luz.js", "./theme-mode.js"],
    ["packages/core/dist/luz.min.js", "./theme-mode.min.js"],
  ])("%s has no static import of theme-mode and one dynamic import of %s", (file, target) => {
    const code = read(file);
    expect(STATIC_THEME_MODE.test(code), "a static import").toBe(false);
    expect(code.match(new RegExp(`import\\(\\s*["']${target.replace(/\./g, "\\.")}["']\\s*\\)`, "g")), `import("${target}")`).toHaveLength(1);
  });

  it("the chunk imports nothing, static or dynamic, and defines the element once", () => {
    const code = read(CHUNK);
    expect(code).not.toMatch(/(?:^|[;}\s])import\b(?!\s*\.)/);
    expect(code).not.toMatch(/\bimport\s*\(/);
    expect(code).toContain("luz-theme-mode");
    expect(code, "guards customElements.get").toMatch(/customElements\.get\(/);
  });
});

describe("the package", () => {
  const pkg = json("packages/core/package.json");

  it("exports ./theme-mode and ./theme-boot", () => {
    expect(pkg.exports["./theme-mode"]).toBe("./dist/theme-mode.js");
    expect(pkg.exports["./theme-boot"]).toBe("./dist/theme-boot.js");
    for (const key of ["./theme-mode", "./theme-boot"]) expect(existsSync(join(repo, "packages/core", pkg.exports[key])), key).toBe(true);
  });

  it("pack-files.txt lists the chunk, the boot script and the stylesheet, plain and minified", () => {
    const listed = read("packages/core/pack-files.txt").split("\n").map((l) => l.trim());
    for (const file of ["dist/theme-mode.js", "dist/theme-mode.min.js", "dist/theme-boot.js", "dist/theme-boot.min.js", "dist/components/theme-mode.css", "dist/components/theme-mode.min.css"]) {
      expect(listed, file).toContain(file);
    }
    expect(listed.filter((l) => /mode-switcher/.test(l))).toEqual([]);
  });

  it("the element is documented in the custom elements manifest, with its attributes and its event", () => {
    const manifest = json("packages/core/dist/custom-elements.json");
    const decl = manifest.modules.flatMap((m) => m.declarations ?? []).find((d) => d.tagName === "luz-theme-mode");
    expect(decl, "luz-theme-mode in custom-elements.json").toBeDefined();
    expect(decl.attributes.map((a) => a.name).sort()).toEqual(["inline", "no-remember"]);
    expect(decl.events.map((e) => e.name)).toEqual(["luz-theme-mode:change"]);
  });
});

describe("a custom theme still has the shape the fixture of the specs copies", () => {
  const template = read("packages/core/src/themes/_template.css");
  const fixture = read("tests/fixtures/theme-mode-brand.css");

  it("the template's three blocks answer to data-theme and data-mode, the fixture's too", () => {
    for (const selector of ['[data-theme="my-brand"][data-mode="dark"]', '[data-theme="my-brand"][data-mode="high-contrast"]', '[data-theme="my-brand"][data-mode="light"]']) {
      expect(template, selector).toContain(selector);
      expect(fixture, selector).toContain(selector);
    }
  });

  it.each(["light", "dark", "high-contrast"])("the template's %s block also answers to the checked radio when no data-mode is written, the fixture's too (no JavaScript)", (mode) => {
    const selector = `:root[data-theme="my-brand"]:not([data-mode]):has(input[name="luz-theme-mode"][value="${mode}"]:checked)`;
    expect(fixture, "the fixture").toContain(selector);
    expect(template, "the template").toContain(selector);
  });
});
