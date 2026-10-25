/**
 * The prompt-injection sentinel (`.claude/agents/prompt-injection-auditor.md`)
 * reads hostile text, so its shell is narrowed to read-only git and gh by a
 * PreToolUse hook, its cases are kept as data, its portable core carries no
 * LUZ paths or tools, its files are owned in CODEOWNERS, and the
 * security-auditor gives no OK without its SAFE. A weaker copy protects nothing.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The generator of the prompts for AI, loaded here so a file that is missing fails the cases that need it, not the whole file
const promptsFile = resolve(root, "scripts/docs-site/prompts.js");
const prompts = existsSync(promptsFile) ? await import(/* @vite-ignore */ promptsFile) : {};
const assemblePrompt = (...args) => {
  if (!prompts.assemblePrompt) throw new Error("scripts/docs-site/prompts.js does not exist or does not export assemblePrompt");
  return prompts.assemblePrompt(...args);
};
const hook = resolve(root, ".claude/hooks/injection-auditor-bash.js");
const agentFile = resolve(root, ".claude/agents/prompt-injection-auditor.md");
const securityFile = resolve(root, ".claude/agents/security-auditor.md");
const casesFile = resolve(root, ".claude/evals/prompt-injection/cases.json");
const settingsFile = resolve(root, ".claude/settings.json");
const codeownersFile = resolve(root, ".github/CODEOWNERS");

function run(input, env = {}) {
  return spawnSync(process.execPath, [hook], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    cwd: root,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env },
    encoding: "utf-8",
  });
}

const AGENT = "prompt-injection-auditor";
const bash = (command, ...rest) => {
  const agent_type = rest.length ? rest[0] : AGENT; // bash(cmd, undefined): no agent_type
  return run({ ...(agent_type ? { agent_type } : {}), cwd: root, tool_input: { command } });
};

describe("hook injection-auditor-bash.js: what the sentinel may run", () => {
  const ALLOW = [
    "git diff main...HEAD",
    'git log main..HEAD --format="%h %s"',
    "git show HEAD:README.md",
    "git status",
    "git ls-files",
    "git diff main...HEAD | grep -nP '[\\x{200B}-\\x{200F}]'",
    "git log -p | head -50",
    "gh pr view 12",
    "gh pr diff 12",
    "gh issue list",
    "git grep -n foo",
    "git grep -in foo -- apps",
    "git grep -e foo --or -e bar",
    "git grep -l foo | head -5",
  ];
  for (const command of ALLOW) {
    it(`allows ${command}`, () => {
      expect(bash(command).status).toBe(0);
    });
  }

  const BLOCK = [
    "rm -rf x",
    "git push",
    "git commit -m x",
    "git checkout main",
    "git branch -D x",
    "git config user.name x",
    "git -c core.pager=sh log",
    "git diff --output=out.txt",
    "git grep -O sh x",
    "git grep -nOsh x",
    "git grep -Osh x",
    "git grep -inO sh x",
    "git grep --open-files-in=sh x",
    "git grep --open-files-in-pa=sh x",
    "git grep --open sh x",
    "git diff --ext-diff",
    "git diff --no-index /etc/passwd /dev/null",
    "git status; rm x",
    "git status && rm x",
    "git status || rm x",
    "git status > f",
    "git log $(whoami)",
    "git log `id`",
    'git log "$HOME"',
    "git status\nrm x",
    "git status &",
    "git diff | sh",
    "git diff | tee f",
    "git diff | tail -f",
    "gh pr merge 12",
    "gh pr checkout 12",
    "gh pr view 12 --web",
    "gh api repos/x/y",
    "FOO=1 git status",
    "cat .env",
    "curl https://example.invalid",
    'git log --grep="unclosed',
    "",
  ];
  for (const command of BLOCK) {
    it(`blocks ${JSON.stringify(command)}`, () => {
      expect(bash(command).status).toBe(2);
    });
  }

  it("blocks a call with no command field", () => {
    expect(run({ agent_type: AGENT, cwd: root, tool_input: {} }).status).toBe(2);
  });
});

