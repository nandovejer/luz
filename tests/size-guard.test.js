/**
 * The guard of scripts/check-size.js and the files it guards, for the lazy
 * chunks of @luz-ds/catalog (.claude/plans/specs/f3-package-model.md section 2.3,
 * 9 step 7; security requirements R1 and R2, rows SEC-CHUNK-1 and SEC-CHUNK-2):
 *   - every chunk of every package imports nothing, static or dynamic;
 *   - catalog.min.js has no static import, and its dynamic imports are exactly
 *     "./search.min.js", "./cookie-consent.min.js", "./theme-time.min.js", "./theme-time-bar.min.js", "./timeline.min.js" and
 *     "./sidebar.min.js" (the last two moved from core in F7), each a string literal; F8 named the chunks for their
 *     elements: `consent` and `mode` are `cookie-consent` and `color-mode`, and the theme-mode plan (2026-10-29) replaced
 *     `color-mode` with `theme-time` (and its slider, `theme-time-bar`);
 *   - any import() whose argument is not a literal fails;
 *   - a bare specifier still fails (red line 1).
 * The guard runs on a copy of the repository in a temporary folder (it reads
 * ../budgets.json, ../PRINCIPLES.md and ../packages from its own location),
 * and the real built files are checked against the same rules.
 */
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8");

/* ---- The real files ---------------------------------------------------- */

