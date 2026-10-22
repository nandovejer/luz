/**
 * F7 · Open source (spec .claude/plans/specs/f7-open-source.md, steps 1 to 8):
 * what a stranger finds in the repository must be short, licensed, and
 * enforced by the same gates as everything else. This file reads the files
 * of the repository, no script; the scripts have tests of their own
 * (check-license.test.js, check-red-commit.test.js, open-source-message.test.js).
 *
 *   CONTRIBUTING.md        at most 70 lines; the MIT sentence (inbound = outbound),
 *                          `pnpm check:all`, the `test:` red commit, Discussions and the
 *                          public Project, links to CODE_OF_CONDUCT.md and to the files
 *                          the long sections moved to (dev/TESTING.md,
 *                          dev/DEFINITION-OF-DONE.md, VERSIONING.md), no emoji
 *   MOVED                  every section of the old CONTRIBUTING.md that is not kept is a
 *                          heading (and a marker phrase) of the file it moved to: nothing lost
 *   CODE_OF_CONDUCT.md     Contributor Covenant 2.1 unchanged, with the enforcement contact
 *                          "Report privately through GitHub: <advisory URL of SECURITY.md>"
 *                          and no e-mail address anywhere
 *   .github/labels.yml     a list of `- name:` / `color:` (six hex digits, no #) /
 *                          `description:`, the fourteen labels of the spec and of SR-10
 *   .github/pull_request_template.md   first checkbox = MIT, then Test first, Browsers by issue
 *   .github/ISSUE_TEMPLATE/*.yml       every template has `labels:`, all of them in labels.yml
 *   .github/workflows/*.yml            SR-10 (a verdict in 30 minutes): every job with `runs-on:` has
 *                          `timeout-minutes` of 25 at most; no pull_request_target; every `uses:`
 *                          pinned by a 40-hex SHA; no firefox or webkit project
 *   ci.yml                 job `red-commit`; the required check `UI Tests (Playwright)` waits for
 *                          the shards (ui-tests.yml); no schedule, no test-affected
 *   ui-tests.yml           the whole suite in at least six shards, blob reports, a summary job
 *   visual-references.yml  the `visual-references` job, on demand only (label `visual` or by hand)
 *   post-merge.yml         the whole suite on push to main; a failure opens an issue
 *   publish.yml            changesets/action at v1 (the repo is on Changesets CLI v2)
 *   playwright.config.js   one retry under CI, a blob report; PRINCIPLES.md has SR-10
 *   package.json           `check:all` and `qa:release` are both `node scripts/qa-release.js`;
 *                          `check:license` is `node scripts/check-license.js`, run by qa-release
 *   VERSIONING.md          a "Supported" section; .github/DISCUSSION_TEMPLATE/proposal.yml
 *   dev/BROWSER-REVIEWS.md an "Open" section (Scope, Files, What to look at, Browser);
 *                          the security-auditor agent reads it
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = (rel) => join(repo, rel);
function read(rel) {
  if (!existsSync(path(rel))) throw new Error(`${rel} does not exist`);
  return readFileSync(path(rel), "utf-8");
}
const unquote = (s) => s.trim().replace(/^(["'])(.*)\1$/, "$2");
const flat = (s) => s.replace(/\s+/g, " ");
const linesOf = (text) => text.replace(/\n$/, "").split("\n");

/** `.github/labels.yml`: [{ name, color, description }] from `- name:` items with indented keys. */
function parseLabels(text) {
  const items = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const start = /^-\s+(\w+):\s*(.*)$/.exec(line);
    if (start) {
      current = { [start[1]]: unquote(start[2]) };
      items.push(current);
      continue;
    }
    const key = /^\s+(\w+):\s*(.*)$/.exec(line);
    if (key && current) current[key[1]] = unquote(key[2]);
  }
  return items;
}

/** The `labels:` of an issue form: an inline list (`["bug"]`) or a block list. */
function labelsOfForm(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^labels:/.test(l));
  if (at < 0) return [];
  const inline = lines[at].slice("labels:".length).trim();
  if (inline.startsWith("[")) return inline.slice(1, inline.lastIndexOf("]")).split(",").map(unquote).filter(Boolean);
  const out = [];
  for (const l of lines.slice(at + 1)) {
    const m = /^\s+-\s+(.*)$/.exec(l);
    if (!m) break;
    out.push(unquote(m[1]));
  }
  return out;
}

