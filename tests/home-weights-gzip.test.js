/**
 * The home's weights are the same on every machine. Node's zlib is Chromium's
 * fork, whose output changes a few bytes with the CPU, so a build on the hosted
 * runner wrote other figures than a local one. scripts/docs-site/site.js
 * measures with the system `gzip -9 -n`
 * and falls back to node's zlib only where there is no such program.
 *
 *  - the source: the weights go through one function that runs `gzip` with
 *    `-9` and `-n`, falls back to zlib, and nothing else compresses.
 *  - the page: the meter of each package on docs/index.html holds exactly the
 *    bytes `gzip -9 -n -c` gives for the budgeted files of its dist (skipped
 *    without dist/ or without a gzip program).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BASE } from "../scripts/luz-packages.js";
import { PATTERNS } from "./helpers/catalog-names.js";
import { findAll, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("scripts/docs-site/site.js: the weights are measured with the system gzip", () => {
  const js = code(read("scripts/docs-site/site.js"));

  it("runs the gzip program with -9 and -n", () => {
    expect(js).toMatch(/execFileSync\(\s*"gzip"\s*,\s*\[[^\]]*"-9"[^\]]*\]/);
    expect(js).toMatch(/execFileSync\(\s*"gzip"\s*,\s*\[[^\]]*"-n"[^\]]*\]/);
  });

  it("falls back to node's zlib where there is no gzip program", () => {
    expect(js).toMatch(/import\s*\{[^}]*\bgzipSync\b[^}]*\}\s*from\s*"node:zlib"/);
    expect(js).toMatch(/catch\s*(\([^)]*\))?\s*\{[^}]*gzipSync\(/);
  });

  it("measures every weight of the home through that one function", () => {
    const calls = js.match(/\bgzipSync\(/g) ?? [];
    expect(calls).toHaveLength(1);
    // a package weighs the sum of its budgeted files, and of the files a glob row matches (catalog has no
    // bundle: it weighs its components), both measured by gzipBytes
    expect(js).toMatch(/function renderWeights[\s\S]*?\b(?:gzipBytes|packageBytes)\(/);
    expect(js).toMatch(/function levelWeights[\s\S]*?\b(?:gzipBytes|packageBytes)\(/);
    expect(js).toMatch(/function packageBytes[\s\S]*?\bgzipBytes\(/);
  });
});

function hasGzip() {
  try {
    execFileSync("gzip", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const budgets = JSON.parse(read("budgets.json")).budgets;
// The budgeted files of a package: the rows with a `file`, and the files a `glob` row of its dist matches
// (`dir/*.ext`): catalog has no bundle, so its weight is the sum of its components. The patterns of the
// kinds of site (the 20 blocks `components/{hero,site-header,…}.min.css`, F8; `{landing,cms,app,docs}-*` before) are catalog files too, but the home
// weighs the pieces every site can use: they are left out, as they were when each kind was a package of its own
const KIND_PATTERN = new RegExp(`/components/(?:${PATTERNS.join("|")})(?:\\.min)?\\.css$`);
const globbed = (glob) => {
  // A row of the patterns of the kinds (a list of block names) matches nothing the home weighs
  const [, dir, ext] = /^(.*)\/\*(\.[a-z.]+)$/.exec(glob) ?? [];
  return dir && existsSync(join(repo, dir)) ? readdirSync(join(repo, dir)).filter((f) => f.endsWith(ext)).sort().map((f) => `${dir}/${f}`).filter((f) => !KIND_PATTERN.test(f)) : [];
};
// luz.conditional.css is luz.css for one region of a page: a page links one of the two, so it is not a weight
// on top of core's (its row is budgeted, and left out of the bar)
const CONDITIONAL = "packages/core/dist/luz.conditional.min.css";
const files = (name) => [
  ...budgets.filter((b) => b.file?.startsWith(`packages/${name}/dist/`) && b.file !== CONDITIONAL).map((b) => b.file),
  ...budgets.filter((b) => b.glob?.startsWith(`packages/${name}/dist/`)).flatMap((b) => globbed(b.glob)),
];
const built = BASE.every((name) => files(name).length > 0 && files(name).every((f) => existsSync(join(repo, f))));

describe.skipIf(!built || !hasGzip() || !existsSync(join(repo, "docs/index.html")))("docs/index.html: the weights equal gzip -9 -n", () => {
  const gz = (file) => execFileSync("gzip", ["-9", "-n", "-c"], { input: readFileSync(join(repo, file)), maxBuffer: 64 * 1024 * 1024 }).length;
  const html = read("docs/index.html");
  // The page is written without the quotes a value does not need: read it as a tree, not with a regex of quotes
  const bars = queryAll(parse(html, "docs/index.html"), "ul.landing-bars").find((ul) => ul.attrs.get("aria-label") === "Packages by size");
  const barOf = (name) => {
    const row = bars && queryAll(bars, "li").find((li) => textOf(query(li, "span.landing-bar__name")) === name);
    const meter = row && findAll(row, (node) => node.name === "meter")[0];
    return meter ? Number(meter.attrs.get("value")) : null;
  };

  it("catalog weighs the sum of its component files, not a bundle, and not the 20 patterns of the kinds of site", () => {
    const parts = files("catalog").filter((f) => f.startsWith("packages/catalog/dist/components/"));
    expect(parts.length, "the components are budgeted by the glob row").toBeGreaterThanOrEqual(6);
    expect(parts.filter((f) => KIND_PATTERN.test(f)), "the patterns of the kinds are not in the figure").toEqual([]);
    expect(files("catalog").some((f) => /catalog\.min\.css$/.test(f))).toBe(false);
  });

  for (const name of BASE) {
    it(`${name} weighs what gzip -9 -n says`, () => {
      const bar = barOf(name);
      expect(bar, `no bar for ${name} in the weights of docs/index.html`).not.toBeNull();
      const bytes = files(name).reduce((sum, f) => sum + gz(f), 0);
      expect(bar).toBe(bytes);
    });
  }

  it("core's bar leaves out luz.conditional.css: a page links one of the two files, not both", () => {
    expect(budgets.some((b) => b.file === CONDITIONAL), "the conditional file is budgeted, so only the bar can leave it out").toBe(true);
    expect(files("core"), "the figure sums luz.css and the rest, not the conditional file").not.toContain(CONDITIONAL);
    expect(barOf("core")).toBe(files("core").reduce((sum, f) => sum + gz(f), 0));
    expect(barOf("core"), "core's bar is not the sum with the conditional file").not.toBe(files("core").concat(CONDITIONAL).reduce((sum, f) => sum + gz(f), 0));
  });

  it("the weight of each level is the sum of the packages below it, with core leaving out luz.conditional.css", () => {
    const tree = parse(html, "docs/index.html");
    const weightOf = (id) => {
      const section = findAll(tree, (node) => node.name === "section" && node.attrs.get("id") === id)[0];
      const points = section && queryAll(section, "ul.landing-inside__points")[0];
      const text = points && textOf(findAll(points, (node) => node.name === "li")[2]);
      return text?.match(/(\d+\.\d) KB/)?.[1];
    };
    const bytes = (name) => files(name).reduce((sum, f) => sum + gz(f), 0);
    const kb = (n) => (n / 1024).toFixed(1);
    expect([weightOf("inside"), weightOf("inside-2"), weightOf("inside-3")]).toEqual([
      kb(bytes("tokens")),
      kb(bytes("tokens") + bytes("core")),
      kb(bytes("tokens") + bytes("core") + bytes("catalog")),
    ]);
  });
});