const IMPORT_CALL = /\bimport\s*\(/g;
const LITERAL_IMPORT = /\bimport\s*\(\s*(["'])(\.\/[\w.-]+\.js)\1\s*\)/g;
/** Static imports and re-exports, `import "x"`, `import x from "x"`, `export … from "x"`. */
const STATIC = /(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/;

const dynamicTargets = (code) => [...code.matchAll(LITERAL_IMPORT)].map((m) => m[2]).sort();
const sizeOf = (path) => gzipSync(readFileSync(join(repo, path)), { level: 9 }).length;

describe("the built catalog files", () => {
  it("catalog.min.js has no static import and loads exactly the six chunks, each by a literal specifier", () => {
    const code = read("packages/catalog/dist/catalog.min.js");
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(dynamicTargets(code)).toEqual(["./cookie-consent.min.js", "./search.min.js", "./sidebar.min.js", "./theme-time-bar.min.js", "./theme-time.min.js", "./timeline.min.js"]);
    expect(code.match(IMPORT_CALL)).toHaveLength(6);
  });

  it.each(["consent", "mode", "color-mode"])("the F5b chunk %s.js is gone from src and dist, plain and minified", (name) => {
    for (const file of [`src/${name}.js`, `dist/${name}.js`, `dist/${name}.min.js`]) expect(existsSync(join(repo, "packages/catalog", file)), file).toBe(false);
  });

  it.each(["search", "cookie-consent", "theme-time", "theme-time-bar", "timeline", "sidebar"])("%s.min.js imports nothing, static or dynamic", (name) => {
    const code = read(`packages/catalog/dist/${name}.min.js`);
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(code.match(IMPORT_CALL)).toBeNull();
  });

  it("the sources follow: catalog.js names the chunks as literals, and the chunks import nothing (SEC-CHUNK-1)", () => {
    const loader = read("packages/catalog/src/catalog.js");
    expect(dynamicTargets(loader)).toEqual(["./cookie-consent.js", "./search.js", "./sidebar.js", "./theme-time-bar.js", "./theme-time.js", "./timeline.js"]);
    expect(loader.match(IMPORT_CALL)).toHaveLength(6);
    expect(loader).not.toMatch(/import\.meta/);
    for (const name of ["search", "cookie-consent", "theme-time", "theme-time-bar", "timeline", "sidebar"]) {
      const source = read(`packages/catalog/src/${name}.js`);
      expect(STATIC.test(source), `${name}.js static import`).toBe(false);
      expect(source.match(IMPORT_CALL), `${name}.js dynamic import`).toBeNull();
    }
  });

  it("the entry is much smaller than before (it no longer bundles the search), and the search chunk fits its ceiling", () => {
    expect(sizeOf("packages/catalog/dist/catalog.min.js")).toBeLessThanOrEqual(1024);
    expect(sizeOf("packages/catalog/dist/search.min.js")).toBeLessThanOrEqual(2560);
  });
});

/* ---- The budgets ------------------------------------------------------- */

describe("budgets.json and PRINCIPLES.md section 8", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const principles = read("PRINCIPLES.md");

  it("has a row for the search chunk, with a ceiling of 2.5 kB", () => {
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: search")).toMatchObject({ file: "packages/catalog/dist/search.min.js", ideal: 2048, max: 2560 });
    expect(principles).toMatch(/^\| `catalog` JS lazy chunk: `search`[^\n]*\| 2\.5 kB \|$/m);
  });

  it("calls the cookie consent file a lazy chunk, with the same ideal and ceiling as the row of F5 had under its old name (renamed, not raised)", () => {
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: cookie-consent")).toEqual({ name: "catalog JS lazy chunk: cookie-consent", file: "packages/catalog/dist/cookie-consent.min.js", ideal: 1024, max: 1536 });
    expect(principles).toMatch(/^\| `catalog` JS lazy chunk: `cookie-consent`[^\n]*\| 1\.5 kB \|$/m);
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: consent"), "the row under the old name is gone").toBeUndefined();
    expect(principles).not.toMatch(/JS lazy chunk: `consent`/);
  });

  it("has a row for each of the two time chunks, bigger than the cookie consent one because it holds the clock and the sun (new files, fixed once; no ceiling raised)", () => {
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: theme-time")).toEqual({ name: "catalog JS lazy chunk: theme-time", file: "packages/catalog/dist/theme-time.min.js", ideal: 2048, max: 2560 });
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: theme-time-bar")).toEqual({ name: "catalog JS lazy chunk: theme-time-bar", file: "packages/catalog/dist/theme-time-bar.min.js", ideal: 1280, max: 1536 });
    expect(principles).toMatch(/^\| `catalog` JS lazy chunk: `theme-time` [^\n]*\| 2\.5 kB \|$/m);
    expect(principles).toMatch(/^\| `catalog` JS lazy chunk: `theme-time-bar` [^\n]*\| 1\.5 kB \|$/m);
    for (const gone of ["color-mode", "mode"]) {
      expect(budgets.find((b) => b.name === `catalog JS lazy chunk: ${gone}`), `the row under the old name ${gone} is gone`).toBeUndefined();
      expect(principles).not.toMatch(new RegExp(`JS lazy chunk: \`${gone}\``));
    }
  });

  it("has a row for each of the two boot scripts and for core's mode chunk, each new, with a ceiling no bigger than the chunk it serves", () => {
    expect(budgets.find((b) => b.name === "core JS lazy chunk: theme-mode")).toEqual({ name: "core JS lazy chunk: theme-mode", file: "packages/core/dist/theme-mode.min.js", ideal: 1024, max: 1280 });
    expect(budgets.find((b) => /^core theme-boot script/.test(b.name))).toMatchObject({ file: "packages/core/dist/theme-boot.min.js", ideal: 256, max: 512 });
    expect(budgets.find((b) => /^catalog theme-time-boot script/.test(b.name))).toMatchObject({ file: "packages/catalog/dist/theme-time-boot.min.js", ideal: 512, max: 768 });
    expect(principles).toMatch(/^\| `core` JS lazy chunk: `theme-mode` [^\n]*\| 1\.25 kB \|$/m);
    expect(principles).toMatch(/^\| `core` theme boot script, `theme-boot\.min\.js` [^\n]*\| 0\.5 kB \|$/m);
    expect(principles).toMatch(/^\| `catalog` theme-time boot script, `theme-time-boot\.min\.js` [^\n]*\| 0\.75 kB \|$/m);
  });

  it("keeps the catalog entry row, with its ceiling of 2 kB unchanged", () => {
    expect(budgets.find((b) => b.name === "catalog JS")).toMatchObject({ file: "packages/catalog/dist/catalog.min.js", ideal: 1024, max: 2048 });
  });

  it("has no `catalog CSS` row: catalog has no bundle, each component file has its own row by glob (F5a)", () => {
    expect(budgets.find((b) => b.name === "catalog CSS")).toBeUndefined();
    expect(budgets.some((b) => /catalog\.min\.css/.test(b.file ?? ""))).toBe(false);
    expect(budgets.find((b) => b.name === "catalog component CSS (each)")).toMatchObject({
      glob: "packages/catalog/dist/components/*.min.css",
      ideal: 1280,
      max: 1536,
    });
    expect(principles).toMatch(/^\| Each `catalog` component CSS[^\n]*\| 1\.5 kB \|$/m);
    expect(principles).not.toMatch(/^\| `catalog` CSS \|/m);
  });

  it("has a row of its own for the four layout components that came from core (F7, decision 61): ideal 1.75 kB, ceiling 2 kB, a new row and no other ceiling raised", () => {
    expect(budgets.find((b) => b.name === "catalog layout CSS (each)")).toMatchObject({ ideal: 1792, max: 2048 });
    expect(principles).toMatch(/^\| Each `catalog` layout component CSS[^\n]*\| \u2264 1\.75 kB \| 1\.75 kB \| 2 kB \|$/m);
    // a ceiling that went up is a red line: the largest of the four fits under its own ceiling, which is below the 4 KiB bundle
    expect(budgets.find((b) => b.name === "catalog layout CSS (each)").max).toBeLessThan(4096);
  });

  it("has a row for the timeline chunk (it was core's, the same ideal and ceiling) and a new one for the sidebar chunk (decision 32), and none for a timeline chunk of core", () => {
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: timeline")).toEqual({ name: "catalog JS lazy chunk: timeline", file: "packages/catalog/dist/timeline.min.js", ideal: 2048, max: 3072 });
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: sidebar")).toEqual({ name: "catalog JS lazy chunk: sidebar", file: "packages/catalog/dist/sidebar.min.js", ideal: 768, max: 1024 });
    expect(budgets.find((b) => /core JS lazy chunk: timeline/.test(b.name))).toBeUndefined();
    expect(principles).toMatch(/^\| `catalog` JS lazy chunk: `timeline`[^\n]*\| 3 kB \|$/m);
    expect(principles).toMatch(/^\| `catalog` JS lazy chunk: `sidebar`[^\n]*\| 1 kB \|$/m);
    expect(principles).not.toMatch(/^\| `core` JS lazy chunk: `timeline`/m);
  });

  it("brings the ceiling of core's CSS down with the four components (12 kB and 15 kB to 8.75 kB and 11.5 kB), and the core entry keeps its 8 kB", () => {
    expect(budgets.find((b) => b.name === "core CSS")).toMatchObject({ ideal: 8960, max: 11776 });
    expect(principles).toMatch(/^\| `core` CSS \| \u2014 \| \u2264 8\.75 kB \| 8\.75 kB \| 11\.5 kB \|$/m);
    expect(budgets.find((b) => b.file === "packages/core/dist/luz.min.js").max).toBe(8192);
  });

  it("the ceiling of a catalog component is below the 4 KiB the bundle had: no ceiling went up (RL-17)", () => {
    expect(budgets.find((b) => b.name === "catalog component CSS (each)").max).toBeLessThan(4096);
  });

  /** Whether a repo-relative file is named by a budget glob: `dir/*.ext`, `dir/{a,b}-*.ext` or `dir/{a-*,b}.ext`. */
  const named = (file, glob) => {
    const [, dir, list, ext] = /^(.*)\/(?:\{([^}]+)\}|\*)(\.[a-z.]+|-\*\.[a-z.]+)$/.exec(glob) ?? [];
    if (!dir || file.slice(0, dir.length + 1) !== `${dir}/`) return false;
    const name = file.slice(dir.length + 1);
    if (list === undefined) return name.endsWith(ext.replace(/^-\*/, ""));
    const dashed = ext.startsWith("-*"); // {a,b}-*.ext: a name starting "a-" or "b-"
    const suffix = ext.replace(/^-\*/, "");
    return list.split(",").some((item) => (dashed ? name.startsWith(`${item}-`) && name.endsWith(suffix) : item.endsWith("-*") ? name.startsWith(item.slice(0, -1)) && name.endsWith(suffix) : name === `${item}${suffix}`));
  };

  it("every built catalog component is in exactly one row, and fits that row's ceiling, gzipped and minified", () => {
    const dir = join(repo, "packages/catalog/dist/components");
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".min.css")) : [];
    expect(files.length).toBeGreaterThan(0);
    const rows = budgets.filter((b) => b.glob?.startsWith("packages/catalog/dist/components/"));
    for (const f of files) {
      const path = `packages/catalog/dist/components/${f}`;
      const mine = rows.filter((row) => named(path, row.glob) && !(row.except && named(path, row.except)));
      expect(mine.map((row) => row.name), `${f} is in one row only`).toHaveLength(1);
      expect(sizeOf(path), `${f} against ${mine[0].name}`).toBeLessThanOrEqual(mine[0].max);
    }
  });

  it("puts navbar, sidebar, terminal and timeline in the layout row, the 20 patterns in theirs, and the six elements in the general one", () => {
    const rows = budgets.filter((b) => b.glob?.startsWith("packages/catalog/dist/components/"));
    const rowOf = (name) => rows.find((row) => named(`packages/catalog/dist/components/${name}.min.css`, row.glob) && !(row.except && named(`packages/catalog/dist/components/${name}.min.css`, row.except)))?.name;
    for (const name of ["navbar", "sidebar", "terminal", "timeline"]) expect(rowOf(name), name).toBe("catalog layout CSS (each)");
    for (const name of ["hero", "site-header", "masthead", "site-footer", "app-bar", "page-rail", "article"]) expect(rowOf(name), name).toBe("catalog kind patterns CSS (each)");
    for (const name of ["search", "cookie-consent", "theme-time", "lang-switch", "submenu", "announcement"]) expect(rowOf(name), name).toBe("catalog component CSS (each)");
    // the old file names are in no row at all
    for (const name of ["landing-hero", "cms-header", "app-header", "docs-rail", "consent", "mode", "color-mode", "banner"]) expect(rowOf(name) === "catalog kind patterns CSS (each)", `${name} is not a pattern file`).toBe(false);
  });

  it("keeps the budgets and the PRINCIPLES table in step, as check-size does", () => {
    const run = spawnSync(process.execPath, [join(repo, "scripts/check-size.js")], { encoding: "utf-8" });
    expect(run.stderr).not.toMatch(/PRINCIPLES\.md budget table/);
  });
});

/* ---- The rows F5 adds (.claude/plans/specs/f5-ai-ready.md section 9) ---- */

describe("the AI-ready rows of budgets.json and PRINCIPLES.md section 8", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const principles = read("PRINCIPLES.md").split("\n");
  const KiB = 1024;
  const kib = (cell) => Math.round(parseFloat(cell.replace(/^\u2264\s*/, "")) * KiB);
  const header = principles.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
  const table = principles
    .slice(header + 2)
    .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const last = "docs page HTML (each, uncompressed)";

  /** The ceilings committed before F5: RL-17, never raised, never removed. */
  const BEFORE = [
    ["tokens CSS", 5 * KiB],
    // F7: the four layout components left core, and its ceiling went down with them (15 KiB to 11.5 KiB); a ceiling that only goes down
    ["core CSS", 11.5 * KiB],
    // The classless file went into luz.css (the bare elements need no attribute); luz.conditional.css, the same sheet with the reset and the elements inside [data-luz], takes its place with the ceiling of core CSS
    ["core conditional CSS (luz.css with the reset and the elements inside [data-luz])", 11.5 * KiB],
    ["core JS (entry, lazy chunks excluded)", 8 * KiB],
    ["core JS lazy chunk: midi", 4 * KiB],
    ["core JS lazy chunk: table-sort", 2 * KiB],
    // F5a: catalog has no bundle, so the 4 KiB row that limited its total goes and each file gets a ceiling below it
    ["catalog component CSS (each)", 1.5 * KiB],
    ["catalog JS", 2 * KiB],
    ["catalog JS lazy chunk: search", 2.5 * KiB],
    ["catalog JS lazy chunk: cookie-consent", 1.5 * KiB],
    // F7: the timeline chunk is catalog's now, with core's ideal and ceiling; the sidebar chunk and the row of the four layout stylesheets are new
    ["catalog JS lazy chunk: timeline", 3 * KiB],
    ["catalog JS lazy chunk: sidebar", 1 * KiB],
    ["catalog layout CSS (each)", 2 * KiB],
    // F5b: the rows `landing CSS` (2 KiB), `cms CSS` (4 KiB), `app CSS` (2 KiB) and `docs CSS` (4 KiB) went with their
    // packages; each of the 21 patterns has a ceiling of 1 KiB, below the smallest of them (a ceiling that goes down, never up)
    ["catalog kind patterns CSS (each)", 1 * KiB],
    [last, 80 * KiB],
  ];

  it("keeps the ceiling of every row that existed, and its place at the top of the list", () => {
    expect(budgets.slice(0, BEFORE.length).map((b) => [b.name, b.max])).toEqual(BEFORE);
  });

  it("appends the three AI-ready rows after the docs page row, then the language chunk row (F6), the rows of the color mode (core's chunk and boot script, catalog's time chunk, bar chunk and boot script), the three rows of the home's light (F3), then the prompts row (F1 of the kinds plan), then the debug page row, and nothing else (no docs CSS row since F5b)", () => {
    expect(budgets).toHaveLength(BEFORE.length + 14);
    expect(budgets.at(BEFORE.length - 1).name).toBe(last);
    expect(budgets.slice(BEFORE.length + 3).map((b) => b.name)).toEqual([
      "core JS lazy chunk: i18n-es",
      "core JS lazy chunk: theme-mode",
      "core theme-boot script (packages/core/dist/theme-boot.min.js)",
      "catalog JS lazy chunk: theme-time",
      "catalog JS lazy chunk: theme-time-bar",
      "catalog theme-time-boot script (packages/catalog/dist/theme-time-boot.min.js)",
      "home light controller JS",
      "home light visual: globe",
      "home light data: globe",
      "prompts (each, uncompressed)",
      "debug page HTML (docs/debug/index.html, uncompressed)",
    ]);
  });

  it("measures the debug page by a row of its own: docs/debug/*.html, uncompressed, ideal 230 KiB, ceiling 240 KiB, and takes it out of the docs page row, whose ceiling stays 80 KiB (RL-17)", () => {
    const docs = budgets.find((b) => b.name === last);
    expect(docs).toMatchObject({ glob: "docs/**/*.html", except: "docs/debug/*.html", compression: "none", max: 80 * KiB });
    // the row of the debug page is the last one, and the only one with that glob
    expect(budgets.at(-1)).toEqual({
      name: "debug page HTML (docs/debug/index.html, uncompressed)",
      glob: "docs/debug/*.html",
      compression: "none",
      ideal: 230 * KiB,
      max: 240 * KiB,
    });
    expect(budgets.filter((b) => b.glob === "docs/debug/*.html")).toHaveLength(1);
    // the exception names exactly the glob of the row that measures what it takes out: one file is in one row
    expect(docs.except).toBe(budgets.at(-1).glob);
    const cells = table.at(-1);
    expect(cells[0]).toMatch(/debug page/i);
    expect(cells[0]).toContain("docs/debug/index.html");
    expect(kib(cells.at(-1))).toBe(240 * KiB);
    expect(kib(cells[2])).toBe(230 * KiB);
  });

  it("budgets the check CLI bundle, gzipped: ideal 36 KiB, ceiling 40 KiB", () => {
    // Fixed once on 2026-10-15 from the measured 33,899 B; never raised afterwards (RL-17).
    // The row was created from an estimate (16 / 24 KiB) before it ever shipped; no released ceiling moved.
    expect(budgets[BEFORE.length]).toEqual({
      name: "check CLI (packages/check/dist/luz-check.js)",
      file: "packages/check/dist/luz-check.js",
      ideal: 36 * KiB,
      max: 40 * KiB,
    });
  });

  it("budgets llms.txt and llms-full.txt, each uncompressed: ideal 400 KiB, ceiling 448 KiB", () => {
    // Ideal re-fixed once on 2026-10-15 after the F5 pages (was 384 KiB); the ceiling is unchanged and never raised (RL-17).
    expect(budgets[BEFORE.length + 1]).toEqual({
      name: "llms.txt and llms-full.txt (each, uncompressed)",
      glob: "docs/**/*.txt",
      compression: "none",
      ideal: 400 * KiB,
      max: 448 * KiB,
    });
  });

  it("budgets the manifests on Pages, each uncompressed: ideal 48 KiB, ceiling 64 KiB", () => {
    expect(budgets[BEFORE.length + 2]).toEqual({
      name: "manifests (each, uncompressed)",
      glob: "docs/manifests/**/*.json",
      compression: "none",
      ideal: 48 * KiB,
      max: 64 * KiB,
    });
  });

  it("has no row of the docs package, and no row of landing, cms or app: their packages are gone, and the patterns share one row", () => {
    for (const name of ["docs CSS", "landing CSS", "cms CSS", "app CSS"]) expect(budgets.find((b) => b.name === name), name).toBeUndefined();
    expect(budgets[BEFORE.length - 2]).toMatchObject({ name: "catalog kind patterns CSS (each)", ideal: 768, max: 1024 });
    expect(budgets[BEFORE.length - 2].glob, "the 20 blocks by name, no `{landing,cms,app,docs}-*` prefix list (F8)").toMatch(/^packages\/catalog\/dist\/components\/\{[a-z,-]+\}\.min\.css$/);
    expect(budgets[BEFORE.length - 2].glob).not.toContain("*");
  });

  it("has the row of the patterns in the PRINCIPLES.md table right after the layout row, with the same ideal and ceiling, and no row of the four packages", () => {
    expect(table[BEFORE.length - 3][0], "the row before it").toMatch(/^Each `catalog` layout component CSS/);
    expect(table[BEFORE.length - 6][0], "three rows before that").toMatch(/^`catalog` JS lazy chunk: `cookie-consent`/);
    expect(table[BEFORE.length - 5][0]).toMatch(/^`catalog` JS lazy chunk: `timeline`/);
    expect(table[BEFORE.length - 4][0]).toMatch(/^`catalog` JS lazy chunk: `sidebar`/);
    const [name, floor, ideal, , ceiling] = table[BEFORE.length - 2];
    expect(name).toMatch(/^Each pattern of a kind of site in `catalog`/);
    expect(floor).toBe("\u2014");
    expect(ideal).toBe("\u2264 0.75 kB");
    expect(ceiling).toBe("1 kB");
    expect(table.filter(([cell]) => /^`(?:landing|cms|app|docs)` CSS/.test(cell))).toEqual([]);
  });

  it("repeats the rows in the PRINCIPLES.md table, in the same order, after \"Each docs page\"", () => {
    expect(table).toHaveLength(BEFORE.length + 14);
    expect(table[BEFORE.length - 1][0]).toMatch(/^Each docs page/);
    const [cli, text, manifests] = table.slice(BEFORE.length);
    expect(cli[0]).toMatch(/check/);
    expect(cli[0]).toMatch(/luz-check\.js/);
    expect(text[0]).toMatch(/llms\.txt/);
    expect(text[0]).toMatch(/llms-full\.txt/);
    expect(manifests[0]).toMatch(/manifests/i);
  });

  it("states in the table the same ceilings and ideals as budgets.json (the units are the table's own)", () => {
    const kib = (cell) => Math.round(parseFloat(cell) * KiB);
    const rows = table.slice(BEFORE.length);
    expect(rows.map((cells) => kib(cells.at(-1)))).toEqual(budgets.slice(BEFORE.length).map((b) => b.max));
    // column 2 is the ideal ("≤ 36 kB"), column 3 where the warning starts
    expect(rows.map((cells) => kib(cells[2].replace(/^≤\s*/, "")))).toEqual(budgets.slice(BEFORE.length).map((b) => b.ideal));
  });
});

