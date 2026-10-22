/**
 * LUZ — the summary of the sharded Playwright run (PRINCIPLES.md SR-10).
 *
 * `ui-tests.yml` runs the whole suite in shards; each shard uploads its blob
 * report and a timing file, `shard-<n>-of-<total>.txt` (two lines: the epoch
 * seconds when the job started and when it ended). The summary job merges the blobs into one JSON report
 * (`playwright merge-reports --reporter json`) and runs this script, which
 * writes the totals, the failed and the flaky tests and the time of every shard
 * to the job summary, and prints a warning when a test is flaky or the slowest
 * shard passes WARN_AFTER_MINUTES: the signal to add shards before a pull
 * request's verdict passes 30 minutes.
 *
 * The decision is the pure `summarize()`, unit-tested; reading the files is
 * `main()`, a thin wrapper. Importing this module has no side effect.
 *
 * Usage: node scripts/ui-summary.js <report.json> <timing dir>
 * Writes the Markdown to $GITHUB_STEP_SUMMARY (stdout when unset) and the
 * warnings to stdout as workflow commands. Exit code: 0 whatever the tests
 * did (the shards' own result fails the run), 1 when the report is unreadable.
 */
import { appendFileSync, existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WARN_AFTER_MINUTES = 20;
export const VERDICT_MINUTES = 30;

/** Every test of a Playwright JSON report: { name, project, status }. */
export function testsOf(report) {
  const out = [];
  const walk = (suite, path) => {
    // The top suite of a file is titled with the file name: keep it once
    const here = suite.title && suite.title !== suite.file ? [...path, suite.title] : path;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        out.push({ name: [spec.file ?? suite.file, ...here, spec.title].filter(Boolean).join(" › "), project: test.projectName, status: test.status });
      }
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  return out;
}

/** "start\nend" in epoch seconds -> minutes, or null when the shard never ended. */
export function minutesOf(timing) {
  const [start, end] = String(timing).trim().split(/\s+/).map(Number);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return (end - start) / 60;
}

/**
 * report: a Playwright JSON report; shards: [{ shard: "1/6", minutes: number | null }].
 * Returns { markdown, warnings: string[] }.
 */
export function summarize({ report, shards = [], warnAfter = WARN_AFTER_MINUTES }) {
  const tests = testsOf(report);
  const count = (status) => tests.filter((t) => t.status === status).length;
  const passed = count("expected");
  const failed = tests.filter((t) => t.status === "unexpected");
  const flaky = tests.filter((t) => t.status === "flaky");
  const skipped = count("skipped");
  const line = (t) => `- ${t.name} (${t.project})`;
  const timed = shards.filter((s) => s.minutes !== null);
  const slowest = timed.reduce((a, b) => (b.minutes > a.minutes ? b : a), timed[0]);

  const md = [`### UI tests: ${passed} passed, ${failed.length} failed, ${flaky.length} flaky, ${skipped} skipped`, ""];
  if (slowest) {
    md.push(`Slowest shard: ${slowest.shard}, ${slowest.minutes.toFixed(1)} min. A pull request has its verdict in ${VERDICT_MINUTES} min at most (PRINCIPLES.md SR-10); above ${warnAfter} min, add shards.`, "");
    md.push("| Shard | Minutes |", "| --- | --- |", ...shards.map((s) => `| ${s.shard} | ${s.minutes === null ? "did not end" : s.minutes.toFixed(1)} |`), "");
  }
  if (failed.length) md.push("#### Failed", "", ...failed.map(line), "");
  if (flaky.length) md.push("#### Flaky (passed on the retry: fix them)", "", ...flaky.map(line), "");

  const warnings = [];
  if (slowest && slowest.minutes > warnAfter) {
    warnings.push(`The slowest UI shard (${slowest.shard}) took ${slowest.minutes.toFixed(1)} min, over ${warnAfter}: add shards to ui-tests.yml before a pull request's verdict passes ${VERDICT_MINUTES} min (SR-10).`);
  }
  if (flaky.length) warnings.push(`${flaky.length} flaky UI test${flaky.length === 1 ? "" : "s"} passed on the retry: ${flaky.map((t) => t.name).join("; ")}`);
  return { markdown: md.join("\n"), warnings };
}

/** Workflow commands end at a newline and treat % specially. */
const escape = (text) => text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

export function main([reportPath, timingDir] = []) {
  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf-8"));
  } catch (error) {
    console.error(`ui-summary: cannot read the report ${reportPath}: ${error.message}`);
    return 1;
  }
  // shard-<n>-of-<total>.txt: a shard that never uploaded is simply missing
  const named = /^shard-(\d+)-of-(\d+)\.txt$/;
  const files = timingDir && existsSync(timingDir) ? readdirSync(timingDir).filter((f) => named.test(f)) : [];
  const shards = files
    .map((f) => {
      const [, n, total] = named.exec(f);
      return { n: Number(n), shard: `${n}/${total}`, minutes: minutesOf(readFileSync(join(timingDir, f), "utf-8")) };
    })
    .sort((a, b) => a.n - b.n)
    .map(({ shard, minutes }) => ({ shard, minutes }));
  const { markdown, warnings } = summarize({ report, shards });
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  else console.log(markdown);
  for (const w of warnings) console.log(`::warning title=UI tests::${escape(w)}`);
  return 0;
}

const isEntry = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry) process.exit(main(process.argv.slice(2)));