/** The text of a job of a workflow: from `  <job>:` to the next two-space key. */
function jobOf(workflow, job) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((l) => l === `  ${job}:`);
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}\S/.test(lines[i]) || /^\S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/** The lines of the `path:` input of the upload-artifact step of a job (block or single value). */
function uploadPath(job) {
  const lines = job.split("\n");
  const at = lines.findIndex((l) => /^\s+path:/.test(l));
  if (at < 0) return [];
  const inline = lines[at].replace(/^\s+path:\s*/, "").trim();
  if (inline && inline !== "|" && inline !== ">") return [inline];
  const indent = /^\s*/.exec(lines[at])[0].length;
  const out = [];
  for (const l of lines.slice(at + 1)) {
    if (l.trim() === "") continue;
    if (/^\s*/.exec(l)[0].length <= indent) break;
    out.push(l.trim());
  }
  return out;
}

/** The comment lines (# ...) directly above `  <job>:` in a workflow. */
function commentAbove(workflow, job) {
  const lines = workflow.split("\n");
  const at = lines.findIndex((l) => l === `  ${job}:`);
  const out = [];
  for (let i = at - 1; i >= 0 && /^\s*#/.test(lines[i]); i--) out.unshift(lines[i].replace(/^\s*#\s?/, ""));
  return out.join(" ");
}

/** Every workflow of the repository: [{ file, text }]. */
function workflows() {
  return readdirSync(path(".github/workflows"))
    .filter((f) => f.endsWith(".yml"))
    .sort()
    .map((file) => ({ file, text: read(`.github/workflows/${file}`) }));
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

/** The events of `on:`. */
const triggersOf = (workflow) => [...topBlock(workflow, "on").matchAll(/^ {2}([\w-]+):/gm)].map((m) => m[1]).sort();

/** The names a key lists: inline (`key: [a, b]`) or as a block of `- a` items. */
function listOf(block, key) {
  const lines = block.split("\n");
  const at = lines.findIndex((l) => new RegExp(`^\\s+${key}:`).test(l));
  if (at < 0) return [];
  const inline = lines[at].replace(new RegExp(`^\\s+${key}:\\s*`), "").trim();
  if (inline.startsWith("[")) return inline.slice(1, inline.lastIndexOf("]")).split(",").map(unquote).filter(Boolean);
  const out = [];
  for (const l of lines.slice(at + 1)) {
    const m = /^\s+-\s+(.*)$/.exec(l);
    if (!m) break;
    out.push(unquote(m[1]));
  }
  return out;
}

/** The text of every `run:` of a workflow (a single line or a block). */
function runBlocksOf(workflow) {
  const lines = workflow.split("\n");
  const out = [];
  lines.forEach((line, i) => {
    const m = /^(\s+)(?:-\s+)?run:\s*(.*)$/.exec(line);
    if (!m) return;
    if (m[2] && !/^[|>][+-]?$/.test(m[2])) return out.push(m[2]);
    const indent = m[1].length;
    const body = [];
    for (const l of lines.slice(i + 1)) {
      if (l.trim() !== "" && /^\s*/.exec(l)[0].length <= indent) break;
      body.push(l);
    }
    out.push(body.join("\n"));
  });
  return out;
}

/** The step-level or job-level `uses:` that are not local: ["actions/checkout@sha", …]. */
const remoteUses = (workflow) => [...workflow.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)/gm)].map((m) => m[1]).filter((u) => !u.startsWith("./"));

const SHA_PINNED = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/;

/* ---- CONTRIBUTING.md ------------------------------------------------------- */