/* ---- The language chunks of core (F6, f6-languages.md 3, 4 and the review answers) ---- */

describe("the language chunks of core", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const lines = read("PRINCIPLES.md").split("\n");
  const header = lines.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
  const table = lines
    .slice(header + 2)
    .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const KiB = 1024;
  const kib = (cell) => Math.round(parseFloat(cell.replace(/^\u2264\s*/, "")) * KiB);
  const present = (path) => {
    expect(existsSync(join(repo, path)), `${path} is built: run pnpm core:build`).toBe(true);
    return read(path);
  };

  it("budgets i18n-es as the row after the AI-ready ones, the one before the mode chunks: ideal 0.75 kB, ceiling 1 kB, fixed once and never raised (RL-17)", () => {
    // The spec's estimate was 510 B gzip for the 25 keys; x1.5 the ideal, x2 the ceiling, the proportion of table-sort
    expect(budgets.find((b) => b.name === "core JS lazy chunk: i18n-es")).toEqual({
      name: "core JS lazy chunk: i18n-es",
      file: "packages/core/dist/i18n-es.min.js",
      ideal: 768,
      max: 1024,
    });
  });

  it("repeats it in the PRINCIPLES.md table, before the theme-mode chunk row: warns above 0.75 kB, ceiling 1 kB", () => {
    const at = table.findIndex((cells) => /^`core` JS lazy chunk: `i18n-es`/.test(cells[0]));
    const last = table[at];
    expect(at, "the i18n-es row is in the table").toBeGreaterThan(-1);
    expect(table[at + 1][0], "the row after it").toMatch(/^`core` JS lazy chunk: `theme-mode`/);
    expect(last[1]).toBe("\u2014");
    expect(kib(last[2])).toBe(768);
    expect(kib(last[3])).toBe(768);
    expect(kib(last.at(-1))).toBe(1024);
    expect(table).toHaveLength(budgets.length);
  });

  // Different zlib builds gzip the same input a few bytes apart (CI: 8,181 B, local: 8,179 B); the invariant is the 8,192 B ceiling.
  const ENTRY_BEFORE_F6 = 8179 + 8;

  it("keeps the ceiling of the entry at 8 kB and the entry no larger than before F6 (8,179 B gzip, plus a few bytes of zlib difference), under 8,192", () => {
    expect(budgets.find((b) => b.file === "packages/core/dist/luz.min.js").max).toBe(8192);
    const size = sizeOf("packages/core/dist/luz.min.js");
    expect(size).toBeLessThanOrEqual(ENTRY_BEFORE_F6);
    expect(size).toBeLessThan(8192);
  });

  it("the language file is a chunk: it imports nothing, static or dynamic, and fits its ceiling", () => {
    const code = present("packages/core/dist/i18n-es.min.js");
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(code.match(IMPORT_CALL)).toBeNull();
    expect(sizeOf("packages/core/dist/i18n-es.min.js")).toBeLessThanOrEqual(1024);
  });

  it.each(["luz.min.js", "i18n.min.js"])("%s loads it by a literal specifier, and every import() in it is a literal", (name) => {
    const code = present(`packages/core/dist/${name}`);
    expect(dynamicTargets(code)).toContain("./i18n-es.min.js");
    expect(code.match(IMPORT_CALL)?.length ?? 0, "an import() whose argument is not a literal").toBe(dynamicTargets(code).length);
  });

  it("the sources follow: i18n.js names the language file as a literal, in the one file the module is", () => {
    // comments out: the explanation of a rule may say "import()" without calling it
    const source = read("packages/core/src/i18n.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(dynamicTargets(source)).toEqual(["./i18n-es.js"]);
    expect(source.match(IMPORT_CALL)).toHaveLength(1);
    expect(source).not.toMatch(/^import\b/m);
    expect(source).not.toMatch(/import\.meta/);
  });

  it("every file a minified core module loads lazily has a row of its own", () => {
    const rows = new Set(budgets.filter((b) => b.file).map((b) => b.file));
    const dist = join(repo, "packages/core/dist");
    const files = readdirSync(dist).filter((f) => f.endsWith(".min.js"));
    expect(files).toContain("i18n-es.min.js");
    for (const name of files) {
      for (const target of dynamicTargets(read(`packages/core/dist/${name}`))) {
        expect(rows.has(`packages/core/dist/${target.slice(2)}`), `${name} loads ${target}, which has no row in budgets.json`).toBe(true);
      }
    }
  });
});

