/**
 * LUZ — run only the checks a change touches (the per-change loop of
 * .claude/OWNER.md §2; the full suite stays for milestones: `pnpm check:all`).
 *
 * From the files changed since HEAD (or the files named on the command line):
 * ESLint and stylelint on them, `vitest related` on the sources and unit tests,
 * and the Playwright specs that cover them (chromium and chromium-nojs, 3
 * workers). A source with no spec of its own is reported, never guessed.
 * Stops at the first failing step and prints only the end of its output.
 *
 * Usage: node scripts/test-affected.js [--dry] [file ...]
 */
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED = /(^|\/)(dist|node_modules)\/|^(docs|\.claude)\//;
const SOURCE = /^(packages|apps|scripts)\/.+\.(js|css|html|json)$/;
const TAIL = 25;

/**
 * @param {string[]} changed repo-relative paths
 * @param {(path: string) => boolean} hasFile whether a repo-relative path exists
 * @returns {{ lintJs: string[], lintCss: string[], unit: string[], specs: string[], unmapped: string[] }}
 */
export function plan(changed, hasFile = (p) => existsSync(resolve(root, p))) {
  const out = { lintJs: [], lintCss: [], unit: [], specs: [], unmapped: [] };
  const add = (list, item) => { if (!list.includes(item)) list.push(item); };

  for (const file of changed) {
    if (GENERATED.test(file)) continue;
    if (/\.js$/.test(file) && (/^(packages|apps|scripts|tests)\//.test(file) || /^[^/]+\.config\.js$/.test(file))) add(out.lintJs, file);
    if (/\.css$/.test(file) && /^(packages|apps)\//.test(file)) add(out.lintCss, file);

    if (/^tests\/.+\.spec\.js$/.test(file)) { add(out.specs, file); continue; }
    if (/^tests\/.+\.test\.js$/.test(file)) { add(out.unit, file); continue; }
    if (!SOURCE.test(file)) continue;

    add(out.unit, file);
    const base = file.split("/").pop().replace(/\.[^.]+$/, "");
    const parts = file.split("/");
    const names = [base];
    if (parts[0] === "packages") names.push(`${parts[1]}-${base}`);
    if (file.startsWith("apps/docs/pages/") && parts.length > 4) names.push(`${parts[3]}-${base}`);
    const found = names.map((n) => `tests/${n}.spec.js`).filter(hasFile);
    if (found.length) found.forEach((s) => add(out.specs, s));
    else if (parts[0] !== "scripts") add(out.unmapped, file);
  }
  return out;
}

/** The commands for a plan, in the order they run: cheapest first. */
export function commands(p) {
  const steps = [];
  if (p.lintJs.length) steps.push(["eslint", ["eslint", ...p.lintJs]]);
  if (p.lintCss.length) steps.push(["stylelint", ["stylelint", ...p.lintCss]]);
  if (p.unit.length) steps.push(["unit", ["vitest", "related", "--run", ...p.unit]]);
  if (p.specs.length) {
    steps.push(["playwright", ["playwright", "test", "--project=chromium", "--project=chromium-nojs", "--workers=3", ...p.specs]]);
  }
  return steps;
}

function git(args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.stdout.split("\n").filter(Boolean);
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const named = args.filter((a) => !a.startsWith("--"));
  const changed = named.length ? named : [...new Set([...git(["diff", "--name-only", "HEAD"]), ...git(["ls-files", "--others", "--exclude-standard"])])];

  const p = plan(changed);
  const steps = commands(p);
  if (p.unmapped.length) {
    console.log(`No spec found for: ${p.unmapped.join(", ")}\nName one: pnpm test:affected tests/<name>.spec.js`);
  }
  if (!steps.length) { console.log("Nothing to run."); return; }

  for (const [name, argv] of steps) {
    if (dry) { console.log(`pnpm exec ${argv.join(" ")}`); continue; }
    const started = Date.now();
    const r = spawnSync("pnpm", ["exec", ...argv], { cwd: root, encoding: "utf8" });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (r.status === 0) { console.log(`ok    ${name} (${seconds}s)`); continue; }
    const tail = `${r.stdout}${r.stderr}`.trimEnd().split("\n").slice(-TAIL).join("\n");
    console.log(`FAIL  ${name} (${seconds}s), last ${TAIL} lines:\n${tail}`);
    process.exitCode = 1;
    return;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
