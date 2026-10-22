/**
 * scripts/ui-summary.js (PRINCIPLES.md SR-10): the summary of the sharded
 * Playwright run. The decisions are pure (`testsOf`, `minutesOf`, `summarize`);
 * `main` only reads the files and writes the Markdown and the workflow commands.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VERDICT_MINUTES, WARN_AFTER_MINUTES, main, minutesOf, summarize, testsOf } from "../scripts/ui-summary.js";

const test = (projectName, status) => ({ projectName, status, results: [] });
const spec = (file, title, tests) => ({ file, title, tests });

/** A Playwright JSON report: one file with a describe and a loose test, a second file with a flaky and a failed one. */
function report() {
  return {
    suites: [
      {
        title: "button.spec.js",
        file: "button.spec.js",
        specs: [spec("button.spec.js", "loose test", [test("chromium", "expected")])],
        suites: [
          {
            title: "button",
            file: "button.spec.js",
            specs: [
              spec("button.spec.js", "renders", [test("chromium", "expected"), test("chromium-nojs", "expected")]),
              spec("button.spec.js", "skips on mobile", [test("chromium", "skipped")]),
            ],
          },
        ],
      },
      {
        title: "tabs.spec.js",
        file: "tabs.spec.js",
        suites: [
          {
            title: "tabs",
            file: "tabs.spec.js",
            suites: [
              {
                title: "keyboard",
                file: "tabs.spec.js",
                specs: [
                  spec("tabs.spec.js", "moves with the arrows", [test("chromium", "flaky")]),
                  spec("tabs.spec.js", "wraps around", [test("chromium-nojs", "unexpected")]),
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("testsOf", () => {
  it("flattens the suites into `file › describe › title`, with the project and the status", () => {
    const tests = testsOf(report());
    expect(tests).toContainEqual({ name: "button.spec.js › button › renders", project: "chromium", status: "expected" });
    expect(tests).toContainEqual({ name: "button.spec.js › button › renders", project: "chromium-nojs", status: "expected" });
    expect(tests).toContainEqual({ name: "tabs.spec.js › tabs › keyboard › moves with the arrows", project: "chromium", status: "flaky" });
    expect(tests).toHaveLength(6);
  });

  it("does not repeat the file name that titles the file-level suite", () => {
    const names = testsOf(report()).map((t) => t.name);
    expect(names).toContain("button.spec.js › loose test");
    expect(names.some((n) => n.includes("button.spec.js › button.spec.js"))).toBe(false);
  });

  it("is empty for a report with no suites", () => {
    expect(testsOf({})).toEqual([]);
    expect(testsOf({ suites: [] })).toEqual([]);
  });
});

describe("minutesOf", () => {
  it("is the minutes between the two epoch seconds", () => {
    expect(minutesOf("1000\n1600\n")).toBe(10);
    expect(minutesOf("1000\n1090")).toBe(1.5);
    expect(minutesOf("1000\n1000")).toBe(0);
  });

  it("is null when the shard never ended, the file is empty or not a number, or the end is before the start", () => {
    expect(minutesOf("1000\n")).toBeNull();
    expect(minutesOf("1000")).toBeNull();
    expect(minutesOf("")).toBeNull();
    expect(minutesOf("soon\nlater")).toBeNull();
    expect(minutesOf("1000\nlater")).toBeNull();
    expect(minutesOf("2000\n1000")).toBeNull();
    expect(minutesOf(undefined)).toBeNull();
  });
});

describe("summarize", () => {
  const shards = [
    { shard: "1/3", minutes: 8 },
    { shard: "2/3", minutes: 12.5 },
    { shard: "3/3", minutes: null },
  ];

  it("states the limits: warn at 20 minutes, verdict in 30", () => {
    expect(WARN_AFTER_MINUTES).toBe(20);
    expect(VERDICT_MINUTES).toBe(30);
  });

  it("counts passed, failed, flaky and skipped tests in one line", () => {
    const { markdown } = summarize({ report: report(), shards });
    expect(markdown).toMatch(/3 passed/);
    expect(markdown).toMatch(/1 failed/);
    expect(markdown).toMatch(/1 flaky/);
    expect(markdown).toMatch(/1 skipped/);
  });

  it("names the slowest shard with the rule, and tables every shard, `did not end` for the one with no time", () => {
    const { markdown } = summarize({ report: report(), shards });
    expect(markdown).toMatch(/Slowest shard: 2\/3, 12\.5 min/);
    expect(markdown).toContain("SR-10");
    expect(markdown).toMatch(/\|\s*1\/3\s*\|\s*8\.0\s*\|/);
    expect(markdown).toMatch(/\|\s*3\/3\s*\|\s*did not end\s*\|/);
  });

  it("lists the failed and the flaky tests under their own headings", () => {
    const { markdown } = summarize({ report: report(), shards });
    const failed = markdown.slice(markdown.indexOf("Failed"));
    expect(markdown).toMatch(/Failed/);
    expect(markdown).toMatch(/Flaky/);
    expect(failed).toContain("tabs.spec.js › tabs › keyboard › wraps around (chromium-nojs)");
    expect(markdown).toContain("tabs.spec.js › tabs › keyboard › moves with the arrows (chromium)");
  });

  it("has no Failed or Flaky list when nothing failed or flaked", () => {
    const clean = { suites: [{ title: "a.spec.js", file: "a.spec.js", specs: [spec("a.spec.js", "ok", [test("chromium", "expected")])] }] };
    const { markdown, warnings } = summarize({ report: clean, shards: [{ shard: "1/1", minutes: 3 }] });
    expect(markdown).toMatch(/1 passed, 0 failed, 0 flaky, 0 skipped/);
    expect(markdown).not.toMatch(/Failed|Flaky/);
    expect(warnings).toEqual([]);
  });

  it("does not warn at exactly 20 minutes, and warns above it", () => {
    const clean = { suites: [] };
    expect(summarize({ report: clean, shards: [{ shard: "1/6", minutes: 20 }] }).warnings).toEqual([]);
    const over = summarize({ report: clean, shards: [{ shard: "4/6", minutes: 20.1 }] }).warnings;
    expect(over).toHaveLength(1);
    expect(over[0]).toContain("4/6");
    expect(over[0]).toContain("SR-10");
  });

  it("takes the threshold from `warnAfter`", () => {
    const clean = { suites: [] };
    expect(summarize({ report: clean, shards: [{ shard: "1/6", minutes: 12 }], warnAfter: 10 }).warnings).toHaveLength(1);
    expect(summarize({ report: clean, shards: [{ shard: "1/6", minutes: 12 }], warnAfter: 15 }).warnings).toEqual([]);
  });

  it("warns once about the flaky tests, naming them", () => {
    const { warnings } = summarize({ report: report(), shards: [{ shard: "1/3", minutes: 5 }] });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/1 flaky/);
    expect(warnings[0]).toContain("tabs.spec.js › tabs › keyboard › moves with the arrows");
  });

  it("gives both warnings when the run is slow and flaky", () => {
    expect(summarize({ report: report(), shards: [{ shard: "1/3", minutes: 25 }] }).warnings).toHaveLength(2);
  });

  it("ignores a shard with no time when it finds the slowest, and survives having no shards at all", () => {
    expect(() => summarize({ report: report() })).not.toThrow();
    expect(() => summarize({ report: report(), shards: [{ shard: "1/2", minutes: null }] })).not.toThrow();
    expect(summarize({ report: report(), shards: [{ shard: "1/2", minutes: null }] }).markdown).not.toMatch(/Slowest shard/);
  });
});

describe("main", () => {
  let dir;
  let summaryFile;
  let saved;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-ui-summary-"));
    summaryFile = join(dir, "step-summary.md");
    saved = process.env.GITHUB_STEP_SUMMARY;
    mkdirSync(join(dir, "timing"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (saved === undefined) delete process.env.GITHUB_STEP_SUMMARY;
    else process.env.GITHUB_STEP_SUMMARY = saved;
    rmSync(dir, { recursive: true, force: true });
  });

  const write = (name, data) => writeFileSync(join(dir, name), typeof data === "string" ? data : JSON.stringify(data));

  it("reads the shard files, appends the Markdown to $GITHUB_STEP_SUMMARY, prints the warnings and returns 0 even with a failed test", () => {
    process.env.GITHUB_STEP_SUMMARY = summaryFile;
    write("report.json", report());
    write("timing/shard-1-of-2.txt", "1000\n1300\n"); // 5 min
    write("timing/shard-2-of-2.txt", "1000\n2260\n"); // 21 min
    write("timing/notes.txt", "not a shard");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(main([join(dir, "report.json"), join(dir, "timing")])).toBe(0);
    const markdown = readFileSync(summaryFile, "utf-8");
    expect(markdown).toMatch(/1 failed/);
    expect(markdown).toMatch(/Slowest shard: 2\/2, 21\.0 min/);
    expect(markdown).toMatch(/\|\s*1\/2\s*\|\s*5\.0\s*\|/);
    const lines = log.mock.calls.map((c) => c.join(" "));
    expect(lines.filter((l) => l.startsWith("::warning title=UI tests::"))).toHaveLength(2);
    expect(lines.some((l) => l.includes("2/2"))).toBe(true);
  });

  it("writes the Markdown to stdout when $GITHUB_STEP_SUMMARY is not set", () => {
    delete process.env.GITHUB_STEP_SUMMARY;
    write("report.json", report());
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(main([join(dir, "report.json"), join(dir, "timing")])).toBe(0);
    expect(log.mock.calls.map((c) => c.join(" ")).join("\n")).toMatch(/### UI tests: 3 passed/);
  });

  it("lists a shard that left no file as missing rather than failing, and a timing directory that does not exist", () => {
    process.env.GITHUB_STEP_SUMMARY = summaryFile;
    write("report.json", report());
    write("timing/shard-1-of-2.txt", "1000\n"); // never ended
    write("timing/shard-2-of-2.txt", "1000\n1600\n");
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(main([join(dir, "report.json"), join(dir, "timing")])).toBe(0);
    expect(readFileSync(summaryFile, "utf-8")).toMatch(/\|\s*1\/2\s*\|\s*did not end\s*\|/);
    expect(main([join(dir, "report.json"), join(dir, "nowhere")])).toBe(0);
  });

  it("escapes % and newlines in a warning, so one workflow command stays on one line", () => {
    process.env.GITHUB_STEP_SUMMARY = summaryFile;
    const odd = { suites: [{ title: "a.spec.js", file: "a.spec.js", specs: [spec("a.spec.js", "100% done\nreally", [test("chromium", "flaky")])] }] };
    write("report.json", odd);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(main([join(dir, "report.json"), join(dir, "timing")])).toBe(0);
    const warning = log.mock.calls.map((c) => c.join(" ")).find((l) => l.startsWith("::warning"));
    expect(warning).toContain("100%25 done%0Areally");
    expect(warning).not.toContain("\n");
  });

  it("returns 1 when the report is missing or is not JSON", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(main([join(dir, "missing.json"), join(dir, "timing")])).toBe(1);
    write("broken.json", "{ not json");
    expect(main([join(dir, "broken.json"), join(dir, "timing")])).toBe(1);
    expect(error).toHaveBeenCalled();
  });
});