/* ---- The guard on a temporary copy ------------------------------------- */

const LOADER =
  'document.querySelector("luz-search")&&import("./search.min.js");document.querySelector("luz-cookie-consent")&&import("./cookie-consent.min.js");document.querySelector("luz-theme-time")&&import("./theme-time.min.js");document.querySelector("luz-theme-time[variant=bar]")&&import("./theme-time-bar.min.js");' +
  'document.querySelector("luz-timeline")&&import("./timeline.min.js");document.querySelector(".luz-sidebar")&&import("./sidebar.min.js");';
const CHUNK = (tag) => `customElements.get("${tag}")||customElements.define("${tag}",class extends HTMLElement{});`;

describe("scripts/check-size.js on a copy of the repository", () => {
  let dir;

  /** A repository with the seven catalog files; `files` overrides the content of any of them. */
  function build(files = {}) {
    const content = { "catalog.min.js": LOADER, "search.min.js": CHUNK("luz-search"), "cookie-consent.min.js": CHUNK("luz-cookie-consent"), "theme-time.min.js": CHUNK("luz-theme-time"), "theme-time-bar.min.js": "/* a chunk with no element */", "timeline.min.js": CHUNK("luz-timeline"), "sidebar.min.js": "/* a chunk with no element */", ...files };
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "packages/catalog/dist"), { recursive: true });
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    const rows = Object.keys(content).map((name, i) => ({ name: `catalog JS row ${i}`, file: `packages/catalog/dist/${name}`, max: 2048 }));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: rows }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", ...rows.map((r) => `| ${r.name} | - | - | - | 2 kB |`)].join("\n") + "\n",
    );
    for (const [name, code] of Object.entries(content)) writeFileSync(join(dir, "packages/catalog/dist", name), code);
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes a loader that imports only its six chunks by literal specifiers, and chunks that import nothing", () => {
    const { status, output } = build();
    expect(output).not.toMatch(/✗/);
    expect(status).toBe(0);
  });

  it("fails a loader with a static import", () => {
    const { status, output } = build({ "catalog.min.js": `import "./search.min.js";${LOADER}` });
    expect(status).toBe(1);
    expect(output).toMatch(/catalog\.min\.js/);
  });

  it.each(["./consent.min.js", "./mode.min.js", "./color-mode.min.js"])("fails a loader that still imports %s, the F5b name of a chunk that is renamed (the chunk list is the new one)", (old) => {
    const { status, output } = build({ "catalog.min.js": `${LOADER}import("${old}");` });
    expect(status).toBe(1);
    expect(output).toContain(old.slice(2));
  });

  it("fails a loader that imports a file other than the six chunks", () => {
    const { status, output } = build({ "catalog.min.js": `${LOADER}import("./other.min.js");` });
    expect(status).toBe(1);
    expect(output).toMatch(/other\.min\.js/);
  });

  it.each(["search", "cookie-consent", "theme-time", "theme-time-bar", "timeline", "sidebar"])("fails a loader that is missing the %s chunk", (missing) => {
    const loader = LOADER.split(";").filter((part) => part && !part.includes(`./${missing}.min.js`)).join(";") + ";";
    expect(loader).not.toContain(`./${missing}.min.js`);
    const { status, output } = build({ "catalog.min.js": loader });
    expect(status).toBe(1);
    expect(output).toContain(`${missing}.min.js`);
  });

  it.each([
    ["a variable", `${LOADER}import(location.hash.slice(1));`],
    ["a concatenation", `${LOADER}import("./"+document.title+".min.js");`],
    ["a template literal with a value", `${LOADER}import(\`./\${document.title}.min.js\`);`],
  ])("fails an import() whose argument is %s, and says it is not a literal", (_, code) => {
    const { status, output } = build({ "catalog.min.js": code });
    expect(status).toBe(1);
    expect(output).toMatch(/literal/i);
  });

  it.each([
    ["a static import", 'import "./x.min.js";'],
    ["a dynamic import", 'import("./cookie-consent.min.js");'],
    ["a re-export", 'export * from "./x.min.js";'],
  ])("fails a chunk with %s", (_, code) => {
    const { status, output } = build({ "search.min.js": `${CHUNK("luz-search")}${code}` });
    expect(status).toBe(1);
    expect(output).toMatch(/search\.min\.js/);
  });

  it.each(["theme-time", "theme-time-bar", "timeline", "sidebar"])("fails the %s chunk with an import, as any other chunk", (name) => {
    const { status, output } = build({ [`${name}.min.js`]: `${CHUNK(`luz-${name}`)}import("./x.min.js");` });
    expect(status).toBe(1);
    expect(output).toContain(`${name}.min.js`);
  });

  it("still fails a bare specifier in a chunk (red line 1)", () => {
    const { status, output } = build({ "cookie-consent.min.js": `import "lit";${CHUNK("luz-cookie-consent")}` });
    expect(status).toBe(1);
    expect(output).toMatch(/"lit"/);
  });

  it("the copy reads its own files, not the repository's", () => {
    build();
    expect(existsSync(join(dir, "packages/catalog/dist/catalog.min.js"))).toBe(true);
  });
});

