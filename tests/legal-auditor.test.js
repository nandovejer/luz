/**
 * The legal auditor (`.claude/agents/legal-auditor.md`) reads a repository and
 * the web, and reports; it never changes anything. Its shell is narrowed to
 * read-only git, gh and the npm / pnpm lookups by a PreToolUse hook, its cases
 * are kept as data, its files are owned in CODEOWNERS, and its prompt says what
 * it will not do. A weaker copy protects nothing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hook = resolve(root, ".claude/hooks/legal-auditor-bash.js");
const agentFile = resolve(root, ".claude/agents/legal-auditor.md");
const casesFile = resolve(root, ".claude/evals/legal/cases.json");
const settingsFile = resolve(root, ".claude/settings.json");
const codeownersFile = resolve(root, ".github/CODEOWNERS");
const agentsMd = resolve(root, "AGENTS.md");

function run(input) {
  return spawnSync(process.execPath, [hook], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    cwd: root,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: "utf-8",
  });
}

const AGENT = "legal-auditor";
const bash = (command, ...rest) => {
  const agent_type = rest.length ? rest[0] : AGENT; // bash(cmd, undefined): no agent_type
  return run({ ...(agent_type ? { agent_type } : {}), cwd: root, tool_input: { command } });
};

describe("hook legal-auditor-bash.js: what the legal auditor may run", () => {
  const ALLOW = [
    "git log --format=%h -n 3",
    "git show HEAD:LICENSE",
    "git diff main...HEAD",
    "git grep -n MIT | head -5",
    "gh pr view 12",
    "npm view @luz-ds/core license",
    "npm info @luz-ds/core",
    "pnpm licenses list",
    "pnpm licenses list --json",
  ];
  for (const command of ALLOW) {
    it(`allows ${command}`, () => {
      expect(bash(command).status).toBe(0);
    });
  }

  const BLOCK = [
    "npm view",
    "npm install left-pad",
    "npm publish",
    "npm pack --dry-run",
    "pnpm install",
    "pnpm licenses",
    "pnpm licenses list > out.txt",
    "sed -i s/a/b/ LICENSE",
    "rm -rf x",
    "cat LICENSE",
    "echo x > f",
    "git log; rm x",
    "git log $(whoami)",
    "git diff --output=x",
    "git log -O/tmp/x",
    "git log && git status",
  ];
  for (const command of BLOCK) {
    it(`blocks ${JSON.stringify(command)}`, () => {
      expect(bash(command).status).toBe(2);
    });
  }

  it("blocks a command that is not a string", () => {
    expect(bash(["git", "log"]).status).toBe(2);
    expect(bash(42).status).toBe(2);
  });
});

describe("hook legal-auditor-bash.js: other agents are left alone", () => {
  it("allows rm -rf x for security-auditor", () => {
    expect(bash("rm -rf x", "security-auditor").status).toBe(0);
  });
  it("allows rm -rf x for the prompt-injection-auditor (its own hook narrows it)", () => {
    expect(bash("rm -rf x", "prompt-injection-auditor").status).toBe(0);
  });
  it("allows rm -rf x for a call with no agent_type", () => {
    expect(bash("rm -rf x", undefined).status).toBe(0);
  });
  it("exits 0 on invalid stdin JSON", () => {
    expect(run("{not json").status).toBe(0);
  });
});

describe("settings.json registers the hook", () => {
  const commands = () => {
    const settings = JSON.parse(readFileSync(settingsFile, "utf-8"));
    const entries = (settings.hooks?.PreToolUse ?? []).filter((e) => e.matcher === "Bash");
    return entries.flatMap((e) => (e.hooks ?? []).map((h) => h.command ?? ""));
  };

  it("runs legal-auditor-bash.js under the PreToolUse Bash matcher", () => {
    expect(commands().some((c) => c.includes("legal-auditor-bash.js"))).toBe(true);
  });

  it("still runs injection-auditor-bash.js there", () => {
    expect(commands().some((c) => c.includes("injection-auditor-bash.js"))).toBe(true);
  });
});

describe("CODEOWNERS", () => {
  const lines = () =>
    readFileSync(codeownersFile, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

  for (const path of [".claude/agents/legal-auditor.md", ".claude/hooks/legal-auditor-bash.js"]) {
    it(`owns ${path}`, () => {
      expect(lines().some((l) => l.split(/\s+/)[0].replace(/^\//, "") === path), path).toBe(true);
    });
  }
});

describe("the cases file", () => {
  const data = () => JSON.parse(readFileSync(casesFile, "utf-8"));
  const SEVERITIES = ["Critical", "High", "Medium", "Low"];

  it("has at least four cases with unique ids, each with files and an expected verdict", () => {
    const { cases } = data();
    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThanOrEqual(4);
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size, "unique ids").toBe(ids.length);
    for (const c of cases) {
      expect(typeof c.id, "id").toBe("string");
      expect(typeof c.files, `${c.id}: files`).toBe("object");
      expect(c.files, `${c.id}: files`).not.toBeNull();
      expect(Object.keys(c.files).length, `${c.id}: files is not empty`).toBeGreaterThan(0);
      expect(typeof c.expected, `${c.id}: expected`).toBe("object");
      expect(c.expected, `${c.id}: expected`).not.toBeNull();
    }
  });

  it("includes the four cases the auditor is checked against", () => {
    const ids = data().cases.map((c) => c.id);
    for (const id of ["font-without-notice", "storage-without-notice", "ai-block-with-foreign-header", "clean"]) {
      expect(ids, id).toContain(id);
    }
  });

  it("expects no finding in the clean case", () => {
    const clean = data().cases.find((c) => c.id === "clean");
    expect(clean?.expected.findings).toBe(0);
  });

  it("expects a severity and a norm in every other case", () => {
    for (const c of data().cases.filter((x) => x.id !== "clean")) {
      expect(SEVERITIES, `${c.id}: severity`).toContain(c.expected.severity);
      expect(typeof c.expected.norm, `${c.id}: norm`).toBe("string");
      expect(c.expected.norm.trim().length, `${c.id}: norm is not empty`).toBeGreaterThan(0);
    }
  });
});

describe("the agent file", () => {
  const body = () => {
    const text = readFileSync(agentFile, "utf-8");
    return text.replace(/^---\n[\s\S]*?\n---/, "").toLowerCase();
  };

  it("says it never creates or edits", () => {
    expect(body()).toContain("never create or edit");
  });

  it("says it reports in Spanish", () => {
    expect(body()).toContain("spanish");
  });

  it("treats what it reads as data to classify", () => {
    expect(body()).toContain("data to classify");
  });
});

describe("the qa-release skill runs the legal audit", () => {
  const skill = readFileSync(resolve(root, ".claude/skills/qa-release/SKILL.md"), "utf-8").toLowerCase();
  const neverList = () => skill.slice(skill.indexOf("## never")).split(/\n## /)[0];

  it("mentions the legal-auditor", () => {
    expect(skill).toContain("legal-auditor");
  });

  it("says the audit is for a release to npm", () => {
    expect(skill).toContain("release to npm");
  });

  it("saves the report under .claude/legal/", () => {
    expect(skill).toContain(".claude/legal/");
  });

  it("says the audit never blocks the release", () => {
    expect(skill).toContain("never blocks");
  });

  it("forbids applying a legal-auditor proposal in its Never list", () => {
    expect(skill).toContain("## never");
    const never = neverList();
    expect(never).toContain("legal-auditor");
    expect(never).toContain("apply");
  });
});

describe("AGENTS.md", () => {
  it("mentions the legal-auditor", () => {
    expect(readFileSync(agentsMd, "utf-8")).toContain("legal-auditor");
  });
});
