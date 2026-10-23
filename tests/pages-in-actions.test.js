/**
 * The Pages site is built by GitHub Actions and never committed (owner
 * decision 2026-10-22; PRINCIPLES.md RL-14): `docs/` is git-ignored build
 * output, `.github/workflows/pages.yml` builds it with `pnpm pages:build` and
 * deploys it on every push to `main`, and the CI of a pull request builds it
 * too, so a broken page or link fails there. The comparison of the committed
 * `docs/` with a fresh build (`check:generated`) goes away with the folder.
 *
 *   git                 no file of `docs/` is in the index; `docs/` and `dist/` are ignored
 *   pages.yml           push to main and by hand only; read-only by default; one deploy at a
 *                       time that is never cut; `build` has the full history, installs from the
 *                       lockfile, runs `pnpm pages:build` and uploads `docs`; `deploy` waits for
 *                       it and is the only job that writes (`pages`, `id-token`), in the
 *                       `github-pages` environment; no secrets
 *   ci.yml              `build-and-test` runs `pnpm pages:build` before the checks that read the site
 *   check:generated     gone from every script, workflow and from qa-release.js; so is its file
 *   PRINCIPLES.md       RL-14 names `pages.yml` and `.gitignore`; RL-19 no longer names check-generated
 *   AGENTS.md           rule 2 says git-ignored and `pages.yml`, not "committed so Pages can serve it"
 *
 * Every-workflow rules (timeouts, SHA pins, no pull_request_target, no firefox
 * or webkit) are in open-source.test.js and read pages.yml with the others.
 * Text parsing, no YAML dependency (as open-source.test.js).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = (rel) => join(repo, rel);
function read(rel) {
  if (!existsSync(path(rel))) throw new Error(`${rel} does not exist`);
  return readFileSync(path(rel), "utf-8");
}
const flat = (s) => s.replace(/\s+/g, " ");
const git = (...argv) => spawnSync("git", argv, { cwd: repo, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });

/** The text with its comment lines dropped (a comment may name what the file no longer does). */
const withoutComments = (text) =>
  text
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

/** The body of a top-level key (`on:`, `permissions:`), comments dropped. */
function topBlock(workflow, key) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((l) => l === `${key}:` || l.startsWith(`${key}:`));
  if (start < 0) return "";
  const out = [];
  for (const l of lines.slice(start + 1)) {
    if (/^\S/.test(l)) break;
    if (!/^\s*#/.test(l)) out.push(l);
  }
  return out.join("\n");
}

/** The jobs of a workflow: [{ id, text }], from the `jobs:` key to the next top-level key. */
function jobsOf(workflow) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((l) => l === "jobs:");
  if (start < 0) return [];
  const jobs = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) break;
    const head = /^ {2}([\w-]+):\s*$/.exec(lines[i]);
    if (head) jobs.push({ id: head[1], text: "" });
    if (jobs.length) jobs[jobs.length - 1].text += `${lines[i]}\n`;
  }
  return jobs;
}
const jobNamed = (workflow, id) => jobsOf(workflow).find((j) => j.id === id);

/** The steps of a job: the text of each `      - ...` item, comments dropped. */
function stepsOf(job) {
  const steps = [];
  for (const line of withoutComments(job.text).split("\n")) {
    if (/^ {6}- /.test(line)) steps.push("");
    if (steps.length) steps[steps.length - 1] += `${line}\n`;
  }
  return steps;
}

/** Every key written with a value of `write` (or `read`) in the permissions blocks of a text. */
const writes = (text) => [...withoutComments(text).matchAll(/^\s+([\w-]+):\s*write\b/gm)].map((m) => m[1]).sort();

describe("docs/ is not in git", () => {
  it("has no file of docs/ in the index: it is build output, like dist/", () => {
    const listed = git("ls-files", "--", "docs");
    expect(listed.status).toBe(0);
    expect(listed.stdout.trim().split("\n").filter(Boolean).slice(0, 5)).toEqual([]);
  });

  it.each(["docs/index.html", "docs/assets/anything.js", "docs/docs/components/button/index.html", "dist/luz.css"])("ignores %s", (file) => {
    const ignored = git("check-ignore", "-q", "--no-index", file);
    expect(ignored.status, `${file} is not git-ignored`).toBe(0);
  });
});

