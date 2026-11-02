/**
 * <luz-theme-time> of @luz-ds/catalog, the parts that need no browser
 * (.claude/plans/theme-mode.md section 3; the behaviour is in the specs of the
 * element and in tests/site-mode.spec.js):
 *   - theme-time.js and theme-time-bar.js are lazy chunks like search.js and
 *     cookie-consent.js: they import nothing (SEC-CHUNK-2), catalog.js loads
 *     them by a literal specifier (SEC-CHUNK-1), scripts/build-catalog.js and
 *     scripts/check-size.js know them;
 *   - they have no row in budgets.json nor in the table of PRINCIPLES.md
 *     section 8: catalog has no weight limit (owner, 2026-11-02);
 *   - their header comments feed custom-elements.json (@element, @attr, @fires).
 *
 * The phase of the day (phaseOf(hour), six fixed boundaries) is gone from the
 * chunk: the moments, their names and their hours are now declared in the
 * page's markup (data-from), so there is no table to test here; the moment at
 * an hour is the element's own behaviour, in its specs.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const TIME = "packages/catalog/src/theme-time.js";
const BAR = "packages/catalog/src/theme-time-bar.js";
/** The text of a chunk; a missing file is the assertion that fails, not an ENOENT. */
const readChunk = (file) => {
  expect(existsSync(join(repo, file)), `${file} exists`).toBe(true);
  return read(file);
};
const readTime = () => readChunk(TIME);
const readBar = () => readChunk(BAR);

/* ---- The chunks follow the rules of the other three ------------------------ */