/* ---- F5b: a row for the patterns of the kinds of site, and `except` on the general one ----------------- */

describe("scripts/check-size.js on a copy of the repository, with the patterns of the kinds of site in catalog", () => {
  let dir;
  /** `n` random bytes: they do not compress, so the gzip size of a file is about `n` whatever the zlib. */
  const noise = (n) => randomBytes(n);
  const COMPONENTS = "packages/catalog/dist/components";
  const ROWS = [
    { name: "catalog component CSS (each)", glob: `${COMPONENTS}/*.min.css`, except: `${COMPONENTS}/{landing,cms,app,docs}-*.min.css`, ideal: 1280, max: 1536 },
    { name: "catalog kind patterns CSS (each)", glob: `${COMPONENTS}/{landing,cms,app,docs}-*.min.css`, ideal: 768, max: 1024 },
  ];

  /** A repository with the two rows and the given files (name -> size of its noise); returns the exit status and the output. */
  function build(files) {
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, COMPONENTS), { recursive: true });
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: ROWS }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", "| Each component | - | \u2264 1.25 kB | 1.25 kB | 1.5 kB |", "| Each pattern | - | \u2264 0.75 kB | 0.75 kB | 1 kB |"].join("\n") + "\n",
    );
    for (const [name, size] of Object.entries(files)) writeFileSync(join(dir, COMPONENTS, name), noise(size));
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-kinds-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes a component under the general ceiling and patterns under theirs", () => {
    const { status, output } = build({ "search.min.css": 1200, "landing-hero.min.css": 700, "docs-shell.min.css": 600 });
    expect(output).not.toMatch(/\u2717/);
    expect(status).toBe(0);
  });

  it("holds a pattern to the ceiling of its own row: a file of 1.2 kB fits the general row (1.5 kB) and fails the 1 kB of the patterns, and names the file", () => {
    const { status, output } = build({ "search.min.css": 1200, "cms-header.min.css": 1200 });
    expect(status).toBe(1);
    expect(output).toMatch(/catalog kind patterns CSS \(each\): [^\n]*cms-header\.min\.css[^\n]*over the ceiling/);
    expect(output).not.toMatch(/search\.min\.css[^\n]*\u2717|\u2717[^\n]*search\.min\.css/);
  });

  it("leaves a pattern out of the general row (`except`): one file is in one row only", () => {
    // 1.3 kB of gzip fits the general row and not the patterns' row; if the general row counted it, the output would hold its name twice
    const { output } = build({ "app-header.min.css": 1200, "search.min.css": 300 });
    expect(output.match(/app-header\.min\.css/g)?.length ?? 0).toBeGreaterThan(0);
    const generalRow = output.split("\n").filter((line) => line.includes("catalog component CSS (each)"));
    expect(generalRow.join("\n")).not.toContain("app-header.min.css");
  });

  it("reads the prefix list as `<kind>-`: landing.min.css and a component of another name stay in the general row", () => {
    const { status, output } = build({ "landing.min.css": 1200, "docs.min.css": 1200, "mode.min.css": 300, "docs-shell.min.css": 300 });
    expect(output).not.toMatch(/\u2717/);
    expect(status).toBe(0);
  });
});