describe(".github/workflows/pages.yml: the build and the deploy of the site", () => {
  const pages = () => read(".github/workflows/pages.yml");
  const build = () => jobNamed(pages(), "build");
  const deploy = () => jobNamed(pages(), "deploy");

  it("exists, with the two jobs build and deploy", () => {
    expect(jobsOf(pages()).map((j) => j.id)).toEqual(["build", "deploy"]);
  });

  it("runs on a push to main and by hand, and on nothing else", () => {
    const on = topBlock(pages(), "on");
    const events = [...on.matchAll(/^ {2}([\w-]+):/gm)].map((m) => m[1]).sort();
    expect(events).toEqual(["push", "workflow_dispatch"]);
    expect(on).toMatch(/^ {2}push:\n {4}branches:\s*\[\s*main\s*\]\s*$/m);
    expect(withoutComments(pages())).not.toContain("pull_request");
    expect(withoutComments(pages())).not.toMatch(/^\s*-?\s*cron:/m);
  });

  it("is read-only at the top: `permissions: contents: read` and nothing else", () => {
    expect(pages()).toMatch(/^permissions:\n {2}contents: read\n(?! {2}\S)/m);
  });

  it("deploys one at a time and never cuts a running deploy: concurrency group `pages`, cancel-in-progress false", () => {
    const block = topBlock(pages(), "concurrency");
    expect(block).toMatch(/^ {2}group:\s*pages\s*$/m);
    expect(block).toMatch(/^ {2}cancel-in-progress:\s*false\s*$/m);
  });

  it("`build` checks out the full history: each docs page shows the date of its last commit", () => {
    const checkout = stepsOf(build()).find((s) => s.includes("actions/checkout@"));
    expect(checkout, "a checkout step").toBeDefined();
    expect(checkout).toMatch(/^\s+fetch-depth:\s*0\s*$/m);
  });

  it("`build` installs from the lockfile, then runs `pnpm pages:build`", () => {
    const runs = stepsOf(build()).map((s) => /^\s+(?:-\s+)?run:\s*(.+)$/m.exec(s)?.[1]?.trim());
    const install = runs.indexOf("pnpm install --frozen-lockfile");
    const site = runs.indexOf("pnpm pages:build");
    expect(install, "pnpm install --frozen-lockfile").toBeGreaterThanOrEqual(0);
    expect(site, "pnpm pages:build").toBeGreaterThan(install);
  });

  it("`build` configures Pages, then uploads the folder docs as the artifact, after the build", () => {
    const steps = stepsOf(build());
    const at = (needle) => steps.findIndex((s) => s.includes(needle));
    expect(at("actions/configure-pages@"), "configure-pages").toBeGreaterThanOrEqual(0);
    expect(at("actions/upload-pages-artifact@"), "upload-pages-artifact").toBeGreaterThan(at("pnpm pages:build"));
    expect(at("pnpm pages:build"), "the build comes before the upload").toBeGreaterThanOrEqual(0);
    expect(steps[at("actions/upload-pages-artifact@")]).toMatch(/^\s+path:\s*docs\s*$/m);
  });

  it("`deploy` waits for `build`, uses actions/deploy-pages in the `github-pages` environment", () => {
    expect(deploy().text).toMatch(/^ {4}needs:\s*(?:build|\[\s*build\s*\])\s*$/m);
    expect(deploy().text).toMatch(/actions\/deploy-pages@/);
    expect(deploy().text).toMatch(/^ {4}environment:\n {6}name:\s*github-pages\s*$/m);
  });

  it("`deploy` is the only job that writes, and only `pages` and `id-token`", () => {
    expect(writes(deploy().text)).toEqual(["id-token", "pages"]);
    expect(writes(build().text), "build writes nothing").toEqual([]);
    expect(writes(topBlock(pages(), "permissions"))).toEqual([]);
  });

  it("uses no secret and no pull_request_target", () => {
    expect(withoutComments(pages())).not.toContain("secrets.");
    expect(withoutComments(pages())).not.toContain("pull_request_target");
  });
});