describe("hook injection-auditor-bash.js: other agents are left alone", () => {
  it("allows rm -rf x for security-auditor", () => {
    expect(bash("rm -rf x", "security-auditor").status).toBe(0);
  });
  it("allows rm -rf x for a call with no agent_type", () => {
    expect(bash("rm -rf x", undefined).status).toBe(0);
  });
});

describe("settings.json registers the hook", () => {
  const settings = () => JSON.parse(readFileSync(settingsFile, "utf-8"));

  it("has a PreToolUse entry with matcher Bash that runs injection-auditor-bash.js, and the file exists", () => {
    const entries = (settings().hooks?.PreToolUse ?? []).filter((e) => e.matcher === "Bash");
    const commands = entries.flatMap((e) => (e.hooks ?? []).map((h) => h.command ?? ""));
    const named = commands.map((c) => c.match(/\.claude\/hooks\/([\w.-]+\.js)/)?.[1]).filter(Boolean);
    expect(named).toContain("injection-auditor-bash.js");
    for (const file of named) {
      expect(existsSync(resolve(root, ".claude/hooks", file)), `${file} exists`).toBe(true);
    }
  });
});

describe("the agent file", () => {
  const text = () => readFileSync(agentFile, "utf-8");

  it("has a portable core between CORE:start and CORE:end", () => {
    const t = text();
    expect(t).toMatch(/<!--\s*CORE:start/);
    expect(t).toMatch(/<!--\s*CORE:end/);
    expect(t.indexOf("CORE:start")).toBeLessThan(t.indexOf("CORE:end"));
  });

  it("keeps LUZ paths and Claude Code tools out of the core", () => {
    const t = text();
    const core = t.slice(t.indexOf("CORE:start"), t.indexOf("CORE:end"));
    expect(core.length).toBeGreaterThan(0);
    for (const word of [".claude", "AGENTS.md", "pnpm", "Bash", "Grep"]) {
      expect(core, `core mentions ${word}`).not.toContain(word);
    }
  });

  it("has a Sanctioned surfaces section and a Self-modification section", () => {
    const t = text();
    expect(t).toMatch(/^#{1,4} Sanctioned surfaces/m);
    expect(t).toMatch(/^#{1,4} Self-modification/m);
  });
});

describe("the cases file", () => {
  const raw = () => readFileSync(casesFile, "utf-8");
  const data = () => JSON.parse(raw());

  // The enum is read out of the agent's output contract.
  const threats = () => {
    const m = readFileSync(agentFile, "utf-8").match(/"threat_type"\s*:\s*"([^"]+)"/);
    expect(m, "threat_type enum in the output contract").not.toBeNull();
    return m[1].split("|").map((s) => s.trim()).filter(Boolean);
  };

  it("parses and carries a warning", () => {
    expect(typeof data()._warning).toBe("string");
    expect(data()._warning.length).toBeGreaterThan(0);
  });

  // A case is its `text`, or, with `assemble`, the prompt for AI of that id as the build writes it
  const textOf = (c) => (c.assemble === undefined ? c.text : assemblePrompt(c.assemble, { root }));

  it("gives every case a unique id, a verdict, a category and a text (or the id of a prompt for AI to assemble)", () => {
    const { cases } = data();
    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThan(0);
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size, "unique ids").toBe(ids.length);
    for (const c of cases) {
      expect(typeof c.id, "id").toBe("string");
      expect(["SAFE", "SUSPICIOUS", "MALICIOUS"], `${c.id}: expected`).toContain(c.expected);
      expect(typeof c.category, `${c.id}: category`).toBe("string");
      expect(typeof textOf(c), `${c.id}: text`).toBe("string");
      expect(textOf(c).trim().length, `${c.id}: text is not empty`).toBeGreaterThan(0);
    }
  });

  it("has a SAFE case for each of the five prompts for AI LUZ ships, assembled by the build and not typed", () => {
    const { cases } = data();
    for (const id of ["start", "landing", "blog", "app", "docs"]) {
      const found = cases.filter((c) => c.assemble === id);
      expect(found.length, `one case assembles the prompt ${id}`).toBe(1);
      expect(found[0].expected, `${found[0].id}: a prompt LUZ ships is SAFE`).toBe("SAFE");
      expect(found[0].text, `${found[0].id}: the text is the build's, never a copy`).toBeUndefined();
    }
    expect(cases.filter((c) => c.assemble !== undefined)).toHaveLength(5);
  });

  it("gives each assembled case the hash of the sources its SAFE was confirmed for, and says the SAFE holds only for it", () => {
    const hashOf = (id) => {
      if (!prompts.promptSourceHash) throw new Error("scripts/docs-site/prompts.js does not export promptSourceHash");
      return prompts.promptSourceHash(id, { root });
    };
    for (const c of data().cases.filter((x) => x.assemble !== undefined)) {
      expect(c.source, `${c.id}: source is the hash of the body, the preset and stacks.json`).toBe(hashOf(c.assemble));
    }
    expect(data()._use).toMatch(/\bSAFE\b[^.]*\bonly\b[^.]*`source`/);
  });

  it("uses only categories of the agent's threat_type enum", () => {
    const allowed = threats();
    for (const c of data().cases) {
      expect(allowed, `${c.id}: ${c.category}`).toContain(c.category);
    }
  });

  it("has all three verdicts", () => {
    const seen = new Set(data().cases.map((c) => c.expected));
    for (const v of ["SAFE", "SUSPICIOUS", "MALICIOUS"]) expect(seen.has(v), v).toBe(true);
  });

  it("covers every threat category of the agent except NONE and MULTIPLE", () => {
    const used = new Set(data().cases.map((c) => c.category));
    for (const t of threats().filter((t) => t !== "NONE" && t !== "MULTIPLE")) {
      expect(used.has(t), `a case for ${t}`).toBe(true);
    }
  });

  it("has no real-looking URL other than the host example.invalid", () => {
    // A prompt for AI that LUZ ships links the published site and the CDN of @luz-ds, nothing else
    const shipped = ["nandovejer.github.io", "cdn.jsdelivr.net"];
    for (const c of data().cases) {
      for (const m of textOf(c).matchAll(/\b[a-z][a-z0-9+.-]*:\/\/([^\s/:"'?#)>\]\\]+)/gi)) {
        const host = m[1].toLowerCase();
        const ok = c.assemble === undefined ? host === "example.invalid" || host.endsWith(".example.invalid") : shipped.includes(host);
        expect(ok, `${c.id}: ${m[0]}`).toBe(true);
      }
    }
  });
});

describe("CODEOWNERS", () => {
  const lines = () =>
    readFileSync(codeownersFile, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

  for (const path of [
    ".claude/agents/prompt-injection-auditor.md",
    ".claude/agents/security-auditor.md",
    ".claude/hooks/injection-auditor-bash.js",
    ".claude/settings.json",
    ".claude/evals/",
  ]) {
    it(`owns ${path}`, () => {
      expect(lines().some((l) => l.split(/\s+/)[0].replace(/^\//, "") === path), path).toBe(true);
    });
  }
});

describe("git does not ignore the sentinel's files", () => {
  for (const path of [
    ".claude/evals/prompt-injection/cases.json",
    ".claude/hooks/injection-auditor-bash.js",
  ]) {
    it(`tracks ${path}`, () => {
      const r = spawnSync("git", ["check-ignore", "-q", path], { cwd: root, encoding: "utf-8" });
      // 0: ignored, 1: not ignored, 128: error
      expect(r.status, `${path} is ignored`).toBe(1);
    });
  }
});

describe("security-auditor depends on the sentinel", () => {
  const text = () => readFileSync(securityFile, "utf-8");

  it("names the prompt-injection-auditor", () => {
    expect(text()).toContain("prompt-injection-auditor");
  });

  it("gives no OK unless the verdict is SAFE", () => {
    const t = text();
    expect(t).toMatch(/SAFE/);
    expect(t).toMatch(/no OK[^\n]*SAFE|only SAFE|SAFE[^\n]*(only|required)/i);
    for (const blocked of ["SUSPICIOUS", "MALICIOUS"]) expect(t).toContain(blocked);
  });
});