describe("scripts/check-size.js on a copy of the repository, with the patterns of catalog as a list of block names (F8)", () => {
  let dir;
  const noise = (n) => randomBytes(n);
  const COMPONENTS = "packages/catalog/dist/components";
  const LIST = "site-header,masthead,hero,page-rail";
  const ROWS = [
    { name: "catalog component CSS (each)", glob: `${COMPONENTS}/*.min.css`, except: `${COMPONENTS}/{${LIST}}.min.css`, ideal: 1280, max: 1536 },
    { name: "catalog kind patterns CSS (each)", glob: `${COMPONENTS}/{${LIST}}.min.css`, ideal: 768, max: 1024 },
  ];

  function build(files) {
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, COMPONENTS), { recursive: true });
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: ROWS }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", "| Each component | - | \u2264 1.25 kB | 1.25 kB | 1.5 kB |", "| Each pattern | - | \u2264 0.75 kB | 0.75 kB | 1 kB |"].join("\n") + "\n",
    );
    for (const [name, size] of Object.entries(files)) writeFileSync(join(dir, COMPONENTS, name), noise(size));
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-names-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("holds a file of the list to the ceiling of the patterns' row, by its whole name", () => {
    const { status, output } = build({ "search.min.css": 1200, "hero.min.css": 1200 });
    expect(status).toBe(1);
    expect(output).toMatch(/catalog kind patterns CSS \(each\): [^\n]*hero\.min\.css[^\n]*over the ceiling/);
  });

  it("leaves a name that is only like one of the list in the general row: `hero-extra.min.css` and `site.min.css` are not `hero` nor `site-header`", () => {
    const { status, output } = build({ "hero.min.css": 300, "hero-extra.min.css": 1200, "site.min.css": 1200, "page.min.css": 1200 });
    expect(output).not.toMatch(/\u2717/);
    expect(status).toBe(0);
  });

  it("puts a file of the list in one row only: it is out of the general row (`except` takes the same list)", () => {
    const { output } = build({ "masthead.min.css": 1000, "search.min.css": 300 });
    const general = output.split("\n").filter((line) => line.includes("catalog component CSS (each)")).join("\n");
    expect(general).not.toContain("masthead.min.css");
    expect(output).toContain("masthead.min.css");
  });
});