describe("CONTRIBUTING.md is short and says the five things a stranger needs", () => {
  const text = () => read("CONTRIBUTING.md");

  it("has at most 70 lines", () => {
    expect(linesOf(text()).length).toBeLessThanOrEqual(70);
  });

  it("says the contributor licenses the work under MIT, inbound = outbound", () => {
    expect(flat(text())).toContain("By opening a pull request you license your work under the MIT licence, the same as the project: inbound = outbound");
  });

  it("names the one command that runs every check, `pnpm check:all`", () => {
    expect(text()).toContain("pnpm check:all");
  });

  it("asks for the red `test:` commit first, and for the test that reproduces a bug", () => {
    const t = flat(text());
    expect(t).toContain("`test:`");
    expect(t).toMatch(/bug[^.]*starts with the test that reproduces it/i);
  });

  it("asks for the origin of code you did not write, and welcomes AI-written code that you can explain", () => {
    const t = flat(text());
    expect(t).toMatch(/code you did not write/i);
    expect(t).toMatch(/\bAI\b[^.]*(welcome|accepted)/i);
    expect(t).toMatch(/explain/i);
  });

  it("sends proposals to Discussions and work to the public Project", () => {
    expect(flat(text())).toContain("Proposals go to Discussions, work to the public Project");
  });

  it("links the Code of Conduct, the language recipe and the files the long sections moved to", () => {
    const t = text();
    for (const target of ["CODE_OF_CONDUCT.md", "dev/TESTING.md", "dev/DEFINITION-OF-DONE.md", "VERSIONING.md", "AGENTS.md"]) {
      expect(t, target).toContain(`](./${target}`);
    }
    expect(t).toMatch(/AGENTS\.md#[^)]*adding-a-language-to-cores-scripts/);
  });

  it("every relative link points at a file that exists (GitHub's ../../issues style aside)", () => {
    const links = [...text().matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).filter((h) => !/^(https?:|mailto:|#|\.\.\/\.\.\/)/.test(h));
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(existsSync(path(href.split("#")[0])), href).toBe(true);
  });

  it("is plain text: no emoji", () => {
    expect(text()).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("nothing of the old CONTRIBUTING.md is lost when it moves", () => {
  /** [file, heading text it must carry, a phrase from the section's body]. */
  const MOVED = [
    ["dev/TESTING.md", "Minimum Automated Baseline", "Theme switch and persistence"],
    ["dev/TESTING.md", "Keyboard Testing", "Escape closes modals/details"],
    ["dev/TESTING.md", "Focus Testing", "No focus traps (unless intended)"],
    ["dev/TESTING.md", "Visual Testing", "High contrast mode readable"],
    ["dev/TESTING.md", "A11y Checklist", "No flashing >3/second"],
    ["dev/TESTING.md", "Modals and dialogs", "Do not write a focus trap"],
    ["dev/DEFINITION-OF-DONE.md", "What a new component has to be", "Something you needed once belongs in your own app."],
    ["dev/DEFINITION-OF-DONE.md", "Adding a token", "packages/tokens/src/semantic.css"],
    ["dev/DEFINITION-OF-DONE.md", "What We Check", "Package boundaries"],
    ["dev/DEFINITION-OF-DONE.md", "Definition of done for a component", "An unticked line blocks the merge."],
    ["dev/DEFINITION-OF-DONE.md", "Documentation", "No page may exceed 80 kB of HTML"],
    ["VERSIONING.md", "Publishing", "Nobody publishes from a local machine."],
    ["VERSIONING.md", "Before opening a PR", "node scripts/check-pack.js --update"],
    ["VERSIONING.md", "Dependency ranges between packages", "Do not use the `workspace:` protocol there"],
  ];

  it.each(MOVED)("%s has the section %s", (file, heading, phrase) => {
    const text = read(file);
    const headings = text.split("\n").filter((l) => /^#{1,6}\s/.test(l));
    expect(
      headings.some((h) => h.toLowerCase().includes(heading.toLowerCase())),
      `a heading containing "${heading}" in ${file}`,
    ).toBe(true);
    expect(text, phrase).toContain(phrase);
  });

  it("dev/DEFINITION-OF-DONE.md carries the twelve ticks of the component checklist", () => {
    const ticks = read("dev/DEFINITION-OF-DONE.md").split("\n").filter((l) => /^- \[ \] (Native element or API|Works with JS disabled|Keyboard:|Screen reader:|320 px|forced-colors|Contrast >=|Only semantic tokens|Strings:|Docs:|Tests added|dist\/ regenerated)/.test(l));
    expect(ticks).toHaveLength(12);
  });
});

/* ---- CODE_OF_CONDUCT.md ------------------------------------------------------ */

describe("CODE_OF_CONDUCT.md is the Contributor Covenant 2.1 with a private GitHub contact", () => {
  const text = () => read("CODE_OF_CONDUCT.md");

  it("names the Contributor Covenant, version 2.1, and keeps its sections", () => {
    const t = text();
    expect(t).toMatch(/Contributor Covenant/);
    expect(t).toContain("version/2/1/code_of_conduct.html");
    for (const section of ["Our Pledge", "Our Standards", "Enforcement Responsibilities", "Scope", "Enforcement", "Enforcement Guidelines", "Correction", "Warning", "Temporary Ban", "Permanent Ban", "Attribution"]) {
      expect(t, section).toMatch(new RegExp(`^#{1,6}\\s+(\\d\\.\\s+)?${section}\\s*$`, "m"));
    }
  });

  it("keeps the wording of the covenant (the pledge and a standard)", () => {
    const t = flat(text());
    expect(t).toContain("We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone");
    expect(t).toContain("Demonstrating empathy and kindness toward other people");
  });

  it("sends reports to the security advisory form of SECURITY.md, with no e-mail address", () => {
    const advisory = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/security\/advisories\/new/.exec(read("SECURITY.md"))?.[0];
    expect(advisory).toBeTruthy();
    const t = text();
    expect(t).toContain(`Report privately through GitHub: ${advisory}`);
    expect(t).not.toContain("[INSERT CONTACT METHOD]");
    expect(t).not.toContain("@");
  });

  it("is linked from CONTRIBUTING.md instead of a five-line section", () => {
    expect(read("CONTRIBUTING.md")).toContain("](./CODE_OF_CONDUCT.md)");
    expect(read("CONTRIBUTING.md")).not.toMatch(/^## Code of Conduct\s*\n\s*\n- Be respectful/m);
  });
});

/* ---- Labels, pull request template, issue templates ----------------------------- */

const LABELS = ["bug", "accessibility", "component", "docs", "language", "tokens", "needs-browser-review", "good first issue", "help wanted", "breaking", "security", "wontfix", "visual", "post-merge-failure"];

describe(".github/labels.yml", () => {
  const labels = () => parseLabels(read(".github/labels.yml"));

  it("has the fourteen labels (the twelve of the spec, `visual` and `post-merge-failure`), and no other", () => {
    expect(labels().map((l) => l.name).sort()).toEqual([...LABELS].sort());
  });

  it("gives each a six-digit hex colour (no #) and a description", () => {
    for (const l of labels()) {
      expect(l.color, l.name).toMatch(/^[0-9a-fA-F]{6}$/);
      expect((l.description ?? "").length, l.name).toBeGreaterThan(10);
      expect(l.description.length, l.name).toBeLessThanOrEqual(100); // GitHub's limit
    }
  });

  it("says in the description of `security` that reports go private", () => {
    expect(labels().find((l) => l.name === "security")?.description).toMatch(/private/i);
  });
});

describe("issue forms use labels that exist", () => {
  const forms = () => readdirSync(path(".github/ISSUE_TEMPLATE")).filter((f) => f.endsWith(".yml") && f !== "config.yml");

  it("has the three forms", () => {
    expect(forms().sort()).toEqual(["accessibility.yml", "bug.yml", "component.yml"]);
  });

  it.each(["accessibility.yml", "bug.yml", "component.yml"])("%s has labels: and each is in labels.yml", (file) => {
    const known = parseLabels(read(".github/labels.yml")).map((l) => l.name);
    const used = labelsOfForm(read(`.github/ISSUE_TEMPLATE/${file}`));
    expect(used.length, `${file} labels`).toBeGreaterThan(0);
    for (const label of used) expect(known, `${file}: ${label}`).toContain(label);
  });
});

describe(".github/pull_request_template.md", () => {
  const text = () => read(".github/pull_request_template.md");
  const boxes = () => text().split("\n").filter((l) => /^- \[ \] /.test(l));

  it("opens with the MIT box: inbound = outbound, and say where it comes from", () => {
    expect(boxes()[0]).toBe("- [ ] I license this work under the MIT licence (inbound = outbound) and I wrote it or say where it comes from");
  });

  it("has the Test first box", () => {
    expect(boxes()).toContain("- [ ] The first commit is `test:` and fails without the change");
  });

  it("asks for the browser review through the `needs-browser-review` issue, not through Claude's memory", () => {
    const browsers = text().slice(text().indexOf("## Browsers"));
    expect(browsers).toContain("## Browsers");
    expect(browsers).toContain("needs-browser-review");
    expect(text()).not.toMatch(/Claude|memory|luz-browser-review-pending/);
  });
});

describe("proposals, support and the browser reviews are public", () => {
  it("has a Discussions form for proposals with problem, who it affects, and alternatives that use the platform", () => {
    const form = read(".github/DISCUSSION_TEMPLATE/proposal.yml");
    expect(form).toMatch(/^body:/m);
    expect(form).toMatch(/label:\s*.*problem/i);
    expect(form).toMatch(/label:\s*.*who[^\n]*affect/i);
    expect(form).toMatch(/label:\s*.*alternatives/i);
    expect(form).toMatch(/platform/i);
  });

  it("VERSIONING.md has a Supported section: Baseline Widely available, Node LTS, the latest minor of 0.x", () => {
    const text = read("VERSIONING.md");
    const at = text.search(/^##\s+Supported\s*$/m);
    expect(at, "a `## Supported` heading").toBeGreaterThanOrEqual(0);
    const section = text.slice(at).split(/\n## /)[0];
    expect(section).toMatch(/Baseline Widely available/);
    expect(section).toMatch(/active LTS/);
    expect(section).toMatch(/maintenance LTS/);
    expect(section).toMatch(/latest minor/);
  });

  it("README links VERSIONING.md for what is supported", () => {
    expect(read("README.md")).toMatch(/\]\(\.\/VERSIONING\.md(#[^)]*)?\)/);
  });

  it("dev/BROWSER-REVIEWS.md has an Open section: Scope, Files, What to look at, Browser", () => {
    const text = read("dev/BROWSER-REVIEWS.md");
    const at = text.search(/^##\s+Open\s*$/m);
    expect(at, "a `## Open` heading").toBeGreaterThanOrEqual(0);
    const section = text.slice(at).split(/\n## /)[0];
    const header = section.split("\n").find((l) => l.startsWith("|"));
    expect(header?.split("|").map((c) => c.trim()).filter(Boolean)).toEqual(["Scope", "Files", "What to look at", "Browser"]);
    expect(section).toMatch(/needs-browser-review/);
  });

  it("the security-auditor agent reads the Open section, the issues and the private list", () => {
    const agent = read(".claude/agents/security-auditor.md");
    expect(agent).toContain("dev/BROWSER-REVIEWS.md");
    expect(agent).toMatch(/Open/);
    expect(agent).toContain("needs-browser-review");
    expect(agent).toMatch(/\bgh\b/);
    expect(agent).toContain("luz-browser-review-pending.md");
  });
});

/* ---- CI ----------------------------------------------------------------------- */

describe("every workflow keeps SR-10: a verdict in 30 minutes, nothing unpinned", () => {
  it("has workflows to read", () => {
    expect(workflows().map((w) => w.file)).toEqual(expect.arrayContaining(["ci.yml", "ui-tests.yml", "visual-references.yml", "post-merge.yml", "publish.yml"]));
  });

  it("bounds every job that runs on a runner with `timeout-minutes` of 25 at most", () => {
    for (const { file, text } of workflows()) {
      const jobs = jobsOf(text);
      expect(jobs.length, `${file} jobs`).toBeGreaterThan(0);
      for (const job of jobs) {
        if (!/^ {4}runs-on:/m.test(job.text)) {
          expect(job.text, `${file} ${job.id} calls a reusable workflow`).toMatch(/^ {4}uses:/m); // it cannot carry a timeout of its own
          continue;
        }
        const minutes = /^ {4}timeout-minutes:\s*(\d+)\s*$/m.exec(job.text)?.[1];
        expect(minutes, `${file} ${job.id} timeout-minutes`).toBeDefined();
        expect(Number(minutes), `${file} ${job.id}`).toBeGreaterThan(0);
        expect(Number(minutes), `${file} ${job.id}`).toBeLessThanOrEqual(25);
      }
    }
  });

  it("pins every remote `uses:` by a 40-hex commit SHA", () => {
    for (const { file, text } of workflows()) {
      for (const u of remoteUses(text)) expect(u, `${file}: ${u}`).toMatch(SHA_PINNED);
    }
    expect(remoteUses(read(".github/workflows/ci.yml")).length).toBeGreaterThan(0);
  });

  it("never uses pull_request_target", () => {
    for (const { file, text } of workflows()) expect(text, file).not.toContain("pull_request_target");
  });

  it("never runs the firefox or webkit projects", () => {
    for (const { file, text } of workflows()) expect(text, file).not.toMatch(/--project=(firefox|webkit)/);
  });

  it("uses changesets/action at a v1 tag, pinned by SHA (v2 needs Changesets CLI v3, the repo has ^2)", () => {
    const publish = read(".github/workflows/publish.yml");
    expect(publish).toMatch(/changesets\/action@[0-9a-f]{40}\s+#\s*v1\.\d+\.\d+\b/);
    expect(publish).not.toMatch(/changesets\/action@\S+\s+#\s*v2/);
    expect(JSON.parse(read("package.json")).devDependencies["@changesets/cli"]).toMatch(/^\^?2\./);
  });
});

describe(".github/workflows/ci.yml", () => {
  const ci = () => read(".github/workflows/ci.yml");
  const callerOfShards = () => jobsOf(ci()).find((j) => /^ {4}uses:\s*\.\/\.github\/workflows\/ui-tests\.yml\s*$/m.test(j.text));
  const required = () => jobsOf(ci()).find((j) => /^ {4}name:\s*UI Tests \(Playwright\)\s*$/m.test(j.text));

  it("never uses pull_request_target", () => {
    expect(ci()).not.toContain("pull_request_target");
  });

  it("keeps `permissions: contents: read` at the top, and grants no write to `red-commit`", () => {
    expect(ci()).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(jobOf(ci(), "red-commit"), "a `red-commit` job").not.toBe("");
    expect(jobOf(ci(), "red-commit")).not.toMatch(/:\s*write\b/);
  });

  it("has no schedule and no `test-affected`: the whole suite runs on every pull request", () => {
    expect(triggersOf(ci())).not.toContain("schedule");
    expect(ci()).not.toMatch(/^\s*-?\s*cron:/m);
    expect(ci()).not.toContain("test-affected");
  });

  it("calls the shards of ui-tests.yml in a job of its own, unless a release already ran them", () => {
    const job = callerOfShards();
    expect(job, "a job that `uses: ./.github/workflows/ui-tests.yml`").toBeDefined();
    expect(job.text).toMatch(/^ {4}if:.*inputs\.skip-ui != true/m);
    expect(job.text).not.toMatch(/^ {4}runs-on:/m);
  });

  it("keeps the required check `UI Tests (Playwright)`: it waits for the shards, runs whatever they did, and fails unless they passed", () => {
    const shards = callerOfShards();
    const job = required();
    expect(job, "a job named exactly `UI Tests (Playwright)`").toBeDefined();
    expect(listOf(job.text, "needs").length ? listOf(job.text, "needs") : [/^ {4}needs:\s*(\S+)\s*$/m.exec(job.text)?.[1]]).toEqual([shards.id]);
    expect(job.text).toMatch(/^ {4}if:\s*always\(\) && inputs\.skip-ui != true\s*$/m);
    expect(job.text, "reads the result of the shards").toContain(`needs.${shards.id}.result`);
    const runs = runBlocksOf(job.text).join("\n");
    expect(runs).toMatch(/test\s+"\$\w+"\s*=\s*"?success"?|\[\[?\s+"\$\w+"\s*==?\s*"?success"?\s*\]/);
  });

  it("does not run `visual-references` any more: it is a workflow of its own", () => {
    expect(jobOf(ci(), "visual-references")).toBe("");
    expect(ci()).not.toContain("--update-snapshots");
  });

  it("has a `red-commit` job on pull requests only, with the history, running scripts/check-red-commit.js on base and head", () => {
    const job = jobOf(ci(), "red-commit");
    expect(job, "a `red-commit` job").not.toBe("");
    expect(job).toMatch(/if:.*github\.event_name == 'pull_request'/);
    expect(job).toContain("fetch-depth: 0");
    expect(job).toContain("scripts/check-red-commit.js");
    expect(job).toContain("github.event.pull_request.base.sha");
    expect(job).toContain("github.event.pull_request.head.sha");
    expect(job).not.toContain("secrets.");
  });

  it("bounds `red-commit` with `timeout-minutes` of 25 at most", () => {
    const minutes = /^\s+timeout-minutes:\s*(\d+)\s*$/m.exec(jobOf(ci(), "red-commit"))?.[1];
    expect(minutes, "red-commit timeout-minutes").toBeDefined();
    expect(Number(minutes)).toBeGreaterThan(0);
    expect(Number(minutes)).toBeLessThanOrEqual(25);
  });
});

describe(".github/workflows/ui-tests.yml", () => {
  const ui = () => read(".github/workflows/ui-tests.yml");
  const runner = () => jobsOf(ui()).find((j) => /--shard/.test(j.text));
  const summary = () => jobsOf(ui()).find((j) => /ui-summary\.js/.test(j.text));

  it("is called, or run by hand: no push, no pull_request, no schedule of its own", () => {
    expect(triggersOf(ui())).toEqual(["workflow_call", "workflow_dispatch"]);
    expect(ui()).not.toMatch(/^\s*-?\s*cron:/m);
  });

  it("splits the suite in at least six shards, none of which stops the others", () => {
    const job = runner();
    expect(job, "a job that runs playwright with --shard").toBeDefined();
    const shards = /^\s+shard:\s*\[([^\]]*)\]/m.exec(job.text)?.[1].split(",").filter((x) => x.trim()) ?? [];
    expect(shards.length, "shards in the matrix").toBeGreaterThanOrEqual(6);
    expect(job.text).toMatch(/fail-fast:\s*false/);
    expect(job.text).toMatch(/--shard[= ]/);
  });

  it("runs chromium and chromium-nojs, never firefox or webkit", () => {
    const run = runBlocksOf(runner().text).find((r) => /playwright test/.test(r));
    expect(run, "a `playwright test` step").toBeDefined();
    expect(run).toContain("--project=chromium ");
    expect(run).toContain("--project=chromium-nojs");
    expect(run).not.toMatch(/--project=(firefox|webkit)/);
  });

  it("uploads the blob report of each shard", () => {
    const job = runner();
    expect(job.text).toMatch(/actions\/upload-artifact@[0-9a-f]{40}/);
    expect(job.text).toContain("blob-report");
  });

  it("has a summary job that always runs, never blocks, merges the blob reports to JSON and runs scripts/ui-summary.js", () => {
    const job = summary();
    expect(job, "a job that runs scripts/ui-summary.js").toBeDefined();
    expect(job.id).not.toBe(runner().id);
    expect(job.text).toMatch(/^ {4}needs:/m);
    expect(job.text).toMatch(/^ {4}if:\s*always\(\)\s*$/m);
    expect(job.text).toMatch(/^ {4}continue-on-error:\s*true\s*$/m);
    const runs = runBlocksOf(job.text).join("\n");
    expect(runs).toMatch(/playwright merge-reports --reporter json/);
    expect(runs).toContain("scripts/ui-summary.js");
  });

  it("downloads the artifacts with an action pinned by SHA", () => {
    const downloads = remoteUses(ui()).filter((u) => u.startsWith("actions/download-artifact@"));
    expect(downloads.length).toBeGreaterThan(0);
    for (const u of downloads) expect(u).toMatch(SHA_PINNED);
  });
});

describe(".github/workflows/visual-references.yml", () => {
  const vr = () => read(".github/workflows/visual-references.yml");

  it("runs by hand or on a pull request, and on `labeled` as well as the usual types", () => {
    expect(triggersOf(vr())).toEqual(["pull_request", "workflow_dispatch"]);
    expect(listOf(topBlock(vr(), "on"), "types")).toContain("labeled");
    expect(vr()).not.toContain("pull_request_target");
  });

  it("has a `visual-references` job that runs only by hand or with the label `visual`", () => {
    const job = jobOf(vr(), "visual-references");
    expect(job, "a `visual-references` job").not.toBe("");
    const lines = job.split("\n");
    const at = lines.findIndex((l) => /^ {4}if:/.test(l));
    const rest = lines.slice(at + 1);
    const stop = rest.findIndex((l) => l.trim() !== "" && /^\s*/.exec(l)[0].length <= 4);
    const condition = at < 0 ? "" : flat([lines[at], ...rest.slice(0, stop < 0 ? undefined : stop)].join(" "));
    expect(condition, "the job has an `if:`").toMatch(/^\s*if:/);
    expect(condition).toContain("workflow_dispatch");
    expect(condition).toMatch(/'visual'/);
  });

  it("keeps `permissions: contents: read` at the top and has no write anywhere", () => {
    expect(vr()).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(vr()).not.toMatch(/:\s*write\b/);
  });

  it("makes the references: chromium on Linux, --update-snapshots, an artifact kept 14 days, never committed", () => {
    const job = jobOf(vr(), "visual-references");
    expect(job, "a `visual-references` job").not.toBe("");
    expect(job).toMatch(/runs-on:\s*ubuntu-/);
    expect(job).toContain("--update-snapshots");
    expect(job).toContain("--project=chromium");
    expect(job).toMatch(/actions\/upload-artifact@[0-9a-f]{40}/);
    expect(job).toMatch(/retention-days:\s*14\b/);
    expect(uploadPath(job)).toEqual(["tests/visual.spec.js-snapshots/*.png"]);
    expect(job).not.toMatch(/git (add|commit|push)/);
    expect(job).not.toContain("secrets.");
  });

  it("uploads only the PNG references of the visual spec, with no `**` glob", () => {
    expect(existsSync(path("tests/visual.spec.js-snapshots")), "the references the artifact is made of").toBe(true);
    expect(readdirSync(path("tests/visual.spec.js-snapshots")).some((f) => f.endsWith(".png"))).toBe(true);
    expect(uploadPath(jobOf(vr(), "visual-references"))).toEqual(["tests/visual.spec.js-snapshots/*.png"]);
  });

  it("says what is true of the references: the CI copies are artifacts only, not committed by CI (the tree tracks others)", () => {
    const comment = commentAbove(vr(), "visual-references");
    expect(comment, "a comment above the job").not.toBe("");
    expect(comment).not.toMatch(/never committed/i);
    expect(comment).toMatch(/artifacts? only/i);
    expect(comment).toMatch(/not committed by (the )?CI/i);
  });
});

describe(".github/workflows/post-merge.yml", () => {
  const pm = () => read(".github/workflows/post-merge.yml");

  it("runs on a push to main and on nothing else", () => {
    expect(triggersOf(pm())).toEqual(["push"]);
    expect(listOf(topBlock(pm(), "on"), "branches")).toEqual(["main"]);
  });

  it("runs the whole suite by calling ui-tests.yml", () => {
    expect(jobsOf(pm()).some((j) => /^ {4}uses:\s*\.\/\.github\/workflows\/ui-tests\.yml\s*$/m.test(j.text))).toBe(true);
  });

  it("opens an issue labelled `post-merge-failure` when it fails, with `issues: write` as the only write", () => {
    expect(pm()).toMatch(/^permissions:\n {2}contents: read\n/m);
    const job = jobsOf(pm()).find((j) => /^ {4}if:\s*failure\(\)\s*$/m.test(j.text));
    expect(job, "a job with `if: failure()`").toBeDefined();
    expect(job.text).toMatch(/^ {4}needs:/m);
    expect(job.text).toMatch(/^ {6}issues: write\s*$/m);
    expect([...pm().matchAll(/^\s*([\w-]+):\s*write\s*$/gm)].map((m) => m[1])).toEqual(["issues"]);
    const runs = runBlocksOf(job.text).join("\n");
    expect(runs).toContain("gh issue create");
    expect(runs).toMatch(/--label\s+post-merge-failure\b/);
  });

  it("writes no `${{ }}` inside a `run:`: every value reaches the command through `env:`", () => {
    const runs = runBlocksOf(pm());
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) expect(run).not.toContain("${{");
  });
});

describe("playwright.config.js", () => {
  async function configIn(ci) {
    vi.stubEnv("CI", ci ? "true" : "");
    vi.resetModules();
    return (await import(`${pathToFileURL(path("playwright.config.js")).href}?ci=${ci}`)).default;
  }
  const reporters = (config) => (Array.isArray(config.reporter) ? config.reporter : [[config.reporter]]).map((r) => (Array.isArray(r) ? r[0] : r));
  afterEach(() => vi.unstubAllEnvs());

  it("retries once under CI, so a flaky test is listed rather than hidden, and never locally", async () => {
    expect((await configIn(true)).retries).toBe(1);
    expect((await configIn(false)).retries).toBe(0);
  });

  it("writes a blob report under CI, for the summary job to merge", async () => {
    expect(reporters(await configIn(true))).toContain("blob");
    expect(reporters(await configIn(false))).not.toContain("blob");
  });
});

describe("PRINCIPLES.md: SR-10, a pull request has its verdict in 30 minutes", () => {
  const principles = () => read("PRINCIPLES.md");
  const section = (heading) => {
    const text = principles();
    const at = text.indexOf(`\n## ${heading}`);
    expect(at, heading).toBeGreaterThan(-1);
    const next = text.indexOf("\n## ", at + 1);
    return text.slice(at, next < 0 ? undefined : next);
  };

  it("has an SR-10 row in the table of strong rules, with 30 minutes and 25 for `timeout-minutes`", () => {
    const row = /^\| SR-10 \|.*$/m.exec(section("Strong rules"))?.[0];
    expect(row, "an SR-10 row").toBeDefined();
    expect(row).toMatch(/30 minutes/);
    expect(row).toContain("timeout-minutes");
    expect(row).toMatch(/\b25\b/);
  });

  it("has a (`SR-10`) bullet in §9 that says 30 minutes and a `timeout-minutes` of 25", () => {
    const bullet = section("9. ").split("\n").find((l) => l.startsWith("- ") && l.includes("(`SR-10`)"));
    expect(bullet, "a bullet with (`SR-10`)").toBeDefined();
    expect(bullet).toMatch(/30 minutes/);
    expect(bullet).toContain("timeout-minutes");
    expect(bullet).toMatch(/\b25\b/);
  });
});

/* ---- package.json ----------------------------------------------------------------- */

describe("one command runs every check", () => {
  const scripts = () => JSON.parse(read("package.json")).scripts;

  it("`check:all` and `qa:release` are the same command, `node scripts/qa-release.js`", () => {
    expect(scripts()["qa:release"]).toBe("node scripts/qa-release.js");
    expect(scripts()["check:all"]).toBe("node scripts/qa-release.js");
  });

  it("`check:license` runs scripts/check-license.js, and qa-release runs it", () => {
    expect(scripts()["check:license"]).toBe("node scripts/check-license.js");
    expect(read("scripts/qa-release.js")).toMatch(/\[pnpm, "check:license"\]/);
  });
});
