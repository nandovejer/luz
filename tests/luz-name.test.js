/**
 * The project is called LUZ (formerly CAI). No file, path or package name may
 * carry the old name, except the phrase "formerly CAI" that says where it came
 * from. Scope: every file git lists (tracked, plus untracked and not ignored),
 * `docs/` and `pnpm-lock.yaml` included, `node_modules/` excluded.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The old name is spelled in pieces so that this file passes its own check
const old = ["c", "ai"].join("");
const OLD = new RegExp(`(?<![a-z])${old}(?![a-z])`, "gi");
const ALLOWED = new RegExp(`formerly ${old.toUpperCase()}`, "g");

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
  cwd: root,
  encoding: "utf-8",
  maxBuffer: 256 * 1024 * 1024,
})
  .split("\0")
  .filter((f) => f && !/(^|\/)node_modules\//.test(f))
  .filter((f) => existsSync(resolve(root, f))); // tracked but deleted in the working tree

const texts = new Map(); // path -> content, binaries left out
for (const f of files) {
  let buf;
  try {
    buf = readFileSync(resolve(root, f));
  } catch {
    continue; // a directory or a submodule
  }
  if (buf.subarray(0, 8192).includes(0)) continue;
  texts.set(f, buf.toString("utf-8"));
}

function report(lines) {
  const shown = lines.slice(0, 50).join("\n");
  const more = lines.length > 50 ? `\n... and ${lines.length - 50} more` : "";
  return `${lines.length} match(es)\n${shown}${more}\n`;
}

const text = (rel) => texts.get(rel) ?? readFileSync(resolve(root, rel), "utf-8");
const json = (rel) => JSON.parse(text(rel));

describe("the old name is gone", () => {
  it("no file mentions the old name, apart from the phrase 'formerly <OLD>'", () => {
    const hits = [];
    for (const [file, content] of texts) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(ALLOWED, "");
        if (line.match(OLD)) hits.push(`${file}:${i + 1}: ${lines[i].trim().slice(0, 160)}`);
      }
    }
    expect(hits.length, report(hits)).toBe(0);
  });

  it("no path carries the old name", () => {
    const hits = files.filter((f) => new RegExp(OLD.source, "i").test(f));
    expect(hits.length, report(hits)).toBe(0);
  });

  it("no camelCase leftover of the old name (dataset.<old>Theme)", () => {
    const camel = new RegExp(`(?<![a-zA-Z])${old}(?=[A-Z])`, "g");
    const hits = [];
    for (const [file, content] of texts) {
      content.split("\n").forEach((line, i) => {
        if (line.match(camel)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 160)}`);
      });
    }
    expect(hits.length, report(hits)).toBe(0);
  });

  it("no file spells out the old acronym", () => {
    const phrase = ["Consistent", "Adaptive", "Identity"].join(" ");
    const hits = [];
    for (const [file, content] of texts) {
      content.split("\n").forEach((line, i) => {
        if (line.includes(phrase)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 160)}`);
      });
    }
    expect(hits.length, report(hits)).toBe(0);
  });

  it("the README gives the new expansion of LUZ", () => {
    expect(text("README.md")).toContain("Light, Usable & Zero-dependency");
  });
});

describe("no old package versions", () => {
  it(`no @luz-ds/<package>@2.x or @3.x and no ${["v2", "0", "0"].join(".")} / ${["v3", "0", "0"].join(".")} in any file`, () => {
    const pinned = /@luz-ds\/[a-z-]+@[23]\.\d+\.\d+/;
    const tags = /\bv[23]\.0\.0\b/;
    const hits = [];
    for (const [file, content] of texts) {
      if (file === "pnpm-lock.yaml") continue;
      content.split("\n").forEach((line, i) => {
        if (pinned.test(line) || tags.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 160)}`);
      });
    }
    expect(hits.length, report(hits)).toBe(0);
  });

  it("the root and the apps are at version 0.0.0", () => {
    const manifests = ["package.json", ...files.filter((f) => /^apps\/[^/]+\/package\.json$/.test(f))];
    expect(manifests.length).toBeGreaterThan(1);
    for (const m of manifests) expect(json(m).version, `${m} version`).toBe("0.0.0");
  });
});

describe("packages", () => {
  const pkgs = readdirSync(resolve(root, "packages"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(root, "packages", d.name, "package.json")))
    .map((d) => `packages/${d.name}/package.json`);

  it("finds the packages", () => {
    expect(pkgs.length).toBeGreaterThan(0);
  });

  it("every package is @luz-ds/* (their versions are in package-model.test.js)", () => {
    for (const p of pkgs) {
      const pkg = json(p);
      expect(pkg.name, `${p} name`).toMatch(/^@luz-ds\//);
    }
  });

  it("every peer dependency on @luz-ds/* is a literal list of caret ranges that starts at ^0.1.0", () => {
    // Which versions the list reaches is tests/peer-ranges.test.js's job (it follows the pending changesets)
    for (const p of pkgs) {
      const peers = json(p).peerDependencies ?? {};
      for (const [name, range] of Object.entries(peers)) {
        if (name.startsWith("@luz-ds/")) expect(range, `${p} peer ${name}`).toMatch(/^\^0\.1\.0( \|\| \^\d+\.\d+\.\d+)+$/);
      }
    }
  });

  // The next release takes tokens, core and catalog (one `fixed` version) to 0.2.0. A peer range of
  // `^0.1.0` does not include 0.2.0, so with `onlyUpdatePeerDependentsWhenOutOfRange` changesets would
  // take every dependent (catalog, landing, cms, app, docs) to a MAJOR, 1.0.0, and the `fixed` group
  // would drag tokens and core with it. The literal range `^0.1.0 || ^0.2.0` holds both versions.
  const luzPeers = () =>
    pkgs.flatMap((p) =>
      Object.entries(json(p).peerDependencies ?? {})
        .filter(([name]) => name.startsWith("@luz-ds/"))
        .map(([name, range]) => ({ p, name, range })),
    );

  // A range of `^0.x.y` alternatives joined by `||`: a 0.x caret holds the same minor, from that patch up
  const satisfies = (version, range) => {
    const [maj, min, pat] = version.split(".").map(Number);
    return range.split("||").some((alt) => {
      const m = /^\s*\^(\d+)\.(\d+)\.(\d+)\s*$/.exec(alt);
      if (!m) throw new Error(`not a caret range: "${alt}" in "${range}"`);
      const [, rMaj, rMin, rPat] = m.map(Number);
      return rMaj === 0 && maj === rMaj && min === rMin && pat >= rPat;
    });
  };

  it("every peer dependency on @luz-ds/* holds both 0.1.0 and 0.2.0, so the next release is not a major", () => {
    const peers = luzPeers();
    expect(peers.length).toBeGreaterThan(0);
    for (const { p, name, range } of peers) {
      expect(satisfies("0.1.0", range), `${p} peer ${name} "${range}" holds 0.1.0`).toBe(true);
      expect(satisfies("0.2.0", range), `${p} peer ${name} "${range}" holds 0.2.0`).toBe(true);
    }
  });

  it("no peer dependency on @luz-ds/* is workspace: or *", () => {
    for (const { p, name, range } of luzPeers()) {
      expect(range, `${p} peer ${name}`).not.toMatch(/^workspace:/);
      expect(range.trim(), `${p} peer ${name}`).not.toBe("*");
    }
  });

  it("changesets keep tokens, core and site on one version", () => {
    expect(json(".changeset/config.json").fixed).toEqual([["@luz-ds/tokens", "@luz-ds/core", "@luz-ds/catalog"]]);
  });
});

describe("LICENSE", () => {
  it("covers 2024 to 2026 (en dash)", () => {
    expect(text("LICENSE")).toContain("Copyright (c) 2024–2026");
  });
});

describe("no WordPress package is planned", () => {
  it("the docs for agents, the READMEs and the home page catalogs do not mention one", () => {
    const targets = files.filter(
      (f) =>
        ["AGENTS.md", "PRINCIPLES.md", "README.md"].includes(f) ||
        /^dev\/[^/]+\.md$/.test(f) ||
        /^packages\/[^/]+\/README\.md$/.test(f) ||
        /^apps\/landing\/i18n\/[^/]+\.json$/.test(f),
    );
    expect(targets.length).toBeGreaterThan(0);
    const hits = [];
    for (const f of targets) {
      text(f)
        .split("\n")
        .forEach((line, i) => {
          if (/\bwordpress\b/i.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
        });
    }
    expect(hits.length, report(hits)).toBe(0);
  });
});