describe("scripts/check-size.js on a copy of the repository, with a language chunk of core", () => {
  let dir;
  const ENTRY = 'document.querySelector("th[data-luz-sort]")&&import("./table-sort.min.js");document.documentElement.lang&&import("./i18n-es.min.js");';
  const SORT = "export function initTableSort(){}";
  const LANGUAGE = 'export default{play:"Reproducir",pause:"Pausar"};';

  /** A repository with core's three files; `files` overrides any; `unbudgeted` lists files without a row. */
  function build(files = {}, unbudgeted = []) {
    const content = { "luz.min.js": ENTRY, "table-sort.min.js": SORT, "i18n-es.min.js": LANGUAGE, ...files };
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "packages/core/dist"), { recursive: true });
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    const rows = Object.keys(content)
      .filter((name) => !unbudgeted.includes(name))
      .map((name, i) => ({ name: `core JS row ${i}`, file: `packages/core/dist/${name}`, max: 2048 }));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: rows }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", ...rows.map((r) => `| ${r.name} | - | - | - | 2 kB |`)].join("\n") + "\n",
    );
    for (const [name, code] of Object.entries(content)) writeFileSync(join(dir, "packages/core/dist", name), code);
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-core-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes an entry that loads its language by a literal, and a language that is only data", () => {
    const { status, output } = build();
    expect(output).not.toMatch(/\u2717/);
    expect(status).toBe(0);
  });

  it("fails a language chunk that imports another file, dynamically", () => {
    const { status, output } = build({ "i18n-es.min.js": `import("./table-sort.min.js");${LANGUAGE}` });
    expect(status).toBe(1);
    expect(output).toMatch(/i18n-es\.min\.js/);
  });

  it("fails a language chunk with a static import, and with a re-export", () => {
    for (const code of ['import "./table-sort.min.js";', 'export * from "./table-sort.min.js";']) {
      const { status, output } = build({ "i18n-es.min.js": `${code}${LANGUAGE}` });
      expect(status, code).toBe(1);
      expect(output, code).toMatch(/i18n-es\.min\.js/);
    }
  });

  it("fails a language chunk that has no budget row, and says which", () => {
    const { status, output } = build({}, ["i18n-es.min.js"]);
    expect(status).toBe(1);
    expect(output).toMatch(/i18n-es\.min\.js[^\n]*no budget/);
  });

  it("fails a language chosen by the page: an import() built from the language is not a literal (SEC-CHUNK-1)", () => {
    const { status, output } = build({ "luz.min.js": `${ENTRY}import("./i18n-"+document.documentElement.lang+".min.js");` });
    expect(status).toBe(1);
    expect(output).toMatch(/literal/i);
  });
});