describe("ci.yml builds the Pages site in a pull request", () => {
  const ci = () => read(".github/workflows/ci.yml");
  const steps = () => stepsOf(jobNamed(ci(), "build-and-test"));
  const indexOfRun = (needle) => steps().findIndex((s) => new RegExp(`^\\s+(?:-\\s+)?run:.*${needle}`, "m").test(s));

  it("`build-and-test` runs `pnpm pages:build`", () => {
    expect(indexOfRun("pnpm pages:build")).toBeGreaterThanOrEqual(0);
  });

  it.each(["pnpm check:size", "pnpm check:ai", "pnpm test:unit"])("runs `pnpm pages:build` before `%s`, which reads the built site", (command) => {
    const build = indexOfRun("pnpm pages:build");
    const check = indexOfRun(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    expect(check, command).toBeGreaterThanOrEqual(0);
    expect(build).toBeGreaterThanOrEqual(0);
    expect(build, `${command} runs before the Pages build`).toBeLessThan(check);
  });

  it("has no \"Check generated files\" step: nothing compares a committed docs/ any more", () => {
    expect(ci()).not.toContain("Check generated files");
  });
});

describe("check:generated is gone", () => {
  it("scripts/check-generated.js does not exist", () => {
    expect(existsSync(path("scripts/check-generated.js"))).toBe(false);
  });

  it("is not a script of package.json", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    expect(Object.keys(scripts)).not.toContain("check:generated");
    expect(Object.values(scripts).join("\n")).not.toContain("check-generated");
  });

  it.each([
    ["package.json"],
    ["scripts/qa-release.js"],
    ...readdirSync(path(".github/workflows"))
      .filter((f) => f.endsWith(".yml"))
      .map((f) => [`.github/workflows/${f}`]),
  ])("%s does not name it", (file) => {
    const text = read(file);
    expect(text).not.toContain("check:generated");
    expect(text).not.toContain("check-generated");
  });

  it("scripts/qa-release.js builds the Pages site (`pnpm pages:build`) as its build step, and skips it with --fast", () => {
    const source = read("scripts/qa-release.js");
    const block = source.slice(source.indexOf("const steps = ["));
    const line = block
      .slice(0, block.indexOf("\n];"))
      .split("\n")
      .find((l) => l.includes('"pages:build"'));
    expect(line, "a step that runs pages:build").toBeDefined();
    expect(line).toContain('args.has("--fast")');
    expect(source.match(/"pages:build"/g)).toHaveLength(1);
  });
});

describe("the rules say where docs/ comes from", () => {
  const principles = read("PRINCIPLES.md");
  const row = (line) => principles.split("\n").find((l) => new RegExp(`^\\|\\s*${line}\\s*\\|`).test(l)) ?? "";

  it("RL-14 names .gitignore and pages.yml as its checks, and not check-generated", () => {
    const cell = row("RL-14");
    expect(cell, "the RL-14 row").not.toBe("");
    expect(cell).toContain("`.gitignore`");
    expect(cell).toContain("`.github/workflows/pages.yml`");
    expect(cell).toContain("`tests/pages-in-actions.test.js`");
    expect(cell).not.toContain("check-generated");
  });

  it("RL-19 does not name check-generated", () => {
    const cell = row("RL-19");
    expect(cell, "the RL-19 row").not.toBe("");
    expect(cell).not.toContain("check-generated");
  });

  it("no line of PRINCIPLES.md or AGENTS.md sends a reader to check-generated or `check:generated`", () => {
    for (const file of ["PRINCIPLES.md", "AGENTS.md"]) expect(read(file), file).not.toMatch(/check[-:]generated/);
  });

  it("AGENTS.md rule 2 says docs/ is git-ignored and built by pages.yml, not committed so Pages can serve it", () => {
    const text = read("AGENTS.md");
    const rule = flat(text.split(/^### 2\. /m)[1]?.split(/^### 3\. /m)[0] ?? "");
    expect(rule, "rule 2").not.toBe("");
    expect(rule).toMatch(/git-ignored/);
    expect(rule).toContain("pages.yml");
    expect(rule).not.toMatch(/committed so GitHub Pages can serve it/);
    expect(rule).not.toMatch(/commit the result/);
  });
});

describe(".gitignore ignores the built site and not the docs app", () => {
  const ignored = (file) => git("check-ignore", "-q", file).status === 0;

  it("ignores docs/ at the root, where pnpm pages:build writes", () => {
    expect(ignored("docs/index.html")).toBe(true);
  });

  it("does not ignore a new page of apps/docs/", () => {
    expect(ignored("apps/docs/pages/components/a-new-page.html")).toBe(false);
  });
});
