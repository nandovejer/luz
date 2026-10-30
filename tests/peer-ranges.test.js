/**
 * The peer ranges of the published packages accept the version the pending changesets will release.
 *
 * tokens, core and catalog share one version (changesets `fixed`), and a peer on another LUZ package is a
 * literal range (never `workspace:`). When the next release is outside a peer range of a dependent, changesets
 * bumps the dependent to a MAJOR (0.2.1 to 0.3.0 with `^0.1.0 || ^0.2.0` plans 1.0.0), as it did before 0.2.0
 * (commit 423be2f4). So the range must accept the current version and the next one; this computes the next
 * one from the pending changesets, it types no version.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const GROUP = ["@luz-ds/tokens", "@luz-ds/core", "@luz-ds/catalog"];
const DEPENDENTS = ["core", "catalog"];
const RANK = { patch: 1, minor: 2, major: 3 };

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

/** The strongest bump the changesets in `dir` name for a package of the fixed group, or null. */
function strongestBump(dir) {
  let best = null;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    const match = readFileSync(join(dir, file), "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;
    for (const line of match[1].split(/\r?\n/)) {
      const bump = line.match(/^\s*["']?(@luz-ds\/[\w-]+)["']?\s*:\s*["']?(patch|minor|major)["']?\s*$/);
      if (bump && GROUP.includes(bump[1]) && (!best || RANK[bump[2]] > RANK[best])) best = bump[2];
    }
  }
  return best;
}

/** Plain semver: 0.2.1 + minor is 0.3.0 (no 0.x special case). */
function nextVersion(version, bump) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  return version;
}

const parts = (v) => v.split(".").map(Number);
const atLeast = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
};

/** `^X.Y.Z` by hand: >=X.Y.Z and below the next change of the first non-zero part. */
function satisfiesCaret(version, range) {
  const base = range.trim().match(/^\^(\d+\.\d+\.\d+)$/);
  if (!base) throw new Error(`not a caret range: "${range}"`);
  const v = parts(version);
  const r = parts(base[1]);
  if (!atLeast(v, r)) return false;
  if (r[0] > 0) return v[0] === r[0];
  if (r[1] > 0) return v[0] === 0 && v[1] === r[1];
  return v[0] === 0 && v[1] === 0 && v[2] === r[2];
}

/** `A || B || C`, each a caret range. */
const satisfies = (version, range) => range.split("||").some((part) => satisfiesCaret(version, part));

/** The failures of the peers of core and catalog against `versions` (current and next), as sentences. */
function peerProblems(rootDir, versions) {
  const problems = [];
  for (const name of DEPENDENTS) {
    const peers = readJson(join(rootDir, "packages", name, "package.json")).peerDependencies ?? {};
    for (const [peer, range] of Object.entries(peers)) {
      if (!peer.startsWith("@luz-ds/")) continue;
      if (range.startsWith("workspace:")) {
        problems.push(`@luz-ds/${name} peer ${peer} is "${range}": a published peer is a literal range`);
        continue;
      }
      for (const [label, version] of Object.entries(versions)) {
        if (!satisfies(version, range)) problems.push(`@luz-ds/${name} peer ${peer} is "${range}", which does not accept ${version} (${label})`);
      }
    }
  }
  return problems;
}

const current = readJson(`${root}packages/core/package.json`).version;
const next = nextVersion(current, strongestBump(`${root}.changeset`));

describe("peer ranges on @luz-ds/* packages", () => {
  it("tokens, core and catalog are at one version", () => {
    for (const name of ["tokens", "catalog"]) expect(readJson(`${root}packages/${name}/package.json`).version).toBe(current);
  });

  it("core and catalog accept the version they are at and the one the pending changesets release", () => {
    expect(peerProblems(root, { current, next })).toEqual([]);
  });

  it("no peer on a LUZ package is workspace:", () => {
    for (const name of DEPENDENTS) {
      const peers = readJson(`${root}packages/${name}/package.json`).peerDependencies ?? {};
      for (const [peer, range] of Object.entries(peers)) expect(range, `@luz-ds/${name} peer ${peer}`).not.toMatch(/^workspace:/);
    }
  });
});

describe("the helpers that compute the next version", () => {
  const changesets = (files) => {
    const dir = mkdtempSync(join(tmpdir(), "luz-changesets-"));
    for (const [file, text] of Object.entries(files)) writeFileSync(join(dir, file), text);
    return dir;
  };
  const md = (...lines) => `---\n${lines.join("\n")}\n---\n\nText.\n`;

  it("the strongest bump of the group wins; @luz-ds/check and README.md are ignored", () => {
    const dir = changesets({
      "README.md": md('"@luz-ds/core": major'),
      "a.md": md('"@luz-ds/core": patch', '"@luz-ds/check": major'),
      "b.md": md('"@luz-ds/catalog": minor'),
      "config.json": "{}",
    });
    try {
      expect(strongestBump(dir)).toBe("minor");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("with patch changesets only, the next version is a patch and a 0.N range keeps accepting it", () => {
    const dir = changesets({ "a.md": md('"@luz-ds/core": patch', '"@luz-ds/check": minor') });
    try {
      expect(nextVersion("0.2.1", strongestBump(dir))).toBe("0.2.2");
    } finally {
      rmSync(dir, { recursive: true });
    }
    expect(satisfies("0.2.2", "^0.1.0 || ^0.2.0")).toBe(true);
  });

  it("plain semver, with no 0.x special case", () => {
    expect(nextVersion("0.2.1", "minor")).toBe("0.3.0");
    expect(nextVersion("0.2.1", "major")).toBe("1.0.0");
    expect(nextVersion("0.2.1", null)).toBe("0.2.1");
  });

  it("caret ranges: 0.N.x, 0.0.x and >=1", () => {
    expect(satisfies("0.3.0", "^0.1.0 || ^0.2.0")).toBe(false);
    expect(satisfies("0.3.0", "^0.1.0 || ^0.2.0 || ^0.3.0")).toBe(true);
    expect(satisfies("0.2.0", "^0.2.1")).toBe(false);
    expect(satisfies("0.0.3", "^0.0.3")).toBe(true);
    expect(satisfies("0.0.4", "^0.0.3")).toBe(false);
    expect(satisfies("1.4.0", "^1.2.0")).toBe(true);
    expect(satisfies("2.0.0", "^1.2.0")).toBe(false);
  });

  it("the failure names the package, the peer, the range and the version", () => {
    const dir = mkdtempSync(join(tmpdir(), "luz-root-"));
    try {
      for (const name of DEPENDENTS) {
        mkdirSync(join(dir, "packages", name), { recursive: true });
        writeFileSync(
          join(dir, "packages", name, "package.json"),
          JSON.stringify({ peerDependencies: { "@luz-ds/tokens": "^0.2.0", "@luz-ds/ui": "workspace:*" } }),
        );
      }
      const problems = peerProblems(dir, { next: "0.3.0" });
      expect(problems).toContain('@luz-ds/core peer @luz-ds/tokens is "^0.2.0", which does not accept 0.3.0 (next)');
      expect(problems).toContain('@luz-ds/catalog peer @luz-ds/ui is "workspace:*": a published peer is a literal range');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