/* ---- The home's light: apps/landing/light/ (F3, SEC-CHUNK-1 and SEC-CHUNK-2) ---- */

describe("scripts/check-size.js on a copy of the repository, with the home's light", () => {
  let dir;
  // light.js loads globe.js; globe.js is a loader and a chunk at once, it loads globe-data.js; globe-data.js imports nothing
  const LIGHT = 'const load=()=>import("./globe.js");customElements.get("home-light")||customElements.define("home-light",class extends HTMLElement{});';
  const GLOBE = 'const land=()=>import("./globe-data.js");customElements.get("home-globe")||customElements.define("home-globe",class extends HTMLElement{});';
  const DATA = 'export default{land:"AAAA"};';

  /** A repository with the three files of the light; `files` overrides any of them or adds one (a budgeted file). */
  function build(files = {}) {
    const content = { "light.js": LIGHT, "globe.js": GLOBE, "globe-data.js": DATA, ...files };
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "apps/landing/light"), { recursive: true });
    mkdirSync(join(dir, "packages"), { recursive: true }); // check-size reads the packages of the repository: none here
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    const rows = Object.keys(content).map((name, i) => ({ name: `home light row ${i}`, file: `apps/landing/light/${name}`, max: 2048 }));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: rows }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", ...rows.map((r) => `| ${r.name} | - | - | - | 2 kB |`)].join("\n") + "\n",
    );
    for (const [name, code] of Object.entries(content)) writeFileSync(join(dir, "apps/landing/light", name), code);
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-light-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes light.js that loads only globe.js, globe.js that loads only globe-data.js, and a globe-data.js that imports nothing", () => {
    const { status, output } = build();
    expect(output).not.toMatch(/\u2717/);
    expect(status).toBe(0);
  });

  it("fails light.js with an import() of another file", () => {
    const { status, output } = build({ "light.js": `${LIGHT}import("./other.js");`, "other.js": "export default 1;" }); // budgeted, so only SEC-CHUNK-1 can object
    expect(status).toBe(1);
    expect(output).toContain("other.js");
  });

  it("fails light.js with a static import", () => {
    const { status, output } = build({ "light.js": `import "./globe.js";${LIGHT}` }); // globe.js is budgeted, so only SEC-CHUNK-2 can object
    expect(status).toBe(1);
    expect(output).toMatch(/light\.js/);
  });

  it.each([
    ["a variable", `${LIGHT}import(location.hash.slice(1));`],
    ["a concatenation", `${LIGHT}import("./"+document.title+".js");`],
    ["a template literal with a value", `${LIGHT}import(\`./\${document.title}.js\`);`],
  ])("fails an import() in light.js whose argument is %s, and says it is not a literal", (_, code) => {
    const { status, output } = build({ "light.js": code });
    expect(status).toBe(1);
    expect(output).toMatch(/literal/i);
  });

  it("fails a light.js that does not load globe.js", () => {
    const { status, output } = build({ "light.js": 'customElements.get("home-light")||customElements.define("home-light",class extends HTMLElement{});' });
    expect(status).toBe(1);
    expect(output).toContain("globe.js");
  });

  it("fails a globe.js that does not load globe-data.js", () => {
    const { status, output } = build({ "globe.js": 'customElements.get("home-globe")||customElements.define("home-globe",class extends HTMLElement{});' });
    expect(status).toBe(1);
    expect(output).toContain("globe-data.js");
  });

  it("fails a globe.js with an import() of another file", () => {
    const { status, output } = build({ "globe.js": `${GLOBE}import("./other.js");`, "other.js": "export default 1;" }); // budgeted, so only SEC-CHUNK-1 can object
    expect(status).toBe(1);
    expect(output).toMatch(/globe\.js[^\n]*other\.js|other\.js[^\n]*globe\.js/);
  });

  it("fails a globe.js with a static import of globe-data.js: the land is loaded lazily, never with the code", () => {
    const { status, output } = build({ "globe.js": `import "./globe-data.js";${GLOBE}` });
    expect(status).toBe(1);
    expect(output).toMatch(/globe\.js/);
  });

  it("fails an import() in globe.js whose argument is not a literal, and says so", () => {
    const { status, output } = build({ "globe.js": `${GLOBE}import("./"+document.title+".js");` });
    expect(status).toBe(1);
    expect(output).toMatch(/literal/i);
  });

  it.each([
    ["a static import", 'import "./x.js";'],
    ["a dynamic import", 'import("./x.js");'],
    ["a re-export", 'export * from "./x.js";'],
  ])("fails globe-data.js with %s", (_, code) => {
    // x.js has a budget row, so only SEC-CHUNK-2 can object
    const { status, output } = build({ "globe-data.js": `${DATA}${code}`, "x.js": "export default 1;" });
    expect(status).toBe(1);
    expect(output).toMatch(/globe-data\.js/);
  });

  it("fails globe-data.js that imports a bare specifier (red line 1)", () => {
    const { status, output } = build({ "globe-data.js": `import "lit";${DATA}` });
    expect(status).toBe(1);
    expect(output).toMatch(/globe-data\.js/);
  });
});
