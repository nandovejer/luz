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
// kinds of site (`components/{landing,cms,app,docs}-*.min.css`, F5b) are catalog files too, but the home
// weighs the pieces every site can use: they are left out, as they were when each kind was a package of its own
const KIND_PATTERN = /\/components\/(?:landing|cms|app|docs)-[^/]+$/;
const globbed = (glob) => {
  // A row of the patterns of the kinds (`{landing,cms,app,docs}-*.min.css`) matches nothing the home weighs
  const [, dir, ext] = /^(.*)\/\*(\.[a-z.]+)$/.exec(glob) ?? [];
  return dir && existsSync(join(repo, dir)) ? readdirSync(join(repo, dir)).filter((f) => f.endsWith(ext)).sort().map((f) => `${dir}/${f}`).filter((f) => !KIND_PATTERN.test(f)) : [];
};
const files = (name) => [
  ...budgets.filter((b) => b.file?.startsWith(`packages/${name}/dist/`)).map((b) => b.file),
  ...budgets.filter((b) => b.glob?.startsWith(`packages/${name}/dist/`)).flatMap((b) => globbed(b.glob)),
];
const built = BASE.every((name) => files(name).length > 0 && files(name).every((f) => existsSync(join(repo, f))));

describe.skipIf(!built || !hasGzip() || !existsSync(join(repo, "docs/index.html")))("docs/index.html: the weights equal gzip -9 -n", () => {
  const gz = (file) => execFileSync("gzip", ["-9", "-n", "-c"], { input: readFileSync(join(repo, file)), maxBuffer: 64 * 1024 * 1024 }).length;
  const html = read("docs/index.html");
  const list = html.match(/<ul class="landing-bars" aria-label="Packages by size">[\s\S]*?<\/ul>/)?.[0] ?? "";

  it("catalog weighs the sum of its component files, not a bundle, and not the 21 patterns of the kinds of site", () => {
    const parts = files("catalog").filter((f) => f.startsWith("packages/catalog/dist/components/"));
    expect(parts.length, "the components are budgeted by the glob row").toBeGreaterThanOrEqual(6);
    expect(parts.filter((f) => KIND_PATTERN.test(f)), "the patterns of the kinds are not in the figure").toEqual([]);
    expect(files("catalog").some((f) => /catalog\.min\.css$/.test(f))).toBe(false);
  });

  for (const name of BASE) {
    it(`${name} weighs what gzip -9 -n says`, () => {
      const row = list.match(new RegExp(`landing-bar__name">${name}</span>[\\s\\S]*?<meter[^>]*value="(\\d+)"`));
      expect(row, `no bar for ${name} in the weights of docs/index.html`).not.toBeNull();
      const bytes = files(name).reduce((sum, f) => sum + gz(f), 0);
      expect(Number(row[1])).toBe(bytes);
    });
  }
});