const IMPORT_CALL = /\bimport\s*\(/g;
const LITERAL_IMPORT = /\bimport\s*\(\s*(["'])(\.\/[\w.-]+\.js)\1\s*\)/g;
const STATIC = /(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/;
/** JS without its comments: a header may say "import" in words. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

describe("theme-time.js and theme-time-bar.js are lazy chunks that import nothing", () => {
  it("have no static import or export-from, and no import() (SEC-CHUNK-2)", () => {
    for (const [name, text] of [["theme-time.js", readTime()], ["theme-time-bar.js", readBar()]]) {
      const source = code(text);
      expect(STATIC.test(source), `${name}: a static import or export-from`).toBe(false);
      expect(source.match(IMPORT_CALL), `${name}: a dynamic import`).toBeNull();
      expect(source, name).not.toMatch(/import\.meta/);
    }
  });

  it("theme-time.js defines <luz-theme-time> behind a guard, so a second copy of the module does not throw", () => {
    const source = code(readTime());
    expect(source).toMatch(/customElements\.define\(\s*["']luz-theme-time["']/);
    expect(source).toMatch(/customElements\.get\(\s*["']luz-theme-time["']\s*\)/);
  });

  it("theme-time-bar.js defines no element: it builds the bar inside the element and exports initThemeTimeBar()", () => {
    const source = code(readBar());
    expect(source).not.toMatch(/customElements\.define/);
    expect(source).toMatch(/export\s+function\s+initThemeTimeBar\b/);
  });

  it("theme-time.js writes no text of its own: the moments' names are the page's markup (SR-7)", () => {
    const source = code(readTime());
    expect(source).not.toMatch(/\.(?:textContent|innerText|innerHTML|outerHTML)\s*=/);
    expect(source).not.toMatch(/insertAdjacentHTML|document\.write/);
  });

  it("neither chunk writes HTML (SEC-IDX-2); the bar's two texts are the page's data-luz-label-* (EX-013)", () => {
    const source = code(readBar());
    expect(source).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/);
    expect(source).toMatch(/data-luz-label-\$\{key\}|data-luz-label-/);
  });

  it("store under the keys they own: `luz-light` for the pinned hour, never core's `luz-theme`", () => {
    const source = code(readTime());
    expect(source).toMatch(/["']luz-light["']/);
    expect(source).not.toMatch(/setItem\(\s*["']luz-theme["']/);
    expect(source).not.toMatch(/luz-site-mode/);
  });
});

describe("catalog.js, the build and the size guard know the chunks", () => {
  it("catalog.js loads them by literal imports, for the tags luz-theme-time and luz-theme-time-bar", () => {
    const loader = read("packages/catalog/src/catalog.js");
    const files = [...loader.matchAll(LITERAL_IMPORT)].map((m) => m[2]).sort();
    expect(files).toContain("./theme-time.js");
    expect(files).toContain("./theme-time-bar.js");
    expect(loader).toMatch(/["']luz-theme-time["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/theme-time\.js["']\s*\)/);
    expect(loader).toMatch(/["']luz-theme-time-bar["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/theme-time-bar\.js["']\s*\)/);
    expect(code(loader).match(IMPORT_CALL)).toHaveLength(8);
  });

  it("scripts/build-catalog.js lists them among the chunks", () => {
    const build = read("scripts/build-catalog.js");
    const chunks = /chunks:\s*\[([^\]]*)\]/.exec(build)?.[1] ?? "";
    expect([...chunks.matchAll(/["']([\w.-]+\.js)["']/g)].map((m) => m[1])).toEqual(["search.js", "cookie-consent.js", "theme-time.js", "theme-time-bar.js", "timeline.js", "embed.js", "chart.js", "sidebar.js"]); // timeline and sidebar came from core in F7
  });

  it("scripts/check-size.js expects the two time chunks of the loader, with the other four", () => {
    const guard = read("scripts/check-size.js");
    const loaders = /const LOADERS = \{([^;]*)\};/.exec(guard)?.[1] ?? "";
    expect(loaders).toContain("./theme-time.min.js");
    expect(loaders).toContain("./theme-time-bar.min.js");
    expect(loaders).toContain("./search.min.js");
    expect(loaders).toContain("./cookie-consent.min.js");
    expect(loaders).toContain("./timeline.min.js");
    expect(loaders).toContain("./sidebar.min.js");
  });

  it("package.json exports ./theme-time, ./theme-time-bar and ./theme-time-boot, and lists the two chunks as side effects", () => {
    const manifest = JSON.parse(read("packages/catalog/package.json"));
    expect(manifest.exports["./theme-time"]).toBe("./dist/theme-time.js");
    expect(manifest.exports["./theme-time-bar"]).toBe("./dist/theme-time-bar.js");
    expect(manifest.exports["./theme-time-boot"]).toBe("./dist/theme-time-boot.js");
    expect(manifest.sideEffects).toEqual(expect.arrayContaining(["./dist/theme-time.js", "./dist/theme-time.min.js", "./dist/theme-time-bar.js", "./dist/theme-time-bar.min.js"]));
    expect(manifest.exports["./color-mode"]).toBeUndefined();
  });

  it("has a stylesheet of its own, a file of components/ that the package no longer bundles, in the luz.catalog layer", () => {
    expect(existsSync(join(repo, "packages/catalog/src/components/theme-time.css")), "components/theme-time.css").toBe(true);
    expect(existsSync(join(repo, "packages/catalog/src/components/color-mode.css")), "components/color-mode.css is gone").toBe(false);
    expect(read("packages/catalog/src/components/theme-time.css")).toMatch(/(?<![.\w#-])luz-theme-time(?![\w-])/);
    expect(existsSync(join(repo, "packages/catalog/src/index.css")), "catalog has no src/index.css").toBe(false);
  });

  it("scripts/smoke-consumer.js probes dist/theme-time-bar.js for its initThemeTimeBar() export, as it does for consent's getConsent()", () => {
    const smoke = read("scripts/smoke-consumer.js");
    expect(smoke).toMatch(/\[site \+ "\/dist\/theme-time-bar\.js"\]:\s*\[\s*"initThemeTimeBar"\s*\]/);
    expect(smoke).toMatch(/\[site \+ "\/dist\/cookie-consent\.js"\]:\s*\[\s*"getConsent"\s*\]/);
  });

  it("scripts/docs-site/snippets.js lists the chunks and says when a page needs each", () => {
    const snippets = read("scripts/docs-site/snippets.js");
    expect(snippets).toContain("theme-time.min.js");
    expect(snippets).toContain("theme-time-bar.min.js");
    expect(snippets).toMatch(/["']theme-time\.min\.js["']\s*:\s*\[\s*["']catalog["']\s*,\s*["'][^"']*luz-theme-time["']/);
    expect(snippets).toMatch(/["']theme-time-bar\.min\.js["']\s*:\s*\[\s*["']catalog["']\s*,\s*["'][^"']*luz-theme-time-bar["']/);
    expect(snippets).not.toContain("color-mode.min.js");
  });
});

/* ---- The budgets -------------------------------------------------------------- */

describe("the time chunks have no budget row: catalog has no weight limit (owner, 2026-11-02)", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;

  it.each(["theme-time", "theme-time-bar", "theme-time-boot"])("has no row for %s, by file or by name", (name) => {
    expect(budgets.filter((b) => (b.file ?? b.glob ?? "").includes(name) || b.name.includes(name)).map((b) => b.name)).toEqual([]);
  });

  it("has no row for the old `catalog JS lazy chunk: color-mode`, nor any row of catalog", () => {
    expect(budgets.find((b) => /color-mode/.test(b.name))).toBeUndefined();
    expect(budgets.filter((b) => /^catalog /.test(b.name)).map((b) => b.name)).toEqual([]);
  });

  it("has no row of them in the table of PRINCIPLES.md section 8, and the chunks are still built and reported by check-size", () => {
    const principles = read("PRINCIPLES.md");
    expect(principles).not.toMatch(/JS lazy chunk: `theme-time(?:-bar)?`/);
    expect(principles).not.toMatch(/theme-time boot script/);
    expect(principles).not.toMatch(/JS lazy chunk: `color-mode`/);
    for (const name of ["theme-time.min.js", "theme-time-bar.min.js", "theme-time-boot.min.js"]) expect(existsSync(join(repo, "packages/catalog/dist", name)), name).toBe(true);
  });
});

/* ---- The header comments: custom-elements.json is made from them --------------- */

describe("the header of theme-time.js", () => {
  const header = () => /^\s*\/\*\*([\s\S]*?)\*\//.exec(readTime())?.[1] ?? "";
  const lines = () => header().split("\n").map((l) => l.replace(/^[\s*]*/, "").trimEnd());

  it("declares the element: @element luz-theme-time - description", () => {
    const element = lines().filter((l) => l.startsWith("@element"));
    expect(element).toHaveLength(1);
    expect(element[0]).toMatch(/^@element\s+luz-theme-time\s+-\s+\S.{10,}/);
  });

  it("declares the event: @fires luz-theme-time:change {CustomEvent} - description", () => {
    const fires = lines().filter((l) => l.startsWith("@fires"));
    expect(fires).toHaveLength(1);
    expect(fires[0]).toMatch(/^@fires\s+luz-theme-time:change\s+\{[^}]+\}\s+-\s+\S/);
  });

  it("declares its attributes with @attr: variant, show, latitude, longitude, place and no-remember", () => {
    const names = lines()
      .filter((l) => /^@attr(ibute)?\b/.test(l))
      .map((l) => /^@attr(?:ibute)?\s+\{[^}]+\}\s+(?:\[([\w-]+)=[^\]]*\]|([\w-]+))\s+-\s+\S/.exec(l))
      .map((m) => m?.[1] ?? m?.[2]);
    expect(names.sort()).toEqual(["latitude", "longitude", "no-remember", "place", "show", "variant"]);
  });

  it("dispatches the event it declares, with that name, bubbling", () => {
    const source = code(readTime());
    expect(source).toMatch(/new\s+CustomEvent\(\s*["']luz-theme-time:change["']/);
    expect(source).toMatch(/bubbles:\s*true/);
  });
});
